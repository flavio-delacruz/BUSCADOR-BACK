import { Router } from "express";
import { z } from "zod";
import { NotificationArchive } from "../models/notification.model";
import { decryptContent, encryptContent } from "../security/notification-crypto";
import { ownerId, requireSyncAccess } from "../security/sync-auth";

export const notificationsRouter = Router();

const maxRecords = 500;
const retentionMs = 30 * 24 * 60 * 60 * 1000;
const source = z.enum([
  "com.whatsapp", "com.whatsapp.w4b",
  "com.facebook.katana", "com.facebook.lite",
  "com.zhiliaoapp.musically", "com.facebook.orca"
]);
const entry = z.object({
  id: z.string().trim().min(1).max(120),
  source,
  title: z.string().max(160),
  message: z.string().trim().min(1).max(2048),
  time: z.number().finite().int().min(1)
}).strict();

const batchSchema = z.object({
  items: z.array(entry).min(1).max(40)
}).strict();
const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50)
});

notificationsRouter.use(requireSyncAccess);

/**
 * Explicit, user-initiated sync only. Nothing in the Android app calls this
 * endpoint until a separate visible opt-in/credential configuration is built.
 */
notificationsRouter.post("/sync", async (request, response) => {
  const result = batchSchema.safeParse(request.body);
  if (!result.success) {
    response.status(400).json({ error: "Notificaciones inválidas (máximo 40 por envío)." });
    return;
  }

  const now = Date.now();
  const fresh = new Map<string, z.infer<typeof entry>>();
  for (const item of result.data.items) {
    // Do not keep events older than local retention or implausibly future-dated.
    if (item.time >= now - retentionMs && item.time <= now + 24 * 60 * 60 * 1000) {
      fresh.set(item.id, item);
    }
  }
  if (fresh.size === 0) {
    response.json({ received: result.data.items.length, accepted: 0, stored: 0 });
    return;
  }
  const expiresAt = new Date(now + retentionMs);
  const writes = [...fresh.values()].map(item => ({
    updateOne: {
      filter: { ownerId, clientId: item.id },
      update: {
        $setOnInsert: {
          ownerId,
          clientId: item.id,
          source: item.source,
          encryptedContent: encryptContent(item.title, item.message),
          occurredAt: new Date(item.time),
          receivedAt: new Date(now),
          expiresAt
        }
      },
      upsert: true
    }
  }));

  const saved = await NotificationArchive.bulkWrite(writes, { ordered: false });
  // Keep at most 500 events, just as the local Android archive does.
  const excess = await NotificationArchive.find({ ownerId })
    .sort({ receivedAt: -1, _id: -1 })
    .skip(maxRecords)
    .select("_id").lean();
  if (excess.length > 0) {
    await NotificationArchive.deleteMany({
      ownerId, _id: { $in: excess.map(item => item._id) }
    });
  }
  response.status(201).json({
    received: result.data.items.length,
    accepted: fresh.size,
    stored: saved.upsertedCount
  });
});

notificationsRouter.get("/", async (request, response) => {
  const parsed = listSchema.safeParse(request.query);
  if (!parsed.success) {
    response.status(400).json({ error: "Límite inválido" });
    return;
  }
  const rows = await NotificationArchive.find({ ownerId })
    .sort({ occurredAt: -1, _id: -1 })
    .limit(parsed.data.limit)
    .lean();
  const records = rows.map(row => ({
    id: row.clientId,
    source: row.source,
    ...decryptContent(row.encryptedContent),
    time: row.occurredAt.getTime()
  }));
  const total = await NotificationArchive.countDocuments({ ownerId });
  response.setHeader("Cache-Control", "no-store");
  response.json({ records, total });
});

notificationsRouter.delete("/", async (_request, response) => {
  const result = await NotificationArchive.deleteMany({ ownerId });
  response.setHeader("Cache-Control", "no-store");
  response.json({ deleted: result.deletedCount });
});
