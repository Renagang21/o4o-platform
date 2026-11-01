import { YoutubeUploadRequests, type YoutubeUploadApi } from './YoutubeUploadRequests';
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AiRequestInput } from '@o4o/ui';
import { hostedVideo } from '@o4o/tablet-kiosk-core/video-embed';
import { MediaPickerModal, type MediaPickerApi, type MediaAssetItem } from '../media/MediaPickerModal';

export const O4O_VIDEO_STUDIO = 'https://studio.youtube.com/channel/UCG9wb2OKmCBZ63g_ONuFkzg';
export interface VideoRegistrationPayload {
  requestId: string; name: string; description?: string; tags?: string[];
  sourceUrl?: string; mediaLibraryAssetId?: string;
}
export interface VideoRegistrationAction { run: (question: string) => Promise<string>; label: string }
interface Props {
  contextKey: string;
  mediaApi: MediaPickerApi;
  ask: (question: string) => Promise<string>;
  save: (payload: VideoRegistrationPayload) => Promise<{ id: string; name: string }>;
  onSaved: () => void;
  youtube?: YoutubeUploadApi;
  requestSlot?: (action: VideoRegistrationAction) => ReactNode;
}
function draftFields(answer: string) {
  const value = JSON.parse(answer.replace(/^```(?:json)?\s*|\s*```$/g, '').trim());
  if (!value || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 255
    || typeof value.description !== 'string' || value.description.length > 2000
    || !Array.isArray(value.tags) || value.tags.length > 10 || value.tags.some((tag: unknown) => typeof tag !== 'string' || !tag.trim() || tag.length > 50))
    throw new Error('AI가 등록 정보를 준비하지 못했습니다. 직접 제목을 입력해 등록할 수 있습니다.');
  return { name: value.name.trim(), description: value.description, tags: value.tags as string[] };
}
/** One explicit request prepares metadata and commits the registration. AI never selects a URL or scope. */
export function VideoRegistration(props: Readonly<Props>) {
  return <RegistrationSession key={props.contextKey} {...props} />;
}
function RegistrationSession({ contextKey, mediaApi, ask, save, onSaved, requestSlot, youtube }: Readonly<Props>) {
  const id = useId();
  const [url, setUrl] = useState(''), [asset, setAsset] = useState<MediaAssetItem | null>(null);
  const [picker, setPicker] = useState(false), [question, setQuestion] = useState(''), [name, setName] = useState('');
  const [stage, setStage] = useState<'idle'|'preparing'|'saving'|'queueing'|'saved'>('idle');
  const [destination,setDestination]=useState<'youtube'|'o4o'>('youtube'),[queued,setQueued]=useState(false),[revision,setRevision]=useState(0);
  const [error, setError] = useState(''), [savedName, setSavedName] = useState(''), [seconds, setSeconds] = useState(0);
  const lock = useRef(false), live = useRef(true), prepared = useRef<{key: string; payload: VideoRegistrationPayload} | null>(null);
  const busy = stage === 'preparing' || stage === 'saving' || stage === 'queueing';
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  useEffect(() => {
    if (!busy) return;
    const start = Date.now(); setSeconds(0);
    const timer = setInterval(() => setSeconds(Math.floor((Date.now()-start)/1000)), 1000);
    return () => clearInterval(timer);
  }, [busy]);
  const run = useCallback(async (request: string, useAi = true) => {
    if (lock.current) throw new Error('등록 중입니다. 결과를 기다려 주세요.');
    const enteredUrl = url.trim() || request.match(/https?:\/\/[^\s<>]+/)?.[0]?.replace(/[),.]+$/, '') || '';
    const video = hostedVideo(enteredUrl);
    if (!asset && !video) throw new Error('업로드·처리가 끝난 개별 영상 주소를 넣거나 O4O 보관 영상을 선택해 주세요.');
    const key = JSON.stringify([asset?.id, video?.id, video?.provider, request, name, useAi, destination]);
    lock.current = true; setError(''); setSavedName(''); setQueued(false);
    try {
      if(asset&&youtube&&destination==='youtube'&&!(await youtube.list()).availability.ready)throw new Error('지금은 YouTube 자동 등록을 이용할 수 없습니다. O4O 보관 등록을 선택하거나 운영자에게 확인해 주세요.');
      if(!live.current)throw new Error('작업 화면이 변경됐습니다.');
      let payload = prepared.current?.key === key ? prepared.current.payload : null;
      if (!payload) {
        setStage('preparing');
        const fields = useAi ? draftFields(await ask(
          '동영상 등록 정보만 JSON으로 준비해 주세요. 제공한 요청·파일명에 없는 약효·내용을 추측하지 마세요. URL·권한·게시 작업은 하지 마세요. '
          + '형식: {"name":"255자 이내 제목","description":"2000자 이내 설명","tags":["50자 이내 분류"]}. 자료: '
          + JSON.stringify({ request: request.slice(0,1000), fileName: asset?.originalName.slice(0,200), title: name }),
        )) : { name: name.trim() || asset?.originalName || '등록 영상', description: request, tags: ['디지털사이니지'] };
        payload = { ...fields, requestId: crypto.randomUUID(), ...(asset ? { mediaLibraryAssetId: asset.id } : { sourceUrl: enteredUrl }) };
        prepared.current = { key, payload };
      }
      if (!live.current) throw new Error('작업 화면이 변경돼 등록을 중지했습니다.');
      const toYoutube=!!asset&&!!youtube&&destination==='youtube';
      setStage(toYoutube?'queueing':'saving');
      const result = toYoutube ? await youtube!.enqueue(payload) : await save(payload);
      if (!result.id || !result.name) throw new Error('등록 결과를 확인하지 못했습니다. 같은 요청으로 다시 확인해 주세요.');
      if (!live.current) return '등록 결과는 영상 목록에서 확인해 주세요.';
      setSavedName(result.name); setStage('saved');
      if(toYoutube&&(!('state' in result)||result.state!=='completed')){setQueued(true);setRevision(value=>value+1);return `“${result.name}” YouTube 등록 요청을 접수했습니다. 순서대로 처리한 뒤 실제 등록이 끝나면 알림을 보냅니다.`;}
      onSaved();
      return `“${result.name}” 영상을 목록에 등록했습니다. 매장 재생 화면 적용은 목록에서 진행해 주세요.`;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '등록을 확인하지 못했습니다. 같은 요청으로 다시 시도해 주세요.';
      if (live.current) { setError(message); setStage('idle'); }
      throw cause;
    } finally { lock.current = false; }
  }, [url, asset, name, ask, save, onSaved, youtube, destination]);
  const submit = async (useAi: boolean) => { try { await run(question, useAi); } catch (cause) { if (live.current) setError(cause instanceof Error ? cause.message : '등록하지 못했습니다.'); } };
  return <section aria-label="AI 동영상 등록" className="space-y-3 rounded-xl border border-slate-300 bg-white p-4">
    <h3 className="font-semibold text-slate-900">AI 동영상 등록</h3>
    <p className="text-sm text-slate-600">주소나 보관 영상을 선택하고 요청하세요. 등록 정보 준비부터 목록 저장까지 이어서 진행합니다.</p>
    <div className="flex flex-wrap gap-2">
      <a href={`${O4O_VIDEO_STUDIO}/videos/upload`} target="_blank" rel="noopener noreferrer" className="min-h-11 content-center rounded-lg border border-slate-300 px-3 text-sm">YouTube에 직접 올리기 ↗</a>
      <button type="button" disabled={busy} onClick={() => setPicker(true)} className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm">O4O 영상 보관·선택</button>
    </div>
    <p className="text-sm text-slate-600">YouTube 업로드와 영상 처리에는 수 분 이상 걸릴 수 있습니다. 열린 YouTube 화면에서 완료를 확인한 뒤 개별 영상 주소를 넣어 주세요. 창을 연 것만으로 업로드되지 않으며, O4O는 YouTube 처리 진행률을 알 수 없습니다.</p>
    <p className="text-sm text-slate-600">O4O에 보관한 영상은 서비스에서 함께 이용합니다. 파일 보관과 아래 영상 목록 등록은 진행 상태로 구분해 안내합니다.</p>
    {asset ? <div className="flex flex-wrap items-center gap-2 text-sm"><span>보관 영상 선택: {asset.originalName}</span><button type="button" disabled={busy} onClick={() => { setAsset(null); prepared.current = null; }} className="min-h-11 underline">선택 해제</button></div>
      : <label className="block text-sm" htmlFor={`${id}-url`}>개별 영상 주소<input id={`${id}-url`} type="url" value={url} disabled={busy} onChange={e => { setUrl(e.target.value); setStage('idle'); }} placeholder="https://www.youtube.com/watch?v=..." className="mt-1 min-h-11 w-full rounded-lg border-2 border-slate-500 px-3" /></label>}
    {asset&&youtube&&<label className="block text-sm" htmlFor={`${id}-destination`}>등록할 곳<select id={`${id}-destination`} value={destination} disabled={busy} onChange={event=>setDestination(event.target.value as 'youtube'|'o4o')} className="ml-2 min-h-11 rounded-lg border border-slate-300 px-3"><option value="youtube">O4O YouTube 채널에 공개 등록 요청</option><option value="o4o">O4O 보관 영상으로 목록 등록</option></select></label>}
    {asset&&youtube&&destination==='youtube'&&<p className="text-sm text-slate-600">선택한 파일을 지정 YouTube 채널에 공개 업로드합니다. 요청 접수와 실제 등록 완료를 구분해 안내합니다.</p>}
    {requestSlot ? requestSlot({ run, label: asset&&youtube&&destination==='youtube'?'YouTube 등록 요청 · 처리 완료 시 알림':'영상 등록 요청 · 입력 후 전송하면 목록에 저장합니다' }) : <form onSubmit={e => { e.preventDefault(); void submit(true); }}><AiRequestInput value={question} onChange={e => setQuestion(e.target.value)} placeholder="이 영상을 매장 안내 영상으로 등록해 줘" busy={busy} submitDisabled={busy || !question.trim()} submitLabel="AI로 등록" maxLength={2000} /></form>}
    <details><summary className="min-h-11 cursor-pointer content-center text-sm">직접 등록</summary><label className="block text-sm" htmlFor={`${id}-name`}>등록 영상 이름<input id={`${id}-name`} value={name} maxLength={255} disabled={busy} onChange={e => setName(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border-2 border-slate-500 px-3" /></label><button type="button" disabled={busy || (!name.trim() && !asset)} onClick={() => void submit(false)} className="mt-2 min-h-11 rounded-lg border border-slate-300 px-3">AI 없이 등록</button></details>
    {busy && <output className="block text-sm text-blue-800"><progress aria-label="영상 등록 진행 중" className="w-full" />{stage === 'preparing' ? '등록 정보를 준비하고 있어요.' : stage==='queueing'?'YouTube 등록 요청을 접수하고 있어요.':'영상 목록에 저장하고 있어요.'} {seconds}초 경과 · 완료될 때까지 기다려 주세요.</output>}
    {error && <p role="alert" className="text-sm text-red-700">{error} 입력과 준비한 정보는 유지됩니다.</p>}
    {savedName && <output className="block text-sm text-emerald-800">“{savedName}” {queued?'YouTube 등록 요청 접수 · 완료되면 알림으로 알려드립니다':'목록 등록 완료'}</output>}
    {youtube&&<YoutubeUploadRequests api={youtube} revision={revision} onCompleted={onSaved}/>}
    <MediaPickerModal open={picker} api={mediaApi} contextKey={contextKey} assetType="video" defaultFolder="general" title="O4O 영상 보관·선택" onClose={() => setPicker(false)} onSelect={value => { setAsset(value); setPicker(false); setStage('idle'); prepared.current = null; }} />
  </section>;
}
