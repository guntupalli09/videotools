# CLS Root Cause Analysis

**Scope:** Analysis only. No code modified.

**Production Lighthouse (video-to-transcript):**  
- **CLS:** 0.458 (score 0.19) — **unchanged from dev; real, not dev noise.**  
- **TTI:** 4.6 s (score 0.81) — **large improvement vs dev (32.3 s); production TTI is acceptable.**

Conclusion: **CLS ~0.46 is a real production issue. TTI regression is not; dev was misleading.**

---

## 1. WorkflowTracker — Does it contribute to CLS?

**1.1 Renders on first paint?**  
**No.** The app is a client-rendered SPA. Initial HTML is `<div id="root"></div>` (`client/index.html`). WorkflowTracker is mounted when React renders the app tree; it is not in the first paint. The entire UI (Navigation, main, Footer, **WorkflowTracker**, Toaster) appears together after the main bundle runs.

**1.2 Mounted conditionally?**  
**No.** WorkflowTracker is always mounted: `<WorkflowTracker />` is a direct sibling of Footer in `App.tsx` (line 302). It is not wrapped in `{condition && <WorkflowTracker />}`.

**1.3 Height change after initial render?**  
**No.** The outer container has `style={{ height: TRACKER_HEIGHT_PX }}` (56px) and no conditional class that changes height. Inner content varies by `status` (idle / prompt_open / active / completed) but the wrapper is always 56px. Height does not change after mount.

**1.4 Content cause reflow?**  
**Unlikely.** Content is text and buttons inside a fixed-height flex container. `flex-wrap` can wrap on narrow viewports; if the bar goes from one line to two, height could theoretically change, but the parent has a fixed `height: 56px`, so overflow would be clipped, not expand the layout. No evidence the tracker itself grows.

**Verdict:** WorkflowTracker is **not** the primary CLS cause. It appears with the rest of the app on first JS-driven paint; its 56px area is stable once mounted. It can contribute a small amount to “everything appearing at once” but is not the ~0.46 source.

---

## 2. RouteTransitionLayout — Layout-affecting transitions?

**Location:** `client/src/App.tsx` lines 50–56; styles in `client/src/index.css` lines 141–154.

**2.1 Animates height?**  
**No.** The animation is `route-enter`: `opacity: 0 → 1`, `transform: translateY(4px) → translateY(0)`. No `height`, `max-height`, or `scale` that would change layout box.

**2.2 Delays mounting children?**  
**No.** `<Outlet />` is always in the tree; there is no timeout or conditional that delays rendering route content.

**2.3 Layout-affecting transitions?**  
**Yes, in a way Lighthouse can count.** The wrapper has `key={pathname}` and `className="route-transition-enter"`. On first load, the route content (e.g. VideoToTranscript) mounts and the animation runs: content starts at `opacity: 0` and `translateY(4px)`, then animates to `opacity: 1` and `translateY(0)`. That 4px vertical move is a **layout shift**: content is first painted 4px down, then moves up. Layout shift algorithms can count this as a shift, especially if the rectangle is large (e.g. full main content). So RouteTransitionLayout **can contribute to CLS** via the initial `translateY(4px)` → `0` transition on the main content area.

---

## 3. Images — Dimensions and lazy loading

**3.1 Explicit width/height?**  
**No.** Audited usage:

- **Hero background** (`client/src/components/figma/Hero.tsx` ~302): `ImageWithFallback` with `className="w-full h-full object-cover ..."`. No `width`/`height` on the `<img>`; dimensions come from the container (`absolute inset-0`). Container has no intrinsic size until the image loads; the image can cause reflow when it arrives.
- **Hero avatars** (~86): `ImageWithFallback` with `className="w-8 h-8 ..."`. Tailwind sets size; the underlying `<img>` in `ImageWithFallback` does not pass through explicit `width`/`height` (see `ImageWithFallback.tsx`), so the browser may not reserve space before load.
- **LiveTranscriptPanel** (~148): Unsplash image, `className="w-full h-full object-cover"`. Same as above: container has `aspect-video`; the `<img>` has no explicit dimensions.
- **Navigation / Footer:** `/logo.svg` with `h-8 w-8` or similar. SVG often has intrinsic size; risk is lower but still no explicit `<img width height>`.

**3.2 Lazy-loaded hero images?**  
No `loading="lazy"` on the Hero or LiveTranscriptPanel images. They load eagerly. The Hero background and the Unsplash image in the panel are external URLs; when they load, layout can shift if the browser hasn’t reserved space (e.g. no width/height on the img).

**Verdict:** **Images without explicit dimensions**, especially the Hero background and the Unsplash images in Hero/LiveTranscriptPanel, are a **strong candidate for CLS** (~0.2–0.4 is common when large images load without dimensions).

---

## 4. Fonts — Google Fonts and font-display

**Location:** `client/index.html` lines 27–29.

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap" rel="stylesheet" />
```

**4.1 Google Fonts used?**  
**Yes.** Inter and Plus Jakarta Sans.

**4.2 font-display: swap?**  
**Yes.** `display=swap` is in the URL. So text renders first with fallback, then swaps to web font when loaded.

**4.3 Layout shift on swap?**  
**Yes.** Swap causes a well-documented CLS pattern: fallback and web font have different metrics (line-height, width, spacing). When the font swaps, text reflows. With two families used across headings and body, this can easily add **0.2–0.45+ CLS**. This is one of the most common causes of high CLS on text-heavy pages.

**Verdict:** **Font swap (Google Fonts + display=swap)** is a **top-tier CLS cause** and matches the observed ~0.46.

---

## 5. Dynamic content — After useEffect / conditional mount

**5.1 Content that renders after useEffect?**  
VideoToTranscript and other tools use many `useState`/`useEffect` for data (file, job status, usage). Content often appears only after state is set (e.g. upload zone → processing → result). That can cause large layout changes (e.g. from upload UI to result UI). For a **cold load** of `/video-to-transcript`, the initial route is the upload/empty state; the main CLS is more likely from:

- Font swap (global).
- Route transition animation (main content 4px shift).
- Images (Hero on Home; VideoToTranscript may not show Hero).

**5.2 State-based conditional blocks after first render?**  
Yes (e.g. `status === 'completed'` vs idle). These change layout after user actions or polling, not necessarily during the initial Lighthouse load. So they matter more for in-session CLS than for the initial 0.46, unless Lighthouse waits long enough for polling to complete (e.g. a job finishing and the result view rendering). Possible but secondary to fonts and route animation on first load.

**Verdict:** Dynamic route content and state-based UIs can add shift; for **initial load** CLS, **fonts and route animation and images** are the main suspects.

---

## 6. Dev vs production build — CLS comparison

| Environment | Page | CLS | TTI |
|-------------|------|-----|-----|
| Dev (localhost:3000) | video-to-transcript | 0.458 | 32.3 s |
| **Production (localhost:5000, serve -s dist)** | **video-to-transcript** | **0.458** | **4.6 s** |

- **CLS:** Effectively **unchanged** (0.458 in both). So the **~0.46 CLS is real in production**, not dev-only.
- **TTI:** **Large drop** in production (4.6 s vs 32.3 s). The earlier “28–32 s TTI” was mostly dev (big bundle, no minification, etc.). Production TTI does not show a regression.

---

## 7. Ranked list of top 3 CLS causes

| Rank | Cause | Evidence | File(s) |
|------|--------|----------|---------|
| **1** | **Google Fonts + font-display: swap** | Inter & Plus Jakarta loaded with `display=swap`. Text reflows when web font replaces fallback; very common source of 0.2–0.45+ CLS. | `client/index.html` (lines 27–29) |
| **2** | **RouteTransitionLayout initial animation** | Wrapper of route content uses `translateY(4px)` → `0` on first paint. A 4px vertical move on the main content is a layout shift and can be counted by CLS. | `client/src/App.tsx` (54), `client/src/index.css` (142–154) |
| **3** | **Images without explicit dimensions** | Hero background and Unsplash images in Hero/LiveTranscriptPanel use `ImageWithFallback` / `<img>` with only Tailwind classes (e.g. `w-full h-full`). No `width`/`height` on the element. When images load, layout can shift. | `client/src/components/figma/Hero.tsx` (86, 148, 302), `client/src/components/figma/ImageWithFallback.tsx` |

---

## 8. Does WorkflowTracker contribute to CLS?

**Conclusion: Only indirectly.**  
It is not in the initial HTML; it appears with the rest of the app on first client render. Its container is fixed at 56px and does not change height or cause reflow after mount. The dominant CLS is from **fonts**, **route transition**, and **images**. WorkflowTracker is not the primary cause.

---

## 9. Primary cause (clear conclusion)

**Primary cause of CLS ~0.46:**  
**Google Fonts with `display=swap`** is the most likely single source. It affects the whole page (headings and body), causes a single reflow when the font loads, and commonly produces CLS in the 0.2–0.5 range. The **route transition** (4px translate on the main content) and **images without dimensions** (Hero and panel) are strong secondary contributors. Fixing fonts (e.g. `font-display: optional`, or self-hosting with size-adjust, or reducing font swap scope) should be the first lever; then route animation; then image dimensions.

---

## 10. Artifacts

- Production build served: `npx serve -s dist -l 5000`
- Production Lighthouse report: `client/lighthouse-prod-video-to-transcript.json`
- No application code was changed for this analysis.
