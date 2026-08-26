"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.encryptData = encryptData;
exports.decryptData = decryptData;
exports.generateTotpSecret = generateTotpSecret;
exports.verifyTotp = verifyTotp;
exports.generateApiKeyPair = generateApiKeyPair;
exports.verifyHmacSignature = verifyHmacSignature;
exports.signToken = signToken;
exports.verifyToken = verifyToken;
const node_crypto_1 = __importDefault(require("node:crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'syncnode-enterprise-cex-jwt-secret-key-32chars!';
const ENCRYPTION_KEY = node_crypto_1.default.scryptSync(JWT_SECRET, 'syncnode-salt', 32);
/**
 * Strong password hashing using PBKDF2-HMAC-SHA512 with random 32-byte salt and 100,000 iterations.
 */
async function hashPassword(password) {
    return new Promise((resolve, reject) => {
        const salt = node_crypto_1.default.randomBytes(32).toString('hex');
        node_crypto_1.default.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
            if (err)
                return reject(err);
            resolve(`${salt}:${derivedKey.toString('hex')}`);
        });
    });
}
/**
 * Verify password against stored hash with constant-time comparison to prevent timing attacks.
 */
async function verifyPassword(password, storedHash) {
    return new Promise((resolve, reject) => {
        const [salt, key] = storedHash.split(':');
        if (!salt || !key)
            return resolve(false);
        node_crypto_1.default.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
            if (err)
                return reject(err);
            const keyBuffer = Buffer.from(key, 'hex');
            const match = node_crypto_1.default.timingSafeEqual(keyBuffer, derivedKey);
            resolve(match);
        });
    });
}
/**
 * Encrypt sensitive strings (e.g. private keys, secrets) using AES-256-GCM.
 */
function encryptData(plaintext) {
    const iv = node_crypto_1.default.randomBytes(12);
    const cipher = node_crypto_1.default.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}
/**
 * Decrypt sensitive strings using AES-256-GCM with authentication tag verification.
 */
function decryptData(cipherTextWithMeta) {
    const [ivHex, authTagHex, encryptedHex] = cipherTextWithMeta.split(':');
    if (!ivHex || !authTagHex || !encryptedHex) {
        throw new Error('Invalid encrypted data format');
    }
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = node_crypto_1.default.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
/**
 * Generate a cryptographically secure random Base32 TOTP secret.
 */
function generateTotpSecret() {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const bytes = node_crypto_1.default.randomBytes(20);
    let secret = '';
    for (let i = 0; i < bytes.length; i++) {
        secret += base32Chars[bytes[i] % 32];
    }
    return secret;
}
/**
 * Verify RFC 6238 TOTP Token with ±1 window tolerance.
 */
function verifyTotp(secret, token) {
    if (!token || token.length !== 6)
        return false;
    const timeStep = 30;
    const currentEpoch = Math.floor(Date.now() / 1000);
    const currentStep = Math.floor(currentEpoch / timeStep);
    // Check current, previous, and next window
    for (let delta = -1; delta <= 1; delta++) {
        const expected = computeHotp(secret, currentStep + delta);
        if (expected === token)
            return true;
    }
    return false;
}
function computeHotp(base32Secret, counter) {
    const base32Lookup = {
        A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9, K: 10, L: 11, M: 12, N: 13, O: 14, P: 15,
        Q: 16, R: 17, S: 18, T: 19, U: 20, V: 21, W: 22, X: 23, Y: 24, Z: 25, '2': 26, '3': 27, '4': 28, '5': 29, '6': 30, '7': 31
    };
    let bits = '';
    for (const char of base32Secret.toUpperCase()) {
        const val = base32Lookup[char];
        if (val === undefined)
            continue;
        bits += val.toString(2).padStart(5, '0');
    }
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.substring(i, i + 8), 2));
    }
    const keyBuffer = Buffer.from(bytes);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter));
    const hmac = node_crypto_1.default.createHmac('sha1', keyBuffer);
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
function generateApiKeyPair() {
    const apiKey = `sn_key_${node_crypto_1.default.randomBytes(16).toString('hex')}`;
    const apiSecret = `sn_sec_${node_crypto_1.default.randomBytes(32).toString('hex')}`;
    const secretHash = node_crypto_1.default.createHash('sha256').update(apiSecret).digest('hex');
    return { apiKey, apiSecret, secretHash };
}
/**
 * Verify HMAC-SHA256 signature for API requests.
 */
function verifyHmacSignature(apiSecret, payload, signature, timestamp) {
    // Enforce 30s maximum timestamp drift
    const now = Date.now();
    if (Math.abs(now - timestamp) > 30000) {
        return false;
    }
    const expectedSignature = node_crypto_1.default
        .createHmac('sha256', apiSecret)
        .update(`${timestamp}${payload}`)
        .digest('hex');
    const sigBuf = Buffer.from(signature, 'hex');
    const expBuf = Buffer.from(expectedSignature, 'hex');
    if (sigBuf.length !== expBuf.length)
        return false;
    return node_crypto_1.default.timingSafeEqual(sigBuf, expBuf);
}
function signToken(payload, expiresIn = '24h') {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: expiresIn });
}
function verifyToken(token) {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
}
//# sourceMappingURL=crypto.js.map