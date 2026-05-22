import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { buildGraph } from "../graph/graph.js";

const router = Router();
const jobs    = new Map();
const clients = new Map();

router.post("/generate", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt is required" });

  const jobId = uuidv4();
  jobs.set(jobId, { status: "pending", steps: [], result: null });
  res.json({ jobId });

  runGraph(jobId, prompt);
});

router.get("/stream/:jobId", (req, res) => {
  const { jobId } = req.params;

  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  clients.set(jobId, res);

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

async function runGraph(jobId, prompt) {
  const graph = buildGraph();

  function emit(type, payload) {
    const job = jobs.get(jobId);
    if (!job) return;

    if (type === "step") {
      job.steps.push(payload.message);
    }

    const client = clients.get(jobId);
    if (client) {
      client.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
    }
  }

  try {
    const initialState = {
      userPrompt:      prompt,
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
      generatedFiles:  {},
      failedFiles:     null,
      currentStep:     null,
      steps:           [],
      error:           null,
    };


    const stream = await graph.stream(initialState, {
      streamMode: "updates",
    });

    let lastStepCount = 0;

    for await (const chunk of stream) {
      const nodeName = Object.keys(chunk)[0];
      const nodeOutput = chunk[nodeName];

      if (nodeOutput?.steps && Array.isArray(nodeOutput.steps)) {
        for (const step of nodeOutput.steps) {
          emit("step", { message: step });
        }
        lastStepCount += nodeOutput.steps.length;
      }

      console.log(`Node: ${nodeName}`, {
        steps: nodeOutput?.steps,
        hasGeneratedFiles: !!nodeOutput?.generatedFiles,
        fileCount: nodeOutput?.generatedFiles ? Object.keys(nodeOutput.generatedFiles).length : 0,
      });
    }

    const finalState = await graph.invoke(initialState);

    console.log("Final state generatedFiles:", Object.keys(finalState.generatedFiles || {}));
    console.log("Final state websiteFinal:", !!finalState.websiteFinal);

    const job = jobs.get(jobId);
    if (job) {
      job.status = "done";
      job.result = {
        website:  finalState.websiteFinal,
        pitchdeck: finalState.pitchdeckFinal,
      };
    }

    emit("done", {
      website:  finalState.websiteFinal,
      pitchdeck: finalState.pitchdeckFinal,
    });

    const client = clients.get(jobId);
    if (client) { client.end(); clients.delete(jobId); }

  } catch (err) {
    console.error("Graph error:", err);
    const job = jobs.get(jobId);
    if (job) job.status = "error";

    emit("error", { message: err.message || "Something went wrong" });

    const client = clients.get(jobId);
    if (client) { client.end(); clients.delete(jobId); }
  }
}

export default router;