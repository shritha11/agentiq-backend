export async function websiteFormatterNode(state) {
  const { generatedFiles, websiteRaw, brief } = state;

  // 1. INITIALIZE VARIABLES AT THE ABSOLUTE TOP
  const colors  = brief?.colorPalette || ["#7c3aed", "#06b6d4", "#0a0a0f"];
  const primary = colors[0];
  const bg      = colors[2] || "#0a0a0f";

  let files = {};

  if (generatedFiles && Object.keys(generatedFiles).length > 0) {
    files = { ...generatedFiles };
  } else if (websiteRaw) {
    try {
      const parsed = JSON.parse(websiteRaw);
      files = parsed?.files || {};
    } catch {}
  }

  console.log("Formatter input:", Object.keys(files));

  // 2. FORCE VITE INFRASTRUCTURE CONFIGURATIONS
  files["/package.json"] = `
{
  "name": "agentiq-generated-vite-app",
  "private": true, 
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite", 
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.542.0",
    "framer-motion": "^11.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.2.0"
  }
}
`;

  files["/vite.config.js"] = `
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`;

  files["/index.html"] = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${brief?.businessName || "AgentIQ Project"}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />
    <style>
      body { margin: 0; padding: 0; box-sizing: border-box; background: ${bg}; color: #fff; font-family: 'Inter', sans-serif; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;

  files["/src/main.jsx"] = `
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

  console.log("PACKAGE JSON STRUCTURALLY INJECTED");

  // 3. RE-ROUTE ALL RAW LOOSE SOURCE ASSETS SAFELY INTO THE /src DIRECTORY
  const fixedFiles = {};
  for (const [path, content] of Object.entries(files)) {
    if (typeof content !== "string") { 
      fixedFiles[path] = content; 
      continue; 
    }

    let targetPath = path;
    // Normalize code file names directly into your source directory cleanly as .jsx
    if (path.endsWith(".js") || path.endsWith(".jsx")) {
      if (!path.startsWith("/src/") && !path.startsWith("/public/") && path !== "/vite.config.js") {
        const baseName = path.replace(".js", "").replace(".jsx", "");
        targetPath = `/src${baseName}.jsx`; 
      }
    }

    // Convert relative directory strings AND dynamically convert imports to use explicit .jsx 
    fixedFiles[targetPath] = content
      .replace(/from ['"]\.\.\/components\/([^'"]+)['"]/g, "from './$1.jsx'")
      .replace(/from ['"]\.\/components\/([^'"]+)['"]/g,   "from './$1.jsx'")
      .replace(/from ['"]\.\.\/pages\/([^'"]+)['"]/g,      "from './$1.jsx'")
      .replace(/from ['"]\.\/pages\/([^'"]+)['"]/g,        "from './$1.jsx'")
      .replace(/from ['"]\.\/([^'"]+)\.js['"]/g,           "from './$1.jsx'")  // ◄ Normalizes .js to explicit .jsx
      .replace(/from ['"]\.\/([^'"]+)\.jsx['"]/g,          "from './$1.jsx'"); // ◄ Normalizes .jsx to explicit .jsx
  }
  

  // 4. VERIFY AND NORMALIZE THE APP.JSX ROOT ENTRYPOINT MODULE
  const baseAppContent = fixedFiles["/src/App.jsx"] || fixedFiles["/src/App.js"] || fixedFiles["/App.js"] || fixedFiles["/App.jsx"];
  delete fixedFiles["/App.js"];
  delete fixedFiles["/App.jsx"];
  delete fixedFiles["/src/App.js"];

  const appIsBroken = !baseAppContent || baseAppContent.trim().length < 100 || !baseAppContent.includes("export default");

  if (appIsBroken) {
    const componentNames = Object.keys(fixedFiles)
      .filter(f => f.startsWith("/src/") && f !== "/src/main.jsx" && f !== "/src/App.jsx" && (f.endsWith(".js") || f.endsWith(".jsx")))
      .map(f => f.replace("/src/", "").replace(".js", "").replace(".jsx", ""));

    fixedFiles["/src/App.jsx"] = `import React from 'react';
${componentNames.map(n => `import ${n} from './${n}';`).join("\n")}

export default function App() {
  return (
    <div style={{ background: "${bg}", minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif", color: "#fff" }}>
      ${componentNames.map(n => `<${n} />`).join("\n      ")}
    </div>
  );
}`;
  } else {
    fixedFiles["/src/App.jsx"] = baseAppContent;
  }

  // --- AUTO-GENERATE CSS BALANCING TO PREVENT COMPILER CRASHES ---
  const rawAppString = fixedFiles["/src/App.jsx"] || "";
  if (rawAppString.includes("App.css") && !fixedFiles["/src/App.css"]) {
    console.log("AI requested App.css but forgot to generate it. Auto-creating fallback styles...");
    fixedFiles["/src/App.css"] = `
html { scroll-behavior: smooth; }
body { transition: background-color 0.3s ease, color 0.3s ease; }
.hover\\:scale-105:hover { transform: scale(1.05); transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
`;
  }

  // 5. AUTO-CREATE ANY IMPORTED BUT MISSING COMPONENTS INSIDE /src
  for (const [filePath, content] of Object.entries({ ...fixedFiles })) {
    if (typeof content !== "string" || !filePath.startsWith("/src/")) continue;
    
    // Look for local component imports
    const matches = [...content.matchAll(/import\s+(\w+)\s+from\s+'\.\/(\w+)'/g)];
    for (const m of matches) {
      const name = m[1];
      const path = `/src/${m[2]}.jsx`; // ◄ FIXED: Force fallback generator paths to use .jsx
      
      if (!fixedFiles[path] && name[0] === name[0].toUpperCase()) {
        console.log(`Auto-creating missing sub-asset: ${path}`);
        fixedFiles[path] = `import React from 'react';
export default function ${name}() {
  return (
    <section style={{ padding: "80px 48px", color: "#fff" }}>
      <h2 style={{ fontSize: "40px", fontWeight: 800, letterSpacing: "-0.03em",
                   background: "linear-gradient(135deg, ${primary}, #fff)",
                   WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        ${name}
      </h2>
    </section>
  );
}`;
      }
    }
  }

  console.log("Formatter output:", Object.keys(fixedFiles));

  return {
    websiteFinal: {
      type: "website",
      files: fixedFiles,
      brief: {
        businessName: brief?.businessName,
        tagline:      brief?.tagline,
        colorPalette: brief?.colorPalette,
        businessType: brief?.businessType,
      },
    },
    currentStep: "websiteFormatter",
    steps: [`Website: Packaged via Vite Engine — ${Object.keys(fixedFiles).length} files`],
  };
}