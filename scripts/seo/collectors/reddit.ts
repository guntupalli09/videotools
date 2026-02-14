/**
 * Reddit search for keyword discovery. No API key. Strict rate limit.
 */
import * as path from 'path'
import * as fs from 'fs'

const SEARCH_URL = 'https://www.reddit.com/search.json'
const USER_AGENT = 'VideoText-SEO-Bot/1.0 (compatible; +https://www.videotext.io)'

function getCacheDir(): string {
  const dir = path.join(__dirname, '..', 'cache')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

interface RedditPost {
  data?: { title?: string; selftext?: string; subreddit?: string }
}

export async function searchReddit(
  query: string,
  limit = 10,
  cacheHours = 24,
  rateLimitDelayMs = 2000
): Promise<string[]> {
  const dir = getCacheDir()
  const safe = query.replace(/[^a-z0-9-]/gi, '_').slice(0, 40)
  const file = path.join(dir, `reddit-${safe}.json`)
  const now = Date.now()
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (data.cachedAt && now - data.cachedAt < cacheHours * 60 * 60 * 1000) {
      return data.phrases || []
    }
  }
  try {
    const url = `${SEARCH_URL}?q=${encodeURIComponent(query)}&limit=${limit}&type=link`
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    if (!res.ok) return []
    const json = (await res.json()) as { data?: { children?: RedditPost[] } }
    const children = json?.data?.children ?? []
    const phrases = new Set<string>()
    for (const c of children) {
      const title = c?.data?.title
      if (title && title.length > 10 && title.length < 100) {
        phrases.add(title)
      }
    }
    const out = [...phrases].slice(0, 30)
    fs.writeFileSync(file, JSON.stringify({ cachedAt: now, phrases: out }), 'utf8')
    await new Promise((r) => setTimeout(r, rateLimitDelayMs))
    return out
  } catch {
    return []
  }
}

export async function collectRedditKeywords(seeds: string[], maxPosts = 50, delayMs = 2000): Promise<string[]> {
  const all = new Set<string>()
  const perQuery = Math.min(10, Math.max(5, Math.floor(maxPosts / seeds.length)))
  for (const seed of seeds) {
    const phrases = await searchReddit(seed, perQuery, 24, delayMs)
    phrases.forEach((p) => all.add(p))
  }
  return [...all]
}
