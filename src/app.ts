import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import { z } from "zod";
import { catalog } from "./data/catalog";
import { notificationsRouter } from "./routes/notifications";

export const app = express();
app.disable("x-powered-by");
app.use(helmet());
const allowedOrigin = process.env.CORS_ORIGIN?.trim();
app.use(cors({
  origin(origin, callback) {
    if (!origin || (allowedOrigin && origin === allowedOrigin)) return callback(null, true);
    return callback(new Error("Origen no autorizado"));
  }
}));
app.use(express.json({ limit: "128kb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "Buscador API", mode: "demo" });
});

const searchSchema = z.object({
  q: z.string().trim().max(80).optional().default(""),
  category: z.enum(["Tecnología", "Educación", "Exploración", "Productividad"]).optional()
});

app.get("/api/search", (request, response) => {
  const parsed = searchSchema.safeParse(request.query);
  if (!parsed.success) {
    response.status(400).json({ error: "Parámetros de búsqueda inválidos" });
    return;
  }
  const { q, category } = parsed.data;
  const query = q.toLocaleLowerCase("es");
  const results = catalog.filter(item =>
    (!category || category === item.category) &&
    (!query || [item.title, item.description, item.category, ...item.tags]
      .some(value => value.toLocaleLowerCase("es").includes(query)))
  );
  response.json({ results, total: results.length, query: q, demo: true });
});

// Private API: enabled only when MongoDB and sync secrets are configured.
app.use("/api/notifications", notificationsRouter);

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  // Notification payloads and decryption details must never reach logs.
  console.error("[Buscador] Error interno:", error instanceof Error ? error.name : "desconocido");
  response.status(500).json({ error: "No se pudo procesar la solicitud" });
};
app.use(errorHandler);
