export interface UsageData {
  count: number
  resetDate: string
}

const FREE_LIMITS: Record<string, number> = {
  'video-to-transcript': 5,
  'video-to-subtitles': 10,
  'translate-subtitles': 3,
  'fix-subtitles': 999999, // unlimited
  'burn-subtitles': 2,
  'compress-video': 5,
}

export function getUsage(toolName: string): UsageData {
  const usageKey = `videotool_usage_${toolName}`
  const stored = localStorage.getItem(usageKey)
  
  if (!stored) {
    const resetDate = new Date()
    resetDate.setMonth(resetDate.getMonth() + 1)
    return {
      count: 0,
      resetDate: resetDate.toISOString(),
    }
  }

  const usage: UsageData = JSON.parse(stored)
  const resetDate = new Date(usage.resetDate)
  const now = new Date()

  // Check if monthly reset needed
  if (now > resetDate) {
    const newResetDate = new Date()
    newResetDate.setMonth(newResetDate.getMonth() + 1)
    const newUsage: UsageData = {
      count: 0,
      resetDate: newResetDate.toISOString(),
    }
    localStorage.setItem(usageKey, JSON.stringify(newUsage))
    return newUsage
  }

  return usage
}

export function incrementUsage(toolName: string): void {
  const usage = getUsage(toolName)
  usage.count++
  const usageKey = `videotool_usage_${toolName}`
  localStorage.setItem(usageKey, JSON.stringify(usage))
}

export function checkLimit(toolName: string): boolean {
  const usage = getUsage(toolName)
  const limit = FREE_LIMITS[toolName] || 999999
  return usage.count >= limit
}

export function getLimit(toolName: string): number {
  return FREE_LIMITS[toolName] || 999999
}
