import "dotenv/config";
import { app } from "./app";
import { connectDatabase } from "./config/database";

const port = Number(process.env.PORT || 4000);

async function main(): Promise<void> {
  await connectDatabase();
  app.listen(port, "0.0.0.0", () => {
    console.info(`[Buscador] API iniciada en http://127.0.0.1:${port}`);
  });
}

main().catch(error => {
  console.error("[Buscador] No se pudo iniciar:", error);
  process.exitCode = 1;
});
