jest.mock("../services/community/community-news-automation.service", () => ({
  runCommunityNewsAutomation: jest.fn(),
}));
jest.mock("../utils/logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn() },
}));
import { CommunityNewsJob } from "./community-news.job";
it("runs only after 08 KST and prevents overlapping work", async () => {
  let finish!: () => void;
  const task = jest.fn(
    () =>
      new Promise<any>((r) => {
        finish = () => r({});
      }),
  );
  const job = new CommunityNewsJob(task);
  await job.runOnce(new Date("2026-10-22T22:00:00Z"));
  expect(task).not.toHaveBeenCalled();
  const running = job.runOnce(new Date("2026-10-22T23:00:00Z"));
  await job.runOnce(new Date("2026-10-22T23:01:00Z"));
  expect(task).toHaveBeenCalledTimes(1);
  finish();
  await running;
});
it("catches failures and allows a later tick to inspect the durable reservation", async () => {
  const task = jest.fn().mockRejectedValue(Error("failure"));
  const job = new CommunityNewsJob(task);
  await job.runOnce(new Date("2026-10-23T00:00:00Z"));
  await job.runOnce(new Date("2026-10-23T01:00:00Z"));
  expect(task).toHaveBeenCalledTimes(2);
});
