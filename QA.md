# QA checklist (25 Oct 2026)

Run against the production build (`npm run build && npx vite preview`) in headless Chrome, driven by scripts, plus screenshot review. **Pass** = verified. **Not run** = could not be verified from this machine (no Gemini key / no Vercel access); do these on the live deploy before the demo.

| # | Check | 360 px | 1440 px | Notes |
|---|---|---|---|---|
| 1 | Sample: Hemoglobin inside lab range (11.8, 11.5–15.5) → "Past a guideline cutoff", "Inside your lab’s range" | Pass | Pass | Callout "Inside your lab’s range, but past a guideline cutoff" shown |
| 2 | Sample: Borderline ferritin (22, 10–120, 3 symptoms) → borderline + pattern message | Pass | Pass | Overlap note shown for Fatigue, Hair loss |
| 3 | Sample: TSH 3.1 (0.4–4.5, 3 symptoms) → borderline + pattern message | Pass | Pass | Overlap note for Fatigue, Thinning hair |
| 4 | No horizontal scroll | Pass | Pass | `scrollWidth` checked on every state |
| 5 | No "null", "undefined", "NaN", raw status enums, "normal", "healthy", "you have" in page text | Pass | Pass | Automated text scan of every state |
| 6 | No console errors / page errors | Pass | Pass | Only expected: 404 for `/api/explain` under `vite preview` (no functions locally). On Vercel without a key it is a 503; the browser logs failed requests. |
| 7 | Keyboard-only: skip link, header, CTAs, samples, form, results | n/a | Pass | Visible focus outline on every stop; Enter on a sample moves focus to "Your comparison" |
| 8 | axe-core (WCAG 2 A/AA + best practice): home, results, provenance dialog | n/a | Pass | 0 violations |
| 9 | Gate: age 17 → "not built for under-18s", no result | n/a | Pass | |
| 10 | Gate: pregnant → warm not-covered message, no result | n/a | Pass | |
| 11 | Gate: missing age → inline message + not-covered panel | n/a | Pass | |
| 12 | Validation: TSH 600 → sanity-check error; range 4 – 0,4 → "lower end must be smaller" | n/a | Pass | Comma decimal parsed |
| 13 | Urgent banner when Chest pain ticked | n/a | Pass | Shown above main content, role="alert" |
| 14 | AI disabled path: plain-language summary falls back to template with notice | n/a | Pass | Labelled "from a fixed template" |
| 15 | Upload failure path → "AI features are unavailable right now, manual entry works fully." | n/a | Pass | |
| 16 | Oversized file (3.2 MB) rejected before upload | n/a | Pass | Also enforced server-side (413) |
| 17 | API guard paths (mock requests): no key 503, GET 405, bad MIME 415, >3 MB 413, non-base64 400, bad explain body 400 | — | — | Pass |
| 18 | Print preview of Doctor visit summary (print media emulation) | n/a | Pass | Header, footer and buttons hidden |
| 19 | Save to history, trend chart with lab band and cutoff line, edit, delete | n/a | Pass | |
| 20 | Export my data (JSON) | n/a | Pass | Button enabled when entries exist; download triggered (file contents not inspected) |
| 21 | Delete everything with confirmation → storage cleared, form and results reset | n/a | Pass | |
| 22 | `dist/` contains no Gemini SDK or key | — | — | Pass (only privacy copy mentions "Google Gemini") |
| 23 | Live: upload a real report and confirm rows | Not run | Not run | Needs `GEMINI_API_KEY` on Vercel |
| 24 | Live: AI plain-language summary | Not run | Not run | Needs `GEMINI_API_KEY` on Vercel |
| 25 | Live: production smoke test of 3 samples + print on her-chart.vercel.app | Not run | Not run | Branch not yet deployed |
| 26 | Real browser print dialog → Save as PDF | Not run | Not run | Emulated only |
| 27 | `/api/health` = not_configured → upload drop zone and summary toggle replaced by "AI features are unavailable…" notice; configured → controls shown | n/a | Pass | Mocked health endpoint, session 2 |
| 28 | Sources modal renders the 4 newly confirmed links; no "null"/"undefined" anywhere | n/a | Pass | Session 2 |
| 29 | Model fallback (403/404/429 → one retry) and health route | — | — | Pass (unit tests with mocks) |
