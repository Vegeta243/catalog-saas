/**
 * lib/encryption.ts
 * AES-256-GCM authenticated encryption for storing sensitive tokens at rest
 * (e.g. Shopify access tokens in the database).
 *
 * ENCRYPTION_KEY must be exactly 32 bytes (64 hex chars).
 * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

function getKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) throw new Error('ENCRYPTION_KEY environment variable is not set');
  const buf = Buffer.from(keyHex, 'hex');
  if (buf.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)');
  }
  return buf;
}

/**
 * Encrypt plaintext with AES-256-GCM.
 * Returns "ivHex:authTagHex:ciphertextHex" — all three parts needed for decryption.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM;

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a value produced by encrypt().
 * Throws if the auth tag is invalid (tampered ciphertext).
 */
export function decrypt(encryptedText: string): string {
  const key = getKey();
  const parts = encryptedText.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted format (expected iv:tag:cipher)');

  const [ivHex, authTagHex, cipherHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  if (iv.length !== IV_LENGTH) throw new Error('Invalid IV length');
  if (authTag.length !== AUTH_TAG_LENGTH) throw new Error('Invalid auth tag length');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv) as crypto.DecipherGCM;
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Decrypt safely — returns the input as-is if it does not look encrypted.
 * Useful for migrating plaintext tokens to encrypted ones: read always uses this,
 * write always uses encrypt().
 */
export function safeDecrypt(text: string): string {
  if (!text) return text;
  // Encrypted values look like: <32hexchars>:<32hexchars>:<anyhex>
  const parts = text.split(':');
  if (parts.length !== 3 || parts[0].length !== 32 || parts[1].length !== 32) {
    // Looks like a plaintext token — return as-is (graceful migration)
    return text;
  }
  try {
    return decrypt(text);
  } catch {
    // Decryption failed — could be a plaintext token that happens to look like encrypted
    return text;
  }
}

/**
 * Check if a value is already in encrypted format.
 */
export function isEncrypted(text: string): boolean {
  if (!text) return false;
  const parts = text.split(':');
  return parts.length === 3 && parts[0].length === 32 && parts[1].length === 32;
}
