# AI Photo Booth Backend

A Node.js + TypeScript backend for an AI-powered photo booth application that processes green-screen photos and composites them onto stadium backgrounds or captain backgrounds.

## Features

- Green screen removal using chroma-key algorithm
- Image compositing with configurable positioning
- AI-powered image enhancement via Google Gemini API
- Queue-based job processing with BullMQ and Redis
- RESTful API for job submission and status tracking
- Static file serving for processed images

## Prerequisites

- Node.js 20+
- Redis (for queue management)
- npm or yarn

## Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
PORT=3000
REDIS_URL=redis://localhost:6379  # Optional - omit to run without Redis
GEMINI_API_KEY=your-gemini-api-key-here
```

**Note:** `REDIS_URL` is optional. If omitted, the app will run in direct processing mode (no queue). This is useful for testing, but for production with multiple iPads, Redis is recommended.

3. Create required directories:

```bash
mkdir -p uploads/raw uploads/foregrounds uploads/outputs
mkdir -p assets/backgrounds/stadium assets/backgrounds/captains
```

4. Add background images:

- Place stadium backgrounds in `assets/backgrounds/stadium/` (e.g., `stadium1.jpg`, `stadium2.jpg`)
- Place captain backgrounds in `assets/backgrounds/captains/` (e.g., `captain1.jpg`, `captain2.jpg`)

## Running Redis (Optional)

Redis is only needed if you want queue-based processing. For testing, you can skip Redis and the app will process jobs directly.

### Using Docker (Recommended)

```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

### Using Local Installation

**macOS (Homebrew):**
```bash
brew install redis
brew services start redis
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

**Windows:**
Download and install from [Redis for Windows](https://github.com/microsoftarchive/redis/releases) or use WSL.

**Without Redis:** Simply omit `REDIS_URL` from your `.env` file. The app will process jobs directly without a queue.

## Running the Application

### Development Mode

**With Redis (Queue-based):**
You need to run two processes: the API server and the worker.

**Terminal 1 - API Server:**
```bash
npm run dev
```

**Terminal 2 - Worker:**
```bash
npm run dev:worker
```

**Without Redis (Direct Processing):**
Only run the API server - jobs will be processed directly:

```bash
npm run dev
```

The worker is not needed in this mode.

### Production Mode

1. Build the TypeScript code:

```bash
npm run build
```

2. Start the API server:

```bash
npm start
```

3. If using Redis, start the worker (in a separate terminal/process):

```bash
npm run start:worker
```

**Note:** The worker is only needed when using Redis. Without Redis, jobs are processed directly in the API server.

## API Endpoints

### 1. Submit New Job

**Endpoint:** `POST /api/jobs`

**Content-Type:** `multipart/form-data`

**Request Fields:**
- `photo` (file, required): The captured image from the iPad
- `mode` (string, required): Either `"stadium"` or `"captain"`
- `backgroundId` (string, required): ID of the background image (filename without extension)
- `userSessionId` (string, optional): User session identifier

**Example using cURL:**
```bash
curl -X POST http://localhost:3000/api/jobs \
  -F "photo=@/path/to/photo.jpg" \
  -F "mode=stadium" \
  -F "backgroundId=stadium1" \
  -F "userSessionId=user123"
```

**Response:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued"
}
```

### 2. Get Job Status

**Endpoint:** `GET /api/jobs/:jobId`

**Example:**
```bash
curl http://localhost:3000/api/jobs/550e8400-e29b-41d4-a716-446655440000
```

**Response (Queued):**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued"
}
```

**Response (Processing):**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing"
}
```

**Response (Completed):**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "resultImageUrl": "/static/outputs/550e8400-e29b-41d4-a716-446655440000_final.jpg"
}
```

**Response (Failed):**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "errorMessage": "Background image not found: ..."
}
```

### 3. Health Check

**Endpoint:** `GET /health`

```bash
curl http://localhost:3000/health
```

## Processing Pipeline

1. **Upload**: Photo is saved to `uploads/raw/{jobId}.jpg`
2. **Green Screen Removal**: Background is removed, saved as `uploads/foregrounds/{jobId}.png`
3. **Compositing**: Foreground is composited onto selected background at a fixed position
4. **AI Enhancement**: Composited image is sent to AI API for lighting/edge fixes
5. **Final Output**: Enhanced image saved as `uploads/outputs/{jobId}_final.jpg`

## Configuration

### Worker Concurrency

Control how many jobs the worker processes simultaneously:

```bash
WORKER_CONCURRENCY=3 npm run dev:worker
```

Default is 2.

### Green Screen Thresholds

Adjust green screen detection in `src/utils/greenScreen.ts`:

```typescript
const greenThreshold = {
  rMin: 0,
  rMax: 100,
  gMin: 120,
  gMax: 255,
  bMin: 0,
  bMax: 120,
};
```

### Composite Position

Adjust foreground positioning in `src/services/imageProcessing.service.ts`:

```typescript
const DEFAULT_COMPOSITE_CONFIG: CompositeConfig = {
  x: 0,      // 0 = center horizontally
  y: 0,      // 0 = position at bottom
  scale: 1.0, // Scale factor
};
```

## Project Structure

```
.
├── src/
│   ├── app.ts                 # Express app setup
│   ├── server.ts              # Server entry point
│   ├── config/
│   │   ├── env.ts             # Environment variables
│   │   └── queue.ts           # BullMQ queue setup
│   ├── routes/
│   │   └── jobs.routes.ts     # API routes
│   ├── controllers/
│   │   └── jobs.controller.ts # Request handlers
│   ├── services/
│   │   ├── imageProcessing.service.ts  # Image compositing
│   │   ├── aiEditing.service.ts        # AI API integration
│   │   └── jobStatus.service.ts        # Job status lookup
│   ├── workers/
│   │   └── photoProcessing.worker.ts   # Queue worker
│   ├── types/
│   │   └── jobTypes.ts        # TypeScript types
│   ├── middleware/
│   │   └── errorHandler.ts    # Error handling
│   └── utils/
│       ├── filePaths.ts       # Path utilities
│       └── greenScreen.ts     # Green screen removal
├── assets/
│   └── backgrounds/
│       ├── stadium/           # Stadium background images
│       └── captains/          # Captain background images
├── uploads/
│   ├── raw/                   # Original uploaded photos
│   ├── foregrounds/           # Green-screen-removed images
│   └── outputs/               # Final processed images
└── dist/                      # Compiled JavaScript (after build)
```

## Troubleshooting

### Redis Connection Error

Ensure Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

### Worker Not Processing Jobs

- Check that the worker process is running
- Verify Redis connection
- Check worker logs for errors

### Gemini API Errors

- Verify `GEMINI_API_KEY` in `.env` (get your key from [Google AI Studio](https://aistudio.google.com/))
- Check that the API key has access to the `gemini-2.5-flash-image` model
- Review retry logic and adjust if needed
- Ensure you have sufficient API quota

### Background Image Not Found

- Ensure background files exist in `assets/backgrounds/stadium/` or `assets/backgrounds/captains/`
- Verify `backgroundId` matches filename (without extension)
- Supported formats: `.jpg`, `.jpeg`, `.png`

## Development

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## Deployment

See `GCP_DEPLOYMENT.md` for detailed instructions on deploying to Google Cloud Platform free tier VM.

## License

ISC

