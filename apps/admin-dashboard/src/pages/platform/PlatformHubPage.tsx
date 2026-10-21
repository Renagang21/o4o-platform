import { useCallback, useEffect, useRef, useState } from "react";
import { getServiceHealth, type ServiceHealth } from "@/api/service-health";
const stateLabel = {
  passed: "확인",
  failed: "점검 실패",
  unknown: "확인 불가",
};
const stateColor = {
  passed: "text-emerald-700",
  failed: "text-red-700",
  unknown: "text-amber-800",
};
const time = (value: string) =>
  new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
export default function PlatformHubPage() {
  const [data, setData] = useState<ServiceHealth | null>(null);
  const [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const version = useRef(0),
    alive = useRef(false),
    pending = useRef(false);
  const load = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    const current = ++version.current;
    setLoading(true);
    setError("");
    try {
      const value = await getServiceHealth();
      if (alive.current && current === version.current) {
        setData(value);
        setNow(Date.now());
      }
    } catch {
      if (alive.current && current === version.current)
        setError(
          "서비스 상태를 조회하지 못했습니다. 이전 결과로 현재 정상 여부를 판단할 수 없습니다.",
        );
    } finally {
      pending.current = false;
      if (alive.current && current === version.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    void load();
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => {
      alive.current = false;
      clearInterval(timer);
    };
  }, [load]);
  const stale =
    !!data &&
    now - Date.parse(data.checkedAt) >
      Math.max(data.cacheSeconds * 1000 + 10000, 90000);
  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">서비스 상태</h1>
          <p className="mt-2 text-sm text-gray-600">
            현행 서비스와 공통 공간의 기본 접속 상태를 확인합니다.
          </p>
        </div>
        <button
          className="min-h-11 rounded border bg-white px-4 py-2 disabled:opacity-50"
          disabled={loading}
          onClick={() => void load()}
        >
          {loading ? "확인 중…" : "상태 새로고침"}
        </button>
      </div>
      <p className="rounded border bg-white p-4 text-sm">
        HTTPS·HTML 화면·앱 JavaScript 응답과 공통 API 실행 준비·DB 연결을
        점검합니다. 로그인·서비스 식별·권한·가입·승인·결제·AI 실행은 검사하지
        않습니다. 서비스별 업무는 해당 서비스에서 처리합니다.
      </p>
      {error && (
        <p
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-4 text-red-800"
        >
          {error}
        </p>
      )}
      {loading && <p role="status">기본 접속 상태를 확인하고 있습니다.</p>}
      {stale && (
        <p
          role="alert"
          className="rounded border border-amber-300 p-4 text-amber-900"
        >
          오래된 점검 결과입니다. 현재 상태는 다시 확인해 주세요.
        </p>
      )}
      {data && (
        <>
          <p className="text-sm text-gray-600">
            마지막 점검: {time(data.checkedAt)} · 결과는 최대{" "}
            {data.cacheSeconds}초 재사용됩니다.
            {data.cached ? " 저장된 최근 점검 결과입니다." : ""}
            {error || stale ? " 아래는 이전 점검 결과입니다." : ""}
          </p>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">공통 기반</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {data.infrastructure.map((check) => (
                <li key={check.name} className="rounded border bg-white p-4">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-medium">{check.name}</span>
                    <span className={stateColor[check.state]}>
                      {stateLabel[check.state]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{check.detail}</p>
                </li>
              ))}
            </ul>
          </section>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">
              서비스·공통 공간 {data.services.length}곳
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {data.services.map((service) => {
                const state = service.checks.some((x) => x.state === "failed")
                  ? "failed"
                  : service.checks.some((x) => x.state === "unknown")
                    ? "unknown"
                    : "passed";
                return (
                  <article
                    key={service.id}
                    className="min-w-0 space-y-3 rounded border bg-white p-4"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <h3 className="font-semibold">{service.name}</h3>
                      <span className={stateColor[state]}>
                        {state === "passed"
                          ? "기본 접속 확인"
                          : stateLabel[state]}
                      </span>
                    </div>
                    <a
                      className="block break-all text-sm text-blue-700 underline"
                      href={service.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {new URL(service.url).hostname}
                    </a>
                    <ul className="space-y-2 text-sm">
                      {service.checks.map((check, i) => (
                        <li key={i}>
                          <span className={stateColor[check.state]}>
                            {check.name}: {stateLabel[check.state]}
                          </span>
                          <p className="mt-1 text-gray-600">{check.detail}</p>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-gray-500">
                      점검 시각: {time(service.checkedAt)}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
