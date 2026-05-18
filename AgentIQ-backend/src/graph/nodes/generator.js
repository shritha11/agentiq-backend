import { AzureChatOpenAI} from "@langchain/openai";

const llm = new AzureChatOpenAI({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_ENDPOINT,
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    temperature: 0.9,
    maxTokens: 8000,
});

const REACT_TEMPLATE = ` 
You must return a single React component. Follow this EXACT structure. 

function GeneratedSite() {
// 1. STATE- only if needed e.g. movile menu toggle, active tab 
const [menuOpen, setMenuOpen] = React.useState(false);
// 2. STYLES OBJECT - define ALL styles here as JS objects 
const styles = {
    nav: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center", 
        padding: "20px 40px", 
        background: "#111",
        position: "sticky", 
        top: 0,
        zIndex: 100,
    },
    hero: {
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "40px 20px",
    }, 
    //more style objects for each section...
};

// 3. RETURN - full page JSX
return(
<div style={{ fontFamily: "system-ui, sans-serif" }}>

  {/* NAVBAR */}
  <nav style={styles.nav}>
        <div style={{ fontWeight: 800, fontSize: "22px" }}>BUSINESS_NAME</div>
        <div style={{ display: "flex", gap: "24px" }}>
          {["Home", "About", "Menu", "Contact"].map(link => (
            <a key={link} href={"#" + link.toLowerCase()}
               style={{ textDecoration: "none", fontSize: "14px" }}>
              {link}
            </a>
          ))}
        </div>
      </nav>
 
      {/* HERO SECTION */}
      <section id="home" style={styles.hero}>
        <h1 style={{ fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 900, marginBottom: "16px" }}>
          TAGLINE
        </h1>
        <p style={{ fontSize: "18px", maxWidth: "500px", marginBottom: "32px" }}>
          DESCRIPTION
        </p>
        <button style={{ padding: "16px 40px", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>
          CALL_TO_ACTION
        </button>
      </section>
 
      {/* ABOUT SECTION */}
      <section id="about" style={{ padding: "80px 40px", maxWidth: "900px", margin: "0 auto" }}>
        ...real about content...
      </section>
 
      {/* MAIN CONTENT SECTION — menu / services / events / whatever fits */}
      <section id="services" style={{ padding: "80px 40px" }}>
        ...real specific content for this business type...
      </section>
 
      {/* CONTACT / FOOTER */}
      <footer id="contact" style={{ padding: "60px 40px", textAlign: "center" }}>
        ...contact info and footer...
      </footer>
 
    </div>
    );
}

STRICT RULES - READ ALL OF THESE: 
1. Use React.useState (NOT useState) - no imports allowed, React is a global
2. All styles are inline JS objects - no CSS classes, no Tailwind, no external stylesheets
3. Replace ALL placeholders (BUSINESS_NAME, TAGLINE, etc.) with real content from the brief
4. All content ust be REAL and SPECIFIC - not Lorem ipsum, not "Feature 1", not generic
5. The component has NO imports and NO export default - just the function
6. Use clamp() for font sizes so it looks good on all screen sizes.
7. For hover effects use onMouseenter/onMouseLeave with React.useState
9. Start your response with: function GeneratedSite() {
10. End your response with the closing } of the function - nothing after it
`;

const DECK_SYSTEM = `You are an expert pitch deck creator and business startegist. 
Generate a complete pitch deck as a JSON array of slides. 
Return ONLY valid JSON array, no markdown, no explanation.
Each slide object: { "title": string, "subtitle": string, "bullets": string[],
"type": "cover"|"problem"|"solution"|"market"|"product"|"traction"|"team"|"ask"}`;

export async function generatorNode(state) {
    const {brief, researchContext, outputType} = state;

    const briefStr = JSON.stringify(brief, null, 2);

    let rawOutput = "";
    let outputFormat = "jsx";

    if (outputType === "pitchdeck") {
        outputFormat = "slides";

        const response = await llm.invoke([
            {role: "system", content: DECK_SYSTEM},
            {role: "user", 
                content: `Create a 10-slide pitch deck for: 
                Brief: ${briefStr}
                Research: ${researchContext}
                
                Include in order: cover, problem, solution, market, product, traction, team, ask.
Make it investor-ready. Use specific numbers and facts where possible.`,
            },
        ]);

        const text = response.content.trim().replace(/```json|```/g, "").trim();
        try {
           rawOutput = JSON.parse(text);
        }
        catch {
            rawOutput = generateFallbackSlides(brief);
        }  } 
        else {
            outputFormat = "jsx";
            const colors = brief?.colorPalette || ["#7c3aed", "#06b6d4", "#0a0a0f"];
            const primary   = colors[0];
            const secondary = colors[1];
            const bgColor   = colors[2] || "#0a0a0f";

            const response = await llm.invoke([
                {role: "system", 
                 content: `You are a senior React developer who writes beautiful, production-ready UI.
You always follow the exact template and rules given.
 
HERE IS THE TEMPLATE YOU MUST FOLLOW:
${REACT_TEMPLATE}`, },

                {role: "user", 
                content: `Generate a complete, stunning React website using the template above.
 
BUSINESS BRIEF:
- Name: ${brief?.businessName || "The Business"}
- Type: ${brief?.businessType || "business"}
- Tagline: ${brief?.tagline || ""}
- Tone: ${brief?.tone || "modern and professional"}
- Target audience: ${brief?.targetAudience || "general"}
- Key features: ${(brief?.keyFeatures || []).join(", ")}
- Sections needed: ${(brief?.sections || ["Hero", "About", "Services", "Contact"]).join(", ")}
 
BRAND COLORS (use these exact hex values):
- Primary: ${primary}
- Secondary: ${secondary}
- Background: ${bgColor}
MARKET RESEARCH (use this to write real specific content):
${researchContext || "Use general knowledge for this business type."}
 
CONTENT TO GENERATE:
${getContentGuide(brief?.businessType, brief)}
 
REMINDER OF RULES:
- Start with: function GeneratedSite() {
- No imports anywhere
- Use React.useState not useState
- All real specific content — no placeholders
- All inline styles as JS objects
- End with the closing } of the function`,
                },
            ]);

            rawOutput = response.content.trim();
            // Strip accidental markdown fences 
            rawOutput = rawOutput.replace(/```jsx|```javascript|```js|```/g, "").trim();

        
    }

    return {
        rawOutput, 
        outputFormat, 
        currentStep: "generator", 
        steps: ["Generator: First draft created"],
    };
}

function generateFallbackSlides(brief) {
    return [
        { title: brief?.businessName || "Our Company", subtitle: brief?.tagline || "Building the future", bullets: [], type: "cover" },
        { title: "The Problem", subtitle: "What we're solving", bullets:["Pain point 1", "Pain point 2", "Pain point 3"], type: "problem"},
        { title: "Our Solution", subtitle: "How we fix it", bullets: ["Solution 1", "Solution 2", "Solution 3"], type: "solution"},
        { title: "Market Opportunity", subtitle: "The size of the prize", bullets: ["TAM: $10B+", "SAM: $2B", "SOM: $100M"], type: "market"},
        { title: "Our Product", subtitle: "What we've built", bullets: [...(brief?.keyFeatures || ["Feature 1", "feature 2", "Feature 3"])], type: "product"},
        { title: "The Ask", subtitle: "Join us", bullets: ["Raising $1M seed", "18-month runway", "Key hires + growth"], type: "ask"},
    ];
}

function getContentGuide(businessType, brief) {
    const type = (businessType || "").toLowerCase();
    const name = brief?.businessName || "the business";

    if (type.includes("coffee") || type.includes("cafe")) {
        return `This is a COFFEE SHOP website. 
        
        Use these as default ideas unless the user explicitly specifies otherwise:

        - Hero: atmosphereic headline about coffee culture, aroma, community
        - Menu section: at least 6 real menu items with names, descriptions, and prices (use INR ₹)
          Example: "Signature Cold Brew - Slow-steeped 18 hours, smooth finish - ₹280" 
        - About section:  story of the cafe, the roaster, the vibe 
        - Specialty section: what makes this cafe different (beans, brewing methods)
        - Opening hours section with realistic timings
        - Location section
        
        Adapt based on the user's exact requirements and style preferences.`;
    }

    if (type.includes("venue") || type.includes("event")) {
        return `This is an EVENT VENUE website. 
        
        Use these as default ideas unless the user explicitly specifies otherwise: 

        - Hero: grand headline about unforgettable experiences 
        - Venue types: Wedding, Corporate, Birthday, Concerts - with capacity and features
        - Amenities: parking, catering, AV equipment, decor services
        - Pricing packages: 3 tiers (Basic, Premium, Luxury) with what's included and price
        - Gallery section: image placeholder grid with captions
        - Booking enquiry CTA section
        
        Adapt based on the user's exact requirements and style preferences.`;
    }

    if (type.includes("yoga") || type.includes("fitness") || type.includes("gym")) {
        return `This is a FITNESS / YOGA STUDIO website. 
        
        Use these as default ideas unless the user explicitly specifies otherwise: 

        - Hero: energizing headline about transformation and wellness
        - Classes: at least 5 class types with duration, level, and description
        - Schedule: weekly timetable grid Mon-Sun
        - Instructors: 3 instructor cards with name, speciality, years of experience
        - Membership plans: 3 tiers with monthly price (INR ₹) and what's included
        - Free trial class CTA section
        
        Adapt based on the user's exact requirements and style preferences.`;
    }

    if (type.includes("restaurant") || type.includes("food") || type.includes("kitchen")) {
        return `This is a RESTAURANT / FOOD BUSINESS website. 
        
        Use these as default ideas unless the user explicitly specifies otherwise: 
        
        - Hero: mouth-watering headline with cuisine type
        - Menu: 3 categories (STarters, Mains, Desserts) with 3-4 items each + prices in ₹
        - Chef's specials section: 2-3 signature dishes highlighted
        - Atmosphere / dining experience section
        - Reservation CTA section
        - Delivery info if applicable`;
    }

    if (type.includes("saas") || type.includes("software") || type.includes("app") || type.includes("tool")) {
        return `This is a SAAS / SOFTWARE PRODUCT website. 
        
        Use these as default ideas unless the user explicitly specifies otherwise: 
        
        - Hero: bold problem-solving headline with product name and CTA
        - Features: clear benefits and modern UI cards
        - "How it works" process section if relevant
        - Pricing plans (Free, Pro, Enterprise) with feature lists and monthly prices if applicable
        - testimonials or social proof if suitable
        - Integration / compatability section for supported tools
        - Dashboard or Product preview sections
        - FAQ and CTA sections where appropriate
        
        Focus on modern SaaS aesthetics, clean layouts, strong typography, and conversion-focused design.`;
    }

    if (
  type.includes("boutique") ||type.includes("shop") ||type.includes("store") || type.includes("fashion store")) {
  return `This is a RETAIL / BOUTIQUE SHOP website.

Use these as default ideas unless the user explicitly specifies otherwise:

- Hero section with strong brand aesthetic and lifestyle-focused messaging
- Featured products section with product cards, descriptions, and pricing
- Product categories or collections grid
- Brand story section with founder vision and craftsmanship
- Testimonials or customer reviews if suitable
- Newsletter signup CTA section
- Shipping, returns, and FAQ sections where appropriate
- Lookbook or featured collection sections for visual storytelling

Focus on premium branding, clean layouts, modern ecommerce UI patterns, and visually engaging presentation.`;
}

    if (type.includes("portfolio") || type.includes("personal portfolio") || type.includes("designer portfolio") || type.includes("developer portfolio") || type.includes("graphic designer portfolio")) {
        return `This is a PERSONAL PORTFOLIO website. 
        
        Use these as default ideas unless the user explicitly specifies otherwise: 
        
        - Hero section with strong personal introduction and role/title
        - About section with story, skills, and personality
        - Featured projects section with 4 detailed project cards
        - Skills / tools section with categories and proficiency
        - Experience / achievements timeline 
        - Testimonials or client feedback section
        - Contact or CTA section with social links
        - Modern creative aesthetic with strong visual identity`;
    }

    if (type.includes("fashion") || type.includes("clothing") || type.includes("streetwear") || type.includes("fashion brand") || type.includes("apparel")) {
        return `This is a FASHION / CLOTHING BRAND website. 
        
        Use these as default ideas unless the user explicitly specifies otherwise: 
        
        - Hero section with bold campaign-style headline
        - Featured collection showcase with product highlights
        - Trending / new arrivals section
        - Product cards with names, short description, and prices in ₹
        - Brand story section with aesthetic and inspiration
        - Lookbook / gallery section with visual-focused layouts
        - Customer testimonials / influencer quotes
        - Newsletter signup CTA section
        - Luxury modern fashion brand vibe with stylish typography`;
    }

    if (type.includes("medical") || type.includes("hospital") || type.includes("clinic") || type.includes("healthcare")) {
        return `This is a MEDICAL / HEALTHCARE website.

        Use these as default ideas unless the user explicitly specifies otherwise:

        - Hero section with trust-focused healthcare messaging
- Services or treatments section
- Doctor or specialist profiles
- Appointment booking CTA section
- Testimonials and patient trust indicators
- Emergency contact and support information
  - FAQ and healthcare resources section

Focus on clean layouts, accessibility, professionalism, and trust-building design.`;
} 

if (type.includes("travel") || type.includes("tour") || type.includes("vacation") || type.includes("trip")
) {
  return `This is a TRAVEL / TOURISM website.

Use these as default ideas unless the user explicitly specifies otherwise:

- Hero section with immersive travel visuals
- Destinations or packages showcase
- Travel experiences and itinerary sections
- Testimonials and traveler stories
- Booking CTA sections
- Gallery and adventure highlights
- FAQ and travel assistance sections

Focus on visually rich layouts, inspiring content, and smooth booking-oriented UX.`;
}

if ( type.includes("real estate") || type.includes("property") ||type.includes("realtor") || type.includes("housing")
) {
  return `This is a REAL ESTATE website.

Use these as default ideas unless the user explicitly specifies otherwise:

- Hero section with premium property showcase
- Property listings with pricing and details
- Property categories and filters
- Agent or realtor profile section
- Testimonials and trust indicators
- Booking or property inquiry CTA sections
- Location and neighborhood highlights

Focus on premium visuals, trust-building design, and modern property browsing experience.`;
}

if (type.includes("education") || type.includes("course") || type.includes("academy") || type.includes("learning") || type.includes("school")
) {
  return `This is an EDUCATION / LEARNING PLATFORM website.

Use these as default ideas unless the user explicitly specifies otherwise:

- Hero section with learning-focused messaging
- Courses or programs showcase
- Instructor or mentor profiles
- Student testimonials and success stories
- Learning benefits and features section
- Pricing or enrollment plans if relevant
- FAQ and enrollment CTA sections

Focus on trust, clarity, accessibility, and modern educational platform design.`;
}

if (type.includes("blog") || type.includes("news") || type.includes("magazine") || type.includes("content")
) {
  return `This is a BLOG / CONTENT website.

Use these as default ideas unless the user explicitly specifies otherwise:

- Hero section with featured articles
- Blog categories and topic filters
- Recent and trending posts sections
- Author profile section
- Newsletter subscription section
- Search functionality UI
- Featured topics or editorial picks

Focus on readability, clean typography, modern editorial layouts, and engaging content presentation.`;
}

if ( type.includes("agency") || type.includes("creative agency") || type.includes("studio") || type.includes("marketing")
) {
  return `This is a CREATIVE AGENCY website.

Use these as default ideas unless the user explicitly specifies otherwise:

- Hero section with bold agency positioning and CTA
- Services section with detailed offerings
- Featured projects or case studies
- Team introduction section
- Testimonials and client logos
- Process / workflow explanation section
- Contact and consultation CTA sections

Focus on premium visuals, bold typography, modern layouts, and strong brand identity.`;
}

if (type.includes("ecommerce") || type.includes("e-commerce") ||  type.includes("online store") || type.includes("marketplace")
) {
  return `This is an ECOMMERCE website.

Use these as default ideas unless the user explicitly specifies otherwise:

- Hero section with featured offers or collections
- Product grid with categories and filters
- Best sellers and trending products section
- Cart / checkout CTA sections
- Product reviews and ratings
- Offers, discounts, and promotional banners
- Shipping, returns, and customer support sections
- Newsletter signup and recommendation sections

Focus on conversion-focused ecommerce layouts, smooth shopping experience, and modern product presentation.`;
}

 return `This is a ${businessType} business called "${name}". 
 Use these as default ideas unless the user explicitly specifies otherwise:

- Hero section: powerful headline and CTA button
- About / Story section: who they are and what they stand for
- Services / Features section: what they offer — at least 4-6 items with real descriptions
- Why choose us: 3-4 specific differentiators
- Testimonials: 3 realistic customer reviews with names
- Contact / CTA section with contact details

Focus on clean UI, acessibilty, visual hierarchy, and modern web design principles.`;
}
