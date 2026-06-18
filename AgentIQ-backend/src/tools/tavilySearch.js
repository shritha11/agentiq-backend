import { tavily } from "@tavily/core"; // ◄ FIXED: Import the factory function instead of a class

// Initialize the client by calling the tavily factory function
const tavilyClient = tavily({
    apiKey: process.env.TAVILY_API_KEY
});

/**
 * @param {string} query 
 * @returns {Promise<string>}
 */
export async function performWebSearch(query) {
    if (!process.env.TAVILY_API_KEY) {
        console.warn("Tavily API key missing. Skipping live search.");
        return "No research context available (Missing API Key).";
    }

    try {
        console.log(`[Tavily Search] Querying: "${query}"`);

        // ◄ FIXED: Call search on your instantiated tavilyClient instance
        const response = await tavilyClient.search(query, {
            searchDepth: "advanced", 
            maxResults: 4, 
            includeAnswer: true
        });

        let contextuallResult = `### Summary Answer:\n${response.answer || "N/A"}\n\n### Web Source Insights:\n`;

        response.results.forEach((result, idx) => {
            contextuallResult += `${idx + 1}. Title: ${result.title}\n URL: ${result.url}\n Snippet: ${result.content}\n\n`;
        });

        return contextuallResult;
    } catch(error) {
        console.error("Tavily search tool error:", error);
        return `Failed to fetch live research context due to an error: ${error.message}`;
    }
}