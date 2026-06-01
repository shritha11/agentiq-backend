import { Router } from "express";
import { AzureChatOpenAI } from "@langchain/openai";
import auth from "../middleware/auth.js";

const router = Router();

const llm = new AzureChatOpenAI({
  azureOpenAIApiKey:
    process.env.AZURE_OPENAI_API_KEY,

  azureOpenAIEndpoint:
    process.env.AZURE_OPENAI_ENDPOINT,

  azureOpenAIApiDeploymentName:
    process.env.AZURE_OPENAI_DEPLOYMENT_NAME,

  azureOpenAIApiVersion:
    process.env.AZURE_OPENAI_API_VERSION,

  temperature: 0.7,
  maxTokens: 1200,
});

router.post(
  "/enhance-prompt",
  auth,
  async (req, res) => {

    try {

      const { prompt } = req.body;

      const response =
        await llm.invoke([
          {
            role: "system",

            content: `
You are an elite AI creative strategist.

Transform vague website prompts into:
- highly detailed
- visually descriptive
- premium startup-quality prompts

Expand:
- aesthetic direction
- target audience
- motion style
- layout ideas
- branding tone
- interactions
- visual references
- typography style

Keep it concise but premium.

Do NOT explain.
Return ONLY the enhanced prompt.
`,
          },

          {
            role: "user",
            content: prompt,
          },
        ]);

      res.json({
        enhanced:
          response.content.trim(),
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Failed to enhance prompt",
      });
    }
  }
);

export default router;