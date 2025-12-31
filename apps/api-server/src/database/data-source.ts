/**
 * TypeORM DataSource Export
 *
 * Used by TypeORM CLI for migrations.
 * Environment variables are loaded by the CLI or main.ts.
 * In Cloud Run, env vars are injected via workflow.
 */
import { AppDataSource } from './connection.js';

export default AppDataSource;
