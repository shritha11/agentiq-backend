import { Router } from "express";
import { langfuse } from "../utils/langfuse.js";
import { v4 as uuidv4 } from "uuid";
import { buildGraph } from "../graph/graph.js";
import auth from "../middleware/auth.js";
import { db } from "../config/firebase.js";
import multer from "multer";
import cloudinary from "../utils/cloudinary.js";
import streamifier from "streamifier";
import { getUnsplashImages } from "../utils/unsplash.js";
import { AzureChatOpenAI } from "@langchain/openai";

const classifierLLM = new AzureChatOpenAI({
  azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
  azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_ENDPOINT,
  azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
  temperature: 0,
  maxTokens: 20,
});

const upload = multer({
  storage: multer.memoryStorage(),
});
const router = Router();
const jobs    = new Map();
const clients = new Map();

router.post("/chats/:sessionId/generate", auth, upload.array("images"), async (req, res) => {
  const prompt  = req.body.prompt;
  const { sessionId } = req.params;

  const normalizedPrompt =
  prompt.trim().toLowerCase();

const greetings = [
  "hi",
  "hii",
  "hello",
  "hey",
  "heyy",
  "yo",
  "sup",
  "good morning",
  "good afternoon",
  "good evening"
];

console.log("GREETING CHECK RUNNING");
console.log("PROMPT:", prompt);
console.log("NORMALIZED:", normalizedPrompt);

if (greetings.includes(normalizedPrompt)) {
  return res.json({
    unsupported: true,
    message:
      "Hi! I'm AgentIQ. I specialize in generating websites and investor pitch decks. Tell me what you'd like to build and I'll create it for you."
  });
}

  const classifierResponse = await classifierLLM.invoke([
  {
    role: "system",
    // In generate.js, replace the classifier system prompt content with:
content: `You classify user requests for AgentIQ.

Return ONLY one word: WEBSITE, PITCHDECK, BOTH, or OTHER

WEBSITE examples:
"Build a fintech website" -> WEBSITE
"Create a startup pitch deck" -> PITCHDECK  
"change the font in the pitch deck" -> PITCHDECK
"make the font bigger in pitch deck" -> PITCHDECK
"make the font smaller in pitch deck" -> PITCHDECK
"update slide colors" -> PITCHDECK
"change the pitch deck name" -> PITCHDECK
"make the deck more minimal" -> PITCHDECK
"Create a startup pitch deck" -> PITCHDECK
"make the navbar blue" -> WEBSITE
"change the logo color to red" -> WEBSITE
"change the color of the GreenNav logo to yellow" -> WEBSITE
"update the footer" -> WEBSITE
"make the hero text bigger" -> WEBSITE
"remove the pricing section" -> WEBSITE
"add a testimonials section" -> WEBSITE
"use unsplash images" -> WEBSITE
any edit, change, update, modify request about a website element -> WEBSITE

OTHER examples:
"Hi" -> OTHER
"How are you?" -> OTHER
"Who won IPL?" -> OTHER
"What is React?" -> OTHER`
  },
  {
    role: "user",
    content: prompt,
  },
]);

const intent = classifierResponse.content.trim().toUpperCase();
console.log("[Generate Intent]:", intent);

if (intent === "OTHER") {
  return res.json({
    unsupported: true,
    message: "Hi! I'm AgentIQ. I specialize in generating websites and investor pitch decks. Tell me what you'd like to build and I'll create it for you."
  });
}


  console.log("FULL BODY", req.body);
  console.log("SESSION RAW:", req.body.sessionId);
  console.log("SESSION TYPE", typeof req.body.sessionId);
 // const sessionId = req.body.sessionId;
 
  const images = req.files || [];
  let imageUrls = [];

  const imageMode = req.body.imageMode || "none";

  console.log("IMAGE MODE:", imageMode);
  console.log("PROMPT:", prompt);

  if(images.length > 0) {

    imageUrls =
      await Promise.all(
        images.map(uploadToCloudinary)
      );

}
else if(imageMode === "unsplash") {

    imageUrls =
      await getUnsplashImages(
        prompt,
        5
      );

      console.log("UNSPLASH URLS:", imageUrls);
}
else {

    imageUrls = [];
}

console.log("FINAL IMAGE URLS:", imageUrls);
  

console.log("Cloudinary URLs:", imageUrls);
  console.log(req.files);
 

   const messages = JSON.parse(req.body.messages || "[]");
  let existingFiles = {};
  console.log("LOOKING FOR SESSION:", sessionId);

if (sessionId && !sessionId.startsWith("temp")) {
  const chatDoc = await db
    .collection("chats")
    .doc(sessionId)
    .get();

  console.log("CHAT EXISTS", chatDoc.exists);

  if (chatDoc.exists) {
    existingFiles =
      chatDoc.data()?.response?.website?.files || {};

    console.log(
      "LOADED EXISTING FILES:",
      Object.keys(existingFiles)
    );
  }
} 
 if (!prompt) return res.status(400).json({ error: "prompt is required" });


  const jobId = uuidv4();
  jobs.set(jobId, { status: "pending", steps: [], result: null });
  res.json({ jobId });
  runGraph(jobId, prompt, req.user.userId, imageUrls, messages, sessionId, existingFiles);
});

router.get("/stream/:jobId", (req, res) => {
  const { jobId } = req.params;

  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  clients.set(jobId, res);

  // Replay existing steps
  const job = jobs.get(jobId);
  if (job?.steps?.length > 0) {
    job.steps.forEach((step) => {
      res.write(`data: ${JSON.stringify({ type: "step", message: step })}\n\n`);
    });
  }

  if (job?.status === "done") {
    res.write(`data: ${JSON.stringify({ type: "done", website: job.result?.website, pitchdeck: job.result?.pitchdeck })}\n\n`);
    res.end();
    clients.delete(jobId);
  }

  req.on("close", () => clients.delete(jobId));
});

async function uploadToCloudinary(file) {
  return new Promise((resolve, reject) => {

    const uploadStream =
      cloudinary.uploader.upload_stream(
        {
          folder: "agentiq",
        },
        (error, result) => {

          if (error)
            return reject(error);

          resolve(result.secure_url);
        }
      );

    streamifier
      .createReadStream(file.buffer)
      .pipe(uploadStream);
  });
}

async function runGraph(jobId, prompt, userId, imageUrls = [], messages = [], sessionId, existingFiles = {}) {
  const graph = buildGraph();
  const trace = langfuse.trace({
  name: "website-generation",
  userId,
  sessionId: sessionId || "new-session",
  input: prompt,
});

let finalSessionId = sessionId;

console.log("TRACE:", trace);

  // emit helper
  function emit(type, payload) {
    const job = jobs.get(jobId);
    if (!job) return;
    if (type === "step") job.steps.push(payload.message);
    const client = clients.get(jobId);
    if (client) {
      client.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
    }
  }

  // THE FIX: declare these OUTSIDE the loop so catch block can access them
  let latestWebsite   = null;
  let latestPitchdeck = null;

  try {
    const initialState = {
      userPrompt:      prompt,
      messages,
      sessionId,
      uploadedImages: imageUrls,
      brief:           null,
      researchContext: null,
      websiteRaw:      null,
      websiteRefined:  null,
      websiteFinal:    null,
      pitchdeckRaw:    null,
      pitchdeckRefined:null,
      pitchdeckFinal:  null,
      projectStructure:null,
      generationQueue: null,
      generatedFiles:  existingFiles,
      failedFiles:     null,
      currentStep:     null,
      steps:           [],
      error:           null,
      emit,             // pass emit into graph state so fileGeneratorNode can use it
      traceId: trace.id,
    };

    const stream = await graph.stream(initialState, { streamMode: "updates" });

    for await (const chunk of stream) {
      const nodeName   = Object.keys(chunk)[0];
      const nodeOutput = chunk[nodeName];

      // Forward steps 
      if (nodeOutput?.steps?.length) {
        for (const step of nodeOutput.steps) {
          emit("step", { message: step });
        }
      }

      // Forward current file being built 
      if (nodeOutput?.currentFile) {
        emit("current_file", { path: nodeOutput.currentFile });
      }

      // Forward narration 
      if (nodeOutput?.narration) {
        emit("narration", { message: nodeOutput.narration });
      }

      // Forward each generated file as it arrives
      // This is what makes the code panel update in real time
      if (nodeOutput?.generatedFiles) {
        for (const [path, code] of Object.entries(nodeOutput.generatedFiles)) {
          emit("file_chunk", { path, code });
        }
      }

      // Capture final outputs 
      if (nodeOutput?.websiteFinal)   latestWebsite   = nodeOutput.websiteFinal;
      if (nodeOutput?.pitchdeckFinal) latestPitchdeck = nodeOutput.pitchdeckFinal;

      console.log(`[${nodeName}]`, {
        steps: nodeOutput?.steps?.length || 0,
        files: nodeOutput?.generatedFiles ? Object.keys(nodeOutput.generatedFiles).length : 0,
        hasWebsite: !!nodeOutput?.websiteFinal,
        hasDeck: !!nodeOutput?.pitchdeckFinal,
      });
    }

    // Get full final state via invoke 
    // stream() only gives us per-node deltas — invoke() gives the merged final state
    // const finalState = await graph.invoke(initialState);
    // if (finalState.websiteFinal)   latestWebsite   = finalState.websiteFinal;
    // if (finalState.pitchdeckFinal) latestPitchdeck = finalState.pitchdeckFinal;

    const job = jobs.get(jobId);
    if (job) {
      job.status = "done";
      job.result = { website: latestWebsite, pitchdeck: latestPitchdeck };
    }

    const title = prompt.split(" ").slice(0,3).join(" ");
    console.log("MESSAGES COUNT:", messages.length);
console.log("MESSAGES:", messages);
console.log("SESSION ID BEFORE FIRESTORE", sessionId );
console.log("TYPE", typeof sessionId);

let finalSessionId = sessionId;

if(!finalSessionId || finalSessionId.startsWith("temp")) {
  finalSessionId = uuidv4();
}
    await db.collection("chats").doc(finalSessionId).set({
      sessionId: finalSessionId,
      userId,
      prompt,
      title,

      messages, 

      response: {
        website: latestWebsite,
        pitchdeck: latestPitchdeck,
      }, 
      updatedAt: new Date(),
    }, {
      merge: true
    });

    await langfuse.flushAsync();

    emit("done", { 
      sessionId: finalSessionId,
      website: latestWebsite, 
      pitchdeck: latestPitchdeck });

    const client = clients.get(jobId);
    if (client) { client.end(); clients.delete(jobId); }

  } catch (err) {
  console.error("Graph error:", err);

  const job = jobs.get(jobId);

  if (job) {
    job.status = "error";

    job.result = {
      error: err.message || "Something went wrong",
    };
  }

  emit("error", {
    message: err.message || "Something went wrong",
  });

  await langfuse.flushAsync();

  const client = clients.get(jobId);

  if (client) {
    client.end();
    clients.delete(jobId);
  }
}
}

export default router;