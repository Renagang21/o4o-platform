import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { requestServiceHandoff } from '@o4o/auth-react';
import { VideoPlayback, hostedVideo, VideoRegistration, type VideoRegistrationPayload } from '@o4o/store-ui-core';
import { useAuth } from '../../contexts';
import { api, API_BASE_URL } from '../../lib/apiClient';
import { mediaApi } from '../../lib/api/media';
interface Video { id:string;name:string;description?:string;sourceUrl:string;sourceType:string;tags?:string[] }
export default function CommunitySignagePage() {
  const {user} = useAuth();
  const [items,setItems]=useState<Video[]>([]),[page,setPage]=useState(1),[retry,setRetry]=useState(0);
  const [canRegister,setCanRegister]=useState(false),[hasNext,setHasNext]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [preview,setPreview]=useState<string|null>(null),[handoff,setHandoff]=useState<string|null>(null);
  useEffect(()=>{
    let live=true;setLoading(true);setError('');setItems([]);setCanRegister(false);setPreview(null);
    api.get('/communities/community/signage',{params:{page}}).then(response=>{
      const data=response.data?.data;if(!Array.isArray(data?.items))throw new Error('INVALID_LIST');
      if(live){setItems(data.items);setCanRegister(data.canRegister===true);setHasNext(data.hasNext===true);}
    }).catch(()=>{if(live)setError('영상 목록을 불러오지 못했습니다. 이용 상태를 확인하고 다시 시도해 주세요.');}).finally(()=>{if(live)setLoading(false);});
    return()=>{live=false;};
  },[page,retry,user?.id]);
  const ask=useCallback(async(question:string)=>{
    try{
      const response=await api.post('/api/ai/query',{question,serviceId:'community',task:'draft',contextType:'service',pageType:'community',contextData:{pageTitle:'커뮤니티 · 동영상 등록'}},{baseURL:API_BASE_URL||window.location.origin,timeout:60000});
      if(!response.data?.success||typeof response.data.answer!=='string')throw new Error('AI_UNAVAILABLE');
      return response.data.answer;
    }catch{throw new Error('AI 등록 정보를 준비하지 못했습니다. 잠시 후 다시 요청하거나 직접 등록해 주세요.');}
  },[]);
  const save=useCallback(async(payload:VideoRegistrationPayload)=>{
    try{
      const response=await api.post('/communities/community/signage',payload);const data=response.data?.data;
      if(!response.data?.success||!data?.id)throw new Error('SAVE_UNCONFIRMED');return data;
    }catch{throw new Error('목록 등록을 확인하지 못했습니다. 같은 요청으로 다시 시도해 주세요.');}
  },[]);
  const youtube=useMemo(()=>({
    enqueue:async(payload:VideoRegistrationPayload)=>{try{const response=await api.post('/communities/community/signage/youtube-jobs',payload);if(!response.data?.success)throw new Error('UNCONFIRMED');return response.data.data;}catch{throw new Error('YouTube 등록 요청을 접수하지 못했습니다. 채널 연결·전달 설정을 확인한 뒤 같은 요청으로 다시 시도해 주세요.');}},
    list:async()=>{const response=await api.get('/youtube/uploads');const data=response.data?.data;if(!response.data?.success||!data?.availability||!Array.isArray(data.items))throw new Error('INVALID_REQUEST_LIST');return{availability:data.availability,items:data.items.filter((row:{serviceKey?:string})=>row.serviceKey==='community')};},
    retry:async(id:string)=>(await api.post(`/youtube/uploads/${encodeURIComponent(id)}/retry`)).data,
    cancel:async(id:string)=>(await api.post(`/youtube/uploads/${encodeURIComponent(id)}/cancel`)).data,
  }),[]);
  const saved=useCallback(()=>{setPage(1);setRetry(value=>value+1);},[]);
  const enterStore=async(id:string)=>{
    if(handoff)return;setHandoff(id);setError('');
    try{await requestServiceHandoff(api,{workspace:'store',origin:'https://store.neture.co.kr',returnPath:`/store/marketing/signage/videos?communityVideo=${encodeURIComponent(id)}&communityRequest=${crypto.randomUUID()}`});}
    catch{setError('내 매장으로 이동하지 못했습니다. 로그인 상태를 확인하고 다시 시도해 주세요.');}
    finally{setHandoff(null);}
  };
  return <main className="mx-auto max-w-6xl space-y-5 px-4 py-8">
    <Link to="/" className="text-sm text-emerald-700">커뮤니티 첫 화면 →</Link>
    <h1 className="text-2xl font-bold">디지털사이니지</h1>
    <p className="text-slate-600">회원들이 등록한 동영상을 둘러보고 내 매장에서 이용하세요. 영상은 개별 영상 주소로 연결합니다.</p>
    {canRegister&&user&&<VideoRegistration contextKey={user.id} youtube={youtube} mediaApi={mediaApi} ask={ask} save={save} onSaved={saved}/>}
    {!canRegister&&!loading&&<p className="text-sm text-slate-600">영상 등록과 내 매장 이용은 로그인 후 이용 상태를 확인해 주세요.</p>}
    {loading&&<output>영상을 불러오고 있어요…</output>}
    {error&&<div role="alert">{error}<button type="button" onClick={()=>setRetry(value=>value+1)} className="min-h-11 px-3 underline">다시 확인</button></div>}
    {!loading&&!error&&!items.length&&<p>아직 등록된 영상이 없습니다.</p>}
    <ul className="grid gap-4 md:grid-cols-2">{items.map(item=><li key={item.id} className="min-w-0 space-y-3 rounded-xl border border-slate-300 p-4">
      <h2 className="break-words text-lg font-semibold">{item.name}</h2><p className="break-words text-sm text-slate-600">{item.description}</p>
      <button type="button" onClick={()=>setPreview(value=>value===item.id?null:item.id)} className="min-h-11 rounded-lg border border-slate-300 px-3">{preview===item.id?'미리보기 닫기':'영상 미리보기'}</button>
      {preview===item.id&&<div className="aspect-video"><VideoPlayback url={item.sourceUrl} kind={hostedVideo(item.sourceUrl)?.provider??'video'} title={item.name}/></div>}
      {user&&<button type="button" disabled={!!handoff} onClick={()=>void enterStore(item.id)} className="ml-2 min-h-11 rounded-lg bg-teal-700 px-3 text-white">{handoff===item.id?'내 매장으로 이동 중…':'내 매장에서 이용'}</button>}
    </li>)}</ul>
    <nav aria-label="영상 목록 페이지" className="flex gap-3"><button type="button" disabled={loading||page===1} onClick={()=>setPage(value=>value-1)} className="min-h-11 px-3">이전</button><span className="content-center">{page}</span><button type="button" disabled={loading||!hasNext} onClick={()=>setPage(value=>value+1)} className="min-h-11 px-3">다음</button></nav>
  </main>;
}
