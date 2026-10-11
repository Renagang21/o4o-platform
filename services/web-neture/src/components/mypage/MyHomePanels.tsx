import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/apiClient";
import { listOperatedCommunities } from "../../lib/api/communityOperator";
import type { HomeEntryData, EntryStore } from "../../lib/home-entry";

/** A request belongs to one account/resource. Late replies cannot replace newer data. */
export function useMyHomeResource<T>(
  resourceKey: string,
  load: () => Promise<T>,
) {
  const [result, setResult] = useState<{
    key: string;
    data?: T;
    error?: boolean;
  }>({ key: "" });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setResult({ key: resourceKey });
    load()
      .then((data) => {
        if (alive) setResult({ key: resourceKey, data });
      })
      .catch(() => {
        if (alive) setResult({ key: resourceKey, error: true });
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
  error?: boolean;
  reload: () => void;
}) {
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
export function MyHomeUnread({ accountId }: { accountId: string }) {
  const result = useMyHomeResource(accountId, async () => {
    const res = await api.get("/notifications/unread-count");
    if (typeof res.data?.data?.count !== "number")
      throw new Error("Invalid count");
    return res.data.data.count as number;
  });
  return (
    <div className="mt-2 text-sm text-slate-600">
      {result.data === undefined ? (
        <ResourceNotice error={result.error} reload={result.reload} />
      ) : (
        <Link to="/mypage" className="text-blue-700 underline">
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
export function MyHomeNotifications({ accountId }: { accountId: string }) {
  const result = useMyHomeResource(accountId, async () => {
    const [list, count] = await Promise.all([
      api.get("/notifications", { params: { page: 1, limit: 5 } }),
      api.get("/notifications/unread-count"),
    ]);
    if (
      !Array.isArray(list.data?.data?.notifications) ||
      typeof count.data?.data?.count !== "number"
    )
      throw new Error("Invalid notifications");
    return {
      items: list.data.data.notifications as Notice[],
      unread: count.data.data.count as number,
    };
  });
  return (
    <section className={BOX} aria-labelledby="my-home-notifications">
      <h2 id="my-home-notifications" className="text-lg font-semibold">
        알림{" "}
        {result.data && (
          <span className="text-sm text-slate-500">
            읽지 않음 {result.data.unread}건
          </span>
        )}
      </h2>
      {!result.data ? (
        <ResourceNotice error={result.error} reload={result.reload} />
      ) : result.data.items.length === 0 ? (
        <p className="text-sm text-slate-500">도착한 알림이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {result.data.items.map((item) => (
            <li key={item.id} className="py-3">
              <p className="text-sm font-medium">
                {!item.isRead && (
                  <span aria-label="읽지 않음" className="mr-2 text-blue-600">
                    ●
                  </span>
                )}
                {item.title}
              </p>
              {item.message && (
                <p className="mt-1 text-sm text-slate-600">{item.message}</p>
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
      <p className="mt-3 text-xs text-slate-500">
        최근 알림 5건입니다. 각 서비스의 알림에서 상세 내용과 읽음 상태를 관리할
        수 있습니다.
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
}: {
  accountId: string;
  communityKey: string;
  name: string;
}) {
  const result = useMyHomeResource(`${accountId}:${communityKey}`, async () => {
    const res = await api.get(
      `/communities/${encodeURIComponent(communityKey)}/forum/posts`,
      { params: { author: "me", page: 1, limit: 5 } },
    );
    if (!Array.isArray(res.data?.data) || typeof res.data?.total !== "number")
      throw new Error("Invalid own posts");
    return {
      posts: res.data.data as OwnPost[],
      total: res.data.total as number,
    };
  });
  const root = `/communities/${encodeURIComponent(communityKey)}/forum`;
  return (
    <section className={BOX}>
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
              아직 작성한 글이 없습니다.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {result.data.posts.map((post) => (
                <li key={post.id} className="py-3">
                  <Link
                    className="text-sm text-blue-700 underline"
                    to={`${root}/post/${encodeURIComponent(post.slug || post.id)}`}
                  >
                    {post.title}
                  </Link>
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
        </>
      )}
    </section>
  );
}
function CommunityOperations({ accountId }: { accountId: string }) {
  const result = useMyHomeResource(accountId, listOperatedCommunities);
  if (result.error) return <ResourceNotice error reload={result.reload} />;
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
}: {
  accountId: string;
  data: HomeEntryData;
}) {
  const communities = (data.communities ?? []).filter((c) => c.canParticipate);
  return (
    <div className="space-y-4">
      <CommunityOperations accountId={accountId} />
      <p className="text-sm text-slate-600">
        이용할 수 있는 커뮤니티의 작성 글을 모았습니다. 댓글과 게시판 관리는
        해당 커뮤니티에서 이어갈 수 있습니다.
      </p>
      {communities.length === 0 ? (
        <p className={BOX}>
          현재 참여할 수 있는 커뮤니티가 없습니다. 참여 서비스에서 이용 상태를
          확인해 주세요.
        </p>
      ) : (
        communities.map((c) => (
          <CommunityPosts
            key={c.communityKey}
            accountId={accountId}
            communityKey={c.communityKey}
            name={c.name}
          />
        ))
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
function StoreMetrics({
  accountId,
  store,
}: {
  accountId: string;
  store: EntryStore;
}) {
  const result = useMyHomeResource(
    `${accountId}:${store.organizationId}`,
    async () => {
      const res = await api.get("/kpa/pharmacy/analytics/marketing", {
        headers: { "X-Store-Organization-Id": store.organizationId },
      });
      const data = res.data?.data as Analytics;
      if (
        !data ||
        !["totalScans", "todayScans", "weeklyScans", "activeQrCount"].every(
          (key) => typeof data[key as keyof Analytics] === "number",
        ) ||
        !Array.isArray(data.dailyScans)
      )
        throw new Error("Invalid analytics");
      return data;
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
        </>
      )}
    </section>
  );
}
export function MyHomeManagement({
  accountId,
  data,
}: {
  accountId: string;
  data: HomeEntryData;
}) {
  // Only an existing scoped analytics endpoint is consumed. No cross-store aggregation.
  const stores = data.stores.filter((s) => s.serviceKey === "kpa-society");
  const [selected, setSelected] = useState("");
  const store = stores.find((s) => s.organizationId === selected) ?? stores[0];
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
        통계를 볼 매장
        <select
          aria-label="통계를 볼 매장"
          className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-3"
          value={store.organizationId}
          onChange={(e) => setSelected(e.target.value)}
        >
          {stores.map((s) => (
            <option key={s.organizationId} value={s.organizationId}>
              {s.name || "내 매장"}
            </option>
          ))}
        </select>
      </label>
      <StoreMetrics accountId={accountId} store={store} />
      <Link
        className="inline-block text-sm text-blue-700 underline"
        to="/mypage/services"
      >
        내 매장 업무 이어가기
      </Link>
    </div>
  );
}
