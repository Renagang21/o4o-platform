import crypto from 'crypto';
import logger from './logger';

// Use environment variable or fallback to a default key (should be changed in production)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-32-char-encryption-key!!';
const IV_LENGTH = 16; // For AES, this is always 16

// Ensure key is 32 bytes for AES-256
const getKey = (): Buffer => {
  const key = Buffer.from(ENCRYPTION_KEY);
  if (key.length < 32) {
    // Pad the key if it's too short
    const paddedKey = Buffer.alloc(32);
    key.copy(paddedKey);
    return paddedKey;
  } else if (key.length > 32) {
    // Truncate if too long
    return key.slice(0, 32);
  }
  return key;
};

export const encrypt = (text: string): string => {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      getKey(),
      iv
    );
    
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    logger.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

export const decrypt = (text: string): string => {
  try {
    const textParts = text.split(':');
    if (textParts.length !== 2) {
      throw new Error('Invalid encrypted format');
    }
    
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedText = Buffer.from(textParts[1], 'hex');
    
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      getKey(),
      iv
    );
    
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
  } catch (error) {
    logger.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

// Hash function for non-reversible data (like passwords)
export const hash = (text: string): string => {
  return crypto
    .createHash('sha256')
    .update(text)
    .digest('hex');
};

// Compare hash for verification
export const verifyHash = (text: string, hashedText: string): boolean => {
  return hash(text) === hashedText;
};