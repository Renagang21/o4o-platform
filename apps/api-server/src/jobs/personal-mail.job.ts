import { AppDataSource } from "../database/connection.js";
import { PersonalMailWorker } from "../modules/personal-mail/worker.js";
import { mailEnabled } from "../modules/personal-mail/config.js";
import logger from "../utils/logger.js";

/** Best effort API wake-up; a bounded CLI worker supports reliable scheduled execution. */
class PersonalMailJob {
  private timer: NodeJS.Timeout | null = null;
  private readonly worker = new PersonalMailWorker(AppDataSource);
  private async tick() {
    try {
      await this.worker.tick();
    } catch {
      logger.warn("[personal-mail] tick unavailable; durable work retained");
    }
  }
  start() {
    if (this.timer || !mailEnabled()) return;
    void this.tick();
    this.timer = setInterval(() => void this.tick(), 15_000);
    this.timer.unref();
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
export const personalMailJob = new PersonalMailJob();
