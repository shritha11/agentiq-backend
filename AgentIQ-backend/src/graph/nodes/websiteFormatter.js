import { AzureChatOpenAI} from "@langchain/openai";

const llm = new AzureChatOpenAI({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_ENDPOINT,
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    temperature: 0.6,
    maxTokens: 8000,
});

let componentCode = "";

export async function websiteFormatterNode(state) {
  const { websiteRefined, brief } =
    state;

  let jsxBody =
    websiteRefined || "";

  jsxBody = jsxBody
    .replace(
      /```jsx|```javascript|```js|```/g,
      ""
    )
    .trim();

  // CASE 1
  // AI returned full component
  if (
    jsxBody.includes(
      "function GeneratedSite"
    )
  ) {
    jsxBody = jsxBody.replace(
      "function GeneratedSite",
      "export default function App"
    );

    componentCode = `
import React from "react";

${jsxBody}
`.trim();
  }

  // CASE 2
  // AI returned raw JSX
  else if (jsxBody.startsWith("<")) {
    componentCode = `
import React from "react";

export default function App() {
  return (
    ${jsxBody}
  );
}
`.trim();
  }

  // CASE 3
  // fallback
  else {
    componentCode = `
import React from "react";

export default function App() {
  return (
    <div
      style={{
        padding: "40px",
        fontFamily: "system-ui",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontSize: "32px",
          marginBottom: "16px",
        }}
      >
        ${
          brief?.businessName ||
          "Generated Site"
        }
      </h1>

      <p
        style={{
          color: "#64748b",
        }}
      >
        ${brief?.tagline || ""}
      </p>
    </div>
  );
}
`.trim();
  }

  return {
    websiteFinal: {
      type: "website",
      code: componentCode,
      brief,
    },

    currentStep: "websiteFormatter",

    steps: ["Website packaged"],
  };
}