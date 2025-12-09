# Testing Multiple Jobs Concurrently in Postman

This guide shows you how to test 2-4 jobs at the same time to verify queue concurrency.

---

## Method 1: Postman Collection Runner (Recommended)

### Step 1: Create a Collection

1. Open Postman
2. Click **"New"** → **"Collection"**
3. Name it: `Photo Booth - Concurrent Test`

### Step 2: Add Multiple Requests

1. **Right-click the collection** → **"Add Request"**
2. Name it: `Job 1`
3. Set method to **POST**
4. Set URL: `http://localhost:3000/api/jobs`
5. Go to **Body** tab → Select **form-data**
6. Add fields:
   - `photo`: [Select File] - Choose your test image
   - `mode`: `stadium`
   - `backgroundId`: `stadium1`
   - `userSessionId`: `test-user-1`

7. **Repeat steps 1-6** to create:
   - `Job 2` (use `test-user-2`)
   - `Job 3` (use `test-user-3`)
   - `Job 4` (use `test-user-4`)

### Step 3: Run Collection

1. Click on your collection
2. Click **"Run"** button (top right)
3. In the **Collection Runner**:
   - **Iterations:** `1` (runs all requests once)
   - **Delay:** `0` (no delay between requests)
   - **Data:** Leave empty
4. Click **"Run Photo Booth - Concurrent Test"**

**Result:** All 4 jobs will be submitted almost simultaneously!

---

## Method 2: Manual Quick Submission

### Step 1: Prepare Multiple Requests

1. Create 2-4 POST requests in Postman
2. Set them all to: `http://localhost:3000/api/jobs`
3. Configure each with form-data (same as above)

### Step 2: Send Them Quickly

1. Open all requests in separate tabs
2. Click **"Send"** on each one **rapidly** (within 1-2 seconds)
3. Watch the responses - each should get a different `jobId`

**Note:** This method works but Collection Runner is more reliable.

---

## Method 3: Using Postman Variables (Advanced)

### Step 1: Create Environment Variables

1. Click **"Environments"** (left sidebar)
2. Click **"+"** to create new environment
3. Name it: `Photo Booth Local`
4. Add variables:
   - `base_url`: `http://localhost:3000`
   - `test_image`: (you'll set this manually)

### Step 2: Use Variables in Requests

In your request URL:
```
{{base_url}}/api/jobs
```

### Step 3: Create Collection with Variables

Create requests that use:
- `{{base_url}}/api/jobs`
- Different `userSessionId` values: `test-{{$randomInt}}`

---

## What to Watch For

### Terminal 1 (API Server)

You should see multiple requests logged:
```
[abc-123] Request received at 2025-01-07T...
[def-456] Request received at 2025-01-07T...
[ghi-789] Request received at 2025-01-07T...
[jkl-012] Request received at 2025-01-07T...
```

### Terminal 2 (Worker)

You should see jobs being processed (up to concurrency limit):

**If concurrency = 2:**
```
Processing job abc-123...
Processing job def-456...
[abc-123] Step 1: Processing image...
[def-456] Step 1: Processing image...
[abc-123] Step 1 completed...
[def-456] Step 1 completed...
...
Job abc-123 completed
Job def-456 completed
Processing job ghi-789...  ← Next job starts after one completes
Processing job jkl-012...
```

**Key Observation:**
- Only 2 jobs process simultaneously (if concurrency = 2)
- Other jobs wait in queue
- As jobs complete, waiting jobs start processing

---

## Verify Queue is Working

### Check Queue Status

**GET** `http://localhost:3000/health/queue`

After submitting 4 jobs, you might see:
```json
{
  "queueEnabled": true,
  "metrics": {
    "waiting": 2,    ← Jobs waiting to be processed
    "active": 2,     ← Jobs currently processing
    "completed": 0,
    "failed": 0
  }
}
```

### Check Individual Job Statuses

For each `jobId` from the responses:

**GET** `http://localhost:3000/api/jobs/{jobId}`

You should see:
- Some jobs: `"status": "queued"` (waiting)
- Some jobs: `"status": "processing"` (active)
- Completed jobs: `"status": "completed"`

---

## Testing Different Scenarios

### Scenario 1: Test Queue Capacity

Submit 10 jobs at once:
- First 2 process immediately (concurrency = 2)
- Next 8 wait in queue
- As jobs complete, waiting jobs start

### Scenario 2: Test Different Backgrounds

Submit jobs with different `backgroundId`:
- `stadium1`, `stadium2`, `captain1`, `captain2`
- Verify all process correctly

### Scenario 3: Test Mixed Modes

Submit jobs with different `mode`:
- Some `stadium`, some `captain`
- Verify queue handles both types

---

## Postman Collection Example

Here's a JSON you can import into Postman:

```json
{
  "info": {
    "name": "Photo Booth - Concurrent Test",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Job 1",
      "request": {
        "method": "POST",
        "header": [],
        "body": {
          "mode": "formdata",
          "formdata": [
            {
              "key": "photo",
              "type": "file",
              "src": []
            },
            {
              "key": "mode",
              "value": "stadium",
              "type": "text"
            },
            {
              "key": "backgroundId",
              "value": "stadium1",
              "type": "text"
            },
            {
              "key": "userSessionId",
              "value": "test-user-1",
              "type": "text"
            }
          ]
        },
        "url": {
          "raw": "http://localhost:3000/api/jobs",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "jobs"]
        }
      }
    }
  ]
}
```

**Note:** You'll need to add the file manually for the `photo` field.

---

## Quick Test Script

1. **Create 4 requests** in Postman collection
2. **Use Collection Runner** with:
   - Iterations: 1
   - Delay: 0ms
3. **Watch Terminal 2** - should see jobs processing
4. **Check `/health/queue`** - see queue metrics
5. **Check job statuses** - verify they complete

---

## Expected Behavior

**With Queue (Concurrency = 2):**
- Submit 4 jobs
- 2 start processing immediately
- 2 wait in queue
- As jobs complete, waiting jobs start
- All 4 complete eventually

**Without Queue:**
- All 4 would process simultaneously in API server
- Could overwhelm the server
- No control over concurrency

---

## Troubleshooting

### All Jobs Stay "queued"

**Problem:** Worker not processing

**Check:**
- Is worker running? (Terminal 2)
- Check worker logs for errors
- Verify Redis connection

### Jobs Process Too Slowly

**Problem:** Concurrency too low

**Solution:** Increase worker concurrency:
```bash
WORKER_CONCURRENCY=4 npm run dev:worker
```

### Jobs Fail

**Problem:** Background images missing or other errors

**Check:**
- Verify background files exist
- Check job status for error messages
- Review worker logs

---

## Tips

1. **Use different images** for each job to see variety
2. **Use different `userSessionId`** to track which job is which
3. **Watch both terminals** to see the full flow
4. **Check queue metrics** to understand queue state
5. **Start with 2 jobs**, then test 4, then 10

This will help you verify the queue system handles concurrent requests properly! 🚀

