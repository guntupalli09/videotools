#!/usr/bin/env node
/**
 * refresh-yt-cookies.mjs
 *
 * Keeps an existing YouTube session alive and exports fresh cookies for yt-dlp.
 *
 * What it does (and does NOT do):
 *   ✓ Loads existing cookies from YOUTUBE_COOKIES_FILE into a fresh Chromium context
 *   ✓ Visits youtube.com — this renews short-lived tokens and keeps the Google
 *     backend session "active" (preventing idle-expiry)
 *   ✓ Validates the session is still authenticated (checks for SAPISID cookie)
 *   ✓ Writes back the updated cookies in Netscape format
 *   ✗ Does NOT attempt automated Google login — that violates Google's policies,
 *     triggers bot detection, and causes account lockouts
 *
 * When the session expires you will see:
 *   [refresh-yt-cookies] ERROR: Session expired — re-export cookies from your browser.
 * At that point, follow the manual steps in the SETUP section below.
 *
 * SETUP (one-time, and whenever Google expires the session):
 *   1. In Chrome/Firefox on your local machine, sign into YouTube.
 *   2. Install the "Get cookies.txt LOCALLY" extension.
 *   3. Export cookies for youtube.com → save as yt_cookies.txt
 *   4. Copy to the server:
 *        scp yt_cookies.txt user@server:/path/to/project/
 *   5. Load into the Docker volume:
 *        docker compose cp yt_cookies.txt cookie-refresher:/cookies/youtube.txt
 *        docker compose restart cookie-refresher worker
 *
 * Environment variables:
 *   YOUTUBE_COOKIES_FILE   Netscape cookies file path  (default: /cookies/youtube.txt)
 *   ALERT_WEBHOOK          Optional URL to POST when session expires (Slack/Discord/etc.)
 *   HEADLESS               Set "false" to watch the browser (default: "true")
 */

import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const COOKIES_FILE = process.env.YOUTUBE_COOKIES_FILE || '/cookies/youtube.txt'
const ALERT_WEBHOOK = process.env.ALERT_WEBHOOK || ''
const HEADLESS = process.env.HEADLESS !== 'false'

// ── Netscape ↔ Playwright cookie conversion ──────────────────────────────────

/**
 * Parse a Netscape-format cookies.txt into Playwright cookie objects.
 * Format per line: domain \t includeSubdomains \t path \t secure \t expiry \t name \t value
 */
function parseNetscape(content) {
  const cookies = []
  for (const raw of content.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const parts = line.split('\t')
    if (parts.length < 7) continue
    const [domain, , cookiePath, secure, expiresStr, name, ...valueParts] = parts
    const value = valueParts.join('\t') // value may contain tabs in edge cases
    const expires = parseInt(expiresStr, 10)
    cookies.push({
      name,
      value,
      // Playwright domain field must not start with a dot
      domain: domain.startsWith('.') ? domain.slice(1) : domain,
      path: cookiePath || '/',
      secure: secure === 'TRUE',
      httpOnly: false,
      sameSite: /** @type {'None'} */ ('None'),
      expires: expires > 0 ? expires : -1,
    })
  }
  return cookies
}

/**
 * Serialize Playwright cookie objects back to Netscape format for yt-dlp.
 * yt-dlp expects the domain column to start with a dot for domain cookies.
 */
function toNetscape(cookies) {
  const lines = [
    '# Netscape HTTP Cookie File',
    '# Automatically refreshed by refresh-yt-cookies.mjs',
    '# Do not edit — changes will be overwritten on next refresh.',
    '',
  ]
  for (const c of cookies) {
    const domain = c.domain.startsWith('.') ? c.domain : `.${c.domain}`
    const secure = c.secure ? 'TRUE' : 'FALSE'
    const expiry = c.expires > 0 ? Math.floor(c.expires) : 2147483647
    lines.push([domain, 'TRUE', c.path || '/', secure, expiry, c.name, c.value].join('\t'))
  }
  return lines.join('\n') + '\n'
}

// ── Validation ────────────────────────────────────────────────────────────────

/** Returns true when cookies include a SAPISID or SID — the core Google session tokens. */
function hasActiveSession(cookies) {
  return cookies.some(c => c.name === 'SAPISID' || c.name === 'SID')
}

/** Basic sanity check on a parsed Netscape file: must have at least one YouTube cookie. */
function validateCookieFile(cookies) {
  if (cookies.length === 0) throw new Error('Cookie file is empty or could not be parsed.')
  const ytCookies = cookies.filter(c => c.domain.includes('youtube.com'))
  if (ytCookies.length === 0) throw new Error('Cookie file contains no youtube.com cookies.')
}

// ── Alert helper ──────────────────────────────────────────────────────────────

async function sendAlert(message) {
  if (!ALERT_WEBHOOK) return
  try {
    await fetch(ALERT_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
      signal: AbortSignal.timeout(10_000),
    })
    console.log('[refresh-yt-cookies] Alert sent to webhook.')
  } catch (err) {
    console.warn('[refresh-yt-cookies] Could not send alert:', err.message)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // ── 1. Load existing cookies ─────────────────────────────────────────────
  if (!fs.existsSync(COOKIES_FILE)) {
    const msg =
      `[refresh-yt-cookies] ERROR: ${COOKIES_FILE} not found.\n` +
      'Export cookies from your browser and copy them here. See SETUP instructions at the top of this file.'
    console.error(msg)
    await sendAlert(`videotools: YouTube cookie file missing (${COOKIES_FILE}). Transcriptions may fail until cookies are uploaded.`)
    process.exit(1)
  }

  let existingCookies
  try {
    const raw = fs.readFileSync(COOKIES_FILE, 'utf-8')
    existingCookies = parseNetscape(raw)
    validateCookieFile(existingCookies)
  } catch (err) {
    const msg = `[refresh-yt-cookies] ERROR: Could not parse cookie file: ${err.message}`
    console.error(msg)
    await sendAlert(`videotools: YouTube cookie file is invalid. Re-export from your browser. Error: ${err.message}`)
    process.exit(1)
  }

  console.log(`[refresh-yt-cookies] Loaded ${existingCookies.length} cookies from ${COOKIES_FILE}`)

  // ── 2. Launch browser and inject cookies ─────────────────────────────────
  const browser = await chromium.launch({
    headless: HEADLESS,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      // Avoid trivial fingerprinting via automation flag
      '--disable-blink-features=AutomationControlled',
    ],
  })

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York',
  })

  try {
    await context.addCookies(existingCookies)

    // ── 3. Visit YouTube to renew the session on Google's backend ────────────
    const page = await context.newPage()
    await page.goto('https://www.youtube.com', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    })
    // Brief pause — lets YouTube set any new short-lived cookies
    await new Promise(r => setTimeout(r, 3000))

    // ── 4. Validate session is still active ──────────────────────────────────
    const currentCookies = await context.cookies()
    if (!hasActiveSession(currentCookies)) {
      const msg =
        '[refresh-yt-cookies] ERROR: Session expired — Google no longer recognises these cookies.\n' +
        'Re-export cookies from your browser and copy them to the server. See SETUP in this file.'
      console.error(msg)
      await sendAlert(
        'videotools: YouTube session expired. Re-export cookies from your browser and run:\n' +
        `  docker compose cp yt_cookies.txt cookie-refresher:/cookies/youtube.txt\n` +
        `  docker compose restart cookie-refresher worker`
      )
      process.exit(1)
    }

    // ── 5. Write refreshed cookies back ──────────────────────────────────────
    const ytCookies = currentCookies.filter(c =>
      c.domain.includes('youtube.com') || c.domain.includes('google.com')
    )
    const netscape = toNetscape(ytCookies)

    // Atomic write: write to temp file then rename (prevents partial reads)
    const tmp = COOKIES_FILE + '.tmp'
    fs.writeFileSync(tmp, netscape, 'utf-8')
    fs.renameSync(tmp, COOKIES_FILE)

    console.log(`[refresh-yt-cookies] OK — wrote ${ytCookies.length} cookies to ${COOKIES_FILE}`)
  } finally {
    await browser.close()
  }
}

main().catch(err => {
  console.error('[refresh-yt-cookies] Fatal error:', err.message)
  process.exit(1)
})
