export async function validatorNode(state) {
  const { generatedFiles } = state;

  console.log("Validator received files:", Object.keys(generatedFiles || {}));

  if (!generatedFiles || Object.keys(generatedFiles).length === 0) {
    return {
      failedFiles: [],
      currentStep: "validator",
      steps: ["Validator: No files to validate"],
    };
  }

  const failedFiles = [];
  const fileKeys = Object.keys(generatedFiles);

  for (const path of fileKeys) {
    const code = generatedFiles[path];

    // C object missing

if (
  code.includes("C.") &&
  !code.includes("const C")
) {
  console.warn(
    `Validator: ${path} uses C but never defines it`
  );

  failedFiles.push(path);
  continue;
}

// theme object missing

if (
  code.includes("theme.") &&
  !code.includes("const theme")
) {
  console.warn(
    `Validator: ${path} uses theme but never defines it`
  );

  failedFiles.push(path);
  continue;
}

if (
  code.includes("useState(") &&
  !code.includes("import React")
) {
  console.warn(
    `Validator: ${path} missing React import`
  );

  failedFiles.push(path);
  continue;
}

    if (!code || typeof code !== "string") {
      console.warn(`Validator: ${path} — empty or non-string`);
      failedFiles.push(path);
      continue;
    }

    // Too short — likely a skeleton or error
    if (code.trim().length < 50) {
      console.warn(`Validator: ${path} — too short (${code.length} chars)`);
      failedFiles.push(path);
      continue;
    }

    // Non-App files must export default
    if (path !== "/App.js" && path !== "/index.js" && path !== "/package.json") {
      if (!code.includes("export default")) {
        console.warn(`Validator: ${path} — missing export default`);
        failedFiles.push(path);
        continue;
      }
    }

    // Check imports reference files that actually exist
    const importMatches = [...code.matchAll(/from\s+['"](\.[^'"]+)['"]/g)];
    for (const match of importMatches) {
      let importPath = match[1];

      // Normalize to match our file keys
      if (!importPath.endsWith(".js")) importPath += ".js";
      const normalizedPath = importPath.startsWith("/")
        ? importPath
        : `/${importPath.replace("./", "")}`;

      if (!generatedFiles[normalizedPath]) {
        console.warn(`Validator: ${path} — broken import: ${match[1]} → ${normalizedPath}`);
        failedFiles.push(path);
        break;
      }
    }
  }

  const uniqueFailed = [...new Set(failedFiles)];
  console.log(`Validator: ${uniqueFailed.length} files need repair:`, uniqueFailed);

  return {
    failedFiles: uniqueFailed,
    currentStep: "validator",
    steps: [`Validator: ${fileKeys.length} checked, ${uniqueFailed.length} need repair`],
  };
}