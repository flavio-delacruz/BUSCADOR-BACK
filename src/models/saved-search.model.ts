import { Schema, model } from "mongoose";

// Esquema previsto para una fase posterior con autenticación por usuario.
// No se exponen rutas de lectura/escritura sin control de acceso.
const savedSearchSchema = new Schema(
  { ownerId: { type: String, required: true, index: true }, query: { type: String, required: true, maxlength: 80 } },
  { timestamps: true, versionKey: false }
);
export const SavedSearch = model("SavedSearch", savedSearchSchema);
