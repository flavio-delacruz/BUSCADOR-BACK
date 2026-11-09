import mongoose from "mongoose";

export async function connectDatabase(): Promise<void> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    console.info("[Buscador] MongoDB no configurado. Modo demostración activo.");
    return;
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 6000 });
  console.info("[Buscador] MongoDB conectado.");
}
