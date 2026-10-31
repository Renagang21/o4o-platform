import { runWithCommandDriver, waitForTestCommand } from './run-with-command-driver.js';

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

describe('test command polling boundaries', () => {
  it('returns queued commands even after the producer completes', async () => {
    const command = { id: 'queued' };
    expect(await waitForTestCommand([command], 0, 200, () => true)).toBe(command);
  });

  it('returns immediately for an empty completed queue', async () => {
    const isFinished = jest.fn(() => true);
    expect(await waitForTestCommand([], 0, 200, isFinished)).toBeUndefined();
    expect(isFinished).toHaveBeenCalledTimes(1);
  });

  it('still accepts a command arriving while the producer is active', async () => {
    const commands: string[] = [];
    setTimeout(() => commands.push('late'), 0);
    expect(await waitForTestCommand(commands, 0, 20, () => false)).toBe('late');
  });

  it('retains the finite poll limit when no command arrives', async () => {
    const isFinished = jest.fn(() => false);
    expect(await waitForTestCommand([], 0, 2, isFinished)).toBeUndefined();
    expect(isFinished).toHaveBeenCalledTimes(2);
  });
});
