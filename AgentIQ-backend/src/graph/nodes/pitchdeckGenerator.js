import { AzureChatOpenAI} from "@langchain/openai";

const llm = new AzureChatOpenAI({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_ENDPOINT,
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    temperature: 0.6,
    maxTokens: 8000,
});

export async function pitchdeckGenerator(state) {
  const { brief, researchContext, websiteFinal} = state;

  let rawOutput = "";

    const response = await llm.invoke([
      {
        role: "system",
        content: `You are an expert pitch deck creator and business strategist.
Generate a complete pitch deck as a JSON array of slides.
Return ONLY valid JSON array, no markdown, no explanation.
Each slide: { "title": string, "subtitle": string, "bullets": string[], "emoji": string, "type": "cover"|"problem"|"solution"|"market"|"product"|"traction"|"team"|"ask" }`,
      },
      {
        role: "user",
        content: `Create a 10-slide investor pitch deck for:
WEBSITE SUMMARY:
${JSON.stringify(brief, null, 2)}

WEBSITE JSX:
${websiteFinal?.code?.slice(0, 6000)}

Order: cover → problem → solution → market → product → traction → team → ask
Make it punchy, specific, investor-ready. Real numbers where possible.`,
      },
    ]);

    const text = response.content.trim().replace(/```json|```/g, "").trim();
    try {
      rawOutput = JSON.parse(text);
    } catch {
      rawOutput= generateFallbackSlides(brief);
    }


  return {
    pitchdeckRaw: rawOutput,
    currentStep: "pitchdeckGenerator", 
    steps: [" Pitchdeck generated"],
  };
}