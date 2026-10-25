# Demo script

Before you start: open https://her-chart.vercel.app in a fresh window at 100% zoom. Have a small lab-report PDF or photo ready (under 3 MB), with any personal details covered.

## 90-second version

**0:00 Hook (on the hero).**
"Your lab report says in range. But for some tests, published guidelines draw the line somewhere else. HerChart shows you both lines."

**0:15 Sample: hemoglobin.** Click **Try a sample → Hemoglobin inside lab range**.
"11.8 grams. The lab's range starts at 11.5, so the report says fine. The WHO cutoff for non-pregnant women is 12. Inside the lab's range, past a guideline cutoff. Look at the gauge: the shaded band is the lab, the dashed line is the guideline, the pin is you."

**0:40 Provenance.** Click **How this was decided**.
"No AI made this call. A tested rule engine reads a public rules file. Here is the rule, the cutoff, the source and its verification status. We even show that our verification gate hasn't passed yet. We don't hide gaps."

**0:55 Doctor summary.** Close the drawer, then click **Doctor visit summary**.
"One page with the result, both ranges, and sourced questions to ask. Save as PDF or copy."

**1:10 Close.**
"No account, no database, and typing values in sends nothing anywhere. HerChart never diagnoses; it helps you ask better questions."

## 3-minute version

1. **Hook (0:00–0:20).** As above.
2. **Sample (a), hemoglobin (0:20–0:50).** As above. Point at the chip: it has an icon and text, not just colour.
3. **Provenance (0:50–1:15).** As above. Also point out the "Engineering default, not clinically validated" note on the symptom threshold.
4. **Sample (b), borderline ferritin (1:15–1:40).** Click it.
   "Ferritin 22, inside a 10 to 120 lab range. This is the borderline 15-to-30 zone that some guidelines flag in women with symptoms. She ticked three symptoms from the source list, so it becomes a pattern worth discussing, not a diagnosis. Fatigue and hair loss also appear on the thyroid list, so HerChart suggests asking about both."
5. **Safety (1:40–2:00).** Tick **Chest pain**.
   "Any urgent symptom brings up a static emergency message, whatever the numbers say." Then click **Show summary** under Plain-language summary.
   "The optional AI summary only ever sees the structured result. It goes through a banned-phrase filter, and if anything fails it falls back to a fixed template, labelled as such."
6. **Doctor summary (2:00–2:20).** Open it and click **Save as PDF**.
7. **Upload (2:20–2:50).** Back on the main page, go to **Upload a report** and choose your prepared file.
   "The file goes once to the AI to read the numbers, and is not stored. Every value must be confirmed before anything is compared. Low-confidence readings are highlighted. Tests we don't cover are listed as not covered, never guessed."
   Tick **Looks right**, click **Use confirmed values**, then **See my comparison**.
8. **Close (2:50–3:00).** "Privacy by design, deterministic rules, a human in the loop. Inside your lab's range does not always mean nothing to discuss."

**If the AI is down during the demo,** say: "And this is the failure mode: manual entry works fully." Then type the values yourself.

## 90-second demo video: shot list

Record at 1440×900, browser zoom 100%, in a fresh window (no saved history). Cursor moves slowly; pause about 1 s after each click.

| # | Time | Screen | Exact click path | Say |
|---|---|---|---|---|
| 1 | 0:00–0:08 | Home, hero visible | None (hold on the headline) | "Your lab report says in range. Is that the full story?" |
| 2 | 0:08–0:15 | Hero | Click **Try a sample** (scrolls to samples) | "Here are three illustrative samples. Nothing is sent anywhere." |
| 3 | 0:15–0:32 | Hemoglobin result card | Click the card **Hemoglobin inside lab range** (page scrolls to "Your comparison") | "Hemoglobin 11.8. The lab's range starts at 11.5, so the report says fine. The WHO cutoff for non-pregnant women is 12. Inside the lab's range, past a guideline cutoff." |
| 4 | 0:32–0:40 | Same card, gauge | Hover over the gauge | "Shaded band: the lab's range. Dashed line: the guideline. Pin: you. The chip uses an icon and text, not just colour." |
| 5 | 0:40–0:52 | Provenance drawer | Click **How this was decided** | "No AI decided this. A tested rules engine reads a public rules file: here's the rule, the cutoff and the source. We even show that our verification gate hasn't passed yet." |
| 6 | 0:52–0:55 | Card | Press **Esc** to close the drawer | none |
| 7 | 0:55–1:05 | Questions list | Scroll to **Questions to ask your doctor**, click **Copy all** (toast appears) | "Sourced questions to take to the appointment." |
| 8 | 1:05–1:15 | Doctor visit summary | Scroll down, click **Doctor visit summary** | "One page: result, both ranges, questions and sources. Save as PDF or copy as text." |
| 9 | 1:15–1:22 | Summary | Click **← Back to results**, scroll up to **Symptoms**, tick **Chest pain** (red banner appears at top) | "Urgent symptoms always bring up a static emergency message." |
| 10 | 1:22–1:30 | Header | Click **Privacy** | "No account, no database. Typed values never leave your browser. HerChart is educational and never diagnoses." |

**Backup:** if the live site is slow, record from `npm run build && npx vite preview`. Samples need no network.
