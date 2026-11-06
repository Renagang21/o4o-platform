import MemberProfileForm from './MemberProfileForm';
import MemberReviewInformation from './MemberReviewInformation';
import { memberError, type MemberDetail } from './member-workspace-model';
import { useCallback, useEffect, useRef, useState } from "react";
import { authClient } from "@o4o/auth-client";
import { DataTable, type ListColumnDef } from "@o4o/operator-ux-core";
import { ActionBar, BaseDetailDrawer } from "@o4o/ui";
type Qualification = {
  operatorReadOnly?: boolean;
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
const LICENSE_REGISTRATION_TYPES = new Set(["pharmacist", "pharmacy_owner"]);
type DrawerMode = "signup" | "revoke";
type Decision = "approve" | "reject" | "revoke";
/**
 * The real signup decision lives on the member-registration API and needs the
 * member-work grant. Everything else stays a qualification-only decision, which
 * must never be presented as completing the signup.
 */
function signupDecision(detail: MemberDetail, row: Qualification, canManageMembers: boolean) {
  const registration = detail.registration;
  const viaRegistration = Boolean(canManageMembers && registration && registration.state !== "approved");
  return {
    viaRegistration,
    registrationBlocked: Boolean(!canManageMembers && registration && registration.state !== "approved"),
    canApprove: viaRegistration || Boolean(row.version && row.licenseNumber && row.status !== "approved"),
    canReject: viaRegistration
      ? registration?.state === "pending"
      : Boolean(row.version && ["pending", "unrequested"].includes(row.status)),
    needsEvidence: viaRegistration ? LICENSE_REGISTRATION_TYPES.has(registration?.type ?? "") : true,
  };
}
export default function CentralPharmacistQualifications({
  actorId,
  directory = false,
  initialQuery = "",
  onReview,
  canManageMembers = false,
}: {
  actorId: string;
  directory?: boolean;
  initialQuery?: string;
  onReview?: (userId: string) => void;
  canManageMembers?: boolean;
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
      action: DrawerMode;
    } | null>(null);
  const [reason, setReason] = useState(""),
    [checked, setChecked] = useState(false);
  const [memberDetail, setMemberDetail] = useState<MemberDetail | null>(null);
  const [reading, setReading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [detailRevision, setDetailRevision] = useState(0);
  const detailSequence = useRef(0);
  const closeReview = () => { ++detailSequence.current; setSelected(null); setMemberDetail(null); setReading(false); setEditing(false); };
  const locked = useRef(false),
    sequence = useRef(0);
  const load = useCallback(async () => {
    const seq = ++sequence.current;
    setLoading(true);
    ++detailSequence.current; setSelected(null); setMemberDetail(null); setReading(false); setEditing(false); setDetail(null);
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
    closeReview();
    setDetail(null);
    setReason("");
    setChecked(false);
    void load();
    return () => {
      sequence.current += 1;
      detailSequence.current += 1;
    };
  }, [load, actorId]);
  const readMember = async (row: Qualification, action: DrawerMode, seq: number) => {
    const response = await authClient.api.get(`${base}/${encodeURIComponent(row.userId)}`);
    const data = response.data?.data;
    if (data?.member?.userId !== row.userId) throw new Error("INVALID_MEMBER_DETAIL");
    if (seq !== detailSequence.current) return null;
    setMemberDetail(data);
    setDetailRevision((revision) => revision + 1);
    if (data.qualification) setSelected({row:{...row,...data.qualification,userId:row.userId,operatorReadOnly:data.member.operatorReadOnly},action});
    return data as MemberDetail;
  };
  const choose = async (row: Qualification, action: DrawerMode) => {
    if (row.operatorReadOnly) return;
    const seq = ++detailSequence.current;
    setSelected({ row, action });
    setEditing(false);
    setMemberDetail(null); setReading(true); setError("");
    setReason(""); setChecked(false); setNotice("");
    try {
      await readMember(row, action, seq);
    } catch { if (seq === detailSequence.current) setError("회원 전체 정보를 불러오지 못했습니다. 닫은 뒤 다시 조회해 주세요."); }
    finally { if (seq === detailSequence.current) setReading(false); }
  };
  const performEdit = async (work: () => Promise<unknown>) => {
    if (!selected || locked.current) return;
    const { row, action } = selected;
    const seq = ++detailSequence.current;
    locked.current = true;
    setBusy(true); setError(""); setNotice("");
    try {
      try {
        await work();
      } catch (failure) {
        if ([401, 403].includes((failure as { response?: { status?: number } }).response?.status ?? 0)) closeReview();
        setError(memberError(failure));
        return;
      }
      try {
        const fresh = await readMember(row, action, seq);
        if (fresh) {
          setEditing(false);
          setNotice("회원 정보를 반영했습니다. 변경된 내용을 확인한 뒤 승인 또는 반려해 주시기 바랍니다.");
          setRows((current) => current.map((item) => item.userId === row.userId
            ? { ...item, ...fresh.qualification, name: fresh.member.name ?? item.name, email: fresh.member.email, accountStatus: fresh.member.accountStatus, userId: item.userId }
            : item));
        }
      } catch {
        // The save succeeded, but the decision must not continue on the old version.
        setEditing(false);
        setMemberDetail(null);
        setError("회원 정보는 저장했지만 최신 정보를 불러오지 못했습니다. 닫은 뒤 다시 조회해 주세요.");
      }
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const selectedRows = rows.filter((row) => selectedKeys.has(row.userId));
  const selectedRow = selectedRows.length === 1 ? selectedRows[0] : undefined;
  const actions = (row: Qualification) => {
    if (row.operatorReadOnly) return <span>전체 관리자 — 처리 대상 아님</span>;
    if (row.status === "approved") return <button type="button" disabled={busy} onClick={() => void choose(row, "revoke")}>승인 취소</button>;
    return <button type="button" disabled={busy || row.userId === actorId} onClick={() => void choose(row, "signup")}>가입승인</button>;
  };
  const columns: ListColumnDef<Qualification>[] = [
    { key: "name", header: "회원", stickyOnMobile: true, render: (_value, row) => <div><strong>{row.name}</strong>{row.email && <p className="text-sm text-slate-500">{row.email}</p>}</div> },
    { key: "accountStatus", header: "계정 상태", render: (value) => value ?? "확인 필요" },
    { key: "status", header: "약사 자격", render: (value) => labels[value] ?? "확인 필요" },
    { key: "licenseNumber", header: "면허번호", render: (value) => value || "미등록" },
    { key: "reason", header: "처리 사유", render: (value) => value || "—" },
    { key: "actions", header: "처리", render: (_value, row) => actions(row) },
  ];
  const route = selected && memberDetail ? signupDecision(memberDetail, selected.row, canManageMembers) : null;
  const decide = async (decision: Decision) => {
    if (
      !selected ||
      !memberDetail || !route || reading || editing || memberDetail.member.operatorReadOnly ||
      locked.current ||
      !reason.trim() ||
      (decision === "approve" && (!route.canApprove || (route.needsEvidence && !checked))) ||
      (decision === "reject" && !route.canReject)
    )
      return;
    const viaRegistration = decision !== "revoke" && route.viaRegistration;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      if (viaRegistration) {
        await authClient.api.post(
          `/member-registration/members/${encodeURIComponent(selected.row.userId)}/${decision}`,
          { version: memberDetail.member.version, reason: reason.trim() },
        );
      } else {
        await authClient.api.post(
          `${base}/${encodeURIComponent(selected.row.userId)}`,
          {
            action: decision,
            reason: reason.trim(),
            version: selected.row.version,
            ...(decision === "approve"
              ? { licenseEvidenceChecked: true }
              : {}),
          },
        );
      }
      closeReview();
      setNotice(
        viaRegistration
          ? (decision === "approve" ? "가입 승인을 저장했습니다." : "가입 반려를 저장했습니다.")
          : "자격 검토 결과를 저장했습니다. 공통 계정 상태는 변경하지 않았습니다.",
      );
      await load();
    } catch (failure) {
      const serverError = (failure as { response?: { data?: { error?: unknown } } }).response?.data?.error;
      closeReview();
      setRows([]);
      setError(
        typeof serverError === "string"
          ? serverError
          : "처리하지 못했습니다. 신청 정보·검토 권한을 다시 조회해 주시기 바랍니다.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  return (
    <section className="central-qualification space-y-4">
      <h2 className="text-xl font-bold">{directory ? "전체 공통 회원" : "회원 가입 승인"}</h2>
      <p>
        {directory ? 'O4O 공통 계정과 자격 상태를 조회합니다. 전문 자격과 사업 참여 승인은 별도로 유지됩니다.' : <>가입을 신청한 회원의 정보를 확인하고, 필요하면 수정한 뒤 승인 또는 반려합니다. 처리 사유는 이력에 남습니다. 약사 면허가 포함된 가입은 면허 근거를 별도로 확인합니다. 기존 분회·약국 승인 자료는 자동으로 자격 승인되지 않습니다.</>}
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
      {notice && !selected && <output className="block rounded border border-green-200 bg-green-50 p-3">{notice}</output>}
      {!directory && !selectedRow?.operatorReadOnly && selectedKeys.size > 0 && <ActionBar selectedCount={selectedKeys.size} onClearSelection={() => { setSelectedKeys(new Set()); closeReview(); }} actions={[
        { key: "signup", label: "가입승인", visible: selectedRow?.status !== "approved", disabled: busy || !selectedRow || selectedRow.userId === actorId, onClick: () => { if (selectedRow) void choose(selectedRow, "signup"); } },
        { key: "revoke", label: "승인 취소", visible: selectedRow?.status === "approved", disabled: busy, onClick: () => { if (selectedRow) void choose(selectedRow, "revoke"); } },
      ]} />}
      {directory && selectedKeys.size > 0 && <ActionBar selectedCount={selectedKeys.size} onClearSelection={() => { setSelectedKeys(new Set()); closeReview(); }} actions={[{key:'review',label:'선택 회원 상세',disabled:!selectedRow,onClick:()=>{if(selectedRow)setDetail(selectedRow);}}]} />}
      {selectedKeys.size > 1 && <p className="text-sm text-slate-600">회원 정보와 사유를 회원별로 확인하도록 가입승인할 회원 한 명을 선택해 주시기 바랍니다.</p>}
      <DataTable<Qualification> tableId={directory ? "central-common-members" : "central-pharmacist-qualifications"} columns={directory ? [...columns.filter(column => !["licenseNumber", "reason", "actions"].includes(column.key)),{key:"operatorReadOnly",header:"업무 대상",render:(_value:unknown,row:Qualification)=>row.operatorReadOnly?"전체 관리자 — 처리 대상 아님":"회원"}] : columns} data={rows} rowKey="userId" loading={loading} emptyMessage={error ? "조회에 실패했습니다. 새로고침으로 다시 확인해 주시기 바랍니다." : "현재 조건에 해당하는 회원이 없습니다."} onRowClick={directory ? row => setDetail(row) : undefined} selectable selectedKeys={selectedKeys} onSelectionChange={(keys) => { if (!busy) { setSelectedKeys(keys); closeReview(); } }} reorderable persistState columnVisibility />
      {directory && <BaseDetailDrawer open={!!detail} title="공통 회원 상세" onClose={() => setDetail(null)}>{detail && <section className="space-y-3"><p>{detail.name} · {detail.email}</p><p>계정 상태: {detail.accountStatus}</p>{detail.operatorReadOnly && <p>전체 관리자 — 처리 대상 아님</p>}<p>약사 자격: {labels[detail.status] ?? detail.status}</p>{onReview && !detail.operatorReadOnly && <button type="button" onClick={() => onReview(detail.userId)}>약사 자격 검토로 이동</button>}</section>}</BaseDetailDrawer>}
      <nav>
        <button disabled={busy || page === 1} onClick={() => setPage(page - 1)}>
          이전
        </button>
        <span>{page} 페이지</span>
        <button disabled={busy || !hasNext} onClick={() => setPage(page + 1)}>
          다음
        </button>
      </nav>
      {selected && <BaseDetailDrawer open title={selected.action === "revoke" ? "약사 자격 승인 취소" : "가입승인"} onClose={() => { if (!busy) closeReview(); }}>
      <div className="space-y-4">
        {reading && <output>회원 제출 정보를 확인하는 중…</output>}
        {error && <p role="alert">{error}</p>}
        {notice && <output className="block rounded border border-green-200 bg-green-50 p-3">{notice}</output>}
        {memberDetail && (editing
          ? <MemberProfileForm key={detailRevision} detail={memberDetail} editing busy={busy} perform={performEdit} onCancel={() => setEditing(false)} onBusyChange={setBusy} onAccessLost={closeReview} />
          : <MemberReviewInformation key={detailRevision} detail={memberDetail} busy={busy} onBusyChange={setBusy} onAccessLost={closeReview} />)}
        {memberDetail?.member.operatorReadOnly && <p>전체 관리자 — 처리 대상 아님</p>}
        {memberDetail && route && !memberDetail.member.operatorReadOnly && !editing && <div className="space-y-3 rounded border bg-white p-5">
          <h3>
            {selected.row.name}{selected.row.licenseNumber ? ` · 면허번호 ${selected.row.licenseNumber}` : ""}
          </h3>
          {canManageMembers && selected.action === "signup" && <button type="button" disabled={busy} onClick={() => { setNotice(""); setError(""); setEditing(true); }}>정보 수정</button>}
          {route.registrationBlocked && <p>가입 승인은 공통 회원 관리 업무 위임이 필요합니다.</p>}
          {selected.action === "signup" && !route.viaRegistration && (route.canApprove || route.canReject) && <p>이 처리는 약사 자격에만 적용되며 공통 계정·가입 상태는 변경하지 않습니다.</p>}
          {selected.action === "signup" && !route.canApprove && !route.canReject
            ? <>
                {!route.registrationBlocked && <p>처리할 가입 신청이 없습니다.</p>}
                <button type="button" disabled={busy} onClick={closeReview}>닫기</button>
              </>
            : <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
                <label className="block">
                  {selected.action === "revoke" ? "승인 취소 사유" : "신청자에게 안내할 확인·반려 사유"}{" "}
                  <textarea
                    required
                    maxLength={2000}
                    className="block w-full rounded border p-2"
                    disabled={busy}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                {selected.action === "signup" && route.canApprove && route.needsEvidence && (
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
                <div className="flex flex-wrap gap-3">
                  {selected.action === "revoke"
                    ? <button type="button" disabled={busy || reading || !reason.trim()} onClick={() => void decide("revoke")}>승인 취소 저장</button>
                    : <>
                        {route.canApprove && <button type="button" disabled={busy || reading || !reason.trim() || (route.needsEvidence && !checked)} onClick={() => void decide("approve")}>승인</button>}
                        {route.canReject && <button type="button" disabled={busy || reading || !reason.trim()} onClick={() => void decide("reject")}>반려</button>}
                      </>}
                  <button type="button" disabled={busy} onClick={closeReview}>닫기</button>
                </div>
              </form>}
        </div>}
      </div>
      </BaseDetailDrawer>}
    </section>
  );
}
