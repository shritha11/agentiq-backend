// src/utils/githubToken.js
import { db } from "../config/firebase.js";
import { decryptToken } from "./encryption.js";

/**
 * Retrieves and decrypts a user's GitHub access token.
 * Call this server-side only, right before making a GitHub API call.
 * NEVER send the decrypted token to the frontend.
 *
 * @param {string} userId
 * @returns {Promise<{token: string, username: string} | null>}
 */
export async function getGithubToken(userId) {
  const doc = await db.collection("githubConnections").doc(userId).get();

  if (!doc.exists) return null;

  const data = doc.data();
  const token = decryptToken(data.encryptedToken);

  return {
    token,
    username: data.githubUsername,
  };
}