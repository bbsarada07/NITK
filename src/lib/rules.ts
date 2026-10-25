import rawRules from '../../rules.json';
import { validateRulesFile, checkRuleGate } from '../rules/validate';
import type { RuleRecord, Source } from '../types/rules';

/**
 * Rules are validated in 'dev' mode in the browser: the production gate would block every rule
 * today because no rule has a recorded lastVerified date. Instead of hiding that, the UI shows
 * the gate status in the provenance drawer (see DECISIONS.md).
 */
export const RULES = validateRulesFile(rawRules, 'dev');

export type MarkerId = 'ferritin' | 'hemoglobin' | 'tsh';
export const MARKER_IDS: MarkerId[] = ['ferritin', 'hemoglobin', 'tsh'];

export function isMarkerId(v: string): v is MarkerId {
  return (MARKER_IDS as string[]).includes(v);
}

export function getRule(marker: string): RuleRecord {
  const rule = RULES.rules.find(r => r.marker === marker);
  if (!rule) throw new Error(`No rule for ${marker}`);
  return rule;
}

export function unitOptions(marker: MarkerId): string[] {
  const rule = getRule(marker);
  return [rule.unit.canonical, ...rule.unit.conversions.map(c => c.from)];
}

/** Multiplier that converts a value in `unit` to the rule's canonical unit, or null if unsupported. */
export function unitMultiplier(marker: MarkerId, unit: string): number | null {
  const rule = getRule(marker);
  const u = unit.trim().toLowerCase();
  if (!u) return null;
  if (u === rule.unit.canonical.toLowerCase()) return 1;
  const conv = rule.unit.conversions.find(c => c.from.toLowerCase() === u);
  return conv ? conv.multiplier : null;
}

/** Maps a unit string (e.g. from an extracted report) to one of the rule's supported spellings. */
export function matchUnit(marker: MarkerId, unit: string | null | undefined): string {
  if (!unit) return '';
  const u = unit.trim().toLowerCase().replace('mcg', 'µg').replace('μ', 'µ');
  return unitOptions(marker).find(o => o.toLowerCase() === u) ?? '';
}

export interface SymptomOption {
  id: string;
  label: string;
  contexts: Array<'iron' | 'thyroid'>;
}

const IRON_MARKERS = new Set(['ferritin', 'hemoglobin']);

/** All symptom triggers from rules.json, de-duplicated by id. */
export const SYMPTOM_OPTIONS: SymptomOption[] = (() => {
  const map = new Map<string, SymptomOption>();
  for (const rule of RULES.rules) {
    const ctx: 'iron' | 'thyroid' = IRON_MARKERS.has(rule.marker) ? 'iron' : 'thyroid';
    for (const t of rule.symptomTriggers) {
      const existing = map.get(t.id);
      if (existing) {
        if (!existing.contexts.includes(ctx)) existing.contexts.push(ctx);
      } else {
        map.set(t.id, { id: t.id, label: t.label, contexts: [ctx] });
      }
    }
  }
  return [...map.values()];
})();

export function symptomLabel(id: string): string {
  return SYMPTOM_OPTIONS.find(s => s.id === id)?.label ?? id;
}

/** Guideline cutoff values for a marker (canonical units), taken only from rules.json. */
export function guidelineCutoffs(marker: MarkerId): number[] {
  const rule = getRule(marker);
  const set = new Set<number>();
  for (const tier of rule.tierCutoffs) {
    for (const r of tier.ranges) {
      if (r.min !== null) set.add(r.min);
      if (r.max !== null) set.add(r.max);
    }
  }
  return [...set].sort((a, b) => a - b);
}

export function ruleGate(marker: MarkerId) {
  return checkRuleGate(getRule(marker));
}

export function allSources(): Source[] {
  const map = new Map<string, Source>();
  for (const r of RULES.rules) for (const s of r.sources) map.set(s.id, s);
  return [...map.values()];
}
