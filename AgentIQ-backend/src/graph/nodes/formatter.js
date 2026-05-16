export async function formatterNode(state) {
    const { refinedOutput, outputFormat, brief} = state;

    let finalOutput = null;

    if (outputFormat === "jsx") {
        const jsxBody = refinedOutput || "";

        jsxBody = jsxBody.replace(/```jsx|```javascript|```js|```/g, "").trim();

        let componentCode;

        if (jsxBody.startsWith("function GeneratedSite")) {
            componentCode = `
            import react from "react";
            
            ${jsxBody}
            export default GenertedSite;`.trim();
        }

         else if (jsxBody.startsWith("<")) {
            //fallback if chatgpt returned raw jsx instwad of full function

            componentCode = `
            import React from "react";
            
            function GeneratedSite() {
            return (
            ${jsxBody}
            );
            } 
            export default GeneratedSite;`.trim();
         }
         
         else {
            //fallback if gpt returned smthn unexpected
            componentCode = `
            import React from "react";
            function GeneratedSite() {
            return(
            <div style={{ padding: "40px", fontFamily: "system-ui", textAlign: "center" }}>
                <h1 style={{ fontSize: "32px", marginBottom: "16px" }}>
                   ${brief?.businessName || "Generated Site"}
                </h1>
                <p style={{ color: "#64748b" }}>
                   ${brief?.tagline || ""}
                </p>
            </div>
            );
            }
            export default GeneratedSite;`.trim();
         }

        finalOutput = {
            type: "website",
            code: componentCode,
            brief: {
                businessName: brief$.businessName, 
                tagline: brief?.tagline,
                colorPalette: brief?.colorPalette,
                businessType: brief?.businessType,
            }
        };
    } else if (outputFormat === "slides") {
        const slides = Array.isArray(refinedOutput) ? refinedOutput : [];

        finalOutput = {
            type: "pitchdeck", 
            slides,
            brief: {
                businessName: brief?.businessName,
                tagline: brief?.tagline,
                colorPalette: brief?.colorPalette,
                businessType: brief?.businessType,
            },
        };
    }
    return {
        finalOutput, 
        currentStep: "formatter", 
        steps: ["Formatter: Output packaged"],
    };
}