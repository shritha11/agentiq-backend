export const graphStateSchema = {

    userPrompt: { value: null},
    outputType: { value: null},

    brief: { value: null}, //brief from plannerNode
    researchContext: { value: null}, //research results which we get from ResearcherNode
    rawOutput: {value: null}, //Output we get from generator Node (its the raw output)
    refinedOutput: {value: null}, //Refined output from RefinerNode
    finalOutput: {value: null}, //the output which is sent to the frontend
    outputFormat: {value: null}, //whether in jsx or slides or pitchdeck

    currentStep: { value: null},
    steps: {
        value: (prev, next) => [...(prev ?? []), ...next],
        default : () => []
    },
    error: {value: null},
};