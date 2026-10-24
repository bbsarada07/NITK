/**
 * Centralized Demo Persona Data for HerChart
 * Showcase datasets designed for instant 1-click clinical demonstration.
 */

export interface DemoLabItem {
  value: number;
  unit: string;
  labRange?: string;
}

export interface DemoLabData {
  hemoglobin: DemoLabItem | null;
  ferritin: DemoLabItem | null;
  tsh: DemoLabItem | null;
}

export interface DemoPersona {
  id: string;
  name: string;
  shortLabel: string;
  age: number;
  description: string;
  clinicalTag: string;
  labData: DemoLabData;
  symptoms: string[];
  mockOcrText: string;
  fileName: string;
}

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: 'sarah-iron-depletion',
    name: 'Sarah (28) - Suboptimal Ferritin & Borderline Hb',
    shortLabel: 'Sarah (Iron Case)',
    age: 28,
    description: 'Hides behind normal lab reference ranges; flagged by WHO thresholds and symptom triggers.',
    clinicalTag: 'Subclinical Iron Deficiency',
    labData: {
      hemoglobin: {
        value: 11.4,
        unit: 'g/dL',
        labRange: '11.5 - 15.5 g/dL'
      },
      ferritin: {
        value: 22,
        unit: 'ng/mL',
        labRange: '15 - 150 ng/mL'
      },
      tsh: null
    },
    symptoms: ['Fatigue', 'Hair loss', 'Heavy periods'],
    mockOcrText: 
`QUEST DIAGNOSTICS - COMPREHENSIVE FEMALE HEALTH PANEL
Patient: Sarah Jenkins | Age: 28 | Sex: F | Fasting: Yes
Specimen Collected: 10/18/2026 | Reported: 10/19/2026

TEST NAME                 IN LAB RESULT    REFERENCE RANGE   STATUS
-------------------------------------------------------------------
Hemoglobin (Hb)           11.4 g/dL        11.5 - 15.5 g/dL  NORMAL
Serum Ferritin            22 ng/mL         15 - 150 ng/mL    NORMAL
TSH (3rd Gen)             Not Ordered      --                --

LAB COMMENT: Ferritin is within conventional population reference limit (15-150 ng/mL). No critical acute alerts.`,
    fileName: 'Quest_Diagnostics_Sarah_Jenkins_28yo.pdf'
  },
  {
    id: 'elena-subclinical-thyroid',
    name: 'Elena (35) - Borderline High TSH with Fatigue & Cold Sensitivity',
    shortLabel: 'Elena (Thyroid Case)',
    age: 35,
    description: 'TSH is 3.4 mIU/L (inside standard 0.4-4.0 lab range), but triggers ATA guideline review when paired with cold intolerance.',
    clinicalTag: 'Debated Subclinical Thyroid Range',
    labData: {
      hemoglobin: {
        value: 13.2,
        unit: 'g/dL',
        labRange: '12.0 - 15.5 g/dL'
      },
      ferritin: {
        value: 48,
        unit: 'ug/L',
        labRange: '15 - 150 ug/L'
      },
      tsh: {
        value: 3.4,
        unit: 'mIU/L',
        labRange: '0.4 - 4.0 mIU/L'
      }
    },
    symptoms: ['Cold intolerance', 'Brain fog', 'Fatigue'],
    mockOcrText: 
`LABCORP - ENDOCRINE & THYROID EVALUATION PANEL
Patient: Elena Rostova | Age: 35 | Sex: F
Specimen Collected: 10/12/2026 | Reported: 10/14/2026

TEST NAME                 IN LAB RESULT    REFERENCE RANGE   STATUS
-------------------------------------------------------------------
TSH, High Sensitivity     3.40 mIU/L       0.40 - 4.00 mIU/L NORMAL
Serum Ferritin            48 ug/L          15 - 150 ug/L     NORMAL
Hemoglobin                13.2 g/dL        12.0 - 15.5 g/dL  NORMAL

LAB COMMENT: TSH remains within normal broad laboratory reference interval.`,
    fileName: 'LabCorp_Endocrine_Elena_Rostova_35yo.pdf'
  }
];

export const PRIMARY_DEMO_PERSONA: DemoPersona = DEMO_PERSONAS[0];
