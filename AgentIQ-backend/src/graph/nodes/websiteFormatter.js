export async function websiteFormatterNode(state) {
  const { generatedFiles, websiteRaw, brief } = state;

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

// Prevent Sandpack/Vite preview crashes
// if AI forgets entry files

if (!files["/index.js"]) {
  files["/index.js"] = `
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.js";

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
}

if (!files["/package.json"]) {
  files["/package.json"] = `
{
  "name": "ai-generated-app",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
`;
}

  const colors  = brief?.colorPalette || ["#7c3aed", "#06b6d4", "#0a0a0f"];
  const primary = colors[0];
  const bg      = colors[2] || "#0a0a0f";

  // ── Fix imports — all files are at root, imports use "./" 
  const fixedFiles = {};
  for (const [path, content] of Object.entries(files)) {
    if (typeof content !== "string") { fixedFiles[path] = content; continue; }
    fixedFiles[path] = content
      .replace(/from ['"]\.\.\/components\/([^'"]+)['"]/g, "from './$1'")
      .replace(/from ['"]\.\/components\/([^'"]+)['"]/g,   "from './$1'")
      .replace(/from ['"]\.\.\/pages\/([^'"]+)['"]/g,      "from './$1'")
      .replace(/from ['"]\.\/pages\/([^'"]+)['"]/g,        "from './$1'");
  }

  

  // ── Ensure App.js exists 
  if (!fixedFiles["/App.js"] && !fixedFiles["/App.jsx"]) {
    const componentNames = Object.keys(fixedFiles)
      .filter(f => f !== "/App.js" && f !== "/App.jsx" && f !== "/index.js" && f.endsWith(".js"))
      .map(f => f.replace("/", "").replace(".js", ""));

    fixedFiles["/App.js"] = `import React from 'react';
${componentNames.map(n => `import ${n} from './${n}.js';`).join("\n")}

export default function App() {
  return (
    <div style={{ background: "${bg}", minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif", color: "#fff" }}>
      ${componentNames.map(n => `<${n} />`).join("\n      ")}
    </div>
  );
}`;
  }

  // ── Auto-create any imported but missing components
  for (const [, content] of Object.entries({ ...fixedFiles })) {
    if (typeof content !== "string") continue;
    const matches = [...content.matchAll(/import\s+(\w+)\s+from\s+'\.\/(\w+)(?:\.js)?'/g)];
    for (const m of matches) {
      const name = m[1];
      const path = `/${m[2]}.js`;
      if (!fixedFiles[path] && name[0] === name[0].toUpperCase()) {
        console.log(`Auto-creating missing: ${path}`);
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
    steps: [`Website: Packaged — ${Object.keys(fixedFiles).length} files`],
  };
}