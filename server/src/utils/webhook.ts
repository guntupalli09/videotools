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
      console.warn('[webhook]', url, 'returned', res.status)
    }
  } catch (err: any) {
    console.warn('[webhook]', url, err?.message || err)
  }
}
