import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import "./cooperation-workflows.css";
import { CooperationMaterialAttachments } from "./CooperationMaterialAttachments";
export interface WorkflowClient {
  get(path: string, config?: any): Promise<{ data: any }>;
  post?(path: string, body: any, config?: any): Promise<unknown>;
}
export interface WorkflowProps {
  client: WorkflowClient;
  accountId: string;
  kind: "business" | "cooperative";
  scopeKey: string;
  organizationId?: string;
}
export const workflowEndpoint = (kind: WorkflowProps["kind"], key: string) =>
  `/cooperation-workflows/${kind}/${encodeURIComponent(key)}`;
export const workflowLabels: Record<string, string> = {
  draft: "초안",
  pending: "검토 대기",
  published: "게시",
  archived: "보관",
  recruiting: "모집 중",
  active: "진행 중",
  ended: "종료",
  submitted: "승인 대기",
  approved: "승인",
  rejected: "반려",
  withdrawn: "철회",
  completed: "완료",
  received: "접수",
  in_review: "확인 중",
  answered: "답변 완료",
  closed: "종료",
  spam: "스팸",
  normal: "일반",
  important: "중요",
  urgent: "긴급",
};
export const workflowDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString("ko-KR") : "미지정";
export function plainBody(value?: string) {
  return value
    ? (new DOMParser().parseFromString(value, "text/html").body.textContent ??
        "")
    : "";
}
export function safeEducationUrl(value: unknown) {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
export function workflowError(error: unknown) {
  const response = (
    error as { response?: { status?: number; data?: { error?: unknown } } }
  )?.response;
  if (response?.status && response.status >= 500)
    return "업무 서버에 연결하지 못했습니다. 입력을 유지하고 다시 시도해 주세요.";
  if (typeof response?.data?.error === "string") return response.data.error;
  return error instanceof Error && !(error instanceof TypeError)
    ? error.message
    : "업무를 조회하거나 처리하지 못했습니다. 다시 시도해 주세요.";
}
export function useWorkflowData(
  props: WorkflowProps,
  operator = false,
  query = "",
) {
  const endpoint = workflowEndpoint(props.kind, props.scopeKey);
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false),
    [writeError, setWriteError] = useState(""),
    [writeSucceeded, setWriteSucceeded] = useState(false);
  const pending = useRef(false),
    alive = useRef(false);
  const config = useMemo(
    () => ({
      headers: { "X-Store-Organization-Id": props.organizationId ?? "" },
    }),
    [props.organizationId],
  );
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setData(null);
    void props.client
      .get(endpoint + (operator ? "/manage" : "/member") + query, config)
      .then((response) => {
        const value = response.data.data;
        if (
          !value ||
          !value.materials ||
          !value.support ||
          (operator
            ? !value.work
            : !Array.isArray(value.notices) || !value.totals || !value.pending)
        )
          throw new Error("업무 응답을 확인할 수 없습니다.");
        if (active) setData(value);
      })
      .catch((e) => {
        if (active) setError(workflowError(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [props.client, config, endpoint, operator, query, revision]);
  const reload = () => setRevision((value) => value + 1);
  const write = async (path: string, body: unknown) => {
    if (pending.current || loading || error) return false;
    pending.current = true;
    setSaving(true);
    setWriteError("");
    setWriteSucceeded(false);
    try {
      if (!props.client.post)
        throw new Error("현재 연결에서는 업무를 처리할 수 없습니다.");
      await props.client.post(endpoint + path, body, config);
      if (!alive.current) return false;
      setWriteSucceeded(true);
      reload();
      return true;
    } catch (e) {
      if (alive.current) setWriteError(workflowError(e));
      return false;
    } finally {
      pending.current = false;
      if (alive.current) setSaving(false);
    }
  };
  return {
    data,
    error,
    loading,
    saving,
    writeError,
    writeSucceeded,
    write,
    reload,
    endpoint,
    config,
    read: async (path: string) =>
      (await props.client.get(endpoint + path, config)).data.data,
  };
}
export function WorkflowMessages({
  state,
}: {
  state: ReturnType<typeof useWorkflowData>;
}) {
  return (
    <>
      {state.writeSucceeded && (
        <p role="status">
          처리를 완료했습니다.{" "}
          {state.error
            ? "최신 목록 조회에 실패했습니다. 업무 다시 조회로 결과를 확인해 주세요."
            : "최신 업무 기록을 확인해 주세요."}
        </p>
      )}
      {state.loading && <p role="status">업무 기록을 불러오고 있습니다…</p>}
      {state.error && (
        <div role="alert">
          <p>{state.error}</p>
          <button type="button" onClick={state.reload}>
            업무 다시 조회
          </button>
        </div>
      )}
      {state.writeError && <p role="alert">{state.writeError}</p>}
    </>
  );
}
export function WorkflowPager({
  offset,
  total,
  pageSize,
  onChange,
}: {
  offset: number;
  total: number;
  pageSize: number;
  onChange: (value: number) => void;
}) {
  return (
    <nav aria-label="업무 기록 페이지">
      <span>
        {total
          ? `${offset + 1}–${Math.min(offset + pageSize, total)} / ${total}건`
          : "0건"}
      </span>
      {offset > 0 && (
        <button
          type="button"
          onClick={() => onChange(Math.max(0, offset - pageSize))}
        >
          이전
        </button>
      )}
      {offset + pageSize < total && (
        <button type="button" onClick={() => onChange(offset + pageSize)}>
          다음
        </button>
      )}
    </nav>
  );
}
export function CooperationMemberWorkflows(props: WorkflowProps) {
  if (!props.accountId) return null;
  if (props.kind === "business" && !props.organizationId)
    return <p>회원 업무를 이용할 약국을 선택해 주세요.</p>;
  return (
    <MemberWorkflows
      key={`${props.accountId}:${props.kind}:${props.scopeKey}:${props.organizationId ?? ""}`}
      {...props}
    />
  );
}
function MemberWorkflows(props: WorkflowProps) {
  const location = useLocation();
  useEffect(() => {
    const selected = location.hash.replace("#cooperation-", "");
    if (!["notices", "materials", "activities", "support"].includes(selected))
      return;
    setTab(selected);
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const target = document.getElementById(`cooperation-${selected}`);
        if (target) {
          target.style.scrollMarginTop = `${Math.max(120, (document.querySelector("header")?.getBoundingClientRect().height || 0) + 16)}px`;
          target.scrollIntoView?.({ block: "start" });
        }
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [location.hash, location.key]);
  const [tab, setTab] = useState("notices"),
    [noticeOffset, setNoticeOffset] = useState(0),
    [activityOffset, setActivityOffset] = useState(0),
    [materialOffset, setMaterialOffset] = useState(0),
    [supportOffset, setSupportOffset] = useState(0);
  const state = useWorkflowData(
    props,
    false,
    `?materialOffset=${materialOffset}&supportOffset=${supportOffset}&noticeOffset=${noticeOffset}&activityOffset=${activityOffset}`,
  );
  const data = state.data;
  return (
    <section
      className="cooperation-workflows"
      aria-label="내 협업 업무"
      id={`cooperation-${tab}`}
    >
      <h2>내 협업 업무</h2>
      <p>
        {props.kind === "cooperative"
          ? "개인 조합원 본인의 업무입니다."
          : "선택한 약국의 업무입니다. 공지 확인과 활동 신청은 이 약국을 기준으로 기록됩니다."}
      </p>
      <WorkflowMessages state={state} />
      <button
        type="button"
        disabled={state.saving || state.loading}
        onClick={state.reload}
      >
        내 업무 새로고침
      </button>
      {data && (
        <>
          <div className="cw-summary">
            <span>필수 공지 확인 필요 {data.pending.notices}건</span>
            <span>활동 승인 대기 {data.pending.applications}건</span>
            <span>내 문의 {data.support.total}건</span>
          </div>
          <nav aria-label="내 협업 업무 메뉴">
            {[
              ["notices", "공지"],
              ["materials", "자료·교육"],
              ["activities", "협업 활동"],
              ["support", "내 문의"],
            ].map(([key, label]) => (
              <button
                type="button"
                key={key}
                aria-pressed={tab === key}
                disabled={state.saving}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </nav>
          <fieldset disabled={state.saving}>
            {tab === "notices" && (
              <div>
                {!data.notices.length && (
                  <p>현재 나에게 게시된 공지가 없습니다.</p>
                )}
                <WorkflowPager
                  offset={noticeOffset}
                  total={data.totals.notices}
                  pageSize={50}
                  onChange={setNoticeOffset}
                />
                {data.notices.map((notice: any) => (
                  <Notice
                    key={`${notice.id}:${notice.version}`}
                    notice={notice}
                    state={state}
                  />
                ))}
              </div>
            )}
            {tab === "materials" && (
              <div>
                <p>
                  이 협업체의 활성 회원 전용 자료입니다. 원본 개정은 이미 만든
                  매장 사본에 덮어쓰지 않습니다.
                </p>
                {data.materials.items.map((item: any) => (
                  <article key={item.id}>
                    <h3>{item.title}</h3>
                    <p>
                      {item.category || "미분류"} · 개정 {item.revision} ·{" "}
                      {workflowDate(item.updated_at)}
                    </p>
                    <CooperationMaterialDetails summary={item.summary} body={item.body} attachments={item.attachments} />
                    {safeEducationUrl(item.education_url) && (
                      <a
                        href={safeEducationUrl(item.education_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        관련 교육 열기 ↗
                      </a>
                    )}
                  </article>
                ))}
                <WorkflowPager
                  offset={materialOffset}
                  total={data.materials.total}
                  pageSize={100}
                  onChange={setMaterialOffset}
                />
              </div>
            )}
            {tab === "activities" && (
              <div>
                <p>
                  공동 업무·교육 참여를 위한 활동입니다. 공급 상품 주문과 공급
                  계약은 기존 거래 화면에서 별도로 처리합니다.
                </p>
                {!data.activities.length && <p>현재 안내된 활동이 없습니다.</p>}
                <WorkflowPager
                  offset={activityOffset}
                  total={data.totals.activities}
                  pageSize={50}
                  onChange={setActivityOffset}
                />
                {data.activities.map((activity: any) => (
                  <Activity
                    key={`${activity.id}:${activity.version}:${activity.application_version}`}
                    activity={activity}
                    state={state}
                  />
                ))}
              </div>
            )}
            {tab === "support" && (
              <>
                <MemberInquiryForm state={state} />
                {data.support.items.map((item: any) => (
                  <article key={item.id}>
                    <h3>{item.subject}</h3>
                    <p>
                      {workflowLabels[item.status] || item.status} · 접수{" "}
                      {workflowDate(item.created_at)} · 처리 기한{" "}
                      {workflowDate(item.due_at)}
                    </p>
                    <p className="cw-body">{item.message}</p>
                    {item.replies.map((reply: any) => (
                      <blockquote key={reply.id}>
                        <p>{workflowDate(reply.createdAt)} 운영자 답변</p>
                        <p className="cw-body">{reply.message}</p>
                      </blockquote>
                    ))}
                  </article>
                ))}
                <WorkflowPager
                  offset={supportOffset}
                  total={data.support.total}
                  pageSize={50}
                  onChange={setSupportOffset}
                />
                <p>
                  이곳에서 로그인해 접수한 본인 문의만 표시합니다. 과거 익명
                  문의는 자동 연결하지 않습니다.
                </p>
              </>
            )}
          </fieldset>
        </>
      )}
    </section>
  );
}
function Notice({
  notice,
  state,
}: {
  notice: any;
  state: ReturnType<typeof useWorkflowData>;
}) {
  const [read, setRead] = useState(false);
  return (
    <article>
      <h3>{notice.title}</h3>
      <p>
        {workflowLabels[notice.priority]} ·{" "}
        {notice.required ? "필수 확인" : "안내"} · 버전 {notice.version} · 기한{" "}
        {workflowDate(notice.due_at)}
      </p>
      <p className="cw-body">{notice.body}</p>
      {notice.acknowledged_at ? (
        <p>확인 완료 · {workflowDate(notice.acknowledged_at)}</p>
      ) : (
        <>
          <label className="cw-check">
            <input
              type="checkbox"
              checked={read}
              onChange={(e) => setRead(e.target.checked)}
            />
            내용을 읽고 확인했습니다.
          </label>
          <button
            type="button"
            disabled={!read}
            onClick={() =>
              void state.write(`/notices/${notice.id}/acknowledge`, {
                version: notice.version,
              })
            }
          >
            공지 확인 기록
          </button>
        </>
      )}
    </article>
  );
}
function Activity({
  activity,
  state,
}: {
  activity: any;
  state: ReturnType<typeof useWorkflowData>;
}) {
  const [note, setNote] = useState("");
  const canApply =
    activity.state === "recruiting" &&
    (!activity.due_at || Date.parse(activity.due_at) > Date.now()) &&
    (!activity.application_state ||
      ["rejected", "withdrawn"].includes(activity.application_state));
  return (
    <article>
      <h3>{activity.title}</h3>
      <p>
        {workflowLabels[activity.state]} · 신청 기한{" "}
        {workflowDate(activity.due_at)}
      </p>
      <p>
        활동 기간 {workflowDate(activity.starts_at)} –{" "}
        {workflowDate(activity.ends_at)}
      </p>
      <p className="cw-body">{activity.body}</p>
      {activity.application_state && (
        <p>
          내 신청: {workflowLabels[activity.application_state]}{" "}
          {activity.decision_note}
        </p>
      )}
      {canApply && (
        <>
          <label>
            신청 내용
            <textarea
              value={note}
              maxLength={2000}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={() =>
              void state.write(`/activities/${activity.id}/applications`, {
                version: activity.version,
                applicationVersion: activity.application_version,
                note,
              })
            }
          >
            참여 신청
          </button>
        </>
      )}
      {activity.application_state === "submitted" && (
        <button
          type="button"
          onClick={() =>
            void state.write(
              `/applications/${activity.application_id}/withdraw`,
              {
                state: "withdrawn",
                version: activity.application_version,
                note: "",
              },
            )
          }
        >
          승인 전 신청 철회
        </button>
      )}
    </article>
  );
}
function MemberInquiryForm({
  state,
}: {
  state: ReturnType<typeof useWorkflowData>;
}) {
  const [subject, setSubject] = useState(""),
    [message, setMessage] = useState(""),
    [consent, setConsent] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void state
          .write("/support", {
            subject,
            message,
            privacyConsent: consent,
            requestId: requestId.current,
          })
          .then((ok) => {
            if (ok) {
              setSubject("");
              setMessage("");
              setConsent(false);
              requestId.current = crypto.randomUUID();
            }
          });
      }}
    >
      <h3>운영자에게 문의</h3>
      <label>
        제목
        <input
          value={subject}
          maxLength={300}
          required
          onChange={(e) => setSubject(e.target.value)}
        />
      </label>
      <label>
        문의 내용
        <textarea
          value={message}
          minLength={10}
          maxLength={5000}
          required
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>
      <label className="cw-check">
        <input
          type="checkbox"
          checked={consent}
          required
          onChange={(e) => setConsent(e.target.checked)}
        />
        문의 처리에 필요한 계정 이름·이메일·문의 내용 제공에 동의합니다.
      </label>
      <button type="submit">문의 접수</button>
    </form>
  );
}


/** Keep the published full text reachable even when the material has a short summary. */
export function CooperationMaterialDetails({ summary, body, attachments }: Readonly<{ summary?: string | null; body?: string | null; attachments?: unknown }>) {
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
  return <>
    {summary && <p className="cw-body">{plainBody(summary)}</p>}
    {(body || hasAttachments) ? <details>
      <summary>자료 내용·첨부 보기</summary>
      {body && <p className="cw-body">{plainBody(body)}</p>}
      <CooperationMaterialAttachments attachments={attachments} />
    </details> : <p>등록된 본문·첨부자료가 없습니다.</p>}
  </>;
}
