import { useEffect, useRef, useState } from 'react';
import { EntryForm, emptyMarkerForm, type ProfileState } from './components/EntryForm';
import { ResultCard } from './components/ResultCard';
import { UploadPanel } from './components/UploadPanel';
import { DoctorSummary, DISCLAIMER } from './components/DoctorSummary';
import { Explainer } from './components/Explainer';
import { Trends } from './components/Trends';
import { PrivacyModal, SourcesModal } from './components/InfoModals';
import { Icon, ToastProvider, useToast } from './components/ui';
import { MARKER_IDS, getRule, symptomLabel, type MarkerId } from './lib/rules';
import { checkEligibility, validateMarker, type Eligibility, type MarkerErrors, type MarkerFormValue, type ValidMarkerInput } from './lib/input';
import { evaluateMarkers, type EvaluatedMarker } from './lib/evaluate';
import { hasUrgentSymptom, overlappingSymptoms, OVERLAP_MESSAGE, URGENT_MESSAGE } from './lib/safety';
import { SAMPLES, type Sample } from './lib/samples';
import { clearAll, exportJson, loadEntries, newId, saveEntries, type SavedEntry } from './lib/storage';
import { checkAiHealth, type AiHealth } from './lib/api';

type Markers = Record<MarkerId, MarkerFormValue>;

const emptyMarkers = (): Markers => ({
  ferritin: emptyMarkerForm('ferritin'),
  hemoglobin: emptyMarkerForm('hemoglobin'),
  tsh: emptyMarkerForm('tsh')
});

const MIN_AGE = getRule('ferritin').population.minAgeYears ?? 18;

const NOT_COVERED_COPY: Record<NonNullable<Eligibility['reason']>, { title: string; body: string }> = {
  missing_age: {
    title: 'We need your age first',
    body: 'The guideline cutoffs HerChart uses are for adults. Please add your age above so we can check they apply to you.'
  },
  invalid_age: {
    title: 'Please check your age',
    body: 'Enter your age in whole years, for example 32.'
  },
  missing_pregnancy: {
    title: 'One more question',
    body: 'Please tell us whether you are, or could be, pregnant. Pregnancy changes which cutoffs apply.'
  },
  under_18: {
    title: 'HerChart is not built for under-18s yet',
    body: `The cutoffs in our rules are for adults aged ${MIN_AGE} and over. Teen ranges differ, so we will not show a comparison that might not fit you. A doctor or school nurse can walk you through your report.`
  },
  pregnant: {
    title: 'Congratulations, and please talk to your care team',
    body: 'Pregnancy changes blood test ranges, often by trimester, so HerChart’s cutoffs do not apply and we will not show a comparison. Your midwife, obstetrician or doctor is the right person to explain these results.'
  }
};

function AppInner() {
  const toast = useToast();
  const [profile, setProfile] = useState<ProfileState>({ age: '', pregnant: '' });
  const [markers, setMarkers] = useState<Markers>(emptyMarkers);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [errors, setErrors] = useState<Partial<Record<MarkerId, MarkerErrors>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [gate, setGate] = useState<Eligibility | null>(null);
  const [results, setResults] = useState<EvaluatedMarker[] | null>(null);
  const [resultSymptoms, setResultSymptoms] = useState<string[]>([]);
  const [sampleId, setSampleId] = useState<string | null>(null);
  const [view, setView] = useState<'main' | 'summary'>('main');
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [entries, setEntries] = useState<SavedEntry[]>(() => loadEntries());
  const [savedFor, setSavedFor] = useState<EvaluatedMarker[] | null>(null);
  const [aiHealth, setAiHealth] = useState<AiHealth>('unknown');
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const pendingFocus = useRef(false);

  useEffect(() => {
    let active = true;
    checkAiHealth().then(h => active && setAiHealth(h));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (pendingFocus.current && view === 'main') {
      pendingFocus.current = false;
      resultsHeading.current?.scrollIntoView({ block: 'start' });
      resultsHeading.current?.focus({ preventScroll: true });
    }
  });

  function showResults(inputs: ValidMarkerInput[], syms: string[], fromSample: string | null) {
    setResults(evaluateMarkers(inputs, syms));
    setResultSymptoms(syms);
    setSampleId(fromSample);
    setGate({ eligible: true, reason: null });
    setView('main');
    pendingFocus.current = true;
  }

  function submit() {
    setFormError(null);
    const eligibility = checkEligibility(profile.age, profile.pregnant, MIN_AGE);
    const nextErrors: Partial<Record<MarkerId, MarkerErrors>> = {};
    const inputs: ValidMarkerInput[] = [];
    for (const m of MARKER_IDS) {
      const v = validateMarker(m, markers[m]);
      if (v.status === 'invalid') nextErrors[m] = v.errors;
      if (v.status === 'ok') inputs.push(v.input);
    }
    setErrors(nextErrors);
    if (!eligibility.eligible) {
      setGate(eligibility);
      setResults(null);
      pendingFocus.current = true;
      return;
    }
    if (Object.keys(nextErrors).length > 0) {
      setFormError('Please fix the highlighted fields.');
      return;
    }
    if (inputs.length === 0) {
      setFormError('Enter at least one result to compare.');
      return;
    }
    showResults(inputs, symptoms, null);
  }

  function loadSample(s: Sample) {
    const next = emptyMarkers();
    const inputs: ValidMarkerInput[] = [];
    for (const m of MARKER_IDS) {
      const sm = s.markers[m];
      if (!sm) continue;
      next[m] = { ...sm, collectionDate: '' };
      const v = validateMarker(m, next[m]);
      if (v.status === 'ok') inputs.push(v.input);
    }
    setProfile({ age: '30', pregnant: 'no' });
    setMarkers(next);
    setSymptoms(s.symptoms);
    setErrors({});
    setFormError(null);
    showResults(inputs, s.symptoms, s.id);
  }

  function clearForm() {
    setProfile({ age: '', pregnant: '' });
    setMarkers(emptyMarkers());
    setSymptoms([]);
    setErrors({});
    setFormError(null);
    setGate(null);
    setResults(null);
    setSampleId(null);
  }

  function updateEntries(next: SavedEntry[]) {
    setEntries(next);
    if (!saveEntries(next)) toast('Could not save in this browser (storage may be blocked).');
  }

  function saveHistory() {
    if (!results) return;
    const now = new Date().toISOString();
    const added: SavedEntry[] = results.map(e => ({
      id: newId(),
      savedAt: now,
      collectionDate: e.input.collectionDate,
      marker: e.marker,
      value: e.input.value,
      unit: e.input.unit,
      labLow: e.input.labLow,
      labHigh: e.input.labHigh,
      symptoms: resultSymptoms
    }));
    updateEntries([...entries, ...added]);
    setSavedFor(results);
    toast('Saved on this device');
  }

  function deleteEverything() {
    clearAll();
    setEntries([]);
    clearForm();
    setPrivacyOpen(false);
    toast('Everything deleted from this device');
  }

  const urgent = hasUrgentSymptom(symptoms) || (results !== null && hasUrgentSymptom(resultSymptoms));
  const overlap = results ? overlappingSymptoms(resultSymptoms) : [];
  const flaggedCount = results?.filter(r => r.result.matchedTier).length ?? 0;
  const activeSample = SAMPLES.find(s => s.id === sampleId);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">Skip to content</a>
      <header className="no-print sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
          <a href="#top" className="flex items-center gap-2 font-display text-lg font-semibold text-ink" onClick={() => setView('main')}>
            <img src="/favicon.svg" alt="" width={28} height={28} className="h-7 w-7" />
            HerChart
          </a>
          <nav aria-label="Site" className="flex items-center gap-1">
            <button type="button" className="btn-ghost px-3" onClick={() => setPrivacyOpen(true)}>
              <Icon name="shield" className="h-4 w-4" /> Privacy
            </button>
            <button type="button" className="btn-ghost px-3" onClick={() => setSourcesOpen(true)}>
              <Icon name="book" className="h-4 w-4" /> <span className="hidden sm:inline">Sources &amp; rules</span><span className="sm:hidden">Sources</span>
            </button>
          </nav>
        </div>
      </header>

      {urgent && (
        <div role="alert" className="no-print border-b border-tierA-fg/40 bg-tierA-bg">
          <div className="mx-auto flex max-w-6xl items-start gap-3 px-4 py-3 text-tierA-fg">
            <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="font-semibold">{URGENT_MESSAGE}</p>
          </div>
        </div>
      )}

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {view === 'summary' && results ? (
          <DoctorSummary results={results} symptoms={resultSymptoms} onBack={() => setView('main')} />
        ) : (
          <div className="space-y-12">
            <section id="top" aria-labelledby="hero-title" className="pt-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-plum">For adult women who are not pregnant</p>
              <h1 id="hero-title" className="mt-2 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
                Your lab report says in range. Is that the full story?
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-muted">
                HerChart puts your ferritin, hemoglobin or TSH next to published guideline cutoffs, because inside your lab’s range
                does not always mean nothing to discuss.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a href="#samples" className="btn-primary px-6">Try a sample</a>
                <a href="#entry" className="btn-secondary px-6" onClick={() => setTimeout(() => document.getElementById('age')?.focus({ preventScroll: true }), 300)}>Enter my results</a>
              </div>
              <ol className="mt-10 grid gap-4 sm:grid-cols-3">
                {[
                  ['Enter or upload', 'Type in your result and your lab’s printed range, or upload a report and check what we read.'],
                  ['See guideline vs lab range', 'A fixed rules file compares your value with published cutoffs, side by side with your lab’s range.'],
                  ['Take questions to your doctor', 'Get a one-page summary with sourced questions to discuss. We never diagnose.']
                ].map(([t, d], i) => (
                  <li key={t} className="card p-5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-plum-soft font-semibold text-plum">{i + 1}</span>
                    <h2 className="mt-3 text-lg font-semibold">{t}</h2>
                    <p className="mt-1 text-sm text-muted">{d}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section id="samples" aria-labelledby="samples-title" className="scroll-mt-20">
              <h2 id="samples-title" className="text-2xl font-semibold">Try a sample</h2>
              <p className="mt-1 text-sm text-muted">One click fills the form and shows a comparison. Nothing is sent anywhere.</p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {SAMPLES.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => loadSample(s)}
                    className={`card flex min-h-[44px] flex-col items-start p-5 text-left transition-colors hover:border-plum ${sampleId === s.id ? 'border-plum ring-2 ring-plum/30' : ''}`}
                  >
                    <span className="rounded-full bg-teal-soft px-2.5 py-0.5 text-xs font-semibold text-teal">Sample data, illustrative</span>
                    <span className="mt-3 font-display text-lg font-semibold">{s.title}</span>
                    <span className="mt-1 text-sm text-muted">{s.blurb}</span>
                    <span className="mt-3 text-sm font-semibold text-plum">Show this comparison →</span>
                  </button>
                ))}
              </div>
            </section>

            <section id="entry" aria-labelledby="entry-title" className="scroll-mt-20 space-y-6">
              <h2 id="entry-title" className="text-2xl font-semibold">Enter my results</h2>
              <UploadPanel
                aiDisabled={aiHealth === 'not_configured'}
                onUse={rows => {
                  setMarkers(prev => {
                    const next = { ...prev };
                    for (const r of rows) next[r.marker] = r.form;
                    return next;
                  });
                  setSampleId(null);
                  toast('Confirmed values added to the form');
                  setTimeout(() => document.getElementById('age')?.focus(), 50);
                }}
              />
              <EntryForm
                profile={profile}
                onProfile={p => setProfile(p)}
                profileError={gate && !gate.eligible && ['missing_age', 'invalid_age', 'missing_pregnancy'].includes(gate.reason ?? '') ? NOT_COVERED_COPY[gate.reason!].body : null}
                markers={markers}
                onMarker={(m, v) => setMarkers(prev => ({ ...prev, [m]: v }))}
                errors={errors}
                symptoms={symptoms}
                onToggleSymptom={id => setSymptoms(prev => (prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]))}
                formError={formError}
                onSubmit={submit}
                onClear={clearForm}
              />
            </section>

            <section id="results" aria-labelledby="results-title" className="scroll-mt-20 space-y-6">
              <h2 id="results-title" ref={resultsHeading} tabIndex={-1} className="text-2xl font-semibold outline-none">Your comparison</h2>
              <div aria-live="polite" className="space-y-6">
                {gate && !gate.eligible && gate.reason ? (
                  <div className="card border-plum/30 p-6">
                    <h3 className="text-xl font-semibold">{NOT_COVERED_COPY[gate.reason].title}</h3>
                    <p className="mt-2 max-w-2xl text-muted">{NOT_COVERED_COPY[gate.reason].body}</p>
                    <p className="mt-3 text-sm text-muted">No result has been calculated.</p>
                  </div>
                ) : !results ? (
                  <div className="card flex flex-col items-start gap-3 border-dashed p-6">
                    <p className="font-medium">No comparison yet.</p>
                    <p className="text-sm text-muted">Try a sample above, or enter at least one result and press “See my comparison”.</p>
                  </div>
                ) : (
                  <>
                    {activeSample && <p className="rounded-xl bg-teal-soft px-3 py-2 text-sm text-teal"><strong>Sample data, illustrative:</strong> {activeSample.title}. Not a real person.</p>}
                    <div className="card p-5">
                      <p className="font-medium">
                        {results.length} test{results.length === 1 ? '' : 's'} compared · {flaggedCount} with a guideline flag
                      </p>
                      {resultSymptoms.length > 0 && (
                        <p className="mt-1 text-sm text-muted">Symptoms ticked: {resultSymptoms.map(symptomLabel).join(', ')}</p>
                      )}
                      {overlap.length > 0 && (
                        <p className="mt-3 rounded-xl border border-teal/40 bg-teal-soft px-3 py-2 text-sm text-ink">
                          <strong>{overlap.map(symptomLabel).join(', ')}:</strong> {OVERLAP_MESSAGE}
                        </p>
                      )}
                    </div>
                    <div className={`grid gap-6 ${results.length > 1 ? 'lg:grid-cols-2' : 'max-w-3xl'}`}>
                      {results.map(e => <ResultCard key={e.marker} e={e} />)}
                    </div>
                    <Explainer results={results} aiDisabled={aiHealth === 'not_configured'} />
                    <div className="no-print flex flex-col gap-3 sm:flex-row">
                      <button type="button" className="btn-primary" onClick={() => { setView('summary'); window.scrollTo({ top: 0 }); }}>
                        <Icon name="printer" className="h-4 w-4" /> Doctor visit summary
                      </button>
                      <button type="button" className="btn-secondary" onClick={saveHistory} disabled={savedFor === results}>
                        {savedFor === results ? 'Saved on this device' : 'Save to my history on this device'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </section>

            <section id="trends" aria-label="My trends" className="scroll-mt-20">
              <Trends entries={entries} onChange={updateEntries} />
            </section>
          </div>
        )}
      </main>

      <footer className="no-print border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted">
          <p className="font-semibold text-ink">{DISCLAIMER}</p>
          <p className="mt-1">Always talk to a doctor about your results. In an emergency, contact local emergency services.</p>
        </div>
      </footer>

      <PrivacyModal
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        savedCount={entries.length}
        onExport={() => exportJson(entries)}
        onDeleteAll={deleteEverything}
      />
      <SourcesModal open={sourcesOpen} onClose={() => setSourcesOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
