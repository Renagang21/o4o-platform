import { api, API_BASE_URL } from "../lib/apiClient";
const base = `${API_BASE_URL}/api/personal-mail`;
export type MailAction = "keep" | "archive" | "trash" | "important";
export interface MailAccount {
  id: string;
  provider: "gmail" | "naver";
  address: string;
  state: string;
  syncCompletedAt: string | null;
  syncing: boolean;
}
export interface MailSender {
  sender: string;
  count: number;
  important: number;
  latestAt: string;
  ruleAction: MailAction | null;
  category: string | null;
}
export interface MailRule {
  id: string;
  sender: string;
  action: MailAction;
  category: string;
  revision: number;
  delegated: boolean;
}
export interface MailMessage {
  id: string;
  sender: string;
  receivedAt: string;
  important: boolean;
  category: string | null;
}
export interface MailJob {
  id: string;
  accountId: string;
  kind: "cleanup" | "rule" | "automatic";
  action: MailAction;
  status: string;
  total: number;
  includeImportant: boolean;
  proposal: { senders?: string[]; category?: string };
  counts: { pending: number; done: number; skipped: number; failed: number };
  lastError: string | null;
  confirmationToken?: string;
  confirmationExpiresAt: string;
  confirmUrl: string;
}
export interface MailCapabilities {
  archive: boolean;
  trash: boolean;
  important: boolean;
  body: boolean;
}
const accountPath = (id: string) =>
  `${base}/accounts/${encodeURIComponent(id)}`;
async function get<T>(
  url: string,
  params?: Record<string, unknown>,
): Promise<T> {
  return (await api.get(url, { params })).data.data;
}
async function post<T>(url: string, data: unknown = {}): Promise<T> {
  return (await api.post(url, data)).data.data;
}
export const personalMailApi = {
  status: () =>
    get<{
      enabled: boolean;
      gmailConfigured: boolean;
      naverConfigured: boolean;
    }>(`${base}/status`),
  accounts: () => get<MailAccount[]>(`${base}/accounts`),
  gmailStart: () => post<{ authorizationUrl: string }>(`${base}/gmail/start`),
  gmailComplete: (state: string, code: string) =>
    post(`${base}/gmail/complete`, { state, code }),
  naver: (address: string, password: string) =>
    post(`${base}/naver`, { address, password }),
  disconnect: async (id: string) => {
    await api.delete(accountPath(id));
  },
  sync: (id: string) => post(`${accountPath(id)}/sync`),
  capabilities: (id: string) =>
    get<MailCapabilities>(`${accountPath(id)}/capabilities`),
  senders: (id: string, page: number) =>
    get<{ senders: MailSender[]; page: number; scope: string }>(
      `${accountPath(id)}/senders`,
      { page },
    ),
  messages: (id: string, sender?: string, page = 1) =>
    get<MailMessage[]>(`${accountPath(id)}/messages`, { sender, page }),
  read: (id: string, messageId: string) =>
    get<{ subject: string; text: string; notice: string }>(
      `${accountPath(id)}/messages/${encodeURIComponent(messageId)}`,
    ),
  rules: (id: string) => get<MailRule[]>(`${accountPath(id)}/rules`),
  jobs: (id: string) => get<MailJob[]>(`${accountPath(id)}/jobs`),
  job: (id: string, jobId: string) =>
    get<MailJob>(`${accountPath(id)}/jobs/${encodeURIComponent(jobId)}`),
  prepare: (
    kind: "cleanup" | "rule",
    input: {
      accountId: string;
      senders: string[];
      action: MailAction;
      requestId: string;
      includeImportant?: boolean;
      category?: string;
    },
  ) => post<MailJob>(`${base}/previews/${kind}`, input),
  confirm: (job: MailJob) =>
    post<MailJob>(
      `${accountPath(job.accountId)}/jobs/${encodeURIComponent(job.id)}/confirm`,
      { expectedCount: job.total, confirmationToken: job.confirmationToken },
    ),
  control: (job: MailJob, command: "pause" | "resume" | "cancel") =>
    post<MailJob>(
      `${accountPath(job.accountId)}/jobs/${encodeURIComponent(job.id)}/control`,
      { command },
    ),
};
const messages: Record<string, string> = {
  MAIL_CONFIRMATION_EXPIRED:
    "검토 시간이 지났습니다. 대상을 새로 확인해 주세요.",
  MAIL_ACCOUNT_CHANGED: "계정 연결이 바뀌었습니다. 대상을 새로 확인해 주세요.",
  MAIL_RECONNECT_REQUIRED: "메일 계정을 다시 연결해 주세요.",
  MAIL_DELEGATION_REVOKED:
    "ChatGPT 연결 권한이 종료되어 중단됐습니다. 이 화면에서 내용을 확인한 뒤 직접 재개할 수 있습니다.",
  MAIL_SCOPE_FORBIDDEN: "이 메일 계정의 연결 권한을 확인해 주세요.",
  MAIL_ACTION_UNSUPPORTED: "이 계정에서 선택한 처리 방식을 사용할 수 없습니다.",
  MAIL_NO_MATCHING_MESSAGES:
    "수집된 수신함에 해당하는 메일이 없습니다. 중요 메일 보호 설정도 확인해 주세요.",
  MAILBOX_CHANGED:
    "메일함 식별 정보가 바뀌었습니다. 새로 수집한 뒤 대상을 다시 확인해 주세요.",
  MAIL_PROVIDER_RATE_LIMITED:
    "메일 서비스의 요청 한도에 도달했습니다. 잠시 후 작업을 재개해 주세요.",
  MAIL_MESSAGE_TOO_LARGE:
    "이 메일은 미리보기 크기를 초과합니다. 원래 메일 서비스에서 확인해 주세요.",
  PERSONAL_MAIL_DISABLED: "개인 메일 관리를 아직 사용할 수 없습니다.",
};
export function mailErrorMessage(error: unknown) {
  const code = (error as { response?: { data?: { code?: string } } })?.response
    ?.data?.code;
  return (
    messages[code ?? ""] ??
    "처리하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요."
  );
}
export const mailActionLabels: Record<MailAction, string> = {
  keep: "허용 · 자동 정리 중지",
  archive: "보관",
  trash: "휴지통 이동",
  important: "중요 표시",
};
