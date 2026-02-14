/**
 * Google SERP autocomplete (public suggest endpoint). No API key. Rate-limit friendly.
 */
import * as path from 'path'
import * as fs from 'fs'

const SUGGEST_URL = 'https://suggestqueries.google.com/complete/search'
const USER_AGENT = 'VideoText-SEO-Bot/1.0 (compatible; +https://www.videotext.io)'

function getCacheDir(): string {
  const dir = path.join(__dirname, '..', 'cache')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

export async function fetchSerpSuggest(query: string, cacheHours = 24): Promise<string[]> {
  const dir = getCacheDir()
  const file = path.join(dir, `serp-${query.replace(/[^a-z0-9-]/gi, '_').slice(0, 50)}.json`)
  const now = Date.now()
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (data.cachedAt && now - data.cachedAt < cacheHours * 60 * 60 * 1000) {
      return data.suggestions || []
    }
  }
  try {
    const url = `${SUGGEST_URL}?client=firefox&q=${encodeURIComponent(query)}`
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    if (!res.ok) return []
    const raw = (await res.json()) as [string, string[]]
    const suggestions = Array.isArray(raw[1]) ? raw[1] : []
    fs.writeFileSync(file, JSON.stringify({ cachedAt: now, suggestions }), 'utf8')
    return suggestions
  } catch {
    return []
  }
}

export async function collectSerpSuggestions(seeds: string[], maxQueries = 20): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>()
  for (const seed of seeds.slice(0, maxQueries)) {
    const suggestions = await fetchSerpSuggest(seed)
    if (suggestions.length) result.set(seed, suggestions)
    await new Promise((r) => setTimeout(r, 800))
  }
  return result
}
