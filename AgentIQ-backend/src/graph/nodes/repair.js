import { AzureChatOpenAI }
from "@langchain/openai";
import { langfuse } from "../../utils/langfuse.js";

const llm = new AzureChatOpenAI({
  azureOpenAIApiKey:
    process.env.AZURE_OPENAI_API_KEY,

  azureOpenAIApiInstanceName:
    process.env.AZURE_OPENAI_ENDPOINT,

  azureOpenAIApiDeploymentName:
    process.env
      .AZURE_OPENAI_DEPLOYMENT_NAME,

  azureOpenAIApiVersion:
    process.env.AZURE_OPENAI_API_VERSION,

  temperature: 0.2,

  maxTokens: 3000,
});

export async function repairNode(
  state
) {
  const {
    failedFiles,
    generatedFiles,
    brief,
  } = state;

  if (
    !failedFiles ||
    failedFiles.length === 0
  ) {
    return {
      generatedFiles,

      currentStep: "repair",

      steps: [
        "Repair: No repairs needed",
      ],
    };
  }

  const repairedFiles = {
    ...generatedFiles,
  };

  for (const filePath of failedFiles) {

    const span = langfuse.span({
  traceId: state.traceId,
  name: "repair",
});

    const response =
      await llm.invoke([
        {
          role: "system",

         content: `
You are a senior React debugging engineer.

Fix ALL issues preventing this file from running.

Check for:
- variable not defined
- missing constants (C, theme, tokens, config)
- missing imports
- missing React hooks
- JSX syntax issues
- invalid styles
- runtime errors
- broken icon imports

If code references C and C is missing,
recreate the C object using values from the business brief.

If lucide-react icons are used,
ensure imports exist.

Return ONLY raw React code.
No markdown.
No backticks.
Keep export default.

Verify all lucide-react imports exist.

If an icon is invalid:
- Graph → BarChart3
- Chart → TrendingUp
- Support → Headphones

Replace invalid icons with valid lucide-react icons.

Never return icons that do not exist in lucide-react.
`,
        },

        {
          role: "user",

          content: `
Repair this file:

${filePath}

Current code:

${generatedFiles[filePath]}

Business:

${JSON.stringify(brief, null, 2)}
`,
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

    repairedFiles[filePath] =
      response.content.trim();
  }

  return {
    generatedFiles:
      repairedFiles,

    websiteRaw:
      JSON.stringify({
        files: repairedFiles,
      }),

    currentStep: "repair",

    steps: [
      "Repair: Broken files repaired",
    ],
  };
}