import { useCallback, useEffect, useState } from "react";
import { authClient } from "@o4o/auth-client";
import type { SemiFranchise } from "@o4o/operator-core-ui/modules/pharmacy-management";
const canonical = ["pharmacy", "carepharm", "megapharm", "pharmcoop"];
type Candidate = {
  userId: string;
  name: string | null;
  email: string;
  hasGoogleLink: boolean;
};
/** Existing per-business assignments remain manageable in the single operator workspace. */
export default function BusinessOperatorAssignments() {
  const [businesses, setBusinesses] = useState<SemiFranchise[]>([]);
  const [target, setTarget] = useState("");
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    const response = await authClient.api.get("/neture/admin/semi-franchises");
    if (!response.data.success || !Array.isArray(response.data.data))
      throw new Error("Invalid registry");
    if (
      response.data.data.some(
        (item: SemiFranchise) =>
          !item ||
          typeof item.key !== "string" ||
          typeof item.name !== "string" ||
          !["active", "closed"].includes(item.status) ||
          (item.operators !== undefined &&
            (!Array.isArray(item.operators) ||
              item.operators.some((op) => typeof op?.userId !== "string"))),
      )
    ) {
      throw new Error("Invalid business assignments");
    }
    setBusinesses(response.data.data);
  }, []);
  useEffect(() => {
    void load().catch(() =>
      setError("사업별 담당자 지정을 불러오지 못했습니다."),
    );
  }, [load]);
  const custom = businesses.filter(
    (item) => !canonical.includes(item.key) && item.status === "active",
  );
  const legacy = businesses.filter((item) => item.operators?.length);
  const act = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      await load();
      setNotice(success);
    } catch {
      setError(
        "처리하지 못했습니다. 현재 Neture 운영 권한과 사업 상태를 확인한 뒤 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  };
  if (!legacy.length && !custom.length && !error && !notice) return null;
  return (
    <details className="mb-6 rounded border bg-white p-4">
      <summary className="cursor-pointer font-medium">
        사업별 개별 담당 지정
      </summary>
      <p className="mt-2 text-sm text-gray-600">
        과거 개별 지정과 기타 사업의 담당자를 관리합니다.
        Pharmacy·CarePharm·MegaPharm·연합회의 새 Admin·Operator 지정은 위 권한
        지정 기능을 사용하세요.
      </p>
      {error && (
        <p role="alert" className="my-2 text-red-700">
          {error}{" "}
          <button
            type="button"
            disabled={busy}
            className="underline"
            onClick={() => {
              setError("");
              void load().catch(() =>
                setError("사업별 담당자 지정을 불러오지 못했습니다."),
              );
            }}
          >
            담당 지정 다시 조회
          </button>
        </p>
      )}
      {notice && <output className="block">{notice}</output>}
      {legacy.map((item) => (
        <section key={item.key} className="mt-3 rounded border p-3">
          <h3 className="font-medium">{item.name}</h3>
          {item.operators!.map((op) => (
            <div
              key={op.userId}
              className="mt-2 flex flex-wrap items-center gap-3"
            >
              <span className="break-all text-sm">
                {op.name || op.email || "이름 미등록"}
              </span>
              <button
                type="button"
                disabled={busy}
                className="min-h-11 rounded border px-3 py-2 text-red-700"
                onClick={() => {
                  if (
                    !window.confirm(
                      `${item.name}의 개별 담당 지정을 해제할까요? 계정과 다른 역할은 유지됩니다.`,
                    )
                  )
                    return;
                  void act(
                    () =>
                      authClient.api.delete(
                        `/neture/admin/semi-franchises/${encodeURIComponent(item.key)}/operators/${op.userId}`,
                      ),
                    "개별 담당 지정을 해제했습니다.",
                  );
                }}
              >
                개별 지정 해제
              </button>
            </div>
          ))}
        </section>
      ))}
      {!!custom.length && (
        <fieldset disabled={busy} className="mt-4 space-y-3 border-t pt-3">
          <label className="block">
            기타 사업
            <select
              className="mt-1 block w-full rounded border p-2"
              value={target}
              onChange={(e) => {
                setTarget(e.target.value);
                setSelected("");
                setCandidates([]);
              }}
            >
              <option value="">사업을 선택하세요</option>
              {custom.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <p className="text-sm text-gray-600">
            기타 사업의 담당자는 현재 Neture 운영 권한이 있어야 합니다. 사용자를
            검색해서 선택하세요.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              aria-label="개별 담당자 검색"
              className="min-w-0 flex-1 rounded border p-2"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected("");
                setCandidates([]);
              }}
            />
            <button
              type="button"
              disabled={!target || query.trim().length < 2}
              className="min-h-11 rounded border px-3 py-2"
              onClick={() =>
                void act(async () => {
                  const response = await authClient.api.get(
                    "/admin/operator-assignments/candidates",
                    { params: { q: query.trim() } },
                  );
                  if (
                    !response.data.success ||
                    !Array.isArray(response.data.data?.candidates)
                  )
                    throw new Error("Invalid candidates");
                  setCandidates(response.data.data.candidates);
                }, "후보 검색을 완료했습니다.")
              }
            >
              담당자 검색
            </button>
          </div>
          <label className="block">
            지정할 사용자
            <select
              className="mt-1 block w-full rounded border p-2"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">검색 결과에서 선택하세요</option>
              {candidates.map((candidate) => (
                <option
                  key={candidate.userId}
                  value={candidate.userId}
                  disabled={!candidate.hasGoogleLink}
                >
                  {candidate.name || candidate.email} · {candidate.email}
                  {candidate.hasGoogleLink ? "" : " · Google 연결 필요"}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!target || !selected}
            className="min-h-11 rounded border px-3 py-2"
            onClick={() =>
              void act(
                () =>
                  authClient.api.post(
                    `/neture/admin/semi-franchises/${encodeURIComponent(target)}/operators`,
                    { userId: selected },
                  ),
                "담당자를 지정했습니다.",
              )
            }
          >
            개별 담당 지정
          </button>
        </fieldset>
      )}
    </details>
  );
}
