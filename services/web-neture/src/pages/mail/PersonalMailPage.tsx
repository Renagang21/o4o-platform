import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MyPageLayout,
  MyPageAuthRequired,
  MyPageLoadingState,
} from "@o4o/account-ui";
import { MyHomeButton } from "@o4o/auth-react";
import { useAuth } from "../../contexts";
import { useLoginModal } from "../../contexts/LoginModalContext";
import { api } from "../../lib/apiClient";
import { CURRENT_HOST_PROFILE } from "../../lib/hostProfile";
import { getNetureMyPageNavItems } from "../mypage/navItems";
import {
  personalMailApi,
  mailErrorMessage,
  mailActionLabels,
  type MailAccount,
  type MailSender,
  type MailRule,
  type MailJob,
  type MailAction,
  type MailCapabilities,
  type MailMessage,
} from "../../api/personalMail";
import { MailJobReview } from "./MailJobReview";
import { MailAccountConnections } from "./MailAccountConnections";

function MailManager() {
  const ruleControls = useRef<HTMLDivElement>(null);
  const [params] = useSearchParams();
  const [availability, setAvailability] = useState<{
    enabled: boolean;
    gmailConfigured: boolean;
    naverConfigured: boolean;
  } | null>(null);
  const [accounts, setAccounts] = useState<MailAccount[]>([]),
    [accountId, setAccountId] = useState(params.get("accountId") ?? "");
  const [senders, setSenders] = useState<MailSender[]>([]),
    [rules, setRules] = useState<MailRule[]>([]),
    [jobs, setJobs] = useState<MailJob[]>([]);
  const [selected, setSelected] = useState<string[]>([]),
    [page, setPage] = useState(1),
    [action, setAction] = useState<MailAction>("archive");
  const [category, setCategory] = useState("general"),
    [includeImportant, setIncludeImportant] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [job, setJob] = useState<MailJob | null>(null),
    [capabilities, setCapabilities] = useState<MailCapabilities | null>(null);
  const [messages, setMessages] = useState<MailMessage[]>([]),
    [body, setBody] = useState<{
      subject: string;
      text: string;
      notice: string;
    } | null>(null);
  const pendingRequest = useRef<{ key: string; id: string } | null>(null),
    epoch = useRef(0);
  const account = accounts.find((row) => row.id === accountId);
  const refreshAccounts = useCallback(async () => {
    const rows = await personalMailApi.accounts();
    setAccounts(rows);
    setAccountId((current) =>
      rows.some((row) => row.id === current) ? current : (rows[0]?.id ?? ""),
    );
  }, []);
  useEffect(() => {
    let cancelled = false;
    personalMailApi
      .status()
      .then(async (status) => {
        if (cancelled) return;
        setAvailability(status);
        await refreshAccounts();
      })
      .catch((e) => {
        if (!cancelled) setError(mailErrorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, [refreshAccounts]);
  const refresh = useCallback(async () => {
    if (!accountId || !availability?.enabled) return;
    const current = epoch.current;
    const [senderData, ruleData, jobData] = await Promise.all([
      personalMailApi.senders(accountId, page),
      personalMailApi.rules(accountId),
      personalMailApi.jobs(accountId),
    ]);
    if (current !== epoch.current) return;
    setSenders(senderData.senders);
    setRules(ruleData);
    setJobs(jobData);
  }, [accountId, page, availability?.enabled]);
  const invalidateRequests = useCallback(() => {
    epoch.current++;
  }, []);
  useEffect(() => {
    invalidateRequests();
    setSelected([]);
    setMessages([]);
    setBody(null);
    setJob(null);
    setCapabilities(null);
    setError("");
    if (!accountId || !availability?.enabled) return;
    let cancelled = false;
    void refresh().catch((e) => {
      if (!cancelled) setError(mailErrorMessage(e));
    });
    void personalMailApi
      .capabilities(accountId)
      .then((result) => {
        if (!cancelled) setCapabilities(result);
      })
      .catch((e) => {
        if (!cancelled) setError(mailErrorMessage(e));
      });
    const requestedJob = params.get("jobId");
    if (requestedJob)
      void personalMailApi
        .job(accountId, requestedJob)
        .then((result) => {
          if (!cancelled) setJob(result);
        })
        .catch((e) => {
          if (!cancelled) setError(mailErrorMessage(e));
        });
    return () => {
      cancelled = true;
      invalidateRequests();
    };
  }, [accountId, refresh, params, availability?.enabled, invalidateRequests]);
  useEffect(() => {
    if (!accountId || !availability?.enabled) return;
    const current = epoch.current;
    const timer = setInterval(() => {
      void personalMailApi
        .jobs(accountId)
        .then((rows) => {
          if (epoch.current === current) setJobs(rows);
        })
        .catch((e) => {
          if (epoch.current === current) setError(mailErrorMessage(e));
        });
      if (job && ["pending", "running"].includes(job.status))
        void personalMailApi
          .job(accountId, job.id)
          .then((value) => {
            if (epoch.current === current) setJob(value);
          })
          .catch((e) => {
            if (epoch.current === current) setError(mailErrorMessage(e));
          });
    }, 5000);
    return () => clearInterval(timer);
  }, [accountId, job, availability?.enabled]);
  async function perform(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      setError(mailErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function prepare(kind: "cleanup" | "rule") {
    const input = {
      accountId,
      senders: [...selected].sort((a, b) => a.localeCompare(b)),
      action,
      ...(kind === "cleanup" ? { includeImportant } : { category }),
    };
    const key = JSON.stringify({ kind, input });
    if (pendingRequest.current?.key !== key)
      pendingRequest.current = { key, id: crypto.randomUUID() };
    const prepared = await personalMailApi.prepare(kind, {
      ...input,
      requestId: pendingRequest.current.id,
    });
    setJob(await personalMailApi.job(accountId, prepared.id));
    pendingRequest.current = null;
    await refresh();
  }
  async function control(command: "pause" | "resume" | "cancel") {
    if (!job) return;
    setJob(await personalMailApi.control(job, command));
    await refresh();
  }
  const canAction = action === "keep" || !!capabilities?.[action];
  if (!availability)
    return error ? (
      <p role="alert">{error}</p>
    ) : (
      <p role="status">메일 관리 상태를 확인하고 있습니다…</p>
    );
  if (!availability.enabled)
    return (
      <section className="space-y-3 rounded-xl border bg-white p-5">
        <h2 className="font-semibold">개인 메일 관리 준비 중</h2>
        <p>
          아직 새 메일 계정을 연결하거나 정리할 수 없습니다. 기존 연결은 해제할
          수 있습니다.
        </p>
        {error && <p role="alert">{error}</p>}
        {accounts.map((row) => (
          <div key={row.id} className="flex flex-wrap items-center gap-3">
            <span>{row.address}</span>
            <button
              className="rounded border px-4 py-2"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "O4O 연결과 관리 자료를 삭제하고 원래 메일은 유지합니다. 연결을 해제할까요?",
                  )
                )
                  void perform(async () => {
                    await personalMailApi.disconnect(row.id);
                    await refreshAccounts();
                  });
              }}
            >
              계정 연결 해제
            </button>
          </div>
        ))}
      </section>
    );
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        메일은 원래 메일 서비스에 유지됩니다. O4O는 관리에 필요한
        발신처·식별자·처리 현황만 보관하고 본문·첨부를 보관하지 않습니다.
      </p>
      {error && (
        <p
          role="alert"
          className="rounded border border-red-200 p-3 text-red-800"
        >
          {error}
        </p>
      )}
      <MailAccountConnections
        gmailAvailable={availability.gmailConfigured}
        naverAvailable={availability.naverConfigured}
        onChanged={refreshAccounts}
      />
      {!!accounts.length && (
        <section className="space-y-4 rounded-xl border bg-white p-5">
          <label className="block font-medium">
            관리할 메일 계정
            <select
              className="ml-2 max-w-full rounded border p-2"
              value={accountId}
              onChange={(e) => {
                setPage(1);
                setAccountId(e.target.value);
              }}
              disabled={busy}
            >
              {accounts.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.address} ({row.provider})
                </option>
              ))}
            </select>
          </label>
          <p className="text-sm">
            {account?.syncCompletedAt
              ? `최근 수집 완료: ${new Date(account.syncCompletedAt).toLocaleString()}`
              : "수신함 수집을 기다리고 있습니다."}{" "}
            발신처 건수는 수집된 수신함 기준입니다.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded border px-4 py-2"
              disabled={busy}
              onClick={() =>
                void perform(async () => {
                  await personalMailApi.sync(accountId);
                  await refreshAccounts();
                  await refresh();
                })
              }
            >
              수신함 다시 수집
            </button>
            <button
              className="rounded border px-4 py-2"
              disabled={busy}
              onClick={() =>
                void perform(async () => {
                  await refresh();
                  await refreshAccounts();
                })
              }
            >
              현황 새로고침
            </button>
            <button
              className="rounded border border-red-200 px-4 py-2"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "O4O 메일 연결과 수집 자료·규칙·작업을 삭제합니다. 원래 메일은 삭제하지 않습니다. 연결을 해제할까요?",
                  )
                )
                  void perform(async () => {
                    await personalMailApi.disconnect(accountId);
                    setSenders([]);
                    setRules([]);
                    setJobs([]);
                    setJob(null);
                    setMessages([]);
                    setBody(null);
                    await refreshAccounts();
                  });
              }}
            >
              계정 연결 해제
            </button>
          </div>
          <p className="text-sm text-slate-600">
            연결 해제는 진행 중인 메일 한 건의 처리가 끝난 뒤 반영됩니다. 제공자
            계정의 앱 권한·앱 비밀번호는 해당 계정 설정에서도 확인하세요.
          </p>
        </section>
      )}
      {account && (
        <>
          <section
            className="space-y-4 rounded-xl border bg-white p-5"
            aria-label="발신처 관리"
          >
            <h2 className="text-lg font-semibold">발신처별 수신함</h2>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={
                  !!senders.length &&
                  senders.every((row) => selected.includes(row.sender))
                }
                disabled={busy || !senders.length}
                onChange={(e) =>
                  setSelected(
                    e.target.checked ? senders.map((row) => row.sender) : [],
                  )
                }
              />
              현재 페이지 모두 선택
            </label>
            {!senders.length && (
              <p>수집된 발신처가 없습니다. 수집 완료 후 다시 확인해 주세요.</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {senders.map((row) => (
                <div key={row.sender} className="min-w-0 rounded border p-3">
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selected.includes(row.sender)}
                      disabled={busy}
                      onChange={(e) =>
                        setSelected((current) =>
                          e.target.checked
                            ? [...current, row.sender]
                            : current.filter((value) => value !== row.sender),
                        )
                      }
                    />
                    <span className="break-all">{row.sender}</span>
                  </label>
                  <p className="mt-2 text-sm">
                    {row.count}건 · 중요 {row.important}건
                    {row.ruleAction
                      ? ` · ${mailActionLabels[row.ruleAction]}`
                      : " · 미분류"}
                  </p>
                  <button
                    className="mt-2 text-sm text-blue-700 underline"
                    disabled={busy}
                    onClick={() =>
                      void perform(async () => {
                        setBody(null);
                        setMessages(
                          await personalMailApi.messages(accountId, row.sender),
                        );
                      })
                    }
                  >
                    메일 목록 보기
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                className="rounded border p-2"
                disabled={busy || page === 1}
                onClick={() => setPage((value) => value - 1)}
              >
                이전 발신처
              </button>
              <span>{page}페이지</span>
              <button
                className="rounded border p-2"
                disabled={busy || senders.length < 50}
                onClick={() => setPage((value) => value + 1)}
              >
                다음 발신처
              </button>
            </div>
            <div
              ref={ruleControls}
              tabIndex={-1}
              role="group"
              aria-label="선택 발신처 규칙 설정"
              className="flex flex-wrap gap-4"
            >
              {!!selected.length && (
                <p className="w-full break-all text-sm">
                  선택한 발신처: {selected.join(", ")}
                </p>
              )}
              <label>
                처리 방식{" "}
                <select
                  className="rounded border p-2"
                  value={action}
                  disabled={busy}
                  onChange={(e) => setAction(e.target.value as MailAction)}
                >
                  {Object.entries(mailActionLabels).map(([value, label]) => (
                    <option
                      key={value}
                      value={value}
                      disabled={
                        value !== "keep" &&
                        !capabilities?.[value as keyof MailCapabilities]
                      }
                    >
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                규칙 분류{" "}
                <select
                  className="rounded border p-2"
                  value={category}
                  disabled={busy}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {[
                    ["general", "일반"],
                    ["work", "업무"],
                    ["receipt", "영수증"],
                    ["promotion", "홍보"],
                    ["personal", "개인"],
                    ["other", "기타"],
                  ].map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeImportant}
                disabled={busy}
                onChange={(e) => setIncludeImportant(e.target.checked)}
              />
              기존 메일 정리에 중요 메일 포함
            </label>
            <p className="text-sm text-slate-600">
              허용은 향후 자동 정리를 중지합니다. 자동 정리는 수신 자체
              차단·구독 취소와 다르며, 미분류 메일은 자동 삭제하지 않습니다.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                className="rounded border px-4 py-3 disabled:opacity-50"
                disabled={
                  busy || !selected.length || !canAction || action === "keep"
                }
                onClick={() => void perform(() => prepare("cleanup"))}
              >
                기존 메일 정리 검토
              </button>
              <button
                className="rounded border px-4 py-3 disabled:opacity-50"
                disabled={busy || !selected.length || !canAction}
                onClick={() => void perform(() => prepare("rule"))}
              >
                향후 규칙 검토
              </button>
            </div>
          </section>
          {!!messages.length && (
            <section
              aria-label="메일 목록"
              className="space-y-3 rounded-xl border bg-white p-5"
            >
              <h2 className="font-semibold">선택한 발신처의 최근 메일</h2>
              <p className="text-sm">
                본문 보기는 선택한 메일을 일시 조회합니다.
              </p>
              {messages.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b py-2"
                >
                  <span className="break-all">
                    {row.sender} · {new Date(row.receivedAt).toLocaleString()}{" "}
                    {row.important ? "중요" : ""}
                  </span>
                  <button
                    className="text-blue-700 underline"
                    disabled={busy || !capabilities?.body}
                    onClick={() =>
                      void perform(async () =>
                        setBody(await personalMailApi.read(accountId, row.id)),
                      )
                    }
                  >
                    본문 보기
                  </button>
                </div>
              ))}
            </section>
          )}
          {body && (
            <section
              aria-label="메일 본문 미리보기"
              className="rounded-xl border bg-white p-5"
            >
              <h2 className="font-semibold">{body.subject || "선택한 메일"}</h2>
              <p className="my-2 text-sm text-slate-600">{body.notice}</p>
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words font-sans">
                {body.text}
              </pre>
              <button
                className="mt-3 rounded border p-2"
                onClick={() => setBody(null)}
              >
                본문 닫기
              </button>
            </section>
          )}
          {job && (
            <MailJobReview
              job={job}
              busy={busy}
              onConfirm={() =>
                void perform(async () => {
                  setJob(await personalMailApi.confirm(job));
                  await refresh();
                })
              }
              onControl={(command) => void perform(() => control(command))}
            />
          )}
          <section className="space-y-3 rounded-xl border bg-white p-5">
            <h2 className="font-semibold">작업 이력</h2>
            {!jobs.length && <p>아직 요청한 작업이 없습니다.</p>}
            {jobs.map((row) => (
              <button
                className="block w-full rounded border p-3 text-left"
                key={row.id}
                disabled={busy}
                onClick={() =>
                  void perform(async () =>
                    setJob(await personalMailApi.job(accountId, row.id)),
                  )
                }
              >
                {mailActionLabels[row.action]} · {row.total}{" "}
                {row.kind === "rule" ? "발신처" : "메일"} · {row.status}
              </button>
            ))}
          </section>
          <section className="space-y-2 rounded-xl border bg-white p-5">
            <h2 className="font-semibold">발신처 규칙 {rules.length}개</h2>
            {rules.map((row) => (
              <div key={row.id} className="space-y-2 rounded border p-3">
                <p className="break-all">
                  {row.sender} · {mailActionLabels[row.action]} · {row.category}
                  {row.delegated ? " · 외부 AI 연결 승인 규칙" : ""}
                </p>
                <button
                  className="rounded border px-3 py-2"
                  disabled={busy || !availability?.enabled}
                  aria-label={`${row.sender} 규칙 변경`}
                  onClick={() => {
                    setSelected([row.sender]);
                    setAction(row.action);
                    setCategory(row.category);
                    ruleControls.current?.scrollIntoView?.({ block: "center" });
                    ruleControls.current?.focus({ preventScroll: true });
                  }}
                >
                  규칙 변경
                </button>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
export default function PersonalMailPage() {
  const { user, isAuthenticated, isLoading } = useAuth(),
    { openLoginModal } = useLoginModal();
  return (
    <MyPageLayout
      title="개인 메일 관리"
      width="wide"
      navItems={getNetureMyPageNavItems(user?.roles)}
    >
      {isLoading ? (
        <MyPageLoadingState message="계정을 확인하고 있습니다…" />
      ) : !isAuthenticated || !user ? (
        <MyPageAuthRequired
          description="내 메일을 관리하려면 로그인해 주세요."
          onAction={() => openLoginModal("/mypage/mail")}
        />
      ) : CURRENT_HOST_PROFILE !== "main" ? (
        <MyHomeButton accountId={user.id} api={api} isAuthenticated />
      ) : (
        <MailManager key={user.id} />
      )}
    </MyPageLayout>
  );
}
