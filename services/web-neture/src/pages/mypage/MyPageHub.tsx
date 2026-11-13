import { MyHomeWorkspaces } from '../../components/mypage/MyHomeWorkspaces';
import { MyHomeStoreMembers } from '../../components/mypage/MyHomeStoreMembers';
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  MyPageLayout,
  MyPageAuthRequired,
  MyPageLoadingState,
} from "@o4o/account-ui";
import { MY_HOME_SOURCES, MyHomeButton, ServiceReturnLink } from "@o4o/auth-react";
import { isMyHomeSource, safeServiceReturnPath } from "@o4o/auth-utils";
import { useAuth } from "../../contexts";
import { useLoginModal } from "../../contexts/LoginModalContext";
import { api } from "../../lib/apiClient";
import { useHomeEntry, buildHomeEntryModel, homeEntryStoreOrganizationIds, type HomeEntryStoreRef } from "../../lib/home-entry";
import { CURRENT_HOST_PROFILE } from "../../lib/hostProfile";
import HomeEntryPanel from "../../components/home/HomeEntryPanel";
import { MyHomeParticipation } from "../../components/mypage/MyHomeParticipation";
import { getNetureMyPageNavItems } from "./navItems";
import { knownHasStore, rememberHasStore } from "../../lib/my-home-store-presence";
import { MyHomeRegistrationStatus } from "../../components/mypage/MyHomeRegistrationStatus";
import {
  MyHomeActivity,
  MyHomeManagement,
  MyHomeNotifications,
  MyHomeStoreParticipation,
  ResourceNotice,
} from "../../components/mypage/MyHomePanels";

type View = "overview" | "services" | "activity" | "management";
const TITLES: Record<View, string> = {
  overview: "모아보기",
  services: "참여 서비스",
  activity: "커뮤니티 활동",
  management: "경영 현황",
};
/** 운영 업무는 admin.neture.co.kr/operations 한 곳에서 한다. My Home 에는 운영 역할이 있는 사람에게 진입 링크만 둔다(2026-11-10 사용자 확정).
 *  판정식은 서버 운영 권한 판정(member-identity-guards)과 같다. 실제 업무 권한은 업무 운영 화면과 서버가 다시 확인한다. */
export const OPERATIONS_URL = "https://admin.neture.co.kr/operations";
export function hasOperatorRole(roles: readonly string[] | undefined): boolean {
  return (roles ?? []).some(role => role.startsWith("platform:") || /(^|:|_)(admin|operator)$/.test(role));
}
/** 모아보기 「내 현황 요약」 — 홈 진입 데이터의 실제 상태로 만든다. 모르면 「확인 중」 · 실패면 그렇게 말한다(0 으로 위장하지 않는다). */
export function overviewSummaries(
  model: { myServices: unknown[]; statusItems?: { status: string }[] } | null,
  data: { communities?: { canParticipate: boolean }[] } | null,
  failed: boolean,
): { to: string; title: string; value: string }[] {
  const unknown = failed ? "불러오지 못했습니다" : "확인 중…";
  const statusItems = model?.statusItems ?? [];
  const pending = statusItems.filter(item => item.status === "pending").length;
  const rejected = statusItems.filter(item => item.status === "rejected").length;
  const services = !model ? unknown
    : [`이용 중 ${model.myServices.length}개`, pending ? `승인 대기 ${pending}개` : "", rejected ? `반려 ${rejected}개` : ""].filter(Boolean).join(" · ");
  const communities = data ? (data.communities ?? []).filter(c => c.canParticipate).length : null;
  const items = [
    { to: "/mypage/services", title: "참여 서비스", value: services },
    { to: "/mypage/activity", title: "커뮤니티 활동", value: communities === null ? unknown : communities ? `참여 커뮤니티 ${communities}곳 · 내가 쓴 글 보기` : "참여 중인 커뮤니티 없음" },
  ];
  const stores = data ? homeEntryStoreOrganizationIds(data as Parameters<typeof homeEntryStoreOrganizationIds>[0]).length : 0;
  if (stores) items.push({ to: "/mypage/management", title: "경영 현황", value: `매장 ${stores}곳 · 사업 요약과 방문 통계` });
  return items;
}

function MyHomeContent({ view, onHasStore }: { view: View; onHasStore: (hasStore: boolean) => void }) {
  const { user } = useAuth();
  const { search } = useLocation();
  const entry = useHomeEntry(!!user, user?.id);
  const requestedSource = new URLSearchParams(search).get("from") ?? "";
  let sourceKey = requestedSource;
  let returnPath = safeServiceReturnPath(new URLSearchParams(search).get("returnPath")) ?? "/";
  if (!Object.prototype.hasOwnProperty.call(MY_HOME_SOURCES, sourceKey)) {
    try {
      const previous = JSON.parse(
        sessionStorage.getItem("o4o_my_home_source") ?? "null",
      );
      sourceKey = previous?.accountId === user?.id ? previous.sourceKey : "";
      returnPath = previous?.accountId === user?.id ? safeServiceReturnPath(previous.returnPath) ?? "/" : "/";
    } catch {
      sourceKey = "";
    }
  }
  const source = isMyHomeSource(sourceKey) ? MY_HOME_SOURCES[sourceKey] : undefined;
  useEffect(() => {
    if (!source || !user) return;
    try {
      sessionStorage.setItem(
        "o4o_my_home_source",
        JSON.stringify({ accountId: user.id, sourceKey, returnPath }),
      );
    } catch {
      /* Optional return context. */
    }
  }, [source, sourceKey, returnPath, user]);

  const hasStore = !!entry.data && homeEntryStoreOrganizationIds(entry.data).length > 0;
  const storeKnown = !!entry.data;
  useEffect(() => {
    if (!storeKnown) return;
    rememberHasStore(user?.id, hasStore);
    onHasStore(hasStore);
  }, [storeKnown, hasStore, user?.id, onHasStore]);
  if (!user) return null;
  const model = entry.data && buildHomeEntryModel(user, entry.data);
  const renderStoreWorkspace = (store: HomeEntryStoreRef) => <HomeEntryPanel
    key={`${user.id}:${store.organizationId}`}
    user={user}
    data={entry.data}
    loading={entry.loading}
    error={entry.error}
    onReload={entry.reload}
    workspaceOnly
    storeOrganizationId={store.organizationId}
  />;
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-slate-600">
          {user.name}님의 개인 공간입니다. 필요한 업무로 이동하고 내 소식을 확인하시기 바랍니다.
        </p>
        {source && (
          <ServiceReturnLink sourceKey={sourceKey} returnPath={returnPath} api={api} accountId={user.id} />
        )}
      </div>
      {hasOperatorRole(user.roles) && (
        <a href={OPERATIONS_URL} className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-indigo-900 no-underline hover:border-indigo-400">
          <span>
            <span className="block font-semibold">업무 운영으로 가기</span>
            <span className="block text-sm text-indigo-800">맡은 서비스의 운영 업무는 업무 운영 화면에서 처리합니다.</span>
          </span>
          <span aria-hidden>→</span>
        </a>
      )}
      {view === "overview" ? (
        <div id="my-home-overview" className="space-y-5">
          <MyHomeRegistrationStatus accountId={user.id} />
          <MyHomeWorkspaces
            user={user}
            data={entry.data}
            loading={entry.loading}
            error={entry.error}
            onReload={entry.reload}
          />
          <div className="grid min-w-0 items-start gap-5 lg:grid-cols-2">
            <MyHomeNotifications accountId={user.id} previewLimit={3} />
            <MyHomeStoreMembers key={user.id} accountId={user.id} onChanged={entry.reload} compact />
          </div>
          {/* 2026-11-13 My Home 개선 4: 왼쪽 메뉴와 같은 링크 목록 대신 실제 상태 요약을 보인다. 계정 설정 · 개인 메일은 메뉴로 간다. */}
          <nav aria-label="내 현황 요약" className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">내 현황 요약</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {overviewSummaries(model ?? null, entry.data ?? null, !!entry.error).map(item => <Link key={item.to} to={item.to} className="rounded-lg border border-slate-100 p-3 no-underline hover:border-blue-400">
                <span className="font-medium text-blue-700">{item.title} →</span>
                <span className="mt-1 block text-sm text-slate-700">{item.value}</span>
              </Link>)}
            </div>
          </nav>
        </div>
      ) : view === "services" ? (
        <div className="space-y-6">
          <HomeEntryPanel
            user={user}
            data={entry.data}
            loading={entry.loading}
            error={entry.error}
            onReload={entry.reload}
          />
          <MyHomeParticipation accountId={user.id} data={entry.data} />
          {entry.data && <MyHomeStoreParticipation accountId={user.id} data={entry.data} renderStoreWorkspace={renderStoreWorkspace} />}
        </div>
      ) : !entry.data ? (
        <ResourceNotice error={!!entry.error} reload={entry.reload} />
      ) : view === "activity" ? (
        <MyHomeActivity accountId={user.id} data={entry.data} />
      ) : (
        <MyHomeManagement accountId={user.id} data={entry.data} renderStoreWorkspace={renderStoreWorkspace} />
      )}
    </>
  );
}
export default function MyPageHub({ view = "overview" }: { view?: View }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { openLoginModal } = useLoginModal();
  const location = useLocation();
  // 「경영 현황」 메뉴는 매장이 없다고 확인된 계정에서만 숨긴다(모르면 보인다).
  const [hasStore, setHasStore] = useState<boolean | undefined>(() => knownHasStore(user?.id));
  useEffect(() => { setHasStore(knownHasStore(user?.id)); }, [user?.id]);
  return (
    <MyPageLayout
      title="My Home"
      subtitle={TITLES[view]}
      breadcrumb={[{ label: "홈", href: "/" }, { label: "My Home" }]}
      width="wide"
      navItems={getNetureMyPageNavItems(user?.roles, hasStore)}
    >
      {isLoading ? (
        <MyPageLoadingState message="My Home을 불러오는 중…" />
      ) : !isAuthenticated || !user ? (
        <MyPageAuthRequired
          description="My Home을 이용하려면 로그인해 주시기 바랍니다."
          onAction={() => openLoginModal(location.pathname + location.search)}
        />
      ) : CURRENT_HOST_PROFILE !== "main" ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="mb-4">
            모든 서비스의 My Home은 대표 홈에서 함께 이용합니다.
          </p>
          <MyHomeButton
            accountId={user?.id}
            api={api}
            isAuthenticated
            className="text-blue-700 underline"
          />
        </section>
      ) : (
        <MyHomeContent key={user.id} view={view} onHasStore={setHasStore} />
      )}
    </MyPageLayout>
  );
}
