import { ServiceHomeHero, ServiceHomePromotion } from "@o4o/shared-space-ui";
import { api } from "../../lib/apiClient";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts";
import {
  homeApi,
  newsSourceName,
  itemHref,
  SECTION_NAMES,
  SECTION_PATHS,
  type CommunityHome,
  type HomeItem,
  type EditorialKind,
} from "./communityHomeApi";

export function PreviewItems({
  items,
  section,
  member,
  pinned = false,
}: Readonly<{
  items: HomeItem[];
  section: EditorialKind | "forum";
  member: boolean;
  pinned?: boolean;
}>) {
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => (
        <li key={item.id} className="py-3">
          <div className="flex items-start gap-2">
            {pinned && (
              <span className="shrink-0 rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-800">
                상시 노출
              </span>
            )}
            <a
              href={itemHref(item, section, member)}
              {...(section === "news"
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="min-w-0 break-words font-medium text-slate-900 hover:text-emerald-700"
            >
              {item.title}
              {section === "news" ? " ↗" : ""}
            </a>
            {section === "news" &&
              item.newsRecommendation?.recommended === true && (
                <span className="shrink-0 rounded bg-sky-50 px-2 py-1 text-xs text-sky-800">
                  AI 추천
                </span>
              )}
          </div>
          {(item.summary || item.excerpt) && (
            <p className="mt-1 line-clamp-2 break-words text-sm text-slate-600">
              {item.summary || item.excerpt}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            {section === "news" && `${newsSourceName(item.linkUrl)} · `}
            {section !== "news" && item.boardName && `${item.boardName} · `}
            {new Date(item.createdAt).toLocaleDateString("ko-KR")}
          </p>
        </li>
      ))}
    </ul>
  );
}
function HomeSection({
  section,
  data,
}: Readonly<{
  section: EditorialKind | "forum";
  data: CommunityHome;
}>) {
  const preview = data[section];
  return (
    <section
      aria-label={SECTION_NAMES[section]}
      className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900">
          {SECTION_NAMES[section]}
        </h2>
        <Link
          to={
            section === "forum" && !data.member
              ? "/communities/community/public"
              : SECTION_PATHS[section]
          }
          className="min-h-11 content-center text-sm text-emerald-700"
        >
          {SECTION_NAMES[section]} 바로가기 →
        </Link>
      </header>
      <PreviewItems
        items={preview.pinned}
        section={section}
        member={data.member}
        pinned
      />
      {!!preview.recent.length && (
        <>
          <h3 className="mt-3 text-xs font-semibold text-slate-500">
            최근 항목
          </h3>
          <PreviewItems
            items={preview.recent}
            section={section}
            member={data.member}
          />
        </>
      )}
      {!preview.pinned.length && !preview.recent.length && (
        <p className="py-5 text-sm text-slate-500">
          현재 열람 가능한 항목이 없습니다.
        </p>
      )}
      {section === "news" && (
        <a
          href="https://www.kpanews.co.kr/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block min-h-11 content-center text-sm text-emerald-700"
        >
          약사공론 바로가기 ↗
        </a>
      )}
    </section>
  );
}
export default function CommunityHostHomePage() {
  const { user } = useAuth();
  const [data, setData] = useState<CommunityHome | null>(null),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null);
    setError(false);
    homeApi
      .home()
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [user?.id, retry]);
  return (
    <main>
      <h1 className="sr-only">커뮤니티</h1>
      <ServiceHomeHero surface="community" client={api} heading="h2" />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:py-8">
        {!data && !error && (
          <output className="block">커뮤니티 소식을 불러오고 있습니다…</output>
        )}
        {error && (
          <div role="alert" className="rounded-xl border bg-white p-5">
            소식을 불러오지 못했습니다.{" "}
            <button
              type="button"
              onClick={() => setRetry((n) => n + 1)}
              className="min-h-11 text-emerald-700"
            >
              다시 시도
            </button>
          </div>
        )}
        {data && (
          <>
            <div className="grid items-start gap-6 md:grid-cols-2">
              <HomeSection section="notice" data={data} />
              <HomeSection section="news" data={data} />
            </div>
            <section aria-label="O4O 개선·업데이트" className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <h2 className="text-xl font-bold">O4O 개선·업데이트</h2>
              <p className="mt-2 text-slate-700">업데이트 소식을 확인하고 오류·불편과 기능 개선 의견을 남겨 주세요.</p>
              <Link className="mt-3 inline-block min-h-11 content-center font-semibold text-emerald-800 underline" to="/improvements">업데이트 확인·개선 요청 →</Link>
            </section>
            <HomeSection section="forum" data={data} />
            <HomeSection section="content" data={data} />
            <HomeSection section="resource" data={data} />
            <aside aria-label="커뮤니티 안내·광고" className="space-y-4">
              <ServiceHomePromotion surface="community" client={api} />
            </aside>
            {!data.member && (
              <aside className="rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
                공개 항목을 둘러볼 수 있습니다. 회원 전용 자료와 글쓰기는{" "}
                <Link
                  to="/communities/community/forum"
                  className="font-medium text-emerald-700 underline"
                >
                  로그인·이용 자격 확인
                </Link>{" "}
                후 이용해 주세요.
              </aside>
            )}
          </>
        )}
      </div>
    </main>
  );
}
