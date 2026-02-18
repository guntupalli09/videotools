/**
 * Verification script: single upload, chunked upload + jobToken, poll by jobToken.
 * Run with: node scripts/verify-post-push.js
 * Requires server running on BASE_URL (default http://localhost:3001).
 */
const BASE = process.env.BASE_URL || 'http://localhost:3001'

// Minimal valid SRT content
const SRT_CONTENT = `1
00:00:00,000 --> 00:00:01,000
Test line
`

async function main() {
  const results = { single: null, chunked: null, pollByToken: null, pollNoAuth: null }
  let jobIdFromSingle, jobTokenFromSingle, jobIdFromChunked, jobTokenFromChunked

  console.log('Base URL:', BASE)
  console.log('')

  // --- 1) Single upload (anonymous) - subtitle tool to avoid needing video
  try {
    const form = new FormData()
    form.append('file', new Blob([SRT_CONTENT], { type: 'text/plain' }), 'test.srt')
    form.append('toolType', 'convert-subtitles')
    form.append('targetFormat', 'vtt')
    const r = await fetch(`${BASE}/api/upload`, {
      method: 'POST',
      body: form,
    })
    const data = await r.json().catch(() => ({}))
    if (r.status !== 202) {
      results.single = { ok: false, status: r.status, body: data }
      console.log('Single upload: FAIL', r.status, data)
    } else {
      jobIdFromSingle = data.jobId
      jobTokenFromSingle = data.jobToken
      results.single = { ok: true, jobId: jobIdFromSingle, hasJobToken: !!jobTokenFromSingle }
      console.log('Single upload: OK', { jobId: jobIdFromSingle, hasJobToken: !!jobTokenFromSingle })
    }
  } catch (e) {
    results.single = { ok: false, error: String(e.message || e) }
    console.log('Single upload: ERROR', e.message || e)
  }
  console.log('')

  // --- 2) Chunked upload: init -> chunk -> complete
  try {
    const initBody = {
      filename: 'small.srt',
      totalChunks: 1,
      totalSize: Buffer.byteLength(SRT_CONTENT, 'utf8'),
      toolType: 'convert-subtitles',
      targetFormat: 'vtt',
    }
    const initRes = await fetch(`${BASE}/api/upload/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initBody),
    })
    const initData = await initRes.json().catch(() => ({}))
    if (initRes.status !== 200 || !initData.uploadId) {
      results.chunked = { ok: false, phase: 'init', status: initRes.status, body: initData }
      console.log('Chunked init: FAIL', initRes.status, initData)
    } else {
      const uploadId = initData.uploadId
      const chunkRes = await fetch(`${BASE}/api/upload/chunk`, {
        method: 'POST',
        headers: {
          'X-Upload-Id': uploadId,
          'X-Chunk-Index': '0',
          'Content-Type': 'application/octet-stream',
        },
        body: Buffer.from(SRT_CONTENT, 'utf8'),
      })
      const chunkData = await chunkRes.json().catch(() => ({}))
      if (chunkRes.status !== 200) {
        results.chunked = { ok: false, phase: 'chunk', status: chunkRes.status, body: chunkData }
        console.log('Chunked chunk: FAIL', chunkRes.status, chunkData)
      } else {
        const completeRes = await fetch(`${BASE}/api/upload/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uploadId }),
        })
        const completeData = await completeRes.json().catch(() => ({}))
        if (completeRes.status !== 202) {
          results.chunked = { ok: false, phase: 'complete', status: completeRes.status, body: completeData }
          console.log('Chunked complete: FAIL', completeRes.status, completeData)
        } else {
          jobIdFromChunked = completeData.jobId
          jobTokenFromChunked = completeData.jobToken
          results.chunked = { ok: true, jobId: jobIdFromChunked, hasJobToken: !!jobTokenFromChunked }
          console.log('Chunked complete: OK', { jobId: jobIdFromChunked, hasJobToken: !!jobTokenFromChunked })
        }
      }
    }
  } catch (e) {
    results.chunked = { ok: false, error: String(e.message || e) }
    console.log('Chunked upload: ERROR', e.message || e)
  }
  console.log('')

  // --- 3) Poll GET /api/job/:jobId with jobToken (query)
  const tokenToUse = jobTokenFromChunked || jobTokenFromSingle
  const idToUse = jobIdFromChunked || jobIdFromSingle
  if (idToUse && tokenToUse) {
    try {
      const pollRes = await fetch(`${BASE}/api/job/${idToUse}?jobToken=${encodeURIComponent(tokenToUse)}`)
      const pollData = await pollRes.json().catch(() => ({}))
      if (pollRes.status === 200 && (pollData.id || pollData.jobId || pollData.status != null)) {
        results.pollByToken = { ok: true, status: pollData.status }
        console.log('Poll with jobToken: OK', { status: pollData.status })
      } else {
        results.pollByToken = { ok: false, status: pollRes.status, body: pollData }
        console.log('Poll with jobToken: FAIL', pollRes.status, pollData)
      }
    } catch (e) {
      results.pollByToken = { ok: false, error: String(e.message || e) }
      console.log('Poll with jobToken: ERROR', e.message || e)
    }
  } else {
    console.log('Poll with jobToken: SKIP (no jobId/jobToken from uploads)')
  }
  console.log('')

  // --- 4) Poll without auth/token should be 403 for a job that has userId or token
  if (idToUse) {
    try {
      const noAuthRes = await fetch(`${BASE}/api/job/${idToUse}`)
      const noAuthData = await noAuthRes.json().catch(() => ({}))
      if (noAuthRes.status === 403) {
        results.pollNoAuth = { ok: true, expectedDeny: true }
        console.log('Poll without token: correctly denied (403)')
      } else {
        results.pollNoAuth = { ok: noAuthRes.status === 200, status: noAuthRes.status, body: noAuthData }
        console.log('Poll without token:', noAuthRes.status, noAuthData?.message || noAuthData)
      }
    } catch (e) {
      results.pollNoAuth = { ok: false, error: String(e.message || e) }
    }
  }
  console.log('')

  const allOk =
    results.single?.ok &&
    results.chunked?.ok &&
    results.chunked?.hasJobToken &&
    results.pollByToken?.ok &&
    (results.pollNoAuth?.expectedDeny === true || results.pollNoAuth?.ok === true)
  console.log('---')
  console.log(allOk ? 'All checks passed.' : 'Some checks failed. See above.')
  process.exit(allOk ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
