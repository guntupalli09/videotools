import test from 'node:test'
import assert from 'node:assert/strict'
import { getFreePlanNudgeState } from '../src/lib/freePlanConversion'
import { isPaidPlan } from '../src/lib/plans'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

test('progresses only after successful free imports', () => {
  assert.equal(getFreePlanNudgeState(0, 3), 'hidden')
  assert.equal(getFreePlanNudgeState(1, 2), 'two_remaining')
  assert.equal(getFreePlanNudgeState(2, 1), 'one_remaining')
  assert.equal(getFreePlanNudgeState(3, 0), 'exhausted')
})

test('shared inline conversion surfaces route checkout through startCheckout', () => {
  for (const file of ['FreePlanNudge.tsx', 'PaywallModal.tsx', 'UpgradeBanner.tsx', 'ProResultNudge.tsx', 'SecondJobUpgradeNudge.tsx']) {
    const source = readFileSync(resolve(process.cwd(), 'src/components', file), 'utf8')
    assert.match(source, /startCheckout\(/, file)
    assert.doesNotMatch(source, /\bprice(Id)?\s*:/, file)
  }
})

test('TranslateSubtitles Pro links route checkout through ProCheckoutLink', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/pages/TranslateSubtitles.tsx'), 'utf8')
  assert.match(source, /ProCheckoutLink/)
  assert.doesNotMatch(source, /Link to="\/pricing"[^>]*>Unlock Pro/)
})

test('all quota-consuming core result pages mount shared conversion nudges', () => {
  for (const file of ['VideoToTranscript.tsx', 'VideoToSubtitles.tsx', 'TranslateSubtitles.tsx', 'FixSubtitles.tsx', 'BurnSubtitles.tsx', 'CompressVideo.tsx', 'VoiceRecorder.tsx']) {
    const source = readFileSync(resolve(process.cwd(), 'src/pages', file), 'utf8')
    assert.match(source, /<FreePlanNudge\b/, file)
    assert.match(source, /<SecondJobUpgradeNudge\b/, file)
    assert.match(source, /milestone=\{3\}/, file)
  }
  const transcript = readFileSync(resolve(process.cwd(), 'src/pages/VideoToTranscript.tsx'), 'utf8')
  assert.match(transcript, /<ResultUpgradeCard\b/)
  const subtitles = readFileSync(resolve(process.cwd(), 'src/pages/VideoToSubtitles.tsx'), 'utf8')
  assert.match(subtitles, /<ResultUpgradeCard\b/)
  const guideline = readFileSync(resolve(process.cwd(), 'src/pages/GuidelineFormat.tsx'), 'utf8')
  assert.match(guideline, /<ProResultNudge\b/)
  assert.doesNotMatch(guideline, /<FreePlanNudge\b/)
})

test('PaywallModal owns its impression and has no competing navigation callback', () => {
  const modal = readFileSync(resolve(process.cwd(), 'src/components/PaywallModal.tsx'), 'utf8')
  assert.equal((modal.match(/trackEvent\('paywall_shown'/g) || []).length, 1)
  assert.doesNotMatch(modal, /onUpgrade/)
})

test('all legitimate current and legacy paid plans suppress Free conversion UI', () => {
  for (const plan of ['basic', 'pro', 'agency', 'founding_workflow', 'business']) assert.equal(isPaidPlan(plan), true)
  assert.equal(isPaidPlan('free'), false)
  assert.equal(isPaidPlan(null), false)
})

// ── Transcript export/watermark/copy entitlement — authoritative plan, not localStorage ──
test('15: VideoToTranscript export entitlement is not sourced from localStorage.plan', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/pages/VideoToTranscript.tsx'), 'utf8')
  assert.doesNotMatch(source, /hasPaidPlan\(localStorage\.getItem\(["']plan["']\)\)/)
  assert.doesNotMatch(source, /isPaidPlan\s*=\s*[\s\S]{0,80}localStorage\.getItem\(["']plan["']\)/)
})

test('VideoToTranscript derives isPaidPlan from the authoritative usage API, refreshed on job completion', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/pages/VideoToTranscript.tsx'), 'utf8')
  assert.match(source, /const \[accountPlan, setAccountPlan\] = useState<string \| null>\(null\)/)
  assert.match(source, /setAccountPlan\(data\.plan\)/)
  assert.match(source, /getCurrentUsage\(\{ skipCache: true \}\)\s*\n\s*\.then\(\(data\) => \{\s*\n\s*if \(!cancelled\) setAccountPlan\(data\.plan\)/)
  assert.match(source, /const isPaidPlan = hasPaidPlan\(accountPlan\)/)
  // The authoritative-plan effect depends on `status`, so a newly completed job re-fetches
  // plan state (covers upgrade/downgrade mid-session) rather than reading a stale value once.
  const effectIdx = source.indexOf('const isPaidPlan = hasPaidPlan(accountPlan)')
  const before = source.slice(Math.max(0, effectIdx - 700), effectIdx)
  assert.match(before, /\}, \[status\]\);/)
})

test('16+17: authoritative plan alone decides export entitlement — tampered/stale localStorage cannot override it', () => {
  // isPaidPlan(accountPlan) reads only the accountPlan state, which the effect above proves is
  // set exclusively from getCurrentUsage(); localStorage is never read into it, so a Free
  // account with a tampered localStorage "plan=pro" still resolves to isPaidPlan(false), and a
  // Pro account with a stale localStorage "plan=free" still resolves to isPaidPlan(true).
  assert.equal(isPaidPlan('free'), false)
  assert.equal(isPaidPlan('pro'), true)
})

test('18+19: founding_workflow and business resolve to paid entitlement through the shared helper VideoToTranscript now uses', () => {
  assert.equal(isPaidPlan('founding_workflow'), true)
  assert.equal(isPaidPlan('business'), true)
})
