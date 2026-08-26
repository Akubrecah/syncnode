import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

function getValidatedJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.trim().length >= 32) {
    return secret.trim();
  }

  // Try parsing .env file if available
  try {
    const fs = require('node:fs');
    const path = require('node:path');
    const possiblePaths = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), '../../.env'),
      path.resolve(__dirname, '../../../.env'),
      path.resolve(__dirname, '../../.env')
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf8');
        const match = content.match(/^JWT_SECRET=(.+)$/m);
        if (match && match[1]?.trim().length >= 32) {
          const loaded = match[1].trim();
          process.env.JWT_SECRET = loaded;
          return loaded;
        }
      }
    }
  } catch {
    // Ignore fs errors in constrained environments
  }

  // In non-production/test/dev mode, provide compliant 32+ char fallback
  if (process.env.NODE_ENV !== 'production') {
    const devSecret = 'syncnode-enterprise-super-secure-jwt-secret-token-key-2026!';
    process.env.JWT_SECRET = devSecret;
    return devSecret;
  }

  throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable must be set and contain at least 32 characters (CRIT-001). Check .env.example.');
}

export const JWT_SECRET = getValidatedJwtSecret();
const ENCRYPTION_KEY = crypto.scryptSync(JWT_SECRET, 'syncnode-salt', 32);

/**
 * Strong password hashing using PBKDF2-HMAC-SHA512 with random 32-byte salt and 100,000 iterations.
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(32).toString('hex');
    crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verify password against stored hash with constant-time comparison to prevent timing attacks.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return resolve(false);

    crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) return reject(err);
      const keyBuffer = Buffer.from(key, 'hex');
      const match = crypto.timingSafeEqual(keyBuffer, derivedKey);
      resolve(match);
    });
  });
}

/**
 * Encrypt sensitive strings (e.g. private keys, secrets) using AES-256-GCM.
 */
export function encryptData(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt sensitive strings using AES-256-GCM with authentication tag verification.
 */
export function decryptData(cipherTextWithMeta: string): string {
  const [ivHex, authTagHex, encryptedHex] = cipherTextWithMeta.split(':');
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Invalid encrypted data format');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Generate a cryptographically secure random Base32 TOTP secret.
 */
export function generateTotpSecret(): string {
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = crypto.randomBytes(20);
  let secret = '';
  for (let i = 0; i < bytes.length; i++) {
    secret += base32Chars[bytes[i] % 32];
  }
  return secret;
}

/**
 * Verify RFC 6238 TOTP Token with ±1 window tolerance.
 */
export function verifyTotp(secret: string, token: string): boolean {
  if (!token || token.length !== 6) return false;
  const timeStep = 30;
  const currentEpoch = Math.floor(Date.now() / 1000);
  const currentStep = Math.floor(currentEpoch / timeStep);

  // Check current, previous, and next window
  for (let delta = -1; delta <= 1; delta++) {
    const expected = computeHotp(secret, currentStep + delta);
    if (expected === token) return true;
  }
  return false;
}

function computeHotp(base32Secret: string, counter: number): string {
  const base32Lookup: Record<string, number> = {
    A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9, K: 10, L: 11, M: 12, N: 13, O: 14, P: 15,
    Q: 16, R: 17, S: 18, T: 19, U: 20, V: 21, W: 22, X: 23, Y: 24, Z: 25, '2': 26, '3': 27, '4': 28, '5': 29, '6': 30, '7': 31
  };

  let bits = '';
  for (const char of base32Secret.toUpperCase()) {
    const val = base32Lookup[char];
    if (val === undefined) continue;
    bits += val.toString(2).padStart(5, '0');
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  const keyBuffer = Buffer.from(bytes);

  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', keyBuffer);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0xf;
  const code = ((digest[offset] & 0x7f) << 24) |
               ((digest[offset + 1] & 0xff) << 16) |
               ((digest[offset + 2] & 0xff) << 8) |
               (digest[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, '0');
}

/**
 * Generate API Key and Secret pair with SHA-256 hash.
 */
export function generateApiKeyPair(): { apiKey: string; apiSecret: string; secretHash: string } {
  const apiKey = `sn_key_${crypto.randomBytes(16).toString('hex')}`;
  const apiSecret = `sn_sec_${crypto.randomBytes(32).toString('hex')}`;
  const secretHash = crypto.createHash('sha256').update(apiSecret).digest('hex');
  return { apiKey, apiSecret, secretHash };
}

/**
 * Verify HMAC-SHA256 signature for API requests.
 */
export function verifyHmacSignature(
  apiSecret: string,
  payload: string,
  signature: string,
  timestamp: number
): boolean {
  // Enforce 30s maximum timestamp drift
  const now = Date.now();
  if (Math.abs(now - timestamp) > 30000) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', apiSecret)
    .update(`${timestamp}${payload}`)
    .digest('hex');

  const sigBuf = Buffer.from(signature, 'hex');
  const expBuf = Buffer.from(expectedSignature, 'hex');
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

/**
 * JWT Authentication Tokens
 */
export interface AuthJwtPayload {
  userId: string;
  email: string;
  role?: string;
  isTotpAuthenticated: boolean;
}

export function signToken(payload: AuthJwtPayload, expiresIn = '24h'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn as any });
}

export function verifyToken(token: string): AuthJwtPayload {
  return jwt.verify(token, JWT_SECRET) as AuthJwtPayload;
}
