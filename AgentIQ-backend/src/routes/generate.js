import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { buildGraph } from "../graph/graph.js";

const router = Router();

//in memory job store use redis for production
const jobs = new Map();
//stores SSE connection. SSE clients: jobId -> res
const clients = new Map();

//POST - /api/generate - Starts generation
router.post("/generate", async (req, res) => {
    const {prompt } = req.body;

    if(!prompt) {
        return res.status(400).json({error: "prompt is required"});
    }

    const jobId = uuidv4();
    jobs.set(jobId, { status: "pending", steps: []});  //save job, stores initial job state

    res.json({jobId});

    //run graph async dont await here bcz frontend should instantly get jobid, RunGraph starts ai generation in the background
    runGraph(jobId, prompt);
});

//GET - /api/stream/:jobId, SSE stream route
router.get("/stream/:jobId", (req, res) => { //creates LIVE connection, frontend listens continuously
    const {jobId } = req.params;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.flushHeaders(); //immediately starts connection

    clients.set(jobId, res); //save client connection

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

    req.on("close", () => { //if user closes tab then remove SSE connection
        clients.delete(jobId);
    });
});

async function runGraph(jobId, prompt) {
    const graph = buildGraph();

    function emit(type, payload) {  //customer helper function used to save steps, and send updates to frontend
        const job = jobs.get(jobId);
        if (!job) return;

        if (type === "step") {
            job.steps.push(payload.message);  //stores step history
        }

        const client = clients.get(jobId);
        if (client) {
            client.write(`data: ${JSON.stringify({ type, ...payload})}\n\n`);  //used to send live updates
        }
    }

    try {
        emit("step", { message: "Planner: Analyzing your idea..."});

        const initialState = {
            userPrompt: prompt,
            brief: null,
            researchContext: null,
            websiteRaw: null, 
            websiteRefined: null,
            websiteFinal: null,
            pitchdeckRaw: null,
            pitchdeckRefined: null, 
            pitchdeckFinal: null,
            currentStep: null,
            steps: [],
            error: null,
        };

        const stream = await graph.stream(initialState, { //GRAPH STREAMING , runs graph in stream mode, this gives no by node updates 
            streamMode: "updates",
        });

        const stepMessages = {
            planner: "Planner: Brief structured...",
            researcher: "Researcher: Gathering market context...",
            websiteGenerator: "Website: Generating UI...",
            websiteRefiner: "Website: Refining experience...",
            websiteFormatter: "Website: Packaging preview...",

            pitchdeckGenerator: "Pitchdeck: Creating slides...",
            pitchdeckRefiner: "Pitchdeck: Improving storytelling...",
            pitchdeckFormatter: "Pitchdeck: Packaging slides...",
        };

        for await (const chunk of stream) {
            if (chunk.websiteGenerator?.websiteRaw) {
             emit("website_chunk", {
               chunk: chunk.websiteGenerator.websiteRaw
            });
        }
            if (chunk.pitchdeckGenerator?.pitchdeckRaw) {
             emit("pitchdeck_chunk", {
                chunk: chunk.pitchdeckGenerator.pitchdeckRaw
            });
        }
            const nodeName = Object.keys(chunk)[0];
            if (stepMessages[nodeName]) {
                emit("step", { message: stepMessages[nodeName]});
            }
        }


        const finalState = await graph.invoke(initialState);

        const job = jobs.get(jobId);
        if(job) {
            job.status = "done";
            job.result = {
                website: finalState.websiteFinal, 
                pitchdeck: finalState.pitchdeckFinal,
            }
        };

        emit("done", { 
             website: finalState.websiteFinal,
             pitchdeck: finalState.pitchdeckFinal,
        });

        const client = clients.get(jobId);
        if(client) {
            client.end(); //close SSE stream after completion
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
