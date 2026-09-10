import { apa } from './apa.js';
import { chicago } from './chicago.js';
import { gbt7714 } from './gbt7714.js';
import { harvard } from './harvard.js';
import { mla } from './mla.js';

/** GB/T 7714 leads because it is the default for Chinese manuscripts. */
export const CITATION_STYLES = [
  { id: 'gbt7714', labelKey: 'styleGbt', render: gbt7714 },
  { id: 'apa', labelKey: 'styleApa', render: apa },
  { id: 'mla', labelKey: 'styleMla', render: mla },
  { id: 'chicago', labelKey: 'styleChicago', render: chicago },
  { id: 'harvard', labelKey: 'styleHarvard', render: harvard },
];

export const getStyle = (id) =>
  CITATION_STYLES.find((s) => s.id === id) || CITATION_STYLES[0];
