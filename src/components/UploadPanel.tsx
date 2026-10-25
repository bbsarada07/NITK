import { useRef, useState } from 'react';
import type { ExtractedRow } from '../../api/_lib/extractSchema';
import { AI_UNAVAILABLE, extractReport, MAX_UPLOAD_BYTES, UPLOAD_MIME } from '../lib/api';
import { matchUnit, unitOptions, type MarkerId } from '../lib/rules';
import type { MarkerFormValue } from '../lib/input';
import { markerDisplayName } from '../evaluator/tierEvaluator';
import { Icon } from './ui';

interface Row {
  marker: MarkerId;
  form: MarkerFormValue;
  confidence: number;
  confirmed: boolean;
}

const LOW_CONFIDENCE = 0.8;

function toRow(r: ExtractedRow): Row {
  return {
    marker: r.marker,
    confidence: r.confidence,
    confirmed: false,
    form: {
      value: String(r.value),
      unit: matchUnit(r.marker, r.unit),
      low: r.labRangeLow !== null ? String(r.labRangeLow) : '',
      high: r.labRangeHigh !== null ? String(r.labRangeHigh) : '',
      collectionDate: r.collectionDate ?? ''
    }
  };
}

export function UploadPanel({
  onUse,
  aiDisabled = false
}: {
  onUse: (rows: Array<{ marker: MarkerId; form: MarkerFormValue }>) => void;
  aiDisabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [notCovered, setNotCovered] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setRows(null);
    setNotCovered([]);
    if (!UPLOAD_MIME.includes(file.type)) {
      setError('Please upload a PDF, PNG, JPEG or WebP file.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('That file is larger than 3 MB. Try a smaller scan or a photo of just the results page.');
      return;
    }
    setBusy(true);
    const outcome = await extractReport(file);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = '';
    if (!outcome.ok) {
      setError(outcome.message);
      return;
    }
    setRows(outcome.result.rows.map(toRow));
    setNotCovered(outcome.result.notCovered);
  }

  const update = (i: number, patch: Partial<Row> | Partial<MarkerFormValue>, isForm = false) =>
    setRows(prev => prev && prev.map((r, idx) => (idx !== i ? r : isForm ? { ...r, form: { ...r.form, ...(patch as Partial<MarkerFormValue>) }, confirmed: false } : { ...r, ...(patch as Partial<Row>) })));

  const confirmed = rows?.filter(r => r.confirmed && r.form.unit) ?? [];

  return (
    <div className="card p-5 sm:p-6">
      <h3 className="text-lg font-semibold">Upload a report (optional)</h3>
      <p className="help mt-1">
        PDF or photo, up to 3 MB. The file is sent once to an AI service to read the numbers and is not stored by HerChart.
        You check every value before anything is compared.
      </p>
      {aiDisabled ? (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-bg/60 p-4 text-sm" role="status">
          <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-plum" />
          {AI_UNAVAILABLE}
        </p>
      ) : (
        <div
          className={`mt-4 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center ${dragging ? 'border-plum bg-plum-soft' : 'border-line bg-bg/60'}`}
          onDragOver={e => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => {
            e.preventDefault();
            setDragging(false);
            handleFile(e.dataTransfer.files[0]);
          }}
        >
          <Icon name="upload" className="h-7 w-7 text-plum" />
          <p className="text-sm">Drag a file here, or</p>
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? 'Reading your report…' : 'Choose a file'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-label="Upload a lab report"
            onChange={e => handleFile(e.target.files?.[0])}
          />
        </div>
      )}

      <div aria-live="polite">
        {busy && (
          <div className="mt-4 space-y-2" aria-label="Reading report">
            {[0, 1, 2].map(i => <div key={i} className="h-10 animate-pulse rounded-xl bg-line" />)}
          </div>
        )}
        {error && <p className="err mt-3" role="alert">{error}</p>}
        {rows && (
          <div className="mt-4">
            {rows.length === 0 ? (
              <p className="text-sm">We did not find ferritin, hemoglobin or TSH in this file. You can enter values by hand below.</p>
            ) : (
              <>
                <p className="text-sm font-medium">Check each value against your report, correct anything wrong, then tick “Looks right”.</p>
                <div className="mt-3 space-y-3">
                  {rows.map((r, i) => {
                    const low = r.confidence < LOW_CONFIDENCE;
                    return (
                      <div key={r.marker} className={`rounded-xl border p-3 ${low ? 'border-tierB-fg bg-tierB-bg' : 'border-line'}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold">{markerDisplayName(r.marker)}</span>
                          {low && (
                            <span className="inline-flex items-center gap-1 text-sm font-medium text-tierB-fg">
                              <Icon name="alert" className="h-4 w-4" /> Low reading confidence: please double-check
                            </span>
                          )}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                          <label className="text-xs text-muted">Result
                            <input className="field mt-1" inputMode="decimal" value={r.form.value} onChange={e => update(i, { value: e.target.value }, true)} />
                          </label>
                          <label className="text-xs text-muted">Unit
                            <select className="field mt-1" value={r.form.unit} onChange={e => update(i, { unit: e.target.value }, true)}>
                              <option value="">Choose…</option>
                              {unitOptions(r.marker).map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </label>
                          <label className="text-xs text-muted">Range low
                            <input className="field mt-1" inputMode="decimal" value={r.form.low} onChange={e => update(i, { low: e.target.value }, true)} />
                          </label>
                          <label className="text-xs text-muted">Range high
                            <input className="field mt-1" inputMode="decimal" value={r.form.high} onChange={e => update(i, { high: e.target.value }, true)} />
                          </label>
                          <label className="text-xs text-muted col-span-2 sm:col-span-1">Date
                            <input type="date" className="field mt-1" value={r.form.collectionDate} onChange={e => update(i, { collectionDate: e.target.value }, true)} />
                          </label>
                        </div>
                        <label className="mt-2 flex min-h-[44px] items-center gap-2 text-sm font-medium">
                          <input type="checkbox" className="h-5 w-5 accent-plum" checked={r.confirmed} disabled={!r.form.unit} onChange={e => update(i, { confirmed: e.target.checked })} />
                          Looks right{!r.form.unit ? ' (choose a unit first)' : ''}
                        </label>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="btn-primary mt-3"
                  disabled={confirmed.length === 0}
                  onClick={() => {
                    onUse(confirmed.map(r => ({ marker: r.marker, form: r.form })));
                    setRows(null);
                    setNotCovered([]);
                  }}
                >
                  Use {confirmed.length} confirmed value{confirmed.length === 1 ? '' : 's'}
                </button>
              </>
            )}
            {notCovered.length > 0 && (
              <p className="mt-3 text-sm text-muted">
                <strong className="text-ink">Not covered by HerChart:</strong> {notCovered.join(', ')}. These tests are not interpreted.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
