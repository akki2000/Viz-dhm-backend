# Redis & BullMQ Setup Guide

This guide will help you set up Redis and BullMQ for queue-based job processing.

---

## Step 1: Install Redis

### Option A: Using Docker (Recommended - Easiest)

**If you have Docker installed:**

1. Open PowerShell or Command Prompt
2. Run:
   ```bash
   docker run -d -p 6379:6379 --name redis redis:latest
   ```

3. Verify it's running:
   ```bash
   docker ps
   ```
   You should see a container named "redis" running.

**To stop Redis:**
```bash
docker stop redis
```

**To start Redis again:**
```bash
docker start redis
```

**To remove Redis container:**
```bash
docker stop redis
docker rm redis
```

### Option B: Using WSL (Windows Subsystem for Linux)

**If you have WSL installed:**

1. Open WSL terminal
2. Install Redis:
   ```bash
   sudo apt-get update
   sudo apt-get install redis-server
   ```

3. Start Redis:
   ```bash
   sudo service redis-server start
   ```

4. Verify it's running:
   ```bash
   redis-cli ping
   ```
   Should return: `PONG`

### Option C: Download Redis for Windows

**If you don't have Docker or WSL:**

1. Download Redis for Windows from:
   - https://github.com/microsoftarchive/redis/releases
   - Or use Memurai (Redis-compatible for Windows): https://www.memurai.com/

2. Install and start the Redis service
3. Redis will run on `localhost:6379` by default

---

## Step 2: Verify Redis is Running

Test the connection:

```bash
# If using Docker
docker exec -it redis redis-cli ping

# If using WSL/Linux
redis-cli ping

# Should return: PONG
```

If you get `PONG`, Redis is working! ✅

---

## Step 3: Configure Your .env File

1. Open your `.env` file in the project root
2. Add or update the `REDIS_URL`:

```env
PORT=3000
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=your-gemini-api-key-here
```

**Note:** 
- `redis://localhost:6379` is the default Redis connection
- If Redis is on a different machine, use: `redis://your-redis-host:6379`
- If Redis has a password: `redis://:password@localhost:6379`

---

## Step 4: Start the Application

You now need to run **TWO processes**:

### Terminal 1: API Server

```bash
npm run dev
```

You should see:
```
✅ Redis queue initialized
Server running on port 3000
```

### Terminal 2: Worker Process

Open a **new terminal window** and run:

```bash
npm run dev:worker
```

You should see:
```
Photo processing worker started with concurrency: 2
Waiting for jobs...
```

**Important:** Both terminals must be running for the queue system to work!

---

## Step 5: Test the Queue System

1. **Submit a job** using Postman (as before)
2. **Check the logs:**

**In Terminal 1 (API Server):**
```
[abc123] Request received at 2025-01-07T...
```

**In Terminal 2 (Worker):**
```
Processing job abc123...
[abc123] Step 1: Processing image...
[abc123] Step 1 completed in 950ms
[abc123] Step 2: Enhancing with AI...
...
[abc123] ✅ Processing completed successfully
```

If you see the worker processing jobs, the queue is working! ✅

---

## Troubleshooting

### Error: "ECONNREFUSED" or "Redis connection failed"

**Problem:** Redis is not running or not accessible

**Solutions:**
1. Check if Redis is running:
   ```bash
   # Docker
   docker ps
   
   # WSL/Linux
   redis-cli ping
   ```

2. Start Redis if it's not running:
   ```bash
   # Docker
   docker start redis
   
   # WSL/Linux
   sudo service redis-server start
   ```

3. Verify the `REDIS_URL` in `.env` is correct

### Error: "Worker not processing jobs"

**Problem:** Worker process is not running

**Solution:** 
- Make sure you have Terminal 2 running with `npm run dev:worker`
- Check for errors in the worker terminal

### Error: "Cannot find module '@google/genai'"

**Problem:** Dependencies not installed

**Solution:**
```bash
npm install
```

### Jobs stay in "queued" status

**Problem:** Worker is not picking up jobs

**Solutions:**
1. Check worker terminal for errors
2. Verify Redis connection in worker logs
3. Restart both server and worker

---

## Production Setup

### Using Docker Compose (Recommended)

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  redis:
    image: redis:latest
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - REDIS_URL=redis://redis:6379
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    depends_on:
      - redis

  worker:
    build: .
    command: npm run start:worker
    environment:
      - REDIS_URL=redis://redis:6379
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    depends_on:
      - redis

volumes:
  redis-data:
```

Then run:
```bash
docker-compose up
```

### Manual Production Setup

1. **Start Redis:**
   ```bash
   # Linux
   sudo systemctl start redis
   sudo systemctl enable redis
   
   # Or use Docker
   docker run -d -p 6379:6379 --name redis redis:latest
   ```

2. **Build the application:**
   ```bash
   npm run build
   ```

3. **Start API server:**
   ```bash
   npm start
   ```

4. **Start worker (in separate process/terminal):**
   ```bash
   npm run start:worker
   ```

5. **Use a process manager** (PM2, systemd, etc.) to keep both running

---

## Quick Reference

### Start Everything (Development)

**Terminal 1:**
```bash
npm run dev
```

**Terminal 2:**
```bash
npm run dev:worker
```

### Start Redis (Docker)

```bash
docker start redis
```

### Check Redis Status

```bash
docker exec -it redis redis-cli ping
# Should return: PONG
```

### Stop Everything

**Terminal 1 & 2:** Press `Ctrl+C`

**Redis:**
```bash
docker stop redis
```

---

## Understanding the Queue System

### How It Works:

1. **API Server** receives requests and adds jobs to the Redis queue
2. **Worker Process** picks up jobs from the queue and processes them
3. **Redis** stores the queue and job status

### Benefits:

- ✅ Jobs persist if server restarts
- ✅ Can handle multiple concurrent requests
- ✅ Can scale workers independently
- ✅ Better for production with multiple iPads

### Without Redis (Direct Processing):

- Jobs process immediately in the API server
- No persistence (lost on restart)
- Simpler for testing
- Limited concurrency

---

## Next Steps

Once Redis and the worker are running:

1. ✅ Test with Postman
2. ✅ Monitor both terminals for logs
3. ✅ Check job status via API
4. ✅ Verify final images are generated

You're all set! 🎉

