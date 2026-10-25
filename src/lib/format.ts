import type { Source } from '../types/rules';

const STATUS_LABELS: Record<string, string> = {
  VERIFIED: 'Source verified',
  VERIFIED_RECHECK_ORIGINAL: 'Source being re-checked'
};

export function humanizeStatus(status: string): string {
  return STATUS_LABELS[status] ?? 'Verification status not recorded';
}

/** "Name (2020)" or just "Name" when the year is unknown. Never prints null. */
export function sourceCitation(source: Source): string {
  return source.year ? `${source.name} (${source.year})` : source.name;
}

export const MIN_SYMPTOMS_NOTICE = 'Engineering default, not clinically validated';

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '';
  return String(Number(n.toFixed(3)));
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'date not recorded';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 'date not recorded';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
