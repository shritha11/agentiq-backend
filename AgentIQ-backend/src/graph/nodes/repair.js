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
You are a React repair agent.

Fix broken React files.

RULES:
- Return ONLY raw code
- No markdown
- No backticks
- Keep imports valid
- Export default properly
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