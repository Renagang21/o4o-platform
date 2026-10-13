jest.mock('../utils/logger.js', () => ({ __esModule: true, default: { warn: jest.fn() } }));
jest.mock('../services/ai-tools/work-run-coordination-service.js', () => ({
  WORK_RUN_STATUS: { COMPLETED: 'completed', WAITING_FOR_USER: 'waiting_for_user', TAKEN_OVER: 'taken_over' },
  transitionWorkRun: jest.fn(),
}));
jest.mock('../services/ai-tools/work-run-executor.js', () => ({ issueWorkRunSetStatus: jest.fn() }));

import { persistTerminalRun } from '../services/ai-tools/work-run-finalization.js';
import { transitionWorkRun } from '../services/ai-tools/work-run-coordination-service.js';
import { issueWorkRunSetStatus } from '../services/ai-tools/work-run-executor.js';

beforeEach(() => jest.resetAllMocks());
it('keeps the advanced coordination version when the local terminal write fails', async () => {
  (transitionWorkRun as jest.Mock).mockResolvedValue({ version: 8 });
  (issueWorkRunSetStatus as jest.Mock).mockRejectedValue(new Error('local unavailable'));
  const input = {
    dataSource: {} as any, ctx: { userId: 'test-user' } as any,
    goal: { runId: 'test-run' } as any, deviceId: 'test-device', ledgerOwner: 'test-owner', coordinationVersion: 7,
  };
  expect(await persistTerminalRun(input, 'waiting_for_user')).toBe(8);
  expect(transitionWorkRun).toHaveBeenCalledWith(input.dataSource, {
    runId: 'test-run', status: 'waiting_for_user', expectedVersion: 7, deviceId: 'test-device',
  });
  expect(issueWorkRunSetStatus).toHaveBeenCalledWith(input.dataSource,
    { userId: 'test-user', deviceId: 'test-device', ownerKey: 'test-owner' },
    { runId: 'test-run', status: 'waiting_for_user' });
});
it('retains the previous version and does not write local state after a cloud transition failure', async () => {
  (transitionWorkRun as jest.Mock).mockRejectedValue(new Error('conflict'));
  expect(await persistTerminalRun({
    dataSource: {} as any, ctx: { userId: 'test-user' } as any, goal: { runId: 'test-run' } as any,
    deviceId: 'test-device', ledgerOwner: 'test-owner', coordinationVersion: 7,
  }, 'completed')).toBe(7);
  expect(issueWorkRunSetStatus).not.toHaveBeenCalled();
});
