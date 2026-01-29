# Upload API contract (backend ↔ frontend)

Reference for **Step 1 — Backend expectations** and **Step 2 — Frontend FormData**. The current frontend already matches this contract.

---

## Step 1 — Backend expectations

**Route:** `server/src/routes/upload.ts`

### Single-file upload `POST /api/upload`

| Requirement | Backend behavior |
|-------------|------------------|
| **Body** | `multipart/form-data` (FormData). Do **not** set `Content-Type: application/json`. |
| **toolType** | **Required.** From `req.body`. If missing → `400` `"toolType is required"`. |
| **file** | **Required** for file-based jobs. Multer field name must be exactly **`file`** (`upload.single('file')`). If missing → `400` `"No file uploaded"`. |
| **url** | Optional. For `video-to-transcript` or `video-to-subtitles` only; when present, no file is required. |
| **Options** | Optional: `format`, `language`, `targetLanguage`, `compressionLevel`, `trimmedStart`, `trimmedEnd`, `additionalLanguages` (JSON string). |

**File validation (backend):**

- Video tools: `validateFileType()` → magic-byte check; allowed: MP4, MOV, AVI, WEBM. Error message: `"Please upload MP4, MOV, AVI, or WEBM"`.
- Subtitle tools (`translate-subtitles`, `fix-subtitles`): `validateSubtitleFile()` → SRT/VTT content check.

**Valid toolType values (single-file):**  
Backend expects these **exact** hyphenated strings (do not invent shorter names like `transcript` or `subtitles`):  
`video-to-transcript`, `video-to-subtitles`, `translate-subtitles`, `fix-subtitles`, `compress-video` (and URL-based for the first two).

### Dual-file upload (burn-subtitles) `POST /api/upload/dual`

| Requirement | Backend behavior |
|-------------|------------------|
| **Body** | `multipart/form-data`. |
| **toolType** | Must be exactly **`burn-subtitles`**. Otherwise → `400` `"toolType must be burn-subtitles"`. |
| **video** | Multer field name **`video`** (one file). |
| **subtitles** | Multer field name **`subtitles`** (one file). |
| **trimmedStart / trimmedEnd** | Optional, in `req.body`. |

---

## Step 2 — Frontend (already correct)

**Location:** `client/src/lib/api.ts`

**Single source of truth:** `BACKEND_TOOL_TYPES` and type `BackendToolType` in `api.ts` match the backend enum exactly. All pages use `BACKEND_TOOL_TYPES.VIDEO_TO_TRANSCRIPT`, etc.—no string literals, no mapping to different names.

### Single-file and URL

- **uploadFile(file, options):**  
  `formData.append('file', file)` and `formData.append('toolType', options.toolType)`.  
  No manual `Content-Type`; fetch uses FormData and sets `multipart/form-data` with boundary.
- **uploadFromURL(url, options):**  
  `formData.append('toolType', options.toolType)` and `formData.append('url', url)`. No file. Same endpoint `/api/upload`.

### Burn-subtitles (dual)

- **uploadDualFiles(videoFile, subtitleFile, toolType, options):**  
  `formData.append('video', videoFile)`, `formData.append('subtitles', subtitleFile)`, `formData.append('toolType', toolType)`.  
  Uses **`/api/upload/dual`**, not `/api/upload`.

### Checklist (no changes needed)

- ✅ Field name is **`toolType`** (not `tool_type` or `type`).
- ✅ **toolType** is in FormData (not in a JSON body).
- ✅ No manual `Content-Type: application/json` on upload requests.
- ✅ Single-file uses field **`file`**; dual uses **`video`** and **`subtitles`**.
- ✅ File inputs use `accept` for video (e.g. `.mp4`, `.mov`, `.avi`, `.webm`) or subtitle (`.srt`, `.vtt`) where appropriate.

If uploads still fail, check: **VITE_API_URL** (correct API base), CORS, and that the backend is running and reachable.
