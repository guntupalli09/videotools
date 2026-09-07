const JOB_COMPLETED_COUNT_KEY = 'videotext:job_completed_count'

export function getJobCompletedCount(): number {
  try {
    return Number(localStorage.getItem(JOB_COMPLETED_COUNT_KEY) || '0') || 0
  } catch {
    return 0
  }
}

export function incrementJobCompletedCount(): number {
  const next = getJobCompletedCount() + 1
  try {
    localStorage.setItem(JOB_COMPLETED_COUNT_KEY, String(next))
  } catch {
    /* non-blocking */
  }
  return next
}
