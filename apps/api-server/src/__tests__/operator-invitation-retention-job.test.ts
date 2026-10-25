jest.mock('../database/connection.js', () => ({ AppDataSource: { isInitialized: true, transaction: jest.fn() } }));
jest.mock('../services/admin/operator-invitation-retention.js', () => ({ retainOperatorInvitations: jest.fn(async () => ({ expired: 1, purged: 0 })) }));
jest.mock('../utils/logger.js', () => ({ __esModule: true, default: { info: jest.fn(), error: jest.fn() } }));
import { AppDataSource } from '../database/connection.js';
import { retainOperatorInvitations } from '../services/admin/operator-invitation-retention.js';
import { operatorInvitationRetentionJob as job } from '../jobs/operator-invitation-retention.job.js';
import logger from '../utils/logger.js';
beforeEach(() => { jest.clearAllMocks(); job.stop(); });
it('skips cleanup when another replica holds the transaction lock', async () => {
  (AppDataSource.transaction as jest.Mock).mockImplementation(async fn => fn({ query: async () => [{ locked: false }] }));
  await job.runOnce(); expect(retainOperatorInvitations).not.toHaveBeenCalled();
});
it('never overlaps cleanup and logs only counts after acquiring the lock', async () => {
  let release!: () => void;
  (AppDataSource.transaction as jest.Mock).mockImplementation(async fn => {
    await new Promise<void>(r => { release = r; }); return fn({ query: async () => [{ locked: true }] });
  });
  const first = job.runOnce(); await job.runOnce();
  expect(AppDataSource.transaction).toHaveBeenCalledTimes(1); release(); await first;
  expect(retainOperatorInvitations).toHaveBeenCalledTimes(1);
  expect(logger.info).toHaveBeenCalledWith('[operator-invitation-retention] completed', { expired: 1, purged: 0 });
});
it('does not persist row details or errors and can retry after failure', async () => {
  (AppDataSource.transaction as jest.Mock).mockRejectedValueOnce(new Error('Synthetic recipient and secret')).mockImplementation(async fn => fn({ query: async () => [{ locked: true }] }));
  await job.runOnce(); await job.runOnce();
  expect(logger.error).toHaveBeenCalledWith('[operator-invitation-retention] failed');
  expect(retainOperatorInvitations).toHaveBeenCalledTimes(1);
});
