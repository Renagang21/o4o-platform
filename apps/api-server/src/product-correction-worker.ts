import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { parseCorrectionWorkerArgs, runCorrectionWorker } from './modules/neture/product-correction/worker-runner.js';
import { ProductCorrectionPeriodicService } from './modules/neture/product-correction/periodic.service.js';

/** Explicit job entry. No HTTP server, migration runner, AI call or product apply path. */
async function main() {
  const budget = parseCorrectionWorkerArgs(process.argv.slice(2));
  if (!budget) {
    process.stdout.write('Usage: node dist/product-correction-worker.js --run [--max-ticks 100] [--max-seconds 240]\n');
    return;
  }
  if (!process.env.DB_HOST || !process.env.DB_USERNAME || !process.env.DB_NAME)
    throw new Error('WORKER_DATABASE_ENV_REQUIRED');
  // Reuse the API connection validation/transport; deliberately exclude entities and schema capabilities.
  const { AppDataSource } = await import('./database/connection.js');
  if (AppDataSource.options.type !== 'postgres') throw new Error('WORKER_POSTGRES_REQUIRED');
  const db = new DataSource({
    ...AppDataSource.options,
    entities: [], migrations: [], migrationsRun: false, synchronize: false,
    installExtensions: false, cache: false, logging: false,
    extra: { ...AppDataSource.options.extra, max: 4, min: 0 },
  });
  let stopping = false;
  const stop = () => { stopping = true; };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
  try {
    await db.initialize();
    const result = await runCorrectionWorker(new ProductCorrectionPeriodicService(db), budget,
      { now: () => Date.now(), stopped: () => stopping });
    process.stdout.write(`${JSON.stringify({ code: 'PRODUCT_CORRECTION_WORKER_COMPLETED', ...result })}\n`);
  } finally {
    process.off('SIGTERM', stop);
    process.off('SIGINT', stop);
    if (db.isInitialized) await db.destroy();
  }
}
void main().catch(() => {
  console.error('PRODUCT_CORRECTION_WORKER_FAILED');
  process.exitCode = 1;
});
