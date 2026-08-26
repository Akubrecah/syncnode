/**
 * Strong password hashing using PBKDF2-HMAC-SHA512 with random 32-byte salt and 100,000 iterations.
 */
export declare function hashPassword(password: string): Promise<string>;
/**
 * Verify password against stored hash with constant-time comparison to prevent timing attacks.
 */
export declare function verifyPassword(password: string, storedHash: string): Promise<boolean>;
/**
 * Encrypt sensitive strings (e.g. private keys, secrets) using AES-256-GCM.
 */
export declare function encryptData(plaintext: string): string;
/**
 * Decrypt sensitive strings using AES-256-GCM with authentication tag verification.
 */
export declare function decryptData(cipherTextWithMeta: string): string;
/**
 * Generate a cryptographically secure random Base32 TOTP secret.
 */
export declare function generateTotpSecret(): string;
/**
 * Verify RFC 6238 TOTP Token with ±1 window tolerance.
 */
export declare function verifyTotp(secret: string, token: string): boolean;
/**
 * Generate API Key and Secret pair with SHA-256 hash.
 */
export declare function generateApiKeyPair(): {
    apiKey: string;
    apiSecret: string;
    secretHash: string;
};
/**
 * Verify HMAC-SHA256 signature for API requests.
 */
export declare function verifyHmacSignature(apiSecret: string, payload: string, signature: string, timestamp: number): boolean;
/**
 * JWT Authentication Tokens
 */
export interface AuthJwtPayload {
    userId: string;
    email: string;
    role?: string;
    isTotpAuthenticated: boolean;
}
export declare function signToken(payload: AuthJwtPayload, expiresIn?: string): string;
export declare function verifyToken(token: string): AuthJwtPayload;
