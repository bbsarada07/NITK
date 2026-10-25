import type { MarkerId } from './rules';

export const STORAGE_KEY = 'herchart:v1';
const VERSION = 1;

export interface SavedEntry {
  id: string;
  savedAt: string;
  collectionDate: string | null;
  marker: MarkerId;
  value: number;
  unit: string;
  labLow: number | null;
  labHigh: number | null;
  symptoms: string[];
}

interface StoreShape {
  version: number;
  entries: SavedEntry[];
}

export function loadEntries(): SavedEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoreShape;
    if (parsed?.version !== VERSION || !Array.isArray(parsed.entries)) return [];
    return parsed.entries.filter(e => e && typeof e.value === 'number' && typeof e.marker === 'string');
  } catch {
    return [];
  }
}

export function saveEntries(entries: SavedEntry[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, entries } satisfies StoreShape));
    return true;
  } catch {
    return false;
  }
}

export function clearAll(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable: nothing to delete */
  }
}

export function exportJson(entries: SavedEntry[]): void {
  const blob = new Blob([JSON.stringify({ app: 'HerChart', version: VERSION, exportedAt: new Date().toISOString(), entries }, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `herchart-data-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
