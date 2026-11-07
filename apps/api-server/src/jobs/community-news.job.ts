import logger from "../utils/logger.js";
import { runCommunityNewsAutomation } from "../services/community/community-news-automation.service.js";
import { newsWindow } from "../services/community/community-news-auto-policy.js";

/** Existing in-process scheduler: first boot/tick inside the 08:00 or 15:00 KST window; the DB reservation prevents repeats. */
export class CommunityNewsJob {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  constructor(private readonly task = runCommunityNewsAutomation) {}
  start() {
    if (this.timer) return;
    void this.runOnce();
    this.timer = setInterval(() => void this.runOnce(), 30 * 60 * 1000);
    this.timer.unref?.();
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
  async runOnce(now = new Date()) {
    if (this.running || !newsWindow(now)) return;
    this.running = true;
    try {
      logger.info("[COMMUNITY_NEWS_JOB]", await this.task(now));
    } catch {
      logger.warn(
        "[COMMUNITY_NEWS_JOB] unavailable; the next tick re-checks the window reservation",
      );
    } finally {
      this.running = false;
    }
  }
}
export const communityNewsJob = new CommunityNewsJob();
