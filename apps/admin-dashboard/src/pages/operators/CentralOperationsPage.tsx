import './central-operations.css';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Link,Navigate,useNavigate,useParams,useLocation} from 'react-router-dom';
import {useAuth} from '@o4o/auth-context';
import {authClient} from '@o4o/auth-client';
import {CENTRAL_OPERATION_MENUS} from '@o4o/types';
import CentralOperationOverview from './CentralOperationOverview';
import CentralOperationDirectory from './CentralOperationDirectory';
import CentralOperationNotifications from './CentralOperationNotifications';
import {centralOperationAreas} from './central-operation-navigation';
import {renderCentralOperation} from './central-operation-renderers';
import CentralOperationLayout from './CentralOperationLayout';
import { CENTRAL_OPERATION_SERVICES as SERVICES, centralMenuGroup, centralGroups } from './central-operation-groups';
/** Each denial needs a different action, so the reason from the server decides the guidance. */
const CENTRAL_ACCESS_DENIAL: Record<string, string> = {
  GOOGLE_SESSION_REQUIRED: "업무 운영은 Google 로그인으로만 이용할 수 있습니다. Google 계정으로 다시 로그인해 주시기 바랍니다.",
  CENTRAL_DELEGATION_REQUIRED: "유효한 업무 위임이 없습니다. 전체 관리자의 업무 운영자 초대를 본인이 수락하면 이용할 수 있습니다.",
  CENTRAL_MENU_NOT_DELEGATED: "업무 운영자로 지정되어 있지만 담당 업무 메뉴가 없습니다. 전체 관리자에게 담당 업무 지정을 요청해 주시기 바랍니다.",
};
const CENTRAL_ACCESS_UNVERIFIED = "업무 위임 상태를 확인하지 못했습니다. 잠시 후 다시 확인해 주시기 바랍니다.";
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
    } catch (failure) {
      if (seq === sequence.current) {
        setGrant(null);
        const code = (failure as { response?: { data?: { code?: string } } }).response?.data?.code;
        setError((code && CENTRAL_ACCESS_DENIAL[code]) || CENTRAL_ACCESS_UNVERIFIED);
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
  const activeMenu = visibleMenus.find(menu => menu.service === serviceKey && menu.area === area);
  const activeGroup = activeMenu && centralGroups(visibleMenus.filter(menu => menu.service === serviceKey)).find(group => group.key === centralMenuGroup(activeMenu));
  return (
    <CentralOperationLayout services={allowed} menus={visibleMenus} header={
      <header className="flex flex-wrap items-center gap-4 border-b bg-white px-4 py-4 md:px-8">
        <h1 className="text-2xl font-bold">O4O 업무 운영</h1>
        <Link to="/operations">위임 업무</Link>
        <CentralOperationNotifications key={user.id} scopeKey={[...roles, ...menuKeys].sort((left,right)=>left.localeCompare(right)).join('|')} />
        {isPlatform && <><Link to="/admin/operations-operators">업무 운영자 지정</Link><Link to="/admin">전체 관리자</Link></>}
        <button onClick={logout}>로그아웃</button>
      </header>}
    >
      {!serviceKey && <CentralOperationOverview key={user.id} roleKey={[...roles, ...menuKeys].sort((left,right)=>left.localeCompare(right)).join('|')} />}
      {!serviceKey && <CentralOperationNotifications key={`panel:${user.id}`} variant="panel" scopeKey={[...roles, ...menuKeys].sort((left,right)=>left.localeCompare(right)).join('|')} />}
      {serviceKey && area && <nav aria-label="현재 위치" className="mb-5 flex flex-wrap items-center gap-2 border-b pb-4 text-sm text-slate-500">
        <Link to="/operations" className="text-blue-700 hover:underline">운영 홈</Link><span aria-hidden>›</span>
        <span>{SERVICES.find(([key]) => key === serviceKey)?.[1]}</span><span aria-hidden>›</span>
        <span>{activeGroup?.label}</span><span aria-hidden>›</span>
        <span aria-current="page" className="font-medium text-slate-800">{activeMenu?.label}</span>
      </nav>}
      {serviceKey && area ? (
        <div key={`${identityId}:${serviceKey}:${area}:${courseId ?? id ?? userId ?? ''}`}>
          {renderCentralOperation({service:serviceKey,area,actorId:identityId,roles,menuKeys,courseId,id,userId,search:location.search,navigate})}
        </div>
      ) : (
        <CentralOperationDirectory services={allowed} menus={visibleMenus} />
      )}
    </CentralOperationLayout>
  );
}
