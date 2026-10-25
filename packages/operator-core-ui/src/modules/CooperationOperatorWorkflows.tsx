import { useEffect, useState } from "react";
import {
  workflowDate,
  workflowLabels,
  plainBody,
  safeEducationUrl,
  useWorkflowData,
  WorkflowMessages,
  WorkflowPager,
  type WorkflowProps,
} from "@o4o/shared-space-ui";
type Props = WorkflowProps & {
  inboxHref: string;
  materialEditHref?: (id?: string) => string;
};
const localDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
const iso = (value: string) => (value ? new Date(value).toISOString() : null);
const fresh = (kind = "notice") => ({
  kind,
  title: "",
  body: "",
  category: "",
  priority: "normal",
  required: false,
  dueAt: "",
  startsAt: "",
  endsAt: "",
  state: "draft",
  targetIds: [] as string[],
  id: undefined as string | undefined,
  version: undefined as number | undefined,
  initialState: "draft",
});
type Form = ReturnType<typeof fresh>;
export function CooperationOperatorWorkflows(props: Props) {
  return (
    <OperatorWorkflows
      key={`${props.accountId}:${props.kind}:${props.scopeKey}`}
      {...props}
    />
  );
}
function OperatorWorkflows(props: Props) {
  const [tab, setTab] = useState("work"),
    [form, setForm] = useState<Form>(fresh),
    [selected, setSelected] = useState<string | null>(null),
    [editorOpen, setEditorOpen] = useState(false),
    [workFilter, setWorkFilter] = useState("all"),
    [supportFilter, setSupportFilter] = useState("all");
  const [workOffset, setWorkOffset] = useState(0),
    [materialOffset, setMaterialOffset] = useState(0),
    [supportOffset, setSupportOffset] = useState(0),
    [subjectOffset, setSubjectOffset] = useState(0);
  const state = useWorkflowData(
      props,
      true,
      `?workOffset=${workOffset}&materialOffset=${materialOffset}&supportOffset=${supportOffset}&subjectOffset=${subjectOffset}&workFilter=${workFilter}&supportFilter=${supportFilter}`,
    ),
    data = state.data;
  const edit = (item: any) => {
    setForm({
      ...fresh(item.kind),
      id: item.id,
      version: item.version,
      title: item.title,
      body: item.body,
      category: item.category,
      priority: item.priority,
      required: item.required,
      dueAt: localDate(item.due_at),
      startsAt: localDate(item.starts_at),
      endsAt: localDate(item.ends_at),
      state: item.state,
      initialState: item.state,
      targetIds: item.target_ids,
    });
    setSelected(item.id);
    setEditorOpen(true);
  };
  return (
    <section className="cooperation-workflows" aria-label="협업 업무 관리">
      <h2>협업 업무 관리</h2>
      <p>회원에게 보이는 공지·자료·활동과 문의의 후속 처리를 관리합니다.</p>
      <WorkflowMessages state={state} />
      {data && (
        <>
          <div className="cw-summary">
            <button
              type="button"
              disabled={state.saving}
              onClick={() => {
                setTab("work");
                setWorkFilter("notice-pending");
                setWorkOffset(0);
              }}
            >
              필수 공지 미확인 대상 {data.summary.notices}건
            </button>
            <button
              type="button"
              disabled={state.saving}
              onClick={() => {
                setTab("work");
                setWorkFilter("activity-pending");
                setWorkOffset(0);
              }}
            >
              활동 신청 검토 {data.summary.applications}건
            </button>
            <button
              type="button"
              disabled={state.saving}
              onClick={() => {
                setTab("support");
                setSupportFilter(
                  data.support.unassigned
                    ? "unassigned"
                    : data.support.overdue
                      ? "overdue"
                      : "all",
                );
                setSupportOffset(0);
              }}
            >
              문의 담당 미배정 {data.support.unassigned}건 · 기한 초과{" "}
              {data.support.overdue}건
            </button>
          </div>
          <nav aria-label="협업 업무 관리 메뉴">
            {[
              ["work", "공지·협업 활동"],
              ["materials", "자료 개정·교육"],
              ["support", "지원 담당·기한"],
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
            <button
              type="button"
              disabled={state.saving}
              onClick={state.reload}
            >
              업무 새로고침
            </button>
          </nav>
          <fieldset disabled={state.saving}>
            {tab === "work" && (
              <>
                <nav aria-label="공지·활동 작업">
                  <button
                    type="button"
                    onClick={() => {
                      setForm(fresh("notice"));
                      setSelected(null);
                      setEditorOpen(true);
                    }}
                  >
                    새 공지
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm(fresh("activity"));
                      setSelected(null);
                      setEditorOpen(true);
                    }}
                  >
                    새 협업 활동
                  </button>
                </nav>
                <label>
                  처리 대상
                  <select
                    aria-label="처리 대상"
                    value={workFilter}
                    onChange={(e) => {
                      setWorkFilter(e.target.value);
                      setWorkOffset(0);
                    }}
                  >
                    <option value="all">전체 공지·활동</option>
                    <option value="notice-pending">필수 공지 미확인</option>
                    <option value="activity-pending">
                      활동 신청 검토 대기
                    </option>
                  </select>
                </label>
                {editorOpen && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditorOpen(false);
                        setSelected(null);
                      }}
                    >
                      편집 닫기
                    </button>
                    <WorkForm
                      key={form.id || form.kind}
                      form={form}
                      setForm={setForm}
                      subjects={data.subjects}
                      subjectOffset={subjectOffset}
                      setSubjectOffset={setSubjectOffset}
                      state={state}
                      onSaved={() => {
                        setForm(fresh(form.kind));
                        setSelected(null);
                        setEditorOpen(false);
                      }}
                    />
                  </>
                )}
                {selected && (
                  <WorkDetail
                    key={selected}
                    id={selected}
                    state={state}
                    client={props.client}
                  />
                )}
                <div className="cw-grid">
                  {data.work.items.map((item: any) => (
                    <article key={item.id}>
                      <h3>{item.title}</h3>
                      <p>
                        {item.kind === "notice" ? "공지" : "협업 활동"} ·{" "}
                        {workflowLabels[item.state]} · 버전 {item.version} ·
                        기한 {workflowDate(item.due_at)}
                      </p>
                      <button type="button" onClick={() => edit(item)}>
                        편집·처리 현황
                      </button>
                    </article>
                  ))}
                </div>
                <WorkflowPager
                  offset={workOffset}
                  total={data.work.total}
                  pageSize={20}
                  onChange={setWorkOffset}
                />
              </>
            )}
            {tab === "materials" && (
              <>
                <p>
                  분류와 교육 링크를 관리하고 개정 내용을 확인합니다. 공개
                  범위는 기존 사업의 활성 회원 전용이며, 본문·첨부 작성과 게시
                  승인은 기존 자료 관리 화면에서 처리합니다.
                </p>
                {props.materialEditHref && (
                  <a href={props.materialEditHref()}>자료 작성·게시 관리 →</a>
                )}
                {data.materials.items.map((item: any) => (
                  <Material
                    key={`${item.id}:${item.revision}`}
                    item={item}
                    state={state}
                    editHref={props.materialEditHref?.(item.id)}
                  />
                ))}
                <WorkflowPager
                  offset={materialOffset}
                  total={data.materials.total}
                  pageSize={100}
                  onChange={setMaterialOffset}
                />
              </>
            )}
            {tab === "support" && (
              <>
                <label>
                  문의 처리 대상
                  <select
                    aria-label="문의 처리 대상"
                    value={supportFilter}
                    onChange={(e) => {
                      setSupportFilter(e.target.value);
                      setSupportOffset(0);
                    }}
                  >
                    <option value="all">전체 문의</option>
                    <option value="unassigned">미답변·담당 미배정</option>
                    <option value="overdue">미답변·기한 초과</option>
                  </select>
                </label>
                <p>
                  문의의 마지막 처리자와 배정 담당자는 별개입니다. 현재 이
                  공간의 운영 권한이 있는 사람에게 배정합니다.
                </p>
                <a href={props.inboxHref}>문의 상세·답변·상태 처리 →</a>
                {data.support.items.map((item: any) => (
                  <SupportAssignment
                    key={`${item.id}:${item.version}`}
                    item={item}
                    operators={data.operators}
                    state={state}
                  />
                ))}
                <WorkflowPager
                  offset={supportOffset}
                  total={data.support.total}
                  pageSize={50}
                  onChange={setSupportOffset}
                />
              </>
            )}
          </fieldset>
        </>
      )}
    </section>
  );
}
function WorkForm({
  form,
  setForm,
  subjects,
  subjectOffset,
  setSubjectOffset,
  state,
  onSaved,
}: {
  form: Form;
  setForm: (value: Form) => void;
  subjects: any;
  subjectOffset: number;
  setSubjectOffset: (n: number) => void;
  state: ReturnType<typeof useWorkflowData>;
  onSaved: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const set = (key: keyof Form, value: any) => {
    setForm({ ...form, [key]: value });
    setConfirmed(false);
  };
  const activityStates: Record<string, string[]> = {
    draft: ["draft", "recruiting", "archived"],
    recruiting: ["recruiting", "active", "ended", "archived"],
    active: ["active", "ended"],
    ended: ["ended", "archived"],
    archived: ["archived"],
  };
  const states = !form.id
    ? ["draft"]
    : form.kind === "notice"
      ? ["draft", "published", "archived"]
      : activityStates[form.initialState] || [form.state];
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void state
          .write("/manage/work" + (form.id ? `/${form.id}` : ""), {
            ...form,
            dueAt: iso(form.dueAt),
            startsAt: iso(form.startsAt),
            endsAt: iso(form.endsAt),
          })
          .then((ok) => {
            if (ok) onSaved();
          });
      }}
    >
      <h3>
        {form.id
          ? "업무 편집"
          : "새 " + (form.kind === "notice" ? "공지" : "협업 활동")}
      </h3>
      <label>
        제목
        <input
          required
          autoFocus
          maxLength={300}
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
        />
      </label>
      <label>
        본문
        <textarea
          required
          maxLength={30000}
          value={form.body}
          onChange={(e) => set("body", e.target.value)}
        />
      </label>
      <div className="cw-grid">
        <label>
          분류
          <input
            maxLength={80}
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
          />
        </label>
        <label>
          상태
          <select
            value={form.state}
            onChange={(e) => set("state", e.target.value)}
          >
            {states.map((value) => (
              <option key={value} value={value}>
                {workflowLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          {form.kind === "notice" ? "확인 기한" : "신청 기한"}
          <input
            type="datetime-local"
            value={form.dueAt}
            onChange={(e) => set("dueAt", e.target.value)}
          />
        </label>
      </div>
      {form.kind === "notice" ? (
        <>
          <label>
            중요도
            <select
              value={form.priority}
              onChange={(e) => set("priority", e.target.value)}
            >
              {["normal", "important", "urgent"].map((value) => (
                <option key={value} value={value}>
                  {workflowLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="cw-check">
            <input
              type="checkbox"
              checked={form.required}
              onChange={(e) => set("required", e.target.checked)}
            />
            필수 확인 공지
          </label>
        </>
      ) : (
        <>
          <p>
            공동 업무·교육 참여를 위한 활동입니다. 상품 주문·계약·결제 조건을
            만들지 않습니다.
          </p>
          <div className="cw-grid">
            <label>
              활동 시작
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => set("startsAt", e.target.value)}
              />
            </label>
            <label>
              활동 종료
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => set("endsAt", e.target.value)}
              />
            </label>
          </div>
        </>
      )}
      <details>
        <summary>
          대상 선택 ·{" "}
          {form.targetIds.length
            ? `${form.targetIds.length}개 선택`
            : "전체 활성 회원"}
        </summary>
        <p>
          선택을 비우면 게시 시점의 전체 활성 회원이 대상입니다. 약국 사업은
          약국 단위, 조합은 개인 조합원 단위입니다. 모집 시작 후 활동 대상은
          변경할 수 없습니다.
        </p>
        {subjects.items.map((subject: any) => (
          <label className="cw-check" key={subject.id}>
            <input
              type="checkbox"
              checked={form.targetIds.includes(subject.id)}
              onChange={(e) =>
                set(
                  "targetIds",
                  e.target.checked
                    ? [...form.targetIds, subject.id]
                    : form.targetIds.filter((id) => id !== subject.id),
                )
              }
            />
            {subject.name}
          </label>
        ))}
        <WorkflowPager
          offset={subjectOffset}
          total={subjects.total}
          pageSize={100}
          onChange={setSubjectOffset}
        />
        <button type="button" onClick={() => set("targetIds", [])}>
          개별 선택 비우기
        </button>
      </details>
      {form.kind === "notice" && form.id && form.state === "published" && (
        <label className="cw-check">
          <input
            type="checkbox"
            required
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          새 버전으로 게시하고 대상의 확인 기록을 다시 받습니다. 기존 버전의
          기록은 보존됩니다.
        </label>
      )}
      <button type="submit">{form.id ? "변경 저장" : "초안 저장"}</button>
    </form>
  );
}
function WorkDetail({
  id,
  state,
  client,
}: {
  id: string;
  state: ReturnType<typeof useWorkflowData>;
  client: Props["client"];
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [offset, setOffset] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    void client
      .get(`${state.endpoint}/manage/work/${id}?offset=${offset}`)
      .then((r) => {
        if (active) setData(r.data.data);
      })
      .catch((e) => {
        if (active) setError(e.message || "처리 현황 조회 실패");
      });
    return () => {
      active = false;
    };
  }, [client, state.endpoint, id, offset]);
  if (error)
    return <p role="alert">{error} · 업무 새로고침으로 다시 조회해 주세요.</p>;
  if (!data) return <p role="status">처리 현황 조회 중…</p>;
  return (
    <div className="cw-panel">
      <h3>{data.work.title} 처리 현황</h3>
      {data.work.kind === "notice" ? (
        <>
          <p>
            현재 버전 대상 {data.counts.total} · 확인 {data.counts.completed} ·
            미확인 {data.counts.total - data.counts.completed}
          </p>
          <p>
            약국 단위 확인은 해당 약국의 현재 이용 권한을 가진 사람이 기록하며,
            개인 조합원은 본인이 기록합니다.
          </p>
          {data.recipients.map((r: any) => (
            <p key={r.subject_id}>
              {r.name || "현재 비활성 대상"} ·{" "}
              {r.acknowledged_at
                ? `확인 ${workflowDate(r.acknowledged_at)}`
                : "미확인"}
            </p>
          ))}
          <WorkflowPager
            offset={offset}
            total={data.counts.total}
            pageSize={100}
            onChange={setOffset}
          />
        </>
      ) : (
        <>
          <p>
            전체 신청 {data.counts.total} · 완료 {data.counts.completed}
          </p>
          {data.applications.map((a: any) => (
            <ApplicationDecision
              key={`${a.id}:${a.version}`}
              item={a}
              workState={data.work.state}
              hasStarted={data.revisions.some(
                (revision: any) => revision.snapshot.state === "active",
              )}
              state={state}
            />
          ))}
          <WorkflowPager
            offset={offset}
            total={data.counts.total}
            pageSize={100}
            onChange={setOffset}
          />
        </>
      )}
      <details>
        <summary>업무 개정 이력 {data.revisions.length}개</summary>
        {data.revisions.map((revision: any) => (
          <article key={revision.version}>
            <p>
              버전 {revision.version} · {workflowDate(revision.created_at)} ·{" "}
              {workflowLabels[revision.snapshot.state]}
              {data.work.kind === "notice"
                ? ` · 대상 ${revision.total} / 확인 ${revision.completed}`
                : ""}
            </p>
            <h3>{revision.snapshot.title}</h3>
            <p className="cw-body">{revision.snapshot.body}</p>
          </article>
        ))}
      </details>
    </div>
  );
}
function ApplicationDecision({
  item,
  state,
  workState,
  hasStarted,
}: {
  item: any;
  workState: string;
  hasStarted: boolean;
  state: ReturnType<typeof useWorkflowData>;
}) {
  const [note, setNote] = useState(""),
    [error, setError] = useState("");
  const decide = (next: string) => {
    if (next === "rejected" && !note.trim()) {
      setError("반려 사유를 입력해 주세요.");
      return;
    }
    setError("");
    void state.write(`/manage/applications/${item.id}`, {
      state: next,
      version: item.version,
      note,
    });
  };
  return (
    <article>
      <h3>{item.name || "현재 비활성 신청자"}</h3>
      <p>
        {workflowLabels[item.state]} · 신청 {workflowDate(item.created_at)}
      </p>
      <p className="cw-body">{item.note}</p>
      <p>{item.decision_note}</p>
      {["submitted", "approved"].includes(item.state) && (
        <>
          <label>
            처리 사유
            <textarea
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          {item.state === "submitted" ? (
            <>
              <button
                type="button"
                disabled={!["recruiting", "active"].includes(workState)}
                onClick={() => decide("approved")}
              >
                참여 승인
              </button>
              <button type="button" onClick={() => decide("rejected")}>
                사유와 함께 반려
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={!hasStarted || !["active", "ended"].includes(workState)}
              onClick={() => decide("completed")}
            >
              활동 완료 기록
            </button>
          )}
        </>
      )}
    </article>
  );
}
function Material({
  item,
  state,
  editHref,
}: {
  item: any;
  state: ReturnType<typeof useWorkflowData>;
  editHref?: string;
}) {
  const [category, setCategory] = useState(item.category || ""),
    [url, setUrl] = useState(item.education_url || ""),
    [history, setHistory] = useState<any[] | null>(null),
    [error, setError] = useState("");
  return (
    <article>
      <h3>{item.title}</h3>
      <p>
        {workflowLabels[item.status] || item.status} · 개정 {item.revision} ·{" "}
        {workflowDate(item.updated_at)}
      </p>
      <p className="cw-body">{plainBody(item.summary || item.body)}</p>
      {editHref && <a href={editHref}>본문·첨부·게시 편집 →</a>}
      <label>
        자료 분류
        <input
          maxLength={80}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
      </label>
      <label>
        관련 교육 HTTPS 링크
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </label>
      {safeEducationUrl(item.education_url) && (
        <a
          href={safeEducationUrl(item.education_url)}
          target="_blank"
          rel="noopener noreferrer"
        >
          관련 교육 확인 ↗
        </a>
      )}
      <button
        type="button"
        onClick={() =>
          void state.write(`/manage/materials/${item.id}`, {
            revision: item.revision,
            category,
            educationUrl: url || null,
          })
        }
      >
        자료 분류·교육 저장
      </button>
      <button
        type="button"
        onClick={() => {
          setError("");
          void stateGet(state, `/manage/materials/${item.id}/revisions`)
            .then(setHistory)
            .catch((e) => setError(e.message));
        }}
      >
        개정 이력 보기
      </button>
      {error && <p role="alert">{error}</p>}
      {history && (
        <div>
          {!history.length && (
            <p>
              아직 개정 이력이 없습니다. 현재 내용은 첫 변경 시 함께 보존됩니다.
            </p>
          )}
          {history.map((revision) => (
            <details key={revision.revision}>
              <summary>
                개정 {revision.revision} · {workflowDate(revision.created_at)}
              </summary>
              <h3>{revision.snapshot.title}</h3>
              <p className="cw-body">{plainBody(revision.snapshot.body)}</p>
              <p>
                분류 {revision.snapshot.category || "미분류"} · 첨부{" "}
                {revision.snapshot.attachments?.length || 0}개
              </p>
            </details>
          ))}
        </div>
      )}
    </article>
  );
}
// Read helper uses the same scoped transport as the workspace, supplied by the hook.
async function stateGet(
  state: ReturnType<typeof useWorkflowData>,
  path: string,
) {
  return state.read(path);
}
function SupportAssignment({
  item,
  operators,
  state,
}: {
  item: any;
  operators: any[];
  state: ReturnType<typeof useWorkflowData>;
}) {
  const [assignee, setAssignee] = useState(item.assigned_to || ""),
    [due, setDue] = useState(localDate(item.due_at));
  return (
    <article>
      <h3>{item.subject}</h3>
      <p>
        {workflowLabels[item.status]} · 접수 {workflowDate(item.created_at)}
      </p>
      <label>
        배정 담당자
        <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
          <option value="">미배정</option>
          {item.assigned_to &&
            !operators.some((op) => op.id === item.assigned_to) && (
              <option value={item.assigned_to}>
                기존 담당자 · 현재 권한 확인 필요
              </option>
            )}
          {operators.map((op) => (
            <option key={op.id} value={op.id}>
              {op.name || "운영자"}
            </option>
          ))}
        </select>
      </label>
      <label>
        처리 기한
        <input
          type="datetime-local"
          value={due}
          onChange={(e) => setDue(e.target.value)}
        />
      </label>
      <button
        type="button"
        onClick={() =>
          void state.write(`/manage/support/${item.id}`, {
            version: item.version,
            assignedTo: assignee || null,
            dueAt: iso(due),
          })
        }
      >
        담당·기한 저장
      </button>
    </article>
  );
}
