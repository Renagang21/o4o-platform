import MemberProfileForm from './MemberProfileForm';
import { qualificationLabels, pharmacyLabels, type MemberDetail } from './member-workspace-model';

/** Read-only submitted and current information; the server retains field-level grants. */
export default function MemberReviewInformation({detail,busy,onBusyChange,onAccessLost}: Readonly<{
  detail:MemberDetail; busy:boolean; onBusyChange:(busy:boolean)=>void; onAccessLost:()=>void;
}>) {
  return <section className="space-y-4" aria-label="회원 전체 정보">
    <MemberProfileForm detail={detail} editing={false} busy={busy} perform={async()=>{}} onCancel={()=>{}} onBusyChange={onBusyChange} onAccessLost={onAccessLost} />
    <dl className="grid gap-2 sm:grid-cols-2">
      <div><dt>가입일</dt><dd>{detail.member.joinedAt?new Date(detail.member.joinedAt).toLocaleString('ko-KR'):'미등록'}</dd></div>
      {detail.member.loginMethods && <div><dt>로그인 방식</dt><dd>{detail.member.loginMethods.map(method=>({google:'Google',kakao:'카카오',email:'이메일'})[method]??'기타').join(' · ')||'미등록'}</dd></div>}
      <div><dt>계정 상태</dt><dd>{detail.member.accountStatus}</dd></div>
      <div><dt>이메일 확인</dt><dd>{detail.member.emailVerified?'완료':'미완료'}</dd></div>
      {detail.qualification && <><div><dt>현재 약사 면허번호</dt><dd>{detail.qualification.licenseNumber||'미등록'}</dd></div>
        <div><dt>현재 약사 자격</dt><dd>{qualificationLabels[detail.qualification.status]??detail.qualification.status}</dd></div>
        <div><dt>자격 처리 사유</dt><dd>{detail.qualification.reason||'없음'}</dd></div></>}
      {detail.legacyLicense && <div><dt>기존 입력 면허번호 (승인 근거 아님)</dt><dd>{detail.legacyLicense}</dd></div>}
    </dl>
    {detail.legacyBusiness && <details><summary>기존 사업자 입력 정보</summary><dl>{Object.entries(detail.legacyBusiness).map(([key,value])=><div key={key}><dt>{({name:'사업자명',businessNumber:'사업자등록번호',representativeName:'대표자',businessType:'업태',businessCategory:'종목',address:'주소',addressDetail:'상세 주소',contactName:'담당자',managerPhone:'담당자 연락처',taxInvoiceEmail:'세금계산서 이메일',businessEntityType:'사업자 유형',businessStartDate:'개업일'} as Record<string,string>)[key]??key}</dt><dd>{value}</dd></div>)}</dl></details>}
    {detail.pharmacies.map(pharmacy=><section key={pharmacy.id} className="rounded border p-3"><h4 className="font-semibold">현재 약국·사업체: {pharmacy.name}</h4><dl className="grid gap-2 sm:grid-cols-2">
      {Object.entries({상태:pharmacyLabels[pharmacy.status]??pharmacy.status,사업자등록번호:pharmacy.businessNumber,면허번호:pharmacy.licenseNumber,대표자:pharmacy.representativeName,주소:pharmacy.address,전화:pharmacy.phone,담당자:pharmacy.contactName,담당자연락처:pharmacy.managerPhone,담당자이메일:pharmacy.contactEmail,세금계산서이메일:pharmacy.taxInvoiceEmail}).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value||'미등록'}</dd></div>)}
    </dl></section>)}
  </section>;
}
