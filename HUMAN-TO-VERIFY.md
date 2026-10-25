# Human source verification checklist

Prepared 25 Oct 2026. Claude filled in fields **only** where it opened the publisher page or a bibliographic record. **Nothing has been marked verified.** Statuses and `lastVerified` are unchanged.

> ⚠️ **Do not stamp anything you have not personally opened and read.** A filled-in link is not verification. Verification means a person opened the original, checked that it supports the exact cutoff or claim the rule uses, and recorded the date.

All line numbers refer to `rules.json`.

| Source id | Known before | What Claude found (URL) | What you must confirm / edit | Confidence |
|---|---|---|---|---|
| `who-ferritin-2020` (line 66) | Name, year 2020, no link | WHO publication page: https://www.who.int/publications/i/item/9789240000124 (title matches, 21 Apr 2020, ISBN 978-92-4-000012-4). **Link added.** | Open the PDF and confirm it states <15 µg/L for iron deficiency in adults (tier A, lines 21–27). | High for the identity of the document; the cutoff content has not been checked. |
| `who-hb-2024` (line 128) | Name, year 2024, no link | WHO publication page: https://www.who.int/publications/i/item/9789240088542 ("Guideline on haemoglobin cutoffs to define anaemia in individuals and populations", 5 Mar 2024). **Name aligned to official title, link added.** | Confirm the 120 g/L (12 g/dL) cutoff for non-pregnant women aged 15–65 (tier A, lines 89–95). | High for the identity of the document; the cutoff content has not been checked. |
| `braat-2024` (line 129) | Citation only | Europe PMC record (PMID 38432242): "Haemoglobin thresholds to define anaemia from age 6 months to 65 years: estimates from international data sources", Lancet Haematol 2024;11(4):e253-e264, DOI 10.1016/S2352-3026(24)00030-9. **Full title and DOI link added.** | Confirm it supports the caveat "Braat et al. proposed data-driven alternative thresholds" (line 123). | High |
| `pmc8350021` (line 68) | Link, no year; descriptive name | Europe PMC: Galetti V et al., "Threshold ferritin and hepcidin concentrations indicating early iron deficiency in young women based on upregulation of iron absorption", eClinicalMedicine 2021, DOI 10.1016/j.eclinm.2021.101052. **Name replaced with the real title, year 2021 added.** | Confirm it supports ferritin tier B (15 to <30, lines 28–34). The old repo name said "<50 ug/L"; check which threshold the paper reports and whether citing it for 15–30 is appropriate. | High for identity; **medium** for fit to tier B. |
| `utsw-low-iron-slides` (lines 67, 130) | Name only | **Not found publicly.** A web search found no UT Southwestern CME activity titled "Low Iron, High Stakes". | Find the original slides (presenter, date, URL). If they cannot be found, replace this source for tier B and the caveats that cite it. | Unresolved |
| `iron-symptoms-review` (lines 69, 131) | Unnamed | Candidates only, **not written to rules.json:** (1) a PubMed review on iron deficiency and hair loss, https://pubmed.ncbi.nlm.nih.gov/16635664/ (title per search: "The diagnosis and treatment of iron deficiency and its potential relationship to hair loss"); (2) Houston et al. systematic review on iron and fatigue in non-anaemic women, cited secondhand and not retrieved. | Pick the review the original guide meant, or a review that covers **all** listed symptoms (fatigue, hair loss, heavy periods, breathlessness, brittle nails, pale skin, chest pain, dizziness). Fill name, year and link. | Low: unnamed in the repo |
| `thyroid-guidance` (line 203) | "ATA / ETA / Indian Thyroid Society" | Candidates, unconfirmed: (1) 2013 ETA Guideline: Management of Subclinical Hypothyroidism, Pearce et al., Eur Thyroid J 2013, possibly https://pmc.ncbi.nlm.nih.gov/articles/PMC3923601 (this PMC id appeared in search results but was not opened); (2) ATA Guidelines for the Treatment of Hypothyroidism, Jonklaas et al., Thyroid (ATA press release: https://thyroid.org/new-hypothyroidism-treatment-guidelines-from-american-thyroid-association-published-in-thyroid-journal); (3) Indian Thyroid Society 2013 guidelines, news only: https://www.biospectrumindia.com/news/95/7251/its-launches-guidelines-to-tackle-thyroid-dysfunctions.html | The rule cites one combined "guidance". Decide which document(s) support 0.4 / 2.5 / 4.0 mIU/L (lines 152–169). **Consider splitting into separate source entries** (one per society) with their own year and link. | Low to medium |
| `thyroid-symptoms-review` (line 204) | Unnamed | Candidates, unconfirmed: Lancet seminar "Hypothyroidism" (2024; authors per search: Boelaert, Hubalewska-Dydejczyk, Taylor, Medici); an earlier Lancet review "Hypothyroidism" (2017, possibly Chaker et al., index https://read.qxmd.com/read/28336049). | Choose one that lists the symptoms used (fatigue, cold intolerance, weight change, cycle changes, muscle weakness, thinning hair, memory problems, constipation, dry skin, hoarse voice). Fill name, year and link. | Low |

## How to stamp verification (after you have opened the original)

1. Open the original document and confirm the exact cutoff or claim used by each tier, caveat and symptom trigger that cites it.
2. In `rules.json`, fill any missing `name`, `year` and `link` for that source. Use the exact title.
3. Change that source's `"status"` from `"VERIFIED_RECHECK_ORIGINAL"` to `"VERIFIED"` **only** if you confirmed the content in the original.
4. When **every** source in a rule has a year and a link and you have checked them, set that rule's `"lastVerified"` to today's date as `"YYYY-MM-DD"` (lines 71, 133, 206).
5. Run `npm test` and `npm run preflight`. The test "In prod mode, loading rules.json throws GateBlockedError" is expected to start failing once all three rules pass the gate; update that test deliberately when that happens.
6. Commit with your name in the message, for example `verify: ferritin sources checked by <name>`.

## Rules that will still fail the verification gate

The gate (`checkRuleGate` in `src/rules/validate.ts`) blocks a rule if `lastVerified` is null, or if **any** of its sources has a null year or link. After today's changes:

- **Ferritin: still fails.** `lastVerified` is null; `utsw-low-iron-slides` and `iron-symptoms-review` have no year or link.
- **Hemoglobin: still fails.** `lastVerified` is null; `utsw-low-iron-slides` and `iron-symptoms-review` have no year or link.
- **TSH: still fails.** `lastVerified` is null; `thyroid-guidance` and `thyroid-symptoms-review` have no year or link.

Until then the app runs the rules in non-strict mode and says "Verification gate: not yet passed" in every "How this was decided" drawer.
