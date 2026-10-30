import { AiRequestInput } from '@o4o/ui';
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useStoreAiPlacement } from "./StoreAiPlacement";
import type { StoreMenuSectionItem } from "@o4o/store-ui-core";
import { useAuth } from "../../contexts/AuthContext";
import { useUnifiedStore } from "../../contexts/StoreContext";
import { askStoreAi, storeAiError, type StoreAiTask } from "../../api/storeAi";
import {
  STORE_WORKSPACE_AREAS,
  type StoreWorkspaceArea,
} from "../../config/storeWorkspace";
import { isUnifiedServiceKey } from "../../lib/serviceContext";

interface Turn {
  question: string;
  answer: string;
  page: string;
}
interface Props {
  area: StoreWorkspaceArea | null;
  basePath: string;
  items: StoreMenuSectionItem[];
}

/** One optional query channel across the store workspace. Domain editors remain the execution surface. */
export function StoreAiAssistant(props: Readonly<Props>) {
  const { user, isAuthenticated } = useAuth();
  const { organizationId, effectiveServiceKey, status } = useUnifiedStore();
  if (!isAuthenticated || !user?.id || !organizationId || status !== "ready")
    return null;
  // Service-free store owners may use the existing general O4O query; this grants no service membership.
  const scopedService = props.basePath.match(/^\/work\/([^/]+)\/store$/)?.[1];
  const serviceId = isUnifiedServiceKey(scopedService)
    ? scopedService
    : (effectiveServiceKey ?? "neture");
  return (
    <AssistantSession
      key={`${user.id}:${organizationId}:${serviceId}`}
      {...props}
      serviceId={serviceId}
    />
  );
}

function AssistantSession({
  area,
  serviceId,
}: Readonly<Props & { serviceId: string }>) {
  const placement = useStoreAiPlacement();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [task, setTask] = useState<StoreAiTask>("question");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState<number>();
  const [copyStatus, setCopyStatus] = useState("");
  const lock = useRef(false),
    mounted = useRef(true),
    input = useRef(question);
  input.current = question;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const page =
    placement?.label ??
    STORE_WORKSPACE_AREAS.find((item) => item.key === area)?.label ??
    "매장 설정";

  const submit = async () => {
    const submitted = question.trim();
    if (lock.current || !submitted || submitted.length > 2000) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setCopyStatus("");
    const inputAtSubmit = question;
    try {
      const result = await askStoreAi({
        question: submitted,
        serviceId,
        task,
        contextData: {
          pageTitle: `내 매장 · ${page}`,
          serviceInfo: {
            purpose:
              "매장 업무를 한 단계씩 돕는다. 필요한 정보가 없으면 핵심 질문 하나만 하고, 충분하면 지금 끝낼 수 있는 작은 결과를 먼저 제시한다. 확인되지 않은 수치·상품 사실·완료 상태를 만들지 않는다. 소비자 주문·결제는 지원하지 않는다. 저장·게시·기기 적용은 사용자가 기존 화면에서 확인한다.",
            previousTurns: turns
              .slice(-3)
              .map((turn) => ({ ...turn, answer: turn.answer.slice(0, 2000) })),
          },
        },
      });
      if (!mounted.current) return;
      setTurns((previous) =>
        [
          ...previous,
          { question: submitted, answer: result.answer!, page },
        ].slice(-6),
      );
      setRemaining(result.remainingQueries);
      setOpen(true);
      if (input.current === inputAtSubmit) setQuestion("");
    } catch (cause) {
      if (mounted.current) setError(storeAiError(cause));
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(turns[turns.length - 1].answer);
      if (mounted.current)
        setCopyStatus(
          "답변을 복사했습니다. 사용할 편집기에 붙여넣어 확인하세요.",
        );
    } catch {
      if (mounted.current)
        setCopyStatus("복사하지 못했습니다. 답변을 선택해 복사해 주세요.");
    }
  };

  const inDialog = !!placement?.target?.closest('[role="dialog"], dialog');
  const content = (
    <section
      className="relative mb-3"
      aria-label="내 매장 AI"
      onKeyDown={(event) => {
        if (open && event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="flex flex-wrap items-start gap-2"
      >
        <label className="sr-only" htmlFor={`${id}-question`}>
          지금 하고 싶은 일 또는 이어서 답할 내용
        </label>
        <AiRequestInput
          id={`${id}-question`}
          value={question}
          maxLength={2000}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="AI에게 요청하기"
          busy={busy}
          submitLabel={busy ? "답변 준비 중…" : error ? "다시 요청" : "보내기"}
        />
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={id}
          aria-label={`내 매장 AI · ${page} · 대화 ${open ? "닫기" : "보기"}`}
          className="min-h-11 shrink-0 rounded-lg px-2 text-sm text-teal-800"
        >
          {open ? "닫기" : "대화"}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {open && (
        <div
          id={id}
          role="region"
          aria-label="AI 대화와 옵션"
          className={`${inDialog ? "mt-2 max-h-[40vh]" : "absolute right-0 top-full z-40 mt-2 max-h-[65vh] w-full sm:max-w-lg"} overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-lg`}
        >
          <p className="mb-3 text-xs text-slate-500">
            직접 입력한 내용과 최근 대화만 전달합니다. 저장·게시·기기 적용은
            기존 작업에서 확인하세요.
          </p>
          {turns.length > 0 && (
            <div
              role="log"
              aria-label="매장 AI 대화"
              aria-live="polite"
              className="space-y-4 rounded-lg bg-slate-50 p-3 text-sm"
            >
              {turns.map((turn, index) => (
                <article key={index} className="space-y-2">
                  <p className="whitespace-pre-wrap break-words font-semibold text-slate-800">
                    {turn.question}
                  </p>
                  <p className="text-xs text-slate-500">{turn.page}에서 요청</p>
                  <p className="whitespace-pre-wrap break-words text-slate-700">
                    {turn.answer}
                  </p>
                </article>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setTurns([]);
                setQuestion("");
                setError("");
                setCopyStatus("");
              }}
              className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm disabled:opacity-50"
            >
              새 작업
            </button>
            {turns.length > 0 && (
              <button
                type="button"
                onClick={() => void copy()}
                className="min-h-11 px-3 text-sm text-teal-800 underline"
              >
                답변 복사
              </button>
            )}
          </div>
          {copyStatus && (
            <p role="status" className="mt-2 text-sm text-slate-600">
              {copyStatus}
            </p>
          )}
          {remaining !== undefined && (
            <p className="mt-2 text-xs text-slate-500">
              이번 응답 기준 남은 질문 {remaining}회
            </p>
          )}
          <details className="mt-3 text-sm">
            <summary className="min-h-11 cursor-pointer content-center">
              추가 옵션
            </summary>
            <label htmlFor={`${id}-task`} className="mr-2">
              도움 방식
            </label>
            <select
              id={`${id}-task`}
              value={task}
              onChange={(event) => setTask(event.target.value as StoreAiTask)}
              disabled={busy}
              className="min-h-11 rounded-lg border border-slate-300 px-3"
            >
              <option value="question">함께 정리</option>
              <option value="summary">입력 내용 요약</option>
              <option value="draft">검토할 문구 초안</option>
            </select>
          </details>
        </div>
      )}
    </section>
  );
  if (placement)
    return placement.target ? createPortal(content, placement.target) : null;
  return content;
}
