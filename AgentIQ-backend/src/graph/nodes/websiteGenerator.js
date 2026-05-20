import { AzureChatOpenAI} from "@langchain/openai";
import { BASE_SYSTEM_PROMPT } from "../prompts/website/baseSystemPrompt.js";
import { DESIGN_RULES } from "../prompts/website/designRules.js";
import { PREMIUM_REFERENCES } from "../prompts/website/premiumReferences.js";


const llm = new AzureChatOpenAI({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_ENDPOINT,
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    temperature: 0.6,
    maxTokens: 8000,
});

export async function websiteGeneratorNode(state) {
    const { brief, researchContext } = state;

    const colors = brief?.colorPalette || ["#7c3aed", "#06b6d4", "#0a0a0f"];
    const primary   = colors[0];
    const secondary = colors[1];
    const bgColor   = colors[2] || "#0a0a0f";


    const response = await llm.invoke([
      {
        role: "system",
        content: `
${BASE_SYSTEM_PROMPT} 

${DESIGN_RULES} 

${PREMIUM_REFERENCES}

PORTFOLIO PHILOSOPHY:
- prioritize mood
- typography
- storytelling
- visual identity
- editorial layouts
- cinematic sections
- atmosphere

Avoid:
- dashboard UI
- corporate SaaS aesthetics
- generic templates
- skill bars
- fake metrics

RULES:
- Return ONLY valid React component code
- No markdown
- No backticks
- Start with: export default function App() {
- Use inline styles only
- Build visually stunning modern layouts
- Use strong spacing and hierarchy
- Generate real sections with real content
`,
      },
      {
        role: "user",
        content: `Generate a stunning, Awwwards-quality React website.

BUSINESS BRIEF:
- Name: ${brief?.businessName || "The Business"}
- Type: ${brief?.businessType || "business"}
- Tagline: ${brief?.tagline || ""}
- Tone: ${brief?.tone || "modern and professional"}
- Audience: ${brief?.targetAudience || "general"}
- Key features: ${(brief?.keyFeatures || []).join(", ")}
- Sections: ${(brief?.sections || ["Hero", "About", "Services", "Contact"]).join(", ")}
- VERY IMPORTANT USER FACTS:
${JSON.stringify(brief, null, 2)}

Use ONLY these details.
Do not invent additional background information.

BRAND COLORS:
- Primary (accent): ${primary}
- Secondary: ${secondary}
- Background: ${bgColor}

MARKET RESEARCH — use this for real, specific content:
${researchContext || "Use your own knowledge for this business type."}

FINAL REMINDERS:
- Start with: export default function App() {
- No imports. No markdown. No triple backticks.
- Use React.useState not useState
- Replace every single [PLACEHOLDER] in the template with real content
- Build a real product mockup in the hero if it's a SaaS — not a gray box
- Every section must have real, specific content for THIS exact business
- Make it genuinely beautiful — the kind of site that wins Awwwards`,
      },
    ]);

    const websiteRaw = response.content.trim() .replace(/```jsx|```javascript|```js|```/g, "") .trim();

    return {
       websiteRaw, 
       currentStep: "websiteGenerator", 
       steps: [" Website draft created"],
    }
}