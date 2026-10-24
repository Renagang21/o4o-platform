import logger from "../utils/logger.js";
import { runCommunityNewsAutomation } from "../services/community/community-news-automation.service.js";

/** Existing in-process scheduler: first eligible boot/tick after 08:00 KST, daily DB reservation. */
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
    if (this.running || (now.getUTCHours() + 9) % 24 < 8) return;
    this.running = true;
    try {
      logger.info("[COMMUNITY_NEWS_JOB]", await this.task());
    } catch {
      logger.warn(
        "[COMMUNITY_NEWS_JOB] draft preparation unavailable; operator review remains available",
      );
    } finally {
      this.running = false;
    }
  }
}
export const communityNewsJob = new CommunityNewsJob();
