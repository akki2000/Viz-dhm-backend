# Image Specifications Guide

## Overview

This guide provides detailed specifications for both background images and user photos to ensure optimal results from the photo booth processing pipeline.

---

## Background Images

### Purpose
Background images are the stadium or captain scenes where users will be composited.

### Recommended Specifications

#### Resolution
- **Minimum:** 1920x1080 (Full HD)
- **Recommended:** 3840x2160 (4K) for best quality on large displays
- **Maximum:** No hard limit, but keep under 10MB for reasonable processing speed

#### Aspect Ratio
- **Primary:** 16:9 (landscape) or 4:3 (landscape) - standard for most displays
- **Alternative:** 9:16 (portrait) or 3:4 (portrait) if displaying on portrait-oriented screens
- **Note:** The app works with **any aspect ratio** - it automatically handles different ratios by centering and positioning dynamically

#### File Format
- **Recommended:** `.jpg` or `.jpeg` (smaller file size, faster processing)
- **Alternative:** `.png` (if you need lossless quality, but larger files)

#### File Size
- **Target:** Under 5MB
- **Maximum:** 10MB+ works but processing will be slower

#### Content Guidelines
1. **Composition:**
   - Important elements should be in upper 2/3 of image
   - Bottom center area will have the composited person
   - Leave space at bottom for foreground subject

2. **Quality:**
   - High resolution, sharp images
   - Well-lit, professional photography
   - Avoid excessive compression artifacts

3. **Colors:**
   - Avoid colors that match typical clothing (helps with edge detection)
   - High contrast with foreground subject works best

4. **Lighting:**
   - Match lighting direction with expected foreground lighting
   - Consistent lighting across the image

### Example Background Sizes

| Use Case | Resolution | Aspect Ratio | File Size (approx) |
|----------|-----------|--------------|-------------------|
| Standard Display | 1920x1080 | 16:9 | 1-3 MB |
| Standard Display (4:3) | 1600x1200 | 4:3 | 1-3 MB |
| High Quality | 3840x2160 | 16:9 | 5-8 MB |
| High Quality (4:3) | 3200x2400 | 4:3 | 5-8 MB |
| Portrait Display | 1080x1920 | 9:16 | 1-3 MB |
| Portrait Display (3:4) | 1200x1600 | 3:4 | 1-3 MB |

---

## User Photos (Foreground Images)

### Purpose
Photos taken in front of the green screen that will have the background removed and be composited onto the background image.

### Recommended Specifications

#### Resolution
- **Minimum:** 1280x720 (HD) - acceptable quality
- **Recommended:** 1920x1080 (Full HD) - best balance of quality and file size
- **Optimal:** 3840x2160 (4K) if file size allows
- **Maximum:** Limited by 10MB upload limit

#### Aspect Ratio
- **Recommended:** 9:16 (portrait) or 3:4 (portrait) - typical for photo booth setups
- **Alternative:** 16:9 (landscape) or 4:3 (landscape) - if camera is positioned horizontally
- **Note:** The app automatically scales and positions the foreground, so **any aspect ratio works** - it dynamically calculates positioning based on actual image dimensions

#### File Format
- **Recommended:** `.jpg` or `.jpeg` (good quality, smaller size)
- **Alternative:** `.png` (higher quality but larger files)

#### File Size
- **Target:** 1-3MB for 1920x1080 photos
- **Maximum:** 10MB (hard limit set in the app)

#### Green Screen Requirements

**Color:**
- Use chroma key green (RGB approximately: 0, 177, 64)
- Standard green screen fabric or paint
- Avoid blue screens (not currently supported)

**Lighting:**
- **Even lighting** across entire green screen
- Avoid shadows, wrinkles, or folds
- Use soft, diffused lighting to minimize shadows
- Light the green screen separately from the subject

**Setup:**
- Green screen should be smooth and wrinkle-free
- Subject should be 3-6 feet from green screen
- Ensure no green screen spill on subject (use rim lighting if needed)

**Subject:**
- Well-lit person/subject
- Good separation from green screen
- Avoid clothing that matches green screen color
- Avoid transparent or reflective materials

### Example User Photo Sizes

| Camera Setup | Resolution | Aspect Ratio | File Size (approx) |
|--------------|-----------|--------------|-------------------|
| iPad Portrait (9:16) | 1080x1920 | 9:16 | 1-2 MB |
| iPad Portrait (3:4) | 1200x1600 | 3:4 | 1-2 MB |
| iPad Landscape (16:9) | 1920x1080 | 16:9 | 1-3 MB |
| iPad Landscape (4:3) | 1600x1200 | 4:3 | 1-3 MB |
| High Res Camera | 3840x2160 | 16:9 | 5-8 MB |
| High Res Camera (4:3) | 3200x2400 | 4:3 | 5-8 MB |

---

## Processing Behavior

### How Images Are Processed

1. **User Photo:**
   - Green screen is removed (pixels matching green threshold become transparent)
   - Image maintains original dimensions
   - Saved as PNG with alpha channel

2. **Compositing:**
   - Foreground is automatically centered horizontally
   - Positioned at bottom (50px from bottom edge)
   - Can be scaled if needed (default scale: 1.0)

3. **Final Output:**
   - Final image matches background dimensions
   - Saved as JPEG for smaller file size
   - Enhanced by AI for better blending

### Scaling Considerations

The app automatically:
- Centers the foreground horizontally
- Positions at bottom of background
- Maintains aspect ratio of foreground
- Scales if `scale` parameter is configured (default: 1.0)

**If foreground is too large/small:**
- Adjust the `scale` parameter in `src/services/imageProcessing.service.ts`
- Default: `scale: 1.0` (no scaling)
- Example: `scale: 0.8` (makes foreground 80% of original size)

---

## Best Practices

### For Background Images:
1. ✅ Use high-resolution images (at least 1920x1080)
2. ✅ Keep file sizes reasonable (under 5MB)
3. ✅ Ensure important content is in upper portion
4. ✅ Match lighting style with expected foreground
5. ✅ Use consistent aspect ratios across all backgrounds

### For User Photos:
1. ✅ Use proper green screen setup (even lighting, smooth surface)
2. ✅ Capture at least 1920x1080 resolution
3. ✅ Keep file sizes under 5MB for faster upload
4. ✅ Ensure good separation between subject and green screen
5. ✅ Use consistent camera positioning and framing

### For Photo Booth Setup:
1. ✅ Fixed camera position (consistent framing)
2. ✅ Consistent lighting setup
3. ✅ Standardized green screen backdrop
4. ✅ Test with sample photos before event
5. ✅ Adjust composite positioning based on camera angle

---

## Troubleshooting Image Issues

### Background Image Too Large
- **Symptom:** Slow processing
- **Solution:** Resize to 1920x1080 or 3840x2160, compress JPEG quality

### User Photo Too Large
- **Symptom:** Upload fails or slow
- **Solution:** Resize to 1920x1080, compress JPEG quality

### Poor Green Screen Removal
- **Symptom:** Green edges or incomplete removal
- **Solution:** 
  - Improve green screen lighting
  - Adjust green screen thresholds in `src/utils/greenScreen.ts`
  - Ensure proper green screen color

### Foreground Too Small/Large in Final Image
- **Symptom:** Person doesn't fit well in composition
- **Solution:** Adjust `scale` parameter in `src/services/imageProcessing.service.ts`

### Aspect Ratio Mismatch
- **Symptom:** Distorted or poorly positioned foreground
- **Solution:** Use consistent aspect ratios, or adjust composite positioning

---

## Quick Reference

| Image Type | Min Resolution | Recommended | Max File Size | Format |
|-----------|---------------|-------------|---------------|--------|
| Background | 1920x1080 | 3840x2160 | 5MB | JPG/PNG |
| User Photo | 1280x720 | 1920x1080 | 10MB | JPG/PNG |

**Recommended Setup (16:9 / 9:16):**
- Background: 3840x2160 (4K), 16:9, ~3-5MB JPG
- User Photo: 1920x1080 (Full HD), 9:16, ~1-3MB JPG
- Green Screen: Chroma key green, even lighting

**Recommended Setup (4:3 / 3:4):**
- Background: 3200x2400 (4K equivalent), 4:3, ~3-5MB JPG
- User Photo: 1600x1200 (Full HD equivalent), 3:4, ~1-3MB JPG
- Green Screen: Chroma key green, even lighting

**Note:** Both setups work equally well - choose based on your camera/display preferences!

