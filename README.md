# Benchr
### Benchmark your code. Compare two languages. See the difference.

---

### Description

Benchr is a real-time code benchmarking platform that lets you write, execute, and analyze code performance across multiple
languages. Submit your code and get detailed metrics including CPU cycles, instructions per cycle (IPC), cache behavior, branch
predictions, memory usage, and execution time—all running in isolated Firecracker microVMs for security and consistency. Whether
you're optimizing algorithms or comparing implementations, Benchr gives you the low-level insights
you need.

### Project Structure

<pre>
benchr/
├── frontend/                   # React + TypeScript web UI
│   ├── app/
│   │   ├── components/         # UI components (editor, benchmark results, problems)
│   │   ├── routes/             # Page routes (home, sandbox, problems, login)
│   │   ├── contexts/           # React context (WebSocket, workspace state)
│   │   ├── hooks/              # Custom hooks (useWebSocket, useBenchmark)
│   │   ├── services/           # API client
│   │   └── types/              # TypeScript definitions
│   └── public/                 # Static assets
│
├── backend/                    # Python async API + job execution
│   ├── api.py                  # Quart API server with WebSocket support
│   ├── job_manager.py          # Job queue and VM orchestration
│   ├── agent.py                # Firecracker VM job executor
│   ├── models.py               # Database models (Peewee ORM)
│   ├── rate_limiter.py         # Redis-based rate limiting
│   ├── job_cache.py            # Job result caching
│   ├── IPubSub.py              # Redis pub/sub for real-time updates
│   ├── vm/                     # Firecracker VM configs and scripts
│   └── mnt/                    # Scripts mounted into VMs
│
└── tests/                      # Test suite
</pre>  

### Languages & Frameworks

**Frontend**
- TypeScript / React
- React Router 7 (SSR)
- Vite
- TailwindCSS
- Monaco Editor (VS Code)
- Radix UI / shadcn/ui
- Recharts
- WebSocket

**Backend**
- Python 3
- Quart (async Flask)
- Peewee ORM + SQLite
- Redis (queue, pub/sub, rate limiting)
- Firecracker microVMs

### Reporting Issues

Found a bug? Please open an issue with:

- Clear, concise title
- Description of the problem
- Steps to reproduce
- Your environment (OS, browser, etc.)

[Open an issue →](https://github.com/agge3/benchr/issues)

### Pull Requests

Want to contribute? Please submit a PR with:

- Actionary title (e.g., "Remove frontend polling")
- Description listing all changes and why each one is necessary

[Open a PR →](https://github.com/agge3/benchr/pulls)

### Creators

We started Benchr at Cal Hacks 12.0 with a simple goal: make benchmarking accessible, fun, and competitive. No more guessing if your optimization actually worked—see the numbers, compare with others, and prove your code is fast.

[@agge3](https://github.com/agge3) · [@kpowkitty](https://github.com/kpowkitty) · [@whoIsStella](https://github.com/whoIsStella)
