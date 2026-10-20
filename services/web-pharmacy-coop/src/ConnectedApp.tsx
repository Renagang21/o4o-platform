import { useEffect, useState } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import { AuthClient, getAccessToken } from "@o4o/auth-client";
import {
  EmailLoginForm,
  O4O_ACCOUNT_LINKS,
  useServiceAuth,
} from "@o4o/auth-react";
import { App } from "./App";
import {
  anonymousSession,
  type Cooperative,
  type SessionSnapshot,
} from "./domain";

const apiOrigin = (
  import.meta.env.VITE_API_BASE_URL || "https://api.neture.co.kr"
).replace(/\/$/, "");
const authClient = new AuthClient(`${apiOrigin}/api/v1`, {
  strategy: "localStorage",
});
const toUser = (user: Record<string, unknown>) => ({ id: String(user.id) });

/** Authentication is common O4O authentication; all cooperative grants come from the API. */
export function ConnectedApp() {
  const auth = useServiceAuth({ authClient, getAccessToken, toUser });
  const [cooperatives, setCooperatives] = useState<Cooperative[]>([]);
  const [snapshot, setSnapshot] = useState<SessionSnapshot>(anonymousSession);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
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
        setCooperatives(directory.data.data);
        setSnapshot(session?.data.data ?? anonymousSession);
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
    <>
      <div className="container" aria-label="계정">
        {auth.user ? (
          <button onClick={() => void auth.logout()}>로그아웃</button>
        ) : (
          <Link to="/login">로그인</Link>
        )}
      </div>
      <Routes>
        <Route
          path="/login"
          element={
            <main className="container">
              <h1>협동조합 로그인</h1>
              {auth.user ? (
                <>
                  <p>로그인했습니다.</p>
                  <Link to="/cooperatives/mine">내 협동조합으로 이동</Link>
                </>
              ) : (
                <EmailLoginForm
                  links={O4O_ACCOUNT_LINKS}
                  onLogin={auth.loginWithEmail}
                  api={authClient}
                  onSuccess={() =>
                    navigate("/cooperatives/mine", { replace: true })
                  }
                />
              )}
            </main>
          }
        />
        <Route
          path="*"
          element={
            <App
              onSessionChanged={() => setRevision((v) => v + 1)}
              cooperatives={cooperatives}
              session={session}
              businessClient={authClient.api}
            />
          }
        />
      </Routes>
    </>
  );
}
