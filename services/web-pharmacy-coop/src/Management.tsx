import { EligibilitySettings, StatusSummary } from "./Participation";
import { useEffect, useState } from "react";
import { ServiceOperatorManagement } from "@o4o/operator-core-ui";
import { PendingOperatorInvitations } from "@o4o/shared-space-ui";
import {
  ServiceEnrollmentPolicyAgreement,
  useServiceEnrollmentPolicies,
} from "@o4o/shared-space-ui";
import type { PharmacyManagementClient } from "@o4o/operator-core-ui/modules/pharmacy-management";
import type { Cooperative } from "./domain";
type Client = PharmacyManagementClient;
type Member = {
  id: string;
  userId: string;
  name: string;
  email: string;
  status: string;
};
type Role = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: "admin" | "operator";
};
type Event = {
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
type Affiliation = Cooperative & { status: string };
const base = "/neture/cooperative-management";
const labels: Record<string, string> = {
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
function eventLabel(action: string): string {
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
function actionsFor(status: string): string[] {
  if (status === "pending") return ["approve", "reject"];
  if (status === "active") return ["suspend", "withdraw", "expel"];
  if (status === "suspended") return ["restore", "withdraw", "expel"];
  return [];
}
function affiliationActions(status: string, admin: boolean): string[] {
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
const affiliationMaxLength = {
  slug: 58,
  name: 255,
  introduction: 2000,
  eligibilityDescription: 2000,
} as const;
function errorText(error: unknown) {
  const e = error as {
    response?: { data?: { error?: string } };
    message?: string;
  };
  return e.response?.data?.error || e.message || "처리에 실패했습니다.";
}
function useWork(client: Client, path: string) {
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
function Feedback({
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
function History({
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
}: Readonly<{
  client: Client;
  admin: boolean;
  userId: string;
  showOperators?: boolean;
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
          {admin ? (
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
export function MemberManagementPanel({
  client,
  cooperative,
  admin,
  userId,
  onChanged,
  showSettings = true,
}: Readonly<{
  onChanged?: () => void;
  showSettings?: boolean;
  client: Client;
  cooperative: Cooperative;
  admin: boolean;
  userId: string;
}>) {
  const work = useWork(client, `${base}/${cooperative.id}/members`);
  const [reason, setReason] = useState("");
  return (
    <section className="section coop-management">
      <h2>조합원 관리 · {admin ? "admin" : "operator"}</h2>
      {work.data && (
        <StatusSummary rows={work.data as Member[]} noun="조합원" />
      )}
      {admin && showSettings && (
        <EligibilitySettings
          key={cooperative.id}
          client={client}
          cooperative={cooperative}
          onChanged={onChanged}
        />
      )}
      <p>
        {admin
          ? "최종 자격 결정은 해당 조합에만 적용됩니다. 제명은 정관에 따른 의결 결과를 기록하세요."
          : "신청 검토·보완 요청과 최종 처리 요청을 기록합니다. 자격 결정은 조합 admin이 처리합니다."}
      </p>
      <Feedback {...work} />
      <label>
        <span>검토·처리 사유</span>
        <textarea
          maxLength={2000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      {!work.data && !work.error && <p>조합원을 불러오고 있습니다…</p>}
      <div className="cards two">
        {(work.data as Member[] | null)?.map((m) => (
          <article className="card" key={m.id}>
            <h3>{m.name || m.email}</h3>
            <p>
              {m.email} · {labels[m.status]}
            </p>
            <div className="actions">
              {[
                ...(m.status === "pending"
                  ? ["review", "request_changes"]
                  : []),
                ...actionsFor(m.status).map((a) =>
                  admin ? a : `request_${a}`,
                ),
              ].map((a) => (
                <button
                  type="button"
                  key={a}
                  disabled={work.busy || !reason.trim()}
                  onClick={() =>
                    void work.send(
                      `${base}/${cooperative.id}/members/${m.id}/actions/${a}`,
                      { reason },
                    )
                  }
                >
                  {a.startsWith("request_")
                    ? `${labels[a.slice(8)]} 요청`
                    : labels[a]}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
      <History
        client={client}
        coop={cooperative.id}
        federation={false}
        version={work.version}
      />
      {admin && showSettings && (
        <RoleManagement
          client={client}
          coop={cooperative.id}
          federation={false}
          userId={userId}
        />
      )}
    </section>
  );
}
export function MembershipApplication({
  client,
  coop,
  businessKey,
  policyScope,
  onChanged,
}: Readonly<{
  client: Client;
  coop: string;
  businessKey?: string;
  policyScope?: string;
  onChanged?: () => void;
}>) {
  const [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  const agreement = useServiceEnrollmentPolicies(
    policyScope ?? "",
    async () => {
      if (!businessKey || !policyScope) throw new Error("Business unavailable");
      return (
        await client.get(
          `/neture/businesses/${encodeURIComponent(businessKey)}/legal/enrollment-policies`,
        )
      ).data.data;
    },
    coop,
  );
  return (
    <form
      className="card spaced coop-management"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy || !agreement.ready) return;
        setBusy(true);
        setError("");
        try {
          await client.post(`${base}/${coop}/applications`, {
            reason,
            policyReferences: agreement.references,
          });
          setDone(true);
          onChanged?.();
        } catch (err) {
          setError(errorText(err));
          if (
            (err as { response?: { status?: number } })?.response?.status ===
            409
          )
            agreement.reload();
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>개인 조합원 가입·보완 신청</h3>
      <label>
        <span>가입 자격·신청 내용</span>
        <textarea
          required
          maxLength={2000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <ServiceEnrollmentPolicyAgreement agreement={agreement} />
      <button
        type="submit"
        disabled={busy || done || !reason.trim() || !agreement.ready}
      >
        가입·보완 신청
      </button>
      <Feedback
        error={error}
        message={done ? "가입 신청을 접수했습니다." : ""}
      />
    </form>
  );
}
export function AffiliationApplication({
  client,
  onChanged,
}: Readonly<{
  client: Client;
  onChanged?: () => void;
}>) {
  const [fields, setFields] = useState({
    slug: "",
    name: "",
    introduction: "",
    eligibilityDescription: "",
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  return (
    <form
      className="card spaced coop-management"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        try {
          await client.post(`${base}/affiliations`, fields);
          setDone(true);
          onChanged?.();
        } catch (err) {
          setError(errorText(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>연합회 가입 신청</h2>
      {(
        [
          ["slug", "조합 주소 (영문 소문자·숫자·하이픈)"],
          ["name", "조합명"],
          ["introduction", "조합 소개"],
          ["eligibilityDescription", "조합원 가입 자격"],
        ] as const
      ).map(([key, label]) => (
        <label key={key}>
          <span>{label}</span>
          <input
            required
            maxLength={affiliationMaxLength[key]}
            value={fields[key]}
            onChange={(e) => setFields({ ...fields, [key]: e.target.value })}
          />
        </label>
      ))}
      <button type="submit" disabled={busy || done}>
        조합 가입 신청
      </button>
      <Feedback
        error={error}
        message={done ? "신청을 접수했습니다. 연합회에서 검토합니다." : ""}
      />
    </form>
  );
}

export function PersonalHistory({
  client,
  coop,
}: Readonly<{
  client: Client;
  coop: string;
}>) {
  const work = useWork(client, `${base}/${coop}/my-history`);
  return (
    <section className="card spaced coop-management">
      <h3>내 신청·처리 이력</h3>
      <Feedback {...work} />
      {(work.data as Event[] | null)?.map((e) => (
        <p key={e.id}>
          {eventLabel(e.action)} · {e.reason} ·{" "}
          {new Date(e.createdAt).toLocaleString("ko-KR")}
        </p>
      ))}
    </section>
  );
}
export function WithdrawalRequest({
  client,
  coop,
}: Readonly<{
  client: Client;
  coop: string;
}>) {
  const [reason, setReason] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="card spaced coop-management"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        try {
          await client.post(`${base}/${coop}/withdrawal-request`, { reason });
          setMessage("탈퇴 요청을 접수했습니다. 조합 admin이 처리합니다.");
        } catch (err) {
          setError(errorText(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>조합 탈퇴 요청</h3>
      <label>
        <span>탈퇴 사유</span>
        <textarea
          required
          maxLength={2000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <button type="submit" disabled={busy || !reason.trim() || !!message}>
        탈퇴 요청
      </button>
      <Feedback error={error} message={message} />
    </form>
  );
}
export function MyAffiliations({ client }: Readonly<{ client: Client }>) {
  const work = useWork(client, `${base}/my-affiliations`);
  const [reason, setReason] = useState("");
  return (
    <section className="spaced">
      <h2>내 조합 가입 신청</h2>
      <Feedback {...work} />
      {(work.data as Affiliation[] | null)?.map((c) => (
        <article className="card spaced coop-management" key={c.id}>
          <h3>
            {c.name} · {labels[c.status]}
          </h3>
          <PersonalHistory
            key={`${c.id}:${work.version}`}
            client={client}
            coop={c.id}
          />
          {c.status === "pending" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void work.send(`${base}/${c.id}/supplement`, { reason });
              }}
            >
              <label>
                <span>보완 내용</span>
                <textarea
                  required
                  maxLength={2000}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <button type="submit" disabled={work.busy || !reason.trim()}>
                보완 내용 제출
              </button>
            </form>
          )}
        </article>
      ))}
    </section>
  );
}

export function CooperativeSettings({
  client,
  cooperative,
  userId,
  onChanged,
}: Readonly<{
  client: Client;
  cooperative: Cooperative;
  userId: string;
  onChanged?: () => void;
}>) {
  return (
    <section className="coop-management">
      <h2>가입 자격·운영자 설정</h2>
      <EligibilitySettings
        key={cooperative.id}
        client={client}
        cooperative={cooperative}
        onChanged={onChanged}
      />
      <RoleManagement
        client={client}
        coop={cooperative.id}
        federation={false}
        userId={userId}
      />
    </section>
  );
}
