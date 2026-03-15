#!/usr/bin/env node
/**
 * Clear all waiting (queued) and active jobs from YouTube queues.
 * Use when jobs are stuck and blocking new work.
 *
 * Run: docker compose exec api node scripts/clear-youtube-queues.js
 * Or from server dir: node scripts/clear-youtube-queues.js (with env loaded)
 */
require('dotenv/config')

async function main() {
  const { captionQueue, audioQueue, transcriptionQueue } = require('../dist/workers/videoProcessor')

  const queues = [
    { name: 'youtube-caption-v2', queue: captionQueue },
    { name: 'youtube-audio-v2', queue: audioQueue },
    { name: 'youtube-transcription-v2', queue: transcriptionQueue },
  ]

  for (const { name, queue } of queues) {
    const before = await queue.getJobCounts()
    await queue.empty()
    const after = await queue.getJobCounts()
    console.log(`${name}: emptied ${before.waiting || 0} waiting, ${before.active || 0} active → now ${after.waiting || 0} waiting, ${after.active || 0} active`)
  }

  console.log('Done. YouTube queues cleared.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
