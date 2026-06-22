import { Router } from "express";
import crypto from "crypto";
import auth from "../middleware/auth.js";
import { db } from "../config/firebase.js";
import { encryptToken, decryptToken } from "../utils/encryption.js";

const router = Router();

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const oauthStateStore = new Map();

function cleanupExpiredStates() {
    const now = Date.now();
    for (const [state, data] of oauthStateStore.entries()) {
        if (data.expiresAt < now) oauthStateStore.delete(state);
    }
}

router.get("/github/connect", auth, (req, res) => {
    cleanupExpiredStates();

    const userId = req.user.userId;
    const state = crypto.randomBytes(20).toString("hex");

    oauthStateStore.set(state, {
        userId, 
        expiresAt: Date.now() + 10 * 60 * 1000,
    });

    const params = new URLSearchParams({
        client_id: GITHUB_CLIENT_ID, 
        redirect_url: GITHUB_CALLBACK_URL, 
        scope: "repo", 
        state, 
        allow_signup: "true",
    });

    res.json({
        redirectUrl:  `https://github.com/login/oauth/authorize?${params.toString()}`,
    });
});

router.get("/github/callback", async (req, res) => {
    const { code, state, error: githubError } = req.query;

    if (githubError) {
        return res.redirect(`${CLIENT_URL}/settings?github_error=access_denied`);
    }

    const stateEntry = oauthStateStore.get(state);
    if (!stateEntry || stateEntry.expiresAt < Date.now()) {
        return res.redirect(`${CLIENT_URL}/settings?github_error=invalid_state`);
    }
    oauthStateStore.delete(state);

    const { userId } = stateEntry;

    try {
        const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
            method: "POST", 
            headers: {
                "Content-Type": "application/json", 
                Accept: "application/json",
            },
            body: JSON.stringify({
                client_id: GITHUB_CLIENT_ID, 
                client_secret: GITHUB_CLIENT_SECRET, 
                code, 
                redirect_uri: GITHUB_CALLBACK_URL,
            }),
        });

        const tokenData = await tokenRes.json();

        if (tokenData.error || !tokenData.access_token) {
            console.log("GitHub token failed:", tokenData);
            return res.redirect(`${CLIENT_URL}/settings?github_error=token_exchange_failed`);
        }

        const { access_token, scope, token_type } = tokenData;

        const profileRes = await fetch("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${access_token}`, 
                Accept: "application/vnd.github+json",
            },
        });
        
        const profile = await profileRes.json();

        const encryptedTokenString = encryptToken(access_token); 

        await db.collection("githubConnections").doc(userId).set({
            userId, 
            provider: profile.id, 
            githubUsername: profile.login, 
            githubAvatarUrl: profile.avatar_url,
            encryptedToken: encryptedTokenString, // FIXED: Matches your schema's decryption targets
            scope, 
            tokenType: token_type, 
            connectedAt: new Date(), 
            updatedAt: new Date(),
        }, { merge: true });

        return res.redirect(`${CLIENT_URL}/settings?github_connected=true`);
    } catch (err) {
        console.error("Github OAuth callback error:", err);
        return res.redirect(`${CLIENT_URL}/settings?github_error=server_error`);
    }
});

router.get("/github/status", auth, async(req, res) => {
    try {
        const userId = req.user.userId;
        const doc = await db.collection("githubConnections").doc(userId).get();

        if (!doc.exists) {
            return res.json({ connected: false });
        }

        const data = doc.data();
        res.json({
            connected: true, 
            githubUsername: data.githubUsername, 
            githubAvatarUrl: data.githubAvatarUrl, 
            connectedAt: data.connectedAt,
        });
    } catch (err) {
        console.log("Github status check error:", err);
        res.status(500).json({ error: "Failed to check GitHub connection status"});
    }
});

router.delete("/github/disconnect", auth, async(req, res) => {
    try {
        const userId = req.user.userId;
        const doc = await db.collection("githubConnections").doc(userId).get();

        if (doc.exists) {
            const { encryptedToken } = doc.data();

            try {
                const token = decryptToken(encryptToken);
                await fetch(`https://api.github.com/applications/${GITHUB_CLIENT_ID}/grant`, {
                    method: "DELETE",
                    headers: {
                        Authorization: `Basic ${Buffer.from(`${GITHUB_CLIENT_ID}:${GITHUB_CLIENT_SECRET}`).toString("base64")}`,
                        Accept: "application/vnd.github+json",
                    }, 
                    body: JSON.stringify({ access_token: token }),
                });
            } catch (revokeErr) {
                console.log("Could not revoke GitHub token (continuing anyway):", revokeErr.message);
            }
        }

        await db.collection("githubConnections").doc(userId).delete();
        res.json({ success: true });
    } catch (err) {
        console.log("GitHub disconnect error:", err);
        res.status(500).json({ error: "Failed to disconnect GitHub" });
    }
});

export default router;