import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/apiClient";
import { listOperatedCommunities } from "../../lib/api/communityOperator";
import type { HomeEntryData, EntryStore } from "../../lib/home-entry";
import { PolicyAcceptanceGate, type PendingPolicyAcceptanceLike } from "@o4o/shared-space-ui";
import { loadPolicy } from "../../pages/legal/PolicyDocumentPage";
import { useAuth } from "../../contexts/AuthContext";

type ResourceError = boolean | PendingPolicyAcceptanceLike[];
function policyError(error: unknown): ResourceError {
  const response = (error as { response?: { status?: number; data?: { code?: string; pendingPolicyAcceptances?: unknown } } })?.response;
  const pending = response?.data?.pendingPolicyAcceptances;
  if (response?.status !== 428 || response.data?.code !== "TERMS_ACCEPTANCE_REQUIRED" || !Array.isArray(pending) || pending.length === 0) return true;
  return pending.every(p => p && typeof p.serviceKey === "string" && /^[a-z0-9-]+$/.test(p.serviceKey)
    && p.documentType === "terms" && typeof p.policyDocumentId === "string"
    && /^[0-9a-f-]{36}$/i.test(p.policyDocumentId) && Number.isInteger(p.version) && p.version > 0 && typeof p.title === "string") ? pending : true;
}

/** A cross-service 428 belongs to this resource, not the account-wide Neture gate. */
function ResourcePolicyNotice({ pending, reload }: { pending: PendingPolicyAcceptanceLike[]; reload: () => void }) {
  const { logout } = useAuth();
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const accept = async () => {
    try {
      for (const p of pending) {
        if (!alive.current) return { success: false };
        const res = await api.post("/auth/policy-acceptances", { serviceKey: p.serviceKey, policyDocumentId: p.policyDocumentId, version: p.version });
        if (res.data?.success !== true) throw new Error("Policy acceptance failed");
      }
      if (alive.current) reload();
      return { success: true };
    } catch {
      if (alive.current) reload();
      return { success: false, error: "약관 상태를 다시 확인해 주세요." };
    }
  };
  return <div>
    <PolicyAcceptanceGate inline pending={pending} loadPolicy={loadPolicy} onAccept={accept} onLogout={logout}
      serviceName="이용하려는 서비스" leadText="이 항목을 조회하려면 해당 서비스의 약관을 확인해 주세요. 다른 항목은 계속 이용할 수 있습니다.">
      {null}
    </PolicyAcceptanceGate>
  </div>;
}

/** A request belongs to one account/resource. Late replies cannot replace newer data. */
export function useMyHomeResource<T>(
  resourceKey: string,
  load: () => Promise<T>,
) {
  const [result, setResult] = useState<{
    key: string;
    data?: T;
    error?: ResourceError;
  }>({ key: "" });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setResult({ key: resourceKey });
    load()
      .then((data) => {
        if (alive) setResult({ key: resourceKey, data });
      })
      .catch((error) => {
        if (alive) setResult({ key: resourceKey, error: policyError(error) });
      });
    return () => {
      alive = false;
    };
    // The key describes every dependency of load. The function is intentionally not an effect dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceKey, tick]);
  return {
    data: result.key === resourceKey ? result.data : undefined,
    error: result.key === resourceKey && result.error,
    reload: () => setTick((v) => v + 1),
  };
}
export function ResourceNotice({
  error,
  reload,
}: {
  error?: ResourceError;
  reload: () => void;
}) {
  if (Array.isArray(error)) return <ResourcePolicyNotice pending={error} reload={reload} />;
  return error ? (
    <div
      role="alert"
      className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900"
    >
      정보를 불러오지 못했습니다.{" "}
      <button type="button" className="underline" onClick={reload}>
        다시 불러오기
      </button>
    </div>
  ) : (
    <p role="status" className="text-sm text-slate-500">
      정보를 불러오는 중…
    </p>
  );
}
const BOX = "rounded-2xl border border-slate-200 bg-white p-5";
const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const isDate = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value));
function RecordPages({
  page,
  total,
  limit,
  label,
  onChange,
}: {
  page: number;
  total: number;
  limit: number;
  label: string;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <nav
      aria-label={`${label} 페이지`}
      className="mt-4 flex flex-wrap items-center gap-3 text-sm"
    >
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="rounded-lg border px-3 py-2 disabled:opacity-40"
      >
        이전
      </button>
      <span aria-live="polite">
        {page} / {pages} 페이지 · {total}건
      </span>
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
        className="rounded-lg border px-3 py-2 disabled:opacity-40"
      >
        다음
      </button>
    </nav>
  );
}
export function MyHomeUnread({ accountId }: { accountId: string }) {
  const result = useMyHomeResource(accountId, async () => {
    const res = await api.get("/notifications/unread-count");
    if (res.data?.success !== true || !isCount(res.data?.data?.count))
      throw new Error("Invalid count");
    return res.data.data.count as number;
  });
  return (
    <div className="mt-2 text-sm text-slate-600">
      {result.data === undefined ? (
        <ResourceNotice error={result.error} reload={result.reload} />
      ) : (
        <Link
          to="/mypage"
          className="text-blue-700 underline"
        >
          읽지 않은 알림 {result.data}건
        </Link>
      )}
    </div>
  );
}
type Notice = {
  id: string;
  title: string;
  message?: string;
  isRead: boolean;
  createdAt: string;
};
export function MyHomeNotifications({ accountId, previewLimit = 5 }: { accountId: string; previewLimit?: 3 | 5 }) {
  return <NotificationRecords key={`${accountId}:${previewLimit}`} accountId={accountId} previewLimit={previewLimit} />;
}
function NotificationRecords({ accountId, previewLimit }: { accountId: string; previewLimit: 3 | 5 }) {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = expanded ? 10 : previewLimit;
  const result = useMyHomeResource(
    `${accountId}:${page}:${limit}:${filter}`,
    async () => {
      const [list, count] = await Promise.all([
        api.get("/notifications", {
          params: {
            page,
            limit,
            ...(filter === "all" ? {} : { isRead: filter === "read" }),
          },
        }),
        api.get("/notifications/unread-count"),
      ]);
      const data = list.data?.data;
      if (
        list.data?.success !== true ||
        count.data?.success !== true ||
        !Array.isArray(data?.notifications) ||
        !isCount(data.total) ||
        data.page !== page ||
        data.limit !== limit ||
        data.notifications.length > limit ||
        data.notifications.length > data.total ||
        data.totalPages !== Math.ceil(data.total / limit) ||
        !isCount(count.data?.data?.count) ||
        !data.notifications.every(
          (item: Notice) =>
            item &&
            typeof item.id === "string" &&
            item.id.length > 0 &&
            typeof item.title === "string" &&
            typeof item.isRead === "boolean" &&
            isDate(item.createdAt) &&
            (item.message == null || typeof item.message === "string"),
        )
      )
        throw new Error("Invalid notifications");
      return {
        items: data.notifications.map((item: Notice) => ({
          id: item.id,
          title: item.title,
          message: item.message,
          isRead: item.isRead,
          createdAt: item.createdAt,
        })) as Notice[],
        total: data.total as number,
        unread: count.data.data.count as number,
      };
    },
  );
  return (
    <section
      id="my-home-notifications"
      className={BOX}
      aria-labelledby="my-home-notifications-heading"
    >
      <h2 id="my-home-notifications-heading" className="text-lg font-semibold">
        알림{" "}
        {result.data && (
          <span className="text-sm text-slate-500">
            읽지 않음 {result.data.unread}건
          </span>
        )}
      </h2>
      {expanded && (
        <label className="my-3 block text-sm">
          알림 상태
          <select
            aria-label="알림 상태"
            className="ml-2 rounded-lg border p-2"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">전체 알림</option>
            <option value="unread">읽지 않은 알림</option>
            <option value="read">읽은 알림</option>
          </select>
        </label>
      )}
      {!result.data ? (
        <ResourceNotice error={result.error} reload={result.reload} />
      ) : result.data.items.length === 0 ? (
        <p className="text-sm text-slate-500">
          {result.data.total > 0
            ? "이 페이지에 알림이 없습니다."
            : filter === "unread"
              ? "읽지 않은 알림이 없습니다."
              : filter === "read"
                ? "읽은 알림이 없습니다."
                : "도착한 알림이 없습니다."}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {result.data.items.map((item) => (
            <li key={item.id} className="py-3">
              <p className="break-words text-sm font-medium">
                {!item.isRead && (
                  <span aria-label="읽지 않음" className="mr-2 text-blue-600">
                    ●
                  </span>
                )}
                {item.title}
              </p>
              {item.message && (
                <p className="mt-1 break-words text-sm text-slate-600">
                  {item.message}
                </p>
              )}
              <time
                className="text-xs text-slate-500"
                dateTime={item.createdAt}
              >
                {new Date(item.createdAt).toLocaleDateString("ko-KR")}
              </time>
            </li>
          ))}
        </ul>
      )}
      {expanded && result.data && (
        <RecordPages
          label="알림"
          page={page}
          total={result.data.total}
          limit={limit}
          onChange={setPage}
        />
      )}
      <button
        type="button"
        className="mt-3 text-sm text-blue-700 underline"
        onClick={() => {
          setExpanded(!expanded);
          setFilter("all");
          setPage(1);
        }}
      >
        {expanded ? "최근 알림만 보기" : "알림 전체보기"}
      </button>
      <p className="mt-3 text-xs text-slate-500">
        {expanded ? "본인 알림을 10건씩 표시합니다." : `최근 알림 ${previewLimit}건입니다.`}{" "}
        각 서비스의 알림에서 상세 내용과 읽음 상태를 관리할 수 있습니다.
      </p>
    </section>
  );
}
type OwnPost = {
  id: string;
  slug?: string;
  title: string;
  status: string;
  createdAt: string;
};
function CommunityPosts({
  accountId,
  communityKey,
  name,
  compact = false,
}: {
  accountId: string;
  communityKey: string;
  name: string;
  compact?: boolean;
}) {
  const [page, setPage] = useState(1);
  const limit = compact ? 2 : 10;
  const result = useMyHomeResource(
    `${accountId}:${communityKey}:${compact}:${page}`,
    async () => {
      const res = await api.get(
        `/communities/${encodeURIComponent(communityKey)}/forum/posts`,
        { params: { author: "me", page, limit } },
      );
      if (
        res.data?.success !== true ||
        !Array.isArray(res.data?.data) ||
        !isCount(res.data?.total) ||
        res.data.data.length > limit ||
        !res.data.data.every(
          (post: OwnPost) =>
            post &&
            typeof post.id === "string" &&
            post.id.length > 0 &&
            typeof post.title === "string" &&
            typeof post.status === "string" &&
            isDate(post.createdAt) &&
            (post.slug == null || typeof post.slug === "string"),
        )
      )
        throw new Error("Invalid own posts");
      return {
        posts: res.data.data as OwnPost[],
        total: res.data.total as number,
      };
    },
  );
  const root = `/communities/${encodeURIComponent(communityKey)}/forum`;
  return (
    <section className={BOX} aria-label={`${name} 내 글`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{name}</h2>
        <Link
          to={`${root}/my-posts`}
          className="text-sm text-blue-700 underline"
        >
          내 글 전체보기
        </Link>
      </div>
      {!result.data ? (
        <ResourceNotice error={result.error} reload={result.reload} />
      ) : (
        <>
          <p className="mt-2 text-sm text-slate-500">
            내가 작성한 글 {result.data.total}건
          </p>
          {result.data.posts.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              {result.data.total > 0
                ? "이 페이지에 작성 글이 없습니다."
                : "아직 작성한 글이 없습니다."}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {result.data.posts.map((post) => (
                <li key={post.id} className="py-3">
                  <Link
                    className="break-words text-sm text-blue-700 underline"
                    to={`${root}/post/${encodeURIComponent(post.slug || post.id)}`}
                  >
                    {post.title}
                  </Link>
                  <span className="ml-2 text-xs text-slate-500">
                    {(
                      {
                        publish: "공개",
                        published: "공개",
                        draft: "임시 저장",
                        pending: "승인 대기",
                        rejected: "반려",
                        archived: "보관",
                      } as Record<string, string>
                    )[post.status] ?? "상태 확인"}
                  </span>
                  <time
                    dateTime={post.createdAt}
                    className="ml-3 text-xs text-slate-500"
                  >
                    {new Date(post.createdAt).toLocaleDateString("ko-KR")}
                  </time>
                </li>
              ))}
            </ul>
          )}
          {!compact && (
            <RecordPages
              label={`${name} 내 글`}
              page={page}
              total={result.data.total}
              limit={limit}
              onChange={setPage}
            />
          )}
        </>
      )}
    </section>
  );
}
function CommunityOperations({ accountId }: { accountId: string }) {
  const result = useMyHomeResource(accountId, listOperatedCommunities);
  if (result.error) return <ResourceNotice error={result.error} reload={result.reload} />;
  if (!result.data?.length) return null;
  return (
    <Link
      to="/mypage/communities"
      className="inline-block text-sm text-blue-700 underline"
    >
      운영 중인 커뮤니티 가입 심사 ({result.data.length}개)
    </Link>
  );
}
export function MyHomeActivity({
  accountId,
  data,
  compact = false,
}: {
  accountId: string;
  data: HomeEntryData;
  compact?: boolean;
}) {
  const communities = (data.communities ?? []).filter((c) => c.canParticipate);
  return (
    <div className="space-y-4">
      {!compact && <CommunityOperations accountId={accountId} />}
      <p className="text-sm text-slate-600">
        이용할 수 있는 커뮤니티의 작성 글을 모았습니다. 댓글과 게시판 관리는
        해당 커뮤니티에서 이어갈 수 있습니다.
        {compact && " 최대 3개 커뮤니티의 최근 글 2건씩 표시합니다."}
      </p>
      {communities.length === 0 ? (
        <p className={BOX}>
          현재 참여할 수 있는 커뮤니티가 없습니다. 참여 서비스에서 이용 상태를
          확인해 주세요.
        </p>
      ) : (
        (compact ? communities.slice(0, 3) : communities).map((c) => (
          <CommunityPosts
            key={`${accountId}:${c.communityKey}:${compact}`}
            accountId={accountId}
            communityKey={c.communityKey}
            name={c.name}
            compact={compact}
          />
        ))
      )}
      {compact && (
        <Link
          to="/mypage/activity"
          className="inline-block text-sm text-blue-700 underline"
        >
          커뮤니티 활동 더 보기 →
        </Link>
      )}
    </div>
  );
}
type Analytics = {
  totalScans: number;
  todayScans: number;
  weeklyScans: number;
  activeQrCount: number;
  dailyScans: { date: string; count: number }[];
};
const BUSINESS_STATUS: Record<string, string> = {
  pending: "승인 대기", active: "이용 중", rejected: "반려", suspended: "이용 정지", terminated: "탈퇴",
};
type StoreBusiness = { key: string; name: string; status: string };
export function MyHomeStoreBusinesses({ accountId, organizationId, compact = false }: {
  accountId: string; organizationId: string; compact?: boolean;
}) {
  return <StoreBusinessRecords key={`${accountId}:${organizationId}:${compact}`} accountId={accountId} organizationId={organizationId} compact={compact} />;
}
function StoreBusinessRecords({ accountId, organizationId, compact }: { accountId: string; organizationId: string; compact: boolean }) {
  const [page, setPage] = useState(1);
  const result = useMyHomeResource<StoreBusiness[] | { denied: true }>(`${accountId}:${organizationId}`, async () => {
    try {
      const response = await api.get("/neture/pharmacy/semi-franchises", { headers: { "X-Store-Organization-Id": organizationId } });
      const rows = response.data?.data;
      if (response.data?.success !== true || !Array.isArray(rows) || !rows.every(row =>
        row && typeof row.key === "string" && !!row.key.trim() && typeof row.name === "string" && !!row.name.trim() &&
        (row.membershipStatus === null || typeof row.membershipStatus === "string" && !!row.membershipStatus.trim())) ||
        new Set(rows.map(row => row.key)).size !== rows.length) throw new Error("Invalid business memberships");
      // The API includes an available catalogue. Only explicit store memberships belong in My Home.
      return rows.filter(row => row.membershipStatus !== null).map(row => ({
        key: row.key, name: row.name,
        status: Object.prototype.hasOwnProperty.call(BUSINESS_STATUS, row.membershipStatus) ? BUSINESS_STATUS[row.membershipStatus] : "상태 확인 필요",
      }));
    } catch (error) {
      if ((error as { response?: { status?: number } })?.response?.status === 403) return { denied: true };
      throw error;
    }
  });
  const items = Array.isArray(result.data) ? result.data : undefined;
  const visible = items?.slice(compact ? 0 : (page - 1) * 10, compact ? 3 : page * 10);
  return <section className={BOX} aria-label="내 매장 협력사업 참여 현황">
    <h2 className="text-lg font-semibold">약국 협력사업 참여 현황</h2>
    <p className="mt-2 text-sm text-slate-600">운영 중인 약국 협력사업 중 선택한 매장의 가입 기록입니다. 신청·승인·사업 업무는 내 매장에서 이어갑니다.</p>
    {!result.data ? <ResourceNotice error={result.error} reload={result.reload} /> : !items ?
      <p className="mt-3 text-sm text-amber-800">선택한 매장의 사업 참여 정보를 조회할 수 없습니다. 내 매장에서 이용 권한을 확인해 주세요.</p> :
      items.length === 0 ? <p className="mt-3 text-sm text-slate-500">운영 중인 약국 협력사업에 표시할 참여 기록이 없습니다.</p> : <>
        <ul className="mt-3 divide-y divide-slate-100">{visible!.map(item => <li key={item.key} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span className="break-words font-medium">{item.name}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{item.status}</span></li>)}</ul>
        {compact ? <p className="mt-2 text-xs text-slate-500">참여 기록 {items.length}건 중 최대 3건을 표시합니다.</p> : <RecordPages page={page} total={items.length} limit={10} label="협력사업 참여" onChange={setPage} />}
      </>}
    {compact && <Link to="/mypage/services" className="mt-3 inline-block text-sm text-blue-700 underline">협력사업 참여 현황 더 보기 →</Link>}
  </section>;
}
function VisitTrend({ days }: { days: Analytics["dailyScans"] }) {
  const max = Math.max(1, ...days.map((day) => day.count));
  return (
    <section className="mt-5" aria-label="일별 QR 방문 추이">
      <h3 className="font-medium">일별 QR 방문 추이</h3>
      <p className="mt-1 text-xs text-slate-500">
        최근 14일 조회 결과입니다. 날짜는 집계 서버 기준이며, 응답에 없는 날짜는
        표시하지 않습니다.
      </p>
      {days.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          이 기간에 제공된 일별 방문 기록이 없습니다.
        </p>
      ) : (
        <ol className="mt-4 space-y-3">
          {days.map((day) => (
            <li
              key={day.date}
              className="grid grid-cols-[5rem_minmax(0,1fr)_3rem] items-center gap-2 text-xs"
            >
              <time dateTime={day.date}>{day.date.slice(5)}</time>
              <div
                aria-hidden="true"
                className="h-4 overflow-hidden rounded bg-slate-100"
              >
                <div
                  className="h-full rounded bg-blue-500"
                  style={{ width: `${(day.count / max) * 100}%` }}
                />
              </div>
              <span className="text-right">{day.count.toLocaleString()}건</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
function StoreMetrics({
  accountId,
  store,
  compact = false,
}: {
  accountId: string;
  store: EntryStore;
  compact?: boolean;
}) {
  const result = useMyHomeResource(
    `${accountId}:${store.organizationId}`,
    async () => {
      const res = await api.get("/kpa/pharmacy/analytics/marketing", {
        headers: { "X-Store-Organization-Id": store.organizationId },
      });
      const data = res.data?.data as Analytics;
      if (
        res.data?.success !== true ||
        !data ||
        !["totalScans", "todayScans", "weeklyScans", "activeQrCount"].every(
          (key) => isCount(data[key as keyof Analytics]),
        ) ||
        !Array.isArray(data.dailyScans) ||
        !data.dailyScans.every(
          (day) =>
            day &&
            typeof day.date === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(day.date) &&
            isDate(day.date) &&
            new Date(day.date).toISOString().slice(0, 10) === day.date &&
            isCount(day.count),
        ) ||
        new Set(data.dailyScans.map((day) => day.date)).size !==
          data.dailyScans.length
      )
        throw new Error("Invalid analytics");
      return {
        totalScans: data.totalScans,
        todayScans: data.todayScans,
        weeklyScans: data.weeklyScans,
        activeQrCount: data.activeQrCount,
        dailyScans: data.dailyScans
          .map((day) => ({ date: day.date, count: day.count }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      };
    },
  );
  return (
    <section className={BOX}>
      <h2 className="text-lg font-semibold">QR 방문 현황</h2>
      <p className="mt-1 text-xs text-slate-500">
        선택한 매장의 QR 방문 기록을 기준으로 집계합니다. 매출 통계는 별도
        연동이 필요합니다.
      </p>
      {!result.data ? (
        <ResourceNotice error={result.error} reload={result.reload} />
      ) : (
        <>
          <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ["오늘 방문", result.data.todayScans],
              ["최근 7일 방문", result.data.weeklyScans],
              ["누적 방문", result.data.totalScans],
              ["사용 중 QR", result.data.activeQrCount],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-4">
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="mt-1 text-2xl font-semibold">
                  {Number(value).toLocaleString()}
                </dd>
              </div>
            ))}
          </dl>
          {!compact && <VisitTrend days={result.data.dailyScans} />}
          {!compact && result.data.dailyScans.length > 0 && (
            <details className="mt-5">
              <summary className="cursor-pointer text-sm">
                최근 14일 일별 방문
              </summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th scope="col" className="text-left">
                        날짜
                      </th>
                      <th scope="col" className="text-right">
                        방문 수
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.dailyScans.map((day) => (
                      <tr key={day.date}>
                        <td className="py-1">{day.date}</td>
                        <td className="text-right">
                          {day.count.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </>
      )}
    </section>
  );
}
export function MyHomeManagement({
  accountId,
  data,
  compact = false,
  renderStoreWorkspace,
}: {
  accountId: string;
  data: HomeEntryData;
  compact?: boolean;
  renderStoreWorkspace?: (store: EntryStore) => ReactNode;
}) {
  return (
    <StoreManagement
      key={accountId}
      accountId={accountId}
      data={data}
      compact={compact}
      renderStoreWorkspace={renderStoreWorkspace}
    />
  );
}
export function MyHomeStoreParticipation({ accountId, data, renderStoreWorkspace }: {
  accountId: string;
  data: HomeEntryData;
  renderStoreWorkspace?: (store: EntryStore) => ReactNode;
}) {
  return <StoreManagement key={accountId} accountId={accountId} data={data} renderStoreWorkspace={renderStoreWorkspace} participationOnly />;
}
function StoreManagement({
  accountId,
  data,
  compact = false,
  renderStoreWorkspace,
  participationOnly = false,
}: {
  accountId: string;
  data: HomeEntryData;
  compact?: boolean;
  renderStoreWorkspace?: (store: EntryStore) => ReactNode;
  participationOnly?: boolean;
}) {
  // Only an existing scoped analytics endpoint is consumed. No cross-store aggregation.
  const stores = data.stores.filter((s) => s.serviceKey === "kpa-society");
  const [selected, setSelected] = useState(() => {
    try {
      const previous = JSON.parse(
        sessionStorage.getItem("o4o_my_home_store") ?? "null",
      );
      return previous?.accountId === accountId &&
        typeof previous.organizationId === "string"
        ? previous.organizationId
        : "";
    } catch {
      return "";
    }
  });
  const store = stores.find((s) => s.organizationId === selected) ?? stores[0];
  if (!store && participationOnly) return <section className={BOX} aria-label="매장 협력사업 참여"><h2 className="text-lg font-semibold">매장 협력사업 참여</h2><p className="mt-2 text-sm text-slate-600">현재 사업 참여 현황을 조회할 수 있는 매장이 없습니다.</p></section>;
  if (!store)
    return (
      <section className={BOX}>
        <h2 className="text-lg font-semibold">경영 현황</h2>
        <p className="mt-2 text-sm text-slate-600">
          현재 조회할 수 있는 매장 통계가 없습니다. 승인된 내 매장이 있으면 참여
          서비스에서 매장 관리를 이용해 주세요.
        </p>
        <Link
          className="mt-3 inline-block text-blue-700 underline"
          to="/mypage/services"
        >
          참여 서비스 보기
        </Link>
      </section>
    );
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium">
        {participationOnly ? "참여 현황을 볼 매장" : "통계를 볼 매장"}
        <select
          aria-label={participationOnly ? "참여 현황을 볼 매장" : "통계를 볼 매장"}
          className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-3"
          value={store.organizationId}
          onChange={(e) => {
            const id = e.target.value;
            if (!stores.some((candidate) => candidate.organizationId === id))
              return;
            setSelected(id);
            try {
              sessionStorage.setItem(
                "o4o_my_home_store",
                JSON.stringify({ accountId, organizationId: id }),
              );
            } catch {
              /* Selection is optional and never grants access. */
            }
          }}
        >
          {stores.map((s) => (
            <option key={s.organizationId} value={s.organizationId}>
              {s.name || "내 매장"}
            </option>
          ))}
        </select>
      </label>
      <MyHomeStoreBusinesses accountId={accountId} organizationId={store.organizationId} compact={!participationOnly} />
      {!participationOnly && <StoreMetrics accountId={accountId} store={store} compact={compact} />}
      {!compact && renderStoreWorkspace?.(store)}
      {!participationOnly && <Link
        className="inline-block text-sm text-blue-700 underline"
        to={compact ? "/mypage/management" : "/mypage/services"}
      >
        {compact ? "매장 방문 통계 더 보기 →" : "내 매장 업무 공간 보기"}
      </Link>}
    </div>
  );
}
