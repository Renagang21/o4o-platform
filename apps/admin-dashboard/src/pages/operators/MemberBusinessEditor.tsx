import {useState} from 'react';
import {authClient} from '@o4o/auth-client';
import type {MemberDetail,MemberPharmacy} from './member-workspace-model';
const fieldLimit=(key:string)=>key==='businessNumber'?13:['name','contactEmail','taxInvoiceEmail'].includes(key)?255:['address','addressDetail'].includes(key)?500:['phone','managerPhone'].includes(key)?50:['representativeName','businessType','businessCategory','contactName'].includes(key)?100:300;
const labels: Record<string,string>={name:'사업장명',businessNumber:'사업자등록번호',representativeName:'대표자명',businessType:'업태',businessCategory:'종목',address:'사업장 주소',phone:'약국 전화번호',contactName:'담당자 이름',managerPhone:'담당자 전화번호',contactEmail:'담당자 이메일',taxInvoiceEmail:'세금계산서 이메일',businessEntityType:'사업자 구분',businessStartDate:'개업일',addressDetail:'상세 주소'};
export default function MemberBusinessEditor({detail,pharmacy,busy,perform,onCancel}:{detail:MemberDetail;pharmacy?:MemberPharmacy;busy:boolean;perform:(work:()=>Promise<unknown>)=>Promise<void>;onCancel:()=>void}){
 const source=pharmacy ?? detail.legacyBusiness ?? {};
 const keys=['name','businessNumber','representativeName','businessType','businessCategory','address','contactName','managerPhone','taxInvoiceEmail',...(pharmacy?['phone','contactEmail']:['businessEntityType','businessStartDate','addressDetail'])];
 const [fields,setFields]=useState<Record<string,string>>(()=>Object.fromEntries(keys.map(key=>[key,String((source as unknown as Record<string,unknown>)[key]??'')])));
 const [reason,setReason]=useState(''),[confirmed,setConfirmed]=useState(false);
 return <form aria-label="사업자 정보 수정" className="space-y-3 rounded border bg-white p-4" onSubmit={event=>{
  event.preventDefault();if(busy || !reason.trim() || (pharmacy && !confirmed))return;
  const base=`/qualifications/pharmacist/members/${encodeURIComponent(detail.member.userId)}`;
  void perform(()=>authClient.api.patch(pharmacy?`${base}/pharmacies/${encodeURIComponent(pharmacy.id)}`:`${base}/legacy-business`,{fields:{...fields,businessNumber:fields.businessNumber.replace(/[ -]/g,'')},reason:reason.trim(),version:pharmacy?pharmacy.version:detail.member.version,...(pharmacy?{evidenceConfirmed:true}:{})}));
 }}>
  <h5 className="font-semibold">{pharmacy?'약국·사업자 정보 수정':'기존 가입 사업자 정보 수정'}</h5>
  <p className="text-sm">제출 자료를 확인하고 정정합니다. 약사 면허·승인 상태·등록증 파일은 이 수정으로 바뀌지 않습니다.</p>
  <div className="grid gap-3 md:grid-cols-2">{keys.map(key=><label key={key} className="block text-sm">{labels[key]}<input className="mt-1 block w-full rounded border p-2" required={['name','businessNumber'].includes(key)} maxLength={fieldLimit(key)} type={key.toLowerCase().includes('email')?'email':'text'} pattern={key==='businessNumber'?'[0-9]{3}-?[0-9]{2}-?[0-9]{5}':undefined} disabled={busy} value={fields[key]} onChange={event=>setFields(previous=>({...previous,[key]:event.target.value}))}/></label>)}</div>
  <label className="block">사업자 정보 정정 사유<textarea required maxLength={2000} disabled={busy} className="block w-full rounded border p-2" value={reason} onChange={event=>setReason(event.target.value)}/></label>
  {pharmacy && <label className="block"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event=>setConfirmed(event.target.checked)}/>사업자등록 정보와 정정 근거를 확인했습니다.</label>}
  <button type="submit" disabled={busy || !reason.trim() || (pharmacy && !confirmed)} className="rounded bg-blue-700 px-3 py-2 text-white">사업자 정보 저장</button>
  <button type="button" disabled={busy} onClick={onCancel} className="ml-2 rounded border px-3 py-2">정정 취소</button>
 </form>;
}
