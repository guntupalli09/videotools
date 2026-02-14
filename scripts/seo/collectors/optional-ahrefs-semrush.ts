/**
 * Optional Ahrefs / SEMrush adapters for keyword data. Require env keys; skip gracefully if missing.
 * Free tier: Ahrefs/SEMrush offer limited API trials. Never fail the job due to missing keys.
 */

export async function collectAhrefsKeywords(
  _seeds: string[],
  _opts: { apiKey?: string }
): Promise<Map<string, string[]>> {
  const key = _opts.apiKey ?? process.env.AHREFS_API_KEY
  if (!key) {
    console.warn('[SEO] Ahrefs not configured (AHREFS_API_KEY missing); skipping.')
    return new Map()
  }
  try {
    // Ahrefs API: would call their keywords endpoint here. Stub returns empty.
    // Example: https://api.ahrefs.com/v3/keywords-explorer/suggestions
    return new Map()
  } catch (e) {
    console.warn('[SEO] Ahrefs error:', (e as Error).message)
    return new Map()
  }
}

export async function collectSemrushKeywords(
  _seeds: string[],
  _opts: { apiKey?: string }
): Promise<Map<string, string[]>> {
  const key = _opts.apiKey ?? process.env.SEMRUSH_API_KEY
  if (!key) {
    console.warn('[SEO] SEMrush not configured (SEMRUSH_API_KEY missing); skipping.')
    return new Map()
  }
  try {
    // SEMrush API: would call their keyword magic here. Stub returns empty.
    return new Map()
  } catch (e) {
    console.warn('[SEO] SEMrush error:', (e as Error).message)
    return new Map()
  }
}
