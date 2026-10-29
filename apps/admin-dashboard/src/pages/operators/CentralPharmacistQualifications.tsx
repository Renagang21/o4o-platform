import { useCallback, useEffect, useRef, useState } from "react";
import { authClient } from "@o4o/auth-client";
import { DataTable, type ListColumnDef } from "@o4o/operator-ux-core";
import { ActionBar, BaseDetailDrawer } from "@o4o/ui";
type Qualification = {
  userId: string;
  name: string;
  email?: string;
  accountStatus?: string;
  licenseNumber: string | null;
  status: string;
  reason: string | null;
  version: string | null;
};
const labels: Record<string, string> = {
  pending: "검토 대기",
  unrequested: "미신청 · 기존 자료",
  approved: "승인",
  rejected: "반려",
  revoked: "승인 취소",
};
const base = "/qualifications/pharmacist/review";
export default function CentralPharmacistQualifications({
  actorId,
  directory = false,
  initialQuery = "",
  onReview,
}: {
  actorId: string;
  directory?: boolean;
  initialQuery?: string;
  onReview?: (userId: string) => void;
}) {
  const [rows, setRows] = useState<Qualification[]>([]),
    [status, setStatus] = useState("all"),
    [page, setPage] = useState(1),
    [hasNext, setHasNext] = useState(false);
  const [detail, setDetail] = useState<Qualification | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState<{
      row: Qualification;
      action: "approve" | "reject" | "revoke";
    } | null>(null);
  const [reason, setReason] = useState(""),
    [checked, setChecked] = useState(false);
  const locked = useRef(false),
    sequence = useRef(0);
  const load = useCallback(async () => {
    const seq = ++sequence.current;
    setLoading(true);
    setSelectedKeys(new Set());
    setRows([]);
    setError("");
    try {
      const r = await authClient.api.get(base, { params: { status, page, q: query, ...(directory ? { view: "members" } : {}) } });
      if (!Array.isArray(r.data?.data?.items)) throw new Error("INVALID_QUALIFICATION_LIST");
      if (seq === sequence.current) {
        setRows(r.data.data.items);
        setHasNext(r.data.data.hasNext === true);
        setCounts(r.data.data.counts ?? {});
      }
    } catch {
      if (seq === sequence.current)
        setError("약사 자격 신청을 불러오지 못했습니다.");
    } finally {
      if (seq === sequence.current) setLoading(false);
    }
  }, [status, page, query, directory]);
  useEffect(() => {
    setSelected(null);
    setReason("");
    setChecked(false);
    void load();
    return () => {
      sequence.current += 1;
    };
  }, [load]);
  const choose = (
    row: Qualification,
    action: "approve" | "reject" | "revoke",
  ) => {
    setSelected({ row, action });
    setReason("");
    setChecked(false);
    setNotice("");
  };
  const selectedRows = rows.filter((row) => selectedKeys.has(row.userId));
  const canApprove = (row: Qualification) => Boolean(row.version && row.licenseNumber && row.status !== "approved" && row.userId !== actorId);
  const selectedRow = selectedRows.length === 1 ? selectedRows[0] : undefined;
  const actions = (row: Qualification) => (
    <div className="flex flex-wrap gap-2">
      {row.status !== "approved" && row.licenseNumber && <button type="button" disabled={busy || !canApprove(row)} onClick={() => choose(row, "approve")}>승인 검토</button>}
      {row.version && ["pending", "unrequested"].includes(row.status) && <button type="button" disabled={busy} onClick={() => choose(row, "reject")}>반려</button>}
      {row.status === "approved" && <button type="button" disabled={busy} onClick={() => choose(row, "revoke")}>승인 취소</button>}
      {!row.version && <span className="text-slate-500">본인 자격 신청 필요</span>}
    </div>
  );
  const columns: ListColumnDef<Qualification>[] = [
    { key: "name", header: "회원", stickyOnMobile: true, render: (_value, row) => <div><strong>{row.name}</strong>{row.email && <p className="text-sm text-slate-500">{row.email}</p>}</div> },
    { key: "accountStatus", header: "계정 상태", render: (value) => value ?? "확인 필요" },
    { key: "status", header: "약사 자격", render: (value) => labels[value] ?? "확인 필요" },
    { key: "licenseNumber", header: "면허번호", render: (value) => value || "미등록" },
    { key: "reason", header: "처리 사유", render: (value) => value || "—" },
    { key: "actions", header: "검토", render: (_value, row) => actions(row) },
  ];
  const decide = async () => {
    if (
      !selected ||
      locked.current ||
      !reason.trim() ||
      (selected.action === "approve" && !checked)
    )
      return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await authClient.api.post(
        `${base}/${encodeURIComponent(selected.row.userId)}`,
        {
          action: selected.action,
          reason: reason.trim(),
          version: selected.row.version,
          ...(selected.action === "approve"
            ? { licenseEvidenceChecked: true }
            : {}),
        },
      );
      setSelected(null);
      setNotice(
        "자격 검토 결과를 저장했습니다. 공통 계정 상태는 변경하지 않았습니다.",
      );
      await load();
    } catch {
      setSelected(null);
      setRows([]);
      setError(
        "처리하지 못했습니다. 신청 정보·검토 권한을 다시 조회해 주세요.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  return (
    <section className="central-qualification space-y-4">
      <h2 className="text-xl font-bold">{directory ? "전체 공통 회원" : "전체 회원·약사 자격 검토"}</h2>
      <p>
        {directory ? 'O4O 공통 계정과 자격 상태를 조회합니다. 전문 자격과 사업 참여 승인은 별도로 유지됩니다.' : <>면허 근거를 별도로 확인한 뒤 처리 사유를 기록합니다. 기존 분회·약국 승인
        자료는 자동으로 자격 승인되지 않습니다.</>}
      </p>
      <nav role="tablist" aria-label="자격 검토 상태" className="flex flex-wrap gap-2">
        {Object.entries({ all: "전체 회원", ...labels }).map(([key, label]) => <button type="button" role="tab" key={key} aria-selected={status === key} disabled={busy} className={`rounded border px-3 py-2 ${status === key ? "bg-blue-700 text-white" : "bg-white"}`} onClick={() => { setPage(1); setStatus(key); }}>{label}{counts[key] !== undefined ? ` (${counts[key]})` : ""}</button>)}
      </nav>
      <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); setPage(1); setQuery(search.trim()); }}>
        <input aria-label="회원 이름·이메일 검색" className="rounded border p-2" value={search} disabled={busy} onChange={(event) => setSearch(event.target.value)} placeholder="이름·이메일 검색" />
        <button type="submit" disabled={busy}>검색</button>
      </form>
      <button type="button" disabled={busy || loading} onClick={() => void load()}>
        새로고침
      </button>
      {error && <p role="alert">{error}</p>}
      {notice && <output className="block rounded border border-green-200 bg-green-50 p-3">{notice}</output>}
      {!directory && selectedKeys.size > 0 && <ActionBar selectedCount={selectedKeys.size} onClearSelection={() => setSelectedKeys(new Set())} actions={[
        { key: "approve", label: "선택 회원 승인 검토", disabled: busy || !selectedRow || !canApprove(selectedRow), onClick: () => { if (selectedRow) choose(selectedRow, "approve"); } },
        { key: "reject", label: "선택 회원 반려 검토", disabled: busy || !selectedRow?.version || !["pending", "unrequested"].includes(selectedRow.status), onClick: () => { if (selectedRow) choose(selectedRow, "reject"); } },
        { key: "revoke", label: "선택 회원 승인 취소", disabled: busy || selectedRow?.status !== "approved", onClick: () => { if (selectedRow) choose(selectedRow, "revoke"); } },
      ]} />}
      {directory && selectedKeys.size > 0 && <ActionBar selectedCount={selectedKeys.size} onClearSelection={() => setSelectedKeys(new Set())} actions={[{key:'review',label:'선택 회원 상세',disabled:!selectedRow,onClick:()=>{if(selectedRow)setDetail(selectedRow);}}]} />}
      {selectedKeys.size > 1 && <p className="text-sm text-slate-600">면허 근거와 사유를 회원별로 확인하도록 검토할 회원 한 명을 선택해 주세요.</p>}
      <DataTable<Qualification> tableId={directory ? "central-common-members" : "central-pharmacist-qualifications"} columns={directory ? columns.filter(column => !["licenseNumber", "reason", "actions"].includes(column.key)) : columns} data={rows} rowKey="userId" loading={loading} emptyMessage={error ? "조회에 실패했습니다. 새로고침으로 다시 확인해 주세요." : "현재 조건에 해당하는 회원이 없습니다."} onRowClick={directory ? row => setDetail(row) : undefined} selectable selectedKeys={selectedKeys} onSelectionChange={(keys) => { if (!busy) setSelectedKeys(keys); }} reorderable persistState columnVisibility />
      {directory && <BaseDetailDrawer open={!!detail} title="공통 회원 상세" onClose={() => setDetail(null)}>{detail && <section className="space-y-3"><p>{detail.name} · {detail.email}</p><p>계정 상태: {detail.accountStatus}</p><p>약사 자격: {labels[detail.status] ?? detail.status}</p>{onReview && <button type="button" onClick={() => onReview(detail.userId)}>약사 자격 검토로 이동</button>}</section>}</BaseDetailDrawer>}
      <nav>
        <button disabled={busy || page === 1} onClick={() => setPage(page - 1)}>
          이전
        </button>
        <span>{page} 페이지</span>
        <button disabled={busy || !hasNext} onClick={() => setPage(page + 1)}>
          다음
        </button>
      </nav>
      {selected && (
        <form
          className="rounded border bg-white p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void decide();
          }}
        >
          <h3>
            {selected.row.name} · 면허번호 {selected.row.licenseNumber}
          </h3>
          <p>
            {selected.action === "approve"
              ? "자격 승인"
              : selected.action === "reject"
                ? "자격 반려"
                : "자격 승인 취소"}{" "}
            처리
          </p>
          <label className="block">
            신청자에게 안내할 확인·반려 사유{" "}
            <textarea
              required
              maxLength={2000}
              disabled={busy}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          {selected.action === "approve" && (
            <label className="block">
              <input
                type="checkbox"
                checked={checked}
                disabled={busy}
                onChange={(e) => setChecked(e.target.checked)}
              />{" "}
              신청자 본인의 면허 근거를 별도로 확인했습니다.
            </label>
          )}
          <button
            type="submit"
            disabled={
              busy ||
              !reason.trim() ||
              (selected.action === "approve" && !checked)
            }
          >
            검토 결과 저장
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setSelected(null)}
          >
            닫기
          </button>
        </form>
      )}
    </section>
  );
}
