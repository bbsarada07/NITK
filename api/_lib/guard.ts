/**
 * Safety filter for AI-written text. Shared by /api/explain and the browser.
 * Any match means the text is discarded and a deterministic template is shown instead.
 */
export const BANNED_PATTERNS: RegExp[] = [
  /diagnos/i,
  /\byou have\b/i,
  /\bmg\b/i,
  /\bmcg\b/i,
  /\bdos(e|es|ing|age)\b/i,
  /\btreat/i,
  /\bcure/i,
  /supplement/i,
  /\bnormal\b/i,
  /\bhealthy\b/i,
  /\babnormal\b/i,
  /\bdisease\b/i,
  /\bprescri/i
];

export function findBannedPhrase(text: string): string | null {
  for (const p of BANNED_PATTERNS) {
    const m = text.match(p);
    if (m) return m[0];
  }
  return null;
}

export function passesGuard(text: string): boolean {
  return text.trim().length > 0 && findBannedPhrase(text) === null;
}

/** Structured evaluator output: the only input the explainer may use. */
export interface ExplainItem {
  marker: string;
  value: number;
  unit: string;
  tierLabel: string | null;
  flagType: 'pattern' | 'valueOnly' | 'none';
  labRange: string | null;
  labPosition: 'below' | 'inside' | 'above' | null;
  matchedSymptoms: string[];
}

const MARKERS = new Set(['Ferritin', 'Hemoglobin', 'TSH']);
const FLAG_TYPES = new Set(['pattern', 'valueOnly', 'none']);
const POSITIONS = new Set(['below', 'inside', 'above']);

function shortString(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const s = v.replace(/[\u0000-\u001f]/g, ' ').trim();
  return s.length > 0 && s.length <= max ? s : null;
}

/** Strict validation of the explain request body. Returns null if anything is off. */
export function parseExplainItems(body: unknown): ExplainItem[] | null {
  if (!body || typeof body !== 'object') return null;
  const items = (body as { items?: unknown }).items;
  if (!Array.isArray(items) || items.length === 0 || items.length > 3) return null;
  const out: ExplainItem[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    const marker = shortString(r.marker, 20);
    const unit = shortString(r.unit, 12);
    if (!marker || !MARKERS.has(marker) || !unit) return null;
    if (typeof r.value !== 'number' || !Number.isFinite(r.value) || r.value <= 0) return null;
    if (typeof r.flagType !== 'string' || !FLAG_TYPES.has(r.flagType)) return null;
    const tierLabel = r.tierLabel === null ? null : shortString(r.tierLabel, 160);
    if (r.tierLabel !== null && tierLabel === null) return null;
    const labRange = r.labRange === null ? null : shortString(r.labRange, 40);
    if (r.labRange !== null && labRange === null) return null;
    const labPosition = r.labPosition === null ? null : (typeof r.labPosition === 'string' && POSITIONS.has(r.labPosition) ? r.labPosition : undefined);
    if (labPosition === undefined) return null;
    if (!Array.isArray(r.matchedSymptoms) || r.matchedSymptoms.length > 12) return null;
    const matchedSymptoms: string[] = [];
    for (const s of r.matchedSymptoms) {
      const v = shortString(s, 40);
      if (!v) return null;
      matchedSymptoms.push(v);
    }
    out.push({
      marker,
      value: r.value,
      unit,
      tierLabel,
      flagType: r.flagType as ExplainItem['flagType'],
      labRange,
      labPosition: labPosition as ExplainItem['labPosition'],
      matchedSymptoms
    });
  }
  return out;
}

const POSITION_TEXT = {
  below: 'below your lab’s printed range',
  inside: 'inside your lab’s printed range',
  above: 'above your lab’s printed range'
} as const;

/** Deterministic plain-language fallback. Uses only the evaluator output. */
export function templateExplanation(items: ExplainItem[]): string {
  const parts = items.map(i => {
    const where = i.labPosition ? POSITION_TEXT[i.labPosition] : 'compared with no lab range (none was entered)';
    if (i.flagType === 'none') {
      return `${i.marker} ${i.value} ${i.unit} is ${where}, and it does not cross any guideline cutoff that HerChart checks.`;
    }
    const sym = i.flagType === 'pattern' && i.matchedSymptoms.length > 0
      ? ` You also ticked symptoms that the guide links to this test: ${i.matchedSymptoms.join(', ').toLowerCase()}.`
      : '';
    return `${i.marker} ${i.value} ${i.unit} is ${where}, but it crosses a guideline cutoff (${i.tierLabel ?? 'see the result card'}).${sym}`;
  });
  return `${parts.join(' ')} Two different yardsticks can give two different answers. This is something to talk through with a doctor, who can look at the whole picture.`;
}
