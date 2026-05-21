// src/graph/nodes/websiteGenerator.js
import { AzureChatOpenAI } from "@langchain/openai";
import { BASE_SYSTEM_PROMPT } from "../prompts/website/baseSystemPrompt.js";
import { DESIGN_RULES } from "../prompts/website/designRules.js";
import { PREMIUM_REFERENCES } from "../prompts/website/premiumRefrences.js";

const llm = new AzureChatOpenAI({
  azureOpenAIApiKey:            process.env.AZURE_OPENAI_API_KEY,
  azureOpenAIApiInstanceName:   process.env.AZURE_OPENAI_ENDPOINT,
  azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  azureOpenAIApiVersion:        process.env.AZURE_OPENAI_API_VERSION,
  temperature: 0.9,
  maxTokens: 16000,
});

export async function websiteGeneratorNode(state) {
  const { brief, researchContext } = state;

  const colors = brief?.colorPalette || ["#7c3aed", "#06b6d4", "#0a0a0f"];
  const primary   = colors[0];
  const secondary = colors[1];
  const bgColor   = colors[2] || "#0a0a0f";

  const response = await llm.invoke([
    {
      role: "system",
      content: `
${BASE_SYSTEM_PROMPT}
${DESIGN_RULES}
${PREMIUM_REFERENCES}

OUTPUT FORMAT — return ONLY this JSON shape, nothing else:
{
  "files": {
    "/App.js": "...",
    "/Navbar.jsx": "...",
    "/Hero.jsx": "...",
    "/Features.jsx": "...",
    "/Footer.jsx": "..."
  }
}
CRITICAL ARCHITECTURE RULES:

- Every imported component MUST exist in the files object
- Never reference components that were not generated
- If App.jsx imports Features.jsx, then Features.jsx MUST exist
- If a component is used, create its file
- Keep imports perfectly consistent
- Double-check all file references before returning JSON
- Never hallucinate component names

Before returning JSON:
- verify all imports are valid
- verify all file paths exist
- verify every component used is generated

ALL components MUST live inside:

/src/components/

Example:
- /src/components/Navbar.jsx
- /src/components/Hero.jsx
- /src/components/Features.jsx

App.jsx must import from:
"./components/Navbar"

MINIMUM REQUIRED FILES:

/src/main.jsx
/src/App.jsx
/src/components/Navbar.jsx
/src/components/Hero.jsx
/src/components/Footer.jsx

Optional:
- Features.jsx
- Testimonials.jsx
- Pricing.jsx
- FAQ.jsx
- Gallery.jsx


SANDPACK IMPORT RULES — THIS IS CRITICAL:
All files live at the ROOT level. Imports must use "./" prefix only.

CORRECT imports:
  import Navbar from './Navbar';
  import Hero from './Hero';
  import Features from './Features';
  import Footer from './Footer';

WRONG imports (will break preview):
  import Navbar from '../components/Navbar';   ← NEVER do this
  import Navbar from './components/Navbar';    ← NEVER do this
  import Navbar from './src/Navbar';           ← NEVER do this

FILE CONTENTS:

/App.js — entry point, imports and renders Home layout:
import React from 'react';
import Navbar from './Navbar';
import Hero from './Hero';
import Features from './Features';
import Footer from './Footer';

export default function App() {
  return (
    <div style={{ background: "${bgColor}", minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Navbar />
      <Hero />
      <Features />
      <Footer />
    </div>
  );
}

/Navbar.jsx — complete sticky navbar with brand name, nav links, CTA button:
import React from 'react';
export default function Navbar() {
  // all styles as const styles = {} object
  // use React.useState for hover effects
  // return full real navbar JSX
}

/Hero.jsx — complete hero section with headline, subtext, CTA, decorative elements:
import React from 'react';
export default function Hero() {
  // all styles as const styles = {}
  // full real hero — NOT a placeholder
}

/Features.jsx — complete features/services/menu section with real items for this business:
import React from 'react';
export default function Features() {
  // real data array with actual items for THIS business
  // all styles as const styles = {}
}

/Footer.jsx — complete footer with brand, links, copyright:
import React from 'react';
export default function Footer() {
  // full real footer
}

STYLING — INLINE STYLES ONLY:
- Use style={{ }} on every element — NO className, NO Tailwind, NO CSS files
- Define a const styles = { key: { ...styleObject } } at top of each component
- Use clamp() for font sizes: fontSize: "clamp(48px, 8vw, 96px)"
- Tight letterSpacing on headings: letterSpacing: "-0.05em"
- Gradient text: { background: "linear-gradient(135deg, ${primary}, ${secondary})", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }
- Buttons: borderRadius "100px", background gradient, boxShadow glow
- Cards: background "rgba(255,255,255,0.03)", border "1px solid rgba(255,255,255,0.08)", borderRadius "20px"
- Use React.useState + onMouseEnter/onMouseLeave for hover effects
- Ambient glow: position absolute divs with radial-gradient, pointerEvents none

CONTENT RULES:
- All text must be REAL and SPECIFIC to this exact business
- No "Lorem ipsum", no "[PLACEHOLDER]", no "Feature 1"
- Hero headline must be a real compelling headline for this business
- Features must list real specific offerings of this business
- Colors must match the brand palette exactly

Return ONLY valid JSON. No markdown. No backticks. No explanation.
`,
    },
    {
      role: "user",
      content: `Generate a complete, Awwwards-quality multi-file React website.

      The website must feel handcrafted and unique.

Different businesses MUST produce:
- different layouts
- different visual systems
- different typography styles
- different section flows
- different UI structures

Avoid repetitive AI patterns.
Avoid generic startup layouts.
Avoid identical section ordering.

MANDATORY PREMIUM FEATURES:
- immersive hero section
- layered visuals
- animated glow systems
- hover interactions
- floating elements
- premium CTA sections
- realistic product visuals
- believable UI mockups
- visual storytelling

BUSINESS:
- Name: ${brief?.businessName || "The Business"}
- Type: ${brief?.businessType || "business"}
- Tagline: ${brief?.tagline || ""}
- Tone: ${brief?.tone || "modern and professional"}
- Audience: ${brief?.targetAudience || "general"}
- Key features: ${(brief?.keyFeatures || []).join(", ")}
- Sections: ${(brief?.sections || ["Hero", "About", "Features", "Contact"]).join(", ")}

COLORS:
- Primary: ${primary}
- Secondary: ${secondary}
- Background: ${bgColor}

MARKET RESEARCH:
${researchContext || "Use general knowledge for this business type."}

Return ONLY the JSON. Flat file paths (/Navbar.jsx not /src/components/Navbar.jsx).
All imports use './ComponentName'. All styles inline. All content real.

Use:

ANIMATIONS:
- Use Framer Motion
- Add smooth reveal animations
- Add hover interactions
- Add floating ambient elements
- Use premium transitions`,
    },
  ]);

  let websiteRaw;

  try {
    const text = response.content
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const parsed = JSON.parse(text);

    if (!parsed?.files || typeof parsed.files !== "object") {
      throw new Error("No files key");
    }

    // Fix any deep paths the LLM might have used despite instructions
    // e.g. "/src/components/Navbar.jsx" → "/Navbar.jsx"
    const fixedFiles = {};
    for (const [path, content] of Object.entries(parsed.files)) {
      // Extract just the filename and put it at root
      const filename = path.split("/").pop(); // "Navbar.jsx"
      const rootPath = `/${filename}`;        // "/Navbar.jsx"
      // Fix imports inside the file too
      const fixedContent = (content || "")
        .replace(/from ['"]\.\.\/components\//g, "from './")
        .replace(/from ['"]\.\/components\//g, "from './")
        .replace(/from ['"]\.\.\/pages\//g, "from './")
        .replace(/from ['"]\.\/pages\//g, "from './")
        .replace(/from ['"]\.\.\/src\//g, "from './")
        .replace(/from ['"]\.\/src\//g, "from './");

      fixedFiles[rootPath] = fixedContent;
    }

    // Make sure App.js exists
    if (!fixedFiles["/App.js"] && !fixedFiles["/App.jsx"]) {
      throw new Error("No App.js in response");
    }

    websiteRaw = JSON.stringify({ files: fixedFiles });

  } catch (err) {
    console.warn("websiteGenerator failed:", err.message);

    // Fallback — complete multi-file website with flat paths
    websiteRaw = JSON.stringify({
      files: {
        "/App.js": `import React from 'react';
import Navbar from './Navbar';
import Hero from './Hero';
import Features from './Features';
import Footer from './Footer';

export default function App() {
  return (
    <div style={{ background: "${bgColor}", minHeight: "100vh", fontFamily: "system-ui, sans-serif", color: "#fff" }}>
      <Navbar />
      <Hero />
      <Features />
      <Footer />
    </div>
  );
}`,

        "/Navbar.jsx": `import React from 'react';
export default function Navbar() {
  const [hovered, setHovered] = React.useState(null);
  const links = ["About", "Features", "Contact"];
  return (
    <nav style={{ position: "sticky", top: 0, display: "flex", justifyContent: "space-between",
                  alignItems: "center", padding: "20px 48px", background: "rgba(5,5,15,0.92)",
                  backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.07)", zIndex: 100 }}>
      <div style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.04em",
                    background: "linear-gradient(135deg, ${primary}, ${secondary})",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        ${brief?.businessName || "Brand"}
      </div>
      <div style={{ display: "flex", gap: "32px" }}>
        {links.map(l => (
          <span key={l} onMouseEnter={() => setHovered(l)} onMouseLeave={() => setHovered(null)}
                style={{ fontSize: "14px", cursor: "pointer", transition: "color 0.2s",
                         color: hovered === l ? "#fff" : "rgba(255,255,255,0.45)" }}>{l}</span>
        ))}
      </div>
      <button style={{ padding: "10px 24px", borderRadius: "100px", border: "none",
                       background: "linear-gradient(135deg, ${primary}, ${secondary})",
                       color: "#fff", fontWeight: 700, fontSize: "13px", cursor: "pointer",
                       boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }}>Get Started</button>
    </nav>
  );
}`,

        "/Hero.jsx": `import React from 'react';
export default function Hero() {
  const [btnH, setBtnH] = React.useState(false);
  return (
    <section style={{ minHeight: "90vh", display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center", textAlign: "center",
                      padding: "80px 40px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)",
                    width: "700px", height: "500px", borderRadius: "50%",
                    background: "radial-gradient(ellipse, rgba(124,58,237,0.1) 0%, transparent 70%)",
                    pointerEvents: "none" }} />
      <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "32px",
                    background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)",
                    borderRadius: "100px", padding: "6px 18px", fontSize: "12px",
                    color: "${primary}", letterSpacing: "2px", textTransform: "uppercase", fontWeight: 700 }}>
        ✦ Now Live
      </div>
      <h1 style={{ fontSize: "clamp(48px, 8vw, 100px)", fontWeight: 800, letterSpacing: "-0.05em",
                   lineHeight: 0.95, marginBottom: "28px", maxWidth: "800px",
                   background: "linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.6) 100%)",
                   WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        ${brief?.tagline || brief?.businessName || "Something Amazing"}
      </h1>
      <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.5)", maxWidth: "500px",
                  lineHeight: 1.8, marginBottom: "44px", fontWeight: 300 }}>
        ${brief?.businessType ? `The best ${brief.businessType} experience, built for ${brief?.targetAudience || "everyone"}.` : "Built with purpose. Designed for impact."}
      </p>
      <div style={{ display: "flex", gap: "16px" }}>
        <button onMouseEnter={() => setBtnH(true)} onMouseLeave={() => setBtnH(false)}
                style={{ padding: "15px 36px", borderRadius: "100px", border: "none",
                         background: "linear-gradient(135deg, ${primary}, ${secondary})",
                         color: "#fff", fontSize: "15px", fontWeight: 700, cursor: "pointer",
                         transform: btnH ? "translateY(-2px)" : "translateY(0)",
                         boxShadow: btnH ? "0 12px 40px rgba(124,58,237,0.5)" : "0 6px 24px rgba(124,58,237,0.35)",
                         transition: "all 0.2s" }}>Get Started →</button>
        <button style={{ padding: "15px 36px", borderRadius: "100px",
                         border: "1px solid rgba(255,255,255,0.12)", background: "transparent",
                         color: "rgba(255,255,255,0.7)", fontSize: "15px", cursor: "pointer" }}>
          Learn More
        </button>
      </div>
    </section>
  );
}`,

        "/Features.jsx": `import React from 'react';
export default function Features() {
  const [hovered, setHovered] = React.useState(null);
  const items = ${JSON.stringify(
    (brief?.keyFeatures || ["Core Feature", "Key Benefit", "Main Service"])
      .slice(0, 6)
      .map((f, i) => ({
        icon: ["🎯", "⚡", "🔥", "✨", "🚀", "💎"][i] || "✦",
        title: f,
        desc: `Everything you need for ${f.toLowerCase()} — built to work seamlessly.`,
      }))
  )};
  return (
    <section style={{ padding: "100px 80px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "72px" }}>
        <div style={{ fontSize: "11px", color: "${primary}", letterSpacing: "3px",
                      textTransform: "uppercase", fontWeight: 700, marginBottom: "16px" }}>
          Features
        </div>
        <h2 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 800,
                     letterSpacing: "-0.04em", lineHeight: 1.1, color: "#fff" }}>
          Everything you need
        </h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
        {items.map((item, i) => (
          <div key={i}
               onMouseEnter={() => setHovered(i)}
               onMouseLeave={() => setHovered(null)}
               style={{ padding: "32px", borderRadius: "20px", cursor: "pointer",
                        background: hovered === i ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
                        border: hovered === i ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.07)",
                        transform: hovered === i ? "translateY(-4px)" : "translateY(0)",
                        transition: "all 0.25s" }}>
            <div style={{ fontSize: "32px", marginBottom: "16px" }}>{item.icon}</div>
            <div style={{ fontSize: "17px", fontWeight: 700, color: "#fff",
                          letterSpacing: "-0.02em", marginBottom: "8px" }}>{item.title}</div>
            <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>{item.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}`,

        "/Footer.jsx": `import React from 'react';
export default function Footer() {
  return (
    <footer style={{ padding: "60px 80px 40px", borderTop: "1px solid rgba(255,255,255,0.07)",
                     display: "flex", justifyContent: "space-between", alignItems: "center",
                     flexWrap: "wrap", gap: "24px" }}>
      <div>
        <div style={{ fontSize: "18px", fontWeight: 800, letterSpacing: "-0.04em",
                      background: "linear-gradient(135deg, ${primary}, ${secondary})",
                      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                      marginBottom: "8px" }}>
          ${brief?.businessName || "Brand"}
        </div>
        <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>
          ${brief?.tagline || ""}
        </div>
      </div>
      <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.25)" }}>
        © ${new Date().getFullYear()} ${brief?.businessName || "Brand"}. All rights reserved.
      </div>
    </footer>
  );
}`,
      },
    });
  }

  return {
    websiteRaw,
    currentStep: "websiteGenerator",
    steps: ["⚡ Website: Draft generated"],
  };
}