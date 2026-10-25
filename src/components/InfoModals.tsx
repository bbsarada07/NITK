import { useState } from 'react';
import { Modal, Icon } from './ui';
import { allSources, getRule, guidelineCutoffs, MARKER_IDS, RULES } from '../lib/rules';
import { humanizeStatus, MIN_SYMPTOMS_NOTICE } from '../lib/format';
import { markerDisplayName } from '../evaluator/tierEvaluator';

export function PrivacyModal({
  open,
  onClose,
  savedCount,
  onExport,
  onDeleteAll
}: {
  open: boolean;
  onClose: () => void;
  savedCount: number;
  onExport: () => void;
  onDeleteAll: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <Modal open={open} onClose={() => { setConfirming(false); onClose(); }} title="Privacy, in plain language">
      <ul className="list-disc space-y-2 pl-5">
        <li><strong>No account, no database.</strong> HerChart has no sign-up and keeps no copy of your results on a server.</li>
        <li><strong>Typing values in sends nothing anywhere.</strong> The comparison runs entirely in your browser.</li>
        <li>
          <strong>Uploading a report is different.</strong> The file is sent once, over an encrypted connection, to an AI service
          (Google Gemini) to read the numbers. HerChart does not store the file or log its contents. Google’s own terms apply to
          that request.
        </li>
        <li>
          <strong>Plain-language summary:</strong> if you open it, only the comparison result (test name, value, unit, range and
          ticked symptoms that matched) is sent to the AI service, never your report or your age.
        </li>
        <li><strong>History stays on this device.</strong> Saved results live in this browser’s local storage. Clearing your browser data removes them.</li>
      </ul>
      <div className="mt-4 rounded-xl border border-line p-3">
        <p className="font-medium">Your saved data: {savedCount} result{savedCount === 1 ? '' : 's'}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={onExport} disabled={savedCount === 0}>
            <Icon name="download" className="h-4 w-4" /> Export my data (JSON)
          </button>
          {!confirming ? (
            <button type="button" className="btn-ghost text-tierA-fg" onClick={() => setConfirming(true)}>
              <Icon name="trash" className="h-4 w-4" /> Delete everything
            </button>
          ) : (
            <span className="flex flex-wrap items-center gap-2" role="alert">
              <span className="text-sm">Delete all saved results and the current form? This cannot be undone.</span>
              <button type="button" className="btn bg-tierA-fg text-white hover:opacity-90" onClick={() => { onDeleteAll(); setConfirming(false); }}>Yes, delete</button>
              <button type="button" className="btn-ghost" onClick={() => setConfirming(false)}>Cancel</button>
            </span>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function SourcesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Sources & rules">
      <p>
        HerChart compares three tests (ferritin, hemoglobin, TSH) against fixed cutoffs in a public rules file
        (schema {RULES.schemaVersion}). A tested rule engine makes every decision. AI never decides a result.
      </p>
      <h3 className="mt-4 font-semibold">Cutoffs used</h3>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {MARKER_IDS.map(m => (
          <li key={m}>
            <strong>{markerDisplayName(m)}</strong>: {getRule(m).tierCutoffs.map(t => t.label).join('; ')}. Cutoff values: {guidelineCutoffs(m).join(', ')} {getRule(m).unit.canonical}.
          </li>
        ))}
      </ul>
      <p className="mt-3">
        A symptom “pattern” flag needs at least {getRule('ferritin').minSymptoms.value} matching symptoms. {MIN_SYMPTOMS_NOTICE}.
      </p>
      <h3 className="mt-4 font-semibold">Sources</h3>
      <ul className="mt-1 space-y-2">
        {allSources().map(s => (
          <li key={s.id} className="rounded-xl bg-bg p-3">
            <div>{s.link ? <a className="text-plum underline" href={s.link} target="_blank" rel="noreferrer">{s.name}</a> : s.name}</div>
            <div className="text-xs text-muted">
              {s.year ? `Year ${s.year}` : 'Year not recorded'} · {s.link ? 'Link available' : 'Link not recorded'} · {humanizeStatus(s.status)}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">
        Last verification date for the rules: {getRule('ferritin').lastVerified ?? 'not yet recorded'}. Where a year or link is missing, we leave it blank rather than guess.
      </p>
    </Modal>
  );
}
