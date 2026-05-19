import { AzureChatOpenAI } from "@langchain/openai";

const llm = new AzureChatOpenAI({
  azureOpenAIApiKey:            process.env.AZURE_OPENAI_API_KEY,
  azureOpenAIApiInstanceName:   process.env.AZURE_OPENAI_ENDPOINT,
  azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  azureOpenAIApiVersion:        process.env.AZURE_OPENAI_API_VERSION,
  temperature: 0.7,
  maxTokens: 8000,
});

// ─── BASE SYSTEM PROMPT ──────────────────────────────────────────────────────
// This is injected for every website generation regardless of business type.
// It defines the visual bar, the rules, and what "good" looks like.

const BASE_SYSTEM_PROMPT = `
You are a world-class product designer, creative director, and senior React engineer.
You have studied every site on Awwwards, Behance, Dribbble, and the following design references:

DESIGN REFERENCES (internalize these aesthetics):
- Linear.app       → dark, sharp, editorial, utility-first
- Stripe.com       → trusted, clean, layered depth, micro-detail
- Framer.com       → motion-forward, bold typography, asymmetric
- Raycast.com      → dark premium, gradient glows, minimal chrome
- Vercel.com       → stark contrast, code-meets-design
- Apple.com        → cinematic hero, product-centric, restrained
- Notion.com       → editorial, generous whitespace, content-first
- Arc Browser      → playful premium, color-smart, personality

YOUR VISUAL RULES (non-negotiable):

TYPOGRAPHY:
- Use clamp() for all font sizes. Hero: clamp(56px, 9vw, 120px). Section titles: clamp(32px, 5vw, 64px).
- Tight letter-spacing on big headings: letterSpacing: "-0.04em"
- Line height on big headings: lineHeight: 0.92 to 1.0
- Body text: 400 weight, lineHeight: 1.8, color at 55-65% opacity
- Labels / eyebrows: 11px, letterSpacing: "2.5px", textTransform: "uppercase", fontWeight: 700

LAYOUT:
- Never center everything. Mix: left-aligned hero, split-screen sections, full-bleed moments
- Use asymmetric grids: gridTemplateColumns: "1.2fr 0.8fr" or "0.7fr 1.3fr"
- Generous padding: sections get 100px-140px top/bottom
- Max content width: 1200px centered with margin: "0 auto"
- Bento grids for feature sections: gridTemplateColumns: "repeat(3,1fr)" with one card spanning 2 cols

DEPTH & ATMOSPHERE:
- Background: near-black (#050508, #07070f, #040404) — never pure white or generic gray
- Surface cards: rgba(255,255,255,0.03) with border: "1px solid rgba(255,255,255,0.07)"
- Glow effects: radial-gradient circles positioned in corners/behind elements as decoration
- Use position:"absolute" decorative elements (blobs, grids, lines) with pointerEvents:"none"
- Subtle grain: add a noise texture div with fixed positioning and 3% opacity

COLOR USAGE:
- Pick ONE hero accent color from the brief's palette. Use it for: CTAs, highlights, borders, glows
- Secondary accent used sparingly — gradient blends, hover states
- Never use 5 different colors randomly. Max 2 accent colors + neutrals
- Gradient text for key headline words: background + WebkitBackgroundClip:"text" + WebkitTextFillColor:"transparent"

COMPONENTS THAT MUST FEEL PREMIUM:
- Navbar: frosted glass (background: rgba(5,5,8,0.7), backdropFilter: "blur(20px)"), sticky, borderBottom: "1px solid rgba(255,255,255,0.06)"
- Buttons: pill shape (borderRadius:"100px"), gradient background, box-shadow glow matching accent color
- Cards: dark surface, subtle border, hover lifts (transform:"translateY(-4px)") with transition
- Section eyebrows: small label above every section title — styled like: "[ ABOUT ]" or "— 01 FEATURES"
- Footer: full-width dark section with large "let's work together" CTA, not just a sitemap

THINGS YOU MUST NEVER DO:
- No centered hero with a generic gradient background blob
- No rounded rectangle image placeholders with gray fills
- No "Feature 1, Feature 2, Feature 3" — real specific content only
- No generic blue (#3b82f6) or purple (#8b5cf6) unless it's in the brief palette
- No equal-spaced 3-column feature grids that look like every SaaS template from 2020
- No Lorem ipsum — ever
- No comic sans, papyrus, or system serif fonts for design-forward sites
- No white backgrounds unless the brief explicitly requests a light theme
- No shadows that look like drop-shadow(2px 2px 4px black)

TECHNICAL RULES:
- Output starts EXACTLY with: export default function App() {
- No markdown fences, no imports, no extra export statements
- Use React.useState (NOT useState) — React is a global, no imports available
- All styles are inline JS objects
- Hooks must be inside the component
- No browser APIs that might fail (no window.location, no document.querySelector)
- No external libraries — inline styles only
- Animations: use CSS keyframes injected via a <style> tag inside the JSX return

CONTENT ACCURACY RULES (EXTREMELY IMPORTANT):

You MUST use the user's provided information EXACTLY.

Never invent:
- fake skills
- fake tech stacks
- fake testimonials
- fake experience
- fake companies
- fake internships
- fake metrics
- fake achievements
- fake education
- fake project names

If the user did NOT mention something:
- omit it
- or keep it vague/minimal

DO NOT assume developers know:
- React
- JavaScript
- Figma
- UI/UX
- coding
- tools
unless explicitly mentioned.

If generating a portfolio:
- prioritize the user's real identity
- real goals
- real education
- real interests
- real project types
- real personality
over generic portfolio content.

The website should feel custom-made for THIS person,
not a template filled with fake content.
PORTFOLIO PHILOSOPHY:

Do not generate a resume-style developer portfolio unless explicitly requested.

For creative portfolios:
- prioritize mood
- typography
- storytelling
- visual identity
- editorial layouts
- cinematic sections
- atmosphere

over:
- dashboards
- metrics
- skill percentages
- tech stacks
- enterprise SaaS aesthetics

The site should feel personal and emotionally designed,
not corporate.

Choose sections dynamically based on the user's actual information.

If the user provides:
- projects → showcase projects
- education → include education
- internship goals → include availability section
- design interests → create visual storytelling sections
- minimal information → keep the site atmospheric and minimal instead of inventing fake content.
The website should feel custom-made for THIS person,
not a template filled with fake content.
`;

// ─── LAYOUT TEMPLATES ────────────────────────────────────────────────────────
// These give Claude a structural skeleton to fill in.
// Claude replaces all [PLACEHOLDER] values with real content.

const SAAS_TEMPLATE = `
LAYOUT TEMPLATE FOR SAAS / SOFTWARE / TOOL:

export default function App() {
  const [hoveredFeature, setHoveredFeature] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState(0);

  const styles = {
    page: { background: "[BG_COLOR]", color: "[TEXT_COLOR]", fontFamily: "'Inter', system-ui, sans-serif" },
    nav: { position:"sticky", top:0, display:"flex", justifyContent:"space-between", alignItems:"center",
           padding:"20px 48px", background:"rgba([BG_RGB],0.8)", backdropFilter:"blur(20px)",
           borderBottom:"1px solid rgba(255,255,255,0.06)", zIndex:100 },
    hero: { padding:"160px 80px 120px", maxWidth:"1200px", margin:"0 auto",
            display:"grid", gridTemplateColumns:"1.1fr 0.9fr", gap:"80px", alignItems:"center" },
    heroTitle: { fontSize:"clamp(56px,9vw,110px)", fontWeight:800, lineHeight:0.92,
                 letterSpacing:"-0.05em", marginBottom:"28px" },
    heroSub: { fontSize:"18px", color:"rgba([TEXT_RGB],0.5)", lineHeight:1.8,
               fontWeight:300, marginBottom:"40px", maxWidth:"480px" },
    mockup: { background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)",
              borderRadius:"24px", padding:"24px", minHeight:"380px",
              display:"flex", flexDirection:"column", gap:"12px" },
    bento: { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"20px",
             maxWidth:"1200px", margin:"0 auto" },
    bentoCard: { background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)",
                 borderRadius:"24px", padding:"32px" },
    bentoWide: { gridColumn:"span 2", background:"rgba(255,255,255,0.03)",
                 border:"1px solid rgba(255,255,255,0.07)", borderRadius:"24px", padding:"32px" },
    pricingGrid: { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"20px",
                   maxWidth:"1000px", margin:"0 auto" },
  };

  return (
    <div style={styles.page}>
      <style>{\`
        @keyframes glow { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
        * { box-sizing:border-box; margin:0; padding:0; }
        a { text-decoration:none; color:inherit; }
      \`}</style>

      {/* Ambient glow decoration */}
      <div style={{position:"fixed",top:"10%",left:"20%",width:"600px",height:"600px",
                   borderRadius:"50%",background:"radial-gradient(circle,rgba([ACCENT_RGB],0.07) 0%,transparent 70%)",
                   pointerEvents:"none",zIndex:0,animation:"glow 4s ease-in-out infinite"}} />

      {/* NAV */}
      <nav style={styles.nav}>
        <div style={{fontWeight:800,fontSize:"18px",letterSpacing:"-0.03em"}}>[LOGO]</div>
        <div style={{display:"flex",gap:"32px",fontSize:"14px",color:"rgba([TEXT_RGB],0.5)"}}>
          {["Product","Pricing","Docs","Blog"].map(l=><a key={l} href="#">{l}</a>)}
        </div>
        <div style={{display:"flex",gap:"12px"}}>
          <button style={{padding:"9px 22px",borderRadius:"100px",border:"1px solid rgba(255,255,255,0.12)",
                          background:"transparent",color:"rgba([TEXT_RGB],0.7)",fontSize:"13px",cursor:"pointer"}}>
            Log in
          </button>
          <button style={{padding:"9px 22px",borderRadius:"100px",border:"none",
                          background:"[ACCENT_COLOR]",color:"#fff",fontSize:"13px",fontWeight:700,cursor:"pointer",
                          boxShadow:"0 4px 20px rgba([ACCENT_RGB],0.4)"}}>
            Get started →
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{maxWidth:"1200px",margin:"0 auto",padding:"160px 80px 120px",
                       display:"grid",gridTemplateColumns:"1.1fr 0.9fr",gap:"80px",alignItems:"center",position:"relative",zIndex:1}}>
        <div>
          <div style={{display:"inline-flex",alignItems:"center",gap:"8px",
                       background:"rgba([ACCENT_RGB],0.1)",border:"1px solid rgba([ACCENT_RGB],0.25)",
                       borderRadius:"100px",padding:"6px 16px",fontSize:"12px",color:"[ACCENT_COLOR]",
                       letterSpacing:"2px",textTransform:"uppercase",fontWeight:700,marginBottom:"32px"}}>
            [EYEBROW_TEXT]
          </div>
          <h1 style={styles.heroTitle}>
            [HEADLINE_LINE_1]<br />
            <span style={{background:"linear-gradient(135deg,[ACCENT_COLOR],[SECONDARY_COLOR])",
                          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              [HEADLINE_LINE_2]
            </span>
          </h1>
          <p style={styles.heroSub}>[HERO_DESCRIPTION]</p>
          <div style={{display:"flex",gap:"14px",alignItems:"center"}}>
            <button style={{padding:"14px 32px",borderRadius:"100px",border:"none",
                            background:"linear-gradient(135deg,[ACCENT_COLOR],[SECONDARY_COLOR])",
                            color:"#fff",fontSize:"15px",fontWeight:700,cursor:"pointer",
                            boxShadow:"0 8px 32px rgba([ACCENT_RGB],0.4)"}}>
              [PRIMARY_CTA]
            </button>
            <button style={{padding:"14px 32px",borderRadius:"100px",
                            border:"1px solid rgba(255,255,255,0.12)",background:"transparent",
                            color:"rgba([TEXT_RGB],0.7)",fontSize:"15px",cursor:"pointer"}}>
              [SECONDARY_CTA]
            </button>
          </div>
        </div>
        {/* Product mockup / dashboard preview */}
        <div style={styles.mockup}>
          [PRODUCT_UI_MOCKUP — build a mini realistic dashboard/preview using divs, not an image placeholder]
        </div>
      </section>

      {/* BENTO FEATURES */}
      <section style={{padding:"100px 80px",position:"relative",zIndex:1}}>
        <div style={{textAlign:"center",marginBottom:"72px"}}>
          <div style={{fontSize:"11px",color:"[ACCENT_COLOR]",letterSpacing:"2.5px",textTransform:"uppercase",fontWeight:700,marginBottom:"16px"}}>[ FEATURES ]</div>
          <h2 style={{fontSize:"clamp(32px,5vw,56px)",fontWeight:800,letterSpacing:"-0.03em",lineHeight:1.1}}>
            [FEATURES_HEADLINE]
          </h2>
        </div>
        <div style={styles.bento}>
          [6 BENTO CARDS — mix sizes, one spans 2 columns, real feature content per card with emoji icon + title + 2-line desc]
        </div>
      </section>

      {/* PRICING */}
      <section style={{padding:"100px 80px",background:"rgba(255,255,255,0.01)"}}>
        <div style={{textAlign:"center",marginBottom:"72px"}}>
          <div style={{fontSize:"11px",color:"[ACCENT_COLOR]",letterSpacing:"2.5px",textTransform:"uppercase",fontWeight:700,marginBottom:"16px"}}>[ PRICING ]</div>
          <h2 style={{fontSize:"clamp(32px,5vw,56px)",fontWeight:800,letterSpacing:"-0.03em"}}>
            [PRICING_HEADLINE]
          </h2>
        </div>
        <div style={styles.pricingGrid}>
          [3 PRICING CARDS — Free / Pro / Enterprise — real features, real prices]
        </div>
      </section>

      {/* FOOTER CTA */}
      <footer style={{padding:"120px 80px",textAlign:"center",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
        <h2 style={{fontSize:"clamp(40px,7vw,80px)",fontWeight:800,letterSpacing:"-0.04em",lineHeight:1.0,marginBottom:"24px"}}>
          [FOOTER_CTA_HEADLINE]
        </h2>
        <p style={{fontSize:"17px",color:"rgba([TEXT_RGB],0.4)",marginBottom:"40px"}}>[FOOTER_SUB]</p>
        <button style={{padding:"16px 40px",borderRadius:"100px",border:"none",
                        background:"linear-gradient(135deg,[ACCENT_COLOR],[SECONDARY_COLOR])",
                        color:"#fff",fontSize:"16px",fontWeight:700,cursor:"pointer",
                        boxShadow:"0 8px 40px rgba([ACCENT_RGB],0.4)"}}>
          [FOOTER_BUTTON]
        </button>
      </footer>
    </div>
  );
}
`;

const LIFESTYLE_TEMPLATE = `
LAYOUT TEMPLATE FOR COFFEE SHOP / RESTAURANT / VENUE / FITNESS / BOUTIQUE / ANY LIFESTYLE BUSINESS:

export default function App() {
  const [hoveredItem, setHoveredItem] = React.useState(null);

  return (
    <div style={{background:"[BG_COLOR]",color:"[TEXT_COLOR]",fontFamily:"'Inter',system-ui,sans-serif"}}>
      <style>{\`
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        * { box-sizing:border-box; margin:0; padding:0; }
        a { text-decoration:none; color:inherit; }
      \`}</style>

      {/* NAV */}
      <nav style={{position:"sticky",top:0,display:"flex",justifyContent:"space-between",alignItems:"center",
                   padding:"22px 48px",background:"rgba([BG_RGB],0.85)",backdropFilter:"blur(20px)",
                   borderBottom:"1px solid rgba(255,255,255,0.07)",zIndex:100}}>
        <div style={{fontWeight:800,fontSize:"20px",letterSpacing:"-0.04em"}}>[BRAND_NAME]</div>
        <div style={{display:"flex",gap:"28px",fontSize:"13px",color:"rgba([TEXT_RGB],0.5)"}}>
          {["Menu","About","Location","Contact"].map(l=><a key={l} href={"#"+l.toLowerCase()} style={{transition:"color 0.2s"}}>{l}</a>)}
        </div>
        <button style={{padding:"10px 24px",borderRadius:"100px",border:"1px solid rgba([ACCENT_RGB],0.4)",
                        background:"transparent",color:"[ACCENT_COLOR]",fontSize:"13px",fontWeight:600,cursor:"pointer"}}>
          Reserve a table
        </button>
      </nav>

      {/* HERO — full viewport, atmospheric */}
      <section style={{minHeight:"100vh",display:"flex",flexDirection:"column",justifyContent:"flex-end",
                       padding:"0 80px 80px",position:"relative",overflow:"hidden",
                       background:"linear-gradient(160deg,[BG_COLOR] 0%,rgba([ACCENT_RGB],0.15) 100%)"}}>
        {/* Decorative atmospheric elements */}
        <div style={{position:"absolute",top:0,right:0,width:"55%",height:"100%",
                     background:"rgba([ACCENT_RGB],0.04)",clipPath:"polygon(20% 0,100% 0,100% 100%,0% 100%)"}} />
        <div style={{position:"absolute",top:"20%",right:"10%",width:"320px",height:"320px",borderRadius:"50%",
                     background:"radial-gradient(circle,rgba([ACCENT_RGB],0.12) 0%,transparent 70%)",pointerEvents:"none"}} />

        <div style={{maxWidth:"700px",position:"relative",zIndex:1,animation:"fadeUp 0.8s ease both"}}>
          <div style={{fontSize:"11px",color:"[ACCENT_COLOR]",letterSpacing:"3px",textTransform:"uppercase",
                       fontWeight:700,marginBottom:"24px",display:"flex",alignItems:"center",gap:"12px"}}>
            <div style={{height:"1px",width:"32px",background:"[ACCENT_COLOR]"}} />
            [EYEBROW — e.g. "Est. 2019 · Bandra, Mumbai"]
          </div>
          <h1 style={{fontSize:"clamp(52px,8vw,100px)",fontWeight:800,lineHeight:0.95,
                      letterSpacing:"-0.04em",marginBottom:"28px"}}>
            [LINE_1]<br />
            <span style={{background:"linear-gradient(135deg,[ACCENT_COLOR],[SECONDARY_COLOR])",
                          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              [LINE_2]
            </span>
          </h1>
          <p style={{fontSize:"18px",color:"rgba([TEXT_RGB],0.55)",lineHeight:1.8,fontWeight:300,
                     maxWidth:"500px",marginBottom:"40px"}}>[HERO_DESCRIPTION]</p>
          <div style={{display:"flex",gap:"16px"}}>
            <button style={{padding:"14px 32px",borderRadius:"100px",border:"none",
                            background:"linear-gradient(135deg,[ACCENT_COLOR],[SECONDARY_COLOR])",
                            color:"#fff",fontSize:"15px",fontWeight:700,cursor:"pointer",
                            boxShadow:"0 8px 32px rgba([ACCENT_RGB],0.4)"}}>[PRIMARY_CTA]</button>
            <button style={{padding:"14px 32px",borderRadius:"100px",
                            border:"1px solid rgba(255,255,255,0.15)",background:"transparent",
                            color:"rgba([TEXT_RGB],0.7)",fontSize:"15px",cursor:"pointer"}}>[SECONDARY_CTA]</button>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT SECTION — menu / services / classes / products */}
      <section id="menu" style={{padding:"100px 80px",maxWidth:"1200px",margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:"64px"}}>
          <div>
            <div style={{fontSize:"11px",color:"[ACCENT_COLOR]",letterSpacing:"2.5px",textTransform:"uppercase",fontWeight:700,marginBottom:"12px"}}>[ MENU ]</div>
            <h2 style={{fontSize:"clamp(32px,5vw,56px)",fontWeight:800,letterSpacing:"-0.03em",lineHeight:1.1}}>
              [SECTION_HEADLINE]
            </h2>
          </div>
        </div>
        [REAL CONTENT — items/services/classes with actual names, descriptions, prices. Use card grid or split layout. Never placeholders.]
      </section>

      {/* STORY / ABOUT SECTION — split screen */}
      <section id="about" style={{padding:"100px 80px",background:"rgba(255,255,255,0.01)"}}>
        <div style={{maxWidth:"1200px",margin:"0 auto",display:"grid",gridTemplateColumns:"0.9fr 1.1fr",gap:"80px",alignItems:"center"}}>
          <div>
            <div style={{fontSize:"11px",color:"[ACCENT_COLOR]",letterSpacing:"2.5px",textTransform:"uppercase",fontWeight:700,marginBottom:"16px"}}>[ OUR STORY ]</div>
            <h2 style={{fontSize:"clamp(28px,4vw,48px)",fontWeight:800,letterSpacing:"-0.03em",lineHeight:1.15,marginBottom:"24px"}}>
              [ABOUT_HEADLINE]
            </h2>
            <p style={{fontSize:"16px",color:"rgba([TEXT_RGB],0.55)",lineHeight:1.9,fontWeight:300}}>[REAL_STORY_TEXT]</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>
            [4 STAT / HIGHLIGHT CARDS — e.g. "12 Years", "Award Winning", specific numbers]
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" style={{padding:"80px 80px 48px",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{maxWidth:"1200px",margin:"0 auto",display:"grid",gridTemplateColumns:"1.5fr 1fr 1fr",gap:"60px"}}>
          <div>
            <div style={{fontWeight:800,fontSize:"22px",letterSpacing:"-0.04em",marginBottom:"16px"}}>[BRAND_NAME]</div>
            <p style={{fontSize:"14px",color:"rgba([TEXT_RGB],0.4)",lineHeight:1.8,maxWidth:"300px"}}>[FOOTER_TAGLINE]</p>
          </div>
          [2 FOOTER LINK COLUMNS — real links relevant to this business]
        </div>
        <div style={{maxWidth:"1200px",margin:"40px auto 0",paddingTop:"32px",borderTop:"1px solid rgba(255,255,255,0.05)",
                     display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:"13px",color:"rgba([TEXT_RGB],0.3)"}}>© 2025 [BRAND_NAME]. All rights reserved.</div>
          <div style={{fontSize:"13px",color:"rgba([TEXT_RGB],0.3)"}}>[LOCATION]</div>
        </div>
      </footer>
    </div>
  );
}
`;

const PORTFOLIO_TEMPLATE = `
export default function App() {

const styles = {
  page: {
    background: "#0a0a0f",
    color: "#f5f5f5",
    fontFamily: "Inter, sans-serif",
    overflowX: "hidden",
  },

  nav: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    padding: "24px clamp(20px, 4vw, 48px)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "rgba(10,10,15,0.75)",
    backdropFilter: "blur(20px)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    zIndex: 100,
    boxSizing: "border-box",
  },

  navLogo: {
    fontSize: "18px",
    fontWeight: 700,
    letterSpacing: "-0.04em",
  },

  navLinks: {
    display: "flex",
    gap: "20px",
    color: "#999",
    fontSize: "14px",
    flexWrap: "wrap",
  },

  hero: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    gap: "80px",
    alignItems: "center",
    padding: "140px 80px 80px",
  },

  heroLeft: {
    maxWidth: "700px",
  },

  heroTag: {
    fontSize: "13px",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#888",
    marginBottom: "24px",
  },

  heroTitle: {
    fontSize: "clamp(72px, 10vw, 140px)",
    lineHeight: 0.88,
    letterSpacing: "-0.08em",
    fontWeight: 800,
    marginBottom: "28px",
  },

  heroText: {
    color: "#999",
    fontSize: "18px",
    lineHeight: 1.9,
    maxWidth: "520px",
  },

  heroButtons: {
    display: "flex",
    gap: "16px",
    marginTop: "42px",
    flexWrap: "wrap",
  },

  primaryBtn: {
    padding: "14px 26px",
    borderRadius: "999px",
    background: "#fff",
    color: "#000",
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "14px",
  },

  secondaryBtn: {
    padding: "14px 26px",
    borderRadius: "999px",
    background: "transparent",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.12)",
    fontWeight: 500,
    cursor: "pointer",
    fontSize: "14px",
  },

  heroCard: {
    background: "linear-gradient(180deg, #141414 0%, #0d0d0d 100%)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "36px",
    padding: "36px",
    minHeight: "520px",
    position: "relative",
    overflow: "hidden",
  },

  glow: {
    position: "absolute",
    width: "300px",
    height: "300px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.05)",
    filter: "blur(90px)",
    top: "-120px",
    right: "-120px",
  },

  section: {
    padding: "120px 80px",
  },

  sectionLabel: {
    fontSize: "12px",
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: "#777",
    marginBottom: "18px",
  },

  sectionHeading: {
    fontSize: "clamp(42px, 5vw, 72px)",
    lineHeight: 1,
    letterSpacing: "-0.06em",
    fontWeight: 700,
    marginBottom: "24px",
  },

  muted: {
    color: "#999",
    lineHeight: 1.9,
    fontSize: "17px",
    maxWidth: "720px",
  },

  projectGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "28px",
    marginTop: "60px",
  },

  projectCard: {
    background: "#111",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "30px",
    overflow: "hidden",
    transition: "all 0.3s ease",
  },

  projectImage: {
    height: "280px",
    background: "linear-gradient(135deg, #1d1d1d, #0f0f0f)",
  },

  projectContent: {
    padding: "30px",
  },

  projectTitle: {
    fontSize: "28px",
    fontWeight: 700,
    marginBottom: "12px",
    letterSpacing: "-0.04em",
  },

  timeline: {
    marginTop: "70px",
    borderLeft: "1px solid rgba(255,255,255,0.08)",
    paddingLeft: "40px",
    display: "flex",
    flexDirection: "column",
    gap: "60px",
  },

  timelineItem: {
    position: "relative",
  },

  timelineDot: {
    width: "12px",
    height: "12px",
    borderRadius: "999px",
    background: "#fff",
    position: "absolute",
    left: "-46px",
    top: "10px",
  },

  skillGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "24px",
    marginTop: "50px",
  },

  skillCard: {
    background: "#111",
    borderRadius: "26px",
    border: "1px solid rgba(255,255,255,0.06)",
    padding: "32px",
  },

  quoteSection: {
    padding: "160px 80px",
    textAlign: "center",
  },

  quote: {
    fontSize: "clamp(38px, 5vw, 76px)",
    lineHeight: 1.2,
    letterSpacing: "-0.06em",
    maxWidth: "1000px",
    margin: "0 auto",
    color: "#f5f5f5",
  },

  contactWrap: {
    padding: "120px 80px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "80px",
    alignItems: "center",
  },

  contactTitle: {
    fontSize: "clamp(52px, 7vw, 100px)",
    lineHeight: 0.92,
    letterSpacing: "-0.08em",
    fontWeight: 800,
  },

  contactLinks: {
    display: "flex",
    flexDirection: "column",
    gap: "22px",
  },

  contactLink: {
    padding: "22px 0",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    color: "#999",
    textDecoration: "none",
    fontSize: "18px",
  },

  footer: {
    padding: "32px 80px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    justifyContent: "space-between",
    color: "#666",
    fontSize: "14px",
  },
};

return (
<div style={styles.page}>

<nav style={styles.nav}>
  <div style={styles.navLogo}>
    [NAME]
  </div>

  <div style={styles.navLinks}>
    <span>Work</span>
    <span>About</span>
    <span>Contact</span>
  </div>
</nav>

<section style={styles.hero}>

  <div style={styles.heroLeft}>

    <div style={styles.heroTag}>
      [ROLE / CREATIVE TITLE]
    </div>

    <h1 style={styles.heroTitle}>
      [LARGE CINEMATIC HEADLINE]
    </h1>

    <p style={styles.heroText}>
      [SHORT PERSONAL INTRODUCTION USING ONLY REAL USER INFO]
    </p>

    <div style={styles.heroButtons}>
      <button style={styles.primaryBtn}>
        View Work
      </button>

      <button style={styles.secondaryBtn}>
        Contact
      </button>
    </div>

  </div>

  <div style={styles.heroCard}>
    <div style={styles.glow} />

    [EDITORIAL VISUAL CARD / MOCKUP / CREATIVE PANEL]
  </div>

</section>

<section style={styles.section}>

  <div style={styles.sectionLabel}>
    About
  </div>

  <h2 style={styles.sectionHeading}>
    [EDITORIAL ABOUT HEADING]
  </h2>

  <p style={styles.muted}>
    [ABOUT CONTENT — emotional, cinematic, personal, minimal]
  </p>

</section>

<section style={styles.section} id="work">

  <div style={styles.sectionLabel}>
    Selected Work
  </div>

  <h2 style={styles.sectionHeading}>
    [PROJECT SHOWCASE TITLE]
  </h2>

  <div style={styles.projectGrid}>

    [PROJECT CARDS — ONLY use real projects or user-provided interests.
    If unavailable keep minimal and atmospheric.]

  </div>

</section>

<section style={styles.section}>

  <div style={styles.sectionLabel}>
    Experience
  </div>

  <h2 style={styles.sectionHeading}>
    [TIMELINE TITLE]
  </h2>

  <div style={styles.timeline}>

    [TIMELINE ITEMS — ONLY use real education/internships/goals if provided.
    Otherwise omit fake companies and fake experience.]

  </div>

</section>

<section style={styles.section}>

  <div style={styles.sectionLabel}>
    Creative Direction
  </div>

  <h2 style={styles.sectionHeading}>
    [DESIGN PHILOSOPHY TITLE]
  </h2>

  <div style={styles.skillGrid}>

    [CREATIVE INTERESTS / FOCUS AREAS / DESIGN APPROACH]

  </div>

</section>

<section style={styles.quoteSection}>

  <div style={styles.quote}>
    “[CINEMATIC PERSONAL QUOTE OR CREATIVE BELIEF]”
  </div>

</section>

<section style={styles.contactWrap} id="contact">

  <div>
    <div style={styles.sectionLabel}>
      Contact
    </div>

    <h2 style={styles.contactTitle}>
      Let's build
      <br />
      something meaningful.
    </h2>
  </div>

  <div style={styles.contactLinks}>

    [CONTACT LINKS / EMAIL / SOCIALS ONLY IF PROVIDED]

  </div>

</section>

<footer style={styles.footer}>

  <div>
    [NAME]
  </div>

  <div>
    Designed with intention.
  </div>

</footer>

</div>
);
}
`;

// ─── TEMPLATE SELECTOR ───────────────────────────────────────────────────────

function selectTemplate(businessType) {
  const type = (businessType || "").toLowerCase();

  if (
    type.includes("portfolio") || type.includes("personal") ||
    type.includes("designer") || type.includes("developer") ||
    type.includes("freelance") || type.includes("creative")
  ) return PORTFOLIO_TEMPLATE;

  if (
    type.includes("saas") || type.includes("software") ||
    type.includes("app") || type.includes("tool") ||
    type.includes("platform") || type.includes("startup") ||
    type.includes("agency") || type.includes("studio")
  ) return SAAS_TEMPLATE;

  // everything else — coffee, venue, fitness, restaurant, boutique, etc.
  return LIFESTYLE_TEMPLATE;
}

// ─── CONTENT GUIDE ───────────────────────────────────────────────────────────

function getContentGuide(businessType, brief) {
  const type = (businessType || "").toLowerCase();
  const name = brief?.businessName || "the business";

  if (type.includes("coffee") || type.includes("cafe")) {
    return `COFFEE SHOP. Generate:
- Hero: atmospheric, poetic headline about craft, aroma, community. Not generic.
- Menu: at least 6 items with real names, one-line descriptions, prices in ₹
  e.g. "Single Origin Pour Over — Ethiopian Yirgacheffe, bright and floral — ₹320"
- About: the story behind the cafe, the roaster's philosophy, the neighborhood vibe
- Specialty / signature drinks section with attitude
- Opening hours (realistic: 8am-10pm, closed Tuesdays)
- Address / location section`;
  }

  if (type.includes("venue") || type.includes("event")) {
    return `EVENT VENUE. Generate:
- Hero: cinematic headline about unforgettable moments
- Event types with capacity: Weddings (up to 500), Corporate (up to 200), etc.
- Amenities grid: in-house catering, rooftop, AV, decor, parking, bridal suite
- 3 pricing packages with everything listed: Basic ₹75,000 / Premium ₹1,50,000 / Luxury ₹3,00,000
- Gallery teaser section (styled div placeholders with captions, not gray boxes)
- Booking enquiry CTA with a fake form`;
  }

  if (type.includes("yoga") || type.includes("fitness") || type.includes("gym")) {
    return `FITNESS STUDIO. Generate:
- Hero: powerful transformation headline, energy, movement
- Classes: Vinyasa Flow, HIIT, Meditation, Barre, Aerial — with duration + level + price per class
- Weekly schedule grid Mon-Sun morning/evening slots
- 3 instructor cards: name, specialty, years experience, one-line philosophy
- Membership tiers: Drop-in ₹500 / Monthly ₹3,500 / Unlimited ₹6,000 with benefits
- Free first class CTA section`;
  }

  if (type.includes("restaurant") || type.includes("food") || type.includes("kitchen")) {
    return `RESTAURANT. Generate:
- Hero: sensory headline that evokes taste and atmosphere
- Menu in 3 tabs / categories: Starters, Mains, Desserts with 3-4 items each + ₹ prices
- Chef's special: 2 highlighted dishes with story
- Ambiance section: describe the dining experience in rich detail
- Table reservation CTA with date/time/guests fields (styled, non-functional)
- Delivery info if cloud kitchen`;
  }

  if (type.includes("saas") || type.includes("software") || type.includes("tool") || type.includes("platform")) {
    return `SAAS PRODUCT. Generate:
- Hero: sharp problem-statement headline. What pain does this solve?
- Product mockup in hero: build a realistic mini UI — a dashboard, a chat, a table, whatever fits
- 6 bento feature cards: real specific features with emoji icon, bold title, 2-line desc
- "How it works" in 3 steps with numbered labels
- 3 pricing plans: Free (what's free), Pro $19/mo, Enterprise — real feature lists
- Social proof: 3 testimonials with name, role, company
- Integration logos section (text-based, company names)`;
  }

  if (type.includes("boutique") || type.includes("shop") || type.includes("store")) {
    return `BOUTIQUE / RETAIL. Generate:
- Hero: lifestyle brand headline, aspirational, editorial
- Featured products: 6 cards with name, one-line desc, ₹ price, category tag
- Collections / categories section: 3-4 categories with visual styling
- Brand story: founding, ethos, craftsmanship, sustainability
- Testimonials: 3 real-feeling customer quotes with name and city
- Newsletter CTA section`;
  }

  if (type.includes("portfolio") || type.includes("personal")) {
    return `PERSONAL PORTFOLIO. Generate:
- Hero: bold name + role. What kind of work do you do? Who do you do it for?
- Projects: real project cards with name, type tag, one-para desc, tool tags
- About: personality-driven, not a resume summary. Voice matters.
- Experience timeline: real companies, real roles, real dates
- Skills section: categorized (Design, Engineering, Tools)
- Contact footer with email CTA + social links`;
  }

  return `${businessType} BUSINESS called "${name}". Generate:
- Hero: powerful, specific headline — not generic
- Core offering section: what exactly do they do, for who, and why it's different
- Services / products / features: at least 5 with real descriptions
- Social proof or trust section: testimonials, numbers, awards, clients
- About / story section: the people and mission behind it
- CTA footer: clear next step for the visitor`;
}

// ─── FALLBACK SLIDES ─────────────────────────────────────────────────────────

function generateFallbackSlides(brief) {
  return [
    { title: brief?.businessName || "Our Company", subtitle: brief?.tagline || "Building the future", bullets: [], emoji: "🚀", type: "cover" },
    { title: "The Problem", subtitle: "What we're solving", bullets: ["Pain point 1", "Pain point 2", "Pain point 3"], emoji: "❗", type: "problem" },
    { title: "Our Solution", subtitle: "How we fix it", bullets: ["Solution 1", "Solution 2", "Solution 3"], emoji: "💡", type: "solution" },
    { title: "Market Opportunity", subtitle: "The size of the prize", bullets: ["TAM: $10B+", "SAM: $2B", "SOM: $100M"], emoji: "📊", type: "market" },
    { title: "Our Product", subtitle: "What we've built", bullets: [...(brief?.keyFeatures || ["Feature 1", "Feature 2"])], emoji: "🛠️", type: "product" },
    { title: "The Ask", subtitle: "Join us", bullets: ["Raising $1M seed", "18-month runway", "Key hires + growth"], emoji: "🤝", type: "ask" },
  ];
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

export async function generatorNode(state) {
  const { brief, researchContext, outputType } = state;

  let rawOutput = "";
  let outputFormat = "jsx";

  if (outputType === "pitchdeck") {
    outputFormat = "slides";

    const response = await llm.invoke([
      {
        role: "system",
        content: `You are an expert pitch deck creator and business strategist.
Generate a complete pitch deck as a JSON array of slides.
Return ONLY valid JSON array, no markdown, no explanation.
Each slide: { "title": string, "subtitle": string, "bullets": string[], "emoji": string, "type": "cover"|"problem"|"solution"|"market"|"product"|"traction"|"team"|"ask" }`,
      },
      {
        role: "user",
        content: `Create a 10-slide investor pitch deck for:
Brief: ${JSON.stringify(brief, null, 2)}
Research: ${researchContext}

Order: cover → problem → solution → market → product → traction → team → ask
Make it punchy, specific, investor-ready. Real numbers where possible.`,
      },
    ]);

    const text = response.content.trim().replace(/```json|```/g, "").trim();
    try {
      rawOutput = JSON.parse(text);
    } catch {
      rawOutput = generateFallbackSlides(brief);
    }

  } else {
    outputFormat = "jsx";

    const colors = brief?.colorPalette || ["#7c3aed", "#06b6d4", "#0a0a0f"];
    const primary   = colors[0];
    const secondary = colors[1];
    const bgColor   = colors[2] || "#0a0a0f";

    const selectedTemplate = selectTemplate(brief?.businessType);

    const response = await llm.invoke([
      {
        role: "system",
        content: `${BASE_SYSTEM_PROMPT}

HERE IS YOUR LAYOUT TEMPLATE — follow this structure and fill in all [PLACEHOLDERS] with real content:
${selectedTemplate}`,
      },
      {
        role: "user",
        content: `Generate a stunning, Awwwards-quality React website.

BUSINESS BRIEF:
- Name: ${brief?.businessName || "The Business"}
- Type: ${brief?.businessType || "business"}
- Tagline: ${brief?.tagline || ""}
- Tone: ${brief?.tone || "modern and professional"}
- Audience: ${brief?.targetAudience || "general"}
- Key features: ${(brief?.keyFeatures || []).join(", ")}
- Sections: ${(brief?.sections || ["Hero", "About", "Services", "Contact"]).join(", ")}
- VERY IMPORTANT USER FACTS:
${JSON.stringify(brief, null, 2)}

Use ONLY these details.
Do not invent additional background information.

BRAND COLORS:
- Primary (accent): ${primary}
- Secondary: ${secondary}
- Background: ${bgColor}

MARKET RESEARCH — use this for real, specific content:
${researchContext || "Use your own knowledge for this business type."}

CONTENT TO GENERATE:
${getContentGuide(brief?.businessType, brief)}

FINAL REMINDERS:
- Start with: export default function App() {
- No imports. No markdown. No triple backticks.
- Use React.useState not useState
- Replace every single [PLACEHOLDER] in the template with real content
- Build a real product mockup in the hero if it's a SaaS — not a gray box
- Every section must have real, specific content for THIS exact business
- Make it genuinely beautiful — the kind of site that wins Awwwards`,
      },
    ]);

    rawOutput = response.content.trim();
    rawOutput = rawOutput.replace(/```jsx|```javascript|```js|```/g, "").trim();
  }

  return {
    rawOutput,
    outputFormat,
    currentStep: "generator",
    steps: ["⚡ Generator: First draft created"],
  };
}

