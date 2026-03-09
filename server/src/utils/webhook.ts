import { getLogger } from '../lib/logger'
const webhookLog = getLogger('worker')

/**
 * Fire webhook on job completion (optional). Non-blocking; failures are logged only.
 */
export async function fireWebhook(
  webhookUrl: string,
  payload: {
    jobId: string
    status: 'completed' | 'failed'
    result?: unknown
    error?: string
  }
): Promise<void> {
  if (!webhookUrl || typeof webhookUrl !== 'string') return
  const url = webhookUrl.trim()
  if (!url.startsWith('https://') && !url.startsWith('http://')) return
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) {
      webhookLog.warn({ msg: '[webhook] non-OK response', url, status: res.status })
    }
  } catch (err: any) {
    webhookLog.warn({ msg: '[webhook] request failed', url, error: err?.message || String(err) })
  }
}
