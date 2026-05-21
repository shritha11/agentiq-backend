import { AzureChatOpenAI} from "@langchain/openai";

const llm = new AzureChatOpenAI({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_ENDPOINT,
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    temperature: 0.9,
    maxTokens: 6000,
});

export async function pitchdeckRefiner(state) {

    const { pitchdeckRaw, brief } = state;

    let pitchdeckRefined = pitchdeckRaw;

     const slides = Array.isArray(pitchdeckRaw) ? pitchdeckRaw : JSON.parse(pitchdeckRaw);

     const response = await llm.invoke([
                {
                    role: "system",
                    content: `You are a world-class pitch deck designer and startup storyteller.

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
`,
                }, {
                    role: "user", 
                    content: `Improve these pitch deck slides for ${brief?.businessname || "this company"}. 
                    Make bullets more punchy and specific. Ensure investor appeal. 
                    Current slides: 
                    ${JSON.stringify(slides, null, 2)}
                    Return improved JSON array with same structure.`,
                },
            ]);

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
