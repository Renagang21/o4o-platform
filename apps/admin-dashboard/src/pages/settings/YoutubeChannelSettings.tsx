import { useEffect, useRef, useState } from 'react';
import { unifiedApi } from '../../api/unified-client';
interface UploadRequest {id:string;name:string;state:string;serviceKey:string;videoUrl?:string|null;reviewVideoId?:string|null}
interface Status {connection:{channelId:string;configured:boolean;connected:boolean};delivery:{ready:boolean;deliveryConfigured:boolean}}
export default function YoutubeChannelSettings(){
  const [data,setData]=useState<Status|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [requests,setRequests]=useState<UploadRequest[]>([]),[drafts,setDrafts]=useState<Record<string,string>>({});
  const started=useRef(false),live=useRef(true);
  useEffect(()=>{
    live.current=true;if(started.current)return()=>{live.current=false;};started.current=true;
    const params=new URLSearchParams(window.location.search);const callback={code:params.get('code'),state:params.get('state'),error:params.has('error')};
    if(callback.code||callback.error)window.history.replaceState(null,'','/settings/youtube');
    const load=async()=>{
      try{
        if(callback.error)throw new Error('Google 채널 연결을 취소했습니다.');
        if(callback.code&&callback.state){setBusy(true);const completed=await unifiedApi.raw.post('/v1/platform/youtube/complete',{code:callback.code,state:callback.state});if(!completed.data?.success||!completed.data.data?.connected)throw new Error('CONNECTION_UNCONFIRMED');if(live.current)setMessage('지정한 YouTube 채널을 연결했습니다.');}
        const response=await unifiedApi.raw.get('/v1/platform/youtube');if(!response.data?.success)throw new Error('채널 상태를 확인하지 못했습니다.');if(live.current)setData(response.data.data);
        const jobs=await unifiedApi.raw.get('/v1/platform/youtube/requests');if(live.current&&Array.isArray(jobs.data?.data))setRequests(jobs.data.data);
      }catch{if(live.current)setMessage('채널 연결을 확인하지 못했습니다. 필요한 설정과 Google 승인 상태를 확인하고 다시 연결해 주세요.');}
      finally{if(live.current)setBusy(false);}
    };void load();return()=>{live.current=false;};
  },[]);
  const connect=async()=>{if(busy)return;setBusy(true);setMessage('');try{const response=await unifiedApi.raw.post('/v1/platform/youtube/connect');const url=new URL(response.data?.data?.url);if(url.origin!=='https://accounts.google.com')throw new Error('INVALID_AUTHORIZATION_URL');window.location.assign(url.href);}catch{setMessage('연결 설정을 확인하지 못했습니다. 운영 OAuth 설정을 확인해 주세요.');setBusy(false);}};
  const checkRequest=async(item:UploadRequest)=>{
    if(busy)return;setBusy(true);setMessage('');
    try{
      if(item.state==='needs-review'&&drafts[item.id]){
        const url=new URL(drafts[item.id]);const videoId=url.hostname==='youtu.be'?url.pathname.slice(1):['youtube.com','www.youtube.com'].includes(url.hostname)?url.searchParams.get('v'):null;
        if(!videoId||!/^[-\w]{11}$/.test(videoId))throw new Error('INVALID_VIDEO_URL');
        await unifiedApi.raw.post(`/v1/platform/youtube/requests/${item.id}/reconcile`,{videoId});
      }else await unifiedApi.raw.post(`/v1/platform/youtube/requests/${item.id}/retry`);
      const response=await unifiedApi.raw.get('/v1/platform/youtube/requests');setRequests(response.data.data);setMessage('기존 요청을 다시 확인하도록 접수했습니다. 새 영상으로 중복 업로드하지 않습니다.');
    }catch{setMessage('요청을 다시 확인하지 못했습니다. 지정 채널에서 처리·공유 가능한 개별 영상 주소를 확인해 주세요.');}
    finally{setBusy(false);}
  };
  return <section className="space-y-4"><h2 className="text-xl font-semibold">YouTube 운영 채널</h2><p className="text-sm text-gray-600">내 매장과 커뮤니티의 동영상 등록 요청을 지정 채널에 하나씩 업로드합니다. 실제 처리와 목록 저장이 끝나면 요청자에게 알림을 보냅니다.</p>
    <a className="text-blue-700 underline" href="https://studio.youtube.com/channel/UCG9wb2OKmCBZ63g_ONuFkzg" target="_blank" rel="noopener noreferrer">운영 채널 열기 ↗</a>
    {!data&&!message&&<output>연결 상태 확인 중…</output>}
    {data&&<><p>채널 연결: {data.connection.connected?'연결됨':'연결 필요'}</p><p>백그라운드 전달: {data.delivery.deliveryConfigured?'설정됨 · 실제 큐 권한은 접수 시 확인':'Cloud Tasks 설정 필요'}</p><button type="button" disabled={busy||!data.connection.configured} onClick={()=>void connect()} className="min-h-11 rounded border border-gray-300 px-4 disabled:opacity-50">{busy?'채널 연결 중…':data.connection.connected?'Google 채널 다시 연결':'Google 채널 연결'}</button>{!data.connection.configured&&<p className="text-sm text-amber-800">서버의 YouTube OAuth와 암호화 키 설정이 필요합니다. 설정 전에는 업로드 완료로 처리하지 않습니다.</p>}</>}
    {data?.delivery.ready&&<button type="button" disabled={busy} onClick={()=>{setBusy(true);void unifiedApi.raw.post('/v1/platform/youtube/resume').then(()=>setMessage('대기 중인 요청을 순서대로 다시 확인합니다.')).catch(()=>setMessage('백그라운드 전달 설정과 권한을 확인해 주세요.')).finally(()=>setBusy(false));}} className="min-h-11 rounded border border-gray-300 px-3">대기 작업 다시 시작</button>}
    {!!requests.length&&<section aria-label="채널 등록 요청" className="space-y-3"><h3 className="font-semibold">최근 등록 요청</h3><ul className="space-y-3">{requests.map(item=><li key={item.id} className="space-y-2 rounded-lg border border-gray-300 p-3"><p className="font-medium">{item.name}</p><p className="text-sm">{item.serviceKey} · {item.state}</p>{item.reviewVideoId&&<a className="mr-3 underline" href={`https://studio.youtube.com/video/${item.reviewVideoId}/edit`} target="_blank" rel="noopener noreferrer">채널에서 영상 확인 ↗</a>}{item.videoUrl&&<a className="underline" href={item.videoUrl} target="_blank" rel="noopener noreferrer">등록 영상 ↗</a>}{['failed','needs-review'].includes(item.state)&&<><label className="block text-sm">채널에서 확인한 개별 영상 주소(결과 확인이 필요한 경우)<input type="url" value={drafts[item.id]??''} onChange={event=>setDrafts(value=>({...value,[item.id]:event.target.value}))} className="mt-1 min-h-11 w-full rounded border border-gray-300 px-3"/></label><button type="button" disabled={busy} onClick={()=>void checkRequest(item)} className="min-h-11 rounded border border-gray-300 px-3">기존 등록 결과 다시 확인</button></>}</li>)}</ul></section>}
    {message&&<p role="status">{message}</p>}
  </section>;
}
