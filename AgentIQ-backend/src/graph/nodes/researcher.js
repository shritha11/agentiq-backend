// Uses tavily to search for real world context, competitors, and inspiration
import { AzureChatOpenAI } from "@langchain/openai";
import { performWebSearch } from "../../tools/tavilySearch.js";// FIXED: Added .js extension for ES modules if needed

const llm = new AzureChatOpenAI({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_ENDPOINT, // FIXED: standard key name mapping variation check
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    temperature: 0.3,
    maxTokens: 2000,
});

export async function researcherNode(state, config) {
    const { userPrompt, brief } = state;

    if (state.emit) {
        state.emit("narration", { 
            message: `Running live market research on "${userPrompt}" to optimize layouts...` 
        });
    }
  
    // 1. Run your core tool for business context & feature extraction
    const marketInsights = await performWebSearch(`business model competitors core features for ${userPrompt}`);

    let designInsights = "";

    // 2. Safely run the second targeted search for visual styling references if a brief exists
    try {
        const businessType = brief?.businessType || userPrompt;
        const queryKeywords = [
            businessType,
            brief?.designDirection,
            brief?.visualStyle,
            brief?.layoutStyle,
            "Awwwards modern website design layout typography inspiration UI"
        ].filter(Boolean).join(" ");

        console.log(`[Tavily Search] Querying Design Inspiration: "${queryKeywords}"`);

        // Reusing your clean performWebSearch tool with the specialized design query
        designInsights = await performWebSearch(queryKeywords);

    } catch(err) {
        console.warn("Tavily design search failed, proceeding without visual inspiration:", err.message);
        designInsights = "No design inspiration references available.";
    }

    // 3. Combine both deep vectors into a unified context packet
    const combinedResearchContext = `
=========================================
1. MARKET INTELLIGENCE & COMPETITORS:
=========================================
${marketInsights}

=========================================
2. VISUAL STYLE & DESIGN INSPIRATION:
=========================================
${designInsights}
`.trim();

    return {
        // FIXED: Returns the fully unified contextual packet to the LangGraph state channel
        researchContext: combinedResearchContext, 
        currentStep: "researcher",
        steps: ["Researcher: Market and visual layout context gathered"],
    };
}