import { AzureChatOpenAI } from "@langchain/openai";

const llm = new AzureChatOpenAI({
  azureOpenAIApiKey:            process.env.AZURE_OPENAI_API_KEY,
  azureOpenAIApiInstanceName:   process.env.AZURE_OPENAI_ENDPOINT,
  azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  azureOpenAIApiVersion:        process.env.AZURE_OPENAI_API_VERSION,
  temperature: 0.6,
  maxTokens: 12000,
});

export async function websiteRefinerNode(state) {
  const { websiteRaw, brief } = state;

  // Parse the generator's output
  let parsedProject;
  try {
    parsedProject = JSON.parse(websiteRaw);
  } catch {
    // Can't parse — pass through as-is
    return {
      websiteRefined: { files: {} },
      currentStep: "websiteRefiner",
      steps: ["✨ Website: Refined (parse failed — using generator output)"],
    };
  }

  // Check if we have real files to refine
  const fileCount = Object.keys(parsedProject?.files || {}).length;
  if (fileCount === 0) {
    return {
      websiteRefined: parsedProject,
      currentStep: "websiteRefiner",
      steps: ["✨ Website: Refined (no files to refine)"],
    };
  }

  try {
    const response = await llm.invoke([
      {
        role: "system",
        content: `You are a senior React architect. You receive a complete React project as JSON and improve it.

RULES:
- Return ONLY valid JSON with the same structure: { "files": { ... } }
- Keep ALL file paths exactly the same
- Do not remove any files
- Do not add Tailwind classes — use ONLY inline styles
- Do not add any CSS imports
- Improve: visual hierarchy, spacing, hover effects, color consistency, typography
- Add React.useState hover effects where missing
- Make sure all imports between files are correct
- Every component must still be complete — no skeletons, no empty returns
- Return ONLY the JSON. No markdown. No backticks.`,
      },
      {
        role: "user",
        content: `Improve this React project for ${brief?.businessName} (${brief?.businessType}).

${websiteRaw}

Return improved JSON with same file structure. All inline styles. No Tailwind.`,
      },
    ]);

    const text = response.content
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const refined = JSON.parse(text);

    if (refined?.files && typeof refined.files === "object") {
      return {
        websiteRefined: refined,
        currentStep: "websiteRefiner",
        steps: ["✨ Website: Refined and polished"],
      };
    } else {
      throw new Error("Refiner response missing files");
    }

  } catch (err) {
    console.warn("websiteRefiner failed:", err.message, "— using generator output");
    // Fall back to generator output — better than empty
    return {
      websiteRefined: parsedProject,
      currentStep: "websiteRefiner",
      steps: ["✨ Website: Refined (fallback to generator output)"],
    };
  }
}