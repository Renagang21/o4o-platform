import type { DataSource } from "typeorm";
import {
  MailAccountService,
  type ProviderFactory,
  defaultProvider,
} from "./accounts.js";
import { MailJobService, type ProposalInput } from "./jobs.js";
import {
  mailToolSchemas,
  mailWriteTools,
  MailError,
  type MailToolName,
} from "./contracts.js";
import { mailDelegation } from "./delegation.js";

export class PersonalMailToolService {
  constructor(
    readonly db: DataSource,
    readonly factory: ProviderFactory = defaultProvider,
  ) {}
  async execute(name: MailToolName, raw: unknown, connectionId: string) {
    const parsed = mailToolSchemas[name].safeParse(raw);
    if (!parsed.success) throw new MailError("INVALID_MAIL_TOOL_INPUT");
    const input = parsed.data as Partial<ProposalInput> & {
      page?: number;
      sender?: string;
      messageId?: string;
      jobId?: string;
      command?: "pause" | "resume" | "cancel";
    };
    return this.db.transaction(async (db) => {
      const connection = await mailDelegation(
        db,
        connectionId,
        input.accountId,
        mailWriteTools.has(name),
        name === "get_mail_message",
      );
      const accounts = new MailAccountService(db, this.factory),
        jobs = new MailJobService(db),
        userId = connection.userId;
      switch (name) {
        case "list_mail_accounts":
          return {
            accounts: (await accounts.list(userId)).filter(
              (account: { id: string }) =>
                connection.workspaces.includes(`mail:${account.id}`),
            ),
          };
        case "list_mail_senders":
          return jobs.senders(userId, input.accountId, input.page);
        case "list_mail_rules":
          return { rules: await jobs.rules(userId, input.accountId) };
        case "list_mail_messages":
          return {
            messages: await jobs.messages(
              userId,
              input.accountId,
              input.sender,
              input.page,
            ),
          };
        case "get_mail_message":
          return accounts.read(userId, input.accountId, input.messageId);
        case "list_mail_jobs":
          return { jobs: await jobs.list(userId, input.accountId, input.page) };
        case "get_mail_job":
          return jobs.read(userId, input.accountId, input.jobId);
        case "prepare_mail_cleanup":
          return jobs.prepare(
            userId,
            input as ProposalInput,
            "cleanup",
            connection.id,
          );
        case "prepare_mail_rule":
          return jobs.prepare(
            userId,
            input as ProposalInput,
            "rule",
            connection.id,
          );
        case "control_mail_job":
          return jobs.control(
            userId,
            input.accountId,
            input.jobId,
            input.command,
            connection.id,
          );
      }
    });
  }
}
