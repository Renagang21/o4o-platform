import {base,labels,eventLabel,errorText,useWork,Feedback,History,RoleManagement} from '@o4o/operator-core-ui/modules/cooperative-federation';
import type {Client,Event,Affiliation} from '@o4o/operator-core-ui/modules/cooperative-federation';
export {RoleManagement,FederationManagementPanel} from '@o4o/operator-core-ui/modules/cooperative-federation';
import { AiOverviewPanel } from '@o4o/ai-components';
import { EligibilitySettings, StatusSummary } from "./Participation";
import { useEffect, useState } from "react";


import {
  ServiceEnrollmentPolicyAgreement,
  useServiceEnrollmentPolicies,
} from "@o4o/shared-space-ui";

import type { Cooperative } from "./domain";

type Member = {
  id: string;
  userId: string;
  name: string;
  email: string;
  status: string;
};






function actionsFor(status: string): string[] {
  if (status === "pending") return ["approve", "reject"];
  if (status === "active") return ["suspend", "withdraw", "expel"];
  if (status === "suspended") return ["restore", "withdraw", "expel"];
  return [];
}

const affiliationMaxLength = {
  slug: 58,
  name: 255,
  introduction: 2000,
  eligibilityDescription: 2000,
} as const;






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
      <AiOverviewPanel scopeKey={`${userId}:${cooperative.id}`} load={async () => {
        const response = await client.post(`${base}/${cooperative.id}/ai-overview`, {});
        const result = response.data?.data;
        if (response.data?.success !== true || result?.cooperativeId !== cooperative.id) throw new Error('COOPERATIVE_CONTEXT_CHANGED');
        return result;
      }} />
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
