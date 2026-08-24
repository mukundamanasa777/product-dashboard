import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseUrl =
  process.env["DIRECT_URL"] || process.env["DATABASE_URL"];

  console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);
console.log("DIRECT_URL exists:", !!process.env.DIRECT_URL);

if (process.env.DIRECT_URL) {
  console.log(
    "DIRECT_URL host:",
    process.env.DIRECT_URL.replace(/^.*@/, "").split("/")[0]
  );
}

if (!databaseUrl) {
  throw new Error("DATABASE_URL or DIRECT_URL is required");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});