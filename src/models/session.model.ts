import { Schema, model, Types } from "mongoose";

const sessionSchema = new Schema({
  accountId: { type: Types.ObjectId, required: true, ref: "Account", index: true },
  tokenHash: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
}, { versionKey: false });
sessionSchema.index({ tokenHash: 1 }, { unique: true });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = model("Session", sessionSchema);
