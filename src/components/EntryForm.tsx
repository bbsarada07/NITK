import type { MarkerErrors, MarkerFormValue } from '../lib/input';
import { SANITY_MAX } from '../lib/input';
import { MARKER_IDS, SYMPTOM_OPTIONS, getRule, unitOptions, type MarkerId } from '../lib/rules';
import { markerDisplayName } from '../evaluator/tierEvaluator';

export interface ProfileState {
  age: string;
  pregnant: '' | 'yes' | 'no';
}

const MARKER_HELP: Record<MarkerId, string> = {
  ferritin: 'Iron stores. Often listed as “Serum ferritin”.',
  hemoglobin: 'Often listed as “Hb” or “Hgb” in a blood count.',
  tsh: 'Thyroid stimulating hormone.'
};

export function emptyMarkerForm(marker: MarkerId): MarkerFormValue {
  return { value: '', unit: getRule(marker).unit.canonical, low: '', high: '', collectionDate: '' };
}

interface Props {
  profile: ProfileState;
  onProfile: (p: ProfileState) => void;
  profileError: string | null;
  markers: Record<MarkerId, MarkerFormValue>;
  onMarker: (m: MarkerId, v: MarkerFormValue) => void;
  errors: Partial<Record<MarkerId, MarkerErrors>>;
  symptoms: string[];
  onToggleSymptom: (id: string) => void;
  formError: string | null;
  onSubmit: () => void;
  onClear: () => void;
}

export function EntryForm(p: Props) {
  return (
    <form
      noValidate
      onSubmit={e => {
        e.preventDefault();
        p.onSubmit();
      }}
      className="space-y-6"
      aria-label="Enter your lab results"
    >
      <fieldset className="card p-5 sm:p-6">
        <legend className="sr-only">About you</legend>
        <h3 className="text-lg font-semibold">About you</h3>
        <p className="help mt-1">HerChart’s guideline cutoffs are for adult women who are not pregnant.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="age">Age (years)</label>
            <input
              id="age"
              className="field"
              inputMode="numeric"
              autoComplete="off"
              value={p.profile.age}
              onChange={e => p.onProfile({ ...p.profile, age: e.target.value })}
              aria-describedby={p.profileError ? 'profile-err' : undefined}
            />
          </div>
          <div role="radiogroup" aria-labelledby="preg-label">
            <span id="preg-label" className="label">Are you pregnant, or could you be?</span>
            <div className="flex gap-2">
              {(['no', 'yes'] as const).map(v => (
                <label
                  key={v}
                  className={`flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-plum ${
                    p.profile.pregnant === v ? 'border-plum bg-plum-soft text-plum' : 'border-line bg-surface'
                  }`}
                >
                  <input
                    type="radio"
                    name="pregnant"
                    value={v}
                    className="sr-only"
                    checked={p.profile.pregnant === v}
                    onChange={() => p.onProfile({ ...p.profile, pregnant: v })}
                  />
                  {v === 'no' ? 'No' : 'Yes or maybe'}
                </label>
              ))}
            </div>
          </div>
        </div>
        {p.profileError && <p id="profile-err" className="err">{p.profileError}</p>}
      </fieldset>

      <fieldset className="card p-5 sm:p-6">
        <legend className="sr-only">Your results</legend>
        <h3 className="text-lg font-semibold">Your results</h3>
        <p className="help mt-1">
          Fill in any of the three tests. Use the same unit for the result and the lab range. The lab range is optional;
          without it you will see the guideline comparison only.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {MARKER_IDS.map(m => {
            const f = p.markers[m];
            const err = p.errors[m] ?? {};
            const set = (patch: Partial<MarkerFormValue>) => p.onMarker(m, { ...f, ...patch });
            const name = markerDisplayName(m);
            return (
              <div key={m} className="rounded-xl border border-line bg-bg/60 p-4">
                <h4 className="font-semibold">{name}</h4>
                <p className="help mt-0">{MARKER_HELP[m]}</p>
                <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                  <div>
                    <label className="label" htmlFor={`${m}-value`}>Result</label>
                    <input
                      id={`${m}-value`}
                      className={`field ${err.value ? 'border-tierA-fg' : ''}`}
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="e.g. 11.8"
                      value={f.value}
                      onChange={e => set({ value: e.target.value })}
                      aria-invalid={!!err.value}
                      aria-describedby={`${m}-value-help`}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor={`${m}-unit`}>Unit</label>
                    <select id={`${m}-unit`} className="field w-28" value={f.unit} onChange={e => set({ unit: e.target.value })}>
                      {unitOptions(m).map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <p id={`${m}-value-help`} className={err.value ? 'err' : 'help'}>
                  {err.value ?? err.unit ?? `Input sanity check (not a clinical limit): up to ${SANITY_MAX[m]} ${getRule(m).unit.canonical}.`}
                </p>
                <div className="mt-3">
                  <span className="label" id={`${m}-range-label`}>Your lab’s range (optional)</span>
                  <div className="flex items-center gap-2">
                    <input
                      aria-label={`${name} lab range, lower end`}
                      className={`field ${err.range ? 'border-tierA-fg' : ''}`}
                      inputMode="decimal"
                      placeholder="low"
                      value={f.low}
                      onChange={e => set({ low: e.target.value })}
                      aria-invalid={!!err.range}
                    />
                    <span aria-hidden="true" className="text-muted">–</span>
                    <input
                      aria-label={`${name} lab range, upper end`}
                      className={`field ${err.range ? 'border-tierA-fg' : ''}`}
                      inputMode="decimal"
                      placeholder="high"
                      value={f.high}
                      onChange={e => set({ high: e.target.value })}
                      aria-invalid={!!err.range}
                    />
                  </div>
                  {err.range && <p className="err">{err.range}</p>}
                </div>
                <div className="mt-3">
                  <label className="label" htmlFor={`${m}-date`}>Sample date (optional)</label>
                  <input id={`${m}-date`} type="date" className="field" value={f.collectionDate} onChange={e => set({ collectionDate: e.target.value })} />
                </div>
              </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="card p-5 sm:p-6">
        <legend className="sr-only">Symptoms</legend>
        <h3 className="text-lg font-semibold">Symptoms (optional)</h3>
        <p className="help mt-1">Tick any symptoms from the last few months. This list comes from the sources in our rules file.</p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SYMPTOM_OPTIONS.map(s => {
            const checked = p.symptoms.includes(s.id);
            return (
              <label
                key={s.id}
                className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border px-3 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-plum ${
                  checked ? 'border-plum bg-plum-soft' : 'border-line bg-surface'
                }`}
              >
                <input type="checkbox" className="h-5 w-5 accent-plum" checked={checked} onChange={() => p.onToggleSymptom(s.id)} />
                <span>{s.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {p.formError && <p className="err text-base" role="alert">{p.formError}</p>}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" className="btn-primary sm:px-8">See my comparison</button>
        <button type="button" className="btn-ghost" onClick={p.onClear}>Clear form</button>
      </div>
    </form>
  );
}
