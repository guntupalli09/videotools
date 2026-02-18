/**
 * Verify video-to-transcript and video-to-subtitles (anonymous + signed-in).
 *
 * Usage (pick one):
 *
 *   A) Credentials file (recommended for CMD): create server/scripts/verify-credentials.env
 *      with:
 *        AUTH_EMAIL=your@email.com
 *        AUTH_PASSWORD=yourpassword
 *      Then run:
 *        node scripts/verify-video-upload.js "C:\path\to\video.avi"
 *
 *   B) Environment variables:
 *      PowerShell: $env:AUTH_EMAIL="..."; $env:AUTH_PASSWORD="..."; node scripts/verify-video-upload.js "C:\path\to\video.avi"
 *      CMD:        set AUTH_EMAIL=your@email.com
 *                  set AUTH_PASSWORD=yourpassword
 *                  node scripts/verify-video-upload.js "C:\path\to\video.avi"
 *
 *   BASE_URL defaults to http://localhost:3001 (set in env or in verify-credentials.env if needed).
 *   Do not commit verify-credentials.env.
 */
const fs = require('fs')
const path = require('path')

// Load optional verify-credentials.env (same dir as this script)
const scriptDir = path.dirname(__filename)
const credPath = path.join(scriptDir, 'verify-credentials.env')
if (fs.existsSync(credPath)) {
  const lines = fs.readFileSync(credPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
}

const BASE = process.env.BASE_URL || 'http://localhost:3001'
const VIDEO_PATH = process.argv[2] || process.env.VIDEO_PATH
const AUTH_EMAIL = process.env.AUTH_EMAIL
const AUTH_PASSWORD = process.env.AUTH_PASSWORD

function log(name, ok, detail) {
  const status = ok ? 'OK' : 'FAIL'
  console.log(`[${status}] ${name}${detail ? ' ' + JSON.stringify(detail) : ''}`)
}

function handleFetchError(err, label) {
  if (err?.cause?.code === 'ECONNREFUSED') {
    console.error(`[FAIL] ${label}: Cannot connect to ${BASE}. Is the server running? (e.g. npm run dev)`)
  } else {
    console.error(`[FAIL] ${label}:`, err?.message || err)
  }
}

async function login() {
  if (!AUTH_EMAIL || !AUTH_PASSWORD) return null
  let r
  try {
    r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: AUTH_EMAIL, password: AUTH_PASSWORD }),
  })
  } catch (err) {
    handleFetchError(err, 'Login')
    return null
  }
  const data = await r.json().catch(() => ({}))
  if (r.status !== 200 || !data.token) {
    console.log('[WARN] Login failed:', r.status, data.message || data)
    return null
  }
  return data.token
}

async function uploadVideo(token, toolType, label) {
  const form = new FormData()
  const buf = fs.readFileSync(VIDEO_PATH)
  const name = path.basename(VIDEO_PATH)
  form.append('file', new Blob([buf]), name)
  form.append('toolType', toolType)
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const r = await fetch(`${BASE}/api/upload`, { method: 'POST', headers, body: form })
  const data = await r.json().catch(() => ({}))
  const ok = r.status === 202 && data.jobId
  log(label, ok, ok ? { jobId: data.jobId, hasJobToken: !!data.jobToken } : { status: r.status, body: data })
  return { ok, jobId: data.jobId, jobToken: data.jobToken }
}

async function pollJob(jobId, jobToken, label) {
  const url = jobToken
    ? `${BASE}/api/job/${jobId}?jobToken=${encodeURIComponent(jobToken)}`
    : `${BASE}/api/job/${jobId}`
  const r = await fetch(url)
  const data = await r.json().catch(() => ({}))
  // Pass if we got 200 and job payload (token-based access works); job may be queued/processing/completed/failed
  const ok = r.status === 200 && data.status != null
  log(label, ok, ok ? { status: data.status } : { status: r.status, body: data })
  return ok
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function pollUntilDone(jobId, jobToken, maxWaitMs) {
  const url = `${BASE}/api/job/${jobId}?jobToken=${encodeURIComponent(jobToken)}`
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    const r = await fetch(url)
    const data = await r.json().catch(() => ({}))
    if (r.status !== 200 || !data.status) return null
    if (data.status === 'completed') return data
    if (data.status === 'failed') return data
    await sleep(2000)
  }
  return null
}

async function main() {
  if (!VIDEO_PATH || !fs.existsSync(VIDEO_PATH)) {
    console.error('Usage: set AUTH_EMAIL=... AUTH_PASSWORD=... then run:')
    console.error('  node scripts/verify-video-upload.js "C:\\path\\to\\video.avi"')
    console.error('VIDEO_PATH (arg or env) must be a valid file path.')
    process.exit(1)
  }

  console.log('Base URL:', BASE)
  console.log('Video:', VIDEO_PATH)
  console.log('Auth:', AUTH_EMAIL ? `${AUTH_EMAIL} (password set)` : 'anonymous only')
  console.log('')

  const token = await login()
  if (AUTH_EMAIL && !token) {
    console.log('Skipping signed-in tests (login failed). Continuing with anonymous only.\n')
  }

  const results = {}

  results.transcriptAnon = await uploadVideo(null, 'video-to-transcript', 'video-to-transcript (anonymous)')
  results.transcriptAuth = token
    ? await uploadVideo(token, 'video-to-transcript', 'video-to-transcript (signed-in)')
    : { ok: false }

  results.subtitlesAnon = await uploadVideo(null, 'video-to-subtitles', 'video-to-subtitles (anonymous)')
  results.subtitlesAuth = token
    ? await uploadVideo(token, 'video-to-subtitles', 'video-to-subtitles (signed-in)')
    : { ok: false }

  console.log('')
  // Prefer signed-in job for poll (higher plan; long videos may fail for anonymous/free 15-min limit)
  const anyJob = (results.subtitlesAuth.jobId && results.subtitlesAuth.jobToken)
    ? results.subtitlesAuth
    : (results.transcriptAuth.jobId && results.transcriptAuth.jobToken)
      ? results.transcriptAuth
      : (results.subtitlesAnon.jobId && results.subtitlesAnon.jobToken)
        ? results.subtitlesAnon
        : results.transcriptAnon
  if (anyJob?.jobId && anyJob?.jobToken) {
    await pollJob(anyJob.jobId, anyJob.jobToken, 'Poll job with jobToken')
  }

  // Show where to get transcript/subtitle output (poll signed-in jobs briefly; completed = show download link)
  console.log('')
  console.log('--- Where to see transcript / subtitles ---')
  const showResult = async (job, label) => {
    if (!job?.jobId || !job?.jobToken) return
    const data = await pollUntilDone(job.jobId, job.jobToken, 8000)
    if (data?.status === 'completed' && data.result) {
      const u = data.result.downloadUrl || data.result.primaryDownloadUrl
      const name = data.result.fileName || data.result.primaryFileName || 'output'
      if (u) {
        const full = u.startsWith('http') ? u : BASE + u
        console.log(label + ':', full)
        console.log('  -> Download in browser or: curl -o', name, full)
      } else if (data.result.multiLanguage) {
        console.log(label + ': (multi-language zip)', BASE + (data.result.downloadUrl || ''))
      }
    } else if (data?.status === 'failed') {
      console.log(label + ': job failed:', data.result?.message || data.error_message || 'unknown')
    } else {
      console.log(label + ': still processing or timeout; check the app or poll again.')
    }
  }
  await showResult(results.transcriptAuth, 'Transcript (signed-in)')
  await showResult(results.subtitlesAuth, 'Subtitles (signed-in)')
  console.log('')

  const allOk =
    results.transcriptAnon.ok &&
    results.subtitlesAnon.ok &&
    (!token || (results.transcriptAuth.ok && results.subtitlesAuth.ok))
  console.log(allOk ? 'All checks passed.' : 'Some checks failed.')
  process.exit(allOk ? 0 : 1)
}

main().catch((err) => {
  if (err?.cause?.code === 'ECONNREFUSED') {
    console.error('Cannot connect to', BASE + '. Is the server running? (e.g. npm run dev)')
  } else {
    console.error(err)
  }
  process.exit(1)
})
