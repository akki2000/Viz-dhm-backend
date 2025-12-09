# Testing Guide with Postman

## Prerequisites

### 1. Prepare Background Images

You need to add background images to these folders:

**Stadium backgrounds:**
- Place images in: `assets/backgrounds/stadium/`
- Name them: `stadium1.jpg`, `stadium2.jpg`, etc. (or `.png`, `.jpeg`)
- Example: `assets/backgrounds/stadium/stadium1.jpg`

**Captain backgrounds:**
- Place images in: `assets/backgrounds/captains/`
- Name them: `captain1.jpg`, `captain2.jpg`, etc.
- Example: `assets/backgrounds/captains/captain1.jpg`

**Note:** The `backgroundId` in your API request should match the filename **without extension**.

#### Background Image Specifications:

**Recommended Size:**
- **Resolution:** 1920x1080 (Full HD) or 3840x2160 (4K) for best quality
- **Aspect Ratio:** 16:9 (landscape) - matches most displays
- **Alternative:** 1080x1920 (9:16 portrait) if displaying on portrait screens

**File Format:**
- `.jpg` or `.jpeg` (recommended - smaller file size)
- `.png` (if you need transparency, though not needed for backgrounds)

**File Size:**
- Keep under 5MB for faster processing
- The app can handle larger files, but processing will be slower

**Content Guidelines:**
- High quality, well-lit images
- Avoid busy patterns that might clash with foreground
- Ensure important elements aren't where the person will be composited (bottom center)

### 2. Prepare a Test Photo (User Image)

You need a photo with a **green screen background** for testing:

**Recommended Specifications:**

**Resolution:**
- **Minimum:** 1280x720 (HD)
- **Recommended:** 1920x1080 (Full HD) or higher
- **Maximum:** Limited by 10MB file size upload limit

**Aspect Ratio:**
- **Recommended:** 16:9 (landscape) or 9:16 (portrait)
- The code will automatically scale and position the foreground
- Portrait photos work well since person is positioned at bottom

**File Format:**
- `.jpg` or `.jpeg` (recommended)
- `.png` (if you need higher quality, but larger file size)

**File Size:**
- Must be under 10MB (upload limit)
- Typical 1920x1080 photo: 1-3MB

**Green Screen Requirements:**
- Use chroma key green background (RGB approximately 0, 177, 64)
- Even, well-lit green screen for best results
- Avoid shadows or wrinkles on green screen
- Person should be well-lit and separated from background

**For quick testing without a real green screen:**
- You can use any photo, but the green screen removal won't work perfectly
- The app will still process it, but results may vary
- Try to use photos with solid, contrasting backgrounds

## Postman Setup

### Step 1: Create a New Request

1. Open Postman
2. Create a new **POST** request
3. Set URL: `http://localhost:3000/api/jobs`

### Step 2: Configure Request

1. Go to the **Body** tab
2. Select **form-data** (not raw or x-www-form-urlencoded)
3. Add the following fields:

| Key | Type | Value |
|-----|------|-------|
| `photo` | **File** | Select your test photo file |
| `mode` | **Text** | `stadium` or `captain` |
| `backgroundId` | **Text** | `stadium1` (or your background filename without extension) |
| `userSessionId` | **Text** (optional) | `test-user-123` |

**Important:** 
- `photo` must be set as **File** type (not Text)
- `mode` must be exactly `"stadium"` or `"captain"`
- `backgroundId` must match your background filename (without extension)

### Step 3: Send Request

Click **Send**. You should get a response like:

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing"
}
```

## Check Job Status

### Step 1: Create Status Request

1. Create a new **GET** request
2. Set URL: `http://localhost:3000/api/jobs/{jobId}`
   - Replace `{jobId}` with the `jobId` from the previous response
   - Example: `http://localhost:3000/api/jobs/550e8400-e29b-41d4-a716-446655440000`

### Step 2: Send Request

Click **Send**. You'll see different responses based on status:

**Processing:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing"
}
```

**Completed:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "resultImageUrl": "/static/outputs/550e8400-e29b-41d4-a716-446655440000_final.jpg"
}
```

**Failed:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "errorMessage": "Background image not found: ..."
}
```

## View Final Image

Once the job is completed, you can view the final image:

1. Open your browser
2. Go to: `http://localhost:3000{resultImageUrl}`
   - Example: `http://localhost:3000/static/outputs/550e8400-e29b-41d4-a716-446655440000_final.jpg`

## Example Postman Collection

Here's a complete example you can import:

### Request 1: Submit Job (Stadium)
- **Method:** POST
- **URL:** `http://localhost:3000/api/jobs`
- **Body (form-data):**
  - `photo`: [Select file]
  - `mode`: `stadium`
  - `backgroundId`: `stadium1`
  - `userSessionId`: `test-123`

### Request 2: Submit Job (Captain)
- **Method:** POST
- **URL:** `http://localhost:3000/api/jobs`
- **Body (form-data):**
  - `photo`: [Select file]
  - `mode`: `captain`
  - `backgroundId`: `captain1`
  - `userSessionId`: `test-123`

### Request 3: Check Status
- **Method:** GET
- **URL:** `http://localhost:3000/api/jobs/{{jobId}}`
  - Use Postman variables: `{{jobId}}`

## Troubleshooting

### Error: "Background image not found"
- Make sure the background file exists in the correct folder
- Check that `backgroundId` matches the filename (without extension)
- Supported formats: `.jpg`, `.jpeg`, `.png`

### Error: "Photo file is required"
- Make sure `photo` is set as **File** type in Postman, not Text
- Select an actual image file

### Error: "Mode must be 'stadium' or 'captain'"
- Check spelling: must be exactly `stadium` or `captain` (lowercase)

### Job stays in "processing" forever
- Check server logs for errors
- Verify Gemini API key is set correctly
- Check that background image exists

## Quick Test Without Real Images

If you want to test the API structure without real images:

1. Create a simple test image (any photo)
2. Create a simple background image (any image)
3. Place background in: `assets/backgrounds/stadium/test.jpg`
4. Use `backgroundId: "test"` in your request

The processing will run, but results may not be perfect without a real green screen.

