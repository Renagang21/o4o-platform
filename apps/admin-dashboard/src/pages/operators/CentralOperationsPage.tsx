import './central-operations.css';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Link,Navigate,useNavigate,useParams,useLocation} from 'react-router-dom';
import {useAuth} from '@o4o/auth-context';
import {authClient} from '@o4o/auth-client';
import {CENTRAL_OPERATION_MENUS,OperatorCapability} from '@o4o/types';
import {OperatorAreaShell,DEFAULT_OPERATOR_DOMAIN_IA,type OperatorDomainIAConfig} from '@o4o/operator-ux-core';
import type {OperatorGroupKey,OperatorMenuItem} from '@o4o/ui';
import CentralOperationOverview from './CentralOperationOverview';
import CentralOperationDirectory from './CentralOperationDirectory';
import CentralOperationNotifications from './CentralOperationNotifications';
import {centralOperationAreas} from './central-operation-navigation';
import {renderCentralOperation} from './central-operation-renderers';
const SERVICES = [
  ["neture", "약국·공통 운영"],
  ["supplier", "공급자"],
  ["funding", "펀딩"],
  ["lecture", "강의"],
  ["community", "커뮤니티"],
  ["partner-support", "파트너"],
  ["pharmcoop", "협동조합 연합회"],
] as const;
/** Independent entry: never expose the platform-admin layout to service Operators. */
export default function CentralOperationsPage() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const identityId = String(user?.id ?? "");
  const { serviceKey, userId, area: routeArea, courseId, id } = useParams();
  const location = useLocation();
  const area =
    routeArea ?? (id ? "funding" : courseId ? "courses" : userId ? (location.pathname.includes("/service-members/") ? "service-members" : "members") : undefined);
  const navigate = useNavigate();
  const [grant, setGrant] = useState<{
    userId: string;
    roles: string[];
    menuKeys: string[];
  } | null>(null);
  const roles = grant?.userId === String(user?.id) ? grant.roles : null;
  const sequence = useRef(0);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const seq = ++sequence.current;
    setError("");
    try {
      const response = await authClient.api.get("/operator/central-access");
      if (!Array.isArray(response.data?.data?.roles) || !Array.isArray(response.data?.data?.menuKeys))
        throw new Error("INVALID_RESPONSE");
      if (seq === sequence.current)
        setGrant({ userId: identityId, roles: response.data.data.roles, menuKeys: response.data.data.menuKeys });
    } catch {
      if (seq === sequence.current) {
        setGrant(null);
        setError(
          "Google 로그인과 중앙 관리자의 유효한 업무 위임이 필요합니다.",
        );
      }
    }
  }, [identityId]);
  useEffect(() => {
    if (isAuthenticated) void load();
    return () => {
      sequence.current += 1;
    };
  }, [isAuthenticated, user?.id, load]);
  useEffect(() => {
    const refresh = () => {
      if (isAuthenticated) void load();
    };
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [isAuthenticated, load]);
  if (isLoading) return <p role="status">인증 확인 중…</p>;
  if (!isAuthenticated)
    return <Navigate to="/login" state={{ from: "/operations" }} replace />;
  if (error)
    return (
      <main className="p-6">
        <p role="alert">{error}</p>
        <button onClick={() => void load()}>다시 확인</button>
        <button onClick={logout}>다른 계정으로 로그인</button>
      </main>
    );
  if (!roles) return <p role="status">위임 업무 확인 중…</p>;
  const menuKeys = grant?.userId === identityId ? grant.menuKeys : [];
  const visibleMenus = CENTRAL_OPERATION_MENUS.filter(menu => menuKeys.includes(menu.key) && centralOperationAreas[menu.service]?.includes(menu.area));
  const isPlatform = roles.includes("platform:super_admin");
  const allowed = SERVICES.filter(([key]) =>
    isPlatform || (key === "pharmcoop"
      ? roles.some((role) =>
          ["neture:pharmcoop_admin", "neture:pharmcoop_operator"].includes(
            role,
          ),
        )
      : roles.includes(`${key}:admin`) ||
        roles.includes(`${key}:operator`)),
  ).filter(([key]) => visibleMenus.some(menu => menu.service === key));
  if (serviceKey && !allowed.some(([key]) => key === serviceKey))
    return (
      <main className="p-6">
        <p role="alert">위임되지 않은 업무입니다.</p>
        <Link to="/operations">업무 목록</Link>
      </main>
    );
  if (serviceKey && !centralOperationAreas[serviceKey]?.includes(area ?? ""))
    return (
      <main className="p-6">
        <p role="alert">이 업무 화면을 찾을 수 없습니다.</p>
        <Link to="/operations">업무 목록</Link>
      </main>
    );
  if (serviceKey && !menuKeys.includes(`${serviceKey}.${area ?? ''}`)) return <main className="p-6"><p role="alert">위임되지 않은 업무 메뉴입니다.</p><Link to="/operations">업무 목록</Link></main>;
  const groupKeys = { members: 'users', service: 'content', business: 'products', settings: 'system' } as const;
  const sidebar: Partial<Record<OperatorGroupKey, OperatorMenuItem[]>> = {
    dashboard: [{ label: '운영 홈·알림', path: '/operations', exact: true }],
  };
  for (const menu of visibleMenus) {
    const group = groupKeys[menu.group];
    (sidebar[group] ??= []).push({ label: menu.label, path: `/operations/${menu.service}/${menu.area}`, domain: menu.service });
  }
  const domainIA: OperatorDomainIAConfig = {
    ...DEFAULT_OPERATOR_DOMAIN_IA,
    labels: Object.fromEntries(allowed.map(([key, label]) => [key, { label, emoji: '' }])),
    displayOrder: allowed.map(([key]) => key),
    groupOrder: Object.fromEntries(allowed.map(([key]) => [key, ['users', 'content', 'products', 'system']])),
    topPinnedGroups: ['dashboard'],
    collapsibleDomains: true,
  };
  return (
    <OperatorAreaShell menuItems={sidebar} capabilities={Object.values(OperatorCapability)} domainIAConfig={domainIA} menuLabel="통합 운영 메뉴" header={
      <header className="flex flex-wrap items-center gap-4 border-b bg-white px-4 py-4 md:px-8">
        <h1 className="text-2xl font-bold">O4O 통합 운영</h1>
        <Link to="/operations">위임 업무</Link>
        <CentralOperationNotifications key={user.id} scopeKey={[...roles, ...menuKeys].sort((left,right)=>left.localeCompare(right)).join('|')} />
        {isPlatform && <Link to="/admin">전체 관리자</Link>}
        <button onClick={logout}>로그아웃</button>
      </header>}
    >
      {!serviceKey && <CentralOperationOverview key={user.id} roleKey={[...roles, ...menuKeys].sort((left,right)=>left.localeCompare(right)).join('|')} />}
      {!serviceKey && <CentralOperationNotifications key={`panel:${user.id}`} variant="panel" scopeKey={[...roles, ...menuKeys].sort((left,right)=>left.localeCompare(right)).join('|')} />}
      {serviceKey && <nav aria-label="서비스 운영 업무" className="mb-5 flex flex-wrap gap-2 border-b pb-4">
        {visibleMenus.filter(menu => menu.service === serviceKey).map(menu => <Link key={menu.key} aria-current={area === menu.area ? 'page' : undefined} className={`rounded border px-3 py-2 text-sm ${area === menu.area ? 'bg-blue-700 text-white' : 'bg-white text-slate-700'}`} to={`/operations/${serviceKey}/${menu.area}`}>{menu.label}</Link>)}
      </nav>}
      {serviceKey && area ? (
        <div key={`${identityId}:${serviceKey}:${area}:${courseId ?? id ?? userId ?? ''}`}>
          {renderCentralOperation({service:serviceKey,area,actorId:identityId,roles,menuKeys,courseId,id,userId,search:location.search,navigate})}
        </div>
      ) : (
        <CentralOperationDirectory services={allowed} menus={visibleMenus} />
      )}
    </OperatorAreaShell>
  );
}
