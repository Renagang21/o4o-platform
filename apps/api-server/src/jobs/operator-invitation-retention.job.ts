import { AppDataSource } from "../database/connection.js";
import { retainOperatorInvitations } from "../services/admin/operator-invitation-retention.js";
import logger from "../utils/logger.js";

class OperatorInvitationRetentionJob {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  async runOnce() {
    if (this.running || !AppDataSource.isInitialized) return;
    this.running = true;
    try {
      await AppDataSource.transaction(async (m) => {
        const [lock] = await m.query(
          "SELECT pg_try_advisory_xact_lock(hashtextextended('operator-invitation-retention',0)) AS locked",
        );
        if (!lock?.locked) return;
        const counts = await retainOperatorInvitations(m, new Date());
        logger.info("[operator-invitation-retention] completed", counts);
      });
    } catch {
      logger.error("[operator-invitation-retention] failed");
    } finally {
      this.running = false;
    }
  }
  start() {
    if (this.timer) return;
    void this.runOnce();
    this.timer = setInterval(() => {
      void this.runOnce();
    }, 60_000);
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
export const operatorInvitationRetentionJob =
  new OperatorInvitationRetentionJob();
