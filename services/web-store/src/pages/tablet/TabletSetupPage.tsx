import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  loadStoredTabletDevice,
  saveStoredTabletDevice,
  pairingLookup,
  pairingClaim,
  type PairingLookupResult,
} from "../../api/tablet";
const button = "min-h-12 rounded-lg border px-4 py-3 disabled:opacity-50";
export default function TabletSetupPage() {
  const navigate = useNavigate(),
    [params] = useSearchParams();
  const [code, setCode] = useState(""),
    [lookup, setLookup] = useState<PairingLookupResult | null>(null),
    [name, setName] = useState(""),
    [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const alive = useRef(false),
    lock = useRef(false),
    version = useRef(0);
  useEffect(() => {
    alive.current = true;
    version.current++;
    if (params.get("reset") !== "1") {
      const d = loadStoredTabletDevice();
      if (d)
        navigate(`/tablet/${encodeURIComponent(d.storeSlug)}`, {
          replace: true,
        });
    }
    return () => {
      alive.current = false;
    };
  }, [navigate, params]);
  const run = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const captured = ++version.current;
    try {
      if (!lookup) {
        const value = await pairingLookup(code);
        if (!alive.current || version.current !== captured) return;
        setLookup(value);
        setLocation(value.defaultLocationId || value.locations[0]?.id || "");
        setName("진열 태블릿");
      } else {
        const d = await pairingClaim({
          code,
          deviceName: name.trim() || undefined,
          locationId: location || null,
        });
        if (!alive.current || version.current !== captured) return;
        saveStoredTabletDevice(d);
        navigate(`/tablet/${encodeURIComponent(d.storeSlug)}`, {
          replace: true,
        });
      }
    } catch (e) {
      if (alive.current && version.current === captured)
        setError(
          (e as Error).message ||
            "기기를 연결하지 못했습니다. 입력을 유지했습니다.",
        );
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  };
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
      <section className="w-full max-w-lg space-y-5 rounded-xl border bg-white p-6">
        <h1 className="text-2xl font-bold">진열 태블릿 연결</h1>
        <p>
          내 매장의 태블릿 위치 관리에서 발급한 6자리 코드를 입력하세요. 상담
          고객 화면의 연결 코드와는 다릅니다.
        </p>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run();
          }}
        >
          {!lookup ? (
            <label className="block">
              연결 코드
              <input
                aria-label="진열 태블릿 연결 코드"
                className="block min-h-14 w-full rounded border p-3 text-2xl tracking-widest"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                value={code}
                disabled={busy}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </label>
          ) : (
            <>
              <h2 className="text-xl font-semibold">{lookup.storeName}</h2>
              <label className="block">
                기기 이름
                <input
                  className="block min-h-12 w-full rounded border p-3"
                  maxLength={100}
                  value={name}
                  disabled={busy}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="block">
                설치 위치
                <select
                  className="block min-h-12 w-full rounded border p-3"
                  value={location}
                  disabled={busy}
                  onChange={(e) => setLocation(e.target.value)}
                >
                  {!lookup.locations.length && (
                    <option value="">위치 미지정</option>
                  )}
                  {lookup.locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.location || l.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className={button}
                disabled={busy}
                onClick={() => {
                  setLookup(null);
                  setError("");
                }}
              >
                다른 코드 입력
              </button>
            </>
          )}
          {error && (
            <p role="alert" className="text-red-800">
              {error}
            </p>
          )}
          <button
            className={`${button} bg-teal-700 text-white`}
            disabled={busy || code.length !== 6}
          >
            {busy ? "확인 중…" : lookup ? "이 매장에 연결" : "매장 확인"}
          </button>
        </form>
      </section>
    </main>
  );
}
