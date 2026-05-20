export const graphStateSchema = {

    userPrompt: { value: null},

    brief: { value: null }, //brief from plannerNode
    researchContext: { value: null }, //research results which we get from ResearcherNode
    websiteRaw: {value: null }, 
    websiteRefined: {value: null }, 
    websiteFinal: { value: null }, 

    pitchdeckRaw: { value: null }, 
    pitchdeckRefined: { value:null }, 
    pitchdeckFinal: { value: null },

    currentStep: { value: null},
    steps: {
        value: (prev, next) => [...(prev ?? []), ...next],
        default : () => []
    },
    error: {value: null},
};