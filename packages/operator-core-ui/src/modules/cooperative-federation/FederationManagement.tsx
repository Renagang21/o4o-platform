import {useEffect,useState} from 'react';
import {ServiceOperatorManagement} from '../ServiceOperatorManagement';
import {PendingOperatorInvitations} from '@o4o/shared-space-ui';
import type {PharmacyManagementClient} from '../pharmacy-management';
import type {Cooperative} from './types';
import {StatusSummary} from './StatusSummary';
export type Client = PharmacyManagementClient;
export type Role = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: "admin" | "operator";
};
export type Event = {
  id: string;
  action: string;
  reason: string;
  createdAt: string;
  actorId: string;
  actorName?: string;
  subjectName?: string;
  subjectId: string | null;
  previousState: string | null;
  nextState: string | null;
};
export type Affiliation = Cooperative & { status: string };
export const base = "/neture/cooperative-management";
export const labels: Record<string, string> = {
  pending: "심사 대기",
  active: "활성",
  rejected: "거절",
  suspended: "정지",
  withdrawn: "자격 종료",
  approve: "가입 승인",
  reject: "가입 거절",
  suspend: "자격 정지",
  restore: "정지 해제",
  withdraw: "탈퇴 처리",
  expel: "제명 의결 반영",
  review: "검토 기록",
  request_changes: "보완 요청",
};
export function eventLabel(action: string): string {
  const fixed: Record<string, string> = {
    affiliation_apply: "조합 가입 신청",
    affiliation_supplement: "조합 신청 보완",
    membership_apply: "개인 가입 신청",
    member_supplement: "가입 신청 보완",
    role_assign: "관리 역할 지정",
    role_revoke: "관리 역할 해제",
    eligibility_update: "가입 기준 변경",
  };
  if (fixed[action]) return fixed[action];
  const clean = action.replace(/^(affiliation|member)_/, "");
  return clean.startsWith("request_")
    ? `${labels[clean.slice(8)] || "처리"} 요청`
    : labels[clean] || "처리 기록";
}
export function affiliationActions(status: string, admin: boolean): string[] {
  if (status === "pending")
    return [
      "review",
      "request_changes",
      ...(admin ? ["approve", "reject"] : []),
    ];
  if (!admin) return [];
  if (status === "active") return ["suspend"];
  if (status === "suspended") return ["restore"];
  return [];
}
export function errorText(error: unknown) {
  const e = error as {
    response?: { data?: { error?: string } };
    message?: string;
  };
  return e.response?.data?.error || e.message || "처리에 실패했습니다.";
}
export function useWork(client: Client, path: string) {
  const [version, setVersion] = useState(0);
  const [data, setData] = useState<unknown[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let live = true;
    setData(null);
    setError("");
    client
      .get(path)
      .then((r) => {
        if (live) setData(r.data.data);
      })
      .catch((e) => {
        if (live) setError(errorText(e));
      });
    return () => {
      live = false;
    };
  }, [client, path, version]);
  const send = async (url: string, body: unknown) => {
    if (busy) return false;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await client.post(url, body);
      setVersion((v) => v + 1);
      setMessage("처리했습니다.");
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { data, error, busy, message, send, version };
}
export function Feedback({
  error,
  message,
}: Readonly<{ error: string; message: string }>) {
  return (
    <>
      {error && <p role="alert">{error}</p>}
      {message && <output>{message}</output>}
    </>
  );
}
export function History({
  client,
  coop,
  federation,
  version,
}: Readonly<{
  client: Client;
  coop: string;
  federation: boolean;
  version: number;
}>) {
  const path = `${base}/${federation ? "federation/" : ""}${coop}/history`;
  const [rows, setRows] = useState<Event[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    setRows([]);
    setError("");
    client
      .get(path)
      .then((r) => {
        if (live) setRows(r.data.data);
      })
      .catch((e) => {
        if (live) setError(errorText(e));
      });
    return () => {
      live = false;
    };
  }, [client, path, version]);
  return (
    <details>
      <summary>처리 이력·승인 요청</summary>
      {error && <p role="alert">{error}</p>}
      {rows.map((e) => (
        <article className="card spaced coop-management" key={e.id}>
          <strong>{eventLabel(e.action)}</strong>
          <p>{e.reason}</p>
          <p>
            {labels[e.previousState || ""] || e.previousState} →{" "}
            {labels[e.nextState || ""] || e.nextState}
          </p>
          <small>
            처리자 {e.actorName || "관리 담당자"}
            {e.subjectId && ` · 대상 ${e.subjectName || "조합원"}`} ·{" "}
            {new Date(e.createdAt).toLocaleString("ko-KR")}
          </small>
        </article>
      ))}
    </details>
  );
}
export function RoleManagement({
  client,
  coop,
  federation,
  userId,
}: Readonly<{
  client: Client;
  coop: string;
  federation: boolean;
  userId: string;
}>) {
  const work = useWork(
    client,
    `${base}/${federation ? "federation/" : ""}${coop}/roles`,
  );
  const [email, setEmail] = useState(""),
    [reason, setReason] = useState("");
  const role = federation ? "admin" : "operator";
  return (
    <section className="card spaced coop-management">
      <h3>조합 {role} 초대·해제</h3>
      <Feedback {...work} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void work.send(`${base}/${coop}/roles`, { email, role, reason: "운영자 초대 요청" });
        }}
      >
        <label>
          <span>기존 계정 이메일</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          <span>해제 사유 (권한 회수 시 필수)</span>
          <textarea
            maxLength={2000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <button type="submit" disabled={work.busy || !email.trim()}>
          조합 {role} 초대
        </button>
      </form>
      {(work.data as Role[] | null)?.map((r) => (
        <p key={r.id}>
          {r.name || r.email} · {r.role}{" "}
          {r.role === role && (
            <button
              type="button"
              disabled={work.busy || r.userId === userId || !reason.trim()}
              onClick={() =>
                void work.send(`${base}/${coop}/roles/${r.id}/revoke`, {
                  reason,
                })
              }
            >
              해제
            </button>
          )}
        </p>
      ))}
      <PendingOperatorInvitations key={`${coop}:${role}`} client={client} kind="cooperative" scope={coop} role={role} version={work.version} />
      <History
        client={client}
        coop={coop}
        federation={federation}
        version={work.version}
      />
    </section>
  );
}
export function FederationManagementPanel({
  client,
  admin,
  userId,
  showOperators = true,
  manageCooperativeAdmins = admin,
}: Readonly<{
  client: Client;
  admin: boolean;
  userId: string;
  showOperators?: boolean;
  manageCooperativeAdmins?: boolean;
}>) {
  const work = useWork(client, `${base}/federation`);
  const [selected, setSelected] = useState<Affiliation | null>(null),
    [reason, setReason] = useState("");
  const current = (work.data as Affiliation[] | null)?.find(
    (c) => c.id === selected?.id,
  );
  return (
    <section className="section coop-management">
      <h1>연합회 산하 조합관리</h1>
      {admin && showOperators && (
        <ServiceOperatorManagement
          key={userId}
          client={client}
          scope="pharmcoop"
          title="연합회 Operator 지정 · 해제"
        />
      )}
      <p>
        {admin
          ? "조합 승인·상태 관리와 조합 admin 지정을 담당합니다."
          : "가입 신청 검토와 보완 요청을 담당합니다. 최종 결정은 연합회 admin이 처리합니다."}
      </p>
      <Feedback {...work} />
      {!work.data && !work.error && <p>조합 목록을 불러오고 있습니다…</p>}
      {work.data && (
        <StatusSummary rows={work.data as Affiliation[]} noun="조합" />
      )}
      <div className="cards two">
        {(work.data as Affiliation[] | null)?.map((c) => (
          <article className="card" key={c.id}>
            <h2>{c.name}</h2>
            <p>
              {labels[c.status]} · /{c.slug}
            </p>
            <button
              type="button"
              onClick={() => {
                setSelected(c);
                setReason("");
              }}
            >
              관리
            </button>
          </article>
        ))}
      </div>
      {current && (
        <section className="card spaced coop-management">
          <h2>{current.name}</h2>
          <p>{current.introduction}</p>
          <p>가입 자격: {current.eligibilityDescription}</p>
          <label>
            <span>처리 사유</span>
            <textarea
              maxLength={2000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <div className="actions">
            {affiliationActions(current.status, admin).map((a) => (
              <button
                type="button"
                key={a}
                disabled={work.busy || !reason.trim()}
                onClick={() =>
                  void work.send(
                    `${base}/federation/${current.id}/actions/${a}`,
                    { reason },
                  )
                }
              >
                {labels[a]}
              </button>
            ))}
          </div>
          {admin && manageCooperativeAdmins ? (
            <RoleManagement
              key={current.id}
              client={client}
              coop={current.id}
              federation
              userId={userId}
            />
          ) : (
            <History
              client={client}
              coop={current.id}
              federation
              version={work.version}
            />
          )}
        </section>
      )}
    </section>
  );
}
