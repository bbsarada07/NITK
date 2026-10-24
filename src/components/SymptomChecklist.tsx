import React from 'react';

interface SymptomChecklistProps {
  selectedSymptoms: string[];
  onSymptomToggle: (symptom: string) => void;
}

interface SymptomMetadata {
  id: string;
  name: string;
  category: 'Energy & Cognition' | 'Cardiorespiratory & Flow' | 'Physical & Metabolic';
  description: string;
  clinicalRelevance: string;
}

const CLINICAL_SYMPTOMS: SymptomMetadata[] = [
  {
    id: 'fatigue',
    name: 'fatigue',
    category: 'Energy & Cognition',
    description: 'Persistent, draining exhaustion unalleviated by typical rest or sleep.',
    clinicalRelevance: 'Hallmark indicator for depleted iron stores (ferritin) & sluggish thyroid output (TSH).'
  },
  {
    id: 'brain fog',
    name: 'brain fog',
    category: 'Energy & Cognition',
    description: 'Sluggish cognitive processing, memory lapses, and impaired executive focus.',
    clinicalRelevance: 'Commonly co-occurring in thyroid dysfunction and subclinical iron deficiency.'
  },
  {
    id: 'heavy periods',
    name: 'heavy periods',
    category: 'Cardiorespiratory & Flow',
    description: 'Menorrhagia; frequent pad/tampon changes or cycles lasting longer than 7 days.',
    clinicalRelevance: 'Leading cause of chronic insidious iron depletion in reproductive-age women.'
  },
  {
    id: 'breathlessness',
    name: 'breathlessness',
    category: 'Cardiorespiratory & Flow',
    description: 'Shortness of breath during mild exertion, walking, or stair climbing.',
    clinicalRelevance: 'Compromised oxygen-carrying capacity secondary to low hemoglobin and ferritin.'
  },
  {
    id: 'dizziness',
    name: 'dizziness',
    category: 'Cardiorespiratory & Flow',
    description: 'Frequent lightheadedness, unsteadiness, or postural instability.',
    clinicalRelevance: 'Frequently observed in low circulating hemoglobin and hypoperfusion.'
  },
  {
    id: 'hair loss',
    name: 'hair loss',
    category: 'Physical & Metabolic',
    description: 'Excessive shedding, telogen effluvium, or noticeable diffuse crown thinning.',
    clinicalRelevance: 'Hair follicle matrix cells have high turnover reliant on ferritin stores.'
  },
  {
    id: 'cold intolerance',
    name: 'cold intolerance',
    category: 'Physical & Metabolic',
    description: 'Unusual sensitivity to cold temperatures, persistently cold extremities.',
    clinicalRelevance: 'Cardinal symptom of impaired cellular metabolism and subclinical hypothyroidism.'
  }
];

export const SymptomChecklist: React.FC<SymptomChecklistProps> = ({
  selectedSymptoms,
  onSymptomToggle
}) => {
  const categories: Array<'Energy & Cognition' | 'Cardiorespiratory & Flow' | 'Physical & Metabolic'> = [
    'Energy & Cognition',
    'Cardiorespiratory & Flow',
    'Physical & Metabolic'
  ];

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Clinical Symptom Tracker
          </h3>
          <p className="text-xs text-slate-500">
            Select any persistent symptoms you are experiencing to correlate with guideline thresholds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            {selectedSymptoms.length} logged
          </span>
          {selectedSymptoms.length > 0 && (
            <button
              type="button"
              onClick={() => {
                selectedSymptoms.forEach(s => onSymptomToggle(s));
              }}
              className="text-xs text-slate-400 hover:text-slate-600 underline transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {categories.map(category => {
          const categorySymptoms = CLINICAL_SYMPTOMS.filter(s => s.category === category);

          return (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {category}
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {categorySymptoms.map(item => {
                  const isChecked = selectedSymptoms.includes(item.name);

                  return (
                    <label
                      key={item.id}
                      onClick={() => onSymptomToggle(item.name)}
                      className={`relative flex items-start p-3.5 rounded-xl border cursor-pointer select-none transition-all duration-150 ${
                        isChecked
                          ? 'border-rose-400 bg-rose-50/40 shadow-sm ring-1 ring-rose-300'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center h-5 mr-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // controlled via label onClick
                          className="w-4 h-4 text-rose-600 border-slate-300 rounded focus:ring-rose-500 focus:ring-offset-0 transition-colors"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-sm font-semibold capitalize ${
                              isChecked ? 'text-rose-900' : 'text-slate-800'
                            }`}
                          >
                            {item.name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
