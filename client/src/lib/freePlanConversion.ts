export type FreePlanNudgeState = 'hidden' | 'two_remaining' | 'one_remaining' | 'exhausted'

/** Conversion state is derived from authoritative successful monthly imports. */
export function getFreePlanNudgeState(used: number, remaining: number): FreePlanNudgeState {
  if (used <= 0 || remaining >= 3) return 'hidden'
  if (remaining === 2) return 'two_remaining'
  if (remaining === 1) return 'one_remaining'
  return 'exhausted'
}
