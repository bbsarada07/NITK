import type { MarkerId } from './rules';
import type { MarkerFormValue } from './input';

/** Sample data, illustrative only. Not real people or real reports. */
export interface Sample {
  id: string;
  title: string;
  blurb: string;
  markers: Partial<Record<MarkerId, Omit<MarkerFormValue, 'collectionDate'>>>;
  symptoms: string[];
}

export const SAMPLES: Sample[] = [
  {
    id: 'hb-inside-range',
    title: 'Hemoglobin inside lab range',
    blurb: 'Hemoglobin 11.8 g/dL, lab range 11.5–15.5. Inside the lab’s range, yet below the WHO cutoff.',
    markers: { hemoglobin: { value: '11.8', unit: 'g/dL', low: '11.5', high: '15.5' } },
    symptoms: []
  },
  {
    id: 'ferritin-borderline',
    title: 'Borderline ferritin with symptoms',
    blurb: 'Ferritin 22 ug/L, lab range 10–120, with fatigue, hair loss and heavy periods.',
    markers: { ferritin: { value: '22', unit: 'ug/L', low: '10', high: '120' } },
    symptoms: ['fatigue', 'hair_loss', 'heavy_periods']
  },
  {
    id: 'tsh-debated',
    title: 'TSH in the debated zone',
    blurb: 'TSH 3.1 mIU/L, lab range 0.4–4.5, with fatigue, cold intolerance and thinning hair.',
    markers: { tsh: { value: '3.1', unit: 'mIU/L', low: '0.4', high: '4.5' } },
    symptoms: ['fatigue', 'cold_intolerance', 'thinning_hair']
  }
];
