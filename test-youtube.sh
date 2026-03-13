#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# YouTube pipeline smoke test
# Usage:  bash test-youtube.sh <youtube-url> [api-key]
#
# api-key defaults to $API_KEY env var (from .env)
# Example:
#   bash test-youtube.sh "https://www.youtube.com/watch?v=XXXXXXXXXXX"
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

YOUTUBE_URL="${1:-}"
API_KEY="${2:-${API_KEY:-}}"
BASE_URL="${BASE_URL:-http://localhost:3001}"
TOOL_TYPE="${TOOL_TYPE:-video-to-transcript}"
POLL_INTERVAL=5   # seconds between status polls
MAX_WAIT=300      # give up after 5 minutes

# ── helpers ──────────────────────────────────────────────────────
red()    { printf '\033[0;31m%s\033[0m\n' "$*"; }
green()  { printf '\033[0;32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[0;33m%s\033[0m\n' "$*"; }
blue()   { printf '\033[0;34m%s\033[0m\n' "$*"; }

# ── validate args ─────────────────────────────────────────────────
if [[ -z "$YOUTUBE_URL" ]]; then
  red "Error: YouTube URL required"
  echo "  Usage: bash test-youtube.sh <youtube-url> [api-key]"
  exit 1
fi
if [[ -z "$API_KEY" ]]; then
  red "Error: API key required — pass as 2nd arg or set API_KEY env var"
  echo "  Tip: run  source .env && bash test-youtube.sh <url>"
  exit 1
fi

echo "─────────────────────────────────────────────────────"
blue "Target : $BASE_URL"
blue "Video  : $YOUTUBE_URL"
blue "Tool   : $TOOL_TYPE"
echo "─────────────────────────────────────────────────────"

# ── 1. Health check ───────────────────────────────────────────────
printf '\n[1/4] Health check ... '
HTTP=$(curl -sf -o /dev/null -w "%{http_code}" "$BASE_URL/healthz" || true)
if [[ "$HTTP" == "200" ]]; then
  green "OK ($HTTP)"
else
  red "FAIL (HTTP $HTTP) — is the server running?"
  exit 1
fi

# ── 2. Submit YouTube job ─────────────────────────────────────────
printf '\n[2/4] Submitting YouTube job ... '
SUBMIT=$(curl -sf -X POST "$BASE_URL/api/upload/youtube" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "{\"youtubeUrl\":\"$YOUTUBE_URL\",\"toolType\":\"$TOOL_TYPE\"}" 2>&1) || {
  red "FAIL — curl error"
  echo "$SUBMIT"
  exit 1
}

# Check for error message in response
ERR=$(echo "$SUBMIT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message',''))" 2>/dev/null || true)
JOB_ID=$(echo "$SUBMIT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('jobId',''))" 2>/dev/null || true)
JOB_TOKEN=$(echo "$SUBMIT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('jobToken',''))" 2>/dev/null || true)
YT_TITLE=$(echo "$SUBMIT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('youtubeTitle',''))" 2>/dev/null || true)
YT_DUR=$(echo "$SUBMIT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('youtubeDurationSec',''))" 2>/dev/null || true)

if [[ -z "$JOB_ID" ]]; then
  red "FAIL — no jobId in response"
  echo "Response: $SUBMIT"
  exit 1
fi

green "OK"
echo "  jobId  : $JOB_ID"
echo "  token  : $JOB_TOKEN"
echo "  title  : $YT_TITLE"
echo "  dur    : ${YT_DUR}s"

# ── 3. Poll job status ────────────────────────────────────────────
printf '\n[3/4] Waiting for job to complete'
ELAPSED=0
STATUS=""
while [[ $ELAPSED -lt $MAX_WAIT ]]; do
  sleep $POLL_INTERVAL
  ELAPSED=$((ELAPSED + POLL_INTERVAL))

  STATUS_RESP=$(curl -sf "$BASE_URL/api/job/$JOB_ID?jobToken=$JOB_TOKEN" 2>/dev/null || echo '{}')
  STATUS=$(echo "$STATUS_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','unknown'))" 2>/dev/null || true)
  STEP=$(echo "$STATUS_RESP"  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('step',''))" 2>/dev/null || true)

  printf ' . %s(%ds)' "$STEP" "$ELAPSED"

  if [[ "$STATUS" == "done" || "$STATUS" == "failed" || "$STATUS" == "error" ]]; then
    break
  fi
done
echo ""

# ── 4. Show result ────────────────────────────────────────────────
printf '\n[4/4] Result ... '
if [[ "$STATUS" == "done" ]]; then
  green "DONE in ${ELAPSED}s"

  STATUS_RESP=$(curl -sf "$BASE_URL/api/job/$JOB_ID?jobToken=$JOB_TOKEN" 2>/dev/null || echo '{}')

  # Extract transcript preview
  TRANSCRIPT=$(echo "$STATUS_RESP" | python3 -c "
import sys, json
d = json.load(sys.stdin)
# try common output locations
t = (d.get('result') or {}).get('transcript') \
 or (d.get('result') or {}).get('text') \
 or (d.get('output') or {}).get('transcript') \
 or ''
print(t[:600] if t else '[no transcript field in response]')
" 2>/dev/null || true)

  SOURCE=$(echo "$STATUS_RESP" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print((d.get('result') or {}).get('captionSource', ''))
" 2>/dev/null || true)

  echo ""
  echo "─────────────────────────────────────────────────────"
  [[ -n "$SOURCE" ]] && echo "  Caption source : $SOURCE"
  echo "  Transcript (first 600 chars):"
  echo "  $TRANSCRIPT"
  echo "─────────────────────────────────────────────────────"

  # Also dump full result keys
  echo ""
  echo "  Full result keys:"
  echo "$STATUS_RESP" | python3 -c "
import sys, json
d = json.load(sys.stdin)
def show(obj, prefix=''):
    if isinstance(obj, dict):
        for k, v in obj.items():
            show(v, prefix + '.' + k if prefix else k)
    elif isinstance(obj, list):
        print(f'  {prefix}  [{len(obj)} items]')
    else:
        val = str(obj)
        print(f'  {prefix}: {val[:80]}')
show(d)
" 2>/dev/null || echo "$STATUS_RESP" | python3 -m json.tool

else
  red "FAIL — final status: $STATUS"
  STATUS_RESP=$(curl -sf "$BASE_URL/api/job/$JOB_ID?jobToken=$JOB_TOKEN" 2>/dev/null || echo '{}')
  ERR=$(echo "$STATUS_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error') or d.get('message',''))" 2>/dev/null || true)
  echo "  Error : $ERR"
  echo ""
  echo "  Full response:"
  echo "$STATUS_RESP" | python3 -m json.tool 2>/dev/null || echo "$STATUS_RESP"
  exit 1
fi
