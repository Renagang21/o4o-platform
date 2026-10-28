import "reflect-metadata";
import { DataSource } from "typeorm";
import {
  assertReviewDatabase,
  reviewDatabaseOptions,
} from "./review-demo/environment.js";
import { provisionReviewDemo } from "./review-demo/provision.js";

let db: DataSource | undefined;
try {
  db = new DataSource(reviewDatabaseOptions(process.env));
  await db.initialize();
  if (process.argv.includes("--check-environment")) {
    await assertReviewDatabase(db);
    console.log("ISOLATED_REVIEW_DATABASE_VERIFIED");
  } else {
    console.log(
      JSON.stringify(
        await provisionReviewDemo(
          db,
          process.env.REVIEW_DEMO_PASSWORD || "",
          process.argv.includes("--apply"),
        ),
      ),
    );
  }
} catch {
  console.error(
    "REVIEW_DEMO_PROVISION_FAILED: check isolated database identity, marker, empty dataset, migrations and secret requirements. No credentials logged.",
  );
  process.exitCode = 1;
} finally {
  if (db?.isInitialized) await db.destroy();
}
