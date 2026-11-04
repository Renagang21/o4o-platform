import {useEffect,useRef,useState} from 'react';
import {authClient} from '@o4o/auth-client';
import {memberError,type MemberDetail} from './member-workspace-model';
import TemporaryPasswordIssue from './TemporaryPasswordIssue';
const inputClass='block w-full rounded border border-slate-300 bg-white px-3 py-2 read-only:bg-slate-50 disabled:opacity-60';
export default function MemberProfileForm({detail,editing,busy,perform,onCancel,onBusyChange,onAccessLost}:{onAccessLost:()=>void;detail:MemberDetail;editing:boolean;busy:boolean;perform:(work:()=>Promise<unknown>)=>Promise<void>;onCancel:()=>void;onBusyChange:(value:boolean)=>void}){
  const {member,qualification,permissions}=detail;
  const active=useRef(true);useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  const [fields,setFields]=useState({name:member.name??'',nickname:member.nickname??'',email:member.email,phone:member.phone??'',licenseNumber:qualification?.licenseNumber??''});
  const [mailNotice,setMailNotice]=useState('');
  const [reason,setReason]=useState(''),[evidence,setEvidence]=useState(false);
  const changedIdentity=fields.email.trim()!==member.email || fields.licenseNumber.trim()!==(qualification?.licenseNumber??'');
  return <div className="space-y-3">
    <form aria-label={editing?'회원 정보 수정':'회원 정보 보기'} className="space-y-3" onSubmit={event=>{
      event.preventDefault();if(!editing||busy||!reason.trim()||(changedIdentity&&!evidence))return;
      void perform(()=>authClient.api.patch(`/qualifications/pharmacist/members/${encodeURIComponent(member.userId)}`,{name:fields.name.trim(),nickname:fields.nickname.trim(),email:fields.email.trim(),phone:fields.phone.trim(),reason:reason.trim(),version:member.version,...(permissions.qualifications?{licenseNumber:fields.licenseNumber.trim(),qualificationVersion:qualification?.version??null}:{}),evidenceConfirmed:evidence}));
    }}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{(['name','nickname','email','phone',...(permissions.qualifications?['licenseNumber']:[])] as Array<keyof typeof fields>).map(key=><label key={key} className="block text-sm">{({name:'이름',nickname:'닉네임',email:'이메일',phone:'휴대전화',licenseNumber:'약사 면허번호'})[key]}<input className={inputClass} type={key==='email'?'email':key==='phone'?'tel':'text'} required={['name','email'].includes(key)} maxLength={key==='email'?255:key==='phone'?20:key==='licenseNumber'?100:50} readOnly={!editing} disabled={busy} value={fields[key]} onChange={event=>{setFields({...fields,[key]:event.target.value});setEvidence(false);}} /></label>)}</div>
      {editing && <>
        <label className="block text-sm">수정 사유<textarea required maxLength={2000} disabled={busy} className={inputClass} value={reason} onChange={event=>setReason(event.target.value)}/></label>
        {changedIdentity && <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={evidence} disabled={busy} onChange={event=>setEvidence(event.target.checked)}/>이메일·면허 정정 근거를 확인했습니다.</label>}
        {fields.email.trim()!==member.email && <p className="text-sm text-amber-800">변경한 이메일은 다시 확인해야 합니다.</p>}
        {fields.licenseNumber.trim()!==(qualification?.licenseNumber??'') && <p className="text-sm text-amber-800">변경한 면허는 다시 심사합니다.</p>}
        <div className="flex gap-3"><button type="submit" className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50" disabled={busy||!reason.trim()||(changedIdentity&&!evidence)}>회원 정보 저장</button><button type="button" disabled={busy} onClick={onCancel}>취소</button></div>
      </>}
    </form>
    {!member.emailVerified&&<div className="text-sm"><button type="button" disabled={busy} onClick={async()=>{
      onBusyChange(true);setMailNotice('');
      try{await authClient.api.post('/auth/email/resend',{email:member.email});if(active.current)setMailNotice('확인 메일 요청을 접수했습니다.');}
      catch(error){if(active.current){if([401,403].includes((error as {response?:{status?:number}}).response?.status??0))onAccessLost();else setMailNotice(memberError(error));}}finally{if(active.current)onBusyChange(false);}
    }}>확인 메일 보내기</button>{mailNotice&&<output className="block">{mailNotice}</output>}</div>}
    {editing && member.hasPassword!==false && <TemporaryPasswordIssue onAccessLost={onAccessLost} detail={detail} busy={busy} onBusyChange={onBusyChange} onFinished={()=>{void perform(async()=>undefined);}}/>}
  </div>;
}
