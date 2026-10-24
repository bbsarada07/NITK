import React, { useState, useEffect } from 'react';
import { EvaluationResult, ExtractedLabData, BiomarkerEntry, BiomarkerValue } from './types/types';
import { extractLabValues } from './services/geminiParser';
import { evaluateLabsAndSymptoms } from './utils/ruleEngine';
import { FileUpload } from './components/FileUpload';
import { SymptomChecklist } from './components/SymptomChecklist';
import { ResultsPanel } from './components/ResultsPanel';
import { DemoPersonaSelector } from './components/DemoPersonaSelector';
import { DemoPersona, PRIMARY_DEMO_PERSONA } from './utils/demoData';

const DEFAULT_MARKERS: BiomarkerEntry[] = [
  {
    marker: 'ferritin',
    label: 'Serum Ferritin',
    value: 18,
    unit: 'ug/L',
    labRange: '15 - 150 ug/L',
    description: 'Primary storage protein for iron. Values <30 ug/L often present with symptomatic fatigue despite being within standard lab limits.'
  },
  {
    marker: 'hemoglobin',
    label: 'Hemoglobin (Hb)',
    value: 11.6,
    unit: 'g/dL',
    labRange: '11.5 - 15.5 g/dL',
    description: 'Oxygen-carrying protein in red blood cells. WHO diagnostic cutoff for non-pregnant women is 12.0 g/dL.'
  },
  {
    marker: 'tsh',
    label: 'Thyroid Stimulating Hormone (TSH)',
    value: 3.2,
    unit: 'mIU/L',
    labRange: '0.4 - 4.0 mIU/L',
    description: 'Master regulator of thyroid output. While standard upper limit is 4.0 mIU/L, many endocrinology guidelines debate 2.5 mIU/L.'
  }
];

export const App: React.FC = () => {
  // 1. Unified State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([
    'fatigue',
    'hair loss'
  ]);
  const [biomarkers, setBiomarkers] = useState<BiomarkerEntry[]>(DEFAULT_MARKERS);
  const [evaluationResults, setEvaluationResults] = useState<EvaluationResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>('');
  const [activePersonaId, setActivePersonaId] = useState<string | null>(null);

  // 2. Initial Evaluation on Load
  useEffect(() => {
    runEvaluation(biomarkers, selectedSymptoms);
  }, []);

  const runEvaluation = (currentMarkers: BiomarkerEntry[], currentSymptoms: string[]) => {
    const extractedFormat: ExtractedLabData = {
      ferritin: {
        value: typeof currentMarkers.find(b => b.marker === 'ferritin')?.value === 'number'
          ? (currentMarkers.find(b => b.marker === 'ferritin')?.value as number)
          : null,
        unit: currentMarkers.find(b => b.marker === 'ferritin')?.unit || 'ug/L',
        labRange: currentMarkers.find(b => b.marker === 'ferritin')?.labRange || '15 - 150 ug/L'
      },
      hemoglobin: {
        value: typeof currentMarkers.find(b => b.marker === 'hemoglobin')?.value === 'number'
          ? (currentMarkers.find(b => b.marker === 'hemoglobin')?.value as number)
          : null,
        unit: currentMarkers.find(b => b.marker === 'hemoglobin')?.unit || 'g/dL',
        labRange: currentMarkers.find(b => b.marker === 'hemoglobin')?.labRange || '11.5 - 15.5 g/dL'
      },
      tsh: {
        value: typeof currentMarkers.find(b => b.marker === 'tsh')?.value === 'number'
          ? (currentMarkers.find(b => b.marker === 'tsh')?.value as number)
          : null,
        unit: currentMarkers.find(b => b.marker === 'tsh')?.unit || 'mIU/L',
        labRange: currentMarkers.find(b => b.marker === 'tsh')?.labRange || '0.4 - 4.0 mIU/L'
      }
    };

    const results = evaluateLabsAndSymptoms(extractedFormat, currentSymptoms);
    setEvaluationResults(results);
  };

  // Handlers
  const handleFileSelect = (file: File) => {
    setUploadedFile(file);
  };

  const handleFileRemove = () => {
    setUploadedFile(null);
    setActivePersonaId(null);
    setEvaluationResults([]);
  };

  const handleSymptomToggle = (symptom: string) => {
    setSelectedSymptoms(prev => {
      const updated = prev.includes(symptom)
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom];
      
      runEvaluation(biomarkers, updated);
      return updated;
    });
  };

  const handleMarkerValueChange = (markerKey: string, newValue: string) => {
    setBiomarkers(prev => {
      const updated: BiomarkerEntry[] = prev.map(b => {
        if (b.marker === markerKey) {
          if (newValue.trim() === '') {
            return { ...b, value: '' as BiomarkerValue };
          }
          const parsed = parseFloat(newValue);
          return { ...b, value: (isNaN(parsed) ? '' : parsed) as BiomarkerValue };
        }
        return b;
      });
      runEvaluation(updated, selectedSymptoms);
      return updated;
    });
  };

  // Trigger Gemini API extraction & rule evaluation
  const handleAnalyzeReport = async () => {
    if (!uploadedFile) {
      alert('Please upload a lab report (PDF or Image) first.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStatus('Connecting to Google Gemini API for multimodal extraction...');

    try {
      // Step 1: Multimodal Extraction via Google Gemini
      const extracted = await extractLabValues(uploadedFile);

      setAnalysisStatus('Correlating extracted biomarker cutoffs with symptoms...');

      // Step 2: Update local biomarker inputs with extracted data
      const updatedBiomarkers = biomarkers.map(b => {
        if (b.marker === 'ferritin' && extracted.ferritin.value !== null) {
          return {
            ...b,
            value: extracted.ferritin.value,
            unit: extracted.ferritin.unit || b.unit,
            labRange: extracted.ferritin.labRange || b.labRange
          };
        }
        if (b.marker === 'hemoglobin' && extracted.hemoglobin.value !== null) {
          return {
            ...b,
            value: extracted.hemoglobin.value,
            unit: extracted.hemoglobin.unit || b.unit,
            labRange: extracted.hemoglobin.labRange || b.labRange
          };
        }
        if (b.marker === 'tsh' && extracted.tsh.value !== null) {
          return {
            ...b,
            value: extracted.tsh.value,
            unit: extracted.tsh.unit || b.unit,
            labRange: extracted.tsh.labRange || b.labRange
          };
        }
        return b;
      });

      setBiomarkers(updatedBiomarkers);

      // Step 3: Run core evaluation against rules.json
      const results = evaluateLabsAndSymptoms(extracted, selectedSymptoms);
      setEvaluationResults(results);

      // Step 4: Scroll down to results
      setTimeout(() => {
        const resultsEl = document.getElementById('results-section');
        if (resultsEl) {
          resultsEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (err: unknown) {
      console.error('Error during clinical pattern synthesis:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze lab report. Please verify configuration.';
      alert(errorMessage);
    } finally {
      setIsAnalyzing(false);
      setAnalysisStatus('');
    }
  };

  // 1-Click Demo Persona Handler: Instantly hydrates state and evaluates rules with 0ms latency
  const handleSelectDemoPersona = (persona: DemoPersona) => {
    setActivePersonaId(persona.id);

    // Mock PDF file representing the persona's lab panel for the file uploader UI
    const mockFile = new File([persona.mockOcrText], persona.fileName, {
      type: 'application/pdf'
    });
    setUploadedFile(mockFile);

    // Hydrate symptoms
    setSelectedSymptoms(persona.symptoms);

    // Hydrate biomarkers
    const updatedBiomarkers: BiomarkerEntry[] = biomarkers.map(b => {
      if (b.marker === 'ferritin') {
        return {
          ...b,
          value: persona.labData.ferritin ? persona.labData.ferritin.value : ('' as BiomarkerValue),
          unit: persona.labData.ferritin ? persona.labData.ferritin.unit : b.unit,
          labRange: persona.labData.ferritin?.labRange || b.labRange
        };
      }
      if (b.marker === 'hemoglobin') {
        return {
          ...b,
          value: persona.labData.hemoglobin ? persona.labData.hemoglobin.value : ('' as BiomarkerValue),
          unit: persona.labData.hemoglobin ? persona.labData.hemoglobin.unit : b.unit,
          labRange: persona.labData.hemoglobin?.labRange || b.labRange
        };
      }
      if (b.marker === 'tsh') {
        return {
          ...b,
          value: persona.labData.tsh ? persona.labData.tsh.value : ('' as BiomarkerValue),
          unit: persona.labData.tsh ? persona.labData.tsh.unit : b.unit,
          labRange: persona.labData.tsh?.labRange || b.labRange
        };
      }
      return b;
    });
    setBiomarkers(updatedBiomarkers);

    // Synchronously evaluate labs and symptoms for instant hackathon demonstration
    const extractedFormat: ExtractedLabData = {
      ferritin: {
        value: persona.labData.ferritin ? persona.labData.ferritin.value : null,
        unit: persona.labData.ferritin?.unit || 'ng/mL',
        labRange: persona.labData.ferritin?.labRange || '15 - 150 ng/mL'
      },
      hemoglobin: {
        value: persona.labData.hemoglobin ? persona.labData.hemoglobin.value : null,
        unit: persona.labData.hemoglobin?.unit || 'g/dL',
        labRange: persona.labData.hemoglobin?.labRange || '11.5 - 15.5 g/dL'
      },
      tsh: {
        value: persona.labData.tsh ? persona.labData.tsh.value : null,
        unit: persona.labData.tsh?.unit || 'mIU/L',
        labRange: persona.labData.tsh?.labRange || '0.4 - 4.0 mIU/L'
      }
    };

    const results = evaluateLabsAndSymptoms(extractedFormat, persona.symptoms);
    setEvaluationResults(results);

    // Smooth scroll down to results section for immediate visual feedback
    setTimeout(() => {
      const resultsEl = document.getElementById('results-section');
      if (resultsEl) {
        resultsEl.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const handleResetDemo = () => {
    setActivePersonaId(null);
    setUploadedFile(null);
    setSelectedSymptoms([]);
    const cleared: BiomarkerEntry[] = biomarkers.map(b => ({ ...b, value: '' as BiomarkerValue }));
    setBiomarkers(cleared);
    setEvaluationResults([]);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-800 antialiased font-sans">
      {/* Sticky Professional Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-400 text-white flex items-center justify-center font-black text-lg shadow-sm">
              H
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg">
                  HerChart
                </span>
                <span className="hidden sm:inline-block text-slate-300 font-light">|</span>
                <span className="text-xs sm:text-sm font-semibold text-rose-600">
                  Clinical Pattern Synthesizer
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Closing reference-range gaps for adult, non-pregnant women
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 mr-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Gemini 3.8 Flash</span>
            </div>

            <button
              type="button"
              onClick={() => handleSelectDemoPersona(PRIMARY_DEMO_PERSONA)}
              className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span>⚡</span>
              <span>Demo: Sarah (Iron)</span>
            </button>
            <button
              type="button"
              onClick={handleResetDemo}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
              title="Clear all inputs"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* Main Single-Scroll Dashboard */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Intro Hero Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-rose-950 text-white rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 mb-4">
              <span>●</span> Gemini Intelligence Layer Active
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight leading-tight mb-3">
              When "Normal" Labs Still Leave You Feeling Exhausted.
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-6">
              Standard lab reference ranges are broad population statistics that frequently miss subclinical deficiencies. HerChart uses Google Gemini to extract your biomarkers and correlates them with WHO guidelines, academic evidence, and your logged symptoms to generate an actionable clinical summary sheet.
            </p>

            {/* Quick Step Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/10 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-rose-500/30 text-rose-300 font-bold flex items-center justify-center shrink-0 border border-rose-400/40">
                  1
                </span>
                <span>Upload Lab Panel (PDF/Image)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-rose-500/30 text-rose-300 font-bold flex items-center justify-center shrink-0 border border-rose-400/40">
                  2
                </span>
                <span>Log Clinical Symptoms</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-rose-500/30 text-rose-300 font-bold flex items-center justify-center shrink-0 border border-rose-400/40">
                  3
                </span>
                <span>Analyze & Synthesize Insights</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hackathon 1-Click Demo Persona Switcher */}
        <DemoPersonaSelector
          onSelectPersona={handleSelectDemoPersona}
          onReset={handleResetDemo}
          activePersonaId={activePersonaId}
        />

        {/* STEP 1: Upload Lab Report */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-extrabold text-sm flex items-center justify-center">
                1
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Step 1: Upload Report & Review Extracted Values
                </h2>
                <p className="text-xs text-slate-500">
                  Upload your laboratory results (PDF or Image). Gemini extracts ferritin, hemoglobin, and TSH.
                </p>
              </div>
            </div>

            {uploadedFile && (
              <button
                type="button"
                onClick={handleAnalyzeReport}
                disabled={isAnalyzing}
                className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Analyzing with Gemini...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Analyze Report</span>
                  </>
                )}
              </button>
            )}
          </div>

          <FileUpload
            selectedFile={uploadedFile}
            onFileSelect={handleFileSelect}
            onFileRemove={handleFileRemove}
          />

          {/* Prominent Mobile/Full-Width Analyze Action Button */}
          {uploadedFile && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                <span>
                  <strong>Report Attached:</strong> Ready for Gemini OCR & clinical guideline evaluation.
                </span>
              </div>
              <button
                type="button"
                onClick={handleAnalyzeReport}
                disabled={isAnalyzing}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-all disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Run Clinical Analysis</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Interactive Biomarker Values Container */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Extracted Biomarker Panel ({biomarkers.length})
              </span>
              <span className="text-xs text-slate-400">
                You can manually fine-tune or verify values
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {biomarkers.map(item => (
                <div
                  key={item.marker}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-rose-200 hover:shadow-xs transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor={`marker-${item.marker}`}
                      className="text-xs font-bold text-slate-800 capitalize"
                    >
                      {item.label}
                    </label>
                    <span className="text-[11px] font-mono text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded">
                      {item.unit}
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      id={`marker-${item.marker}`}
                      type="number"
                      step="any"
                      placeholder="e.g. 18"
                      value={item.value}
                      onChange={e => handleMarkerValueChange(item.marker, e.target.value)}
                      className="w-full px-3 py-2 text-base font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all font-mono"
                    />
                  </div>

                  <div className="text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-600">Lab Range: </span>
                    <span className="font-mono">{item.labRange}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* STEP 2: Log Symptoms */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-extrabold text-sm flex items-center justify-center">
              2
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Step 2: Log Symptoms
              </h2>
              <p className="text-xs text-slate-500">
                Check any symptoms you have experienced over the past 3-6 months.
              </p>
            </div>
          </div>

          <SymptomChecklist
            selectedSymptoms={selectedSymptoms}
            onSymptomToggle={handleSymptomToggle}
          />
        </section>

        {/* STEP 3: Review Clinical Insights */}
        <section id="results-section" className="space-y-4">
          <div className="flex items-center gap-3 px-2">
            <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-extrabold text-sm flex items-center justify-center">
              3
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Step 3: Review Clinical Insights & Action Plan
              </h2>
              <p className="text-xs text-slate-500">
                Synthesized evaluation combining guideline cutoffs, patient symptoms, and discussion questions.
              </p>
            </div>
          </div>

          <ResultsPanel
            results={evaluationResults}
            uploadedFile={uploadedFile}
            selectedSymptoms={selectedSymptoms}
            isLoading={isAnalyzing}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 print:hidden">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <p className="font-semibold text-slate-700">
            HerChart | Clinical Pattern Synthesizer for Women's Health
          </p>
          <p className="max-w-xl mx-auto text-[11px] text-slate-400">
            This tool is designed for educational health advocacy and clinical discussion facilitation. It does not provide medical diagnoses or replace consultations with licensed healthcare practitioners.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
