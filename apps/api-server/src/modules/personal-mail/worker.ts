import { randomUUID, createHash } from "node:crypto";
import type { DataSource } from "typeorm";
import { recordOperation } from "../../services/operations/operation-audit.js";
import {
  ownedAccount,
  assertMailUser,
  defaultProvider,
  type ProviderFactory,
  type MailDb,
} from "./accounts.js";
import {
  MailError,
  publicMailError,
  type MailAccount,
  type MailAction,
  type MessageMeta,
} from "./contracts.js";
import { mailEnabled } from "./config.js";
import { mailDelegation } from "./delegation.js";
import { getJob, type MailJob } from "./jobs.js";

/** Remote operations use absolute state. A crash after remote success is safely rechecked on retry. */
export class PersonalMailWorker {
  private busy = false;
  constructor(
    readonly db: DataSource,
    readonly factory: ProviderFactory = defaultProvider,
  ) {}
  async tick() {
    if (!mailEnabled() || this.busy)
      return { status: "idle", synced: 0, processed: 0 };
    this.busy = true;
    try {
      const synced = await this.syncOne();
      const processed = await this.processOne();
      return {
        status: synced || processed ? "worked" : "idle",
        synced,
        processed,
      };
    } finally {
      this.busy = false;
    }
  }
  private async syncOne() {
    return this.db.transaction(async (db) => {
      const [candidate]: MailAccount[] =
        await db.query(`SELECT * FROM personal_mail_accounts WHERE state='active' AND next_sync_at<=now()
        ORDER BY next_sync_at,id LIMIT 1`);
      if (!candidate) return 0;
      let provider;
      try {
        await assertMailUser(db, candidate.user_id);
        const [account]: MailAccount[] = await db.query(
          "SELECT * FROM personal_mail_accounts WHERE id=$1 AND state='active' AND next_sync_at<=now() FOR UPDATE SKIP LOCKED",
          [candidate.id],
        );
        if (!account) return 0;
        if (account.sync_cursor === null)
          await db.query(
            "UPDATE personal_mail_accounts SET sync_started_at=now() WHERE id=$1",
            [account.id],
          );
        provider = this.factory(account, db);
        const page = await provider.scan(account.sync_cursor);
        // SQL upsert order is independent, with bounded provider page sizes (<=100).
        await Promise.all(
          page.messages.map((message) =>
            this.indexMessage(db, account, message),
          ),
        );
        await db.query(
          `UPDATE personal_mail_accounts SET sync_cursor=$1,next_sync_at=now()+($2::int*interval '1 second'),
          sync_completed_at=CASE WHEN $1::text IS NULL THEN now() ELSE sync_completed_at END,last_error=NULL WHERE id=$3`,
          [page.cursor, page.cursor ? 5 : 60, account.id],
        );
        if (page.cursor === null)
          await db.query(
            "DELETE FROM personal_mail_messages WHERE account_id=$1 AND last_seen_at<(SELECT sync_started_at FROM personal_mail_accounts WHERE id=$1)",
            [account.id],
          );
        await db.query(
          "DELETE FROM personal_mail_oauth_flows WHERE expires_at<=now()",
        );
        await db.query(
          "UPDATE personal_mail_jobs SET status='cancelled',last_error='MAIL_CONFIRMATION_EXPIRED' WHERE status='preview' AND confirmation_expires_at<=now()",
        );
        return 1;
      } catch (error) {
        // No raw provider error is persisted: responses can contain mailbox data or credentials.
        const known = publicMailError(error);
        if (known.code === "MAIL_ACCOUNT_ACCESS_FORBIDDEN")
          await db.query(
            "UPDATE personal_mail_accounts SET next_sync_at=now()+interval '1 hour',last_error=$1 WHERE id=$2",
            [known.code, candidate.id],
          );
        else
          await db.query(
            `UPDATE personal_mail_accounts SET next_sync_at=now()+interval '5 minutes',last_error=$1,
          state=CASE WHEN $1 IN ('MAIL_RECONNECT_REQUIRED','MAIL_CREDENTIAL_UNAVAILABLE') THEN 'reconnect' ELSE state END WHERE id=$2`,
            [known.code, candidate.id],
          );
        return 0;
      } finally {
        if (provider) await provider.close();
      }
    });
  }
  private async indexMessage(
    db: MailDb,
    account: MailAccount,
    message: MessageMeta,
  ) {
    await db.query(
      `INSERT INTO personal_mail_messages(account_id,provider_id,sender,received_at,important,inbox)
      VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(account_id,provider_id) DO UPDATE SET sender=EXCLUDED.sender,
      important=EXCLUDED.important,inbox=EXCLUDED.inbox,last_seen_at=now()`,
      [
        account.id,
        message.id,
        message.sender,
        message.receivedAt,
        message.important,
        message.inbox,
      ],
    );
    const [rule] = await db.query(
      `SELECT r.*,m.rule_revision FROM personal_mail_rules r JOIN personal_mail_messages m
      ON m.account_id=r.account_id AND m.sender=r.sender WHERE m.account_id=$1 AND m.provider_id=$2
      AND r.action<>'keep' AND r.effective_at<=m.received_at AND m.rule_revision<r.revision AND m.inbox`,
      [account.id, message.id],
    );
    if (!rule || (message.important && rule.action !== "important")) return;
    if (rule.source_connection_id) {
      try {
        const connection = await mailDelegation(
          db,
          rule.source_connection_id,
          account.id,
          true,
        );
        if (connection.userId !== account.user_id) return;
      } catch {
        return;
      }
    }
    const id = randomUUID(),
      fingerprint = createHash("sha256")
        .update(`${rule.id}:${rule.revision}:${message.id}`)
        .digest("hex");
    await db.query(
      `INSERT INTO personal_mail_jobs(id,account_id,user_id,request_id,fingerprint,kind,action,status,proposal,generation,total,
      source_connection_id,confirmed_at,confirmation_expires_at) VALUES($1,$2,$3,$1,$4,'automatic',$5,'pending',$6,$7,1,$8,now(),now())`,
      [
        id,
        account.id,
        account.user_id,
        fingerprint,
        rule.action,
        { ruleId: rule.id, ruleRevision: rule.revision },
        account.generation,
        rule.source_connection_id,
      ],
    );
    await db.query(
      "INSERT INTO personal_mail_job_items(job_id,provider_id) VALUES($1,$2)",
      [id, message.id],
    );
    await db.query(
      "UPDATE personal_mail_messages SET rule_revision=$1 WHERE account_id=$2 AND provider_id=$3",
      [rule.revision, account.id, message.id],
    );
  }
  private async claim() {
    return this.db.transaction(async (db) => {
      const [job]: MailJob[] =
        await db.query(`SELECT * FROM personal_mail_jobs WHERE kind<>'rule' AND confirmed_at IS NOT NULL
      AND ((status='pending' AND (lease_until IS NULL OR lease_until<=now())) OR (status='running' AND lease_until<now()))
      ORDER BY created_at,id FOR UPDATE SKIP LOCKED LIMIT 1`);
      if (!job) return null;
      const token = randomUUID();
      await db.query(
        "UPDATE personal_mail_jobs SET status='running',lease_token=$1,lease_until=now()+interval '90 seconds',updated_at=now() WHERE id=$2",
        [token, job.id],
      );
      return { ...job, lease_token: token };
    });
  }
  private async processOne() {
    const claimed = await this.claim();
    if (!claimed) return 0;
    // One transaction is the atomic interruption boundary. Each next tick is a durable continuation.
    return this.db.transaction(async (db) => {
      const account = await ownedAccount(
        db,
        claimed.user_id,
        claimed.account_id,
        true,
      ).catch(() => null);
      if (!account) {
        await db.query(
          "UPDATE personal_mail_jobs SET status='paused',last_error='MAIL_ACCOUNT_ACCESS_FORBIDDEN',lease_token=NULL,lease_until=NULL WHERE id=$1 AND lease_token=$2",
          [claimed.id, claimed.lease_token],
        );
        return 0;
      }
      const job = await getJob(
        db,
        claimed.user_id,
        claimed.account_id,
        claimed.id,
        true,
      );
      if (job.lease_token !== claimed.lease_token || job.status !== "running")
        return 0;
      let provider;
      try {
        if (job.generation !== account.generation)
          throw new MailError("MAIL_ACCOUNT_CHANGED", 409);
        if (job.kind === "automatic") {
          // Account lock serializes rule confirmation with execution. A new rule cannot inherit old queued authority.
          const [rule] = await db.query(
            "SELECT id FROM personal_mail_rules WHERE id=$1 AND account_id=$2 AND revision=$3 AND action=$4 AND action<>'keep'",
            [
              job.proposal.ruleId,
              account.id,
              job.proposal.ruleRevision,
              job.action,
            ],
          );
          if (!rule) {
            await db.query(
              "UPDATE personal_mail_job_items SET status='skipped',result='rule_changed' WHERE job_id=$1 AND status='pending'",
              [job.id],
            );
            await db.query(
              "UPDATE personal_mail_jobs SET status='cancelled',last_error='MAIL_RULE_CHANGED',lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=$1",
              [job.id],
            );
            await recordOperation(
              db,
              "personal-mail",
              job.user_id,
              "mail.job.cancelled",
              { accountId: account.id, jobId: job.id, reason: "rule_changed" },
            );
            return 1;
          }
        }
        if (job.source_connection_id) {
          const connection = await mailDelegation(
            db,
            job.source_connection_id,
            account.id,
            true,
          );
          if (connection.userId !== job.user_id)
            throw new MailError("MAIL_SCOPE_FORBIDDEN", 403);
        }
        const [item] = await db.query(
          "SELECT * FROM personal_mail_job_items WHERE job_id=$1 AND status='pending' ORDER BY provider_id FOR UPDATE LIMIT 1",
          [job.id],
        );
        if (!item) {
          const [{ failed }] = await db.query(
            "SELECT count(*)::int AS failed FROM personal_mail_job_items WHERE job_id=$1 AND status='failed'",
            [job.id],
          );
          await db.query(
            "UPDATE personal_mail_jobs SET status=$1,lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=$2",
            [failed ? "failed" : "completed", job.id],
          );
          await recordOperation(
            db,
            "personal-mail",
            job.user_id,
            "mail.job.finished",
            { accountId: account.id, jobId: job.id, total: job.total, failed },
          );
          return 1;
        }
        provider = this.factory(account, db);
        let result;
        try {
          result = await provider.apply(
            item.provider_id,
            job.action as Exclude<MailAction, "keep">,
            job.include_important,
          );
        } catch (error) {
          const known = publicMailError(error),
            attempts = item.attempts + 1;
          await db.query(
            "UPDATE personal_mail_job_items SET attempts=$1,error_code=$2,status=$3 WHERE job_id=$4 AND provider_id=$5",
            [
              attempts,
              known.code,
              known.retryable && attempts < 3 ? "pending" : "failed",
              job.id,
              item.provider_id,
            ],
          );
          const retry = known.retryable && attempts < 3;
          await db.query(
            "UPDATE personal_mail_jobs SET status=$1,last_error=$2,lease_token=NULL,lease_until=CASE WHEN $3 THEN now()+($4::int*interval '1 second') ELSE NULL END,updated_at=now() WHERE id=$5",
            [
              retry ? "pending" : "paused",
              known.code,
              retry,
              60 * attempts,
              job.id,
            ],
          );
          if (known.code === "MAIL_RECONNECT_REQUIRED")
            await db.query(
              "UPDATE personal_mail_accounts SET state='reconnect',last_error=$1 WHERE id=$2",
              [known.code, account.id],
            );
          await recordOperation(
            db,
            "personal-mail",
            job.user_id,
            "mail.item.failed",
            { accountId: account.id, jobId: job.id, code: known.code },
          );
          return 1;
        }
        await db.query(
          "UPDATE personal_mail_job_items SET status=$1,result=$2,attempts=attempts+1,error_code=NULL WHERE job_id=$3 AND provider_id=$4",
          [
            result === "applied" || result === "already_applied"
              ? "done"
              : "skipped",
            result,
            job.id,
            item.provider_id,
          ],
        );
        if (result !== "protected")
          await db.query(
            "UPDATE personal_mail_messages SET inbox=$1,important=CASE WHEN $2 THEN true ELSE important END WHERE account_id=$3 AND provider_id=$4",
            [
              result !== "missing" && job.action === "important",
              result !== "missing" && job.action === "important",
              account.id,
              item.provider_id,
            ],
          );
        await db.query(
          "UPDATE personal_mail_jobs SET status='pending',lease_token=NULL,lease_until=NULL,last_error=NULL,updated_at=now() WHERE id=$1",
          [job.id],
        );
        await recordOperation(
          db,
          "personal-mail",
          job.user_id,
          "mail.item.finished",
          { accountId: account.id, jobId: job.id, action: job.action, result },
        );
        return 1;
      } catch (error) {
        const known = publicMailError(error);
        await db.query(
          "UPDATE personal_mail_jobs SET status='paused',last_error=$1,lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=$2",
          [known.code, job.id],
        );
        return 0;
      } finally {
        if (provider) await provider.close();
      }
    });
  }
}
