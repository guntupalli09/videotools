/**
 * Optional SerpApi integration (SERP, PAA, Trends). Requires SERP_API_KEY.
 * Skips gracefully if key missing; never fails the job.
 */
export async function fetchSerpApi(
  _query: string,
  _opts: { apiKey?: string; cacheHours?: number } = {}
): Promise<{ suggestions?: string[]; related?: string[] }> {
  const key = _opts.apiKey ?? process.env.SERP_API_KEY
  if (!key) {
    console.warn('[SEO] SerpApi not configured (SERP_API_KEY missing); skipping.')
    return {}
  }
  try {
    const url = `https://serpapi.com/search.json?engine=google_autocomplete&q=${encodeURIComponent(_query)}&api_key=${key}`
    const res = await fetch(url)
    if (!res.ok) return {}
    const data = (await res.json()) as { suggestions?: Array<{ value?: string }> }
    const suggestions = (data.suggestions ?? []).map((s) => s.value).filter(Boolean) as string[]
    return { suggestions }
  } catch (e) {
    console.warn('[SEO] SerpApi error:', (e as Error).message)
    return {}
  }
}

export async function collectSerpApiSuggestions(
  seeds: string[],
  _cacheHours = 24
): Promise<Map<string, string[]>> {
  const key = process.env.SERP_API_KEY
  if (!key) return new Map()
  const result = new Map<string, string[]>()
  for (const seed of seeds.slice(0, 10)) {
    const { suggestions } = await fetchSerpApi(seed, { apiKey: key, cacheHours: _cacheHours })
    if (suggestions?.length) result.set(seed, suggestions)
    await new Promise((r) => setTimeout(r, 500))
  }
  return result
}
