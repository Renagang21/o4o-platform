import { useEffect, useRef, useState } from 'react';
import { VideoPlayback } from '@o4o/tablet-kiosk-core';
import { hostedVideo } from '@o4o/tablet-kiosk-core/video-embed';
import { storeScopedFetch } from '../../../api/storeScopedFetch';
interface Props { videoId:string; requestKey?:string; organizationId:string; isCurrent:()=>boolean; onImported:()=>void; onClose:()=>void }
const BASE = `${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/communities/community/signage`;
export function CommunityVideoImport({videoId,requestKey,organizationId,isCurrent,onImported,onClose}:Readonly<Props>){
  const [video,setVideo]=useState<{title:string;contentJson:{sourceUrl:string}}|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const lock=useRef(false),live=useRef(true),requestId=useRef(requestKey&&/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(requestKey)?requestKey:crypto.randomUUID());
  useEffect(()=>{live.current=true;setVideo(null);setError('');
    storeScopedFetch(`${BASE}/${encodeURIComponent(videoId)}`).then(async response=>{
      const body=await response.json();if(!response.ok||!body.success||!body.data?.contentJson?.sourceUrl)throw new Error('INVALID_VIDEO');
      if(live.current&&isCurrent())setVideo(body.data);
    }).catch(()=>{if(live.current)setError('영상이나 커뮤니티 이용 상태를 확인하지 못했습니다.');});
    return()=>{live.current=false;};
  },[videoId,organizationId,isCurrent]);
  const copy=async()=>{
    if(lock.current||!video||!isCurrent())return;lock.current=true;setBusy(true);setError('');
    try{
      const response=await storeScopedFetch(`${BASE}/assets/copy`,{method:'POST',headers:{'Content-Type':'application/json','X-Organization-Id':organizationId},body:JSON.stringify({sourceAssetId:videoId,assetType:'signage',requestId:requestId.current})});
      const body=await response.json();
      const already=response.status===409&&body.error?.code==='DUPLICATE_SNAPSHOT';
      if(!(response.ok&&body.success&&body.data?.id)&&!already)throw new Error('COPY_UNCONFIRMED');
      if(live.current&&isCurrent())onImported();
    }catch{if(live.current)setError('가져오기 결과를 확인하지 못했습니다. 매장 이용 상태를 확인하고 다시 시도해 주세요. 이미 가져온 영상은 중복 저장하지 않습니다.');}
    finally{lock.current=false;if(live.current)setBusy(false);}
  };
  return <section aria-label="커뮤니티 영상 가져오기" className="space-y-3 rounded-xl border border-teal-300 bg-white p-4">
    <h2 className="font-semibold">커뮤니티 영상을 현재 매장에 가져오기</h2>
    {!video&&!error&&<output>영상을 확인하고 있어요…</output>}
    {video&&<><p>{video.title}</p><div className="aspect-video max-w-md"><VideoPlayback url={video.contentJson.sourceUrl} kind={hostedVideo(video.contentJson.sourceUrl)?.provider??'video'} title={video.title}/></div><p className="text-sm text-slate-600">현재 선택한 매장에 사본으로 보관합니다. 재생 목록 적용은 가져온 뒤 진행하세요.</p><button type="button" disabled={busy} onClick={()=>void copy()} className="min-h-11 rounded-lg bg-teal-700 px-3 text-white">{busy?'가져오는 중…':'이 매장에 가져오기'}</button></>}
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    <button type="button" disabled={busy} onClick={onClose} className="ml-2 min-h-11 px-3 underline">닫기</button>
  </section>;
}
