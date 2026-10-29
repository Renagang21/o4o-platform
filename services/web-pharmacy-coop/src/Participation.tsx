import {participationLabels} from '@o4o/operator-core-ui/modules/cooperative-federation';
export {participationLabels, StatusSummary} from '@o4o/operator-core-ui/modules/cooperative-federation';
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { PharmacyManagementClient as Client } from "@o4o/operator-core-ui/modules/pharmacy-management";
import type { Cooperative } from "./domain";


export function workError(error: unknown) {
  const message = (error as { response?: { data?: { error?: unknown } } })
    ?.response?.data?.error;
  return typeof message === "string"
    ? message
    : "정보를 불러오거나 저장하지 못했습니다. 다시 시도해 주세요.";
}
export function useRows<T>(client: Client, path: string) {
  const [rows, setRows] = useState<T[] | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let live = true;
    setRows(null);
    setError("");
    client
      .get(path)
      .then((r) => {
        if (!Array.isArray(r.data.data)) throw new Error("Invalid list");
        if (live) setRows(r.data.data);
      })
      .catch((e) => {
        if (live) setError(workError(e));
      });
    return () => {
      live = false;
    };
  }, [client, path, version]);
  return { rows, error, refresh: () => setVersion((v) => v + 1) };
}
type MyCoop = {
  id: string;
  slug: string;
  name: string;
  cooperativeStatus: string;
  businessStatus: string;
  membershipStatus: string | null;
  role: string | null;
};
type Update = {
  id: string;
  slug: string;
  cooperativeName: string;
  cooperativeStatus: string;
  businessStatus: string;
  action: string;
  reason: string;
  nextState: string | null;
  createdAt: string;
};
const base = "/neture/cooperative-management";
export function MyCooperatives({ client }: Readonly<{ client: Client }>) {
  const { rows, error, refresh } = useRows<MyCoop>(
    client,
    `${base}/my-cooperatives`,
  );
  return (
    <section className="section">
      <h1>내 협동조합</h1>
      <p>
        개인 가입 상태와 관리 역할을 조합별로 확인합니다. 내 매장 이용 권한은
        별도로 확인합니다.
      </p>
      <LoadFeedback error={error} loading={rows === null} retry={refresh} />
      {rows?.length === 0 && (
        <p>
          가입하거나 관리 중인 조합이 없습니다.{" "}
          <Link to="/cooperatives">조합 찾기</Link>
        </p>
      )}
      <div className="cards two">
        {rows?.map((c) => (
          <article key={c.id} className="card">
            <h2>{c.name}</h2>
            <p>
              개인 가입:{" "}
              {c.membershipStatus
                ? participationLabels[c.membershipStatus]
                : "미가입"}
            </p>
            {c.role && <p>관리 역할: {participationLabels[c.role]}</p>}
            {c.cooperativeStatus === "active" &&
            c.businessStatus === "active" ? (
              <div className="actions">
                <Link to={`/${c.slug}`}>조합 공간으로 이동</Link>
                <Link to={`/${c.slug}/membership`}>가입·내 참여</Link>
                {c.role && <Link to={`/${c.slug}/operator`}>조합 운영</Link>}
              </div>
            ) : (
              <p>
                현재 조합이 운영 중이 아닙니다. 가입 상태가 이용 권한을 보장하지
                않습니다.
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
export function MyUpdates({ client }: Readonly<{ client: Client }>) {
  const { rows, error, refresh } = useRows<Update>(
    client,
    `${base}/my-updates`,
  );
  return (
    <section className="section">
      <h1>내 처리 소식</h1>
      <p>
        가입·보완·자격 변경과 역할 지정 결과의 최근 100건입니다. 읽음 상태와
        이메일·문자 발송은 제공하지 않습니다.
      </p>
      <button type="button" onClick={refresh}>
        새로 고침
      </button>
      <LoadFeedback error={error} loading={rows === null} retry={refresh} />
      {rows?.length === 0 && <p>아직 전달된 처리 소식이 없습니다.</p>}
      {rows?.map((e) => (
        <article className="card spaced" key={e.id}>
          <h2>
            {e.cooperativeName} · {participationLabels[e.action] || "처리 결과"}
          </h2>
          <p>{e.reason}</p>
          {e.nextState && (
            <p>결과: {participationLabels[e.nextState] || e.nextState}</p>
          )}
          <small>{new Date(e.createdAt).toLocaleString("ko-KR")}</small>
          <p>
            <UpdateDestination update={e} />
          </p>
        </article>
      ))}
    </section>
  );
}
function UpdateDestination({ update }: Readonly<{ update: Update }>) {
  if (update.action.startsWith("affiliation_"))
    return <Link to="/about">내 조합 신청 확인</Link>;
  if (
    update.cooperativeStatus === "active" &&
    update.businessStatus === "active"
  )
    return <Link to={`/${update.slug}/membership`}>해당 조합 확인</Link>;
  return <>현재 조합이 운영 중이 아닙니다.</>;
}
export function LoadFeedback({
  error,
  loading,
  retry,
}: Readonly<{ error: string; loading: boolean; retry: () => void }>) {
  if (error)
    return (
      <div>
        <p role="alert">{error}</p>
        <button type="button" onClick={retry}>
          다시 조회
        </button>
      </div>
    );
  return loading ? <output>정보를 불러오고 있습니다…</output> : null;
}
export function EligibilitySettings({
  client,
  cooperative,
  onChanged,
}: Readonly<{
  client: Client;
  cooperative: Cooperative;
  onChanged?: () => void;
}>) {
  const [description, setDescription] = useState(
    cooperative.eligibilityDescription,
  );
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  return (
    <form
      className="card spaced coop-management"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        setMessage("");
        try {
          await client.post(`${base}/${cooperative.id}/eligibility`, {
            eligibilityDescription: description,
            reason,
          });
          setMessage("가입 기준을 저장했습니다.");
          setReason("");
          onChanged?.();
        } catch (err) {
          setError(workError(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>조합 가입 기준</h3>
      <p>
        약사·약국 경영자·일반 개인 등 정관에 맞는 가입 자격과 제출 정보를
        안내하세요. 자격은 관리자가 심사하며 기존 조합원을 자동 변경하지
        않습니다.
      </p>
      <label>
        <span>가입 자격·제출 정보</span>
        <textarea
          required
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <label>
        <span>기준 변경 사유</span>
        <textarea
          required
          maxLength={2000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <button
        type="submit"
        disabled={busy || !description.trim() || !reason.trim()}
      >
        가입 기준 저장
      </button>
      {error && <p role="alert">{error}</p>}
      {message && <output>{message}</output>}
    </form>
  );
}
