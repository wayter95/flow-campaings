import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY não definida. Gere uma com: openssl rand -hex 32"
    );
  }
  if (key.length !== 64) {
    throw new Error("ENCRYPTION_KEY deve ter exatamente 64 caracteres hexadecimais (32 bytes)");
  }
  return Buffer.from(key, "hex");
}

/**
 * Criptografa um texto usando AES-256-GCM
 * Retorna: iv:authTag:encrypted (hex encoded)
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Descriptografa um texto criptografado com encrypt()
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encrypted] = encryptedText.split(":");

  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error("Formato de texto criptografado inválido");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Mascara uma API key mostrando apenas os últimos 4 caracteres
 */
export function maskApiKey(key: string): string {
  if (key.length <= 4) return "****";
  return "•".repeat(key.length - 4) + key.slice(-4);
}
