import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { authClient } from "@o4o/auth-client";
import { z } from "zod";
const role = "platform:super_admin";
const accountSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  roles: z.array(z.string()),
  isActive: z.boolean(),
  lastLoginAt: z.string().nullable(),
});
const candidateSchema = z.object({
  userId: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  hasGoogleLink: z.boolean(),
});
type Account = z.infer<typeof accountSchema>;
type Candidate = z.infer<typeof candidateSchema>;
const button =
  "min-h-11 rounded border bg-white px-3 py-2 text-sm disabled:opacity-50";
const field = "min-h-11 w-full rounded border bg-white p-3";
function errorMessage(error: unknown) {
  const message = (error as { response?: { data?: { error?: unknown } } })
    ?.response?.data?.error;
  return typeof message === "string"
    ? message
    : "처리 결과를 확인하지 못했습니다. 최신 목록을 다시 조회해 주세요.";
}
export default function AdminAccountsSettings() {
  const [accounts, setAccounts] = useState<Account[]>([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [readFailed, setReadFailed] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [search, setSearch] = useState("");
  const [query, setQuery] = useState(""),
    [candidates, setCandidates] = useState<Candidate[]>([]),
    [selected, setSelected] = useState("");
  const [candidateError, setCandidateError] = useState(""),
    [searching, setSearching] = useState(false);
  const alive = useRef(false),
    pending = useRef(false),
    generation = useRef(0);
  const readVersion = useRef(0);
  const load = useCallback(async () => {
    const currentRead = ++readVersion.current;
    setLoading(true);
    setError("");
    try {
      const response = await authClient.api.get("/admin/platform-accounts");
      if (response.data?.success !== true) throw new Error("Invalid response");
      const rows = z
        .array(accountSchema)
        .parse(response.data.data)
        .filter((x) => x.roles.includes(role))
        .map((x) => ({ ...x, roles: [role] }));
      if (alive.current && currentRead === readVersion.current) {
        setAccounts(rows);
        setReadFailed(false);
      }
    } catch {
      if (alive.current && currentRead === readVersion.current) {
        setReadFailed(true);
        setError("전체 관리자 목록을 조회하지 못했습니다. 다시 불러와 주세요.");
      }
    } finally {
      if (alive.current && currentRead === readVersion.current)
        setLoading(false);
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
    };
  }, [load]);
  const mutate = async (
    task: () => Promise<{ data?: { success?: boolean; error?: string } }>,
    success: string,
  ) => {
    if (pending.current || loading || readFailed) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await task();
      if (response.data?.success !== true) throw { response };
      if (alive.current) {
        setNotice(success);
        setSelected("");
        setCandidates([]);
        setQuery("");
        await load();
      }
    } catch (e) {
      if (alive.current) setError(errorMessage(e));
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const find = async (e: React.FormEvent) => {
    e.preventDefault();
    const current = ++generation.current;
    setSearching(true);
    setCandidateError("");
    setCandidates([]);
    setSelected("");
    try {
      const response = await authClient.api.get(
        "/admin/operator-assignments/candidates",
        { params: { q: query.trim() } },
      );
      if (response.data?.success !== true)
        throw new Error("Invalid candidates");
      const rows = z
        .array(candidateSchema)
        .parse(response.data.data?.candidates);
      if (alive.current && current === generation.current) {
        setCandidates(
          rows.filter((x) => !accounts.some((a) => a.id === x.userId)),
        );
        if (!rows.length)
          setCandidateError(
            "검색 결과가 없습니다. 대상자가 먼저 Google로 가입해야 합니다.",
          );
      }
    } catch {
      if (alive.current && current === generation.current)
        setCandidateError(
          "지정할 사용자를 검색하지 못했습니다. 다시 시도해 주세요.",
        );
    } finally {
      if (alive.current && current === generation.current) setSearching(false);
    }
  };
  const candidate = candidates.find((x) => x.userId === selected);
  const filtered = accounts.filter((x) =>
    (x.name + " " + x.email)
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between gap-3">
        <h2 className="text-xl font-bold">전체 관리자 계정</h2>
        <button
          className={button}
          disabled={busy || loading}
          onClick={() => void load()}
        >
          새로고침
        </button>
      </div>
      <p className="rounded border bg-white p-4 text-sm">
        O4O 전체 관리자만 지정·관리합니다. 로그인은 Google 계정을 사용합니다.
        서비스별 담당자는{" "}
        <Link to="/operators" className="text-blue-700 underline">
          서비스 관리자·운영자
        </Link>
        에서 관리합니다.
      </p>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {notice && <output className="block text-blue-700">{notice}</output>}
      <section className="space-y-3 rounded border bg-white p-4">
        <h3 className="font-semibold">전체 관리자 추가 지정</h3>
        <p className="text-sm text-gray-600">
          이미 가입한 사용자를 검색하고 선택합니다. 지정하면 전체 관리자 권한을
          갖게 됩니다.
        </p>
        <form onSubmit={find} className="flex flex-wrap gap-2">
          <input
            aria-label="전체 관리자 지정 대상 검색"
            className={field + " min-w-0 flex-1"}
            value={query}
            onChange={(e) => {
              generation.current++;
              setQuery(e.target.value);
              setCandidates([]);
              setSelected("");
              setCandidateError("");
              setSearching(false);
            }}
            placeholder="이름 또는 이메일"
            disabled={busy}
          />
          <button
            className={button}
            disabled={
              busy ||
              loading ||
              readFailed ||
              searching ||
              query.trim().length < 2
            }
          >
            {searching ? "검색 중…" : "사용자 검색"}
          </button>
        </form>
        {candidateError && (
          <p role="alert" className="text-red-700">
            {candidateError}
          </p>
        )}
        {!!candidates.length && (
          <label className="block text-sm">
            지정할 사용자
            <select
              aria-label="지정할 사용자"
              className={field + " mt-2"}
              value={selected}
              disabled={busy}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">사용자를 선택하세요</option>
              {candidates.map((x) => (
                <option
                  key={x.userId}
                  value={x.userId}
                  disabled={!x.hasGoogleLink}
                >
                  {x.name || x.email} · {x.email}
                  {x.hasGoogleLink ? "" : " · Google 연결 필요"}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          className={button}
          disabled={!candidate?.hasGoogleLink || busy || loading || readFailed}
          onClick={() => {
            if (
              candidate &&
              window.confirm(
                `${candidate.email} 사용자를 전체 관리자로 지정할까요? O4O 전체 관리자 권한을 부여합니다.`,
              )
            )
              void mutate(
                () =>
                  authClient.api.post(
                    `/admin/platform-accounts/${encodeURIComponent(candidate.userId)}/super-admin`,
                  ),
                "전체 관리자 권한을 부여했습니다.",
              );
          }}
        >
          전체 관리자 지정
        </button>
      </section>
      <section className="space-y-3">
        <h3 className="font-semibold">전체 관리자 목록</h3>
        <input
          aria-label="전체 관리자 이름·이메일 검색"
          placeholder="이름 또는 이메일 검색"
          className={field}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <p className="text-sm text-gray-600">
          계정 비활성화는 공통 계정의 이용을 중지합니다. 서비스 담당 권한 해제와
          다릅니다. 본인·마지막 활성 전체 관리자 보호는 서버에서 확인합니다.
        </p>
        {loading ? (
          <p role="status">전체 관리자 목록을 불러오는 중입니다.</p>
        ) : (
          !error && (
            <div className="overflow-x-auto rounded border bg-white">
              <table className="w-full min-w-[640px] text-left text-sm">
                <caption className="sr-only">전체 관리자 계정 목록</caption>
                <thead>
                  <tr>
                    {[
                      "이름 / 이메일",
                      "역할",
                      "계정 상태",
                      "최근 로그인",
                      "관리",
                    ].map((x) => (
                      <th className="p-3" key={x}>
                        {x}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((x) => (
                    <tr key={x.id} className="border-t">
                      <td className="p-3">
                        <div>{x.name}</div>
                        <div className="text-xs text-gray-500">{x.email}</div>
                      </td>
                      <td className="p-3">전체 관리자</td>
                      <td className="p-3">{x.isActive ? "활성" : "비활성"}</td>
                      <td className="p-3">
                        {x.lastLoginAt
                          ? new Date(x.lastLoginAt).toLocaleDateString(
                              "ko-KR",
                              { timeZone: "Asia/Seoul" },
                            )
                          : "—"}
                      </td>
                      <td className="p-3">
                        <button
                          className={button}
                          disabled={busy}
                          onClick={() => {
                            if (
                              window.confirm(
                                `${x.email} 공통 계정을 ${x.isActive ? "비활성화" : "활성화"}할까요? 이 변경은 계정 전체에 적용됩니다.`,
                              )
                            )
                              void mutate(
                                () =>
                                  authClient.api.patch(
                                    `/admin/platform-accounts/${encodeURIComponent(x.id)}/status`,
                                    { isActive: !x.isActive },
                                  ),
                                "공통 계정 상태를 변경했습니다.",
                              );
                          }}
                        >
                          {x.isActive ? "계정 비활성화" : "계정 활성화"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && (
                <p className="p-4">표시할 전체 관리자 계정이 없습니다.</p>
              )}
            </div>
          )
        )}
      </section>
    </div>
  );
}
