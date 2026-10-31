import { safeServiceReturnPath } from "@o4o/auth-utils";
import {
  COOPERATION_EXTENSIONS,
  ServiceContactInboxLink,
} from "@o4o/shared-space-ui";
import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthClient, getAccessToken } from "@o4o/auth-client";
import {
  EmailLoginForm,
  O4O_ACCOUNT_LINKS,
  useServiceAuth,
  ServiceSpaceSwitcher,
  MyHomeButton,
  O4OHomeButton,
  ServiceAccountMenu,
} from "@o4o/auth-react";
import { App } from "./App";
import {
  anonymousSession,
  canManageFederation,
  type Cooperative,
  type SessionSnapshot,
} from "./domain";

const apiOrigin = (
  import.meta.env.VITE_API_BASE_URL || "https://api.neture.co.kr"
).replace(/\/$/, "");
const authClient = new AuthClient(`${apiOrigin}/api/v1`, {
  strategy: "localStorage",
});
const toUser = (user: Record<string, unknown>) => ({
  id: String(user.id),
  displayName: String(user.displayName || user.name || "회원"),
});

function isSessionSnapshot(value: unknown): value is SessionSnapshot {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  if (typeof row.userId !== "string") return false;
  const assignments = (items: unknown, cooperative: boolean) =>
    Array.isArray(items) &&
    items.every(
      (item) =>
        item &&
        typeof item.userId === "string" &&
        (!cooperative || typeof item.cooperativeId === "string"),
    );
  return (
    assignments(row.memberships, true) &&
    assignments(row.cooperativeOperators, true) &&
    assignments(row.federationOperators, false)
  );
}

/** Authentication is common O4O authentication; all cooperative grants come from the API. */
export function ConnectedApp() {
  const auth = useServiceAuth({ authClient, getAccessToken, toUser });
  const [cooperatives, setCooperatives] = useState<Cooperative[]>([]);
  const [snapshot, setSnapshot] = useState<SessionSnapshot>(anonymousSession);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo =
    safeServiceReturnPath(
      new URLSearchParams(location.search).get("returnTo"),
    ) ?? "/cooperatives/mine";
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(false);
    setSnapshot(anonymousSession);
    Promise.all([
      authClient.api.get("/neture/cooperatives"),
      auth.user
        ? authClient.api.get("/neture/cooperatives/me")
        : Promise.resolve(null),
    ])
      .then(([directory, session]) => {
        if (!current) return;
        const next = session?.data.data;
        if (auth.user && !isSessionSnapshot(next))
          throw new Error("Invalid cooperative session");
        setCooperatives(directory.data.data);
        setSnapshot(next ?? anonymousSession);
      })
      .catch(() => {
        if (current) {
          setError(true);
          setCooperatives([]);
        }
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [auth.user, revision]);
  // Never expose a previous user's assignments while a new session is being loaded.
  const session =
    !loading && snapshot.userId === auth.user?.id ? snapshot : anonymousSession;
  if (auth.isLoading || loading)
    return (
      <main className="container">
        <output>계정과 조합 정보를 확인하고 있습니다…</output>
      </main>
    );
  if (error)
    return (
      <main className="container">
        <p role="alert">조합 정보를 불러오지 못했습니다.</p>
        <a href="https://neture.co.kr/contact?service=pharmcoop">Contact Us</a>
        <button onClick={() => window.location.reload()}>다시 시도</button>
      </main>
    );
  if (auth.pendingPolicyAcceptances.length)
    return (
      <main className="container">
        <p>O4O 계정에서 이용약관 동의를 완료해 주세요.</p>
        <a href="https://neture.co.kr">O4O 계정으로 이동</a>
      </main>
    );
  return (
    <App
      onSessionChanged={() => setRevision((v) => v + 1)}
      cooperatives={cooperatives}
      session={session}
      businessClient={authClient.api}
      headerHome={
        <span className="coop-account-tools">
          <ServiceSpaceSwitcher
            api={authClient.api}
            accountId={auth.user?.id}
            isAuthenticated={!!auth.user}
            authLoading={auth.isLoading}
          />
          <MyHomeButton
            className="o4o-home-link"
            api={authClient.api}
            accountId={auth.user?.id}
            isAuthenticated={!!auth.user}
            authLoading={auth.isLoading}
          />
          <O4OHomeButton
            className="o4o-home-link"
            api={authClient.api}
            isAuthenticated={!!auth.user}
            authLoading={auth.isLoading}
          />
          <ServiceContactInboxLink
            client={authClient.api}
            serviceKey={COOPERATION_EXTENSIONS.pharmcoop.model.key}
            accountId={auth.user?.id}
            enabled={!!auth.user?.id}
          />
        </span>
      }
      headerAccount={
        auth.user ? (
          <ServiceAccountMenu
            displayName={auth.user.displayName || "회원"}
            onLogout={auth.logout}
          >
            <Link to="/notifications">알림</Link>
            <Link to="/cooperatives/mine">내 협동조합</Link>
            {canManageFederation(session) && (
              <Link to="/operator/inbox">연합회 운영 알림</Link>
            )}
          </ServiceAccountMenu>
        ) : undefined
      }
      loginContent={
        <section className="section">
          <h1>협동조합 로그인</h1>
          {auth.user ? (
            <>
              <p>로그인했습니다.</p>
              <Link to={returnTo}>원래 화면으로 이동</Link>
            </>
          ) : (
            <EmailLoginForm
              links={O4O_ACCOUNT_LINKS}
              onLogin={auth.loginWithEmail}
              api={authClient}
              onSuccess={() => navigate(returnTo, { replace: true })}
            />
          )}
        </section>
      }
    />
  );
}
