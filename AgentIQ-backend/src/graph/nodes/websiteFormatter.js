function removeBrokenImports(files) {
  const existingFiles = Object.keys(files);

  for (const filePath in files) {
    let content = files[filePath];

    const importRegex =
      /import\s+.+?\s+from\s+['"](.+?)['"]/g;

    content = content.replace(importRegex, (match, importPath) => {

      // ignore packages
      if (!importPath.startsWith(".")) {
        return match;
      }

      let resolvedPath = importPath;

      if (!resolvedPath.endsWith(".jsx")) {
        resolvedPath += ".jsx";
      }

      const normalized = resolvedPath
        .replace("./", "/src/components/");

      const exists = existingFiles.some((f) =>
        f.endsWith(normalized.replace("/src/components/", ""))
      );

      return exists ? match : "";
    });

    files[filePath] = content;
  }

  return files;
}

export async function websiteFormatterNode(state) {
  const { websiteRefined, websiteRaw, brief } = state;


  let generatedFiles = {};

  if (websiteRefined?.files && typeof websiteRefined.files === "object") {
    generatedFiles = websiteRefined.files;
  } else if (typeof websiteRefined === "string") {
    try {
      const parsed = JSON.parse(websiteRefined);
      generatedFiles = parsed?.files || {};
    } catch {
      // try websiteRaw as last resort
      try {
        const parsed = JSON.parse(websiteRaw);
        generatedFiles = parsed?.files || {};
      } catch {
        generatedFiles = {};
      }
    }
  }


  const mandatoryFiles = {

    "/package.json": `
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "framer-motion": "^11.0.0",
    "lucide-react": "^0.400.0"
  }
}
`,

    "/src/main.jsx": `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
  };

  const mergedFiles = {
    ...generatedFiles,
    ...mandatoryFiles,
    ...(generatedFiles["/src/App.jsx"] && generatedFiles["/src/App.jsx"].length > 80
      ? { "/src/App.jsx": generatedFiles["/src/App.jsx"] }
      : {}),
  };

  const appFile = mergedFiles["/src/App.jsx"] || "";

const componentMatches = [
  ...appFile.matchAll(/<([A-Z][A-Za-z0-9]*)/g),
];

const usedComponents = componentMatches.map(
  (m) => m[1]
);

usedComponents.forEach((component) => {
  if (component === "App") return;

  const componentPath =
    `/src/components/${component}.jsx`;

  if (!mergedFiles[componentPath]) {
    mergedFiles[componentPath] = `
export default function ${component}() {
  return (
    <section style={{
      padding: "120px 40px",
      color: "white"
    }}>
      <h2>${component}</h2>
    </section>
  );
}
`;
  }
});

  const validatedFiles = removeBrokenImports(mergedFiles);


  const hasApp = mergedFiles["/src/App.jsx"] || mergedFiles["/src/pages/Home.jsx"];

  if (!hasApp) {
    // Last resort fallback
    mergedFiles["/src/App.jsx"] = `import React from 'react';
export default function App() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "64px", fontWeight: 800, letterSpacing: "-0.04em", marginBottom: "16px" }}>
          ${brief?.businessName || "Site"}
        </h1>
        <p style={{ fontSize: "20px", color: "rgba(255,255,255,0.5)" }}>
          ${brief?.tagline || ""}
        </p>
      </div>
    </div>
  );
}`;
  }

  return {
    websiteFinal: {
      type: "website",
      files: validatedFiles,
      brief: {
        businessName: brief?.businessName,
        tagline:      brief?.tagline,
        colorPalette: brief?.colorPalette,
        businessType: brief?.businessType,
      },
    },
    currentStep: "websiteFormatter",
    steps: ["Website: Packaged and ready"],
  };
}