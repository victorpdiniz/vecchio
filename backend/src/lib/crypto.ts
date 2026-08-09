import crypto from 'node:crypto';
import { env } from './env.js';
import { AppError } from './errors.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

// A chave em PASSWORD_ENCRYPTION_KEY pode ter qualquer tamanho (é uma
// senha-mestra escolhida pelo admin) — reduz para 32 bytes via SHA-256
// para caber no AES-256.
function getKey(): Buffer {
  if (!env.PASSWORD_ENCRYPTION_KEY) {
    throw new AppError(
      'O cofre de senhas ainda não foi configurado. Peça para o administrador definir PASSWORD_ENCRYPTION_KEY em backend/.env.',
      503,
    );
  }
  return crypto.createHash('sha256').update(env.PASSWORD_ENCRYPTION_KEY).digest();
}

// Formato do valor persistido: iv (12 bytes) + authTag (16 bytes) +
// ciphertext, concatenados e codificados em base64 num único campo string.
export function encryptSecret(plainText: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decryptSecret(payload: string): string {
  const key = getKey();
  const raw = Buffer.from(payload, 'base64');
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}
