import MemberProfileForm from './MemberProfileForm';
import MemberLifecycleActions from './MemberLifecycleActions';
import MemberBusinessEditor from './MemberBusinessEditor';
import AccountErasureControls from '../platform/account-governance/AccountErasureControls';
import { useState } from 'react';
import { authClient } from '@o4o/auth-client';
import { canActivatePharmacy, memberError, memberServiceLabels, pharmacyActions, pharmacyLabels, qualificationLabels, type MemberDetail, type MemberPharmacy, type MemberWorkMode } from './member-workspace-model';

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
type Decision = { kind: 'qualification' | 'pharmacy' | 'account'; action: string; label: string; pharmacyId?: string };
export default function MemberWorkPanel({ detail, actorId, busy, perform, onBusyChange, mode='detail', adminMode=false, onErasureResult,onModeChange,onAccessLost }: Readonly<{
  onAccessLost:()=>void;onModeChange:(mode:MemberWorkMode)=>void; onErasureResult?:(result:import('@/types/user').UserErasureResult)=>void; adminMode?:boolean; onBusyChange:(busy:boolean)=>void; mode?:MemberWorkMode; detail: MemberDetail; actorId: string; busy: boolean; perform: (work: () => Promise<unknown>) => Promise<void>;
}>) {
  const { member, qualification, permissions } = detail;
  const [decision, setDecision] = useState<Decision | null>(mode==='reject'?{kind:'account',action:'reject',label:'가입 거부'}:null), [reason, setReason] = useState(''), [confirmed, setConfirmed] = useState(false);
  const editing=mode==='edit'&&permissions.edit;
  const setEditing=(value:boolean)=>onModeChange(value?'edit':'detail');
  const [businessEditing,setBusinessEditing]=useState<string|null>(null);
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
    {adminMode && mode==='delete' && <section aria-label="계정·개인자료 완전삭제" className="rounded border border-red-300 bg-white p-4 space-y-3"><h4 className="font-semibold">계정·개인자료 완전삭제</h4><p>이용 정지는 접근을 차단하고 자료를 유지합니다. 완전삭제는 계정과 개인 자료를 삭제합니다. 직원의 업무 자료는 사업체에 남습니다. 약국 매도는 경영자 이전, 완전폐업은 약국 자료 삭제로 처리하며 공급자 제품·거래 자료는 별도로 처리합니다.</p>{permissions.erase && actorId!==member.userId?<AccountErasureControls onResult={onErasureResult} onBusyChange={onBusyChange} accountId={actorId} userId={member.userId} onCompleted={()=>{void perform(async()=>undefined);}}/>:<p>전체 관리자 권한이 필요하며 본인 계정은 여기서 삭제할 수 없습니다.</p>}</section>}
    {mode==='delete' && <MemberLifecycleActions adminMode={adminMode} initialAction={!adminMode&&mode==='delete'?'terminate':null} detail={detail} actorId={actorId} busy={busy} perform={perform} />}
    <h4 className="font-bold">{member.name || '회원'} · {member.email}</h4>
    <MemberProfileForm onAccessLost={onAccessLost} detail={detail} editing={editing} busy={busy} perform={perform} onCancel={()=>setEditing(false)} onBusyChange={onBusyChange}/>
    <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm"><Field label="Neture 이용" value={memberServiceLabels[member.serviceStatus??'']??'확인 필요'}/><Field label="공통 계정 상태" value={member.accountActive===false?'비활성':(memberServiceLabels[member.accountStatus]??member.accountStatus)}/><Field label="이메일 확인" value={member.emailVerified}/></dl>
    {!editing&&permissions.edit&&<button type="button" disabled={busy} onClick={()=>setEditing(true)}>수정</button>}
    <section className="space-y-2"><h4 className="font-semibold">약사 자격</h4>
      {permissions.qualifications ? <>
        <dl className="grid grid-cols-1 gap-3 md:grid-cols-3"><Field label="약사 자격 상태" value={qualificationLabels[qualification?.status ?? 'unrequested']} />{qualification?.reason&&<Field label="자격 처리 사유" value={qualification.reason} />}{qualification?.approvedAt&&<Field label="자격 승인일" value={qualification.approvedAt} />}</dl>
        {!editing && qualification && <div className="flex flex-wrap gap-3">
          {qualification.status !== 'approved' && <button type="button" disabled={busy || !qualification.licenseNumber || actorId === member.userId || !member.emailVerified || !['active', 'approved'].includes(member.accountStatus)} onClick={() => choose({ kind: 'qualification', action: 'approve', label: '약사 자격 승인' })}>약사 자격 승인 검토</button>}
          {['pending', 'unrequested'].includes(qualification.status) && <button type="button" disabled={busy} onClick={() => choose({ kind: 'qualification', action: 'reject', label: '약사 자격 반려' })}>약사 자격 반려</button>}
          {qualification.status === 'approved' && <button type="button" disabled={busy} onClick={() => choose({ kind: 'qualification', action: 'revoke', label: '약사 자격 승인 취소' })}>약사 자격 승인 취소</button>}
        </div>}
      </> : <p>면허번호와 자격 심사 사유는 약사 자격 검토 권한이 있는 담당자만 확인할 수 있습니다.</p>}
    </section>
    <section className="space-y-3"><h4 className="font-semibold">약국경영자 신청</h4>
      {permissions.applications&&detail.legacyBusiness&&<details><summary>기존 가입 사업자 정보</summary><dl className="grid grid-cols-1 gap-3 md:grid-cols-3">{Object.entries(legacyBusinessLabels).filter(([key])=>detail.legacyBusiness?.[key]).map(([key,label])=><Field key={key} label={label} value={detail.legacyBusiness?.[key]}/>)}</dl></details>}
      {permissions.edit && permissions.applications && detail.legacyBusiness && <button type="button" disabled={busy} onClick={()=>setBusinessEditing('legacy')}>기존 사업자 정보 수정</button>}
      {businessEditing==='legacy' && <MemberBusinessEditor detail={detail} busy={busy} perform={perform} onCancel={()=>setBusinessEditing(null)}/>}
      {!permissions.pharmacies && <p>약국 신청·증빙은 약국 심사 권한이 필요합니다.</p>}
      {permissions.pharmacies && detail.pharmacies.length === 0 && <p>약국 신청 없음</p>}
      {permissions.pharmacies && detail.pharmacies.map(pharmacy => <section key={pharmacy.id} aria-label={`약국 신청 ${pharmacy.name}`} className="rounded border bg-white p-3 space-y-3">
        <h5 className="font-bold">{pharmacy.name} · {pharmacyLabels[pharmacy.status] ?? pharmacy.status}</h5>
        <dl className="grid grid-cols-1 gap-3 md:grid-cols-3">{([
          ['사업자등록번호', pharmacy.businessNumber], ['약국 신청 면허번호', pharmacy.licenseNumber], ['대표자명', pharmacy.representativeName],
          ['업태', pharmacy.businessType], ['종목', pharmacy.businessCategory], ['사업장 주소', pharmacy.address], ['약국 전화번호', pharmacy.phone],
          ['담당자 이름', pharmacy.contactName], ['담당자 전화번호', pharmacy.managerPhone], ['담당자 이메일', pharmacy.contactEmail], ['세금계산서 이메일', pharmacy.taxInvoiceEmail],
          ['약국 신청일', pharmacy.appliedAt], ['약국 처리일', pharmacy.decidedAt], ['약국 처리자', pharmacy.decidedBy], ['약국 처리 사유', pharmacy.reason],
        ] as const).map(([label, value]) => <Field key={label} label={label} value={value} />)}</dl>
        {permissions.edit && <button type="button" disabled={busy || !pharmacy.version} onClick={()=>setBusinessEditing(pharmacy.id)}>약국·사업자 정보 수정</button>}
        {businessEditing===pharmacy.id && <MemberBusinessEditor detail={detail} pharmacy={pharmacy} busy={busy} perform={perform} onCancel={()=>setBusinessEditing(null)}/>}
        {pharmacy.documentId ? <button type="button" disabled={busy} onClick={() => void download(pharmacy.documentId!)}>사업자등록증 확인</button> : <p>사업자등록증 첨부 없음 · 선택 제출 항목</p>}
        {['pending', 'suspended'].includes(pharmacy.status) && <p>{pharmacyGuidance(detail, pharmacy)} 서버가 최신 가입·권한·자격을 다시 확인합니다.</p>}
        <div className="flex flex-wrap gap-3">{(pharmacyActions[pharmacy.status] ?? []).map(action => <button type="button" key={action.action} disabled={busy || (permissions.qualifications && ['approve', 'reactivate'].includes(action.action) && !canActivatePharmacy(detail, pharmacy))} onClick={() => choose({ kind: 'pharmacy', ...action, pharmacyId: pharmacy.id })}>{action.label}</button>)}</div>
        {pharmacy.status === 'rejected' && <p>신청자는 반려 사유를 확인하고 내 매장 → 약국 신청에서 자료를 보완해 다시 신청할 수 있습니다.</p>}
      </section>)}
      {documentError && <p role="alert">{documentError}</p>}
    </section>
    {detail.legacyLicense&&<details><summary>기존 가입 면허번호</summary><p>{detail.legacyLicense}</p></details>}
    {decision && <form className="rounded border bg-white p-4 space-y-3" onSubmit={event => {
      event.preventDefault();
      if (decision?.kind==='account' && (!permissions.manageAccount || member.accountStatus!=='pending'))return;
      if (busy || !reason.trim() || (decision?.action === 'approve' && !confirmed)) return;
      if(decision?.kind==='account')void perform(()=>authClient.api.post(`${base}/members/${encodeURIComponent(member.userId)}/reject-registration`,{reason:reason.trim(),version:member.version}));
      else if (decision?.kind === 'qualification') void perform(() => authClient.api.post(`${base}/review/${encodeURIComponent(member.userId)}`, { action: decision.action, reason: reason.trim(), version: qualification!.version, ...(decision.action === 'approve' ? { licenseEvidenceChecked: true } : {}) }));
      else if (decision?.pharmacyId) void perform(() => authClient.api.post(`/neture/operator/pharmacy-memberships/${encodeURIComponent(decision.pharmacyId!)}/${decision.action}`, { reason: reason.trim() }));
    }}>
      <h4 className="font-bold">{decision?.label}</h4>
      {decision?.kind==='account' && <p>대기 중인 계정 가입만 전체 관리자가 거부할 수 있습니다. 이미 활성화된 계정은 서비스별 이용 중지 절차를 사용합니다. 현재 계정 상태: {member.accountStatus}</p>}
      <label className="block">처리·보완 사유<textarea required maxLength={2000} disabled={busy} className="block w-full rounded border p-2" value={reason} onChange={event => setReason(event.target.value)} /></label>
      {decision?.action === 'approve' && <label className="block"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />{decision.kind === 'qualification' ? '신청자 본인의 면허 근거를 별도로 확인했습니다.' : '신청자와 약국·사업자 정보 및 승인 조건을 확인했습니다.'}</label>}
      <button type="submit" disabled={busy || (decision?.kind==='account' && (!permissions.manageAccount || member.accountStatus!=='pending' || actorId===member.userId)) || !reason.trim() || (decision?.action === 'approve' && !confirmed)}>{busy ? '처리 중…' : '처리 결과 저장'}</button><button type="button" disabled={busy} onClick={() => { setDecision(null); setEditing(false); setReason(''); }}>취소</button>
    </form>}
    <details><summary className="cursor-pointer text-sm">최근 처리 이력</summary>{detail.history.length === 0 ? <p>처리 이력이 없습니다.</p> : <ol className="space-y-2">{detail.history.map((item, index) => <li key={`${item.createdAt}:${index}`} className="break-words">{item.createdAt} · {actionLabels[item.action] ?? '회원 업무 처리'} · 처리자 {item.actorId ?? '시스템'}{item.reason && <p>사유: {item.reason}</p>}</li>)}</ol>}</details>
  </div>;
}
