from dataclasses import dataclass
import os
import asyncio
from typing import Dict, Optional, List
import time
import struct
from util import ISerializer, JsonSerializer
from rate_limiter import RateLimitedQueue
from job_cache import JobCache
from IPubSub import get_pubsub
import env
from dotenv import load_dotenv
import json
import shutil

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
NUM_VMS = int(os.getenv("NUM_VMS", "1"))
DEBUG = True

@dataclass
class Firecracker:
    path: str = "firecracker"
    bin: str = None
    kimage: str = None
    rootfs: str = None
    config: str = None
    vm_config: str = None
    reports_path: str = "/var/log/firecracker"

    def __post_init__(self):
        self.bin = f"./{self.path}/firecracker"
        self.kimage = f"{self.path}/vmlinux-5.10.242-no-acpi"
        self.rootfs = f"{self.path}/rootfs.ext4"
        self.config = f"{self.path}/config.json"
        self.vm_config = f"{self.path}/vm_config.json"

@dataclass
class Container:
    cid: int
    config: str
    vm_config: str
    log: str
    vsock: str
    port: int
    handle: Optional[asyncio.subprocess.Process] = None
    ready: bool = False


@dataclass
class Job:
    id: int
    data: dict
    future: asyncio.Future


async def run_cmd(cmd: str):
    """Run shell command asynchronously"""
    try:
        p = await asyncio.create_subprocess_exec(
            *cmd.split(),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        return p
    except Exception as e:
        print(f"[CMD] ERROR: {e}")
        return None


class JobManager:
    def __init__(self, num_vms: int, env=".env", ser: ISerializer = None):
        self._fc = Firecracker()
        self._ctr_run = "/var/run/firecracker"
        self._num_vms = num_vms
        self._ctrs_q: List[Container] = [] # queue
        self._pending: Dict[int, asyncio.Future] = {}
        self.event = asyncio.Event()
        self._serializer = ser or JsonSerializer()
        load_dotenv(env)
        self._mnt_path = "vm"
        self._mnt = os.listdir(self._mnt_path)

    async def _check_ready(self, ctr: Container, timeout: float = 30.0) -> bool:
        """Wait for container to be ready via vsock handshake"""
        start = time.monotonic()

        while time.monotonic() - start < timeout:
            try:
                reader, writer = await asyncio.wait_for(
                    asyncio.open_unix_connection(ctr.vsock),
                    timeout=1.0
                )

                # Handshake
                writer.write(f"CONNECT {ctr.port}\n".encode('ascii'))
                await writer.drain()

                ack = await asyncio.wait_for(reader.read(64), timeout=2.0)

                writer.close()
                await writer.wait_closed()

                if ack.decode('ascii').strip().startswith("OK"):
                    ctr.ready = True
                    self.event.set()
                    if DEBUG:
                        print(f"[JOBMGR] Container {ctr.cid} ready")
                    return True

            except (ConnectionRefusedError, asyncio.TimeoutError,
FileNotFoundError):
                await asyncio.sleep(0.5)
            except Exception as e:
                print(f"[JOBMGR] Container {ctr.cid} check error: {e}")
                await asyncio.sleep(0.5)

        return False

    async def _start_ctr(self, ctr: Container):
        """Start a single Firecracker VM"""
        # Remove stale sockets if they exist
        api_sock = f"{os.path.dirname(ctr.config)}/api.socket"
        for sock in [api_sock, ctr.vsock]:
            if os.path.exists(sock):
                os.remove(sock)

        cmd = (
          f"{self._fc.bin} --api-sock {api_sock} --config-file {ctr.config}"
          )
        p = await run_cmd(cmd)
        if p is None:
            raise RuntimeError(f"Failed to start container {ctr.cid}")
        ctr.handle = p
        if DEBUG:
            print(f"[JOBMGR] Container {ctr.cid} process started")

    async def start_pool(self):
        """Start all containers in pool and wait for ready"""
        await asyncio.gather(*[self._start_ctr(ctr) for ctr in self._ctrs_q])

        results = await asyncio.gather(
            *[self._check_ready(ctr) for ctr in self._ctrs_q]
        )

        for ctr, success in zip(self._ctrs_q, results):
            if not success:
                raise RuntimeError(f"Failed to start container pool: container"
                  f"{ctr.cid} failed to start")

        print(f"[JOBMGR] Pool started: {len(self._ctrs_q)} VMs ready")

    def create_configs(self):
        """Create per-VM configs from templates"""
        try:
            with open(self._fc.config, 'rb') as f, \
                    open(self._fc.vm_config, 'rb') as vmf:
                data = self._serializer.deserialize(f.read())
                vm = self._serializer.deserialize(vmf.read())
        except Exception as e:
            raise e

        # Make paths absolute XXX
        data["boot-source"]["kernel_image_path"] = os.path.abspath(self._fc.kimage)
        data["drives"][0]["path_on_host"] = os.path.abspath(self._fc.rootfs)

        if not os.path.exists(self._fc.reports_path):
            try:
                os.makedirs(self._fc.reports_path, exist_ok=True)
            except Exception as e:
                raise RuntimeError(f"makedirs failed: {e}")

        if not os.path.exists(self._ctr_run):
            try:
                os.makedirs(self._ctr_run, exist_ok=True)
            except Exception as e:
                raise RuntimeError(f"makedirs failed: {e}")

        for i in range(self._num_vms):
            cid = 3 + i  # NOTE: cid needs to start at 3!
            id = f"vm{i}"

            # xxx change to actual reports path. using /var/run to keep things
            # simple at first
            reports_path = f"{self._ctr_run}/{id}"
            run_path = f"{self._ctr_run}/{id}"

            try:
                os.makedirs(reports_path, exist_ok=True)
                os.makedirs(run_path, exist_ok=True)
            except Exception as e:
                raise RuntimeError(f"makedirs failed: {e}")

            # Shared VM deployment - copy mount files
            for f in self._mnt:
                # follows symlinks (to copy actual file)
                # can copy because file data is small: low overhead and still
                # dynamic to host's file changes
                shutil.copy(f"{self._mnt_path}/{f}", f"{run_path}/{f}")

            # Copy deploy.ext4 for this VM (each VM needs its own copy)
            deploy_src = f"{self._fc.path}/deploy.ext4"
            deploy_dst = f"{run_path}/deploy.ext4"
            shutil.copy(deploy_src, deploy_dst)

            log = f"{reports_path}/{id}.log"
            vsock = f"{run_path}/{id}.vsock"
            cfg = f"{run_path}/config.json"
            vm_cfg = f"{run_path}/vm_config.json"
            port = env.PORT_START + i

            data["logging"]["log_path"] = log
            data["vsock"]["uds_path"] = vsock
            data["vsock"]["guest_cid"] = cid

            vm["vsock"]["cid"] = cid
            vm["vsock"]["port"] = port

            data["drives"][env.CONFIG_MNT_INDEX]["path_on_host"] = deploy_dst

            try:
                with open(cfg, 'wb') as f, \
                        open(vm_cfg, 'wb') as vmf:
                    # not human-readable to save disk space
                    ser = self._serializer.serialize(data)
                    vm_ser = self._serializer.serialize(vm)
                    f.write(ser)
                    vmf.write(vm_ser)
            except Exception as e:
                raise RuntimeError(f"json dump failed: {e}")

            # NOTE: NOT ready until started!
            ctr = Container(
                cid=cid,
                config=cfg,
                vm_config=vm_cfg,
                log=log,
                vsock=vsock,
                port=port
            )
            self._ctrs_q.append(ctr)

    def get_ready(self) -> Optional[Container]:
        """Get first available container from pool"""
        for ctr in self._ctrs_q:
            if ctr.ready:
                return ctr
        return None

    async def _execute_job(self, ctr: Container, job: Job):
        """Execute job on container, then reset (ephemeral)"""
        if not ctr.ready:
            raise RuntimeError(f"Attempted container {ctr.cid} execution, but" +
              "not ready")

        ctr.ready = False

        try:
            data = job.data
            req = self._serializer.serialize(data)

            if DEBUG:
                print(f"[JOBMGR] Executing job {job.id} on container {ctr.cid}")

            reader, writer = await asyncio.open_unix_connection(ctr.vsock)

            # Send vsock proxy handshake
            writer.write(f"CONNECT {ctr.port}\n".encode('ascii'))
            await writer.drain()
            ack = await asyncio.wait_for(reader.read(64), timeout=2.0)
            if not ack.decode('ascii').strip().startswith("OK"):
                raise RuntimeError(f"Vsock handshake failed: {ack}")

            # Send length-prefixed message
            writer.write(struct.pack(">I", len(req)))
            writer.write(req)
            await writer.drain()

            # Receive length prefix
            len_bytes = await reader.readexactly(4)
            res_len = struct.unpack(">I", len_bytes)[0]

            # Receive response
            res_bytes = await reader.readexactly(res_len)

            writer.close()
            await writer.wait_closed()

            res = self._serializer.deserialize(res_bytes)

            if DEBUG:
                print(f"[JOBMGR] Job {job.id} completed: {res}")

            if not job.future.done():
                job.future.set_result(res)
                self.event.set()

        except Exception as e:
            # xxx raise f"vsock communication failed: {e}"
            # xxx how to handle?
            print(f"[JOBMGR] Job {job.id} execution error: {e}")
            import traceback
            traceback.print_exc()

            if not job.future.done():
                # xxx but it should never be "done" at this point
                job.future.set_exception(e)
                self.event.set()

        finally:
            # job done: start async reset
            asyncio.create_task(self._reset_ctr(ctr))

    async def _reset_ctr(self, ctr: Container):
        """Reset container for next job (ephemeral pattern)"""
        if DEBUG:
            print(f"[JOBMGR] Resetting container {ctr.cid}")

        if ctr.handle:
            ctr.handle.terminate()
            try:
                await asyncio.wait_for(ctr.handle.wait(), timeout=2.0)
            except asyncio.TimeoutError:
                ctr.handle.kill()
                await ctr.handle.wait()

        ctr.ready = False
        ctr.handle = None

        try:
            await self._start_ctr(ctr)
            await self._check_ready(ctr)
        except Exception as e:
            raise RuntimeError(f"Failed to reset container {ctr.cid}: {e}")

    async def submit_job(self, ctr: Container, data: dict) -> asyncio.Future:
        """Submit job for async execution"""
        if ctr is None:
            raise RuntimeError("Invalid container")

        job_id = data.get("id")
        if job_id is None:
            raise RuntimeError("Job data missing 'id'")

        future = asyncio.Future()
        job = Job(id=job_id, data=data, future=future)

        self._pending[job_id] = future

        asyncio.create_task(self._execute_job(ctr, job))

        return future

    def get_finished(self) -> List[tuple]:
        """Collect completed job results"""
        finished = []
        to_remove = []

        for job_id, future in self._pending.items():
            if future.done():
                try:
                    res = future.result()
                    finished.append((job_id, res))
                except Exception as e:
                    finished.append((job_id, {"error": str(e), "success": False}))
                to_remove.append(job_id)

        for job_id in to_remove:
            del self._pending[job_id]

        return finished

    async def shutdown(self):
        """Graceful shutdown of all containers"""
        print("[JOBMGR] Shutting down...")

        for ctr in self._ctrs_q:
            if ctr.handle:
                ctr.handle.terminate()

        await asyncio.sleep(2.0)

        for ctr in self._ctrs_q:
            if ctr.handle:
                try:
                    ctr.handle.kill()
                    await ctr.handle.wait()
                except Exception as e:
                    print(f"[JOBMGR] Failed to kill container {ctr.cid}: {e}")

        print("[JOBMGR] Shutdown complete")


async def main():
    """
    Main event loop - event driven:
    1. Job received: submit job for async execution
    2. Job finished: send to redis/db, notify websocket clients
    3. Container ready: add back to pool (internal)
    """
    manager = JobManager(num_vms=NUM_VMS)
    manager.create_configs()
    await manager.start_pool()

    queue = RateLimitedQueue(
        redis_url=REDIS_URL,
        queue_name=os.getenv("RATE_QUEUE_NAME", "benchr"),
        max_requests=int(os.getenv("RATE_MAX_REQUESTS", "100")),
        window_seconds=int(os.getenv("RATE_WINDOW_SEC", "60")),
        max_queue_size=int(os.getenv("RATE_MAX_QUEUE_SIZE", "1000"))
    )
    await queue.connect()

    cache = JobCache(redis_url=REDIS_URL)
    await cache.connect()

    # Initialize pubsub singleton
    pubsub = await get_pubsub(REDIS_URL)

    print("[MAIN] Event loop running...")
    running = True

    try:
        while running:
            # event-based:
            #   1. job received: submit job for async execution
            #   2. job finished: send to redis/db, backend serves API endpoint for
            #      frontend to fetch
            #   3. container ready: add back to manager's internal ready queue
            queue_task = asyncio.create_task(queue.poll())
            manager_task = asyncio.create_task(manager.event.wait())

            done, pending = await asyncio.wait(
                [queue_task, manager_task],
                return_when=asyncio.FIRST_COMPLETED
            )

            # Cancel pending tasks
            for task in pending:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

            # Clear internal event
            manager.event.clear()

            # 1. Job received: submit if container available
            if await queue.hasFront():
                ctr = manager.get_ready()
                if ctr:
                    job_id = await queue.pend()
                    if job_id:
                        data = await cache.get(job_id)
                        if data:
                            print(f"[MAIN] Submitting job {job_id}")
                            await manager.submit_job(ctr, data)
                        else:
                            print(f"[MAIN] ERROR: Job {job_id} has no data")
                            await queue.pop(job_id)
                # else: no containers ready, wait for next event

            # 2. Job finished: update cache, notify clients
            finished = manager.get_finished()
            for job_id, res in finished:
                print(f"[MAIN] Job {job_id} finished")

                await cache.update(job_id, {
                    "status": "completed",
                    "result": res,
                    "completed_at": time.time()
                })

                await queue.pop(job_id)

                # Notify WebSocket clients via Redis pubsub
                await pubsub.publish('job_results', {'job_id': job_id})
                print(f"[MAIN] Published completion for job {job_id}")

            # 3. Container ready - handled internally via event.set()

    except KeyboardInterrupt:
        print("\n[MAIN] Interrupted")
    except Exception as e:
        print(f"[MAIN] Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await manager.shutdown()
        await queue.disconnect()
        await pubsub.close()
        await cache.disconnect()
        print("[MAIN] Cleanup complete")


if __name__ == "__main__":
    asyncio.run(main())
