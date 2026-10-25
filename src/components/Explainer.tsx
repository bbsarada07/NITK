import { useEffect, useState } from 'react';
import type { EvaluatedMarker } from '../lib/evaluate';
import { AI_UNAVAILABLE, explainResults, type ExplainOutcome } from '../lib/api';
import { Icon } from './ui';

export function Explainer({ results, aiDisabled = false }: { results: EvaluatedMarker[]; aiDisabled?: boolean }) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<ExplainOutcome | null>(null);

  // A new set of results invalidates the previous explanation.
  useEffect(() => {
    setOutcome(null);
    setShow(false);
  }, [results]);

  async function toggle() {
    const next = !show;
    setShow(next);
    if (next && !outcome && !busy) {
      setBusy(true);
      setOutcome(await explainResults(results));
      setBusy(false);
    }
  }

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Icon name="sparkle" className="h-5 w-5 text-plum" /> Plain-language summary
        </h3>
        {!aiDisabled && (
          <button type="button" className="btn-secondary" aria-expanded={show} aria-controls="explainer-body" onClick={toggle}>
            {show ? 'Hide summary' : 'Show summary'}
          </button>
        )}
      </div>
      {aiDisabled && <p className="help mt-2" role="status">{AI_UNAVAILABLE}</p>}
      <div id="explainer-body" aria-live="polite">
        {show && busy && (
          <div className="mt-4 space-y-2" aria-label="Writing summary">
            <div className="h-4 w-11/12 animate-pulse rounded bg-line" />
            <div className="h-4 w-9/12 animate-pulse rounded bg-line" />
            <div className="h-4 w-10/12 animate-pulse rounded bg-line" />
          </div>
        )}
        {show && !busy && outcome && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {outcome.source === 'ai'
                ? 'AI-written plain-language summary based only on the result above.'
                : 'Plain-language summary from a fixed template, based only on the result above.'}
            </p>
            <p className="mt-2 leading-relaxed">{outcome.text}</p>
            {outcome.notice && <p className="help mt-2">{outcome.notice}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
