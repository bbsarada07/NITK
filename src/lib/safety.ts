import { SYMPTOM_OPTIONS } from './rules';

/** Selecting any of these shows a static urgent-care banner. No computation involved. */
export const URGENT_SYMPTOM_IDS = ['chest_pain', 'breathlessness', 'dizziness'];

export const URGENT_MESSAGE =
  'Chest pain or severe breathlessness can be an emergency. If symptoms are severe, sudden or getting worse, seek urgent medical care now.';

export function hasUrgentSymptom(symptoms: string[]): boolean {
  return symptoms.some(s => URGENT_SYMPTOM_IDS.includes(s));
}

/**
 * Engineering mapping, not clinical: "Hair loss" (iron list) and "Thinning hair" (thyroid list)
 * are treated as the same complaint when checking for overlap. Documented in DECISIONS.md.
 */
export const SYMPTOM_ALIASES: Record<string, string> = {
  hair_loss: 'thinning_hair'
};

export const OVERLAP_MESSAGE =
  'These symptoms can overlap between iron and thyroid questions; consider asking your doctor about both.';

/** Selected symptoms that appear in both the iron and the thyroid symptom lists (after aliasing). */
export function overlappingSymptoms(selected: string[]): string[] {
  const canonical = (id: string) => SYMPTOM_ALIASES[id] ?? id;
  const iron = new Set(SYMPTOM_OPTIONS.filter(s => s.contexts.includes('iron')).map(s => canonical(s.id)));
  const thyroid = new Set(SYMPTOM_OPTIONS.filter(s => s.contexts.includes('thyroid')).map(s => canonical(s.id)));
  const out: string[] = [];
  for (const id of selected) {
    const c = canonical(id);
    if (iron.has(c) && thyroid.has(c) && !out.includes(id)) out.push(id);
  }
  return out;
}
