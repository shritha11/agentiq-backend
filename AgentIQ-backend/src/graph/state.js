export const graphStateSchema = {
  userPrompt:       { value: null },
  uploadedImages:   { value: null }, // new state for uploaded images
  brief:            { value: null },
  researchContext: { value: (x, y) => y ?? x, default: () => null },

  // Website pipeline
  websiteRaw:       { value: null },
  websiteRefined:   { value: null },
  websiteFinal:     { value: null },

  // Pitch deck pipeline
  pitchdeckRaw:     { value: null },
  pitchdeckRefined: { value: null },
  pitchdeckFinal:   { value: null },

  // New file-by-file architecture
  projectStructure: { value: null },
  generationQueue:  { value: null },

  emit: { value: null },

  generatedFiles: {
    value: (prev, next) => {
      if (!prev) return next;
      if (!next) return prev;
      return { ...prev, ...next }; // merge — never replace
    },
    default: () => ({}),
  },

  failedFiles:  { value: null },
  currentStep:  { value: null },

  // In graphStateSchema, add:
messages: { 
  value: (a, b) => b ?? a, 
  default: () => [] 
},
contextSummary: { 
  value: (a, b) => b ?? a, 
  default: () => null 
},

isPitchdeckEdit: {
  value: (a,b) => b ?? a, 
  default: () => false,
},
  // Steps uses append reducer — each node adds to the list
  steps: {
    value: (prev, next) => [...(prev ?? []), ...next],
    default: () => [],
  },

  error: { value: null },

  traceId: { value: null },

  // In your state schema / annotation
sectionContracts: {
  value: (a, b) => ({ ...a, ...b }),
  default: () => ({})
}
};