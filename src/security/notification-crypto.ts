import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const algorithm = "aes-256-gcm";

function encryptionKey(): Buffer {
  const supplied = process.env.SYNC_ENCRYPTION_KEY?.trim() ?? "";
  const key = Buffer.from(supplied, "base64");
  if (key.length !== 32 || key.toString("base64") !== supplied) {
    throw new Error("SYNC_ENCRYPTION_KEY inválida: se requieren 32 bytes en base64.");
  }
  return key;
}

/** Encrypt the notification's title and preview, never log either. */
export function encryptContent(title: string, message: string): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv(algorithm, encryptionKey(), nonce);
  const input = Buffer.from(JSON.stringify({ title, message }), "utf8");
  const ciphertext = Buffer.concat([cipher.update(input), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [nonce, tag, ciphertext].map(part => part.toString("base64url")).join(".");
}

export function decryptContent(value: string): { title: string; message: string } {
  const pieces = value.split(".");
  if (pieces.length !== 3) throw new Error("Formato de historial cifrado inválido");
  const [nonce, tag, ciphertext] = pieces.map(p => Buffer.from(p, "base64url"));
  if (nonce.length !== 12 || tag.length !== 16) throw new Error("Formato de cifrado inválido");
  const decipher = createDecipheriv(algorithm, encryptionKey(), nonce);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  const decoded: unknown = JSON.parse(plain.toString("utf8"));
  if (!decoded || typeof decoded !== "object" ||
      !("title" in decoded) || typeof decoded.title !== "string" ||
      !("message" in decoded) || typeof decoded.message !== "string") {
    throw new Error("Contenido cifrado inválido");
  }
  return { title: decoded.title, message: decoded.message };
}

export function hasValidEncryptionKey(): boolean {
  try {
    encryptionKey();
    return true;
  } catch {
    return false;
  }
}
