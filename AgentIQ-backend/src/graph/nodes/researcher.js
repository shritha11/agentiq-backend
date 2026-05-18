//Uses tavily to search for real world context, competitors, amd inspiration
import { AzureChatOpenAI} from "@langchain/openai";

const llm = new AzureChatOpenAI({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    temperature: 0.5,
    maxTokens: 8000,
});

export async function researcherNode(state, config) {
    const { brief } = state;

    let researchContext = "";

    try {
        const query = brief?.searchQuery || brief?.businessType || "modern business website design";

        const response = await fetch("https://api.tavily.com/search", {
            method: "POST", 
            headers: { "Content-Type": "application/json"},
            body: JSON.stringify({
                api_key: process.env.TAVILY_API_KEY, 
                query: `${query} website design inspiration trends 2026`,
                max_results: 5,
                include_answer: true,
                include_raw_content: false,
            }),
        });

        if (!response.ok) throw new Error(`Tavily error: ${response.status}`);

        const data = await response.json();

        const summary = data.answer || "";

        const results = (data.results || [])
        .slice(0, 4) 
        .map((r) => `- ${r.content?.slice(0,200)}`)
        .join("\n");

        researchContext = `Market Research Summary:\n${summary}\n\nTop Results:\n${results}`;

    } catch(err) {
        console.warn("Tavily search failed, proceeding without research:", err.message);
        researchContext = `No external research available. Proceeding with general knowledge about ${brief?.businessType || "this business"}.`;
    }

    return {
        researchContext,
        currentStep: "researcher",
        steps: ["Researcher: Market context gathered"],
    };
}