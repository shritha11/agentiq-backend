export const graphStateSchema = {
  userPrompt:       { value: null },
  brief:            { value: null },
  researchContext:  { value: null },

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

  // Steps uses append reducer — each node adds to the list
  steps: {
    value: (prev, next) => [...(prev ?? []), ...next],
    default: () => [],
  },

  error: { value: null },
};