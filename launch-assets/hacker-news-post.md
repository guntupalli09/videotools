# Hacker News — Show HN Post

**Title**:
Show HN: VideoText – Video transcription/subtitles that deletes your files immediately after processing

**URL**: https://videotext.io

---

## Body (optional on HN, but post as first comment immediately after submitting)

Hey HN — I built VideoText after noticing two things that bugged me about existing transcription tools:

1. **Speed**: Most tools take 5–15 minutes to process a video. We're averaging under 60 seconds.
2. **File retention**: Nearly every competitor stores your uploaded video on their servers, sometimes indefinitely. We delete files immediately after the job completes — it's architectural, not just a policy.

**What it does:**
- Video → Transcript with speaker diarization, auto-summary, chapter detection, keyword extraction
- Video → Subtitles (SRT/VTT)
- Subtitle translation (50+ languages via speech model)
- Fix subtitle timing and formatting (removes filler words, fixes line breaks and sync)
- Burn subtitles into video (hardcoded captions)
- Compress video (FFmpeg-based, three compression levels)
- Batch processing (up to 100 videos, ZIP export)

**Stack:**
- Frontend: React + TypeScript + Vite
- Backend: Node/Express + Bull queue (Redis) + Prisma/PostgreSQL
- Video processing: FFmpeg
- Transcription: AI speech-to-text (provider abstracted for model flexibility)
- Billing: Stripe

**Free tier**: 3 imports/month, no credit card. Paid plans from $19/month.

The privacy angle has been the strongest differentiator — specifically for agencies and freelancers handling client footage who can't legally upload it to a tool with indefinite storage.

Happy to discuss the architecture (especially the job queue + file lifecycle management), pricing decisions, or anything else.

---

## HN POSTING TIPS

- **Best time to post**: Tuesday–Thursday, 7–9 AM EST (when HN front page is most active)
- **Don't edit the title after posting** — HN penalizes edited titles in ranking
- **Post the comment above within 2 minutes** of submitting — first comment from the maker signals legitimacy
- **Respond to every comment** within the first 2 hours — HN rewards active threads
- **Don't ask for upvotes** — HN bans for this. Let the post stand on its own.
- **If it flops first time**: Wait 3 months, iterate the product, try again with a different angle
