import { useState } from "react";
import { getPharmacyManagementClient } from "./api";
type Row = { id: string; name: string; counts: Record<string, number> };
export function StaffDemandSummary() {
  const [month, setMonth] = useState(
    new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 7),
  );
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <section
      className="rounded border bg-white p-4"
      aria-label="현장 고객 요구 집계"
    >
      <h2 className="font-semibold">현장 고객 요구 집계</h2>
      <p className="my-2 text-sm">
        O4O가 월별 건수를 확인합니다. 직원·고객·상담 내용은 수집하지 않습니다.
      </p>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setRows([]);
          setMessage("");
          try {
            const r = await getPharmacyManagementClient().get(
              "/neture/admin/staff-support/demands",
              { params: { month } },
            );
            if (!r.data.success)
              throw new Error("Demand summary lookup failed");
            setRows(r.data.data);
            setMessage(r.data.data.length ? "" : "기록된 요청이 없습니다.");
          } catch {
            setMessage("집계를 불러오지 못했습니다. 다시 시도해 주세요.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <input
          aria-label="현장 요구 조회 월"
          type="month"
          value={month}
          disabled={busy}
          onChange={(e) => {
            setMonth(e.target.value);
            setRows([]);
            setMessage("");
          }}
          className="rounded border p-2"
        />
        <button
          type="submit"
          disabled={busy || !month}
          className="rounded border p-2"
        >
          집계 조회
        </button>
      </form>
      <output>{message}</output>
      <ul>
        {rows.map((r) => (
          <li key={r.id} className="mt-3 rounded border p-3">
            <strong>{r.name}</strong>
            <p>
              위치 못 찾음 {r.counts["not-found"] || 0} · 미취급 요청{" "}
              {r.counts["not-carried"] || 0} · 약사 연결{" "}
              {r.counts["pharmacist-help"] || 0}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
