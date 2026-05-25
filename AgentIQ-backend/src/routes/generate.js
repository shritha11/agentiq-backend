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

async function runGraph(jobId, prompt) {
  const graph = buildGraph();

  // ── emit helper ──────────────────────────────────────────────────────────
  function emit(type, payload) {
    const job = jobs.get(jobId);
    if (!job) return;
    if (type === "step") job.steps.push(payload.message);
    const client = clients.get(jobId);
    if (client) {
      client.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
    }
  }

  // ── THE FIX: declare these OUTSIDE the loop so catch block can access them
  let latestWebsite   = null;
  let latestPitchdeck = null;

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
      emit,             // pass emit into graph state so fileGeneratorNode can use it
    };

    const stream = await graph.stream(initialState, { streamMode: "updates" });

    for await (const chunk of stream) {
      const nodeName   = Object.keys(chunk)[0];
      const nodeOutput = chunk[nodeName];

      // ── Forward steps ──────────────────────────────────────────────────
      if (nodeOutput?.steps?.length) {
        for (const step of nodeOutput.steps) {
          emit("step", { message: step });
        }
      }

      // ── Forward current file being built ──────────────────────────────
      if (nodeOutput?.currentFile) {
        emit("current_file", { path: nodeOutput.currentFile });
      }

      // ── Forward narration ─────────────────────────────────────────────
      if (nodeOutput?.narration) {
        emit("narration", { message: nodeOutput.narration });
      }

      // ── Forward each generated file as it arrives ─────────────────────
      // This is what makes the code panel update in real time
      if (nodeOutput?.generatedFiles) {
        for (const [path, code] of Object.entries(nodeOutput.generatedFiles)) {
          emit("file_chunk", { path, code });
        }
      }

      // ── Capture final outputs ─────────────────────────────────────────
      if (nodeOutput?.websiteFinal)   latestWebsite   = nodeOutput.websiteFinal;
      if (nodeOutput?.pitchdeckFinal) latestPitchdeck = nodeOutput.pitchdeckFinal;

      console.log(`[${nodeName}]`, {
        steps: nodeOutput?.steps?.length || 0,
        files: nodeOutput?.generatedFiles ? Object.keys(nodeOutput.generatedFiles).length : 0,
        hasWebsite: !!nodeOutput?.websiteFinal,
        hasDeck: !!nodeOutput?.pitchdeckFinal,
      });
    }

    // ── Get full final state via invoke ───────────────────────────────────
    // stream() only gives us per-node deltas — invoke() gives the merged final state
    const finalState = await graph.invoke(initialState);
    if (finalState.websiteFinal)   latestWebsite   = finalState.websiteFinal;
    if (finalState.pitchdeckFinal) latestPitchdeck = finalState.pitchdeckFinal;

    const job = jobs.get(jobId);
    if (job) {
      job.status = "done";
      job.result = { website: latestWebsite, pitchdeck: latestPitchdeck };
    }

    emit("done", { website: latestWebsite, pitchdeck: latestPitchdeck });

    const client = clients.get(jobId);
    if (client) { client.end(); clients.delete(jobId); }

  } catch (err) {
    console.error("Graph error:", err);
    const job = jobs.get(jobId);
    if (job) {
      job.status = "done";
      job.result = { website: latestWebsite, pitchdeck: latestPitchdeck };
    }

    // Still emit done with whatever we have — don't leave frontend hanging
    emit("done", { website: latestWebsite, pitchdeck: latestPitchdeck });
    emit("error", { message: err.message || "Something went wrong" });

    const client = clients.get(jobId);
    if (client) { client.end(); clients.delete(jobId); }
  }
}

export default router;
