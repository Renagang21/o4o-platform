"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyHash = exports.hash = exports.decrypt = exports.encrypt = void 0;
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = __importDefault(require("./logger"));
// Use environment variable or fallback to a default key (should be changed in production)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-32-char-encryption-key!!';
const IV_LENGTH = 16; // For AES, this is always 16
// Ensure key is 32 bytes for AES-256
const getKey = () => {
    const key = Buffer.from(ENCRYPTION_KEY);
    if (key.length < 32) {
        // Pad the key if it's too short
        const paddedKey = Buffer.alloc(32);
        key.copy(paddedKey);
        return paddedKey;
    }
    else if (key.length > 32) {
        // Truncate if too long
        return key.slice(0, 32);
    }
    return key;
};
const encrypt = (text) => {
    try {
        const iv = crypto_1.default.randomBytes(IV_LENGTH);
        const cipher = crypto_1.default.createCipheriv('aes-256-cbc', getKey(), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    }
    catch (error) {
        logger_1.default.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
};
exports.encrypt = encrypt;
const decrypt = (text) => {
    try {
        const textParts = text.split(':');
        if (textParts.length !== 2) {
            throw new Error('Invalid encrypted format');
        }
        const iv = Buffer.from(textParts[0], 'hex');
        const encryptedText = Buffer.from(textParts[1], 'hex');
        const decipher = crypto_1.default.createDecipheriv('aes-256-cbc', getKey(), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    }
    catch (error) {
        logger_1.default.error('Decryption error:', error);
        throw new Error('Failed to decrypt data');
    }
};
exports.decrypt = decrypt;
// Hash function for non-reversible data (like passwords)
const hash = (text) => {
    return crypto_1.default
        .createHash('sha256')
        .update(text)
        .digest('hex');
};
exports.hash = hash;
// Compare hash for verification
const verifyHash = (text, hashedText) => {
    return (0, exports.hash)(text) === hashedText;
};
exports.verifyHash = verifyHash;
//# sourceMappingURL=crypto.js.map