export const projectFormats = {
  case: { type: 'text/html', label: 'Case study', action: 'read case study' },
  project: { type: 'text/html', label: 'Project', action: 'view project' },
} as const;

export type ProjectFormat = keyof typeof projectFormats;
