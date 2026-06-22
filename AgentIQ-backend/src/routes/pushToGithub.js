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
        if (!repoDetails.html_url) {
            const businessName = brief?.businessName || "agentiq-site";
            const repoName = businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0,50);
            const fullRepoName = `${repoName}-by-agentiq`;

            const repo = await githubFetch("/user/repos", token, {
                method: "POST", 
                body: {
                    name: fullRepoName, 
                    description: brief?.tagline ? `${brief.tagline} - built with AgentIQ` : "Website built with AgentIQ",
                    private: false, 
                    auto_init: false,
                }
            });

            repoDetails.html_url = repo.html_url;
            repoDetails.full_name = repo.full_name;

            // Save the repository names to the database immediately
            await db.collection("chats").doc(sessionId).set(
                { 
                    githubRepoUrl: repo.html_url,
                    githubRepoFullName: repo.full_name 
                }, 
                { merge: true }
            );
        }

        const repoFullName = repoDetails.full_name;
        const defaultBranch = "main";
        const pushResults = [];
        
        // 3. PUSH FILES (GitHub updates existing files automatically if they exist)
        for (const [filePath, content] of Object.entries(files)) {
            if (typeof content !== "string") continue;
            const normalizedPath = filePath.replace(/^\//, "");

            // To update a file, we first check if it exists to get its unique SHA ID
            let sha = undefined;
            try {
                const existingFile = await githubFetch(`/repos/${repoFullName}/contents/${normalizedPath}`, token, { method: "GET" });
                sha = existingFile.sha; // ◄ This is the key that tells GitHub to edit, not duplicate!
            } catch (e) {
                // File doesn't exist yet, which is fine!
            }

            try {
                await githubFetch(`/repos/${repoFullName}/contents/${normalizedPath}`, 
                    token, 
                    {
                        method: "PUT", 
                        body: {
                            message: `Update ${normalizedPath}`, 
                            content: toBase64(content), 
                            branch: defaultBranch,
                            sha: sha // ◄ Pass the SHA key if we found one
                        }
                    }
                );
                pushResults.push({ path: normalizedPath, status: "ok" });
            } catch(fileErr) {
                console.log(`Failed to push ${normalizedPath}:`, fileErr.message);
                pushResults.push({ path: normalizedPath, status: "error", error: fileErr.message });
            }
        }

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

        const failedFiles = pushResults.filter((r) => r.status === "error");

        res.json({
            success: true, 
            repoUrl: repoDetails.html_url, 
            filesTotal: pushResults.length,
            filesFailed: failedFiles.length,
        });

    } catch (err) {
        console.log("Push to GitHub error:", err);
        res.status(500).json({ error: err.message || "Failed to push to GitHub" });
    }
});

export default router;