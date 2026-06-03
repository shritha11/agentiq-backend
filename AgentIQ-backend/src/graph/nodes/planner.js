import { AzureChatOpenAI} from "@langchain/openai";

const llm = new AzureChatOpenAI({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_ENDPOINT,
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    temperature: 0.3,
    maxTokens: 4000,
});

export async function plannerNode(state, config) {
    const { userPrompt } = state;

    console.log(
  "Image URLs:",
  state.uploadedImages
);

    

    //systemprompt controls AI behavior, usermessage contains task/context given to the AI
    const systemPrompt = `You are a creative director and product strategist. Given a user's idea, produce a detailed creative brief in JSON format. Return ONLY valid JSON, no markdown, no explanation.
    Never invent skills, technologies, experience, achievements, testimonials, metrics, or personal details not provided by the user. 
    
    If information is missing, keep it minimal and generic. 
    Only use information explicitly given by the user.
    
    You are also responsible for choosing a UNIQUE visual identity.

Different businesses MUST generate completely different:
- layouts
- typography systems
- motion styles
- section structures
- color moods
- presentation styles

Choose inspiration based on the business type.

Examples:

Luxury Brand:
- editorial
- cinematic
- fashion magazine inspired

AI SaaS:
- futuristic
- glassmorphism
- Stripe/Raycast inspired

Creative Studio:
- brutalist
- typography heavy
- experimental

Restaurant:
- immersive
- photography-led
- warm minimal

Portfolio:
- storytelling
- atmospheric
- interactive;` 

    const userMessage = `User idea: "${userPrompt}"

    Produce a JSON brief with this exact structure: 
    {
    "businessName": "suggested name",
    "businessType": "e.g. coffee shop, SaaS, venue",
    "tagline": "short punchy tagline",
    "targetAudience": "who this is for",
    "tone": "eg. warm and artisanal, bold and modern, playful",
    "colorPalette": ["#hex1", "#hex2", "#hex3"],
    "keyFeatures": ["feature1", "feature2", "feature 3"],
    "sections": ["Hero", "About", "Menu/Services", "Gallery", "Contact"],
    "searchQuery": "what to search for competitor/inspiration research",
    "pitchAngle": "core value proposition",
    "designDirection": "overall creative direction",
    "visualStyle": "visual aesthetic",
    "layoutStyle": "website composition style",
    "motionStyle": "animation philosophy",
    "inspirationBrands": ["brand1", "brand2"],
    "startupArchetype": "type of startup/company",
    "deckStyle": "pitch deck visual style",
    "presentationMood": "investor presentation mood"
    }`;

    const response = await llm.invoke([
        {role: "system", content: systemPrompt},
        {role: "user", content: userMessage},
    ]);

    let brief;
    try {
        const text = response.content.trim();
        const cleaned = text.replace(/```json|```/g, "").trim(); //regex pattern
        brief = JSON.parse(cleaned);
    } catch (e) {
        brief = { businessType: userPrompt, searchQuery: userPrompt, sections: ["Hero", "About", "Services", "Contact"]};
    }

    return {
        brief, currentStep: "planner", 
        steps: ["Planner: Brief created"],
    };
}