# Quick Start Guide

## 1. Install Dependencies

```bash
npm install
```

## 2. Set Up Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=3000
# REDIS_URL=redis://localhost:6379  # Optional - omit for direct processing mode
GEMINI_API_KEY=your-gemini-api-key
```

Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/)

## 3. Start Redis (Optional)

**Skip this step if you want to test without Redis!** The app will work in direct processing mode.

**For queue-based processing, see `REDIS_SETUP.md` for detailed instructions.**

**Quick start with Docker:**
```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

**Verify Redis is running:**
```bash
docker exec -it redis redis-cli ping
# Should return: PONG
```

## 4. Add Background Images

Place your background images in:
- `assets/backgrounds/stadium/` - e.g., `stadium1.jpg`, `stadium2.jpg`
- `assets/backgrounds/captains/` - e.g., `captain1.jpg`, `captain2.jpg`

## 5. Run the Application

**With Redis:**
**Terminal 1 - API Server:**
```bash
npm run dev
```

**Terminal 2 - Worker:**
```bash
npm run dev:worker
```

**Without Redis (Simpler for testing):**
Just run the API server:
```bash
npm run dev
```

Jobs will be processed directly without a queue. The worker is not needed.

## 6. Test the API

### Submit a Job

```bash
curl -X POST http://localhost:3000/api/jobs \
  -F "photo=@/path/to/your/photo.jpg" \
  -F "mode=stadium" \
  -F "backgroundId=stadium1"
```

Response:
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued"
}
```

### Check Job Status

```bash
curl http://localhost:3000/api/jobs/550e8400-e29b-41d4-a716-446655440000
```

When completed, you'll get:
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "resultImageUrl": "/static/outputs/550e8400-e29b-41d4-a716-446655440000_final.jpg"
}
```

### View Final Image

Open in browser:
```
http://localhost:3000/static/outputs/550e8400-e29b-41d4-a716-446655440000_final.jpg
```

## Troubleshooting

- **Redis connection error**: If you see this, either start Redis or remove `REDIS_URL` from `.env` to use direct processing mode
- **Worker not processing**: Only needed with Redis. Without Redis, jobs process directly in the API server
- **Background not found**: Verify file exists and `backgroundId` matches filename (without extension)
- **Gemini API errors**: Check `GEMINI_API_KEY` in `.env` and verify you have API access

