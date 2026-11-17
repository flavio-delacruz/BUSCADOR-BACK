import { createHash, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import mongoose from "mongoose";
import { hasValidEncryptionKey } from "./notification-crypto";

// This first version deliberately supports one private owner.
// Never ship a shared token inside a publicly distributed APK.
export const ownerId = "personal";

function equalsToken(received: string, expected: string): boolean {
  const a = createHash("sha256").update(received, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export const requireSyncAccess: RequestHandler = (request, response, next) => {
  const token = process.env.SYNC_API_TOKEN?.trim() ?? "";
  if (token.length < 32 || !hasValidEncryptionKey() ||
      mongoose.connection.readyState !== 1) {
    response.status(503).json({
      error: "Sincronización no configurada. Revisa MongoDB y las claves del servidor."
    });
    return;
  }

  const authorization = request.header("authorization") ?? "";
  const match = /^Bearer ([A-Za-z0-9._~+/=-]{32,256})$/.exec(authorization);
  if (!match || !equalsToken(match[1], token)) {
    response.setHeader("WWW-Authenticate", "Bearer");
    response.status(401).json({ error: "Acceso no autorizado" });
    return;
  }
  next();
};
