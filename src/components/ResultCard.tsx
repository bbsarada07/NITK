import { useState } from 'react';
import type { RangeDef } from '../types/rules';
import type { EvaluatedMarker } from '../lib/evaluate';
import { getRule, guidelineCutoffs, ruleGate, RULES } from '../lib/rules';
import { formatNumber, humanizeStatus, MIN_SYMPTOMS_NOTICE, sourceCitation } from '../lib/format';
import { Icon, Modal, useCopy } from './ui';

export const TIER_STYLE = {
  A: { label: 'Past a guideline cutoff', icon: 'alert' as const, cls: 'bg-tierA-bg text-tierA-fg border-tierA-fg/30' },
  B: { label: 'Borderline guideline zone', icon: 'half' as const, cls: 'bg-tierB-bg text-tierB-fg border-tierB-fg/30' },
  none: { label: 'No guideline flag', icon: 'check' as const, cls: 'bg-noflag-bg text-noflag-fg border-noflag-fg/30' }
};

export function tierKey(e: EvaluatedMarker): 'A' | 'B' | 'none' {
  const id = e.result.matchedTier?.id;
  return id === 'A' || id === 'B' ? id : 'none';
}

export const LAB_POSITION_TEXT = {
  inside: 'Inside your lab’s range',
  below: 'Below your lab’s range',
  above: 'Above your lab’s range'
} as const;

export function TierChip({ e }: { e: EvaluatedMarker }) {
  const s = TIER_STYLE[tierKey(e)];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${s.cls}`}>
      <Icon name={s.icon} className="w-4 h-4" />
      {s.label}
    </span>
  );
}

function describeRange(r: RangeDef, unit: string): string {
  if (r.min === null && r.max !== null) return `${r.maxInclusive ? '≤' : '<'} ${r.max} ${unit}`;
  if (r.max === null && r.min !== null) return `${r.minInclusive ? '≥' : '>'} ${r.min} ${unit}`;
  return `${r.min} to ${r.maxInclusive ? '≤' : '<'}${r.max} ${unit}`;
}

function RangeGauge({ e }: { e: EvaluatedMarker }) {
  const unit = e.result.canonicalUnit;
  const value = e.result.normalizedValue;
  const low = e.labLowCanonical;
  const high = e.labHighCanonical;
  const cutoffs = guidelineCutoffs(e.marker);
  const points = [value, ...cutoffs, ...(low !== null && high !== null ? [low, high] : [])];
  const minV = Math.min(...points);
  const maxV = Math.max(...points);
  const span = maxV - minV || Math.max(maxV, 1);
  const lo = Math.max(0, minV - span * 0.25);
  const hi = maxV + span * 0.25;
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100));

  const legend = [
    `Your value: ${formatNumber(value)} ${unit}.`,
    low !== null && high !== null ? `Your lab’s range: ${formatNumber(low)}–${formatNumber(high)} ${unit}.` : 'Lab range not provided.',
    `Guideline cutoffs: ${cutoffs.map(c => formatNumber(c)).join(', ')} ${unit}.`
  ].join(' ');

  let lastPct = -100;
  let row = 0;
  return (
    <div className="mt-4">
      <div role="img" aria-label={legend} className="relative h-24 select-none">
        <div className="absolute inset-x-0 top-10 h-3 rounded-full bg-line" />
        {low !== null && high !== null && (
          <div
            className="absolute top-10 h-3 rounded-full bg-teal/35 border border-teal/60"
            style={{ left: `${pct(low)}%`, width: `${Math.max(1, pct(high) - pct(low))}%` }}
          />
        )}
        {cutoffs.map(c => {
          const p = pct(c);
          row = p - lastPct < 9 ? (row + 1) % 2 : 0;
          lastPct = p;
          return (
            <div key={c} className="absolute top-7" style={{ left: `${p}%` }}>
              <div className="h-9 -translate-x-1/2 border-l-2 border-dashed border-ink/70" />
              <div className={`absolute -translate-x-1/2 whitespace-nowrap text-xs text-muted ${row ? 'top-14' : 'top-9'}`}>{formatNumber(c)}</div>
            </div>
          );
        })}
        <div className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${pct(value)}%` }}>
          <div className="whitespace-nowrap rounded-md bg-ink px-1.5 py-0.5 text-xs font-semibold text-white">
            You: {formatNumber(value)}
          </div>
          <div className="h-[18px] w-0.5 bg-ink" />
          <div className="h-3 w-3 rounded-full border-2 border-white bg-ink" />
        </div>
      </div>
      <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-5 rounded-full bg-teal/35 border border-teal/60" aria-hidden="true" />Your lab’s range{low === null ? ' (not provided)' : ''}</li>
        <li className="flex items-center gap-1.5"><span className="inline-block h-3 border-l-2 border-dashed border-ink/70" aria-hidden="true" />Guideline cutoffs</li>
        <li>Shown in {unit}</li>
      </ul>
    </div>
  );
}

function Provenance({ e, open, onClose }: { e: EvaluatedMarker; open: boolean; onClose: () => void }) {
  const rule = getRule(e.marker);
  const tier = e.result.matchedTier;
  const tiers = tier ? [tier] : rule.tierCutoffs;
  const sourceIds = new Set(tiers.flatMap(t => t.sourceIds));
  const sources = rule.sources.filter(s => sourceIds.has(s.id));
  const gate = ruleGate(e.marker);
  const converted = e.input.unit !== e.result.canonicalUnit;
  return (
    <Modal open={open} onClose={onClose} title="How this was decided" side>
      <dl className="space-y-4">
        <div>
          <dt className="font-semibold">Who decides</dt>
          <dd className="text-muted">A fixed, tested rule engine reading <code>rules.json</code>. AI never decides a tier or a flag.</dd>
        </div>
        <div>
          <dt className="font-semibold">Rule</dt>
          <dd className="text-muted">{tier ? `${rule.marker} / tier ${tier.id}` : `${rule.marker} / no tier matched`}</dd>
        </div>
        <div>
          <dt className="font-semibold">{tier ? 'Cutoff used' : 'Cutoffs checked'}</dt>
          <dd className="text-muted">
            <ul className="list-disc pl-5">
              {tiers.map(t => (
                <li key={t.id}>
                  {t.label} [{t.ranges.map(r => describeRange(r, rule.unit.canonical)).join(' or ')}]; {humanizeStatus(t.status)}
                </li>
              ))}
            </ul>
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Value compared</dt>
          <dd className="text-muted">
            {formatNumber(e.result.normalizedValue)} {e.result.canonicalUnit}
            {converted ? ` (converted from ${e.input.value} ${e.input.unit} using the factor in rules.json)` : ''}
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Sources</dt>
          <dd>
            <ul className="space-y-1 text-muted">
              {sources.map(s => (
                <li key={s.id}>
                  {s.link ? <a className="text-plum underline" href={s.link} target="_blank" rel="noreferrer">{sourceCitation(s)}</a> : sourceCitation(s)}
                  {' '}· {humanizeStatus(s.status)}
                </li>
              ))}
            </ul>
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Symptom pattern threshold</dt>
          <dd className="text-muted">
            A pattern flag needs at least {e.result.minSymptoms.value} matching symptoms; you matched {e.result.matchedSymptoms.length}.{' '}
            <strong className="text-ink">{MIN_SYMPTOMS_NOTICE}.</strong>
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Rules version</dt>
          <dd className="text-muted">Schema {RULES.schemaVersion}; last verified: {rule.lastVerified ?? 'not yet recorded'}</dd>
        </div>
        <div>
          <dt className="font-semibold">Verification gate</dt>
          <dd className="text-muted">
            {gate.isBlocked
              ? `Not yet passed. ${gate.reasons.length} items are still missing (source years, links or a verification date). We show this openly instead of hiding it.`
              : 'Passed.'}
          </dd>
        </div>
      </dl>
    </Modal>
  );
}

export function ResultCard({ e }: { e: EvaluatedMarker }) {
  const copy = useCopy();
  const [showProv, setShowProv] = useState(false);
  const r = e.result;
  const flagged = r.matchedTier !== null;
  const allQuestions = r.doctorQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n');

  return (
    <article className="card p-5 sm:p-6" aria-labelledby={`res-${e.marker}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id={`res-${e.marker}`} className="text-xl font-semibold">{r.displayName}</h3>
          <p className="mt-1 text-3xl font-semibold tabular-nums">
            {e.input.value} <span className="text-base font-medium text-muted">{e.input.unit}</span>
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <TierChip e={e} />
          <span className="text-sm text-muted">{e.labPosition ? LAB_POSITION_TEXT[e.labPosition] : 'Lab range not provided'}</span>
        </div>
      </div>

      {r.tierDisplayLabel && <p className="mt-3 text-sm font-medium">{r.tierDisplayLabel}</p>}

      {flagged && e.labPosition === 'inside' && (
        <p className="mt-3 rounded-xl border border-plum/30 bg-plum-soft px-3 py-2 text-sm">
          <strong>
            Inside your lab’s range, but {tierKey(e) === 'A' ? 'past a guideline cutoff' : 'in a borderline guideline zone'}.
          </strong>{' '}
          Two yardsticks can give two answers. That is worth discussing with a doctor.
        </p>
      )}

      <RangeGauge e={e} />

      <p className="mt-4 leading-relaxed">{r.flagMessage}</p>

      {r.matchedSymptoms.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium">
            Symptoms you ticked that the guide links to this test
            {r.flagType !== 'pattern' && r.matchedTier ? ` (a pattern flag needs ${r.minSymptoms.value})` : ''}:
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {r.matchedSymptoms.map(s => (
              <li key={s.id} className="rounded-full border border-line bg-bg px-3 py-1 text-sm">{s.label}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="mt-5" aria-label={`Doctor questions for ${r.displayName}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-semibold">Questions to ask your doctor</h4>
          <button type="button" className="btn-ghost text-plum" onClick={() => copy(allQuestions, 'All questions copied')}>
            <Icon name="copy" className="w-4 h-4" /> Copy all
          </button>
        </div>
        <ol className="mt-2 space-y-2">
          {r.doctorQuestions.map((q, i) => (
            <li key={q} className="flex items-start gap-2 rounded-xl bg-bg p-3 text-sm">
              <span className="font-semibold text-plum">{i + 1}.</span>
              <span className="flex-1">{q}</span>
              <button type="button" className="btn-ghost -my-2 w-11 px-0 text-muted" aria-label={`Copy question ${i + 1}`} onClick={() => copy(q, 'Question copied')}>
                <Icon name="copy" className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ol>
      </section>

      <details className="mt-4 rounded-xl border border-line" open>
        <summary className="flex min-h-[44px] cursor-pointer items-center px-3 font-semibold">Things to keep in mind ({r.caveats.length})</summary>
        <ul className="list-disc space-y-1 px-8 pb-3 text-sm text-muted">
          {r.caveats.map(c => <li key={c.text}>{c.text}</li>)}
        </ul>
      </details>

      <div className="mt-4">
        <h4 className="text-sm font-semibold">Sources</h4>
        <ul className="mt-1 space-y-1 text-sm text-muted">
          {r.sourcesUsed.map(s => (
            <li key={s.id}>
              {s.link ? <a className="text-plum underline" href={s.link} target="_blank" rel="noreferrer">{sourceCitation(s)}</a> : sourceCitation(s)}
              {' '}<span className="whitespace-nowrap">· {humanizeStatus(s.status)}</span>
            </li>
          ))}
        </ul>
      </div>

      <button type="button" className="btn-secondary mt-4" onClick={() => setShowProv(true)}>
        <Icon name="info" className="w-4 h-4" /> How this was decided
      </button>
      <Provenance e={e} open={showProv} onClose={() => setShowProv(false)} />
    </article>
  );
}
