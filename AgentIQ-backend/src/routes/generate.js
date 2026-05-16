import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { buildGraph } from "../graph/graph.js";

const router = Router();

//in memory job store use redis for production
const jobs = new Map();
//SSE clients: jobId -> res
const clients = new Map();

//POST - /api/generate
router.post("/generate", async (req, res) => {
    const {prompt, outputType } = req.body;

    if(!prompt) {
        return res.status(400).json({error: "prompt is required"});
    }

    const jobId = uuidv4();
    jobs.set(jobId, { status: "pending", steps: []});

    res.json({jobId});

    //run graph async dont await here
    runGraph(jobId, prompt, outputType || "website");
});

//GET - /api/stream/:jobId
router.get("/stream/:jobId", (req, res) => {
    const {jobId } = req.params;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.flushHeaders();

    clients.set(jobId, res);

    //Send existing steps if job already started

    const job = jobs.get(jobId);
    if(job?.steps?.length > 0) {
        job.steps.forEach((step) => {
            res.write(`data: ${JSON.stringify({type: "step", message: step})}\n\n`);
        });
    }

    if(job?.status === "done") {
        res.write(`data: ${JSON.stringify({type: "done", result: job.result})}\n\n`);
        res.end();
        clients.delete(jobId);
    }

    req.on("close", () => {
        clients.delete(jobId);
    });
});

async function runGraph(jobId, prompt, outputType) {
    const graph = buildGraph();

    function emit(type, payload) {
        const job = jobs.get(jobId);
        if (!job) return;

        if (type === "step") {
            job.steps.push(payload.message);
        }

        const client = clients.get(jobId);
        if (client) {
            client.write(`data: ${JSON.stringify({ type, ...payload})}\n\n`);
        }
    }

    try {
        emit("step", { message: "Planner: Analyzing your idea..."});

        const initialState = {
            userPrompt: prompt,
            outputType,
            brief: null,
            researchContext: null,
            rawOutput: null,
            refinedOutput: null,
            finalOutput: null,
            currentStep: null,
            steps: [],
            error: null,
        };

        const stream = await graph.stream(initialState, {
            streamMode: "updates",
        });

        const stepMessages = {
            planner: "Planner: Brief structured...",
            researcher: "Researcher: Gathering market context...",
            generator: "Generator: Building your product...",
            refiner: "Refiner: Polishing the output..",
            formatter: "Formatter: Packaging result..",
        };

        for await (const chunk of stream) {
            const nodeName = Object.keys(chunk)[0];
            if (stepMessages[nodeName]) {
                emit("step", { message: stepMessages[nodeName]});
            }
        }


        const finalState = await graph.invoke(initialState);

        const job = jobs.get(jobId);
        if(job) {
            job.status = "done",
            job.result = finalState.finalOutput;
        };

        emit("done", { result: finalState.finalOutput});

        const client = clients.get(jobId);
        if(client) {
            client.end();
            clients.delete(jobId);
        }
    } catch(err) {
        console.log("Graph error", err);
        const job = jobs.get(jobId);
        if (job) job.status = "error";

        emit("error", {message: err.message || "Something went wrong"});

        const client = clients.get(jobId);
        if(client) {
            client.end();
            clients.delete(jobId);
        }
    }
}

export default router;
