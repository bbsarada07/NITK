import React from 'react';
import { DemoPersona, DEMO_PERSONAS, PRIMARY_DEMO_PERSONA } from '../utils/demoData';

export interface DemoPersonaSelectorProps {
  onSelectPersona: (persona: DemoPersona) => void;
  onReset: () => void;
  activePersonaId?: string | null;
}

export const DemoPersonaSelector: React.FC<DemoPersonaSelectorProps> = ({
  onSelectPersona,
  onReset,
  activePersonaId
}) => {
  return (
    <div className="w-full bg-gradient-to-r from-rose-900/90 via-slate-900 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-rose-500/30 backdrop-blur-md relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute -right-12 -top-12 w-48 h-48 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left info badge & title */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
              Hackathon 1-Click Evaluation
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Instant Clinical Pattern Synthesis
            </span>
          </div>

          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <span>Fast-Track Live Demonstration:</span>
            <span className="text-rose-300 font-semibold text-xs sm:text-sm">
              Explore Suboptimal Lab Gaps
            </span>
          </h3>

          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            Instantly loads Sarah&apos;s Quest bloodwork and symptom history, bypassing OCR to evaluate WHO and UTSW guideline tiers in 0 milliseconds.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Primary Showcase: Sarah */}
          <button
            type="button"
            onClick={() => onSelectPersona(PRIMARY_DEMO_PERSONA)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all transform active:scale-95 ${
              activePersonaId === PRIMARY_DEMO_PERSONA.id
                ? 'bg-rose-500 text-white ring-2 ring-rose-300 shadow-rose-900/50'
                : 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white hover:shadow-lg'
            }`}
          >
            <span className="text-base leading-none">⚡</span>
            <span>Load Demo Persona: Sarah (Iron Case)</span>
          </button>

          {/* Secondary Persona: Elena (Thyroid) */}
          {DEMO_PERSONAS.length > 1 && (
            <button
              type="button"
              onClick={() => onSelectPersona(DEMO_PERSONAS[1])}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                activePersonaId === DEMO_PERSONAS[1].id
                  ? 'bg-indigo-600/80 text-white border-indigo-400'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-slate-600'
              }`}
            >
              <span>Elena (Thyroid Case)</span>
            </button>
          )}

          {/* Reset / Custom Upload */}
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 transition-colors"
            title="Clear demo data and return to manual upload mode"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Reset / Custom Upload</span>
          </button>
        </div>
      </div>
    </div>
  );
};
