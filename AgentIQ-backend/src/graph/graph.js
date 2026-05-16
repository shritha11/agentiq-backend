import { StateGraph, START, END } from "@langchain/langgraph";
import { plannerNode } from "./nodes/palnner.js";
import { researcherNode } from "./nodes/researcher.js";
import { generatorNode } from "./nodes/generator.js";
import { refinerNode } from "./nodes/refiner.js";
import { formatterNode } from "./nodes/formatter.js";
import { graphStateSchema } from "./state.js";

export function buildGraph() {
    const graph = new StateGraph({ channels: graphStateSchema })
    .addNode("planner", plannerNode)
    .addNode("researcher", researcherNode)
    .addNode("generator", generatorNode)
    .addNode("refiner", refinerNode)
    .addNode("formatter", formatterNode)
    .addEdge(START, "planner")
    .addEdge("planner", "researcher")
    .addEdge("researcher", "generator")
    .addEdge("generator", "refiner")
    .addEdge("refiner", "formatter")
    .addEdge("formatter", END);

    return graph.compile();
}
