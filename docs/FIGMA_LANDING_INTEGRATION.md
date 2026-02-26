# Figma UI Integration: Landing Page

## Summary

The **Landing (Home)** page (`/`) has been replaced with the Figma-generated layout while keeping all app routes, CTAs, and the pricing strip.

- **Scope:** Home page only.
- **Backend:** Unchanged.
- **Routes:** All links use existing app paths (`/video-to-transcript`, `/pricing`, `/guide`, `/privacy`, `/terms`, `/feedback`).

---

## Checklist

| Item | Status |
|------|--------|
| Hero CTAs work (Start transcribing → /video-to-transcript, Watch how it works → /guide) | ✔ |
| Tool grid links work (all 7 tools with app paths) | ✔ |
| How it works + trust copy present | ✔ |
| Pricing strip + link to /pricing | ✔ |
| Footer links (Privacy, Terms, Support, API) | ✔ |
| No loose ends | ✔ |

---

## Adjustments Made

1. **New components under `client/src/components/figma/`**
   - **Hero** – Chip, headline (“You create the content. We handle the rest.”), subtext, primary CTA (Link to `/video-to-transcript`), secondary CTA (Link to `/guide`), trust line, social proof avatars, live transcript mockup, stats bar, scroll hint. Uses `framer-motion` (`useScroll`, `useTransform`). External images use `ImageWithFallback`.
   - **Features** – Section title + grid of 7 tools from `config/landingTools.ts`. Each card links to the tool’s app path and fires `trackEvent('tool_selected', ...)`.
   - **HowItWorks** – Three steps (Upload file, We process, Download) and trust copy at bottom. Same content as before, Figma styling.
   - **Footer** – Logo (Link to `/`), Privacy, Terms, Support (`/feedback`), API (external link). Replaces `href="#"` with proper routes.
   - **ImageWithFallback** – Simple img with `onError` fallback for Hero/panel images.
   - **ToolIcon** – Gradient icon block used by Features (shared with tool cards).

2. **Config**
   - **`client/src/config/landingTools.ts`** – `LANDING_TOOLS` array with app paths: `/video-to-transcript`, `/video-to-subtitles`, `/translate-subtitles`, `/fix-subtitles`, `/burn-subtitles`, `/compress-video`, `/batch-process`. Uses same icons as app (e.g. `MessageSquare` for Video → Subtitles).

3. **Home.tsx**
   - Renders: `<Hero />` → `<Features />` → `<HowItWorks />` → **Pricing strip** (from original Home) → `<Footer />`.
   - Pricing strip unchanged: 4 plans, Link to `/pricing`, “Full pricing & features” link.

4. **Removed from Home**
   - Inline hero (badge, headline, “Try transcription free”, “See all tools”).
   - Old tool grid using `ToolCard` and local `tools` array.
   - Inline “How it works” and trust section.
   - Old pricing section markup (logic kept, now above Footer).

5. **Unchanged**
   - Routes and navigation. Analytics via `trackEvent` in Features. No backend or API changes.

---

## File Map

| Purpose | Location |
|--------|-----------|
| Page | `client/src/pages/Home.tsx` |
| Hero | `client/src/components/figma/Hero.tsx` |
| Features (tool grid) | `client/src/components/figma/Features.tsx` |
| How it works | `client/src/components/figma/HowItWorks.tsx` |
| Footer | `client/src/components/figma/Footer.tsx` |
| Landing tools config | `client/src/config/landingTools.ts` |
| Helpers | `client/src/components/figma/ImageWithFallback.tsx`, `ToolIcon.tsx` |

---

## Route / CTA Map

| Element | Target |
|--------|--------|
| Hero “Start transcribing — it's free” | `/video-to-transcript` |
| Hero “Watch how it works” | `/guide` |
| Features tool cards | `/video-to-transcript`, `/video-to-subtitles`, etc. |
| Pricing strip plan cards + “Full pricing” | `/pricing` |
| Footer logo | `/` |
| Footer Privacy | `/privacy` |
| Footer Terms | `/terms` |
| Footer Support | `/feedback` |
| Footer API | External (videotext.io) |
