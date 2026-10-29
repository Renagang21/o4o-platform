import "reflect-metadata";
import { DataSource } from "typeorm";
import {
  assertReviewDatabase,
  reviewDatabaseOptions,
} from "./review-demo/environment.js";
import { provisionReviewDemo } from "./review-demo/provision.js";
import { enableReviewProductContentFixture } from "./review-demo/product-content-fixture.js";

let db: DataSource | undefined;
try {
  db = new DataSource(reviewDatabaseOptions(process.env));
  await db.initialize();
  if (process.argv.includes("--check-environment")) {
    await assertReviewDatabase(db);
    console.log("ISOLATED_REVIEW_DATABASE_VERIFIED");
  } else {
    const apply = process.argv.includes("--apply");
    const result = await provisionReviewDemo(
      db,
      process.env.REVIEW_DEMO_PASSWORD || "",
      apply,
    );
    const productContent = process.argv.includes("--enable-product-content")
      ? await enableReviewProductContentFixture(db, apply)
      : undefined;
    console.log(
      JSON.stringify({
        ...result,
        ...(productContent ? { productContent } : {}),
      }),
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
