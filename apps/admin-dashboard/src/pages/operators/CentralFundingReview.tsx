import { useCallback, useEffect, useState } from "react";
import { authClient } from "@o4o/auth-client";
import { DataTable, type ListColumnDef } from "@o4o/operator-ux-core";
type Trial = {
  id: string;
  title: string;
  status: string;
  reviewStatus?: string;
  forumPending?: boolean;
};
const base = "/neture/operator/market-trial";
/** Project-owner and participant work remain in their original workspaces. */
export default function CentralFundingReview() {
  const [rows, setRows] = useState<Trial[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setBusy(true);
    setRows([]);
    setError("");
    try {
      const r = await authClient.api.get(base);
      if (!Array.isArray(r.data?.data)) throw new Error();
      setRows(r.data.data);
    } catch {
      setError("펀딩 심사 목록을 불러오지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const act = async (row: Trial, action: "approve" | "reject") => {
    const reason =
      action === "reject"
        ? window.prompt("반려 사유를 입력해 주세요.")
        : undefined;
    if (action === "reject" && !reason?.trim()) return;
    if (
      action === "approve" &&
      !window.confirm(`${row.title} 펀딩을 승인하시겠습니까?`)
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await authClient.api.patch(
        `${base}/${encodeURIComponent(row.id)}/${action}`,
        reason ? { reason } : {},
      );
      setNotice(r.data?.message || "처리했습니다.");
      await load();
    } catch {
      setRows([]);
      setError("처리하지 못했습니다. 최신 상태를 다시 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  };
  const columns: ListColumnDef<Trial>[] = [
    {
      key: "title",
      header: "펀딩",
      render: (_, row) => <a className="text-blue-700 underline" href={`https://funding.neture.co.kr/operator/market-trial/${encodeURIComponent(row.id)}`}>{row.title} · 신청 상세 검토</a>,
    },
    {
      key: "status",
      header: "상태",
      render: (_, row) => <span>{row.status}</span>,
    },
    {
      key: "actions",
      header: "심사",
      render: (_, row) =>
        row.reviewStatus === "pending" ? (
          <div className="flex gap-3">
            <button disabled={busy} onClick={() => void act(row, "approve")}>
              승인
            </button>
            <button disabled={busy} onClick={() => void act(row, "reject")}>
              반려
            </button>
          </div>
        ) : null,
    },
  ];
  return (
    <section>
      <h2 className="text-xl font-bold">유통참여형 펀딩 심사</h2>
      <button disabled={busy} onClick={() => void load()}>
        새로고침
      </button>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <DataTable
        tableId="central-funding-review"
        columns={columns}
        data={rows}
        rowKey="id"
      />
    </section>
  );
}
