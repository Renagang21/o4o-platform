import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  MyPageLayout,
  MyPageAuthRequired,
  MyPageLoadingState,
} from "@o4o/account-ui";
import { MY_HOME_SOURCES, MyHomeButton } from "@o4o/auth-react";
import { useAuth } from "../../contexts";
import { useLoginModal } from "../../contexts/LoginModalContext";
import { api } from "../../lib/apiClient";
import { useHomeEntry, buildHomeEntryModel } from "../../lib/home-entry";
import { CURRENT_HOST_PROFILE } from "../../lib/hostProfile";
import HomeEntryPanel from "../../components/home/HomeEntryPanel";
import { getNetureMyPageNavItems } from "./navItems";
import {
  MyHomeActivity,
  MyHomeManagement,
  MyHomeNotifications,
  ResourceNotice,
} from "../../components/mypage/MyHomePanels";

type View = "overview" | "services" | "activity" | "management";
const TITLES: Record<View, string> = {
  overview: "모아보기",
  services: "참여 서비스",
  activity: "커뮤니티 활동",
  management: "경영 현황",
};
function MyHomeContent({ view }: { view: View }) {
  const { user } = useAuth();
  const { search } = useLocation();
  const entry = useHomeEntry(!!user, user?.id);
  const requestedSource = new URLSearchParams(search).get("from") ?? "";
  let sourceKey = requestedSource;
  if (!Object.prototype.hasOwnProperty.call(MY_HOME_SOURCES, sourceKey)) {
    try {
      const previous = JSON.parse(
        sessionStorage.getItem("o4o_my_home_source") ?? "null",
      );
      sourceKey = previous?.accountId === user?.id ? previous.sourceKey : "";
    } catch {
      sourceKey = "";
    }
  }
  const source = Object.prototype.hasOwnProperty.call(
    MY_HOME_SOURCES,
    sourceKey,
  )
    ? MY_HOME_SOURCES[sourceKey]
    : undefined;
  useEffect(() => {
    if (!source || !user) return;
    try {
      sessionStorage.setItem(
        "o4o_my_home_source",
        JSON.stringify({ accountId: user.id, sourceKey }),
      );
    } catch {
      /* Optional return context. */
    }
  }, [source, sourceKey, user?.id]);

  if (!user) return null;
  const model = entry.data && buildHomeEntryModel(user, entry.data);
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-slate-600">
          {user.name}님의 서비스와 활동을 한곳에서 확인하세요.
        </p>
        {source && (
          <a className="text-sm text-blue-700 underline" href={source.origin}>
            {source.label}로 돌아가기
          </a>
        )}
      </div>
      {view === "overview" ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                to: "/mypage/services",
                title: "참여 서비스",
                value: model
                  ? `${model.myServices.length}개 서비스 · 이용 상태 확인`
                  : "이용 상태 확인",
              },
              {
                to: "/mypage/activity",
                title: "커뮤니티 활동",
                value: "내가 작성한 글 모아보기",
              },
              {
                to: "/mypage/management",
                title: "경영 현황",
                value: entry.data
                  ? `${new Set(entry.data.stores.map((store) => store.organizationId)).size}개 매장 · 방문 통계`
                  : "내 매장 방문 통계",
              },
            ].map((card) => (
              <Link
                key={card.to}
                to={card.to}
                className="rounded-2xl border border-slate-200 bg-white p-5 no-underline hover:border-blue-400"
              >
                <h2 className="font-semibold text-slate-900">{card.title}</h2>
                <p className="mt-2 text-sm text-slate-600">{card.value}</p>
              </Link>
            ))}
          </div>
          {entry.error && <ResourceNotice error reload={entry.reload} />}
          <MyHomeNotifications accountId={user.id} />
          <div className="flex flex-wrap gap-4 text-sm">
            <Link to="/mypage/profile" className="text-blue-700 underline">
              프로필 수정
            </Link>
            <Link to="/mypage/settings" className="text-blue-700 underline">
              계정 설정
            </Link>
          </div>
        </div>
      ) : view === "services" ? (
        <HomeEntryPanel
          user={user}
          data={entry.data}
          loading={entry.loading}
          error={entry.error}
          onReload={entry.reload}
        />
      ) : !entry.data ? (
        <ResourceNotice error={!!entry.error} reload={entry.reload} />
      ) : view === "activity" ? (
        <MyHomeActivity accountId={user.id} data={entry.data} />
      ) : (
        <MyHomeManagement accountId={user.id} data={entry.data} />
      )}
    </>
  );
}
export default function MyPageHub({ view = "overview" }: { view?: View }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { openLoginModal } = useLoginModal();
  const location = useLocation();
  return (
    <MyPageLayout
      title="My Home"
      subtitle={TITLES[view]}
      breadcrumb={[{ label: "홈", href: "/" }, { label: "My Home" }]}
      width="wide"
      navItems={getNetureMyPageNavItems(user?.roles)}
    >
      {isLoading ? (
        <MyPageLoadingState message="My Home을 불러오는 중…" />
      ) : !isAuthenticated || !user ? (
        <MyPageAuthRequired
          description="My Home을 이용하려면 로그인해 주세요."
          onAction={() => openLoginModal(location.pathname + location.search)}
        />
      ) : CURRENT_HOST_PROFILE !== "main" ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="mb-4">
            모든 서비스의 My Home은 대표 홈에서 함께 이용합니다.
          </p>
          <MyHomeButton accountId={user?.id}
            api={api}
            isAuthenticated
            className="text-blue-700 underline"
          />
        </section>
      ) : (
        <MyHomeContent key={user.id} view={view} />
      )}
    </MyPageLayout>
  );
}
