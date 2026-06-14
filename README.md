# Background Job Scheduler (Backend)

A robust, in-memory background job scheduler built with NestJS, PostgreSQL, and PM2. This service handles job creation, dependency resolution (DAG workflows), resilient execution with retries and jitter, Dead Letter Queue (DLQ) processing, and live Server-Sent Events (SSE) streaming to the frontend.

## Key Features

- **In-Memory Min-Heap:** An extremely fast O(log N) priority queue holding jobs based on `Priority` > `Scheduled Time` > `Creation Time`.
- **Timing Wheel & DAG Support:** Scheduled job handling and parent-child dependency tracking.
- **Starvation Prevention (Aging):** Automatically boosts priority of low-priority jobs if they sit in the queue for too long.
- **Worker Pool:** Independently polling asynchronous workers running inside the main Node.js process to share the memory heap.
- **Dead Letter Queue (DLQ):** Captures failed jobs after max retries with automated alerting when thresholds are met.

---

## 🛠 Prerequisites

- **Node.js** (v18 or v20+)
- **PostgreSQL** (v14+)
- **PM2** (For production deployment)

---

## 🚀 Setup & Installation

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Database Setup
Create a PostgreSQL database matching your `.env` configuration (default: `scheduler_db`). 

> **Note:** The project uses TypeORM with `synchronize: true` for development. The tables will be automatically created when the server starts.

### 3. Environment Variables
Copy the example environment file and customize it:

```bash
cp .env.example .env
```

**Essential `.env` configurations:**
```env
PORT=3000
NODE_ENV=development
WORKER_COUNT=3
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=scheduler_db

# Scheduler & Workers
STARVATION_CHECK_INTERVAL_MS=30000
AGING_INTERVAL_MIN=5
AGING_BOOST_PER_INTERVAL=0.5

# Email Mocking
RESEND_API_KEY=re_mock_key
MOCK_EMAIL_FAILURE_RATE=0.1
```

---

## 🏃 Running the Application

### Development Mode
To run the server locally with hot-reload:
```bash
npm run start:dev
```
The API will be available at `http://localhost:3000` and Swagger docs at `http://localhost:3000/docs`.

### Production Mode (PM2)
Because the scheduler relies on an in-memory Heap and Timing Wheel, **do not run this application in PM2 cluster mode**. It must run in `fork` mode to ensure a single, synchronized memory state.

1. Build the application:
```bash
npm run build
```
2. Start using the provided ecosystem file:
```bash
pm2 start ecosystem.config.js
```

---

## 📚 Documentation & Architecture
- **Architecture Details:** See [`architecture.md`](./architecture.md) for in-depth technical documentation on the internal modules and heap mechanics.
- **API Documentation:** Visit `/docs` on the running application for the full Swagger/OpenAPI spec.
- **UI Frontend:** This backend is designed to be consumed by the React-based `background-job-scheduler-ui`.
