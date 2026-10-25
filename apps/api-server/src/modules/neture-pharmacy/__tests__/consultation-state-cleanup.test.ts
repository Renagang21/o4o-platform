jest.mock('../../../database/connection.js', () => ({ AppDataSource: { isInitialized: false, query: jest.fn() } }));
import { cleanupConsultationState } from '../services/consultation-state-cleanup.js';
import { ConsultationStateCleanupJob } from '../../../jobs/consultation-state-cleanup.job.js';
it('defaults to dry-run, requires exact apply, and never deletes store assets or device bindings', async () => {
  const query = jest.fn().mockResolvedValue([{ count: 2 }]);
  const job = new ConsultationStateCleanupJob({ query, isInitialized: true });
  await job.runOnce({}); await job.runOnce({ CONSULTATION_STATE_CLEANUP_MODE: 'APPLY' });
  expect(query.mock.calls.every(([sql]) => sql.startsWith('SELECT'))).toBe(true);
  query.mockResolvedValueOnce([[{ id: 'expired' }], 1]);
  await job.runOnce({ CONSULTATION_STATE_CLEANUP_MODE: 'apply' });
  const sql = query.mock.calls[2][0];
  expect(sql).toContain("interval '90 seconds'"); expect(sql).toContain('FOR UPDATE SKIP LOCKED');
  expect(sql).toContain('LIMIT 200'); expect(sql).toContain("translation='{}'::jsonb");
  expect(sql).not.toMatch(/DELETE|device_hash=/);
});
it('supports the normal TypeORM and raw driver result shapes', async () => {
  expect(await cleanupConsultationState({ query: jest.fn().mockResolvedValue([[{ id: 'x' }], 1]) }, true)).toBe(1);
  expect(await cleanupConsultationState({ query: jest.fn().mockResolvedValue([{ id: 'x' }]) }, true)).toBe(1);
});
it('does not overlap a sweep or run when disabled/uninitialized', async () => {
  let finish!: (value: unknown) => void;
  const query = jest.fn(() => new Promise(resolve => { finish = resolve; }));
  const job = new ConsultationStateCleanupJob({ query, isInitialized: true });
  const first = job.runOnce({}); await job.runOnce({}); expect(query).toHaveBeenCalledTimes(1);
  finish([{ count: 0 }]); await first;
  await job.runOnce({ CONSULTATION_STATE_CLEANUP_ENABLED: 'false' });
  await new ConsultationStateCleanupJob({ query, isInitialized: false }).runOnce({});
  expect(query).toHaveBeenCalledTimes(1);
});
