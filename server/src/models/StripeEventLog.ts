export interface StripeEventLogEntry {
  id: string
  type: string
  created: number
  processedAt: Date
}

const processedEvents = new Map<string, StripeEventLogEntry>()

export function hasProcessedStripeEvent(eventId: string): boolean {
  return processedEvents.has(eventId)
}

export function markStripeEventProcessed(event: {
  id: string
  type: string
  created: number
}): void {
  if (processedEvents.has(event.id)) return

  processedEvents.set(event.id, {
    id: event.id,
    type: event.type,
    created: event.created,
    processedAt: new Date(),
  })
}

export function getProcessedStripeEvents(): StripeEventLogEntry[] {
  return Array.from(processedEvents.values())
}

