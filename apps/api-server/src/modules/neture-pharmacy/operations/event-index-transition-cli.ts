/** Default read-only. Run after phase-one production verification and rollback-floor decision. */
import 'reflect-metadata';
import { AppDataSource } from '../../../database/connection.js';
import { eventIndexState, transitionEventIndex } from './event-index-transition.js';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const direction = args.includes('--down') ? 'down' : 'up';
if (apply && (!args.includes('--phase-one-verified') || !args.some(a => /^--rollback-floor=[a-f0-9]{7,40}$/.test(a)))) {
  throw new Error('Apply requires verified phase-one operation and the reviewed API rollback-floor commit.');
}
await AppDataSource.initialize();
try {
  const state = await eventIndexState(AppDataSource.manager);
  process.stdout.write(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', direction, current: state }) + '\n');
  if (apply) {
    await AppDataSource.transaction(manager => transitionEventIndex(manager, direction));
    process.stdout.write(JSON.stringify({ result: await eventIndexState(AppDataSource.manager) }) + '\n');
  }
} finally { await AppDataSource.destroy(); }
