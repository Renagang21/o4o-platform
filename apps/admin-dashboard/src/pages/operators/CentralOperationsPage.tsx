import "./central-operations.css";
import CentralPharmacistQualifications from "./CentralPharmacistQualifications";
import { centralOperationAreas } from "./central-operation-navigation";
import CentralOperatorInbox from "./CentralOperatorInbox";
import CentralLectureReview from "./CentralLectureReview";
import CentralFederationOperations from "./CentralFederationOperations";
import CentralSupplierReview from "./CentralSupplierReview";
import CentralFundingReview from "./CentralFundingReview";
import {
  CommunityHomeManagementPage,
  CommunityManagementWorkspace,
  createCommunityHomeApi,
} from "@o4o/operator-core-ui";
import { PharmacyMembershipReviewPage } from "@o4o/operator-core-ui/modules/pharmacy-management";
import CentralLectureCourses from "./CentralLectureCourses";
import CentralPartnerModeration from "./CentralPartnerModeration";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@o4o/auth-context";
import { authClient } from "@o4o/auth-client";
import { ServiceMembersWorkspace } from "@o4o/operator-core-ui/modules/members";

const SERVICES = [
  ["neture", "약국·공통 운영"],
  ["supplier", "공급자"],
  ["funding", "펀딩"],
  ["lecture", "강의"],
  ["community", "커뮤니티"],
  ["partner-support", "파트너"],
  ["pharmcoop", "협동조합 연합회"],
] as const;
const editorialApi = createCommunityHomeApi(authClient.api);
const memberApi = {
  get: (path: string) => authClient.api.get(path).then((result) => result.data),
  post: (path: string, data?: unknown) =>
    authClient.api.post(path, data).then((result) => result.data),
  put: (path: string, data?: unknown) =>
    authClient.api.put(path, data).then((result) => result.data),
  patch: (path: string, data?: unknown) =>
    authClient.api.patch(path, data).then((result) => result.data),
  delete: (path: string) =>
    authClient.api.delete(path).then((result) => result.data),
};

/** Independent entry: never expose the platform-admin layout to service Operators. */
export default function CentralOperationsPage() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const identityId = String(user?.id ?? "");
  const { serviceKey, userId, area, courseId } = useParams();
  const navigate = useNavigate();
  const [grant, setGrant] = useState<{
    userId: string;
    roles: string[];
  } | null>(null);
  const roles = grant?.userId === String(user?.id) ? grant.roles : null;
  const sequence = useRef(0);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const seq = ++sequence.current;
    setGrant(null);
    setError("");
    try {
      const response = await authClient.api.get("/operator/central-access");
      if (!Array.isArray(response.data?.data?.roles))
        throw new Error("INVALID_RESPONSE");
      if (seq === sequence.current)
        setGrant({ userId: identityId, roles: response.data.data.roles });
    } catch {
      if (seq === sequence.current)
        setError(
          "Google 로그인과 중앙 관리자의 유효한 업무 위임이 필요합니다.",
        );
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
  const isPlatform = roles.includes("platform:super_admin");
  const allowed = SERVICES.filter(([key]) =>
    key === "pharmcoop"
      ? roles.some((role) =>
          ["neture:pharmcoop_admin", "neture:pharmcoop_operator"].includes(
            role,
          ),
        )
      : isPlatform ||
        roles.includes(`${key}:admin`) ||
        roles.includes(`${key}:operator`),
  );
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
  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-bold">O4O 통합 운영</h1>
        <Link to="/operations">위임 업무</Link>
        {isPlatform && <Link to="/admin">전체 관리자</Link>}
        <button onClick={logout}>로그아웃</button>
      </header>
      {serviceKey && serviceKey !== "pharmcoop" && (
        <nav className="mb-4 flex flex-wrap gap-4">
          <Link to={`/operations/${serviceKey}/members`}>회원 관리</Link>
          <Link to={`/operations/${serviceKey}/inbox`}>알림·문의</Link>
          {serviceKey === "community" && (
            <>
              <Link to="/operations/community/editorial">
                공지·콘텐츠·자료 운영
              </Link>
              <Link to="/operations/community/boards">게시판 운영</Link>
            </>
          )}
          {serviceKey === "neture" && (
            <>
              <Link to="/operations/neture/pharmacies">약국 신청 심사</Link>
              <Link to="/operations/neture/qualifications">약사 자격 검토</Link>
            </>
          )}
          {serviceKey === "supplier" && (
            <Link to="/operations/supplier/suppliers">공급자 심사</Link>
          )}
          {serviceKey === "funding" && (
            <Link to="/operations/funding/funding">펀딩 심사</Link>
          )}
          {serviceKey === "lecture" && (
            <Link to="/operations/lecture/courses">강의 심사</Link>
          )}
        </nav>
      )}
      {serviceKey === "pharmcoop" ? (
        <CentralFederationOperations
          key={user.id}
          canDecide={roles.includes("neture:pharmcoop_admin")}
        />
      ) : serviceKey && area === "inbox" ? (
        <CentralOperatorInbox
          key={`${user.id}:${serviceKey}`}
          serviceKey={serviceKey}
        />
      ) : serviceKey === "supplier" && area === "suppliers" ? (
        <CentralSupplierReview key={user.id} />
      ) : serviceKey === "funding" && area === "funding" ? (
        <CentralFundingReview key={user.id} />
      ) : serviceKey === "community" && area === "boards" ? (
        <CommunityManagementWorkspace
          api={authClient.api}
          kind="boards"
          key={user.id}
        />
      ) : serviceKey === "community" && area === "editorial" ? (
        <CommunityHomeManagementPage
          api={editorialApi}
          publicOrigin="https://community.neture.co.kr"
          key={user.id}
        />
      ) : serviceKey === "neture" && area === "qualifications" ? (
        <CentralPharmacistQualifications
          key={user.id}
          actorId={String(user.id)}
        />
      ) : serviceKey === "neture" && area === "pharmacies" ? (
        <PharmacyMembershipReviewPage key={user.id} />
      ) : serviceKey === "lecture" && area === "courses" && courseId ? (
        <CentralLectureReview
          key={`${user.id}:${courseId}`}
          courseId={courseId}
        />
      ) : serviceKey === "lecture" && area === "courses" ? (
        <CentralLectureCourses key={user.id} />
      ) : serviceKey === "partner-support" ? (
        <CentralPartnerModeration
          key={user.id}
          userId={String(user.id)}
          admin={roles.includes("partner-support:admin") || isPlatform}
        />
      ) : serviceKey ? (
        <ServiceMembersWorkspace
          key={`${user.id}:${serviceKey}:${userId ?? ""}`}
          serviceKey={serviceKey}
          basePath={`/operations/${serviceKey}/members`}
          api={memberApi}
          roles={roles}
          userId={userId}
          navigate={navigate}
          allowDestructiveActions={false}
        />
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {allowed.map(([key, name]) => (
            <Link
              className="rounded border bg-white p-5"
              key={key}
              to={`/operations/${key}/${key === "pharmcoop" ? "federation" : "members"}`}
            >
              {name} {key === "pharmcoop" ? "가입·참여 운영" : "회원 관리"}
            </Link>
          ))}
          {!allowed.length && <p>현재 연결된 운영 업무가 없습니다.</p>}
        </section>
      )}
    </main>
  );
}
