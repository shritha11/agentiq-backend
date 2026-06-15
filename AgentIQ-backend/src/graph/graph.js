import {
  StateGraph,
  START,
  END,
} from "@langchain/langgraph";

import { AzureChatOpenAI } from "@langchain/openai";

import { plannerNode } from "./nodes/planner.js";
import { researcherNode } from "./nodes/researcher.js";
import { architecturePlannerNode } from "./nodes/architecturePlanner.js";

import { fileQueueBuilderNode } from "./nodes/fileQueueBuilder.js";

import { fileGeneratorNode } from "./nodes/fileGeneratorNode.js";

import { validatorNode } from "./nodes/validator.js";

import { repairNode } from "./nodes/repair.js";

// import {
//   websiteGeneratorNode,
// } from "./nodes/websiteGenerator.js";

// import {
//   websiteRefinerNode,
// } from "./nodes/websiteRefiner.js";

import {
  websiteFormatterNode,
} from "./nodes/websiteFormatter.js";

import {
  pitchdeckGenerator,
} from "./nodes/pitchdeckGenerator.js";

import {
  pitchdeckRefiner,
} from "./nodes/pitchdeckRefiner.js";

import {
  pitchdeckFormatter,
} from "./nodes/pitchdeckFormatter.js";

import { graphStateSchema } from "./state.js";

const summarizerLLM = new AzureChatOpenAI({
  azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
  azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_ENDPOINT,
  azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
  temperature: 0.1,
  maxTokens: 500,
});

const contextSummarizerNode = async (state) => {
  const { messages, userPrompt, generatedFiles } = state;

  if (!messages || messages.length <= 2){
    return { contextSummary: null };
  }

  const fileList = Object.keys(generatedFiles || {}).join(",");

  const response = await summarizerLLM.invoke([
    {
      role: "system",
      content: `Summarize conversation context for a website generator in max 80 words.
Cover: 1) what was built (style, colors, sections) 2) what user wants changed now 3) what must stay same.
Be specific. No filler.`
    }, 
    {
      role: "user", 
      content: `Conversation:\n${messages.map(m => `${m.role}: ${m.content}`).join("\n")}
Files built: ${fileList || "none"}
Current request: ${userPrompt}`
    }
  ]);

  console.log("[contextSummary]:", response.content);
  return { contextSummary: response.content };
};

export function buildGraph() {
  const graph = new StateGraph({
    channels: graphStateSchema,
  });

  // NODES

  graph.addNode("contextSummarizer", contextSummarizerNode);

  graph.addNode(
    "planner",
    plannerNode
  );

  graph.addNode(
    "researcher",
    researcherNode
  );

  // graph.addNode(
  //   "websiteGenerator",
  //   websiteGeneratorNode
  // );

  // graph.addNode(
  //   "websiteRefiner",
  //   websiteRefinerNode
  // );

  graph.addNode(
    "websiteFormatter",
    websiteFormatterNode
  );

  graph.addNode(
    "pitchdeckGenerator",
    pitchdeckGenerator
  );

  graph.addNode(
    "pitchdeckRefiner",
    pitchdeckRefiner
  );

  graph.addNode(
    "pitchdeckFormatter",
    pitchdeckFormatter
  );

  graph.addNode(
  "architecturePlanner",
  architecturePlannerNode
);

graph.addNode(
  "queueBuilder",
  fileQueueBuilderNode
);

graph.addNode(
  "fileGenerator",
  fileGeneratorNode
);

graph.addNode(
  "validator",
  validatorNode
);

graph.addNode(
  "repair",
  repairNode
);

  // EDGES
  graph.addEdge(
    START,
    "contextSummarizer"
  );

  graph.addEdge(
    "contextSummarizer", "planner"
  );

  graph.addEdge(
    "planner",
    "researcher"
  );

  // graph.addEdge(
  //   "researcher",
  //   "websiteGenerator"
  // );

  // graph.addEdge(
  //   "websiteGenerator",
  //   "websiteRefiner"
  // );

  // graph.addEdge(
  //   "websiteRefiner",
  //   "websiteFormatter"
  // );


  graph.addEdge(
  "researcher",
  "architecturePlanner"
);

graph.addEdge(
  "architecturePlanner",
  "queueBuilder"
);

graph.addEdge(
  "queueBuilder",
  "fileGenerator"
);

graph.addEdge(
  "fileGenerator",
  "validator"
);

graph.addEdge(
  "validator",
  "repair"
);

graph.addEdge(
  "repair",
  "websiteFormatter"
); 

  graph.addEdge(
    "websiteFormatter",
    "pitchdeckGenerator"
  );

  graph.addEdge(
    "pitchdeckGenerator",
    "pitchdeckRefiner"
  );

  graph.addEdge(
    "pitchdeckRefiner",
    "pitchdeckFormatter"
  );

  graph.addEdge("pitchdeckFormatter",END);

  return graph.compile();
}