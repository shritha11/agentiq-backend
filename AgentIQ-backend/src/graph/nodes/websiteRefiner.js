import { AzureChatOpenAI} from "@langchain/openai";

const llm = new AzureChatOpenAI({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_ENDPOINT,
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    temperature: 0.6,
    maxTokens: 8000,
});

export async function websiteRefinerNode(state) {
    const { websiteRaw, brief } = state;

    let refinedOutput = websiteRaw;

        const response = await llm.invoke([
            {
            role: "system",
            content: `You are a senior React developer and design critic. 
            You review JSX code and improve it. 
            RULES:
            - The input is a complete function: function GeneratedSite() { ... }
            - Return the SAME structure — a complete function starting with: function GeneratedSite() {
            - No imports, no export default — just the function itself
            - Fix any issues: missing sections, weak styling, poor UX
            - Enhance visual quality: better gradients, shadows, spacing
            - Make sure all sections from the brief are present
            - Keep colors consistent with the brand palette
            - All content must stay real and specific — do not replace content with placeholders
            - Do NOT use React.useState, hooks, animations, or complex interactions. Use only clearn static JSX with inline styles. 
            - Do NOT generate Tailwind classes
            - Do NOT generate invalid JSX syntax
            - All inline styles must be valid Javascript objects. Never generate CSS pseudo selectors like :hover`,
            },

            { role: "user", 
              content: `Review and improve this JSX for a ${brief?.businessType || "business"} website.
              Brief: ${JSON.stringify(brief, null, 2)} 
              Current JSX: ${websiteRaw}
              Improve it. Fix visual weaknesses. Return only the improved JSX.
              Return only the improved function — start with: function GeneratedSite() {`,
            },
        ]);

        refinedOutput = response.content.trim().replace(/```jsx|```javascript|```js|```/g, "")
      .trim();
    

    return {
  websiteRefined: refinedOutput,
  currentStep: "websiteRefiner",
  steps: [" Website refined"],
}
}
