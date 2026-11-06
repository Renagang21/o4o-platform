import {useEffect,useRef,useState} from 'react';
import {authClient} from '@o4o/auth-client';
import {memberError,type MemberDetail} from './member-workspace-model';
export default function TemporaryPasswordIssue({detail,busy,onBusyChange,onFinished,onAccessLost}:{onAccessLost:()=>void;detail:MemberDetail;busy:boolean;onBusyChange:(value:boolean)=>void;onFinished:()=>void}){
  const [open,setOpen]=useState(false),[reason,setReason]=useState(''),[confirmed,setConfirmed]=useState(false),[error,setError]=useState('');
  const [issued,setIssued]=useState<{temporaryPassword:string;expiresAt:string}|null>(null);
  const active=useRef(true),lock=useRef(false);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  return <section className="border-t pt-3" aria-label="임시 비밀번호">
    {!open?<button type="button" disabled={busy} onClick={()=>setOpen(true)}>임시 비밀번호 발급</button>:issued?<div className="space-y-2">
      <p>임시 비밀번호 · 24시간 유효</p><output aria-label="발급된 임시 비밀번호" className="block break-all rounded border bg-white p-3 font-mono">{issued.temporaryPassword}</output>
      <p className="text-sm">회원에게 안전하게 전달해 주시기 바랍니다. 로그인 후 My Home에서 변경할 수 있습니다.</p>
      <button type="button" disabled={busy} onClick={()=>{setIssued(null);onFinished();}}>확인 완료</button>
    </div>:<form className="space-y-2" onSubmit={async event=>{
      event.preventDefault();if(busy||lock.current||!confirmed||!reason.trim())return;
      lock.current=true;onBusyChange(true);setError('');
      try{
        const response=await authClient.api.post(`/qualifications/pharmacist/members/${encodeURIComponent(detail.member.userId)}/temporary-password`,{version:detail.member.version,reason:reason.trim(),evidenceConfirmed:true});
        const data=response.data?.data;
        if(!data?.temporaryPassword||!data.expiresAt)throw new Error('INVALID_RESPONSE');
        if(active.current)setIssued(data);
      }catch(failure){if(active.current){if([401,403].includes((failure as {response?:{status?:number}}).response?.status??0))onAccessLost();else setError(memberError(failure));}}
      finally{lock.current=false;if(active.current)onBusyChange(false);}
    }}>
      <label className="block text-sm">발급 사유<input required disabled={busy} maxLength={2000} className="block w-full rounded border p-2" value={reason} onChange={event=>setReason(event.target.value)}/></label>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event=>setConfirmed(event.target.checked)}/>본인 요청과 비밀번호 전달 대상을 확인했습니다.</label>
      <button type="submit" disabled={busy||!confirmed||!reason.trim()}>발급</button><button type="button" disabled={busy} onClick={()=>setOpen(false)}>취소</button>
    </form>}
    {error&&<p role="alert">{error}</p>}
  </section>;
}
