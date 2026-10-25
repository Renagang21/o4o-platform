import { parseCorrectionWorkerArgs, runCorrectionWorker } from './worker-runner.js';

describe('독립 상품 정기 worker 실행 경계', () => {
  it('requires explicit execution and rejects unbounded or unknown options', () => {
    expect(parseCorrectionWorkerArgs(['--help'])).toBeNull();
    for (const args of [[], ['--run', '--max-ticks', '0'], ['--run', '--max-seconds', '601'], ['--run', '--apply']])
      expect(() => parseCorrectionWorkerArgs(args)).toThrow();
  });
  it('stops on idle or another worker without spinning', async () => {
    const tick = jest.fn().mockResolvedValue({ status: 'busy', pagesProcessed: 0, schedulesStarted: 0 });
    expect((await runCorrectionWorker({ tick }, { maxTicks: 100, maxSeconds: 10 })).reason).toBe('busy');
    expect(tick).toHaveBeenCalledTimes(1);
    tick.mockResolvedValue({ status: 'completed', pagesProcessed: 0, schedulesStarted: 0 });
    expect((await runCorrectionWorker({ tick }, { maxTicks: 100, maxSeconds: 10 })).reason).toBe('idle');
    expect(tick).toHaveBeenCalledTimes(2);
  });
  it('honors time and stop requests between ticks and propagates real failures', async () => {
    let now = 0, stopped = false;
    const tick = jest.fn(async () => { now += 1000; return { status: 'completed' as const, pagesProcessed: 4, schedulesStarted: 0 }; });
    const result = await runCorrectionWorker({ tick }, { maxTicks: 100, maxSeconds: 2 }, { now: () => now, stopped: () => stopped });
    expect(result).toMatchObject({ reason: 'budget', ticks: 2, pagesProcessed: 8 });
    stopped = true;
    expect((await runCorrectionWorker({ tick }, { maxTicks: 10, maxSeconds: 10 }, { now: () => now, stopped: () => stopped })).reason).toBe('stopped');
    await expect(runCorrectionWorker({ tick: async () => { throw Error('database'); } }, { maxTicks: 1, maxSeconds: 1 })).rejects.toThrow('database');
  });
});
