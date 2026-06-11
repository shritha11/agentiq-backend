import { AzureChatOpenAI } from "@langchain/openai";

const llm = new AzureChatOpenAI({
  azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
  azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_ENDPOINT,
  azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
  temperature: 0.3,
  maxTokens: 2000,
});

export async function architecturePlannerNode(state) {
  const { brief } = state;

  const response = await llm.invoke([
    {
      role: "system",
      content: `You are a senior product architect deciding the component structure for a website.

Given a business brief, return the exact file list and a layout contract for each component.

ARCHETYPE RULES — use these as your base, then adapt:

saas / ai_tool:
  files: Navbar, Hero, SocialProof, Features, DashboardPreview, Pricing, CTA, Footer
  heroLayout: split-left-text-right-visual
  featuresLayout: bento-grid
  uniqueSections: DashboardPreview shows a realistic product UI mockup

restaurant / food:
  restaurant / food:
  files:
  Navbar
  Hero
  Story
  Menu
  Gallery
  Feedback
  Reservations
  Footer
  uniqueSections:
Feedback shows customer reviews,
ratings,
testimonials,
review cards
  heroLayout: full-bleed-image
  featuresLayout: alternating-rows
  uniqueSections: Menu shows real dishes, Gallery is a photo mosaic

portfolio:
  files: Navbar, Hero, Work, About, Process, Contact, Footer
  heroLayout: typographic-manifesto
  featuresLayout: masonry-grid
  uniqueSections: Work shows project cards with hover preview

creative_studio / agency:
  files: Navbar, Hero, Marquee, Work, Services, Team, Contact, Footer
  heroLayout: editorial
  featuresLayout: magazine-layout
  uniqueSections: Marquee is a scrolling client logo or text strip

fintech:
  files: Navbar, Hero, TrustSignals, HowItWorks, Features, Security, Pricing, CTA, Footer
  heroLayout: centered
  featuresLayout: alternating-rows
  uniqueSections: TrustSignals shows logos + stats, Security shows compliance badges

ecommerce:
  files: Navbar, Hero, FeaturedProducts, Categories, Testimonials, CTA, Footer
  heroLayout: split-left-text-right-visual
  featuresLayout: 3-col-grid
  uniqueSections: FeaturedProducts is a real product grid

Always put App.js last in the files array.
Return ONLY valid JSON. No markdown.

IMPORTANT:

If the user's prompt explicitly requests:
- testimonials
- reviews
- ratings
- customer feedback

include:

/Feedback.js

If the user's prompt explicitly requests:
- FAQ

include:

/FAQ.js

If the user's prompt explicitly requests:
- team

include:

/Team.js

The file list must always contain every section referenced in the layout.`,
    },
    {
      role: "user",
      content: `Brief: ${JSON.stringify(brief, null, 2)}

Return:
{
  "files": ["/Navbar.js", "/Hero.js", "...more...", "/App.js"],
  "sectionContracts": {
    "/Hero.js": {
      "layout": "split-left-text-right-visual",
      "headline": "${brief?.copySystem?.heroHeadline || brief?.tagline}",
      "headlineGradientWords": ${JSON.stringify(brief?.copySystem?.heroGradientWords || [])},
      "subheadline": "${brief?.copySystem?.heroSubheadline || ""}",
      "eyebrow": "${brief?.copySystem?.heroEyebrow || ""}",
      "ctaPrimary": "${brief?.copySystem?.heroCTAPrimary || "Get Started"}",
      "ctaSecondary": "${brief?.copySystem?.heroCTASecondary || "Learn More →"}",
      "visualElement": "dashboard-mockup | product-screenshot | abstract-3d | photography | none",
      "ambientDecoration": "radial-blob-top-right | grid-texture | noise | none",
      "specialInstruction": "any specific layout detail that makes this hero unique"
    },
    "/Features.js": {
      "layout": "bento-grid | 3-col-grid | alternating-rows",
      "eyebrow": "${brief?.copySystem?.featuresEyebrow || "FEATURES"}",
      "headline": "${brief?.copySystem?.featuresHeadline || ""}",
      "cards": ${JSON.stringify(brief?.keyFeatures || [])},
      "backgroundTreatment": "same-as-hero | slightly-lighter | accent-tinted"
    },
    "/Navbar.js": {
      "style": "${brief?.layoutPersonality?.navStyle || "frosted"}",
      "logoTreatment": "gradient-text | wordmark | icon-plus-text",
      "links": ["real nav links based on the site sections"],
      "ctaText": "primary nav CTA"
    }
  },
  "layoutStrategy": "One paragraph explaining the visual narrative across the full page"
}`,
    },
  ]);

  let result;
  try {
    const text = response.content.trim().replace(/```json|```/g, "").trim();
    result = JSON.parse(text);
  } catch {
    // fallback
    result = {
      files: ["/Navbar.js", "/Hero.js", "/Features.js", "/CTA.js", "/Footer.js", "/App.js"],
      sectionContracts: {},
      layoutStrategy: "Standard layout",
    };
  }

  return {
    projectStructure: { files: result.files },
    sectionContracts: result.sectionContracts || {},
    layoutStrategy: result.layoutStrategy || "",
    currentStep: "architecturePlanner",
    steps: ["Architecture: File tree + contracts created"],
  };
}