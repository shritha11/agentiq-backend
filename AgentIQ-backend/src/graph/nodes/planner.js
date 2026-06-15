import { AzureChatOpenAI} from "@langchain/openai";
import { langfuse } from "../../utils/langfuse.js";

const llm = new AzureChatOpenAI({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_ENDPOINT,
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    temperature: 0.3,
    maxTokens: 4000,
});

export async function plannerNode(state, config) {
    console.log("PLANNER RUN");
    const { userPrompt, contextSummary, uploadedImages } = state;

    console.log(
  "Image URLs:",
  uploadedImages
);
console.log("Extracted Context:", contextSummary);

    

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

    // plannerNode.js — replace the userMessage entirely with this clean version:
const userMessage = `
${contextSummary ? `[CONTEXT FROM PREVIOUS WORK]:\n${contextSummary}\n\nNow evaluate the user's new request below with this context.` : ""}

User idea: "${userPrompt}"

Return ONLY valid JSON with this exact structure. No markdown. No explanation. No text outside the JSON.

{
  "businessName": "suggested name",
  "businessType": "saas | restaurant | portfolio | agency | fintech | ecommerce | creative_studio | ai_tool",
  "tagline": "short punchy tagline — max 6 words",
  "targetAudience": "specific person description",
  "tone": "e.g. bold and modern",
  "searchQuery": "competitor inspiration search query",
  "pitchAngle": "core value proposition sentence",
  "designDirection": "one sentence creative direction",
  "visualStyle": "e.g. glassmorphism, editorial, brutalist",
  "layoutStyle": "e.g. split sections, bento grid, magazine",
  "motionStyle": "e.g. spring-based, cinematic fades",
  "inspirationBrands": ["Brand1", "Brand2"],
  "moodBoard": ["Linear", "Stripe"],
  "uniqueLayoutHook": "one specific memorable layout decision",
  "startupArchetype": "e.g. dev tool, consumer app, marketplace",
  "deckStyle": "e.g. minimal investor, bold visual",
  "presentationMood": "e.g. confident, urgent, visionary",

  "colorPalette": ["#bg", "#primary", "#secondary"],

  "colorSystem": {
    "bg": "#08080f",
    "bgAlt": "#0d0d18",
    "surface": "rgba(255,255,255,0.04)",
    "surfaceHover": "rgba(255,255,255,0.07)",
    "border": "rgba(255,255,255,0.08)",
    "borderHover": "rgba(255,255,255,0.18)",
    "primary": "#7c3aed",
    "primaryGlow": "rgba(124,58,237,0.25)",
    "secondary": "#06b6d4",
    "text": "#ffffff",
    "textMuted": "rgba(255,255,255,0.5)",
    "textSubtle": "rgba(255,255,255,0.25)"
  },

  "typography": {
    "heroSize": "clamp(60px, 9vw, 110px)",
    "h2Size": "clamp(36px, 5vw, 64px)",
    "heroWeight": 800,
    "heroTracking": "-0.06em",
    "heroLineHeight": 0.92,
    "fontStack": "'Inter', system-ui, sans-serif"
  },

  "spacing": {
    "sectionPadding": "140px 80px",
    "maxWidth": "1280px",
    "cardPadding": "36px",
    "gridGap": "20px"
  },

  "designTokens": {
    "cardRadius": "20px",
    "buttonRadius": "100px",
    "cardShadow": "0 2px 40px rgba(0,0,0,0.4)",
    "glowShadow": "0 0 60px rgba(124,58,237,0.25)",
    "buttonShadow": "0 8px 32px rgba(124,58,237,0.35)",
    "transitionBase": "0.25s ease",
    "hoverLift": "translateY(-4px)"
  },

  "layoutPersonality": {
    "heroLayout": "centered",
    "featuresLayout": "bento-grid",
    "navStyle": "frosted",
    "cardStyle": "flat-dark",
    "sectionRhythm": "alternating-bg"
  },

  "copySystem": {
    "heroEyebrow": "SHORT LABEL IN CAPS",
    "heroHeadline": "Exact headline max 6 words",
    "heroGradientWords": ["word1", "word2"],
    "heroSubheadline": "One sentence. What it does for whom.",
    "heroCTAPrimary": "Action verb + benefit",
    "heroCTASecondary": "Secondary action →",
    "featuresEyebrow": "WHY [NAME]",
    "featuresHeadline": "Features section headline",
    "ctaHeadline": "Closing headline"
  },

  "keyFeatures": [
    { "icon": "Zap", "title": "Feature Name", "body": "One specific sentence." },
    { "icon": "Globe", "title": "Feature Name", "body": "One specific sentence." },
    { "icon": "Shield", "title": "Feature Name", "body": "One specific sentence." },
    { "icon": "TrendingUp", "title": "Feature Name", "body": "One specific sentence." },
    { "icon": "Layers", "title": "Feature Name", "body": "One specific sentence." },
    { "icon": "Code", "title": "Feature Name", "body": "One specific sentence." }
  ],

  "sections": ["Hero", "Features", "Pricing", "CTA", "Footer"]
}

COLOR RULES:
- SaaS/AI: deep dark bg (#08080f), electric primary (purple, cyan, green neon)
- Restaurant: warm dark bg (#0f0a06), amber/gold primary
- Creative studio: near-black bg (#0a0a0a), single strong accent (red, orange, lime)
- Portfolio: sophisticated dark (#0d0d0d), muted accent (slate, rose, sage)
- Fintech: navy dark (#060b18), trust blue or green primary
- NEVER reuse purple+cyan for every business — pick based on type above

COPY RULES:
- heroHeadline must name what the product actually does — never "The Future of X"
- Never use: Revolutionize, Transform, Empower, Seamlessly, Next-generation
- heroGradientWords: 1-3 words from the headline that get gradient treatment
- All copy sounds like a real YC-backed founder wrote it

ICON RULES:

Allowed lucide-react icons only:

Shield
Zap
Globe
Star
Wallet
Lock
BarChart3
TrendingUp
Users
Heart
Headphones
Rocket
Sparkles
CheckCircle
ArrowRight

Never generate any icon outside this list.
The icon value must exactly match one of the names above.`;

    const span = langfuse.span({
  traceId: state.traceId,
  name: "planner",
});

console.log("PLANNER SPAN:", span);

    const response = await llm.invoke([
        {role: "system", content: systemPrompt},
        {role: "user", content: userMessage},
    ]);


    console.log("FULL RESPONSE:", response);

console.log(
  "USAGE:",
  response.usage_metadata,
  response.response_metadata
);

    let brief;
    try {
        const text = response.content.trim();
        const cleaned = text.replace(/```json|```/g, "").trim(); //regex pattern
        brief = JSON.parse(cleaned);
    } catch (e) {
        brief = { businessType: userPrompt, searchQuery: userPrompt, sections: ["Hero", "About", "Services", "Contact"]};
    }

    span.update({
  output: brief,
  metadata: {
    inputTokens: response.usage_metadata?.input_tokens,
    outputTokens: response.usage_metadata?.output_tokens,
    totalTokens: response.usage_metadata?.total_tokens,
  },
});

span.end();

    return {
        brief, currentStep: "planner", 
        steps: ["Planner: Brief created"],
    };
}