// src/routes/analyzePrompt.js
import { Router } from "express";
import { AzureChatOpenAI } from "@langchain/openai";
import auth from "../middleware/auth.js";
import { CallbackHandler } from "@langfuse/langchain";
import { db } from "../config/firebase.js";

const router = Router({ mergeParams: true });

// Initialize the Langfuse LangChain handler
const langfuseHandler = new CallbackHandler();

// Your original LLM for prompt analysis
const llm = new AzureChatOpenAI({
  azureOpenAIApiKey:            process.env.AZURE_OPENAI_API_KEY,
  azureOpenAIApiInstanceName:   process.env.AZURE_OPENAI_ENDPOINT,
  azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  azureOpenAIApiVersion:        process.env.AZURE_OPENAI_API_VERSION,
  temperature: 0.4,
  maxTokens: 1200,
});

// A dedicated, high-speed classifier LLM with 0 temperature for absolute consistency
const classifierLLM = new AzureChatOpenAI({
  azureOpenAIApiKey:            process.env.AZURE_OPENAI_API_KEY,
  azureOpenAIApiInstanceName:   process.env.AZURE_OPENAI_ENDPOINT,
  azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  azureOpenAIApiVersion:        process.env.AZURE_OPENAI_API_VERSION,
  temperature: 0, 
  maxTokens: 10,
});

router.post("/analyze-prompt", auth, async (req, res) => {
  try {
    const { prompt } = req.body;
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    // 1. RUN INTENT CLASSIFICATION FIRST
   const classifierResponse = await classifierLLM.invoke([
  {
    role: "system",
    content: `You are an elite intent classifier for AgentIQ, a platform that ONLY builds websites and investor pitch decks.
Your single job is to determine if the user wants to build a website, build a pitch deck, or do something else.

Evaluate the user's request and reply with exactly ONE word:
- WEBSITE (if they want to generate, create, design, or update a website/app UI, OR if they are providing follow-up setup directions like choosing images, selecting layout options, or saying "use unsplash images")
- PITCHDECK (if they want to create an investor deck, slide presentation, or business pitch, or provide configuration choices for it)
- BOTH (if they want both)
- OTHER (for greetings like "hi", casual chitchat, coding questions, general knowledge, math, emotional venting, or anything completely unrelated)

Examples:
"make the navbar blue" -> WEBSITE
"change the logo color to red" -> WEBSITE
"change the color of the button" -> WEBSITE
"make the hero text bigger" -> WEBSITE
"make a cafe site" -> WEBSITE
"use unsplash images" -> WEBSITE
"upload my own photos" -> WEBSITE
"continue without images" -> WEBSITE
"i need an investor presentation for my startup" -> PITCHDECK
"hi there" -> OTHER
"how do i write a binary search in dart?" -> OTHER
"any edit, change, update, modify request about a website element" -> WEBSITE

Reply with ONLY the uppercase word. No punctuation, no explanation.`
  },
  {
    role: "user",
    content: prompt
  }
]);

    const intent = classifierResponse.content.trim().toUpperCase();
    console.log(`[Intent Classification]: ${intent} for prompt: "${prompt}"`);

    // 2. INTERCEPT IF THE INTENT IS "OTHER"
    if (intent === "OTHER") {
      const fallbackMessage ="Hi! I'm AgentIQ. I specialize exclusively in architecting premium websites, and investor pitch decks. I'm afraid I can't help with general questions, chat, or tasks outside of building those, so what kind of project can we design together today?";

      try {
      const sessionToken = req.params.sessionId || "fallback-session";

      const chatRef = db.collection("chats").doc(sessionToken);


      await chatRef.set({
        userId,
        title: prompt.length > 25 ? `${prompt.substrings(0, 25)}...` : prompt,
        updatedAt: new Date(),
      }, { merge: true });

      await chatRef.collection("messages").add({
        role: "user", 
        content: prompt, 
        createdAt: new Date(),
      });

      await chatRef.collection("messages").add({
        role: "assistant",
        content: fallbackMessage,
        createdAt: new Date(),
      });

    } catch (dbError) {
      console.error("Failed to commit intercepted greeting to database", dbError);
    }

      return res.json({
        unsupported: true,
        needsClarification: false, // Tells the frontend to stop processing further steps
        message: fallbackMessage
      });
    }

    // 3. NORMAL FLOW: If it is a valid project prompt, proceed to your creative director check
    const response = await llm.invoke([
      {
        role: "system",
        content: `You are an elite AI creative director for a premium website builder.

IMPORTANT: If the user's prompt is an EDIT or CHANGE request 
(e.g. "make the navbar blue", "change the font", "update the hero"),
treat it as GOOD ENOUGH and return { "needsClarification": false } immediately.
Edit requests never need clarification.

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
For vague prompts return:

{
  "needsClarification": true,
  "message": "single question here"
}

Do NOT return options.
Do NOT return arrays.
Ask only ONE question at a time.

Examples of vague prompts:
- "build me a website"
- "make a cafe website"
- "portfolio site"
- "startup landing page"

For vague prompts ask ONLY ONE question.

The question must help determine:

1. visual style
2. audience
3. purpose

Examples:

User: "coffee website"

Return:
"What style should the coffee website have? Modern, luxury, cozy, minimalist, or something else?"

User: "portfolio"

Return:
"What kind of portfolio is this? Designer, developer, photographer, architect, etc.?"

User: "startup landing page"

Return:
"What industry is the startup in?"

Return ONLY valid JSON.`
      },
      {
        role: "user",
        content: `User prompt: "${prompt}"
If it is detailed enough:
return:
{
  "needsClarification": false
}

If it is vague:
return:
{
  "needsClarification": true,
  "message": "your question"
}`,
      },
    ], {
      callbacks: [langfuseHandler]
    });

    const text = response.content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(text);
    
    // Add default values if missing to keep frontend structures happy
    if (parsed.needsClarification === undefined) parsed.needsClarification = false;
    if (!parsed.questions) parsed.questions = [];
    
    res.json(parsed);

  } catch (err) {
    console.error("analyzePrompt error:", err);
    res.json({ needsClarification: false, questions: [] });
  }
});

export default router;