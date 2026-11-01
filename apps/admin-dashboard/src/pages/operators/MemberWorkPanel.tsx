import { useState } from 'react';
import { authClient } from '@o4o/auth-client';
import { canActivatePharmacy, memberError, pharmacyActions, pharmacyLabels, qualificationLabels, type MemberDetail, type MemberPharmacy } from './member-workspace-model';

const base = '/qualifications/pharmacist';
function fieldText(value: unknown): string {
  if (typeof value === 'boolean') return value ? '확인' : '미확인';
  if (typeof value === 'string') return value || '미입력';
  if (typeof value === 'number') return value.toString();
  return '미입력';
}
function Field({ label, value }: Readonly<{ label: string; value: unknown }>) {
  return <div className="min-w-0"><dt className="text-sm text-slate-600">{label}</dt><dd className="break-words whitespace-pre-wrap">{fieldText(value)}</dd></div>;
}
function pharmacyGuidance(detail: MemberDetail, pharmacy: MemberPharmacy) {
  if (!detail.permissions.qualifications) return '약사 자격 담당자의 확인이 필요합니다. 현재 화면의 권한만으로 승인 가능 여부를 확정할 수 없습니다.';
  if (!canActivatePharmacy(detail, pharmacy)) return '약국 승인·재개 전에 이메일 확인과 신청 면허번호에 일치하는 약사 자격 승인이 필요합니다.';
  return '일치하는 약사 자격이 승인됐습니다. 제출 사업자 정보와 약국 여부를 확인한 후 처리해 주세요.';
}
const actionLabels: Record<string, string> = {
  'member.profile_corrected': '기본정보 정정', 'qualification.pharmacist_requested': '약사 자격 신청',
  'qualification.pharmacist_approved': '약사 자격 승인', 'qualification.pharmacist_rejected': '약사 자격 반려', 'qualification.pharmacist_revoked': '약사 자격 승인 취소',
};
const legacyBusinessLabels: Record<string, string> = { name: '과거 사업장명', businessNumber: '과거 사업자번호', representativeName: '과거 대표자명', businessType: '과거 업태', businessCategory: '과거 종목', businessEntityType: '과거 사업자 구분', businessStartDate: '과거 개업일', address: '과거 주소', addressDetail: '과거 상세 주소', contactName: '과거 담당자', managerPhone: '과거 담당자 전화번호', taxInvoiceEmail: '과거 세금계산서 이메일' };
type Decision = { kind: 'qualification' | 'pharmacy'; action: string; label: string; pharmacyId?: string };
export default function MemberWorkPanel({ detail, actorId, busy, perform }: Readonly<{
  detail: MemberDetail; actorId: string; busy: boolean; perform: (work: () => Promise<unknown>) => Promise<void>;
}>) {
  const { member, qualification, permissions } = detail;
  const [decision, setDecision] = useState<Decision | null>(null), [reason, setReason] = useState(''), [confirmed, setConfirmed] = useState(false);
  const [editing, setEditing] = useState(false), [name, setName] = useState(member.name ?? ''), [nickname, setNickname] = useState(member.nickname ?? ''), [phone, setPhone] = useState(member.phone ?? '');
  const [documentError, setDocumentError] = useState('');
  const choose = (next: Decision) => { setDecision(next); setEditing(false); setReason(''); setConfirmed(false); };
  const download = async (id: string) => {
    setDocumentError('');
    try {
      const response = await authClient.api.get(`/neture/operator/pharmacy-documents/${encodeURIComponent(id)}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a'); link.href = url; link.download = 'business-registration'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setDocumentError(memberError(error)); }
  };
  return <div className="space-y-5">
    <h4 className="font-bold">{member.name || '회원'} · {member.email}</h4>
    <dl className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <Field label="이름" value={member.name} /><Field label="닉네임" value={member.nickname} /><Field label="휴대전화" value={member.phone} />
      <Field label="계정 상태" value={member.accountStatus} /><Field label="이메일 확인" value={member.emailVerified} /><Field label="가입일" value={member.joinedAt} />
    </dl>
    {permissions.edit && <button type="button" disabled={busy} onClick={() => { setEditing(true); setDecision(null); setReason(''); }}>기본정보 정정</button>}
    <section className="space-y-2"><h4 className="font-semibold">약사 자격과 면허 입력 출처</h4>
      {permissions.qualifications ? <>
        <dl className="grid grid-cols-1 gap-3 md:grid-cols-3"><Field label="약사 자격 상태" value={qualificationLabels[qualification?.status ?? 'unrequested']} /><Field label="자격 신청 면허번호" value={qualification?.licenseNumber} /><Field label="과거 가입 면허번호 · 미검증 자료" value={detail.legacyLicense} /><Field label="자격 처리 사유" value={qualification?.reason} /><Field label="자격 승인일" value={qualification?.approvedAt} /><Field label="자격 승인 처리자" value={qualification?.reviewedBy} /></dl>
        {detail.legacyLicense && qualification?.licenseNumber && detail.legacyLicense.trim() !== qualification.licenseNumber.trim() && <p role="note">과거 가입 자료와 자격 신청 면허번호가 다릅니다. 출처를 확인하고 본인에게 정정을 요청해 주세요.</p>}
        {!qualification && <p>본인 자격 신청이 없습니다. 회원은 Neture의 내 설정 → 약사 자격에서 신청할 수 있습니다. 과거 자료나 약국 신청만으로 자동 승인하지 않습니다.</p>}
        {qualification && ['rejected', 'revoked'].includes(qualification.status) && <p>회원은 Neture의 내 설정 → 약사 자격에서 사유를 확인하고 면허 정보를 보완해 다시 신청할 수 있습니다. 반려·승인 취소는 공통 계정을 삭제하지 않습니다.</p>}
        {qualification && <div className="flex flex-wrap gap-3">
          {qualification.status !== 'approved' && <button type="button" disabled={busy || !qualification.licenseNumber || actorId === member.userId || !member.emailVerified || !['active', 'approved'].includes(member.accountStatus)} onClick={() => choose({ kind: 'qualification', action: 'approve', label: '약사 자격 승인' })}>약사 자격 승인 검토</button>}
          {['pending', 'unrequested'].includes(qualification.status) && <button type="button" disabled={busy} onClick={() => choose({ kind: 'qualification', action: 'reject', label: '약사 자격 반려' })}>약사 자격 반려</button>}
          {qualification.status === 'approved' && <button type="button" disabled={busy} onClick={() => choose({ kind: 'qualification', action: 'revoke', label: '약사 자격 승인 취소' })}>약사 자격 승인 취소</button>}
        </div>}
      </> : <p>면허번호와 자격 심사 사유는 약사 자격 검토 권한이 있는 담당자만 확인할 수 있습니다.</p>}
    </section>
    <section className="space-y-3"><h4 className="font-semibold">약국경영자 신청</h4>
      {permissions.applications && detail.legacyBusiness && <section><h5 className="font-semibold">과거 Neture 가입 사업자 정보 · 미검증 자료</h5><p>기존 서비스 가입 검토 권한으로 조회합니다. 현재 약국 신청·승인과 구분하며 과거 정보만으로 사업 권한을 부여하지 않습니다.</p><dl className="grid grid-cols-1 gap-3 md:grid-cols-3">{Object.entries(legacyBusinessLabels).filter(([key]) => detail.legacyBusiness?.[key]).map(([key, label]) => <Field key={key} label={label} value={detail.legacyBusiness?.[key]} />)}</dl></section>}
      {!permissions.pharmacies && <p>약국 신청·증빙은 약국 심사 권한이 필요합니다.</p>}
      {permissions.pharmacies && detail.pharmacies.length === 0 && <p>약국 신청이 없습니다. 신청자는 내 매장 시작 → 약국 신청에서 사업 정보를 제출할 수 있습니다.</p>}
      {permissions.pharmacies && detail.pharmacies.map(pharmacy => <section key={pharmacy.id} aria-label={`약국 신청 ${pharmacy.name}`} className="rounded border bg-white p-3 space-y-3">
        <h5 className="font-bold">{pharmacy.name} · {pharmacyLabels[pharmacy.status] ?? pharmacy.status}</h5>
        <dl className="grid grid-cols-1 gap-3 md:grid-cols-3">{([
          ['사업자등록번호', pharmacy.businessNumber], ['약국 신청 면허번호', pharmacy.licenseNumber], ['대표자명', pharmacy.representativeName],
          ['업태', pharmacy.businessType], ['종목', pharmacy.businessCategory], ['사업장 주소', pharmacy.address], ['약국 전화번호', pharmacy.phone],
          ['담당자 이름', pharmacy.contactName], ['담당자 전화번호', pharmacy.managerPhone], ['담당자 이메일', pharmacy.contactEmail], ['세금계산서 이메일', pharmacy.taxInvoiceEmail],
          ['약국 신청일', pharmacy.appliedAt], ['약국 처리일', pharmacy.decidedAt], ['약국 처리자', pharmacy.decidedBy], ['약국 처리 사유', pharmacy.reason],
        ] as const).map(([label, value]) => <Field key={label} label={label} value={value} />)}</dl>
        {pharmacy.documentId ? <button type="button" disabled={busy} onClick={() => void download(pharmacy.documentId!)}>사업자등록증 확인</button> : <p>사업자등록증 첨부 없음 · 선택 제출 항목</p>}
        {['pending', 'suspended'].includes(pharmacy.status) && <p>{pharmacyGuidance(detail, pharmacy)} 서버가 최신 가입·권한·자격을 다시 확인합니다.</p>}
        <div className="flex flex-wrap gap-3">{(pharmacyActions[pharmacy.status] ?? []).map(action => <button type="button" key={action.action} disabled={busy || (permissions.qualifications && ['approve', 'reactivate'].includes(action.action) && !canActivatePharmacy(detail, pharmacy))} onClick={() => choose({ kind: 'pharmacy', ...action, pharmacyId: pharmacy.id })}>{action.label}</button>)}</div>
        {pharmacy.status === 'rejected' && <p>신청자는 반려 사유를 확인하고 내 매장 → 약국 신청에서 자료를 보완해 다시 신청할 수 있습니다.</p>}
      </section>)}
      {documentError && <p role="alert">{documentError}</p>}
    </section>
    {(decision || editing) && <form className="rounded border bg-white p-4 space-y-3" onSubmit={event => {
      event.preventDefault();
      if (busy || !reason.trim() || (decision?.action === 'approve' && !confirmed)) return;
      if (editing) void perform(() => authClient.api.patch(`${base}/members/${encodeURIComponent(member.userId)}`, { name: name.trim(), nickname: nickname.trim(), phone: phone.trim(), reason: reason.trim(), version: member.version }));
      else if (decision?.kind === 'qualification') void perform(() => authClient.api.post(`${base}/review/${encodeURIComponent(member.userId)}`, { action: decision.action, reason: reason.trim(), version: qualification!.version, ...(decision.action === 'approve' ? { licenseEvidenceChecked: true } : {}) }));
      else if (decision?.pharmacyId) void perform(() => authClient.api.post(`/neture/operator/pharmacy-memberships/${encodeURIComponent(decision.pharmacyId!)}/${decision.action}`, { reason: reason.trim() }));
    }}>
      <h4 className="font-bold">{editing ? '기본정보 정정' : decision?.label}</h4>
      {editing && <><p>이름·닉네임·휴대전화만 정정합니다. 이메일·계정 상태·면허·약국 심사는 별도 절차입니다.</p><label className="block">이름<input required maxLength={50} disabled={busy} value={name} onChange={event => setName(event.target.value)} /></label><label className="block">닉네임<input maxLength={50} disabled={busy} value={nickname} onChange={event => setNickname(event.target.value)} /></label><label className="block">휴대전화<input type="tel" maxLength={20} disabled={busy} value={phone} onChange={event => setPhone(event.target.value)} /></label></>}
      <label className="block">처리·보완 사유<textarea required maxLength={2000} disabled={busy} className="block w-full rounded border p-2" value={reason} onChange={event => setReason(event.target.value)} /></label>
      {decision?.action === 'approve' && <label className="block"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />{decision.kind === 'qualification' ? '신청자 본인의 면허 근거를 별도로 확인했습니다.' : '신청자와 약국·사업자 정보 및 승인 조건을 확인했습니다.'}</label>}
      <button type="submit" disabled={busy || !reason.trim() || (editing && !name.trim()) || (decision?.action === 'approve' && !confirmed)}>{busy ? '처리 중…' : '처리 결과 저장'}</button><button type="button" disabled={busy} onClick={() => { setDecision(null); setEditing(false); setReason(''); }}>취소</button>
    </form>}
    <section><h4 className="font-semibold">최근 처리 이력</h4>{detail.history.length === 0 ? <p>조회 가능한 처리 이력이 없습니다. 약국 처리 정보는 해당 신청에 표시됩니다.</p> : <ol className="space-y-2">{detail.history.map((item, index) => <li key={`${item.createdAt}:${index}`} className="break-words">{item.createdAt} · {actionLabels[item.action] ?? '회원 업무 처리'} · 처리자 {item.actorId ?? '시스템'}{item.reason && <p>사유: {item.reason}</p>}</li>)}</ol>}</section>
  </div>;
}
