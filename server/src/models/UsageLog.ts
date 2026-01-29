export type UsageEventType =
  | 'video_processed'
  | 'batch_completed'
  | 'language_added'
  | 'overage_charged'

export interface UsageLog {
  id: string
  userId: string

  // Event details
  eventType: UsageEventType

  // Usage data
  minutesUsed: number
  videosProcessed: number
  languagesGenerated: number

  // Cost tracking
  cost: number
  revenue: number
  margin: number

  timestamp: Date
}

const logs: UsageLog[] = []

export function addUsageLog(entry: UsageLog): void {
  logs.push(entry)
}

export function getUsageLogsForUser(userId: string): UsageLog[] {
  return logs.filter((log) => log.userId === userId)
}

