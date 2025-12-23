// Simple XOR Obfuscation to prevent plain-text reading of keys
// Note: This is client-side "security through obscurity".
// It protects against casual snooping but not determined attackers with access to the browser.

const SECRET_SALT = "MYC_SUPREME_V18_SECURE_SALT";

export const KeyVault = {
    encrypt: (text: string): string => {
        if (!text) return "";
        try {
            const chars = text.split('');
            const xor = chars.map((c, i) => {
                const code = c.charCodeAt(0) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length);
                return code.toString(16).padStart(2, '0');
            });
            return "ENC_" + xor.join('');
        } catch (e) {
            console.error("Encryption failed", e);
            return text;
        }
    },

    decrypt: (encrypted: string): string => {
        if (!encrypted) return "";
        if (!encrypted.startsWith("ENC_")) return encrypted; // Legacy/Plain support
        try {
            const hex = encrypted.substring(4);
            let result = "";
            for (let i = 0; i < hex.length; i += 2) {
                const code = parseInt(hex.substr(i, 2), 16);
                const charCode = code ^ SECRET_SALT.charCodeAt((i / 2) % SECRET_SALT.length);
                result += String.fromCharCode(charCode);
            }
            return result;
        } catch (e) {
            console.error("Decryption failed", e);
            return "";
        }
    }
};
