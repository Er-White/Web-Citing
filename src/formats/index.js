import { toBibtex } from './bibtex.js';
import { toCslJson } from './csljson.js';
import { toEnw } from './enw.js';
import { toRis } from './ris.js';

// `ext` only feeds the download filename — see src/download.js for why the MIME
// type is not carried here.
export const EXPORT_FORMATS = [
  { id: 'ris', ext: 'ris', labelKey: 'formatRis', render: toRis },
  { id: 'enw', ext: 'enw', labelKey: 'formatEnw', render: toEnw },
  { id: 'bibtex', ext: 'bib', labelKey: 'formatBib', render: toBibtex },
  { id: 'csljson', ext: 'json', labelKey: 'formatCsl', render: toCslJson },
];

export const getFormat = (id) => EXPORT_FORMATS.find((f) => f.id === id) || EXPORT_FORMATS[0];
