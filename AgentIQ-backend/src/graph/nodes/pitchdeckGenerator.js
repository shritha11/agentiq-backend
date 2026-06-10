import { AzureChatOpenAI} from "@langchain/openai";
import { langfuse } from "../../utils/langfuse.js";

const llm = new AzureChatOpenAI({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_ENDPOINT,
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    temperature: 0.8,
    maxTokens: 10000,
});

export async function pitchdeckGenerator(state) {
  const {
  brief,
  researchContext,
  websiteFinal,
  uploadedImages = [],
} = state;

  let rawOutput = "";

  const span = langfuse.span({
  traceId: state.traceId,
  name: "pitchdeckGenerator",
});


    const response = await llm.invoke([
      {
        role: "system",
        content: `You are an expert pitch deck creator and business strategist.
Generate a premium investor-grade pitch deck inspired by:
- Slidebean
- Pitch Deck Hunt
- YC startups
- Airbnb
- Stripe
- Shopify
- Linear
- Apple keynote presentations

Avoid repetitive layouts.
Avoid generic startup decks.
Avoid same background gradients.

The deck must feel:
- cinematic
- visual
- believable
- founder-ready
- premium
- modern keynote quality


Avoid ultra-light backgrounds with white text.


Every slide must feel like it was designed by a senior startup designer.

Different slide types MUST use different:
- layouts
- typography
- spacing systems
- visual hierarchy
- backgrounds
- content density

Return ONLY valid JSON array, no markdown, no explanation.
Each slide must contain:

{
  "type": "cover | problem | solution | market | product | traction | team | ask",

  "layout":
    "editorial" |
    "split" |
    "image-hero" |
    "bento" |
    "stats" |
    "full-image" |
    "minimal" |
    "timeline" |
    "quote" |
    "comparison",

  "theme":
    "luxury" |
    "futuristic" |
    "minimal" |
    "bold" |
    "dark" |
    "investor",

  "title": "",
  "subtitle": "",

  "bullets": [],

  "metrics": [
    {
      "label": "",
      "value": ""
    }
  ],

  "image": "",

  "background":
    {
      "type": "gradient | image | solid",
      "value": ""
    },

  "accentColor": "",

  "alignment":
    "left" |
    "center" |
    "split",

  "visual":
    "dashboard" |
    "mockup" |
    "photo" |
    "illustration" |
    "chart"
}

For every slide requiring imagery, generate realistic high-quality Unsplash image URLs.

Examples:
https://images.unsplash.com/...
`,
      },
      {
        role: "user",
        content: `Create a 10-slide investor pitch deck for:

        UPLOADED IMAGES:
${uploadedImages.join("\n")}

If uploaded images exist:
- Use them throughout the deck.
- Do not generate Unsplash URLs.
- Reference uploaded images in image fields.

WEBSITE SUMMARY:
${JSON.stringify(brief, null, 2)}

WEBSITE JSX:
${websiteFinal?.code?.slice(0, 6000)}

Order: cover → problem → solution → market → product → traction → team → ask
Make it punchy, specific, investor-ready. Real numbers where possible.`,
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