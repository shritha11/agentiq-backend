import { AzureChatOpenAI} from "@langchain/openai";

const llm = new AzureChatOpenAI({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_ENDPOINT,
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    temperature: 0.6,
    maxTokens: 8000,
});

export async function pitchdeckFormatter(state) {
    const { pitchdeckRefined, brief} = state;
        const slides = Array.isArray(pitchdeckRefined) ? pitchdeckRefined : [];
    
    
return {
  pitchdeckFinal: {
    type: "pitchdeck",
    slides,
    brief,
  },

  currentStep: "pitchdeckFormatter",
  steps: [" Pitchdeck packaged"],
};
}