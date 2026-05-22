export async function websiteFormatterNode(state) {
  const { generatedFiles, websiteRaw, brief } = state;

  console.log("Formatter received generatedFiles:", Object.keys(generatedFiles || {}));


  let files = {};

  if (generatedFiles && Object.keys(generatedFiles).length > 0) {
    files = { ...generatedFiles };
    console.log("Formatter: using generatedFiles from state");
  } else if (websiteRaw) {
    try {
      const parsed = JSON.parse(websiteRaw);
      files = parsed?.files || {};
      console.log("Formatter: using websiteRaw fallback");
    } catch {
      console.warn("Formatter: could not parse websiteRaw");
    }
  }

  files = fixImports(files);

  files = createMissingComponents(files, brief);

  files["/index.js"] = `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.js";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;

  // ── Ensure App.js exists ──────────────────────────────────────────────────
  if (!files["/App.js"]) {
    console.warn("Formatter: App.js missing — generating emergency fallback");
    const colors = brief?.colorPalette || ["#7c3aed", "#06b6d4", "#0a0a0f"];

    // Get all component files to import in the fallback App
    const componentFiles = Object.keys(files)
      .filter(f => f !== "/App.js" && f !== "/index.js" && f !== "/package.json" && f.endsWith(".js"));

    const imports = componentFiles
      .map(f => {
        const name = f.replace("/", "").replace(".js", "");
        return `import ${name} from '.${f}';`;
      })
      .join("\n");

    const renders = componentFiles
      .map(f => {
        const name = f.replace("/", "").replace(".js", "");
        return `      <${name} />`;
      })
      .join("\n");

    files["/App.js"] = `import React from 'react';
${imports}

export default function App() {
  return (
    <div style={{ background: "${colors[2] || "#0a0a0f"}", minHeight: "100vh",
                  fontFamily: "Inter, system-ui, sans-serif", color: "#fff" }}>
${renders}
    </div>
  );
}`;
  }

  console.log("Formatter: final files:", Object.keys(files));

  return {
    websiteFinal: {
      type: "website",
      files,
      brief: {
        businessName: brief?.businessName,
        tagline:      brief?.tagline,
        colorPalette: brief?.colorPalette,
        businessType: brief?.businessType,
      },
    },
    currentStep: "websiteFormatter",
    steps: [`📦 Website: Packaged ${Object.keys(files).length} files`],
  };
}

// ── Fix imports to use .js extension and ./ prefix ───────────────────────────
function fixImports(files) {
  const fixed = {};

  for (const [path, content] of Object.entries(files)) {
    if (typeof content !== "string") {
      fixed[path] = content;
      continue;
    }

    let fixedContent = content
      // Fix: from '../components/X' → from './X.js'
      .replace(/from ['"]\.\.\/components\/([^'"]+)['"]/g, "from './$1.js'")
      .replace(/from ['"]\.\/components\/([^'"]+)['"]/g,  "from './$1.js'")
      .replace(/from ['"]\.\.\/pages\/([^'"]+)['"]/g,     "from './$1.js'")
      .replace(/from ['"]\.\/pages\/([^'"]+)['"]/g,       "from './$1.js'")
      // Fix: from './X' without extension → from './X.js'
      .replace(/from ['"](\.[^'"]+)(?<!\.js)['"]/g, (match, p) => {
        if (p.endsWith(".js") || p.endsWith(".css") || p.endsWith(".json")) return match;
        return `from '${p}.js'`;
      });

    fixed[path] = fixedContent;
  }

  return fixed;
}

// ── Auto-create missing components ───────────────────────────────────────────
function createMissingComponents(files, brief) {
  const result = { ...files };
  const colors = brief?.colorPalette || ["#7c3aed", "#06b6d4", "#0a0a0f"];
  const primary = colors[0];

  for (const [filePath, content] of Object.entries(files)) {
    if (typeof content !== "string") continue;

    // Find all import statements
    const importMatches = [...content.matchAll(/import\s+(\w+)\s+from\s+'\.\/([^']+)'/g)];

    for (const match of importMatches) {
      const componentName = match[1];
      const importedFile  = `/${match[2]}`;

      // Add .js if missing
      const normalizedPath = importedFile.endsWith(".js")
        ? importedFile
        : `${importedFile}.js`;

      // Auto-create if missing
      if (!result[normalizedPath]) {
        console.log(`Formatter: auto-creating missing ${normalizedPath}`);
        result[normalizedPath] = `import React from 'react';
export default function ${componentName}() {
  return (
    <section style={{ padding: "80px 48px", color: "#fff" }}>
      <h2 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 800,
                   letterSpacing: "-0.03em", marginBottom: "20px",
                   background: "linear-gradient(135deg, ${primary}, #fff)",
                   WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        ${componentName}
      </h2>
      <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.5)", lineHeight: 1.8 }}>
        ${brief?.businessName || "Brand"} — ${componentName} section
      </p>
    </section>
  );
}`;
      }
    }
  }

  return result;
}