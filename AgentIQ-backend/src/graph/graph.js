import {
  StateGraph,
  START,
  END,
} from "@langchain/langgraph";

import { plannerNode } from "./nodes/planner.js";
import { researcherNode } from "./nodes/researcher.js";

import {
  websiteGeneratorNode,
} from "./nodes/websiteGenerator.js";

import {
  websiteRefinerNode,
} from "./nodes/websiteRefiner.js";

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

export function buildGraph() {
  const graph = new StateGraph({
    channels: graphStateSchema,
  });

  // NODES
  graph.addNode(
    "planner",
    plannerNode
  );

  graph.addNode(
    "researcher",
    researcherNode
  );

  graph.addNode(
    "websiteGenerator",
    websiteGeneratorNode
  );

  graph.addNode(
    "websiteRefiner",
    websiteRefinerNode
  );

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

  // EDGES
  graph.addEdge(
    START,
    "planner"
  );

  graph.addEdge(
    "planner",
    "researcher"
  );

  graph.addEdge(
    "researcher",
    "websiteGenerator"
  );

  graph.addEdge(
    "websiteGenerator",
    "websiteRefiner"
  );

  graph.addEdge(
    "websiteRefiner",
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