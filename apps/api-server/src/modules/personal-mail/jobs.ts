import { createHash, randomUUID } from "node:crypto";
import type { DataSource } from "typeorm";
import { recordOperation } from "../../services/operations/operation-audit.js";
import { ownedAccount, mailConfirmUrl, type MailDb } from "./accounts.js";
import { confirmationToken, validConfirmation } from "./credentials.js";
import { MailError, type MailAction } from "./contracts.js";
import { mailDelegation } from "./delegation.js";

export interface MailJob {
  id: string;
  account_id: string;
  user_id: string;
  request_id: string;
  fingerprint: string;
  kind: "cleanup" | "rule" | "automatic";
  action: MailAction;
  status: string;
  proposal: { senders?: string[]; category?: string };
  include_important: boolean;
  generation: number;
  total: number;
  source_connection_id: string | null;
  confirmed_at: Date | null;
  confirmation_expires_at: Date;
  last_error: string | null;
  created_at: Date;
  lease_token: string | null;
}
const confirmationValue = (job: MailJob) =>
  [
    job.user_id,
    job.id,
    job.fingerprint,
    job.total,
    job.generation,
    new Date(job.confirmation_expires_at).toISOString(),
  ].join(":");
export async function getJob(
  db: MailDb,
  userId: string,
  accountId: string,
  id: string,
  lock = false,
): Promise<MailJob> {
  const [job] = await db.query(
    `SELECT * FROM personal_mail_jobs WHERE id=$1 AND account_id=$2 AND user_id=$3${lock ? " FOR UPDATE" : ""}`,
    [id, accountId, userId],
  );
  if (!job) throw new MailError("MAIL_JOB_NOT_FOUND", 404);
  return job;
}
export async function describeJob(db: MailDb, job: MailJob, browser = false) {
  const [counts] = await db.query(
    `SELECT count(*) FILTER(WHERE status='pending')::int AS pending,
    count(*) FILTER(WHERE status='done')::int AS done,count(*) FILTER(WHERE status='skipped')::int AS skipped,
    count(*) FILTER(WHERE status='failed')::int AS failed FROM personal_mail_job_items WHERE job_id=$1`,
    [job.id],
  );
  return {
    id: job.id,
    accountId: job.account_id,
    kind: job.kind,
    action: job.action,
    status: job.status,
    total: job.total,
    includeImportant: job.include_important,
    proposal: job.proposal,
    counts,
    lastError: job.last_error,
    createdAt: job.created_at,
    confirmedAt: job.confirmed_at,
    confirmationExpiresAt: job.confirmation_expires_at,
    confirmUrl: mailConfirmUrl(job.id, job.account_id),
    ...(browser && job.status === "preview"
      ? { confirmationToken: confirmationToken(confirmationValue(job)) }
      : {}),
  };
}
export interface ProposalInput {
  accountId: string;
  senders: string[];
  action: MailAction;
  requestId: string;
  includeImportant?: boolean;
  category?: string;
}
export class MailJobService {
  constructor(readonly db: DataSource) {}
  async messages(userId: string, accountId: string, sender?: string, page = 1) {
    await ownedAccount(this.db, userId, accountId);
    return this.db.query(
      `SELECT m.provider_id AS id,m.sender,m.received_at AS "receivedAt",m.important,r.category
      FROM personal_mail_messages m LEFT JOIN personal_mail_rules r ON r.account_id=m.account_id AND r.sender=m.sender
      WHERE m.account_id=$1 AND m.inbox AND ($2::text IS NULL OR m.sender=$2) ORDER BY m.received_at DESC,m.provider_id LIMIT 50 OFFSET $3`,
      [accountId, sender ?? null, (page - 1) * 50],
    );
  }
  async senders(userId: string, accountId: string, page = 1) {
    await ownedAccount(this.db, userId, accountId);
    const data = await this.db.query(
      `SELECT m.sender,count(*)::int AS count,
      count(*) FILTER(WHERE m.important)::int AS important,max(m.received_at) AS "latestAt",
      r.action AS "ruleAction",r.category AS category
      FROM personal_mail_messages m LEFT JOIN personal_mail_rules r ON r.account_id=m.account_id AND r.sender=m.sender
      WHERE m.account_id=$1 AND m.inbox GROUP BY m.sender,r.action,r.category ORDER BY count(*) DESC,m.sender LIMIT 50 OFFSET $2`,
      [accountId, (page - 1) * 50],
    );
    return { senders: data, page, scope: "indexed_inbox" };
  }
  async rules(userId: string, accountId: string) {
    await ownedAccount(this.db, userId, accountId);
    return this.db.query(
      `SELECT id,sender,action,category,revision,effective_at AS "effectiveAt",
    source_connection_id IS NOT NULL AS "delegated" FROM personal_mail_rules WHERE account_id=$1 ORDER BY sender LIMIT 5000`,
      [accountId],
    );
  }
  async list(userId: string, accountId: string) {
    await ownedAccount(this.db, userId, accountId);
    const jobs: MailJob[] = await this.db.query(
      "SELECT * FROM personal_mail_jobs WHERE user_id=$1 AND account_id=$2 ORDER BY created_at DESC LIMIT 50",
      [userId, accountId],
    );
    return Promise.all(jobs.map((job) => describeJob(this.db, job)));
  }
  async read(userId: string, accountId: string, id: string, browser = false) {
    await ownedAccount(this.db, userId, accountId);
    return describeJob(
      this.db,
      await getJob(this.db, userId, accountId, id),
      browser,
    );
  }
  async prepare(
    userId: string,
    input: ProposalInput,
    kind: "cleanup" | "rule",
    sourceConnectionId: string | null = null,
  ) {
    return this.db.transaction(async (db) => {
      await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        `mail-request:${userId}:${input.requestId}`,
      ]);
      const account = await ownedAccount(db, userId, input.accountId, true);
      if (sourceConnectionId) {
        const connection = await mailDelegation(
          db,
          sourceConnectionId,
          account.id,
          true,
        );
        if (connection.userId !== userId)
          throw new MailError("MAIL_SCOPE_FORBIDDEN", 403);
      }
      if (account.state !== "active")
        throw new MailError("MAIL_RECONNECT_REQUIRED", 409);
      const senders = [...new Set(input.senders)].sort((a, b) =>
        a.localeCompare(b),
      );
      const proposal = {
        senders,
        ...(kind === "rule" ? { category: input.category ?? "general" } : {}),
      };
      const fingerprint = createHash("sha256")
        .update(
          JSON.stringify({
            accountId: account.id,
            kind,
            action: input.action,
            includeImportant: !!input.includeImportant,
            proposal,
            generation: account.generation,
            sourceConnectionId,
          }),
        )
        .digest("hex");
      const [existing] = await db.query(
        "SELECT * FROM personal_mail_jobs WHERE user_id=$1 AND request_id=$2",
        [userId, input.requestId],
      );
      if (existing) {
        if (existing.fingerprint !== fingerprint)
          throw new MailError("MAIL_REQUEST_ID_REUSED", 409);
        return describeJob(db, existing);
      }
      const [{ count }] = await db.query(
        "SELECT count(*)::int AS count FROM personal_mail_jobs WHERE user_id=$1 AND status IN ('preview','pending','running','paused','failed')",
        [userId],
      );
      if (count >= 50) throw new MailError("MAIL_JOB_LIMIT", 429);
      const id = randomUUID();
      await db.query(
        `INSERT INTO personal_mail_jobs(id,account_id,user_id,request_id,fingerprint,kind,action,status,proposal,include_important,generation,total,source_connection_id,confirmation_expires_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,'preview',$8,$9,$10,0,$11,now()+interval '15 minutes')`,
        [
          id,
          account.id,
          userId,
          input.requestId,
          fingerprint,
          kind,
          input.action,
          proposal,
          !!input.includeImportant,
          account.generation,
          sourceConnectionId,
        ],
      );
      let total = senders.length;
      if (kind === "cleanup") {
        if (input.action === "keep") throw new MailError("MAIL_ACTION_INVALID");
        const [row] = await db.query(
          `WITH inserted AS (INSERT INTO personal_mail_job_items(job_id,provider_id)
          SELECT $1,provider_id FROM personal_mail_messages WHERE account_id=$2 AND sender=ANY($3::text[]) AND inbox
          AND ($4 OR NOT important) ORDER BY provider_id LIMIT 100001 RETURNING 1) SELECT count(*)::int AS total FROM inserted`,
          [
            id,
            account.id,
            senders,
            input.action === "important" || !!input.includeImportant,
          ],
        );
        total = row.total;
        if (total > 100000)
          throw new MailError("MAIL_SELECTION_TOO_LARGE", 409);
        if (!total) throw new MailError("MAIL_NO_MATCHING_MESSAGES", 409);
      }
      await db.query("UPDATE personal_mail_jobs SET total=$1 WHERE id=$2", [
        total,
        id,
      ]);
      await recordOperation(
        db,
        "personal-mail",
        userId,
        "mail.preview.created",
        {
          accountId: account.id,
          jobId: id,
          kind,
          action: input.action,
          total,
          source: sourceConnectionId ? "external-ai" : "browser",
        },
      );
      const job = await getJob(db, userId, account.id, id);
      return {
        ...(await describeJob(db, job)),
        indexedThrough: account.sync_completed_at,
      };
    });
  }
  async confirm(
    userId: string,
    accountId: string,
    id: string,
    count: number,
    token: string,
  ) {
    return this.db.transaction(async (db) => {
      const account = await ownedAccount(db, userId, accountId, true),
        job = await getJob(db, userId, accountId, id, true);
      if (job.source_connection_id) {
        const connection = await mailDelegation(
          db,
          job.source_connection_id,
          accountId,
          true,
        );
        if (connection.userId !== userId)
          throw new MailError("MAIL_SCOPE_FORBIDDEN", 403);
      }
      if (
        job.status !== "preview" ||
        new Date(job.confirmation_expires_at).getTime() <= Date.now()
      )
        throw new MailError("MAIL_CONFIRMATION_EXPIRED", 409);
      if (job.generation !== account.generation || account.state !== "active")
        throw new MailError("MAIL_ACCOUNT_CHANGED", 409);
      if (
        count !== job.total ||
        !validConfirmation(confirmationValue(job), token)
      )
        throw new MailError("MAIL_CONFIRMATION_INVALID", 409);
      if (job.kind === "rule") {
        await db.query(
          `INSERT INTO personal_mail_rules(id,account_id,sender,action,category,source_connection_id)
          SELECT gen_random_uuid(),$1,sender,$2,$3,$4 FROM unnest($5::text[]) sender
          ON CONFLICT(account_id,sender) DO UPDATE SET action=EXCLUDED.action,category=EXCLUDED.category,
          source_connection_id=EXCLUDED.source_connection_id,revision=personal_mail_rules.revision+1,effective_at=now()`,
          [
            accountId,
            job.action,
            job.proposal.category ?? "general",
            job.source_connection_id,
            job.proposal.senders,
          ],
        );
        const [{ total }] = await db.query(
          "SELECT count(*)::int AS total FROM personal_mail_rules WHERE account_id=$1",
          [accountId],
        );
        if (total > 5000) throw new MailError("MAIL_RULE_LIMIT", 409);
      }
      await db.query(
        "UPDATE personal_mail_jobs SET confirmed_at=now(),status=$1,updated_at=now() WHERE id=$2",
        [job.kind === "rule" ? "completed" : "pending", id],
      );
      await recordOperation(
        db,
        "personal-mail",
        userId,
        "mail.preview.confirmed",
        {
          accountId,
          jobId: id,
          kind: job.kind,
          action: job.action,
          total: job.total,
          includeImportant: job.include_important,
        },
      );
      return describeJob(db, await getJob(db, userId, accountId, id));
    });
  }
  async control(
    userId: string,
    accountId: string,
    id: string,
    command: "pause" | "resume" | "cancel",
    sourceConnectionId: string | null = null,
  ) {
    return this.db.transaction(async (db) => {
      const account = await ownedAccount(db, userId, accountId, true),
        job = await getJob(db, userId, accountId, id, true);
      if (["completed", "cancelled"].includes(job.status))
        return describeJob(db, job);
      if (command === "resume") {
        if (!["paused", "failed"].includes(job.status))
          return describeJob(db, job);
        if (!job.confirmed_at || job.kind === "rule")
          throw new MailError("MAIL_BROWSER_CONFIRMATION_REQUIRED", 409);
        if (job.generation !== account.generation || account.state !== "active")
          throw new MailError("MAIL_ACCOUNT_CHANGED", 409);
        if (
          sourceConnectionId &&
          job.source_connection_id !== sourceConnectionId
        )
          throw new MailError("MAIL_JOB_SOURCE_CHANGED", 403);
        await db.query(
          "UPDATE personal_mail_job_items SET status='pending',attempts=0,error_code=NULL WHERE job_id=$1 AND status='failed'",
          [id],
        );
      }
      const next =
        command === "pause"
          ? "paused"
          : command === "cancel"
            ? "cancelled"
            : "pending";
      await db.query(
        "UPDATE personal_mail_jobs SET status=$1,source_connection_id=$2,lease_token=NULL,lease_until=NULL,last_error=NULL,updated_at=now() WHERE id=$3",
        [
          next,
          command === "resume" ? sourceConnectionId : job.source_connection_id,
          id,
        ],
      );
      await recordOperation(
        db,
        "personal-mail",
        userId,
        `mail.job.${command}`,
        { accountId, jobId: id, total: job.total },
      );
      return describeJob(db, await getJob(db, userId, accountId, id));
    });
  }
}
