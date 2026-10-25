# HerChart pitch

## Problem
A lab report prints one reference range and marks results inside or outside it. For some common tests in women, such as ferritin, hemoglobin and TSH, published guidelines draw their cutoffs in different places. A result can be "in range" on the report and still cross a guideline cutoff. People rarely see that second yardstick, so a real question for the doctor can go unasked.

## Insight
**Inside your lab's range does not always mean nothing to discuss.** Showing both yardsticks side by side, with sources, turns a vague "everything's fine" into a specific question.

## Demo
Sample hemoglobin 11.8 g/dL: inside a 11.5–15.5 lab range, below the WHO 12 g/dL cutoff. Then the provenance drawer, a one-page doctor summary, and a report upload that a human confirms. See `DEMO_SCRIPT.md`.

## Safety
- A deterministic, tested rules engine decides every tier and flag. The AI never decides.
- The AI only reads numbers from an upload, which the user must confirm, or rephrases the structured result. Both run behind strict schemas, a banned-phrase filter and a fixed-template fallback.
- A static urgent-symptom banner, and a not-covered screen for under-18s and pregnancy.
- Honest provenance: unknown years and links stay blank, verification status is shown, and the engineering defaults are labelled.
- No account, no database. Manual entry sends nothing anywhere.

## Impact
For a woman holding a report marked "in range", HerChart gives a clear, sourced question to bring to her doctor in under a minute, without an account and without handing over her data.

## Roadmap
1. **Clinician validation.** Review every rule, cutoff wording and doctor question with clinicians. Record verification dates so the production gate can pass.
2. **More markers, only after sourcing.** For example vitamin B12, vitamin D and free T4, each with named, linked, dated sources before it ships.
3. **Regional languages.** Hindi, Telugu and others with professional medical translation and review, not raw machine translation.
4. **Clinic handoff.** A shareable summary format that doctors find useful, co-designed with them.

## Likely judge questions

**Is it a medical device?**
No. It is an educational tool and does not diagnose, recommend treatment or suggest doses. It shows published cutoffs next to the user's own lab range and suggests questions. Every page says so. Regulatory status would need a proper assessment before any clinical deployment.

**Why not just ask ChatGPT?**
A chatbot can phrase things differently each time, invent cutoffs or citations, and drift into diagnosis. HerChart's decisions come from a fixed, versioned rules file and a tested engine. The same input always gives the same answer, with the exact source shown. The AI is boxed into two narrow jobs and is never trusted to decide.

**How accurate is it?**
The comparison logic is exact for what it encodes: 84 automated tests cover every cutoff boundary, unit conversion and gate. Whether those cutoffs are right for a given woman is a clinical judgement, which is why we show sources and caveats and send people to a doctor. Several sources are still marked "being re-checked", and we show that openly.

**What about privacy?**
No accounts and no database. Typed values never leave the browser, and history lives in local storage with export and delete. An uploaded report is sent once to an AI service to read the numbers and is not stored or logged by HerChart. The privacy screen says this in plain language.

**How would you validate with clinicians?**
Clinicians would review each rule, cutoff label, caveat and doctor question. We would record who reviewed it and when (the `lastVerified` field that the production gate checks), then run usability sessions with women and GPs on whether the questions are clear and useful. We would also measure misunderstandings, not just clicks.

**What if the AI is wrong?**
- *Extraction:* every value must be confirmed by the user, low-confidence readings are highlighted, malformed output is rejected, and unsupported tests are never guessed.
- *Explanation:* the AI only sees the structured result; text with banned phrases is replaced by a fixed template.
- *If the AI is down:* manual entry works fully.
