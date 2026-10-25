import { useMemo, useState } from 'react';
import type { SavedEntry } from '../lib/storage';
import { getRule, guidelineCutoffs, MARKER_IDS, unitMultiplier, type MarkerId } from '../lib/rules';
import { parseDecimal, SANITY_MAX } from '../lib/input';
import { formatDate, formatNumber } from '../lib/format';
import { markerDisplayName } from '../evaluator/tierEvaluator';
import { Icon } from './ui';

const W = 640;
const H = 240;
const PAD = { l: 44, r: 16, t: 16, b: 36 };

function sortKey(e: SavedEntry) {
  return e.collectionDate ?? e.savedAt.slice(0, 10);
}

function Chart({ marker, entries }: { marker: MarkerId; entries: SavedEntry[] }) {
  const unit = getRule(marker).unit.canonical;
  const pts = entries.map(e => ({ e, v: e.value * (unitMultiplier(marker, e.unit) ?? 1) }));
  const latestWithRange = [...entries].reverse().find(e => e.labLow !== null && e.labHigh !== null);
  const m = latestWithRange ? unitMultiplier(marker, latestWithRange.unit) ?? 1 : 1;
  const band = latestWithRange ? { lo: (latestWithRange.labLow as number) * m, hi: (latestWithRange.labHigh as number) * m } : null;
  const cutoffs = guidelineCutoffs(marker);
  const all = [...pts.map(p => p.v), ...cutoffs, ...(band ? [band.lo, band.hi] : [])];
  const minV = Math.min(...all);
  const maxV = Math.max(...all);
  const span = maxV - minV || Math.max(maxV, 1);
  const lo = Math.max(0, minV - span * 0.15);
  const hi = maxV + span * 0.15;
  const x = (i: number) => (pts.length === 1 ? (PAD.l + W - PAD.r) / 2 : PAD.l + (i * (W - PAD.l - PAD.r)) / (pts.length - 1));
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);

  const first = pts[0];
  const last = pts[pts.length - 1];
  const summary =
    pts.length === 1
      ? `One saved ${markerDisplayName(marker)} result: ${formatNumber(first.v)} ${unit} on ${formatDate(sortKey(first.e))}.`
      : `${pts.length} saved ${markerDisplayName(marker)} results from ${formatDate(sortKey(first.e))} to ${formatDate(sortKey(last.e))}. ` +
        `First ${formatNumber(first.v)} ${unit}, latest ${formatNumber(last.v)} ${unit}. Guideline cutoffs at ${cutoffs.join(', ')} ${unit}.` +
        (band ? ` Shaded band shows your most recent lab range, ${formatNumber(band.lo)}–${formatNumber(band.hi)} ${unit}.` : '');

  return (
    <figure className="mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={summary}>
        {band && <rect x={PAD.l} width={W - PAD.l - PAD.r} y={y(band.hi)} height={Math.max(1, y(band.lo) - y(band.hi))} fill="#0F766E" opacity={0.14} />}
        {cutoffs.map(c => (
          <g key={c}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(c)} y2={y(c)} stroke="#1F1A2B" strokeOpacity={0.6} strokeDasharray="5 4" />
            <text x={PAD.l - 6} y={y(c) + 4} textAnchor="end" fontSize="12" fill="#6B6478">{formatNumber(c)}</text>
          </g>
        ))}
        <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke="#E9E3EE" />
        {pts.length > 1 && <polyline fill="none" stroke="#6D2E6B" strokeWidth={2.5} points={pts.map((p, i) => `${x(i)},${y(p.v)}`).join(' ')} />}
        {pts.map((p, i) => (
          <g key={p.e.id}>
            <circle cx={x(i)} cy={y(p.v)} r={5} fill="#6D2E6B" stroke="#fff" strokeWidth={2} />
            <text x={x(i)} y={y(p.v) - 10} textAnchor="middle" fontSize="12" fill="#1F1A2B">{formatNumber(p.v)}</text>
            <text
              x={x(i)}
              y={H - PAD.b + 18}
              textAnchor={pts.length > 1 && i === 0 ? 'start' : pts.length > 1 && i === pts.length - 1 ? 'end' : 'middle'}
              fontSize="11"
              fill="#6B6478"
            >
              {formatDate(sortKey(p.e))}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="help">{summary} Values shown in {unit}. Dashed lines: guideline cutoffs.</figcaption>
    </figure>
  );
}

function EntryRow({ e, onSave, onDelete }: { e: SavedEntry; onSave: (e: SavedEntry) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(e.value));
  const [date, setDate] = useState(e.collectionDate ?? '');
  const [err, setErr] = useState<string | null>(null);
  if (!editing) {
    return (
      <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-bg px-3 py-2 text-sm">
        <span className="tabular-nums">
          <strong>{e.value} {e.unit}</strong> · {formatDate(e.collectionDate)}
          {e.labLow !== null && e.labHigh !== null ? ` · lab range ${e.labLow}–${e.labHigh}` : ''}
        </span>
        <span className="flex gap-1">
          <button type="button" className="btn-ghost" onClick={() => setEditing(true)}>Edit</button>
          <button type="button" className="btn-ghost text-tierA-fg" onClick={onDelete} aria-label={`Delete ${e.value} ${e.unit} entry`}>
            <Icon name="trash" className="h-4 w-4" /> Delete
          </button>
        </span>
      </li>
    );
  }
  return (
    <li className="rounded-xl border border-line p-3 text-sm">
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <label className="text-xs text-muted">Result ({e.unit})
          <input className="field mt-1" inputMode="decimal" value={value} onChange={ev => setValue(ev.target.value)} />
        </label>
        <label className="text-xs text-muted">Sample date
          <input type="date" className="field mt-1" value={date} onChange={ev => setDate(ev.target.value)} />
        </label>
        <div className="flex items-end gap-1">
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              const v = parseDecimal(value);
              const max = SANITY_MAX[e.marker] / (unitMultiplier(e.marker, e.unit) ?? 1);
              if (v === null || v <= 0 || v > max) {
                setErr('Enter a positive number that matches your report.');
                return;
              }
              onSave({ ...e, value: v, collectionDate: date || null });
              setEditing(false);
              setErr(null);
            }}
          >
            Save
          </button>
          <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </div>
      {err && <p className="err">{err}</p>}
    </li>
  );
}

export function Trends({ entries, onChange }: { entries: SavedEntry[]; onChange: (entries: SavedEntry[]) => void }) {
  const available = MARKER_IDS.filter(m => entries.some(e => e.marker === m));
  const [picked, setPicked] = useState<MarkerId | null>(null);
  const marker = picked && available.includes(picked) ? picked : available[0];
  const forMarker = useMemo(
    () => entries.filter(e => e.marker === marker).sort((a, b) => sortKey(a).localeCompare(sortKey(b))),
    [entries, marker]
  );

  return (
    <div className="card p-5 sm:p-6">
      <h3 className="flex items-center gap-2 text-lg font-semibold"><Icon name="chart" className="h-5 w-5 text-plum" /> My trends</h3>
      {available.length === 0 ? (
        <p className="mt-2 text-sm text-muted">
          Nothing saved yet. After you see a comparison, choose “Save to my history on this device” to start a timeline. Saved results stay in this browser only.
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Choose a test">
            {available.map(m => (
              <button
                key={m}
                type="button"
                aria-pressed={m === marker}
                className={m === marker ? 'btn-primary' : 'btn-secondary'}
                onClick={() => setPicked(m)}
              >
                {markerDisplayName(m)}
              </button>
            ))}
          </div>
          {marker && <Chart marker={marker} entries={forMarker} />}
          <ul className="mt-3 space-y-2">
            {forMarker.map(e => (
              <EntryRow
                key={e.id}
                e={e}
                onSave={updated => onChange(entries.map(x => (x.id === updated.id ? updated : x)))}
                onDelete={() => onChange(entries.filter(x => x.id !== e.id))}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
