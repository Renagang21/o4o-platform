import { runWithCommandDriver } from './run-with-command-driver.js';

describe('test command driver completion', () => {
  it('exposes producer completion and preserves both results', async () => {
    const result = await runWithCommandDriver(
      () => Promise.resolve('completed'),
      async (isFinished) => {
        expect(isFinished()).toBe(false);
        await Promise.resolve();
        expect(isFinished()).toBe(true);
        return ['command'];
      },
    );
    expect(result).toEqual(['completed', ['command']]);
  });

  it('signals completion on producer rejection without swallowing the error', async () => {
    const failure = new Error('producer failed');
    await expect(runWithCommandDriver(
      () => Promise.reject(failure),
      async (isFinished) => {
        await Promise.resolve();
        expect(isFinished()).toBe(true);
      },
    )).rejects.toBe(failure);
  });

  it('propagates responder failures', async () => {
    const failure = new Error('responder failed');
    await expect(runWithCommandDriver(
      () => Promise.resolve('completed'),
      () => Promise.reject(failure),
    )).rejects.toBe(failure);
  });
});
