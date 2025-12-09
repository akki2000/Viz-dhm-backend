# How to Verify Queue System is Working

## Quick Checks

### 1. Check if Redis is Running

```bash
docker exec -it redis redis-cli ping
```

**Expected:** Should return `PONG`

If it doesn't, Redis isn't running. Start it:
```bash
docker start redis
```

---

### 2. Check if Both Processes are Running

**Terminal 1 (API Server):**
- Should show: `✅ Redis queue initialized`
- Should show: `Server running on port 3000`

**Terminal 2 (Worker):**
- Should show: `Photo processing worker started with concurrency: 2`
- Should show: `Waiting for jobs...`

If either is missing, start them:
- Terminal 1: `npm run dev`
- Terminal 2: `npm run dev:worker`

---

### 3. Check Redis Queue Status

Connect to Redis and check the queue:

```bash
docker exec -it redis redis-cli
```

Then run these commands:

```redis
# Check if queue exists
KEYS *

# Check queue length
LLEN bull:photo-processing-queue:waiting
LLEN bull:photo-processing-queue:active
LLEN bull:photo-processing-queue:completed
LLEN bull:photo-processing-queue:failed

# Exit Redis CLI
exit
```

**Expected:**
- `waiting`: Jobs waiting to be processed (should be 0 or small number)
- `active`: Jobs currently being processed (0-2, depending on concurrency)
- `completed`: Completed jobs (grows as jobs finish)
- `failed`: Failed jobs (should be 0 if everything works)

---

## Test the Queue System

### Step 1: Submit a Test Job

Use Postman to submit a job:

**POST** `http://localhost:3000/api/jobs`
- `photo`: [your test image]
- `mode`: `stadium`
- `backgroundId`: `stadium1`

**Expected Response:**
```json
{
  "jobId": "abc-123-def",
  "status": "queued"
}
```

**Note:** Status should be `"queued"` (not `"processing"`), which means it's in the queue!

---

### Step 2: Watch the Logs

**Terminal 1 (API Server) should show:**
```
[abc-123-def] Request received at 2025-01-07T...
```

**Terminal 2 (Worker) should show:**
```
Processing job abc-123-def...
[abc-123-def] Step 1: Processing image...
[abc-123-def] Step 1 completed in 950ms
[abc-123-def] Step 2: Enhancing with AI...
[abc-123-def] Step 2 completed in 3200ms
[abc-123-def] Step 3: Saving final image...
[abc-123-def] Step 3 completed in 50ms
[abc-123-def] ✅ Processing completed successfully
[abc-123-def] ⏱️  Timing Summary:
...
Job abc-123-def completed
```

**If you see this, the queue is working! ✅**

---

### Step 3: Check Job Status

**GET** `http://localhost:3000/api/jobs/{jobId}`

**While processing:**
```json
{
  "jobId": "abc-123-def",
  "status": "processing"
}
```

**After completion:**
```json
{
  "jobId": "abc-123-def",
  "status": "completed",
  "resultImageUrl": "/static/outputs/abc-123-def_final.jpg"
}
```

---

## Troubleshooting

### Problem: Status is "processing" immediately (not "queued")

**Symptom:** Job status is `"processing"` right after submission

**Cause:** Queue is not working, falling back to direct processing

**Check:**
1. Is Redis running? `docker ps` should show redis container
2. Is worker running? Check Terminal 2
3. Check Terminal 1 for errors about Redis connection

---

### Problem: Jobs stay in "queued" status forever

**Symptom:** Job status stays `"queued"`, never changes to `"processing"`

**Cause:** Worker is not picking up jobs

**Check:**
1. Is worker running? Check Terminal 2
2. Check Terminal 2 for errors
3. Verify Redis connection in worker logs

---

### Problem: "Redis queue initialized" but jobs don't queue

**Symptom:** Server says queue initialized, but jobs process directly

**Check:**
1. Look for connection errors in Terminal 1
2. Test Redis connection: `docker exec -it redis redis-cli ping`
3. Check `.env` has correct `REDIS_URL`

---

## Visual Verification Checklist

✅ **Redis Running:**
```bash
docker ps | grep redis
# Should show redis container
```

✅ **API Server Connected:**
```
Terminal 1 shows: ✅ Redis queue initialized
```

✅ **Worker Running:**
```
Terminal 2 shows: Waiting for jobs...
```

✅ **Job Queued:**
```
API response: { "status": "queued" }
```

✅ **Worker Processing:**
```
Terminal 2 shows: Processing job...
```

✅ **Job Completed:**
```
Terminal 2 shows: ✅ Processing completed successfully
API status: { "status": "completed" }
```

---

## Quick Test Script

Run this to test everything at once:

```bash
# 1. Check Redis
docker exec -it redis redis-cli ping

# 2. Check if processes are running (in separate terminals)
# Terminal 1: npm run dev
# Terminal 2: npm run dev:worker

# 3. Submit a test job via Postman
# 4. Watch Terminal 2 for processing logs
# 5. Check job status via API
```

---

## Expected Behavior

**With Queue (Redis + Worker):**
1. Submit job → Status: `"queued"`
2. Worker picks up job → Status: `"processing"`
3. Worker completes → Status: `"completed"`

**Without Queue (Direct Processing):**
1. Submit job → Status: `"processing"` (immediately)
2. API server processes → Status: `"completed"`

The key difference: **With queue, status starts as "queued"**. Without queue, it's "processing" immediately.

