import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../lib/apiClient";
import { useAuth } from "../../contexts/AuthContext";
const origins = new Set([
  "https://neture.co.kr",
  "https://supplier.neture.co.kr",
  "https://funding.neture.co.kr",
  "https://community.neture.co.kr",
  "https://study.neture.co.kr",
  "https://store.neture.co.kr",
  "https://pharmacy.neture.co.kr",
  "https://carepharm.neture.co.kr",
  "https://megapharm.neture.co.kr",
  "https://pharmcoop.neture.co.kr",
]);
export function trustedInboxDestination(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const { origin, path } = value as { origin?: unknown; path?: unknown };
  if (
    typeof origin !== "string" ||
    !origins.has(origin) ||
    typeof path !== "string" ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    !path.includes("/operator/")
  )
    return null;
  return origin + path;
}
/** Notification resolvers stay internal-only. This page checks current scope before offering a trusted service link. */
export default function OperatorInboxEntryPage() {
  const { kind = "", scopeKey = "" } = useParams();
  const { user } = useAuth();
  const accountId = user?.id;
  const scope = `${accountId}:${kind}:${scopeKey}`;
  const [state, setState] = useState<{
    scope: string;
    href: string | null;
    error: boolean;
  } | null>(null);
  useEffect(() => {
    let alive = true;
    setState(null);
    if (!accountId) return;
    void api
      .get(
        `/operator-inbox/${encodeURIComponent(kind)}/${encodeURIComponent(scopeKey)}/manage`,
      )
      .then((r: {data?: {data?: {destination?: unknown}}}) => {
        if (!alive) return;
        const href = trustedInboxDestination(r.data?.data?.destination);
        setState({ scope, href, error: !href });
      })
      .catch(() => {
        if (alive) setState({ scope, href: null, error: true });
      });
    return () => {
      alive = false;
    };
  }, [accountId, kind, scopeKey, scope]);
  if (!user) return <p>로그인 후 문의 알림을 다시 열어 주세요.</p>;
  if (state?.scope !== scope)
    return <p role="status">현재 담당 운영 권한을 확인하고 있습니다…</p>;
  return (
    <section className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">담당 서비스 문의함</h1>
      {state.error ? (
        <p role="alert">
          문의함을 열 권한이 없거나 연결 정보를 확인하지 못했습니다. 해당
          서비스에서 운영 권한을 확인해 주세요.
        </p>
      ) : (
        <>
          <p className="my-4">
            알림이 접수된 서비스의 문의함에서 확인·처리합니다. 해당 서비스의
            로그인 상태와 운영 권한을 다시 확인합니다.
          </p>
          <a
            className="inline-block rounded border px-4 py-3"
            href={state.href!}
          >
            담당 문의함으로 이동
          </a>
        </>
      )}
    </section>
  );
}
