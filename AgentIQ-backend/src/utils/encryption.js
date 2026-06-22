import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey() {
    const keyHex = process.env.TOKEN_ENCRYPTION_KEY;
    if (!keyHex || keyHex.length !== 64) {
        throw new Error(
            "TOKEN_ENCRYPTION_KEY must be 64-character hex string (32 bytes). " + 
            "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
        );
    }
    return Buffer.from(keyHex, "hex");
}

export function encryptToken(plaintext) {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
        cipher.update(plaintext, "utf8"), 
        cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
        iv.toString("hex"), 
        authTag.toString("hex"), 
        encrypted.toString("hex"),
    ].join(":");
}

export function decryptToken(encryptedString) {
    const key = getKey();
    const [ivHex, authTagHex, dataHex] = encryptedString.split(":");

    if (!ivHex || !authTagHex || !dataHex) {
        throw new Error("Malformed encrypted token string");
    }

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const encrypted = Buffer.from(dataHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
    ]);

    return decrypted.toString("utf8");
}