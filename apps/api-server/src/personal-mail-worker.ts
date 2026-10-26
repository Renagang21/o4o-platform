import "reflect-metadata";
import { DataSource } from "typeorm";
import { PersonalMailWorker } from "./modules/personal-mail/worker.js";
import { requireMailEnabled } from "./modules/personal-mail/config.js";

/** Explicit job entry: no HTTP server, schema changes or LLM calls. */
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--help") {
    console.log(
      "Usage: node dist/personal-mail-worker.js --run [--max-ticks 100]",
    );
    return;
  }
  if (
    args[0] !== "--run" ||
    (args.length !== 1 &&
      !(
        args.length === 3 &&
        args[1] === "--max-ticks" &&
        /^\d+$/.test(args[2])
      ))
  )
    throw new Error("MAIL_WORKER_ARGUMENTS_INVALID");
  const maxTicks = args.length === 3 ? Number(args[2]) : 100;
  if (maxTicks < 1 || maxTicks > 1000)
    throw new Error("MAIL_WORKER_BUDGET_INVALID");
  requireMailEnabled();
  const { AppDataSource } = await import("./database/connection.js");
  if (AppDataSource.options.type !== "postgres")
    throw new Error("MAIL_WORKER_POSTGRES_REQUIRED");
  const db = new DataSource({
    ...AppDataSource.options,
    entities: [],
    migrations: [],
    migrationsRun: false,
    synchronize: false,
    installExtensions: false,
    logging: false,
    extra: { ...AppDataSource.options.extra, max: 4, min: 0 },
  });
  let stopped = false;
  const stop = () => {
    stopped = true;
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  try {
    await db.initialize();
    const worker = new PersonalMailWorker(db),
      start = Date.now();
    let ticks = 0,
      processed = 0,
      synced = 0;
    async function next(): Promise<void> {
      if (stopped || ticks >= maxTicks || Date.now() - start >= 240000) return;
      const result = await worker.tick();
      ticks++;
      processed += result.processed;
      synced += result.synced;
      if (result.status === "worked") await next();
    }
    await next();
    console.log(
      JSON.stringify({
        code: "PERSONAL_MAIL_WORKER_COMPLETED",
        ticks,
        processed,
        synced,
      }),
    );
  } finally {
    process.off("SIGTERM", stop);
    process.off("SIGINT", stop);
    if (db.isInitialized) await db.destroy();
  }
}
try {
  await main();
} catch {
  console.error("PERSONAL_MAIL_WORKER_FAILED");
  process.exitCode = 1;
}
