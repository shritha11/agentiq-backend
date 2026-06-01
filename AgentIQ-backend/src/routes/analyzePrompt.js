// src/routes/analyzePrompt.js
import { Router } from "express";
import { AzureChatOpenAI } from "@langchain/openai";
import auth from "../middleware/auth.js";

const router = Router();

const llm = new AzureChatOpenAI({
  azureOpenAIApiKey:            process.env.AZURE_OPENAI_API_KEY,
  azureOpenAIApiInstanceName:   process.env.AZURE_OPENAI_ENDPOINT,
  azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  azureOpenAIApiVersion:        process.env.AZURE_OPENAI_API_VERSION,
  temperature: 0.4,
  maxTokens: 1200,
});

router.post("/analyze-prompt", auth, async (req, res) => {
  try {
    const { prompt } = req.body;

    const response = await llm.invoke([
      {
        role: "system",
        content: `You are an elite AI creative director for a premium website builder.

Your job is to determine whether the user's prompt is TOO VAGUE.

A prompt is considered GOOD ENOUGH if it already includes:
- aesthetic or mood
- visual style
- layout direction
- references/inspirations
- tone
- branding direction

Examples of GOOD prompts:
- "Create a futuristic SaaS website with cinematic gradients inspired by Stripe and Linear"
- "Luxury fashion ecommerce website with editorial layouts and immersive scrolling"
- "Architecture studio website with serif typography and fullscreen photography"

For GOOD prompts return ONLY:

{
  "needsClarification": false,
  "questions": []
}

ONLY ask questions if the prompt is SHORT or VAGUE.

Examples of vague prompts:
- "build me a website"
- "make a cafe website"
- "portfolio site"
- "startup landing page"

For vague prompts:
- ask maximum 3 questions
- each question must have 4 options
- options should be short

Return ONLY valid JSON.`
      },
      {
        role: "user",
        content: `User prompt: "${prompt}"
Analyze whether this prompt needs clarification.

If it is detailed enough:
return:
{
  "needsClarification": false,
  "questions": []
}

If it is vague:
return clarification questions JSON.`,
      },
    ]);

    const text = response.content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(text);
    res.json(parsed);

  } catch (err) {
    console.error("analyzePrompt error:", err);
    // On error — skip clarification and generate directly
    res.json({ needsClarification: false, questions: [] });
  }
});

export default router;
