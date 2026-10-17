import "reflect-metadata";
import { DataSource } from "typeorm";
import { provisionTestCooperative } from "../modules/neture-pharmacy/services/provision-test-cooperative.js";

// Cloud Run only for production. Never accepts a password or creates account credentials.
async function main() {
  const env = process.env;
  if (
    env.NODE_ENV === "production" &&
    (!env.CLOUD_RUN_JOB || !env.DB_HOST?.startsWith("/cloudsql/"))
  )
    throw new Error("CLOUD_RUN_JOB_REQUIRED");
  for (const key of ["DB_HOST", "DB_USERNAME", "DB_NAME", "DB_PASSWORD"])
    if (!env[key]) throw new Error("DATABASE_CONFIGURATION_REQUIRED");
  const db = new DataSource({
    type: "postgres",
    host: env.DB_HOST,
    port: Number(env.DB_PORT || 5432),
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    entities: [],
    synchronize: false,
    logging: false,
  });
  try {
    await db.initialize();
    console.log(
      JSON.stringify(
        await provisionTestCooperative(
          db,
          {
            operatorEmail: env.COOP_TEST_OPERATOR_EMAIL || "",
            memberEmail: env.COOP_TEST_MEMBER_EMAIL || "",
          },
          process.argv.includes("--apply"),
        ),
      ),
    );
  } finally {
    if (db.isInitialized) await db.destroy();
  }
}
main().catch(() => {
  console.error(
    "COOP_TEST_PROVISION_FAILED: verify active accounts, existing operator role, migration and target conflicts. No credentials logged.",
  );
  process.exitCode = 1;
});
