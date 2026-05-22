import { AzureChatOpenAI } from "@langchain/openai";

const llm = new AzureChatOpenAI({
  azureOpenAIApiKey:            process.env.AZURE_OPENAI_API_KEY,
  azureOpenAIApiInstanceName:   process.env.AZURE_OPENAI_ENDPOINT,
  azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  azureOpenAIApiVersion:        process.env.AZURE_OPENAI_API_VERSION,
  temperature: 0.5,
  maxTokens: 4000,
});

// File-specific generation prompts
function getFilePrompt(filePath, brief, existingFiles) {
  const colors = brief?.colorPalette || ["#7c3aed", "#06b6d4", "#0a0a0f"];
  const primary   = colors[0];
  const secondary = colors[1];
  const bg        = colors[2] || "#0a0a0f";
  const name      = brief?.businessName || "Brand";
  const tagline   = brief?.tagline || "";
  const type      = brief?.businessType || "business";

  const baseRules = `
RULES:
- Return ONLY raw JavaScript/JSX code
- NO markdown, NO backticks, NO explanations
- Use ONLY inline styles: style={{ color: "red" }}
- NO className, NO Tailwind, NO external CSS
- Import React from 'react' at the top
- Export default the component
- Use React.useState (not useState) for interactivity
- All imports must use './' prefix and '.js' extension: import Hero from './Hero.js'
- Only import files that exist: ${existingFiles.join(", ")}
- Colors: primary=${primary}, secondary=${secondary}, background=${bg}
- Business: ${name} — ${type} — "${tagline}"
`;

  const filePrompts = {
    "/Navbar.js": `${baseRules}
Generate a stunning sticky Navbar component for ${name}.
Must include:
- Logo on left (use gradient text with primary color)
- Nav links in middle: real links relevant to ${type}
- CTA button on right with gradient background and glow shadow
- React.useState for hover effects on each link
- Frosted glass effect: background rgba(5,5,15,0.9), backdropFilter blur(20px)
- borderBottom 1px solid rgba(255,255,255,0.07)
- position sticky, top 0, zIndex 100`,

    "/Hero.js": `${baseRules}
Generate a cinematic full-viewport Hero section for ${name}.
Must include:
- Large headline: clamp(52px, 8vw, 100px), fontWeight 800, letterSpacing -0.05em
- Gradient text on key words using ${primary} → ${secondary}
- Subheadline: real description of ${type}, 18px, opacity 0.55
- Two CTA buttons: primary (gradient bg, glow shadow) + secondary (transparent border)
- Ambient glow decoration: position absolute div with radial-gradient using ${primary} at 8% opacity
- React.useState for button hover with transform translateY(-2px)
- background: ${bg}
- Real specific content for ${name} — no placeholders`,

    "/Features.js": `${baseRules}
Generate a Features/Services section for ${name} (${type}).
Must include:
- Section eyebrow label: small uppercase text in ${primary}
- Section headline: clamp(32px, 5vw, 56px)
- Grid of 3-6 feature cards with: emoji icon, bold title, 2-line description
- ALL feature content must be REAL and SPECIFIC to ${type}
- Card style: background rgba(255,255,255,0.03), border 1px solid rgba(255,255,255,0.08), borderRadius 20px
- React.useState for card hover: translateY(-4px) + border brightens
- padding 100px 80px
- Use real features from: ${(brief?.keyFeatures || []).join(", ")}`,

    "/Pricing.js": `${baseRules}
Generate a Pricing section with 3 tiers for ${name}.
Must include:
- Free, Pro, Enterprise (or equivalent for ${type})
- Real prices and real feature lists
- Most popular badge on Pro plan
- CTA button on each card
- Highlighted card with gradient border for popular plan
- React.useState for hover effects`,

    "/DashboardPreview.js": `${baseRules}
Generate a realistic product dashboard preview UI for ${name} SaaS.
Must include:
- Mini sidebar with nav items
- Main content area with stats cards (real numbers)
- A chart representation using divs (bar chart or line chart using CSS)
- Recent activity list
- All using inline styles
- Dark theme: background #111, cards rgba(255,255,255,0.05)
- This is a VISUAL MOCKUP — no real data needed, but must look realistic`,

    "/Projects.js": `${baseRules}
Generate a Projects/Work section for ${name} portfolio.
Must include:
- Grid of 4 project cards
- Each card: project name, type tag, short description, tech tags
- Hover: card lifts with shadow
- Category filter buttons (All, Design, Development, etc.)
- React.useState for filter + hover`,

    "/About.js": `${baseRules}
Generate an About section for ${name}.
Must include:
- Split layout: text left, stats/visual right
- Real story text for ${type}
- 3-4 stat cards with numbers (relevant to ${type})
- Skill chips or highlights
- background slightly different from main bg`,

    "/CTA.js": `${baseRules}
Generate a CTA (Call to Action) section for ${name}.
Must include:
- Large headline: "Ready to get started?" or equivalent for ${type}
- Subtext
- Email input + button OR single large CTA button
- Background: gradient using ${primary} at low opacity
- Decorative elements`,

    "/Contact.js": `${baseRules}
Generate a Contact section for ${name}.
Must include:
- Contact form: name, email, message fields
- Real inline styles for form inputs (dark bg, border, focus state via React.useState)
- Contact info: email, location, social links as text
- Split layout`,

    "/Footer.js": `${baseRules}
Generate a complete Footer for ${name}.
Must include:
- Logo + tagline top left
- 2-3 link columns with real relevant links for ${type}
- Bottom bar: copyright + "Made with AgentIQ"
- borderTop 1px solid rgba(255,255,255,0.07)
- padding 80px 80px 40px`,

    "/App.js": `${baseRules}
Generate the main App.js that imports and assembles all components.
Available components to import: ${existingFiles.filter(f => f !== "/App.js").join(", ")}

MUST:
- Import React from 'react'
- Import each available component using: import ComponentName from './ComponentName.js'
- Render all components in logical order inside a div
- Root div style: background ${bg}, minHeight "100vh", fontFamily "Inter, system-ui, sans-serif", color "#fff"
- Import and use ALL available components — do not skip any`,
  };

  // Return specific prompt if we have one, otherwise generic
  return filePrompts[filePath] || `${baseRules}
Generate the ${filePath} component for ${name} (${type}).
Make it visually stunning, premium quality, with real specific content.
Export default the component.`;
}

export async function fileGeneratorNode(state) {
  const { brief, generationQueue } = state;

  if (!generationQueue || generationQueue.length === 0) {
    return {
      generatedFiles: {},
      websiteRaw: JSON.stringify({ files: {} }),
      currentStep: "fileGenerator",
      steps: ["⚡ Files: No queue found"],
    };
  }

  const allGeneratedFiles = {};

  for (const filePath of generationQueue) {
    const existingFilePaths = Object.keys(allGeneratedFiles);

    try {
      const prompt = getFilePrompt(filePath, brief, existingFilePaths);

      const response = await llm.invoke([
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: `Generate the file: ${filePath}
Return ONLY the raw code. No markdown. No backticks. No explanations.`,
        },
      ]);

      let code = response.content.trim();

      // Strip any accidental markdown fences
      code = code
        .replace(/^```(?:jsx?|javascript)?\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

      // Basic sanity check — must have some real content
      if (code.length > 50) {
        allGeneratedFiles[filePath] = code;
        console.log(`✅ Generated ${filePath} (${code.length} chars)`);
      } else {
        console.warn(`⚠️ ${filePath} too short (${code.length} chars) — using fallback`);
        allGeneratedFiles[filePath] = generateFallback(filePath, brief);
      }

    } catch (err) {
      console.error(`❌ Failed to generate ${filePath}:`, err.message);
      allGeneratedFiles[filePath] = generateFallback(filePath, brief);
    }
  }

  console.log("Generated files:", Object.keys(allGeneratedFiles));

  return {
    generatedFiles: allGeneratedFiles,           // merge reducer accumulates
    websiteRaw: JSON.stringify({ files: allGeneratedFiles }),
    currentStep: "fileGenerator",
    steps: [`⚡ Files: Generated ${Object.keys(allGeneratedFiles).length} files`],
  };
}

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
      .map((f, i) => ({ icon: ["🎯","⚡","🔥","✨","🚀","💎"][i], title: f, desc: `Everything you need for ${f.toLowerCase()}.` }))
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
}