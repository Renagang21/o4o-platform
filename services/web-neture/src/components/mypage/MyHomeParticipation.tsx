import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, API_BASE_URL } from "../../lib/apiClient";
import {
  resolveServiceEntryUrl,
  type HomeEntryData,
} from "../../lib/home-entry";
import { HOST_ORIGIN } from "../../lib/hostProfile";
import { ResourceNotice, useMyHomeResource } from "./MyHomePanels";

const BOX = "rounded-2xl border border-slate-200 bg-white p-5";
const LINK = "text-sm text-blue-700 underline";
const STUDY_STATUS: Record<string, string> = {
  pending: "승인 대기",
  approved: "승인됨",
  in_progress: "학습 중",
  completed: "수료",
  rejected: "반려",
  cancelled: "취소",
  expired: "만료",
};
const TRIAL_STATUS: Record<string, string> = {
  draft: "준비 중",
  submitted: "심사 중",
  recruiting: "모집 중",
  development: "진행 중",
  outcome_confirming: "결과 확인 중",
  fulfilled: "이행 완료",
  closed: "종료",
};
const FUNDING_STATUS: Record<string, string> = {
  pending: "처리 대기",
  choice_pending: "선택 대기",
  choice_completed: "선택 완료",
  offline_review: "운영 확인 중",
  offline_settled: "펀딩 처리 완료",
};
type Enrollment = {
  id: string;
  courseId: string;
  title: string;
  status: string;
  progress?: number;
};
type Enrollments =
  | { items: Enrollment[]; total: number; totalPages: number }
  | { denied: true };
type Participation = {
  id: string;
  trialId: string;
  title: string;
  status: string;
  processing: string;
};
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const textValue = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() ? value : fallback;
const statusLabel = (labels: Record<string, string>, status: unknown) =>
  typeof status === "string" &&
  Object.prototype.hasOwnProperty.call(labels, status)
    ? labels[status]
    : "상태 확인 필요";

async function loadEnrollments(
  page: number,
  limit: number,
): Promise<Enrollments> {
  try {
    // The LMS server fixes the lecture scope and current user. Never send serviceKey or userId.
    const { data } = await api.get("/lms/enrollments/me", {
      params: { page, limit },
    });
    if (
      data?.success !== true ||
      !Array.isArray(data.data) ||
      !Number.isInteger(data.pagination?.total) ||
      data.pagination.total < 0 ||
      !Number.isInteger(data.pagination?.totalPages) ||
      data.pagination.totalPages < 0
    )
      throw new Error("Invalid enrollment response");
    const items = data.data.map((item: unknown): Enrollment => {
      if (
        !record(item) ||
        typeof item.id !== "string" ||
        typeof item.courseId !== "string"
      )
        throw new Error("Invalid enrollment");
      const progress = item.progressPercentage ?? item.progress;
      return {
        id: item.id,
        courseId: item.courseId,
        title: textValue(
          record(item.course) ? item.course.title : undefined,
          "강의 정보 확인 필요",
        ),
        status: statusLabel(STUDY_STATUS, item.status),
        progress:
          typeof progress === "number" &&
          Number.isFinite(progress) &&
          progress >= 0 &&
          progress <= 100
            ? progress
            : undefined,
      };
    });
    return {
      items,
      total: data.pagination.total,
      totalPages: data.pagination.totalPages,
    };
  } catch (error) {
    if ((error as { response?: { status?: number } })?.response?.status === 403)
      return { denied: true };
    throw error;
  }
}
async function loadParticipations(): Promise<Participation[]> {
  const response = await api.get(
    `${API_BASE_URL}/api/market-trial/my-participations`,
  );
  const data: unknown = response.data?.data;
  if (response.data?.success !== true || !Array.isArray(data))
    throw new Error("Invalid participation response");
  // Retain only display fields, rather than participant identities or settlement amounts.
  return data.map((item: unknown) => {
    if (
      !record(item) ||
      typeof item.id !== "string" ||
      typeof item.trialId !== "string"
    )
      throw new Error("Invalid participation");
    const trial = record(item.trial) ? item.trial : undefined;
    return {
      id: item.id,
      trialId: item.trialId,
      title: textValue(trial?.title, "펀딩 정보 확인 필요"),
      status: statusLabel(TRIAL_STATUS, trial?.status),
      processing: statusLabel(FUNDING_STATUS, item.settlementStatus),
    };
  });
}

/** Study uses the existing one-use handoff, including the original learner destination. */
function useStudyEntry(accountId: string) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const requestState = useRef({ generation: 0, pending: false, accountId });
  const state = requestState.current;
  state.accountId = accountId;
  useEffect(() => {
    const reset = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      state.generation++;
      state.pending = false;
      setBusy(false);
    };
    window.addEventListener("pageshow", reset);
    return () => {
      state.generation++;
      state.pending = false;
      window.removeEventListener("pageshow", reset);
    };
  }, [accountId, state]);
  const open = async (path: string) => {
    if (state.pending) return;
    state.pending = true;
    const request = ++state.generation;
    setBusy(true);
    setError(false);
    try {
      const href = await resolveServiceEntryUrl("lecture", path);
      if (request !== state.generation || state.accountId !== accountId) return;
      const target = new URL(href);
      if (
        target.origin !== "https://study.neture.co.kr" ||
        target.pathname !== "/handoff" ||
        target.username ||
        target.password ||
        target.hash ||
        !target.searchParams.get("token") ||
        target.searchParams.get("returnTo") !== path
      )
        throw new Error("Invalid Study destination");
      window.location.assign(target.href);
    } catch {
      if (request !== state.generation || state.accountId !== accountId) return;
      state.pending = false;
      setBusy(false);
      setError(true);
    }
  };
  return { busy, error, open };
}
function Pager({
  page,
  pages,
  change,
}: {
  page: number;
  pages: number;
  change: (page: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-2 text-sm">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => change(page - 1)}
        className="rounded border px-3 py-2 disabled:opacity-40"
      >
        이전
      </button>
      <span aria-live="polite">
        {page} / {pages} 페이지
      </span>
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => change(page + 1)}
        className="rounded border px-3 py-2 disabled:opacity-40"
      >
        다음
      </button>
    </div>
  );
}
function StudyHistory({
  accountId,
  compact,
}: {
  accountId: string;
  compact: boolean;
}) {
  const [page, setPage] = useState(1);
  const result = useMyHomeResource(
    `${accountId}:study:${page}:${compact}`,
    () => loadEnrollments(page, compact ? 3 : 10),
  );
  const move = useStudyEntry(accountId);
  return (
    <>
      <p className="mt-1 text-xs text-slate-500">
        본인 수강 이력 · 최근 신청 순. 학습은 Study에서 이어갑니다.
      </p>
      {!result.data ? (
        <ResourceNotice error={result.error} reload={result.reload} />
      ) : "denied" in result.data ? (
        <div role="alert" className="mt-3 text-sm text-amber-900">
          Study 이용 권한을 확인해 주세요.{" "}
          <button className="underline" onClick={result.reload}>
            다시 확인
          </button>
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm text-slate-600">
            전체 {result.data.total}건{compact ? " · 최근 3건까지 표시" : ""}
          </p>
          {result.data.items.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              {result.data.total === 0
                ? "수강 이력이 없습니다."
                : "이 페이지에는 수강 이력이 없습니다. 이전 페이지를 확인해 주세요."}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {result.data.items.map((item) => (
                <li key={item.id} className="py-3">
                  <p className="break-words font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {item.status} ·{" "}
                    {item.progress === undefined
                      ? "진도 정보 없음"
                      : `진도 ${item.progress}%`}
                  </p>
                  <button
                    type="button"
                    disabled={move.busy}
                    className={`${LINK} mt-2 disabled:opacity-50`}
                    onClick={() =>
                      move.open(`/courses/${encodeURIComponent(item.courseId)}`)
                    }
                    aria-label={`${item.title} 강의 보기`}
                  >
                    강의 보기
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!compact && (
            <Pager
              page={page}
              pages={result.data.totalPages}
              change={setPage}
            />
          )}
        </>
      )}
      {move.error && (
        <p role="alert" className="mt-3 text-sm text-amber-900">
          Study로 이동하지 못했습니다. 이용 권한을 확인하고 다시 시도해 주세요.
        </p>
      )}
      <button
        type="button"
        disabled={move.busy}
        className={`${LINK} mt-4 disabled:opacity-50`}
        onClick={() => move.open("/my/enrollments")}
      >
        {move.busy ? "이동 중…" : "Study 내 수강 목록으로 이동"}
      </button>
    </>
  );
}
function FundingHistory({
  accountId,
  compact,
}: {
  accountId: string;
  compact: boolean;
}) {
  const [page, setPage] = useState(1);
  const result = useMyHomeResource(`${accountId}:funding`, loadParticipations);
  const limit = compact ? 3 : 10;
  const pages = Math.max(1, Math.ceil((result.data?.length ?? 0) / limit));
  const current = Math.min(page, pages);
  return (
    <section className={BOX} aria-labelledby="my-home-funding-heading">
      <h2 id="my-home-funding-heading" className="text-lg font-semibold">
        Funding 참여 현황
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        본인 참여 이력 · 최근 참여 순. 펀딩 처리 상태는 운영자의 확인
        기록입니다.
      </p>
      {!result.data ? (
        <ResourceNotice error={result.error} reload={result.reload} />
      ) : (
        <>
          <p className="mt-3 text-sm text-slate-600">
            전체 {result.data.length}건{compact ? " · 최근 3건까지 표시" : ""}
          </p>
          {result.data.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              참여한 펀딩이 없습니다.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {result.data
                .slice((current - 1) * limit, current * limit)
                .map((item) => (
                  <li key={item.id} className="py-3">
                    <p className="break-words font-medium">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.status} · {item.processing}
                    </p>
                    <a
                      className={`${LINK} mt-2 inline-block`}
                      href={`${HOST_ORIGIN.funding}/market-trial/${encodeURIComponent(item.trialId)}`}
                      aria-label={`${item.title} 펀딩 보기`}
                    >
                      펀딩 보기
                    </a>
                  </li>
                ))}
            </ul>
          )}
          {!compact && <Pager page={current} pages={pages} change={setPage} />}
        </>
      )}
      <a
        className={`${LINK} mt-4 inline-block`}
        href={`${HOST_ORIGIN.funding}/market-trial/my`}
      >
        Funding 내 참여 목록으로 이동
      </a>
      <p className="mt-1 text-xs text-slate-500">
        Funding에서 로그인 확인이 필요할 수 있습니다.
      </p>
    </section>
  );
}
export function MyHomeParticipation({
  accountId,
  data,
  compact = false,
}: {
  accountId: string;
  data: HomeEntryData | null;
  compact?: boolean;
}) {
  const study = data?.services.find((service) => service.key === "lecture");
  return (
    <div className="space-y-4">
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section className={BOX} aria-labelledby="my-home-study-heading">
          <h2 id="my-home-study-heading" className="text-lg font-semibold">
            Study 학습 현황
          </h2>
          {!data ? (
            <p className="mt-3 text-sm text-slate-600">
              참여 서비스 정보가 확인되면 수강 이력을 불러옵니다.
            </p>
          ) : study?.membership?.status === "active" ? (
            <StudyHistory
              key={`${accountId}:${compact}`}
              accountId={accountId}
              compact={compact}
            />
          ) : (
            <>
              <p className="mt-3 text-sm text-slate-600">
                Study의 가입·승인 상태를 확인해 주세요. 활성 회원은 본인 수강
                이력을 볼 수 있습니다.
              </p>
              <Link
                className={`${LINK} mt-3 inline-block`}
                to="/mypage/services"
              >
                참여 서비스에서 이용 상태 확인
              </Link>
            </>
          )}
        </section>
        <FundingHistory
          key={accountId}
          accountId={accountId}
          compact={compact}
        />
      </div>
      {compact && (
        <Link className={LINK} to="/mypage/services">
          학습·펀딩 참여 이력 더 보기 →
        </Link>
      )}
    </div>
  );
}
