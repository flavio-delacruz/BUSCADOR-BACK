import { Schema, model } from "mongoose";

const accountSchema = new Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });
accountSchema.index({ email: 1 }, { unique: true });

export const Account = model("Account", accountSchema);
