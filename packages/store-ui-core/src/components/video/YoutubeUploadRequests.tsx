import { useEffect, useState } from 'react';
export interface YoutubeUploadRequest {id:string;name:string;state:'queued'|'uploading'|'processing'|'completed'|'failed'|'needs-review'|'cancelled';videoUrl?:string|null;errorCode?:string|null;organizationId?:string|null;serviceKey?:string}
export interface YoutubeUploadApi {
  enqueue:(input:import('./VideoRegistration').VideoRegistrationPayload)=>Promise<{id:string;name:string;queued:boolean;state?:YoutubeUploadRequest['state']}>;
  list:()=>Promise<{availability:{ready:boolean};items:YoutubeUploadRequest[]}>;
  retry:(id:string)=>Promise<unknown>;
  cancel?:(id:string)=>Promise<unknown>;
}
const labels={queued:'순서 대기',uploading:'업로드 준비·전송 중',processing:'YouTube 영상 처리 확인 중',completed:'목록 등록 완료',failed:'진행 실패 · 확인 필요','needs-review':'등록 결과·공유 설정 확인 필요',cancelled:'요청 취소'};
export function YoutubeUploadRequests({api,revision,onCompleted}:Readonly<{api:YoutubeUploadApi;revision:number;onCompleted:()=>void}>){
  const [items,setItems]=useState<YoutubeUploadRequest[]>([]),[error,setError]=useState(''),[ready,setReady]=useState<boolean|null>(null),[retry,setRetry]=useState(0),[busy,setBusy]=useState<string|null>(null);
  useEffect(()=>{
    let live=true,timer:ReturnType<typeof setTimeout>|undefined;
    const load=async()=>{
      try{const result=await api.list();if(!live)return;setReady(result.availability.ready);setItems(result.items);setError('');if(result.items.some(item=>['queued','uploading','processing'].includes(item.state)))timer=setTimeout(()=>void load(),15000);}
      catch{if(live)setError('YouTube 요청 상태를 확인하지 못했습니다. 새로 확인해 주세요.');}
    };void load();return()=>{live=false;clearTimeout(timer);};
  },[api,revision,retry]);
  useEffect(()=>{if(items.some(item=>item.state==='completed'))onCompleted();},[items,onCompleted]);
  const again=async(id:string)=>{if(busy)return;setBusy(id);try{await api.retry(id);setRetry(value=>value+1);}catch{setError('재시도하지 못했습니다. 결과 확인이 필요한 요청은 운영 채널에서 확인한 뒤 진행해 주세요.');}finally{setBusy(null);}};
  return <section aria-label="YouTube 등록 요청" className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
    <h4 className="font-semibold">YouTube 등록 요청</h4>
    <p>같은 채널의 요청을 하나씩 처리합니다. 화면을 닫아도 접수된 요청은 남으며, 실제 등록이 끝나면 알림을 보냅니다.</p>
    {ready===false&&<p className="text-amber-800">지금은 YouTube 자동 등록을 이용할 수 없습니다. O4O 보관 등록을 선택하거나 운영자에게 확인해 주세요.</p>}
    {error&&<p role="alert" className="text-red-700">{error}</p>}
    <ul className="space-y-2">{items.map(item=><li key={item.id} className="rounded border border-slate-300 bg-white p-3"><p className="break-words font-medium">{item.name}</p><output>{['YOUTUBE_RECONNECT_REQUIRED','YOUTUBE_NOT_CONNECTED','YOUTUBE_OAUTH_NOT_CONFIGURED','YOUTUBE_DELIVERY_UNAVAILABLE','YOUTUBE_DELIVERY_NOT_CONFIGURED','YOUTUBE_QUEUE_MUST_BE_SERIAL'].includes(item.errorCode??'')?'운영 채널 연결 대기':labels[item.state]}</output>{item.videoUrl&&<a href={item.videoUrl} target="_blank" rel="noopener noreferrer" className="ml-2 underline">등록 영상 ↗</a>}{item.state==='queued'&&api.cancel&&<button type="button" disabled={!!busy} onClick={()=>{setBusy(item.id);void api.cancel!(item.id).then(()=>setRetry(value=>value+1)).catch(()=>setError('이미 업로드를 시작했거나 취소 결과를 확인하지 못했습니다. 요청 상태를 다시 확인해 주세요.')).finally(()=>setBusy(null));}} className="ml-2 min-h-11 px-3 underline">대기 요청 취소</button>}{item.state==='failed'&&<button type="button" disabled={!!busy} onClick={()=>void again(item.id)} className="ml-2 min-h-11 px-3 underline">같은 요청 재시도</button>}</li>)}</ul>
    <button type="button" onClick={()=>setRetry(value=>value+1)} className="min-h-11 underline">요청 상태 새로 확인</button>
  </section>;
}
