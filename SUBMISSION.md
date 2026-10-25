# HerChart: submission pack

- **Live URL:** [FILL: live URL]
- **Repository:** [FILL: repo URL]
- **Demo video:** [FILL: demo video URL]
- **Team:** [FILL: team member names and roles]

## Tagline
Your lab report says in range. HerChart shows whether that is the full story.

## 50-word description
HerChart puts a woman's ferritin, hemoglobin or TSH result next to published guideline cutoffs, side by side with her lab's printed range. A tested rules engine makes every comparison, and the AI never decides. It turns the gap into sourced questions for her doctor. Private by design. Educational, not a diagnosis.

## 150-word description
Lab reports mark results inside or outside one printed range. For some common tests in women, published guidelines draw the line elsewhere, so "in range" is not always the whole picture. HerChart shows both yardsticks at once for ferritin, hemoglobin and TSH, in adult women who are not pregnant.

A fixed, versioned rules file and a tested, deterministic evaluator decide every comparison. Each result shows a range gauge, the rule's message, matched symptoms, caveats, sources with their verification status, and questions to ask a doctor. A provenance drawer explains exactly how each result was reached. Optional AI features read numbers from an uploaded report, which the user must confirm row by row, or rephrase the result in plain language behind a safety filter. There are no accounts and no database; typed values never leave the browser. HerChart is educational, not a diagnosis.

## 300-word description
Most lab reports compare each result with a single printed reference range. For some common tests in women, such as ferritin, hemoglobin and TSH, published guidelines use different cutoffs. A result can be "in range" on the report and still cross a guideline cutoff. People rarely see that second yardstick, so a useful question for the doctor can go unasked.

HerChart makes that gap visible. A user enters a result with her lab's printed range, uploads a report, or tries one of three illustrative samples. HerChart compares the value with guideline cutoffs from a public, versioned rules file. A tested, deterministic evaluator decides every tier and flag; the same input always gives the same answer. Each result card shows a range gauge with the lab band, guideline cutoff lines and the user's value, plus the rule's message, any matched symptoms, caveats and sources with plain-language verification status. A "How this was decided" drawer shows the rule, cutoff, sources and the status of the verification gate. A one-page doctor visit summary can be printed or copied.

Safety is built in. Under-18s and pregnancy get a friendly "not covered" screen, never a result. Ticking an urgent symptom shows a static emergency message. The AI is optional and boxed into two narrow jobs:
- **Reading numbers from an upload:** strict schema, every value confirmed by the user, unknown tests listed as not covered.
- **Rephrasing a result in plain language:** given only the structured result, filtered for banned phrases, with a fixed-template fallback.

The AI never decides anything. There are no accounts and no database; history stays in the browser with export and delete. Manual entry works fully without AI.

HerChart is educational, not a medical device, and does not diagnose. Its purpose is to help women ask clearer questions.

## Problem
A single printed reference range can hide the fact that guideline cutoffs for the same test differ. People rarely see the second yardstick.

## Solution
HerChart compares a result with the lab's own range and with guideline cutoffs from a sourced rules file, side by side. It then turns the comparison into sourced questions for a doctor.

## Tech stack
- **Frontend:** Vite, React 19, TypeScript, Tailwind CSS 3.
- **Serverless:** Vercel functions (`/api/extract`, `/api/explain`, `/api/health`) using `@google/genai`. The key lives on the server only. The default model is `gemini-3.8-flash`, with one fallback retry.
- **Logic:** deterministic rules engine reading `rules.json`.
- **Tests and checks:** 84 automated tests (`npm test`) and a pre-deploy safety script (`npm run preflight`).
- **Libraries:** no chart library; trend charts are hand-written SVG.

## Safety by design
- A deterministic, tested evaluator decides every tier and flag; the AI never does.
- **Extraction:** structured output, strict validation, user confirmation of every row, unknown tests "not covered", instructions inside documents ignored.
- **Explanation:** input is only the structured result; banned-phrase filter on the server and in the browser; fixed-template fallback.
- Static urgent-symptom banner, plus an age and pregnancy gate.
- Provenance drawer; unknown years and links left blank, never invented.
- No API key in the browser bundle (checked by `npm run preflight`). No accounts, no database.

## Honest limitations
- **Three markers only.** Adult women who are not pregnant only.
- **Verification gate is non-strict.** It is not yet passed because several sources still lack a year, a link or a human verification date (`lastVerified`). The app shows this openly in every result's provenance drawer. See `HUMAN-TO-VERIFY.md`.
- **Symptom threshold is an engineering default.** The two-symptom minimum for a "pattern" flag is not clinically validated.
- **No clinician validation yet.**
- **AI features are optional.** They need a server-side key; without it the app shows "AI features are unavailable right now, manual entry works fully". AI reading of reports can be wrong, which is why every value must be confirmed.
- **No adjustment for inflammation, altitude, smoking or medicines.** The caveats say so.

## What is real vs. roadmap

| Real today | Roadmap |
|---|---|
| Manual entry, three samples, deterministic comparison for ferritin, hemoglobin, TSH | Clinician review of every rule and question; human `lastVerified` stamps |
| Range gauge, provenance drawer, doctor summary (print/copy) | More markers, only after proper sourcing |
| Local history with trends, export, delete | Professionally translated regional languages |
| Report upload with confirmation table (needs server key) | A summary format co-designed with doctors |
| Plain-language summary with safety filter and template fallback | Usability studies with women and GPs |
| Urgent banner, age/pregnancy gate, preflight safety script | |
