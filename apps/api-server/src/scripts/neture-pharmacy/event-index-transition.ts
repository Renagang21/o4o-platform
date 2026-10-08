/** Default read-only. Run after phase-one production verification and rollback-floor decision. */
import 'reflect-metadata';
import { AppDataSource } from '../../database/connection.js';
import { eventIndexState, transitionEventIndex } from '../../modules/neture-pharmacy/operations/event-index-transition.js';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const direction = args.includes('--down') ? 'down' : 'up';
if (apply && (!args.includes('--phase-one-verified') || !args.some(a => /^--rollback-floor=[a-f0-9]{7,40}$/.test(a)))) {
  throw new Error('Apply requires verified phase-one operation and the reviewed API rollback-floor commit.');
}
await AppDataSource.initialize();
try {
  const state = await eventIndexState(AppDataSource.manager);
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', direction, current: state }));
  if (apply) {
    await AppDataSource.transaction(manager => transitionEventIndex(manager, direction));
    console.log(JSON.stringify({ result: await eventIndexState(AppDataSource.manager) }));
  }
} finally { await AppDataSource.destroy(); }
