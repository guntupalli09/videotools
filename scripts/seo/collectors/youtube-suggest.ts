/**
 * YouTube search suggestions (public suggest endpoint). No API key.
 */
import * as path from 'path'
import * as fs from 'fs'

const SUGGEST_URL = 'https://suggestqueries.youtube.com/complete/search'
const USER_AGENT = 'VideoText-SEO-Bot/1.0 (compatible; +https://www.videotext.io)'

function getCacheDir(): string {
  const dir = path.join(__dirname, '..', 'cache')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

export async function fetchYoutubeSuggest(query: string, cacheHours = 24): Promise<string[]> {
  const dir = getCacheDir()
  const safe = query.replace(/[^a-z0-9-]/gi, '_').slice(0, 50)
  const file = path.join(dir, `yt-${safe}.json`)
  const now = Date.now()
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (data.cachedAt && now - data.cachedAt < cacheHours * 60 * 60 * 1000) {
      return data.suggestions || []
    }
  }
  try {
    const url = `${SUGGEST_URL}?client=youtube&ds=yt&q=${encodeURIComponent(query)}`
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

export async function collectYoutubeSuggestions(seeds: string[], maxQueries = 20): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>()
  for (const seed of seeds.slice(0, maxQueries)) {
    const suggestions = await fetchYoutubeSuggest(seed)
    if (suggestions.length) result.set(seed, suggestions)
    await new Promise((r) => setTimeout(r, 600))
  }
  return result
}
