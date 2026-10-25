jest.mock('../database/connection.js', () => ({ AppDataSource: {} }));
jest.mock('../utils/logger.js', () => ({ __esModule: true, default: { warn: jest.fn() } }));
import { ProductCorrectionJob } from './product-correction.job.js';
describe('상품 정기 관리 worker lifecycle', () => {
  it('starts once, prevents overlapping ticks, and stops the timer', async () => {
    jest.useFakeTimers();
    let finish!: () => void;
    const task = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const job = new ProductCorrectionJob(task);
    try {
      job.start();
      job.start();
      await jest.advanceTimersByTimeAsync(60000);
      expect(task).toHaveBeenCalledTimes(1);
      finish();
      await Promise.resolve();
      job.stop();
      await jest.advanceTimersByTimeAsync(120000);
      expect(task).toHaveBeenCalledTimes(1);
    } finally {
      job.stop();
      jest.useRealTimers();
    }
  });
  it('recovers from a failing tick without losing the ability to run again', async () => {
    const task = jest
      .fn()
      .mockRejectedValueOnce(new Error('synthetic'))
      .mockResolvedValueOnce(undefined);
    const job = new ProductCorrectionJob(task);
    await job.runOnce();
    await job.runOnce();
    expect(task).toHaveBeenCalledTimes(2);
  });
});
