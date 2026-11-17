import { Schema, model } from "mongoose";

/**
 * The original preview text is encrypted before it reaches MongoDB.
 * Every record belongs to this private single-owner installation.
 */
const notificationSchema = new Schema({
  ownerId: { type: String, required: true },
  clientId: { type: String, required: true, maxlength: 120 },
  source: {
    type: String,
    required: true,
    enum: [
      "com.whatsapp", "com.whatsapp.w4b",
      "com.facebook.katana", "com.facebook.lite",
      "com.zhiliaoapp.musically", "com.facebook.orca"
    ]
  },
  encryptedContent: { type: String, required: true },
  occurredAt: { type: Date, required: true },
  receivedAt: { type: Date, required: true, default: Date.now },
  expiresAt: { type: Date, required: true }
}, {
  timestamps: false,
  versionKey: false
});

notificationSchema.index({ ownerId: 1, clientId: 1 }, { unique: true });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
notificationSchema.index({ ownerId: 1, receivedAt: -1 });

export const NotificationArchive = model("NotificationArchive", notificationSchema);
