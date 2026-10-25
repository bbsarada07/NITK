import type { EvaluatedMarker } from '../lib/evaluate';
import { prioritizedQuestions } from '../lib/evaluate';
import { guidelineCutoffs, symptomLabel } from '../lib/rules';
import { formatDate, humanizeStatus, sourceCitation } from '../lib/format';
import { LAB_POSITION_TEXT, TIER_STYLE, tierKey } from './ResultCard';
import { Icon, useCopy } from './ui';
import type { Source } from '../types/rules';

export const DISCLAIMER = 'HerChart is educational, not a medical device, and does not diagnose.';

function uniqueSources(results: EvaluatedMarker[]): Source[] {
  const map = new Map<string, Source>();
  for (const e of results) for (const s of e.result.sourcesUsed) map.set(s.id, s);
  return [...map.values()];
}

export function summaryText(results: EvaluatedMarker[], symptoms: string[]): string {
  const lines: string[] = [`HerChart doctor visit summary (${new Date().toLocaleDateString()})`, ''];
  for (const e of results) {
    const r = e.result;
    lines.push(`${r.displayName}: ${e.input.value} ${e.input.unit}${e.input.collectionDate ? ` (sample ${formatDate(e.input.collectionDate)})` : ''}`);
    lines.push(`  Lab range: ${e.labRangeText ?? 'not provided'}${e.labPosition ? ` (${LAB_POSITION_TEXT[e.labPosition].toLowerCase()})` : ''}`);
    lines.push(`  Guideline: ${TIER_STYLE[tierKey(e)].label}${r.tierDisplayLabel ? ` (${r.tierDisplayLabel})` : ''}`);
  }
  lines.push('', `Symptoms noted: ${symptoms.length ? symptoms.map(symptomLabel).join(', ') : 'none ticked'}`, '', 'Questions:');
  prioritizedQuestions(results).forEach((q, i) => lines.push(`${i + 1}. ${q.text}`));
  lines.push('', 'Sources:');
  uniqueSources(results).forEach(s => lines.push(`- ${sourceCitation(s)} (${humanizeStatus(s.status)})`));
  lines.push('', DISCLAIMER);
  return lines.join('\n');
}

export function DoctorSummary({ results, symptoms, onBack }: { results: EvaluatedMarker[]; symptoms: string[]; onBack: () => void }) {
  const copy = useCopy();
  const questions = prioritizedQuestions(results);
  return (
    <section aria-labelledby="summary-title" className="mx-auto max-w-3xl">
      <div className="no-print mb-4 flex flex-wrap gap-2">
        <button type="button" className="btn-ghost" onClick={onBack}>← Back to results</button>
        <button type="button" className="btn-primary" onClick={() => window.print()}>
          <Icon name="printer" className="h-4 w-4" /> Save as PDF
        </button>
        <button type="button" className="btn-secondary" onClick={() => copy(summaryText(results, symptoms), 'Summary copied')}>
          <Icon name="copy" className="h-4 w-4" /> Copy as text
        </button>
      </div>
      <div className="card print-area p-6 sm:p-8">
        <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
          <h2 id="summary-title" className="text-2xl font-semibold">Doctor visit summary</h2>
          <span className="text-sm text-muted">{new Date().toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="mt-4 w-full min-w-[480px] text-left text-sm">
            <caption className="sr-only">Your results compared with your lab range and guideline cutoffs</caption>
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="py-2 pr-2 font-medium">Test</th>
                <th className="py-2 pr-2 font-medium">Result</th>
                <th className="py-2 pr-2 font-medium">Lab range</th>
                <th className="py-2 font-medium">Guideline comparison</th>
              </tr>
            </thead>
            <tbody>
              {results.map(e => (
                <tr key={e.marker} className="border-b border-line align-top">
                  <td className="py-2 pr-2 font-semibold">{e.result.displayName}</td>
                  <td className="py-2 pr-2 tabular-nums">
                    {e.input.value} {e.input.unit}
                    <div className="text-xs text-muted">{formatDate(e.input.collectionDate)}</div>
                  </td>
                  <td className="py-2 pr-2">
                    {e.labRangeText ?? 'not provided'}
                    {e.labPosition && <div className="text-xs text-muted">{LAB_POSITION_TEXT[e.labPosition]}</div>}
                  </td>
                  <td className="py-2">
                    <strong>{TIER_STYLE[tierKey(e)].label}</strong>
                    <div className="text-xs text-muted">
                      {e.result.tierDisplayLabel ?? `Cutoffs checked: ${guidelineCutoffs(e.marker).join(', ')} ${e.result.canonicalUnit}`}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="mt-5 font-semibold">Symptoms noted</h3>
        <p className="text-sm">{symptoms.length ? symptoms.map(symptomLabel).join(', ') : 'None ticked'}</p>
        <h3 className="mt-5 font-semibold">Questions I would like to ask</h3>
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
          {questions.map(q => <li key={q.text}>{q.text}</li>)}
        </ol>
        <h3 className="mt-5 font-semibold">Sources</h3>
        <ul className="mt-1 space-y-1 text-sm text-muted">
          {uniqueSources(results).map(s => <li key={s.id}>{sourceCitation(s)} · {humanizeStatus(s.status)}</li>)}
        </ul>
        <p className="mt-6 border-t border-line pt-3 text-xs text-muted">{DISCLAIMER} Guideline cutoffs come from the sources above; lab ranges come from your report.</p>
      </div>
    </section>
  );
}
