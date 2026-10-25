# HerChart audit (Phase 0, 25 Oct 2026, 12:55–13:05 IST)

Baseline: `npm ci` OK, `npm test` 21/21 pass, `npm run build` OK.

## File map (before changes)

| Path | Role | Status |
|---|---|---|
| `rules.json` | Ferritin, hemoglobin, TSH rules (schema 1.0.0) | Source of truth, kept unchanged |
| `src/types/rules.ts` | Types for rules + evaluator | Kept |
| `src/rules/loader.ts` | Schema validator, prod gate, `loadRules` (uses `fs`) | Kept; browser-safe parts split out |
| `src/evaluator/tierEvaluator.ts` | Deterministic evaluator (tested) | Kept, template bugs fixed |
| `tests/runAllTests.ts` | 21 tests | Kept, extended |
| `src/utils/ruleEngine.ts` | **Second, divergent engine actually used by the UI** | Removed |
| `src/utils/rulesParser.ts` | Third engine with hardcoded cutoffs (`testValueInTier`) | Removed |
| `src/types/types.ts` | Types for the duplicate engines | Removed |
| `src/services/geminiParser.ts` | Gemini called **from the browser** with `VITE_GEMINI_API_KEY` | Replaced by `/api/extract` |
| `src/components/*` | UI built on the duplicate engine | Rewritten |
| `src/utils/demoData.ts` | Personas with fake branded lab report text ("QUEST DIAGNOSTICS", named patient) | Replaced |

## Data flow (before)

Form / upload → browser Gemini call (key in bundle) → `ruleEngine.evaluateLabsAndSymptoms` → `ResultsPanel`.
The tested evaluator in `src/evaluator` was **never used by the UI**.

## Findings

### Correctness / clinical safety (P0)
1. UI engine (`ruleEngine.ts`) flags tier B with **one** symptom (`matchedSymptoms.length > 0`), ignoring `minSymptoms` = 2.
2. UI engine uses `String.replace` (first occurrence only) and blanks `{year}`, producing "per X ()" text.
3. Tested evaluator prints `({year})` as "(guideline)" when year is null (suspected issue a: confirmed). Sources with null links are fine in the evaluator but the UI had no link handling.
4. TSH tier A label "Outside the standard reference range (<0.4 or >=4.0 mIU/L)" is not direction-aware (issue b: confirmed).
5. UI engine invents default lab ranges ("15 - 150 ug/L", "0.4 - 4.0 mIU/L") when none is given; a fabricated range is shown as the user's own.
6. Message uses raw marker id (`Your tsh (…)`); no-flag message says "within standard guideline limits" only.
7. `ResultsPanel.tsx` hardcodes clinical text not in rules.json ("rule out early autoimmune thyroiditis", "Normal-but-Concerning Subclinical Range", "clinical literature recognizes …"). Violates the no-diagnosis and no-fabrication rules.
8. Banned words in UI copy: "Normal" (hero, results, demo data), "diagnostic" (Gemini prompt, demo descriptions).
9. Unit conversions in `rules.json` are correct (ng/mL ×1, g/L ×0.1, uIU/mL ×1). Boundary inclusivity in the tested evaluator is correct. The UI engine skipped unit conversion entirely (compared raw g/L against g/dL cutoffs).
10. No lab-range parsing/validation (missing or inverted range), no comma-decimal support (`type="number"` + `parseFloat`).
11. No age or pregnancy gate in the UI (issue f): any input produced a result.
12. No urgent-symptom handling although `chest_pain` is a selectable trigger.

### Security
13. **Gemini key exposure by design** (issue d): `import.meta.env.VITE_GEMINI_API_KEY` + `@google/genai` in client code means any configured key is shipped in the public JS bundle. No key string found in git history or in the current live bundle (`AIza…` scan), but any key ever set as `VITE_GEMINI_API_KEY` in Vercel should be treated as exposed and rotated.
14. Model id `gemini-2.0-flash` is shut down per Google's models page (checked 25 Oct 2026); extraction cannot work as deployed.
15. Raw model output parsed with `JSON.parse` and spread into state; no schema validation; no size/MIME limits; `alert()` with raw error messages; `console.error` of failures.

### UX / accessibility
16. Raw enums/ids not shown, but status and provenance not shown at all (issue c: no humanized status, no provenance).
17. Dead/misleading UI: header badge "Gemini 3.8 Flash" with green dot (always on), "Gemini Intelligence Layer Active" badge, Analyze button on demo personas creates a fake PDF `File` from text.
18. Personas include a fabricated branded lab report (real company name, named patient): impersonation risk; removed.
19. `alert()` used for errors; no loading skeletons, no empty state when nothing entered, results not `aria-live`.
20. Many `text-[11px]` slate-400 on white texts fail WCAG AA contrast; focus rings removed (`focus:outline-none`) on several controls; tier shown mostly by colour.
21. No favicon file (emoji data URI), no OG tags, title says "Clinical Pattern Synthesizer".
