import { useCallback, useEffect, useRef, useState } from "react";

export interface OperatorManagementClient {
  get(path: string): Promise<{ data: any }>;
  post(path: string, body?: unknown): Promise<{ data: any }>;
  delete(path: string): Promise<{ data: any }>;
}
interface Person {
  userId: string;
  name: string | null;
  email: string;
  membershipStatus?: string;
  hasGoogleLink?: boolean;
  effective?: boolean;
}
interface Snapshot {
  role: string;
  operators: Person[];
  candidates: Person[];
  truncated: boolean;
}
function failure(e: any) {
  return (
    e?.response?.data?.error || e?.message || "요청을 처리하지 못했습니다."
  );
}
/** Parent must key by account/scope. Server remains authoritative for every request. */
export function ServiceOperatorManagement(props: {
  client: OperatorManagementClient;
  scope: string;
  title?: string;
}) {
  return <OperatorManagementPanel key={props.scope} {...props} />;
}
function OperatorManagementPanel({
  client,
  scope,
  title = "운영자 지정 · 해제",
}: {
  client: OperatorManagementClient;
  scope: string;
  title?: string;
}) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [query, setQuery] = useState(""),
    [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const version = useRef(0),
    locked = useRef(false),
    mounted = useRef(true);
  const base = `/service-operator-management/${encodeURIComponent(scope)}`;
  const load = useCallback(
    async (q: string) => {
      const ticket = ++version.current;
      setLoading(true);
      setError("");
      try {
        const response = await client.get(
          `${base}${q ? `?q=${encodeURIComponent(q)}` : ""}`,
        );
        if (mounted.current && ticket === version.current)
          setData(response.data.data);
      } catch (e) {
        if (mounted.current && ticket === version.current) {
          setData(null);
          setError(failure(e));
        }
      } finally {
        if (mounted.current && ticket === version.current) setLoading(false);
      }
    },
    [client, base],
  );
  const invalidate = useCallback(() => {
    mounted.current = false;
    version.current++;
  }, []);
  useEffect(() => {
    mounted.current = true;
    void load("");
    return invalidate;
  }, [load, invalidate]);
  async function change(person: Person, assign: boolean) {
    if (locked.current || loading) return;
    if (
      !window.confirm(
        `${person.name || person.email} 님의 이 서비스 Operator 권한을 ${assign ? "지정" : "해제"}하시겠습니까?`,
      )
    )
      return;
    locked.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const path = `${base}/operators/${encodeURIComponent(person.userId)}`;
      if (assign) await client.post(path, {});
      else await client.delete(path);
      if (!mounted.current) return;
      setNotice(`Operator 권한을 ${assign ? "지정" : "해제"}했습니다.`);
      await load(search); // A failed refresh preserves the success notice and disables stale actions.
    } catch (e) {
      if (mounted.current) setError(failure(e));
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <section className="space-y-4 rounded-lg border bg-white p-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p>
        이 서비스의 Operator만 지정·해제합니다. Admin 권한은 전체 관리자가
        관리합니다.
      </p>
      <p className="text-sm text-gray-600">
        지정 대상은 Google 계정을 연결하고 이 서비스를 이용할 수 있는
        회원입니다. 서비스 가입·정지 상태는 변경하지 않습니다.
      </p>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (locked.current) return;
          const q = query.trim();
          if (q.length === 1) {
            setError("검색어를 두 글자 이상 입력해 주세요.");
            return;
          }
          setSearch(q);
          void load(q);
        }}
      >
        <label className="min-w-0 flex-1">
          이름 또는 이메일{" "}
          <input
            aria-label="운영자 검색"
            maxLength={100}
            value={query}
            disabled={busy}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded border p-2"
          />
        </label>
        <button type="submit" disabled={busy} className="rounded border p-2">
          검색
        </button>
        <button
          type="button"
          disabled={busy || loading}
          onClick={() => void load(search)}
          className="rounded border p-2"
        >
          다시 조회
        </button>
      </form>
      {loading ? (
        <p>불러오는 중…</p>
      ) : (
        data && (
          <>
            <h3 className="font-semibold">현재 Operator</h3>
            {data.truncated && (
              <p>검색 결과가 많습니다. 이름·이메일로 범위를 좁혀 주세요.</p>
            )}
            {!data.operators.length && <p>지정된 Operator가 없습니다.</p>}
            <ul className="space-y-2">
              {data.operators.map((p) => (
                <li
                  key={p.userId}
                  className="flex flex-wrap items-center gap-2"
                >
                  <span className="min-w-0 break-all">
                    {p.name || p.email} · {p.email}
                    {p.membershipStatus !== "active"
                      ? " · 서비스 이용 불가"
                      : ""}
                    {p.effective === false ? " · 역할 유효기간 외" : ""}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void change(p, false)}
                    className="rounded border p-2"
                  >
                    해제
                  </button>
                </li>
              ))}
            </ul>
            {search && (
              <>
                <h3 className="font-semibold">활성 서비스 회원 검색 결과</h3>
                <p className="text-sm text-gray-600">
                  최대 30명을 표시합니다. 이름이나 이메일로 범위를 좁혀 주세요.
                </p>
                {!data.candidates.length && (
                  <p>일치하는 활성 회원이 없습니다.</p>
                )}
                <ul className="space-y-2">
                  {data.candidates.map((p) => (
                    <li
                      key={p.userId}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <span className="min-w-0 break-all">
                        {p.name || p.email} · {p.email}
                        {!p.hasGoogleLink ? " · Google 연결 필요" : ""}
                      </span>
                      <button
                        type="button"
                        disabled={
                          busy ||
                          !p.hasGoogleLink ||
                          data.operators.some((o) => o.userId === p.userId)
                        }
                        onClick={() => void change(p, true)}
                        className="rounded border p-2"
                      >
                        지정
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )
      )}
    </section>
  );
}
