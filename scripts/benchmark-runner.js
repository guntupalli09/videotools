#!/usr/bin/env node
/**
 * Benchmark runner: upload a video to Video → Transcript, poll until done, report timings.
 * Use for reproducible numbers you can advertise (see docs/BENCHMARKS.md).
 *
 * Usage:
 *   node scripts/benchmark-runner.js <path-to-video>
 *   API_ORIGIN=https://your-api.example node scripts/benchmark-runner.js ./test.mp4
 *
 * Output: JSON to stdout (and optional --out file). Exit 0 on success, 1 on failure.
 */

const fs = require('fs')
const path = require('path')

const API_ORIGIN = process.env.API_ORIGIN || 'http://localhost:3001'
const POLL_INTERVAL_MS = 2000
const JOB_TIMEOUT_MS = 600_000 // 10 min

async function uploadFile(filePath) {
  const buf = fs.readFileSync(filePath)
  const stat = fs.statSync(filePath)
  const blob = new Blob([buf])
  const name = path.basename(filePath)
  const form = new FormData()
  form.append('file', blob, name)
  form.append('toolType', 'video-to-transcript')

  const start = Date.now()
  const res = await fetch(`${API_ORIGIN}/api/upload`, {
    method: 'POST',
    body: form,
    headers: {
      'Accept': 'application/json',
    },
  })
  const uploadMs = Date.now() - start

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Upload failed ${res.status}: ${text}`)
  }
  const data = await res.json()
  if (!data.jobId) throw new Error('No jobId in response: ' + JSON.stringify(data))
  return { jobId: data.jobId, uploadMs, fileSizeBytes: stat.size }
}

async function pollUntilComplete(jobId) {
  const start = Date.now()
  while (Date.now() - start < JOB_TIMEOUT_MS) {
    const res = await fetch(`${API_ORIGIN}/api/jobs/${jobId}`, {
      headers: { 'Accept': 'application/json' },
    })
    if (!res.ok) throw new Error(`Job status failed ${res.status}`)
    const data = await res.json()
    if (data.status === 'completed') {
      return {
        totalMs: Date.now() - start,
        result: data.result,
      }
    }
    if (data.status === 'failed') {
      throw new Error('Job failed: ' + (data.result?.error || data.result || 'unknown'))
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
  }
  throw new Error('Job timed out after ' + JOB_TIMEOUT_MS / 1000 + 's')
}

function main() {
  const args = process.argv.slice(2)
  const outFile = args[0] === '--out' ? args[1] : null
  const videoPath = outFile ? args[2] : args[0]
  if (!videoPath) {
    console.error('Usage: node scripts/benchmark-runner.js [--out results.json] <path-to-video>')
    process.exit(1)
  }
  if (!fs.existsSync(videoPath)) {
    console.error('File not found:', videoPath)
    process.exit(1)
  }

  ;(async () => {
    const uploadResult = await uploadFile(videoPath)
    const { totalMs, result } = await pollUntilComplete(uploadResult.jobId)
    const processingMs = result?.processingMs
    const videoDurationSeconds = result?.videoDurationSeconds

    const report = {
      tool: 'video-to-transcript',
      filePath: videoPath,
      fileSizeBytes: uploadResult.fileSizeBytes,
      uploadMs: uploadResult.uploadMs,
      totalMs,
      processingMs: processingMs ?? null,
      videoDurationSeconds: videoDurationSeconds ?? null,
      processingPerMinuteOfVideo:
        processingMs != null && videoDurationSeconds != null && videoDurationSeconds > 0
          ? (processingMs / 1000 / (videoDurationSeconds / 60)).toFixed(2) + ' s per min video'
          : null,
    }

    const out = JSON.stringify(report, null, 2)
    if (outFile) fs.writeFileSync(outFile, out)
    console.log(out)

    // One-line summary for ads
    if (processingMs != null && videoDurationSeconds != null) {
      const ratio = (videoDurationSeconds * 1000) / processingMs
      console.error(
        '\nSummary: ' +
          (videoDurationSeconds / 60).toFixed(1) +
          ' min video → transcript in ' +
          (processingMs / 1000).toFixed(1) +
          ' s (server). ~' +
          ratio.toFixed(1) +
          'x faster than real time.'
      )
    }
  })().catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
}

main()
