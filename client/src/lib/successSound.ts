/**
 * Optional success sound (Web Audio API, no asset). Respects localStorage 'videotext_sound_enabled'.
 * Default OFF. Play ~0.2s on job_completed when enabled.
 */

const SOUND_STORAGE_KEY = 'videotext_sound_enabled'

export function isSuccessSoundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function setSuccessSoundEnabled(enabled: boolean): void {
  try {
    if (enabled) localStorage.setItem(SOUND_STORAGE_KEY, 'true')
    else localStorage.removeItem(SOUND_STORAGE_KEY)
  } catch {
    // ignore
  }
}

/** Play a short success tone if enabled. No-op if disabled or API unavailable. */
export function playSuccessSound(): void {
  if (!isSuccessSoundEnabled()) return
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.1)
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.2)
  } catch {
    // ignore (e.g. autoplay policy)
  }
}
