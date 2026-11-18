import { Router, type RequestHandler } from "express";
import { createHash, randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { z } from "zod";
import { Account } from "../models/account.model";
import { Session } from "../models/session.model";
import { hashPassword, matchesPassword } from "../security/password";

export const authRouter = Router();
const sevenDays = 7 * 24 * 60 * 60 * 1000;

const credentials = z.object({
  email: z.email().max(254).transform(v => v.trim().toLowerCase()),
  password: z.string().min(10).max(128)
}).strict();

// Basic single-process attempt limiter. For production, use an external shared
// limiter and email verification; a forged X-Forwarded-For is never trusted here.
const attempts = new Map<string, { count: number; start: number }>();
const throttle: RequestHandler = (request, response, next) => {
  const now = Date.now();
  const ip = request.socket.remoteAddress ?? "unknown";
  if (attempts.size > 10000) attempts.clear();
  const attempt = attempts.get(ip);
  if (!attempt || now - attempt.start > 15 * 60 * 1000) {
    attempts.set(ip, { count: 1, start: now });
    next();
    return;
  }
  attempt.count++;
  if (attempt.count > 25) {
    response.status(429).json({ error: "Demasiados intentos. Intenta más tarde." });
    return;
  }
  next();
};

const requireDatabase: RequestHandler = (_request, response, next) => {
  if (mongoose.connection.readyState !== 1) {
    response.status(503).json({ error: "El servidor de cuentas no está disponible." });
    return;
  }
  next();
};
authRouter.use(requireDatabase);

function digest(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

async function createSession(accountId: mongoose.Types.ObjectId) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sevenDays);
  await Session.create({ accountId, tokenHash: digest(token), expiresAt });
  return { token, expiresAt: expiresAt.toISOString() };
}

authRouter.post("/register", throttle, async (request, response) => {
  const parsed = credentials.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "Usa un correo válido y una contraseña de 10 a 128 caracteres." });
    return;
  }
  const { email, password } = parsed.data;
  const previous = await Account.exists({ email });
  if (previous) {
    response.status(409).json({ error: "Este correo ya está registrado." });
    return;
  }

  const passwordHash = await hashPassword(password);
  try {
    const account = await Account.create({ email, passwordHash });
    const session = await createSession(account._id);
    response.status(201).json({ user: { id: account._id.toString(), email }, ...session });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === 11000) {
      response.status(409).json({ error: "Este correo ya está registrado." });
      return;
    }
    throw err;
  }
});

authRouter.post("/login", throttle, async (request, response) => {
  const parsed = credentials.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "Credenciales inválidas." });
    return;
  }
  const { email, password } = parsed.data;
  const account = await Account.findOne({ email }).select("+passwordHash");
  // No account existence detail is exposed on login.
  if (!account || !(await matchesPassword(password, account.passwordHash))) {
    response.status(401).json({ error: "Correo o contraseña incorrectos." });
    return;
  }
  const session = await createSession(account._id);
  response.json({ user: { id: account._id.toString(), email }, ...session });
});

const requireSession: RequestHandler = async (request, response, next) => {
  const bearer = request.get("authorization") ?? "";
  const match = /^Bearer ([a-zA-Z0-9_-]{40,100})$/.exec(bearer);
  if (!match) {
    response.status(401).json({ error: "Inicia sesión." });
    return;
  }
  const session = await Session.findOne({
    tokenHash: digest(match[1]), expiresAt: { $gt: new Date() }
  }).lean();
  if (!session) {
    response.status(401).json({ error: "Sesión inválida o caducada." });
    return;
  }
  response.locals.accountId = session.accountId;
  response.locals.sessionHash = session.tokenHash;
  next();
};

authRouter.get("/me", requireSession, async (_request, response) => {
  const user = await Account.findById(response.locals.accountId).lean();
  if (!user) {
    response.status(401).json({ error: "Cuenta no disponible." });
    return;
  }
  response.json({ user: { id: user._id.toString(), email: user.email } });
});

authRouter.post("/logout", requireSession, async (_request, response) => {
  await Session.deleteOne({ tokenHash: response.locals.sessionHash });
  response.json({ ok: true });
});
