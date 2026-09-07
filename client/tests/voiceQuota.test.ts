import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// These are static source-inspection tests (same convention as freePlanConversion.test.ts) —
// this repo has no jsdom/React Testing Library harness, so component behavior is verified by
// asserting the exact structural properties that make the Voice quota bypass impossible:
// the preflight gate, the backend-authoritative catch handling, and correct analytics ordering.

const source = readFileSync(resolve(process.cwd(), 'src/pages/VoiceRecorder.tsx'), 'utf8')

function section(startMarker: string, endMarker?: string): string {
  const start = source.indexOf(startMarker)
  assert.ok(start !== -1, `expected to find "${startMarker}" in VoiceRecorder.tsx`)
  if (!endMarker) return source.slice(start)
  const end = source.indexOf(endMarker, start + startMarker.length)
  assert.ok(end !== -1, `expected to find "${endMarker}" after "${startMarker}"`)
  return source.slice(start, end)
}

test('1+13: preflight only blocks an authenticated Free user with remaining <= 0; paid/other plans pass', () => {
  const preflight = section('async function ensureVoiceQuotaAvailable', 'async function startRecording')
  assert.match(preflight, /if \(!isLoggedIn\(\)\) return true/)
  assert.match(preflight, /usage\.plan === 'free' && usage\.quotaType === 'imports' && remaining <= 0/)
  // Nothing in the preflight body returns false outside that single guarded branch.
  assert.equal((preflight.match(/return false/g) || []).length, 1)
})

test('2: startRecording runs the preflight before requesting the microphone and stops on rejection', () => {
  const fn = section('async function startRecording', 'function stopRecording')
  const preflightIdx = fn.indexOf('ensureVoiceQuotaAvailable()')
  const micIdx = fn.indexOf('getUserMedia')
  assert.ok(preflightIdx !== -1 && micIdx !== -1 && preflightIdx < micIdx, 'preflight must run before mic access')
  assert.match(fn, /if \(!\(await ensureVoiceQuotaAvailable\(\)\)\) return/)
})

test('preflight opens the canonical PaywallModal with FREE_DAILY_LIMIT_REACHED', () => {
  const preflight = section('async function ensureVoiceQuotaAvailable', 'async function startRecording')
  assert.match(preflight, /setPaywallReason\('FREE_DAILY_LIMIT_REACHED'\)/)
  assert.match(preflight, /setShowPaywall\(true\)/)
})

test('3+4: starting or stopping recording never touches usage state', () => {
  const start = section('async function startRecording', 'function stopRecording')
  const stop = section('function stopRecording', '// ── Upload + Poll')
  for (const fn of [start, stop]) {
    assert.doesNotMatch(fn, /importCountToday/)
    assert.doesNotMatch(fn, /invalidateUsageCache/)
    assert.doesNotMatch(fn, /trackEvent\('processing_completed'/)
  }
})

test('5: no client-side usage decrement exists anywhere in the file', () => {
  assert.doesNotMatch(source, /setUsage|usageThisMonth|importCountToday\s*[-+]=/)
})

test('6: both backend-confirmed success paths invalidate the usage cache before/with processing_completed', () => {
  const handleUpload = section('async function handleUpload', '// ── Actions')
  // Fast (Deepgram) path: invalidateUsageCache immediately precedes processing_completed.
  assert.match(
    handleUpload,
    /invalidateUsageCache\(\)\s*\n\s*trackEvent\('processing_completed', \{ tool: 'voice-recorder', words \}\)/
  )
  // Fallback (Whisper) path: invalidateUsageCache precedes its processing_completed call.
  const fallbackCompletedIdx = handleUpload.indexOf("trackEvent('processing_completed', {\n              tool: 'voice-recorder'")
  const fallbackInvalidateIdx = handleUpload.indexOf('invalidateUsageCache()', handleUpload.indexOf('Fallback path'))
  assert.ok(fallbackInvalidateIdx !== -1 && fallbackCompletedIdx !== -1 && fallbackInvalidateIdx < fallbackCompletedIdx)
})

test('7+9: processing_completed only fires after the backend upload/job resolves, never in a catch block', () => {
  const handleUpload = section('async function handleUpload', '// ── Actions')
  const completedMatches = [...handleUpload.matchAll(/trackEvent\('processing_completed'/g)]
  assert.equal(completedMatches.length, 2, 'expected exactly one processing_completed call per path (fast + fallback)')

  // Fast-path catch block (entitlement / non-entitlement failure handling for the Deepgram path).
  const fastCatch = section(
    "} catch (e: unknown) {\n        const message = e instanceof Error ? e.message : String(e)",
    'share link / guest-claim registration for this recording is unavailable.'
  )
  assert.doesNotMatch(fastCatch, /trackEvent\('processing_completed'/)

  // Fallback-path catch block (Whisper upload rejection handling).
  const fallbackCatch = section(
    "} catch (err: unknown) {\n      if (abortRef.current?.signal.aborted) return",
    "setPhase('error')\n    }\n  }"
  )
  assert.doesNotMatch(fallbackCatch, /processing_completed/)

  // Both real processing_completed calls sit after invalidateUsageCache() in their success
  // branch (job_completed may follow processing_completed on the fallback path).
  const completedCalls = [...handleUpload.matchAll(/trackEvent\('processing_completed'/g)]
  for (const match of completedCalls) {
    const before = handleUpload.slice(0, match.index)
    assert.ok(before.includes('invalidateUsageCache()'), 'processing_completed must follow cache invalidation')
  }
  assert.equal(completedCalls.length, 2)
})

test('8+10: both catch blocks detect the daily-limit error and open the paywall instead of swallowing it', () => {
  const handleUpload = section('async function handleUpload', '// ── Actions')
  const guardMatches = [...handleUpload.matchAll(/if \(isFreeDailyLimitError\(m(?:essage|sg)\)\) \{/g)]
  assert.equal(guardMatches.length, 2, 'expected the daily-limit guard in both the fast-path and fallback-path catch blocks')
  assert.match(handleUpload, /setPaywallReason\('FREE_DAILY_LIMIT_REACHED'\)\s*\n\s*setShowPaywall\(true\)/)
  // Old silent-catch comment must be gone.
  assert.doesNotMatch(handleUpload, /Silent failure — transcript already shown, download still works client-side/)
})

test('11: exactly one PaywallModal is mounted in VoiceRecorder', () => {
  assert.equal((source.match(/<PaywallModal\b/g) || []).length, 1)
})

test('12: completed analytics carry word counts for both paths', () => {
  const handleUpload = section('async function handleUpload', '// ── Actions')
  for (const m of handleUpload.matchAll(/trackEvent\('processing_completed', \{[\s\S]{0,80}?\}/g)) {
    assert.match(m[0], /words/)
  }
})

test('realtime Deepgram preview is tracked separately and does not claim completion', () => {
  const handleUpload = section('async function handleUpload', '// ── Actions')
  assert.match(handleUpload, /trackEvent\('realtime_transcript_shown', \{ tool: 'voice-recorder', words \}\)/)
})
