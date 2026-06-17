import { AzureChatOpenAI} from "@langchain/openai";
import { langfuse } from "../../utils/langfuse.js";

const llm = new AzureChatOpenAI({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_ENDPOINT,
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    temperature: 0.9,
    maxTokens: 6000,
});

export async function pitchdeckRefiner(state) {

    const { pitchdeckRaw, brief, isPitchdeckEdit, userPrompt } = state;

    let pitchdeckRefined = pitchdeckRaw;

     // In pitchdeckRefiner.js, add this at the top:
if (!pitchdeckRaw) {
  return { pitchdeckRefined: null, currentStep: "pitchdeckRefiner", steps: [] };
}
const slides = Array.isArray(pitchdeckRaw) ? pitchdeckRaw : JSON.parse(pitchdeckRaw);

     const span = langfuse.span({
      traceId: state.traceId,
      name: "pitchdeckRefiner",
     });

     const response = await llm.invoke([
                {
                    role: "system",
                    content: `You are a world-class pitch deck designer and startup storyteller.

                    ${isPitchdeckEdit ? `
                        IMPORTANT: The user has requested a specific change to this pitch deck.
Apply ONLY the requested change. Keep everything else identical.
Do NOT redesign the deck.
` : `

                 Improve:
                - storytelling
                - visual hierarchy
                - investor psychology
                - founder confidence
                - presentation pacing
                - cinematic structure
                - slide variation
                - presentation flow

                Make the deck feel inspired by:
                - Airbnb seed deck
                - Stripe
                - Shopify
                - Pitch Deck Hunt
                - Slidebean
                - YC startups

                Return ONLY valid JSON array.
                No markdown.
`},
                    ` }, {
                    role: "user", 
                    content: `${isPitchdeckEdit 
        ? `Apply this change to the pitch deck: "${userPrompt}"`
        : `Improve these pitch deck slides for ${brief?.businessName || "this company"}.`}
Current slides:
${JSON.stringify(slides, null, 2)}
Return improved JSON array with same structure.`,
    },
  ]);


            span.update({
  metadata: {
    inputTokens: response.usage_metadata?.input_tokens,
    outputTokens: response.usage_metadata?.output_tokens,
    totalTokens: response.usage_metadata?.total_tokens,
  },
});

span.end();

            const text = response.content.trim().replace(/```json|```/g, "").trim();
            try {
                pitchdeckRefined = JSON.parse(text);
            } catch {
                pitchdeckRefined = pitchdeckRaw; //If there is invalid JSON
            }
    

    return {
    pitchdeckRefined,
    currentStep: "pitchdeckRefiner", 
    steps: [" Pitchdeck refined"],
  };
}
