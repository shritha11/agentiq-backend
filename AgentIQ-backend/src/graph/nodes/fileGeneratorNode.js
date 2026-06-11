import { AzureChatOpenAI } from "@langchain/openai";
import { langfuse } from "../../utils/langfuse.js";

const llm = new AzureChatOpenAI({
  azureOpenAIApiKey:            process.env.AZURE_OPENAI_API_KEY,
  azureOpenAIApiInstanceName:   process.env.AZURE_OPENAI_ENDPOINT,
  azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  azureOpenAIApiVersion:        process.env.AZURE_OPENAI_API_VERSION,
  temperature: 0.5,
  maxTokens: 4000,
});

// File-specific generation prompts
function getFilePrompt(filePath, brief, existingFiles, sectionContracts) {
  const c = brief?.colorSystem || {};
  const t = brief?.typography || {};
  const sp = brief?.spacing || {};
  const dt = brief?.designTokens || {};
  const lp = brief?.layoutPersonality || {};
  const contract = sectionContracts?.[filePath] || {};

  const name = brief?.businessName || "Brand";
  const type = brief?.businessType || "business";

  // Shared token block injected into every prompt
  const TOKENS = `
// ─── DESIGN TOKENS — use these exact values everywhere. Never invent hex colors. ───
const C = {
  bg:           "${c.bg || "#08080f"}",
  bgAlt:        "${c.bgAlt || "#0d0d18"}",
  surface:      "${c.surface || "rgba(255,255,255,0.04)"}",
  surfaceHover: "${c.surfaceHover || "rgba(255,255,255,0.07)"}",
  border:       "${c.border || "rgba(255,255,255,0.08)"}",
  borderHover:  "${c.borderHover || "rgba(255,255,255,0.18)"}",
  primary:      "${c.primary || "#7c3aed"}",
  primaryGlow:  "${c.primaryGlow || "rgba(124,58,237,0.25)"}",
  secondary:    "${c.secondary || "#06b6d4"}",
  text:         "${c.text || "#ffffff"}",
  textMuted:    "${c.textMuted || "rgba(255,255,255,0.5)"}",
  textSubtle:   "${c.textSubtle || "rgba(255,255,255,0.25)"}",
  heroSize:     "${t.heroSize || "clamp(60px, 9vw, 110px)"}",
  h2Size:       "${t.h2Size || "clamp(36px, 5vw, 64px)"}",
  heroWeight:   ${t.heroWeight || 800},
  heroTracking: "${t.heroTracking || "-0.06em"}",
  heroLH:       ${t.heroLineHeight || 0.92},
  font:         "${t.fontStack || "'Inter', system-ui, sans-serif"}",
  sectionPad:   "${sp.sectionPadding || "140px 80px"}",
  maxW:         "${sp.maxWidth || "1280px"}",
  cardPad:      "${sp.cardPadding || "36px"}",
  gap:          "${sp.gridGap || "20px"}",
  cardR:        "${dt.cardRadius || "20px"}",
  btnR:         "${dt.buttonRadius || "100px"}",
  shadow:       "${dt.cardShadow || "0 2px 40px rgba(0,0,0,0.4)"}",
  glow:         "${dt.glowShadow || "0 0 60px rgba(124,58,237,0.25)"}",
  btnShadow:    "${dt.buttonShadow || "0 8px 32px rgba(124,58,237,0.35)"}",
  ease:         "${dt.transitionBase || "0.25s ease"}",
  lift:         "${dt.hoverLift || "translateY(-4px)"}",
};
`;

  const SHARED_RULES = `
RULES (non-negotiable):
- Return ONLY raw JavaScript/JSX. Zero markdown. Zero backticks. Zero comments saying "here is your component".
- NO className. NO Tailwind. NO external CSS files. Inline styles only.
- Import React from 'react' at the top.
- Export default the component function.
- React.useState for all interactive states (hover, active, open).
- All imports use './' prefix and '.js' extension.
- Only import files that exist: [${existingFiles.join(", ")}]
- NO emoji anywhere in the rendered UI.
- Use lucide-react for icons: import { Zap, Globe, Shield } from 'lucide-react'
- Use C object for ALL colors, sizes, spacing. Never hardcode a hex value outside C.
- Business: ${name} — ${type}

CRITICAL:

If you use:

- C
- theme
- tokens
- config

they MUST be declared in the SAME FILE.

Every component must be completely self-contained.

Never reference variables defined in another file.
`;

  const filePrompts = {

    "/Navbar.js": `
import React from 'react';
${TOKENS}
${SHARED_RULES}

CONTRACT:
- Style: ${contract.style || lp.navStyle || "frosted"}
- Logo treatment: ${contract.logoTreatment || "gradient-text"}
- Nav links: ${JSON.stringify(contract.links || ["Features", "Pricing", "About"])}
- CTA text: "${contract.ctaText || "Get Started"}"

BUILD THIS EXACT NAVBAR:

Container:
  position: "sticky", top: 0, zIndex: 100
  display: "flex", alignItems: "center", justifyContent: "space-between"
  padding: "0 80px", height: "68px"
  ${contract.style === "frosted" ? `background: "rgba(8,8,15,0.85)", backdropFilter: "blur(24px) saturate(180%)", borderBottom: \`1px solid \${C.border}\`` : ""}
  ${contract.style === "transparent" ? `background: "transparent"` : ""}
  ${contract.style === "solid" ? `background: C.bg, borderBottom: \`1px solid \${C.border}\`` : ""}

Logo (left):
  ${contract.logoTreatment === "gradient-text" ? `fontSize: "20px", fontWeight: 800, letterSpacing: "-0.05em"
  background: \`linear-gradient(135deg, \${C.primary}, \${C.secondary})\`
  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"` : `fontSize: "20px", fontWeight: 800, color: C.text`}
  Text: "${name}"

Nav links (center or right of logo):
  display: "flex", gap: "32px"
  Each link: fontSize: "14px", cursor: "pointer", textDecoration: "none"
  Default color: C.textMuted
  Hover color: C.text
  Use React.useState({ hoveredLink: null }) for hover tracking

CTA button (right):
  background: \`linear-gradient(135deg, \${C.primary}, \${C.secondary})\`
  padding: "9px 22px", borderRadius: C.btnR, border: "none"
  color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer"
  boxShadow: C.btnShadow
  On hover: opacity 0.9, transform: "translateY(-1px)"
`,

    "/Hero.js": `
import React from 'react';
${TOKENS}
${SHARED_RULES}

CONTRACT:
- Layout: ${contract.layout || lp.heroLayout || "centered"}
- Eyebrow: "${contract.eyebrow || ""}"
- Headline: "${contract.headline || brief?.tagline || name}"
- Gradient words: ${JSON.stringify(contract.headlineGradientWords || [])}
- Subheadline: "${contract.subheadline || ""}"
- CTA Primary: "${contract.ctaPrimary || "Get Started"}"
- CTA Secondary: "${contract.ctaSecondary || "Learn More →"}"
- Visual element: ${contract.visualElement || "none"}
- Ambient decoration: ${contract.ambientDecoration || "radial-blob-top-right"}
- Special instruction: ${contract.specialInstruction || "none"}

${contract.layout === "split-left-text-right-visual" ? `
SPLIT LAYOUT IMPLEMENTATION:

Outer section:
  minHeight: "100vh", display: "flex", alignItems: "center"
  padding: C.sectionPad, background: C.bg
  position: "relative", overflow: "hidden"

Inner wrapper:
  maxWidth: C.maxW, margin: "0 auto", width: "100%"
  display: "flex", alignItems: "center", gap: "80px"

Left side (flex: 1):
  Stack vertically: eyebrow → headline → subheadline → CTA buttons

Right side (flex: 1):
  Render a product mockup div:
    background: C.bgAlt
    border: \`1px solid \${C.border}\`
    borderRadius: "16px"
    padding: "24px"
    boxShadow: C.shadow
    minHeight: "380px"
    
  Inside mockup, build a mini fake dashboard:
    - Top bar with 3 colored dots (red, yellow, green, 10px circles)
    - Sidebar strip: background C.surface, width 40px
    - Main area: 2 stat cards side by side (use C.surface bg, C.border border)
    - Each stat card: a small label in C.textSubtle + a bold number in C.text
    - A fake "bar chart" using 5-6 divs of varying heights (use C.primary with low opacity)
    - This must look like a real SaaS dashboard mini-preview
` : ""}

${contract.layout === "centered" || !contract.layout ? `
CENTERED LAYOUT IMPLEMENTATION:

Outer section:
  minHeight: "100vh", display: "flex", flexDirection: "column"
  alignItems: "center", justifyContent: "center", textAlign: "center"
  padding: C.sectionPad, background: C.bg
  position: "relative", overflow: "hidden"

Content max-width: "760px", margin: "0 auto"
` : ""}

${contract.layout === "full-bleed-image" ? `
FULL-BLEED LAYOUT IMPLEMENTATION:

Outer section:
  minHeight: "100vh", position: "relative"
  display: "flex", alignItems: "flex-end"
  padding: "0 0 80px 80px"

Background image overlay:
  position: "absolute", inset: 0
  background: "linear-gradient(to top, rgba(8,8,15,0.95) 0%, rgba(8,8,15,0.4) 60%, rgba(8,8,15,0.1) 100%)"
  zIndex: 1

Content: position relative, zIndex 2, maxWidth: "640px"
` : ""}

AMBIENT DECORATION (always required):
  position: "absolute", pointerEvents: "none"
  ${contract.ambientDecoration === "radial-blob-top-right" ? `
  top: "-10%", right: "-5%"
  width: "600px", height: "600px", borderRadius: "50%"
  background: \`radial-gradient(ellipse, \${C.primaryGlow} 0%, transparent 70%)\`
  filter: "blur(40px)"
  ` : `
  top: "30%", left: "50%", transform: "translateX(-50%)"
  width: "800px", height: "400px"
  background: \`radial-gradient(ellipse, \${C.primaryGlow} 0%, transparent 65%)\`
  filter: "blur(60px)"
  `}

EYEBROW (if provided):
  fontSize: "11px", letterSpacing: "3px", textTransform: "uppercase"
  color: C.primary, fontWeight: 600, marginBottom: "24px"
  Text: "${contract.eyebrow || ""}"

HEADLINE IMPLEMENTATION:
Full headline text: "${contract.headline || brief?.tagline}"
Gradient words: ${JSON.stringify(contract.headlineGradientWords || [])}

Split the headline string by spaces.
For each word:
  if the word is in the gradientWords array, render it with:
    background: \`linear-gradient(135deg, \${C.primary}, \${C.secondary})\`
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
    display: "inline"
  else render it in color: C.text, display: "inline"

Wrap all words in a single h1:
  fontSize: C.heroSize, fontWeight: C.heroWeight
  letterSpacing: C.heroTracking, lineHeight: C.heroLH
  marginBottom: "24px"

SUBHEADLINE:
  fontSize: "18px", color: C.textMuted, lineHeight: 1.75
  maxWidth: "520px", marginBottom: "40px"
  ${contract.layout !== "split-left-text-right-visual" ? `margin: "0 auto 40px"` : ""}
  Text: "${contract.subheadline || ""}"

CTA BUTTONS:
  display: "flex", gap: "16px", alignItems: "center"
  ${contract.layout !== "split-left-text-right-visual" ? `justifyContent: "center"` : ""}

  Primary button state with React.useState:
    default:  background gradient, padding "14px 32px", borderRadius C.btnR, border none
              color #fff, fontSize "14px", fontWeight 600, cursor pointer, boxShadow C.btnShadow
    hover:    transform C.lift, boxShadow C.glow

  Secondary button:
    background transparent, border "1px solid rgba(255,255,255,0.2)"
    padding "14px 32px", borderRadius C.btnR, color C.text, cursor pointer
    hover: background C.surface
`,

    "/Features.js": `
import React from 'react';
${TOKENS}
${SHARED_RULES}

CONTRACT:
- Layout: ${contract.layout || lp.featuresLayout || "3-col-grid"}
- Eyebrow: "${contract.eyebrow || "FEATURES"}"
- Headline: "${contract.headline || "Everything you need"}"
- Cards: ${JSON.stringify(contract.cards || brief?.keyFeatures || [])}
- Background: ${contract.backgroundTreatment || "bgAlt"}

${contract.layout === "bento-grid" || lp.featuresLayout === "bento-grid" ? `
BENTO GRID IMPLEMENTATION:

Section padding: C.sectionPad, background: C.bgAlt

Section header (centered, marginBottom: "80px"):
  Eyebrow → H2 headline

Grid container:
  display: "grid"
  gridTemplateColumns: "repeat(3, 1fr)"
  gridTemplateRows: "auto"
  gap: C.gap
  maxWidth: C.maxW, margin: "0 auto"

Cards from contract.cards or keyFeatures.
First card: gridColumn "span 2" — this is the hero feature card
  padding: "48px"
  Show icon large (32px), bold title, full description, and a decorative element
  (a small mini stat or visual — e.g., "10x faster", a tiny bar, a badge)

Remaining cards: gridColumn "span 1"
  padding: C.cardPad

All cards:
  background: C.surface
  border: \`1px solid \${C.border}\`
  borderRadius: C.cardR
  transition: C.ease
  cursor: "pointer"

Hover state per card (React.useState tracking hovered index):
  background: C.surfaceHover
  border: \`1px solid \${C.borderHover}\`
  transform: C.lift
  boxShadow: C.shadow

Icon: import the icon name from lucide-react
  <IconName size={24} color={C.primary} style={{ marginBottom: "20px" }} />

Title: fontSize "17px", fontWeight 700, color C.text, marginBottom "8px"
Body: fontSize "14px", color C.textMuted, lineHeight 1.75
` : ""}

${contract.layout === "3-col-grid" || (!contract.layout && lp.featuresLayout !== "bento-grid") ? `
3-COL GRID IMPLEMENTATION:

Section: padding C.sectionPad, background C.bgAlt

Grid: display "grid", gridTemplateColumns "repeat(3, 1fr)", gap C.gap
      maxWidth C.maxW, margin "0 auto"

Each card: same styling as bento cards above, gridColumn "span 1"
` : ""}

${contract.layout === "alternating-rows" ? `
ALTERNATING ROWS IMPLEMENTATION:

Section: padding C.sectionPad

Each feature is a full-width row: display flex, alignItems center, gap 80px
Odd rows: visual left, text right
Even rows: text left, visual right

Visual side: width 48%, background C.surface, borderRadius C.cardR, minHeight 300px
  Add a relevant decorative element inside (icon large, stat, mini chart)

Text side: width 52%
  Icon small, eyebrow chip, bold title, body text, optional link
  
Row separator: borderBottom \`1px solid \${C.border}\`
` : ""}
`,

    "/Pricing.js": `
import React from 'react';
${TOKENS}
${SHARED_RULES}

BUILD A 3-TIER PRICING SECTION:

Section: padding C.sectionPad, background C.bg

Header (centered, marginBottom "80px"):
  Eyebrow "PRICING" in C.primary
  H2: "Simple, transparent pricing" — fontSize C.h2Size

Plans array (define as const in the component):
[
  { name: "Starter", price: "$0", period: "/month", description: "Perfect for trying out ${name}", 
    features: ["3 real features", "2 more real features", "1 more"], cta: "Start Free", highlighted: false },
  { name: "Pro", price: "$29", period: "/month", description: "For serious builders",
    features: ["Everything in Starter", "4 more real features", "Priority support"], cta: "Start Pro", highlighted: true },
  { name: "Enterprise", price: "Custom", period: "", description: "For teams and companies",
    features: ["Everything in Pro", "Custom features", "Dedicated support"], cta: "Talk to Sales", highlighted: false }
]

Grid: display "flex", gap "24px", justifyContent "center", maxWidth C.maxW, margin "0 auto"

Regular cards:
  background: C.surface, border: \`1px solid \${C.border}\`
  borderRadius: C.cardR, padding: "40px 36px", flex: 1, maxWidth: "360px"

Highlighted card (highlighted: true):
  background: C.bgAlt
  border: \`1px solid \${C.primary}\`
  boxShadow: \`0 0 40px \${C.primaryGlow}\`
  position relative

  "Most Popular" badge (position absolute, top -14px, left 50%, translateX -50%):
    background: \`linear-gradient(135deg, \${C.primary}, \${C.secondary})\`
    padding: "4px 16px", borderRadius: "100px", fontSize: "12px", fontWeight: 600, color: "#fff"

Price display:
  fontSize: "48px", fontWeight: 800, letterSpacing: "-0.04em", color: C.text
  Period: fontSize: "16px", color: C.textMuted

Feature list:
  listStyle: "none", padding: 0, margin: "24px 0 32px"
  Each item: display flex, alignItems center, gap 10px, marginBottom 10px
    Checkmark: a 16px div, borderRadius 50%, background C.primary + 20% opacity, color C.primary
    Text: fontSize "14px", color C.textMuted

CTA button:
  Regular: border \`1px solid \${C.border}\`, background transparent, color C.text
  Highlighted: gradient background, boxShadow C.btnShadow
  Both: width "100%", padding "13px", borderRadius C.btnR, fontWeight 600, cursor pointer
`,

    "/CTA.js": `
import React from 'react';
${TOKENS}
${SHARED_RULES}

BUILD A CLOSING CTA SECTION:

Section:
  padding: C.sectionPad, position: "relative", overflow: "hidden"
  background: C.bgAlt, textAlign: "center"

Ambient glow (position absolute, centered, no pointer events):
  width: "600px", height: "300px"
  background: \`radial-gradient(ellipse, \${C.primaryGlow} 0%, transparent 70%)\`
  top: "50%", left: "50%", transform: "translate(-50%, -50%)"
  filter: "blur(60px)"

Content (position relative, zIndex 1):
  maxWidth: "640px", margin: "0 auto"

Headline: fontSize C.h2Size, fontWeight C.heroWeight, letterSpacing C.heroTracking
  Color: C.text — use gradient on 2-3 key words same technique as Hero

Subtext: fontSize "18px", color C.textMuted, marginBottom "40px"

CTA button: same primary button style as Hero
  Text: "${brief?.copySystem?.heroCTAPrimary || "Get Started Free"}"
  
Below button: small trust text in C.textSubtle
  e.g. "No credit card required • Cancel anytime" or equivalent for ${type}
`,

    "/Footer.js": `
import React from 'react';
${TOKENS}
${SHARED_RULES}

BUILD A COMPLETE FOOTER:

Footer:
  background: C.bg
  borderTop: \`1px solid \${C.border}\`
  padding: "80px 80px 40px"

Top section (display flex, justifyContent space-between, marginBottom "60px"):

  Left column:
    Logo (same gradient text as Navbar): "${name}"
    Tagline below: fontSize "14px", color C.textSubtle, marginTop "8px"
    Max width: "240px"

  Link columns (display flex, gap "64px"):
    Generate 3 real columns with relevant links for ${type}
    Column 1 title + 4 real links
    Column 2 title + 4 real links
    Column 3 title + 3 real links
    Column title: fontSize "12px", letterSpacing "2px", textTransform "uppercase", color C.textSubtle, fontWeight 600, marginBottom "16px"
    Links: fontSize "14px", color C.textMuted, cursor "pointer", display "block", marginBottom "10px"
    Link hover: color C.text

Bottom bar (display flex, justifyContent space-between, alignItems center):
  borderTop: \`1px solid \${C.border}\`, paddingTop: "32px", marginTop: "0"
  Left: "© ${new Date().getFullYear()} ${name}. All rights reserved." — fontSize "13px", color C.textSubtle
  Right: "Built with AgentIQ" — fontSize "13px", color C.textSubtle
`,

    "/DashboardPreview.js": `
import React from 'react';
${TOKENS}
${SHARED_RULES}

BUILD A PRODUCT DASHBOARD PREVIEW SECTION:

Section: padding C.sectionPad, background C.bgAlt

Section header (centered, marginBottom "64px"):
  Eyebrow → "SEE IT IN ACTION"
  H2: "A dashboard built for clarity"

Main preview container:
  maxWidth: "1000px", margin: "0 auto"
  background: C.bg, borderRadius: "24px"
  border: \`1px solid \${C.border}\`
  boxShadow: \`0 32px 80px rgba(0,0,0,0.5)\`
  overflow: "hidden"

Window chrome bar (top of container):
  height: "44px", background: C.bgAlt
  borderBottom: \`1px solid \${C.border}\`
  display: "flex", alignItems: "center", padding: "0 20px", gap: "8px"
  Three dots: 12px circles — "#ff5f57", "#ffbd2e", "#28c840"
  Title text center: fontSize "13px", color C.textSubtle

Dashboard body (display flex):

  Sidebar (width: "200px"):
    background: C.bgAlt, borderRight: \`1px solid \${C.border}\`
    padding: "20px 0"
    5-6 nav items, each 36px tall, display flex, alignItems center, padding "0 20px", gap "10px"
    Active item: background C.surface, color C.text
    Others: color C.textMuted
    Use lucide-react icons: LayoutDashboard, Users, BarChart2, Settings, FileText

  Main content (flex: 1, padding: "28px"):

    Stats row (display grid, gridTemplateColumns "repeat(4, 1fr)", gap "16px", marginBottom "24px"):
      4 stat cards — each: background C.surface, border \`1px solid \${C.border}\`, borderRadius "12px", padding "20px"
      Label: fontSize "12px", color C.textSubtle, marginBottom "6px"
      Value: fontSize "24px", fontWeight 700, color C.text
      Change: fontSize "12px", color "#22c55e" (green for positive)
      Use REAL stats relevant to ${type}

    Chart area (background C.surface, borderRadius "12px", border \`1px solid \${C.border}\`, padding "20px", marginBottom "20px"):
      Title: fontSize "14px", fontWeight 600, color C.text, marginBottom "16px"
      Bar chart using divs:
        display flex, alignItems flex-end, gap "8px", height "120px"
        7 bars of varying heights (use Math or hardcode)
        Each bar: background \`linear-gradient(to top, \${C.primary}, \${C.secondary})\`
        borderRadius "4px 4px 0 0", flex 1, opacity varies

    Recent list (background C.surface, borderRadius "12px", border \`1px solid \${C.border}\`, padding "20px"):
      Title + 4 rows of fake recent activity
      Each row: display flex, justifyContent space-between
      Left: small colored dot + text (14px, C.text)
      Right: time ago text (12px, C.textSubtle)
`,

    "/App.js": `
import React from 'react';
${existingFiles.filter(f => f !== "/App.js").map(f => {
  const componentName = f.replace("/", "").replace(".js", "");
  return `import ${componentName} from '${f.replace("/", "./")}';`;
}).join("\n")}
${TOKENS}

export default function App() {
  return (
    <div style={{
      background: "${c.bg || "#08080f"}",
      minHeight: "100vh",
      fontFamily: "${t.fontStack || "'Inter', system-ui, sans-serif"}",
      color: "${c.text || "#ffffff"}",
      overflowX: "hidden"
    }}>
      {/* Render all components in order */}
      ${existingFiles.filter(f => f !== "/App.js").map(f => {
        const n = f.replace("/", "").replace(".js", "");
        return `<${n} />`;
      }).join("\n      ")}
    </div>
  );
}
`,
  };

  return filePrompts[filePath] || `
import React from 'react';
${TOKENS}
${SHARED_RULES}

Build the ${filePath.replace("/", "").replace(".js", "")} component for ${name}.

This is a ${type} website.
Use C tokens for all styling.
Make it visually consistent with the rest of the site.
Content must be real and specific to ${name}.
Export default the component.
`;
}

export async function fileGeneratorNode(state) {
  const { brief, generationQueue, emit } = state;
  console.log("STATE GENERATED FILES", Object.keys(state.generatedFiles || {}));
  console.log("STATE MESSAGES:", state.messages);
  console.log("GENERATION QUEUE:", generationQueue);
  const uploadedImages = state.uploadedImages || [];
  console.log(
  "FileGenerator Images:",
  state.uploadedImages
);

  if (!generationQueue || generationQueue.length === 0) {
  return {
    generatedFiles: {},
    websiteRaw: JSON.stringify({ files: {} }),
    currentStep: "fileGenerator",
    steps: ["⚠️ No files to generate"],
  };
}

  const allGeneratedFiles = {};

  for (const filePath of generationQueue) {
    const existingFilePaths = Object.keys(state.generatedFiles || {});
    const existingCode = state.generatedFiles?.[filePath] || "";

    
    const span = langfuse.span({
  traceId: state.traceId,
  name: filePath.replace("/", ""),
});

console.log(
  "SPAN:",
  filePath,
  span.traceId
);

    try {
      const prompt = getFilePrompt(filePath, brief, existingFilePaths, state.sectionContracts || {});
      const imageInstructions =
uploadedImages.length > 0
? `

UPLOADED IMAGES:
${uploadedImages.join("\n")}

IMPORTANT:
- Use the first uploaded image as the hero image.
- Use remaining uploaded images throughout the website.
- Do NOT generate placeholder image URLs.
- Use the exact uploaded image URLs wherever visuals are needed.
`
: "";
      const narrationPrompt = `
You are an elite AI software engineer building a production-grade website.

Project:
${state.brief?.businessIdea}

Current file:
${filePath}

Write a short natural progress update.

Style:
- calm
- thoughtful
- practical
- like Claude or Manus
- no hype
- no marketing language

Examples:
- I'm refining the hero layout to improve visual hierarchy and clarity.
- I'm connecting the pricing section to the shared design system.
- I'm restructuring the navigation to make the flow feel more intuitive.

Rules:
- under 22 words
- first person
- plain text only
`;

const narrationRes =
  await llm.invoke(narrationPrompt);

const narrationText =
  narrationRes.content.trim();


      const response = await llm.invoke([
        {
          role: "system",
          content: `${prompt} 
          ${imageInstructions}
          EXISTING FILE: 
          ${existingCode}
          If an existing file is provided, MODIFY IT instead of creating a new one.
          
          Preserve all functionality unless the user explicitly asks to change it.
          
          IMPORTANT:
          Only modify the current file.
          Do NOT redesign the website.
          
          Do NOT change colors, layout, content, or styling outside the requested change.
          
          Keep all existing functionality intact. 
          
          Apply the smallest possible change.`,
        },
        {
          role: "user",
          content: `User request:
          ${state.userPrompt}
          File: ${filePath}
          
          Return ONLY the updated code.`,
        },
      ]);

      span.update({
  metadata: {
    file: filePath,

    inputTokens:
      response.usage_metadata?.input_tokens,

    outputTokens:
      response.usage_metadata?.output_tokens,

    totalTokens:
      response.usage_metadata?.total_tokens,
  },
});

      console.log(
  `TOKENS FOR ${filePath}:`,
  response.usage_metadata,
  response.response_metadata
);

      let code = response.content.trim();

      span.end();

      // Strip any accidental markdown fences
      code = code
        .replace(/^```(?:jsx?|javascript)?\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

if (code.length > 50) {

  allGeneratedFiles[filePath] = code;

  if(emit) {
    emit("current_file", {
      path: filePath,
    });

    emit("narration", {
      message: narrationText,
    });

    emit("file_chunk", {
      path: filePath, 
      code,
    });
  }
  state.generatedFiles = {
    ...state.generatedFiles, 
    [filePath]: code,
  };

  state.currentFile = filePath;
  state.narration = narrationText;

  console.log(
    `Generated ${filePath} (${code.length} chars)`
  );

} else {

  console.warn(
    `${filePath} too short`
  );

  const fallback =
    generateFallback(
      filePath,
      brief
    );

  allGeneratedFiles[filePath] =
    fallback;
}

} catch (err) {

  console.error(
    `Failed to generate ${filePath}:`,
    err.message
  );

  span.update({
  level: "ERROR",
  statusMessage: err.message,
});

span.end();

console.log(
  "SPAN ENDED:",
  filePath
);

  const fallback =
    generateFallback(
      filePath,
      brief
    );

  allGeneratedFiles[filePath] =
    fallback;

}

}

console.log("Generated files:", Object.keys(allGeneratedFiles));

  return {
    generatedFiles: allGeneratedFiles,           // merge reducer accumulates
    websiteRaw: JSON.stringify({ files: allGeneratedFiles }),
    currentStep: "fileGenerator",
    steps: [`⚡ Files: Generated ${Object.keys(allGeneratedFiles).length} files`],
  };

// ── Fallback generator for when LLM fails 
function generateFallback(filePath, brief) {
  const colors = brief?.colorPalette || ["#7c3aed", "#06b6d4", "#0a0a0f"];
  const primary = colors[0];
  const name = brief?.businessName || "Brand";

  const componentName = filePath.replace("/", "").replace(".js", "");

  const fallbacks = {
    "/Navbar.js": `import React from 'react';
export default function Navbar() {
  const [hov, setHov] = React.useState(null);
  const links = ["About", "Features", "Contact"];
  return (
    <nav style={{ position: "sticky", top: 0, display: "flex", justifyContent: "space-between",
                  alignItems: "center", padding: "20px 48px", background: "rgba(5,5,15,0.92)",
                  backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.07)", zIndex: 100 }}>
      <div style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.04em",
                    background: "linear-gradient(135deg, ${primary}, ${colors[1]})",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>${name}</div>
      <div style={{ display: "flex", gap: "28px" }}>
        {links.map(l => <span key={l} onMouseEnter={() => setHov(l)} onMouseLeave={() => setHov(null)}
          style={{ fontSize: "14px", cursor: "pointer", color: hov === l ? "#fff" : "rgba(255,255,255,0.45)",
                   transition: "color 0.2s" }}>{l}</span>)}
      </div>
      <button style={{ padding: "10px 24px", borderRadius: "100px", border: "none",
                       background: "linear-gradient(135deg, ${primary}, ${colors[1]})",
                       color: "#fff", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>Get Started</button>
    </nav>
  );
}`,

    "/Hero.js": `import React from 'react';
export default function Hero() {
  const [h, setH] = React.useState(false);
  return (
    <section style={{ minHeight: "90vh", display: "flex", flexDirection: "column", alignItems: "center",
                      justifyContent: "center", textAlign: "center", padding: "80px 40px", position: "relative" }}>
      <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translateX(-50%)",
                    width: "600px", height: "400px", borderRadius: "50%",
                    background: "radial-gradient(ellipse, rgba(124,58,237,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
      <h1 style={{ fontSize: "clamp(48px,8vw,96px)", fontWeight: 800, letterSpacing: "-0.05em",
                   lineHeight: 0.95, marginBottom: "24px",
                   background: "linear-gradient(135deg, #fff, rgba(255,255,255,0.6))",
                   WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        ${brief?.tagline || name}
      </h1>
      <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.5)", maxWidth: "500px", lineHeight: 1.8, marginBottom: "40px" }}>
        ${brief?.businessType ? `The best ${brief.businessType} experience.` : "Built for the future."}
      </p>
      <button onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
              style={{ padding: "15px 36px", borderRadius: "100px", border: "none",
                       background: "linear-gradient(135deg, ${primary}, ${colors[1]})",
                       color: "#fff", fontSize: "15px", fontWeight: 700, cursor: "pointer",
                       transform: h ? "translateY(-2px)" : "translateY(0)",
                       boxShadow: h ? "0 12px 40px rgba(124,58,237,0.5)" : "0 6px 24px rgba(124,58,237,0.3)",
                       transition: "all 0.2s" }}>Get Started →</button>
    </section>
  );
}`,

    "/Features.js": `import React from 'react';
export default function Features() {
  const [hov, setHov] = React.useState(null);
  const items = ${JSON.stringify(
    (brief?.keyFeatures || ["Feature One", "Feature Two", "Feature Three"])
      .slice(0, 6)
      .map((f, i) => ({ icon: [
  "Feature",
  "Feature",
  "Feature",
  "Feature",
  "Feature",
  "Feature"
][i], title: f, desc: `Everything you need for ${f.toLowerCase()}.` }))
  )};
  return (
    <section style={{ padding: "100px 80px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "64px" }}>
        <div style={{ fontSize: "11px", color: "${primary}", letterSpacing: "3px", textTransform: "uppercase", fontWeight: 700, marginBottom: "16px" }}>Features</div>
        <h2 style={{ fontSize: "clamp(32px,5vw,56px)", fontWeight: 800, letterSpacing: "-0.04em", color: "#fff" }}>Everything you need</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "20px" }}>
        {items.map((item, i) => (
          <div key={i} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
               style={{ padding: "32px", borderRadius: "20px", cursor: "pointer", transition: "all 0.25s",
                        background: hov === i ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
                        border: \`1px solid rgba(255,255,255,\${hov === i ? 0.15 : 0.07})\`,
                        transform: hov === i ? "translateY(-4px)" : "none" }}>
            <div style={{ fontSize: "32px", marginBottom: "16px" }}>{item.icon}</div>
            <div style={{ fontSize: "17px", fontWeight: 700, color: "#fff", marginBottom: "8px" }}>{item.title}</div>
            <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>{item.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}`,

    "/Footer.js": `import React from 'react';
export default function Footer() {
  return (
    <footer style={{ padding: "60px 80px 40px", borderTop: "1px solid rgba(255,255,255,0.07)",
                     display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
      <div>
        <div style={{ fontSize: "18px", fontWeight: 800, letterSpacing: "-0.04em", marginBottom: "6px",
                      background: "linear-gradient(135deg, ${primary}, ${colors[1]})",
                      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>${name}</div>
        <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>${brief?.tagline || ""}</div>
      </div>
      <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.25)" }}>
        © ${new Date().getFullYear()} ${name}. All rights reserved.
      </div>
    </footer>
  );
}`,
  };

  if (fallbacks[filePath]) return fallbacks[filePath];

  // Generic fallback for any other component
  return `import React from 'react';
export default function ${componentName}() {
  return (
    <section style={{ padding: "100px 80px", color: "#fff" }}>
      <h2 style={{ fontSize: "clamp(32px,5vw,48px)", fontWeight: 800, letterSpacing: "-0.03em",
                   marginBottom: "24px", color: "#fff" }}>${componentName}</h2>
      <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.5)", lineHeight: 1.8 }}>
        ${brief?.businessName || "Brand"} — ${componentName} section
      </p>
    </section>
  );
}`;
}}