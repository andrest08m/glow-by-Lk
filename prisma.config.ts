import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Prisma CLI (migrate/db push/studio) necesita la conexión directa, no la pooled.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
