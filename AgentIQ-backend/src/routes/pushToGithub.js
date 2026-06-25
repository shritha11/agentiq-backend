import { Router } from "express";
import auth from "../middleware/auth.js";
import { db } from "../config/firebase.js";
import { getGithubToken } from "../utils/githubToken.js";

const router = Router();

function toBase64(content) {
    return Buffer.from(content, "utf8").toString("base64");
}

async function githubFetch(path, token, options = {}) {
    const res = await fetch(`https://api.github.com${path}`, {
        ...options, 
        headers: {
            Authorization: `Bearer ${token}`, 
            Accept: "application/vnd.github+json", 
            "Content-Type": "application/json", 
            "X-GitHub-Api-Version": "2022-11-28",
            ...Router(options.headers || {}),
        }, 
        body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(
            data.message || `GitHub API error ${res.status} on ${path}`
        );
    }

    return data;
}

router.post("/chats/:sessionId/push-to-github", auth, async (req, res) => {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    try {
        const githubAuth = await getGithubToken(userId);
        if (!githubAuth) {
            return res.status(401).json({
                error: "GitHub not connected.", 
                code: "GITHUB_NOT_CONNECTED",
            });
        }
        const { token, username } = githubAuth;

        const chatDoc = await db.collection("chats").doc(sessionId).get();
        if(!chatDoc.exists) {
            return res.status(404).json({ error: "Chat session not found." });
        }

        const chatData = chatDoc.data();
        const files = chatData?.response?.website?.files;
        const brief = chatData?.response?.website?.brief;
        
        if(!files || Object.keys(files).length === 0) {
            return res.status(400).json({
                error: "No website files found. Generate a website first.",
            });
        }

        // 1. CHECK IF THE REPO URL ALREADY EXISTS IN YOUR DATABASE
        let repoDetails = {
            html_url: chatData?.githubRepoUrl,
            full_name: chatData?.githubRepoFullName // We will save this to make updates easy
        };

        // 2. IF IT DOES NOT EXIST, CREATE IT FOR THE FIRST TIME
        let finalRepoId = chatData?.githubRepoId || null;
        if (!repoDetails.html_url) {
            const businessName = brief?.businessName || "agentiq-site";
            const cleanName = businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0,40);
            
            // ◄ FIXED: Take the last 5 characters of the sessionId to keep it completely unique!
            const uniqueId = sessionId.slice(-5); 
            const fullRepoName = `${cleanName}-${uniqueId}-by-agentiq`;

            console.log(`Creating unique repository: ${fullRepoName}`);
            
            const repo = await githubFetch("/user/repos", token, {
                method: "POST", 
                body: {
                    name: fullRepoName, 
                    description: brief?.tagline ? `${brief.tagline} - built with AgentIQ` : "Website built with AgentIQ",
                    private: false, 
                    auto_init: true,
                }
            });

            repoDetails.html_url = repo.html_url;
            repoDetails.full_name = repo.full_name;
            finalRepoId = repo.id;

            // Save the repository names to the database immediately
            await db.collection("chats").doc(sessionId).set(
                { 
                    githubRepoUrl: repo.html_url,
                    githubRepoFullName: repo.full_name, 
                    githubRepoId: repo.id
                }, 
                { merge: true }
            );

            await new Promise(resolve => setTimeout(resolve, 2500));
        }

        const repoFullName = repoDetails.full_name;
        const defaultBranch = "main";
        const pushResults = [];

        if (!files["/package.json"]) {
            files["/package.json"] = JSON.stringify({
                name: "agentiq-deployed-site",
                version: "1.0.0",
                private: true,
                dependencies: {
                    "react": "^18.2.0",
                    "react-dom": "^18.2.0",
                    "lucide-react": "^0.542.0",
                    "framer-motion": "^11.0.0",
                    "react-scripts": "5.0.1" 
                    // Handles standard compilation scripts beautifully
                },
                scripts: {
                    "start": "react-scripts start",
                    "build": "react-scripts build"
                },
                browserslist: {
                    "production": [">0.2%", "not dead", "not op_mini all"],
                    "development": ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]
                }
            }, null, 2);
        }

        // Standard index.js router link anchor
        if (!files["/src/index.js"] && !files["/index.js"]) {
            files["/src/index.js"] = `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from '../App';\n\nconst root = ReactDOM.createRoot(document.getElementById('root'));\nroot.render(<React.StrictMode><App /></React.StrictMode>);`;
        }

        // HTML base target anchor for React mount hooks
        if (!files["/public/index.html"]) {
            files["/public/index.html"] = `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <title>AgentIQ Site</title>\n  </head>\n  <body>\n    <div id="root"></div>\n  </body>\n</html>`;
        }
        
        // 3. PUSH FILES (GitHub updates existing files automatically if they exist)
        // 3. FIXED: BULK COMMIT FILES IN ONE single PIPELINE TRIGGER
        console.log("Packaging files into a unified Git Tree commit structure...");
        
        // Fetch the current main branch reference pointer head
        const currentRef = await githubFetch(`/repos/${repoFullName}/git/refs/heads/${defaultBranch}`, token, { method: "GET" });
        const latestCommitSha = currentRef.object.sha;
        
        // Fetch the active repository tree layout node 
        const latestCommit = await githubFetch(`/repos/${repoFullName}/git/commits/${latestCommitSha}`, token, { method: "GET" });
        const baseTreeSha = latestCommit.tree.sha;

        // Map every generated file layout cleanly into a single tree payload cluster
        const treeItems = [];
        
        // Force the structured package configurations inside the collection array payload
        files["/README.md"] = `# ${brief?.businessName || "AgentIQ Project"}\n\nBuilt with AgentIQ.`;

        for (const [filePath, content] of Object.entries(files)) {
            if (typeof content !== "string") continue;
            const normalizedPath = filePath.replace(/^\//, "");
            
            treeItems.push({
                path: normalizedPath,
                mode: "100644", // Standard file indicator token code
                type: "blob",
                content: content
            });
        }

        // Push unified batch tree configuration layout over to GitHub
        const newTree = await githubFetch(`/repos/${repoFullName}/git/trees`, token, {
            method: "POST",
            body: {
                base_tree: baseTreeSha,
                tree: treeItems
            }
        });

        // Register a clean single commit event wrapper node element
        const newCommit = await githubFetch(`/repos/${repoFullName}/git/commits`, token, {
            method: "POST",
            body: {
                message: "Sync complete website build package via AgentIQ Engine",
                tree: newTree.sha,
                parents: [latestCommitSha]
            }
        });

        // Shift your repository pointer target safely forward matching the new single build signature record 
        await githubFetch(`/repos/${repoFullName}/git/refs/heads/${defaultBranch}`, token, {
            method: "PATCH",
            body: {
                sha: newCommit.sha,
                force: true
            }
        });
        
        console.log("Unified multi-file commit successfully executed on GitHub!");

        // Push README
        const readmeContent = `# ${brief?.businessName || "AgentIQ Project"}\n\nBuilt with AgentIQ.`;
        let readmeSha = undefined;
        try {
            const existingReadme = await githubFetch(`/repos/${repoFullName}/contents/README.md`, token, { method: "GET" });
            readmeSha = existingReadme.sha;
        } catch (e) {}

        try {
            await githubFetch(`/repos/${repoFullName}/contents/README.md`, token, {
                method: "PUT", 
                body: { message: "Update README", content: toBase64(readmeContent), branch: defaultBranch, sha: readmeSha }
            });
        } catch (readmeErr) {}

        // --- START DYNAMIC VERCEL AGENTIQ DEPLOYMENT SYSTEM ---
        let deployUrl = chatData?.vercelDeployUrl || null;
        const vercelToken = process.env.VERCEL_AUTH_TOKEN;

        if (vercelToken) {
            try {
                const repoName = repoFullName.split("/")[1];
                const vercelProjectName = repoName; // Using the clean, normalized slug name

                console.log(`Checking/Creating Vercel Project: ${vercelProjectName}`);

                // 1. Ask Vercel if this project already exists
                let projectRes = await fetch(`https://api.vercel.com/v9/projects/${vercelProjectName}`, {
                    headers: { Authorization: `Bearer ${vercelToken}` }
                });

                // 2. If it does not exist, build a completely separate project configuration block
                if (projectRes.status === 404) {
                    console.log(`Project doesn't exist. Creating fresh Vercel Project instance...`);
                    const createRes = await fetch("https://api.vercel.com/v9/projects", {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${vercelToken}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            name: vercelProjectName,
                            framework: "vite", // Maps to Sandpack template expectations
                            gitRepository: {
                                type: "github",
                                repo: repoFullName // Connects it directly to the user's repository path
                            }
                        })
                    });

                    if (!createRes.ok) {
                        const errData = await createRes.json();
                        throw new Error(`Vercel Project Creation Error: ${errData.error?.message}`);
                    }
                }

                // 3. Trigger an production deployment allocation build link configuration path
                console.log(`Triggering direct production build sequence layout for ${vercelProjectName}...`);
                const deployTriggerRes = await fetch("https://api.vercel.com/v13/deployments", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${vercelToken}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        name: vercelProjectName,
                        gitSource: {
                            type: "github",
                            ref: defaultBranch,
                            repoId: String(finalRepoId)// Optional fallback optimization parsing
                        },
                        projectSettings: { framework: "vite" }
                    })
                });

                const deployData = await deployTriggerRes.json();
                
                if (deployTriggerRes.ok) {
                    // This returns the precise custom production URL mapping assigned by Vercel
                    deployUrl = `https://${deployData.alias && deployData.alias[0] ? deployData.alias[0] : deployData.url}`;
                    
                    // Force https fallback if missing from structure
                    if (!deployUrl.startsWith("http")) {
                        deployUrl = `https://${deployUrl}`;
                    }

                    // Securely register the live link string parameter to your document node array
                    await db.collection("chats").doc(sessionId).set(
                        { vercelDeployUrl: deployUrl }, 
                        { merge: true }
                    );
                    console.log(`Vercel Live deployment linked completely: ${deployUrl}`);
                } else {
                    console.error("Vercel Build Deployment Execution Failed:", deployData.error);
                }

            } catch (vercelErr) {
                console.error("Dynamic Vercel Engine pipeline exception error:", vercelErr.message);
            }
        }
        // --- END DYNAMIC VERCEL AGENTIQ DEPLOYMENT SYSTEM ---

        const failedFiles = pushResults.filter((r) => r.status === "error");

        res.json({
            success: true, 
            repoUrl: repoDetails.html_url, 
            deployUrl: deployUrl,
            filesTotal: pushResults.length,
            filesFailed: failedFiles.length,
        });

    } catch (err) {
        console.log("Push to GitHub error:", err);
        res.status(500).json({ error: err.message || "Failed to push to GitHub" });
    }
});

export default router;