import { useCallback, useEffect, useState } from "react";
import { authClient } from "@o4o/auth-client";
type Cooperative = {
  id: string;
  name: string;
  status: string;
  introduction: string;
};
const base = "/neture/cooperative-management/federation";
/** Federation affiliation work only: never queries local cooperative members or private operational records. */
export default function CentralFederationOperations({
  canDecide,
}: {
  canDecide: boolean;
}) {
  const [rows, setRows] = useState<Cooperative[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    setBusy(true);
    setRows([]);
    setError("");
    try {
      const r = await authClient.api.get(base);
      if (!Array.isArray(r.data?.data)) throw new Error();
      setRows(r.data.data);
    } catch {
      setError(
        "연합회 가입 현황을 불러오지 못했습니다. 연합회 업무 위임을 확인해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const act = async (row: Cooperative, action: string) => {
    const reason = window.prompt("처리 사유를 입력해 주세요.");
    if (!reason?.trim()) return;
    setBusy(true);
    try {
      await authClient.api.post(
        `${base}/${encodeURIComponent(row.id)}/actions/${action}`,
        { reason },
      );
      await load();
    } catch {
      setRows([]);
      setError("처리하지 못했습니다. 최신 상태를 다시 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section>
      <h2 className="text-xl font-bold">연합회 가입·참여 운영</h2>
      <p>개별 조합 회원과 비공개 사업 운영은 해당 조합에서 담당합니다.</p>
      <button disabled={busy} onClick={() => void load()}>
        새로고침
      </button>
      {error && <p role="alert">{error}</p>}
      <ul>
        {rows.map((row) => (
          <li key={row.id} className="my-5 rounded border p-4">
            <h3>
              {row.name} · {row.status}
            </h3>
            <p>{row.introduction}</p>
            {row.status === "pending" && (
              <button
                disabled={busy}
                onClick={() => void act(row, "request_changes")}
              >
                보완 요청
              </button>
            )}
            {canDecide && row.status === "pending" && (
              <>
                <button
                  disabled={busy}
                  onClick={() => void act(row, "approve")}
                >
                  가입 승인
                </button>
                <button disabled={busy} onClick={() => void act(row, "reject")}>
                  반려
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
