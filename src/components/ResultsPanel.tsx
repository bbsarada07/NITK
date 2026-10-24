import React from 'react';
import { EvaluationResult } from '../types/types';

interface ResultsPanelProps {
  results: EvaluationResult[];
  uploadedFile: File | null;
  selectedSymptoms: string[];
  isLoading?: boolean;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  results,
  uploadedFile,
  selectedSymptoms,
  isLoading = false
}) => {
  const handlePrint = () => {
    window.print();
  };

  // Case 0: Loading State
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-10 sm:p-16 text-center shadow-sm">
        <div className="relative w-16 h-16 mx-auto mb-5 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-rose-100 border-t-rose-600 animate-spin"></div>
          <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
            <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        <h3 className="text-lg font-bold text-slate-800 mb-2">
          Synthesizing lab values and symptoms...
        </h3>

        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          The intelligence layer is extracting biomarker values via Google Gemini and cross-referencing your reported symptoms against multi-tier clinical guidelines.
        </p>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-rose-600 bg-rose-50/70 border border-rose-100 rounded-full px-4 py-1.5 w-max mx-auto">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          <span>Correlating Ferritin, Hemoglobin & TSH cutoffs</span>
        </div>
      </div>
    );
  }

  // Case 1: Empty / Placeholder State
  if (results.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-8 sm:p-12 text-center shadow-sm">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>

        <h3 className="text-lg font-bold text-slate-800 mb-2">
          Your Clinical Summary Awaits
        </h3>

        <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed mb-6">
          Traditional lab reference ranges are built on population averages rather than optimal functional vitality for women. Upload your lab report and record your symptoms above to generate a synthesized pattern evaluation and personalized doctor-discussion checklist.
        </p>

        <div className="inline-flex flex-col sm:flex-row items-center gap-3 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200/70 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${uploadedFile ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
            <span>{uploadedFile ? `Report uploaded (${uploadedFile.name.slice(0, 20)}...)` : 'Step 1: Upload lab panel'}</span>
          </div>
          <span className="hidden sm:inline text-slate-300">•</span>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${selectedSymptoms.length > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
            <span>{selectedSymptoms.length > 0 ? `${selectedSymptoms.length} symptoms logged` : 'Step 2: Log symptoms'}</span>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Populated State
  return (
    <div className="space-y-6">
      {/* Header bar with print button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              {results.length} Clinical {results.length === 1 ? 'Pattern' : 'Patterns'} Detected
            </span>
            <span className="text-xs text-slate-500">
              Correlated with current medical guidelines
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Synthesized Clinical Insights & Doctor Discussion Sheet
          </h2>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition-all hover:shadow print:hidden shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Doctor Summary
        </button>
      </div>

      {/* Evaluated Flag Cards */}
      <div className="space-y-4">
        {results.map((result, idx) => {
          const isDebatedOrBorderline = result.matchedTier.tier_name.toLowerCase().includes('borderline') ||
            result.matchedTier.tier_name.toLowerCase().includes('tier b') ||
            result.matchedTier.tier_name.toLowerCase().includes('debated');

          return (
            <div
              key={`${result.marker}-${idx}`}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div
                className={`absolute top-0 left-0 right-0 h-1.5 ${
                  isDebatedOrBorderline ? 'bg-amber-400' : 'bg-rose-500'
                }`}
              />

              {/* Title & Badge */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Biomarker Evaluation
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        isDebatedOrBorderline
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {isDebatedOrBorderline
                        ? 'Normal-but-Concerning Subclinical Range'
                        : 'Guideline Deficiency Threshold'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 capitalize mt-0.5">
                    {result.marker}
                  </h3>
                </div>

                <div className="flex items-baseline gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/70">
                  <span className="text-xs text-slate-500 font-medium">Your Value:</span>
                  <span className="text-lg font-extrabold text-slate-900">
                    {result.value}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    {result.unit}
                  </span>
                </div>
              </div>

              {/* Range Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5 p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/60 text-xs">
                <div>
                  <span className="font-semibold text-slate-500 block mb-0.5">
                    Standard Lab Reference Range:
                  </span>
                  <span className="text-slate-800 font-medium font-mono">
                    {result.labRange || 'Not provided'}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    (Standard population range printed on laboratory report)
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block mb-0.5">
                    Evidence-Based Clinical Threshold:
                  </span>
                  <span className="text-rose-700 font-medium font-mono">
                    {result.matchedTier.cutoff_condition}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5 font-medium">
                    {result.matchedTier.tier_name}
                  </span>
                </div>
              </div>

              {/* Symptom Correlation */}
              {result.matchedSymptoms.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Correlated Patient Symptoms ({result.matchedSymptoms.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.matchedSymptoms.map((sym, sIdx) => (
                      <span
                        key={sIdx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        <span className="capitalize">{sym}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning / Pattern Explanation */}
              <div className="mb-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 leading-relaxed">
                <span className="font-semibold text-slate-900 block mb-1">
                  Clinical Pattern Interpretation:
                </span>
                <p>
                  Your {result.marker} is currently evaluated as {result.matchedTier.tier_name}.
                  {result.matchedSymptoms.length > 0
                    ? ` This value correlates with your reported symptoms (${result.matchedSymptoms.join(', ')}). While your lab might classify this within normal limits, clinical literature recognizes that patients frequently experience symptomatic impact in this range.`
                    : ' This represents a single laboratory data point that warrants doctor review in the context of your overall clinical picture.'}
                </p>
              </div>

              {/* Citations & Evidence Base */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-600">Guideline Sources:</span>
                  <span>{result.matchedTier.source_citation}</span>
                </div>
                <span className="text-slate-400 italic text-[11px]">
                  Clinical decision support • Not a substitute for formal medical diagnosis
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Doctor-Ready Discussion Guide */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-600/30 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold">
              Doctor-Ready Discussion Questions
            </h3>
            <p className="text-xs text-slate-300">
              Bring these targeted questions to your next appointment to facilitate a collaborative review.
            </p>
          </div>
        </div>

        <ul className="space-y-3 text-sm text-slate-200">
          <li className="flex items-start gap-2.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-rose-400 font-bold text-xs shrink-0 mt-0.5">
              1
            </span>
            <span>
              <strong>Ferritin Context:</strong> "Could infection or low-grade inflammation be artificially elevating my ferritin, and would checking a high-sensitivity CRP or transferrin saturation (TSAT) provide a clearer picture?"
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-rose-400 font-bold text-xs shrink-0 mt-0.5">
              2
            </span>
            <span>
              <strong>Reference Range Discrepancy:</strong> "My lab marked my numbers within standard ranges, but recent clinical guidelines (e.g. WHO 2020/2024, UTSW) use tighter cutoffs for symptomatic women. Does that threshold apply to my symptom profile?"
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-rose-400 font-bold text-xs shrink-0 mt-0.5">
              3
            </span>
            <span>
              <strong>Thyroid Follow-Up:</strong> "If TSH is at the upper end of normal or above 2.5 mIU/L, should we evaluate Free T4 and Thyroid Peroxidase Antibodies (TPO) to rule out early autoimmune thyroiditis?"
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
};
