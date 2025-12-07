from quart import Quart, request, jsonify, websocket
from quart_cors import cors
from models import db, Job, init_db
from job_cache import JobCache
from rate_limiter import RateLimitedQueue
import json
import os
import logging
from config import Config
import sys
import asyncio
import redis.asyncio as aioredis

DEBUG = True
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Logging setup
os.makedirs('logs', exist_ok=True)
logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(Config.LOG_FILE),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

app = Quart(__name__)
app = cors(app, allow_origin=Config.ALLOWED_ORIGINS.split(','))

# Globals - initialized in startup
queue: RateLimitedQueue = None
cache: JobCache = None
redis_client: aioredis.Redis = None
pubsub_task: asyncio.Task = None

# Track connected websocket clients per job
ws_clients: dict[str, set] = {}


@app.before_serving
async def startup():
    """Initialize async resources before serving"""
    global queue, cache, redis_client, pubsub_task

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

    redis_client = await aioredis.from_url(REDIS_URL, decode_responses=True)

    init_db()
    print("[Quart] API server started")

    # Start pubsub listener for job completions
    pubsub_task = asyncio.create_task(pubsub_listener())


@app.after_serving
async def shutdown():
    """Cleanup on shutdown"""
    global queue, cache, redis_client, pubsub_task

    if pubsub_task:
        pubsub_task.cancel()
        try:
            await pubsub_task
        except asyncio.CancelledError:
            pass

    if queue:
        await queue.disconnect()
    if cache:
        await cache.disconnect()
    if redis_client:
        await redis_client.aclose()

    print("[Quart] API server stopped")


async def pubsub_listener():
    """Listen for job completion notifications and broadcast to websocket clients"""
    print("[Quart] Starting pubsub listener...", flush=True)

    async def message_handler(message):
        print(f"[Quart] Received message: {message}", flush=True)

        try:
            raw = message["data"]
            if isinstance(raw, bytes):
                raw = raw.decode("utf-8")

            data = json.loads(raw)
            job_id = str(data.get("job_id"))

            print(f"[Quart] Broadcasting job result for job_id={job_id}", flush=True)

            if job_id in ws_clients:
                print(f"[Quart] Found {len(ws_clients[job_id])} subscribers for job {job_id}", flush=True)

                # Fetch job result from cache/database
                job_result = await cache.get(int(job_id))
                print(f"[Quart] Fetched job result: {job_result}", flush=True)

                if job_result is None:
                    print(f"[Quart] WARNING: No job result found for job_id={job_id}", flush=True)
                    job_result = {'error': 'Job result not found', 'job_id': job_id}

                # Wrap in a proper message format
                ws_message = {
                    'type': 'job_complete',
                    'job_id': job_id,
                    'data': job_result
                }

                # Broadcast to all subscribers
                for client_queue in ws_clients[job_id]:
                    await client_queue.put(ws_message)

                # Remove subscribers after sending result
                del ws_clients[job_id]
                print(f"[Quart] Broadcast complete, removed subscribers for job {job_id}", flush=True)
            else:
                print(f"[Quart] No subscribers for job {job_id}", flush=True)

        except Exception as e:
            print(f"[Quart] Error processing message: {e}", flush=True)
            import traceback
            traceback.print_exc()

    try:
        # Dedicated connection for pubsub
        pubsub_conn = await aioredis.from_url(REDIS_URL, decode_responses=False)
        print("[Quart] Pubsub connection created")

        async with pubsub_conn.pubsub() as pubsub:
            await pubsub.subscribe(**{'job_results': message_handler})
            print("[Quart] Subscribed to job_results channel")

            # Run forever, processing messages as they arrive
            await pubsub.run()

    except asyncio.CancelledError:
        print("[Quart] Pubsub listener cancelled")
        raise
    except Exception as e:
        print(f"[Quart] Pubsub listener FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        print("[Quart] Pubsub listener cleanup complete")

# WebSocket 

@app.websocket('/ws')
async def ws():
    """WebSocket endpoint for real-time job updates"""
    print("[WS] New connection attempt", flush=True)

    try:
        await websocket.accept()
        print("[WS] Connection accepted", flush=True)
    except Exception as e:
        print(f"[WS] Failed to accept connection: {e}", flush=True)
        return

    client_queue = asyncio.Queue()
    subscribed_jobs = set()

    try:
        # Handle incoming messages and outgoing notifications concurrently
        async def receive():
            print("[WS] Receive task started", flush=True)
            while True:
                try:
                    data = await websocket.receive_json()
                    print(f"[WS] Received message: {data}", flush=True)

                    if data.get('type') == 'subscribe':
                        job_id = str(data.get('job_id'))
                        print(f"[WS] Subscribe request for job_id={job_id}", flush=True)
                        if job_id:
                            if job_id not in ws_clients:
                                ws_clients[job_id] = set()
                            ws_clients[job_id].add(client_queue)
                            subscribed_jobs.add(job_id)
                            await websocket.send_json({'type': 'subscribed', 'job_id': job_id})
                            print(f"[WS] Client subscribed to job {job_id}, total subscribers: {len(ws_clients[job_id])}", flush=True)
                        else:
                            print("[WS] Subscribe request missing job_id", flush=True)

                    elif data.get('type') == 'unsubscribe':
                        job_id = str(data.get('job_id'))
                        print(f"[WS] Unsubscribe request for job_id={job_id}", flush=True)
                        if job_id in subscribed_jobs:
                            subscribed_jobs.discard(job_id)
                            if job_id in ws_clients:
                                ws_clients[job_id].discard(client_queue)
                            print(f"[WS] Client unsubscribed from job {job_id}", flush=True)

                    else:
                        print(f"[WS] Unknown message type: {data.get('type')}", flush=True)

                except json.JSONDecodeError as e:
                    print(f"[WS] Invalid JSON received: {e}", flush=True)
                except Exception as e:
                    print(f"[WS] Error in receive loop: {e}", flush=True)
                    raise

        async def send():
            print("[WS] Send task started", flush=True)
            while True:
                try:
                    msg = await client_queue.get()
                    print(f"[WS] Sending message to client: {msg}", flush=True)
                    await websocket.send_json(msg)
                    print("[WS] Message sent successfully", flush=True)
                except Exception as e:
                    print(f"[WS] Error in send loop: {e}", flush=True)
                    raise

        # Run both tasks
        print("[WS] Starting receive and send tasks", flush=True)
        receive_task = asyncio.create_task(receive())
        send_task = asyncio.create_task(send())

        done, pending = await asyncio.wait(
            [receive_task, send_task],
            return_when=asyncio.FIRST_EXCEPTION
        )

        # Cancel pending tasks
        for task in pending:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

        # Check for exceptions
        for task in done:
            if task.exception():
                print(f"[WS] Task failed with exception: {task.exception()}", flush=True)

    except asyncio.CancelledError:
        print("[WS] Connection cancelled", flush=True)
    except Exception as e:
        print(f"[WS] Connection error: {e}", flush=True)
        import traceback
        traceback.print_exc()
    finally:
        print(f"[WS] Cleaning up, subscribed_jobs={subscribed_jobs}", flush=True)
        # Cleanup subscriptions
        for job_id in subscribed_jobs:
            if job_id in ws_clients:
                ws_clients[job_id].discard(client_queue)
                if not ws_clients[job_id]:
                    del ws_clients[job_id]
        print("[WS] Connection closed", flush=True)


#   REST API  

@app.route('/api/submit', methods=['POST'])
async def submit_job():
    """Submit a new benchmark job"""
    try:
        data = await request.json

        if DEBUG:
            print(f"[SUBMIT] Received: {data}")

        if not data.get('code'):
            return jsonify({'error': 'Code is required'}), 400

        if not data.get('lang'):
            return jsonify({'error': 'Language is required'}), 400

        # Create job in database (sync peewee, run in executor)
        loop = asyncio.get_event_loop()
        job = await loop.run_in_executor(None, lambda: Job.create(
            code=data['code'],
            lang=data['lang'],
            compiler=data.get('compiler', 'gcc'),
            opts=data.get('opts', '-O2'),
            status='queued'
        ))

        print(f"[SUBMIT] Job created: ID={job.id}")

        # Add to rate-limited queue
        success = await queue.push(job.id)

        if not success:
            # Rate limited or queue full
            await loop.run_in_executor(None, lambda: Job.delete_by_id(job.id))
            return jsonify({'error': 'Rate limit exceeded or queue full'}), 429

        queue_size = await queue.size()
        print(f"[SUBMIT] Job {job.id} queued. Queue size: {queue_size}")

        return jsonify({
            'job_id': job.id,
            'status': 'queued'
        }), 201

    except Exception as e:
        print(f"[SUBMIT] ERROR: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/jobs/<int:id>', methods=['GET'])
async def get_job(id):
    """Get job by ID"""
    try:
        print(f"[GET_JOB] Fetching job ID: {id}")

        loop = asyncio.get_event_loop()
        job = await loop.run_in_executor(None, lambda: Job.get_by_id(id))

        job_data = dict(job.__data__)

        if job_data.get('result'):
            job_data['result'] = json.loads(job_data['result'])

        print(f"[GET_JOB] Returning job {id}: status={job_data.get('status')}")
        return jsonify(job_data)

    except Exception as e:
        print(f"[GET_JOB] ERROR for job {id}: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/current', methods=['GET'])
async def get_current_job():
    """Get most recent job"""
    try:
        loop = asyncio.get_event_loop()
        job = await loop.run_in_executor(
            None,
            lambda: Job.select().order_by(Job.created_at.desc()).first()
        )

        if not job:
            return jsonify({'job': None})

        job_data = await cache.get(job.id)
        return jsonify({'job': job_data})

    except Exception as e:
        print(f"[CURRENT] ERROR: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/jobs', methods=['GET'])
async def list_jobs():
    """List jobs (newest first)"""
    try:
        limit = int(request.args.get('limit', 10))

        loop = asyncio.get_event_loop()
        jobs = await loop.run_in_executor(
            None,
            lambda: list(Job.select().order_by(Job.created_at.desc()).limit(limit))
        )

        job_list = [{
            'job_id': job.id,
            'lang': job.lang,
            'compiler': job.compiler,
            'status': job.status,
            'created_at': job.created_at.isoformat(),
            'completed_at': job.completed_at.isoformat() if job.completed_at else
None
        } for job in jobs]

        return jsonify({'jobs': job_list})

    except Exception as e:
        print(f"[LIST_JOBS] ERROR: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/health', methods=['GET'])
async def health():
    """Health check"""
    return jsonify({
        'status': 'ok',
        'database': 'connected' if not db.is_closed() else 'disconnected'
    })


#   Saved Benchmarks  

@app.route('/api/saved', methods=['POST'])
async def save_benchmark():
    """Save a job as a benchmark"""
    try:
        data = await request.json
        job_id = data.get('job_id')
        name = data.get('name')

        if not job_id:
            return jsonify({'error': 'job_id is required'}), 400

        benchmark_id = await cache.save_benchmark(job_id, name)

        if benchmark_id:
            return jsonify({'benchmark_id': benchmark_id}), 201
        else:
            return jsonify({'error': 'Failed to save benchmark'}), 500

    except Exception as e:
        print(f"[SAVE] ERROR: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/saved/<int:id>', methods=['GET'])
async def get_saved_benchmark(id):
    """Get saved benchmark by ID (cached)"""
    try:
        data = await cache.get_saved(id)

        if data:
            return jsonify(data)
        else:
            return jsonify({'error': 'Benchmark not found'}), 404

    except Exception as e:
        print(f"[GET_SAVED] ERROR: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/saved/<int:id>', methods=['DELETE'])
async def delete_saved_benchmark(id):
    """Delete saved benchmark"""
    try:
        success = await cache.delete_saved(id)

        if success:
            return jsonify({'status': 'deleted'}), 200
        else:
            return jsonify({'error': 'Failed to delete'}), 500

    except Exception as e:
        print(f"[DELETE_SAVED] ERROR: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/chat', methods=['POST'])
async def chat():
    """Claude AI chat endpoint (placeholder)"""
    try:
        data = await request.json

        if not data.get('message'):
            return jsonify({'error': 'Message is required'}), 400

        message = data['message']
        result = data.get('result')

        # TODO: Implement Claude AI integration
        response_text = f"Received message: {message}"

        print(f"Chat request received: {message[:50]}")

        return jsonify({'response': response_text})

    except Exception as e:
        print(f"Error in chat endpoint: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
