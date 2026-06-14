import crypto from 'crypto';

interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  authTag: string;
  encryptedDek: string;
  keyId: string;
}

/**
 * Gets the master Key Encryption Key (KEK).
 * Derives a 256-bit key from the ENCRYPTION_KEY environment variable.
 */
function getMasterKek(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  if (!envKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL SECURITY ERROR: ENCRYPTION_KEY environment variable is not defined!');
    }
    // Fallback key only for local development - log warning
    console.warn(
      '⚠️ WARNING: ENCRYPTION_KEY is not defined. Using an insecure fallback key for local development.'
    );
    return crypto.createHash('sha256').update('fallback-local-key-backupper').digest();
  }
  return crypto.createHash('sha256').update(envKey).digest();
}

/**
 * Encrypts a payload object using envelope encryption (AES-256-GCM).
 */
export function encryptCredential(payload: Record<string, any>): EncryptedPayload {
  try {
    const kek = getMasterKek();

    // 1. Generate a random 256-bit Data Encryption Key (DEK)
    const dek = crypto.randomBytes(32);

    // 2. Encrypt the payload with the DEK
    const payloadStr = JSON.stringify(payload);
    const payloadIv = crypto.randomBytes(12); // 12-byte IV for GCM
    const payloadCipher = crypto.createCipheriv('aes-256-gcm', dek, payloadIv);

    let payloadCiphertext = payloadCipher.update(payloadStr, 'utf8', 'base64');
    payloadCiphertext += payloadCipher.final('base64');
    const payloadAuthTag = payloadCipher.getAuthTag().toString('base64');

    // 3. Encrypt the DEK using the master KEK
    const dekIv = crypto.randomBytes(12);
    const dekCipher = crypto.createCipheriv('aes-256-gcm', kek, dekIv);

    let dekCiphertext = dekCipher.update(dek, undefined, 'base64');
    dekCiphertext += dekCipher.final('base64');
    const dekAuthTag = dekCipher.getAuthTag().toString('base64');

    // 4. Serialize the encrypted DEK metadata
    const encryptedDekPackage = JSON.stringify({
      ciphertext: dekCiphertext,
      iv: dekIv.toString('base64'),
      authTag: dekAuthTag,
    });
    const encryptedDekBase64 = Buffer.from(encryptedDekPackage).toString('base64');

    return {
      ciphertext: payloadCiphertext,
      iv: payloadIv.toString('base64'),
      authTag: payloadAuthTag,
      encryptedDek: encryptedDekBase64,
      keyId: 'v1',
    };
  } catch (error: any) {
    throw new Error(`Credential encryption failed: ${error.message}`);
  }
}

/**
 * Decrypts an encrypted credential payload using envelope encryption (AES-256-GCM).
 */
export function decryptCredential(encrypted: EncryptedPayload): Record<string, any> {
  try {
    const kek = getMasterKek();

    // 1. Base64 decode and parse the encrypted DEK package
    const dekPackageStr = Buffer.from(encrypted.encryptedDek, 'base64').toString('utf8');
    const dekPackage = JSON.parse(dekPackageStr);

    const dekIv = Buffer.from(dekPackage.iv, 'base64');
    const dekCiphertext = Buffer.from(dekPackage.ciphertext, 'base64');
    const dekAuthTag = Buffer.from(dekPackage.authTag, 'base64');

    // 2. Decrypt the DEK using the master KEK
    const dekDecipher = crypto.createDecipheriv('aes-256-gcm', kek, dekIv);
    dekDecipher.setAuthTag(dekAuthTag);

    let dek = dekDecipher.update(dekCiphertext);
    dek = Buffer.concat([dek, dekDecipher.final()]);

    // 3. Decrypt the payload using the decrypted DEK
    const payloadIv = Buffer.from(encrypted.iv, 'base64');
    const payloadCiphertext = encrypted.ciphertext;
    const payloadAuthTag = Buffer.from(encrypted.authTag, 'base64');

    const payloadDecipher = crypto.createDecipheriv('aes-256-gcm', dek, payloadIv);
    payloadDecipher.setAuthTag(payloadAuthTag);

    let decryptedStr = payloadDecipher.update(payloadCiphertext, 'base64', 'utf8');
    decryptedStr += payloadDecipher.final('utf8');

    // 4. Return deserialized object
    return JSON.parse(decryptedStr);
  } catch (error: any) {
    throw new Error(`Credential decryption failed: ${error.message}`);
  }
}
