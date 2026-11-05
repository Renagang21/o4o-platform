import { useSignageClock } from './requiredVideoWindow';
import { VideoPlayback } from '@o4o/tablet-kiosk-core';
import { hostedVideo } from '@o4o/tablet-kiosk-core/video-embed';
import { StoreAiSlot } from '../../../components/store/StoreAiPlacement';
import { useEffect, useId, useRef, useState } from 'react';
import { AuthoringDialog } from '../authoring/AuthoringDialog';
import { createStorePlaylist, addPlaylistItem, addPlaylistItemFromSignage, reorderPlaylistItems, fetchRequiredPlaylistVideos, type StorePlaylistItem, type StorePlaylist } from '../../../api/storePlaylist';
import { videoPreviewUrl } from './videoPreview';
import type { UnifiedVideoItem } from './signageVideoList';

export function SignageQuickStart({ videos: sourceVideos, initialSelected = [], organizationId, isCurrent, onSaved, onClose }: Readonly<{
  videos: UnifiedVideoItem[];
  initialSelected?: string[];
  organizationId: string;
  isCurrent: () => boolean;
  onSaved: (playlist: StorePlaylist) => void;
  onClose: (draft: StorePlaylist | null) => void;
}>) {
  const videos = sourceVideos.filter(video => !video.isForced && !video.isLocked && (!video.publishStatus || video.publishStatus === 'published') && (!video._media?.status || video._media.status === 'active') && !['archived', 'expired'].includes(video._snapshot?.lifecycleStatus ?? ''));
  const id = useId();
  const requestId = useRef(crypto.randomUUID());
  const [selected, setSelected] = useState<string[]>(() => initialSelected.filter(id => videos.some(video => video.id === id)));
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  const [choosing, setChoosing] = useState(false);
  const [pending, setPending] = useState<string[]>([]);
  const [required, setRequired] = useState<StorePlaylistItem[]>([]);
  const [requiredError, setRequiredError] = useState('');
  const [requiredReady, setRequiredReady] = useState(false);
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const storedItems = useRef(new Map<string, string>());
  const lock = useRef(false), header = useRef<StorePlaylist | null>(null), added = useRef(new Set<string>());
  const title = name.trim();
  useEffect(() => {
    let active = true, busy = false;
    const load = async () => {
      if (busy) return; busy = true;
      try {
        const data = await fetchRequiredPlaylistVideos();
        if (active && isCurrent()) { setRequired(data); setRequiredReady(true); setRequiredError(''); }
      } catch { if (active) setRequiredError('필수 영상을 확인하지 못했습니다. 잠시 후 다시 시도합니다.'); }
      finally { busy = false; }
    };
    void load(); const timer = setInterval(() => void load(), 15000);
    return () => { active = false; clearInterval(timer); };
  }, [organizationId, isCurrent]);
  const now = useSignageClock();
  const activeRequired = required.filter(item => (!item.forcedStartAt || now >= Date.parse(item.forcedStartAt)) && (!item.forcedEndAt || now < Date.parse(item.forcedEndAt)));
  const requiredKeys = activeRequired.map(item => item.id);
  const requiredSignature = requiredKeys.join(',');
  useEffect(() => setSelected(previous => [...previous.filter(key => !key.startsWith('forced-') || requiredKeys.includes(key)), ...requiredKeys.filter(key => !previous.includes(key))]), [requiredSignature]);
  const rows = selected.map(key => {
    const forced = activeRequired.find(item => item.id === key);
    const video = videos.find(item => item.id === key);
    const content = forced?.contentJson ?? video?._snapshot?.contentJson;
    const duration = Number(content?.duration ?? video?._media?.duration);
    return { key, title: forced?.title ?? video?.title ?? '선택한 자료', required: !!forced, duration: Number.isFinite(duration) && duration > 0 ? duration : 0, url: (content?.sourceUrl ?? content?.url ?? video?.sourceUrl) as string | undefined };
  }).filter(row => !row.key.startsWith('forced-') || row.required);
  const total = rows.reduce((sum, row) => sum + row.duration, 0);
  const unknown = rows.filter(row => !row.duration).length;
  const move = (key: string, offset: number) => setSelected(previous => { const next = [...previous], index = next.indexOf(key), target = index + offset; if (index < 0 || target < 0 || target >= next.length) return previous; [next[index], next[target]] = [next[target], next[index]]; return next; });
  const save = async () => {
    if (lock.current || !title || !rows.length || !requiredReady || requiredError || !isCurrent()) return;
    if (selected.some(key => !key.startsWith('forced-') && !videos.some(video => video.id === key))) {
      setError('선택한 자료의 상태가 바뀌었습니다. 창을 닫고 자료를 다시 확인해 주시기 바랍니다.');
      return;
    }
    const parsedTags = [...new Set(tags.split(',').map(tag => tag.trim()).filter(Boolean))];
    if (parsedTags.length > 20 || parsedTags.some(tag => tag.length > 50)) { setError('태그는 20개까지, 각 50자 이내로 입력합니다.'); return; }
    lock.current = true; setSaving(true); setError('');
    try {
      if (!header.current) header.current = await createStorePlaylist({ name: title, playlistType: 'LIST', tags: parsedTags, clientRequestId: requestId.current });
      for (const key of selected) {
        if (!isCurrent()) return;
        if (key.startsWith('forced-') || added.current.has(key)) continue;
        const item = key.startsWith('media_') ? await addPlaylistItemFromSignage(header.current.id, key.slice(6), organizationId) : await addPlaylistItem(header.current.id, key);
        storedItems.current.set(key, item.id);
        added.current.add(key);
      }
      if (!isCurrent()) return;
      await reorderPlaylistItems(header.current.id, rows.map(row => row.required ? row.key : storedItems.current.get(row.key)!));
      if (isCurrent()) onSaved({ ...header.current, itemCount: added.current.size });
    } catch (cause) {
      if (!isCurrent()) return;
      const status = (cause as { status?: number }).status;
      const unknownResult = !status || status >= 500 || status === 408;
      setUncertain(unknownResult);
      setError(unknownResult
        ? '저장 응답을 확인하지 못했습니다. 재시도하면 같은 재생목록과 자료의 저장 결과를 확인합니다.'
        : header.current
          ? `초안을 저장했고 자료 ${added.current.size}개를 추가했습니다. 다시 시도하면 같은 초안에 남은 자료만 추가합니다.`
          : '초안을 저장하지 못했습니다. 선택한 자료를 유지했으니 다시 시도해 주시기 바랍니다.');
    } finally { lock.current = false; if (isCurrent()) setSaving(false); }
  };
  const close = () => { if (!lock.current) { if (choosing) setChoosing(false); else onClose(header.current); } };
  return <AuthoringDialog labelId={id} onClose={close} className="max-w-2xl">
    <div className="flex max-h-[90vh] flex-col">
    <div className="space-y-4 overflow-y-auto p-5">
      <h2 id={id} className="text-lg font-semibold">새 재생목록</h2>
      {error && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
      {requiredError && <p role="alert" className="text-sm text-red-700">{requiredError}</p>}
      <fieldset disabled={saving || uncertain || !!header.current} className="space-y-4 disabled:opacity-70">
        <label className="block text-sm">재생목록 제목<input aria-label="재생목록 제목" value={name} onChange={event => setName(event.target.value)} maxLength={120} className="mt-1 min-h-11 w-full rounded-lg border px-3" /></label>
        <button type="button" onClick={() => { setPending([]); setSearch(''); setChoosing(true); }} className="min-h-11 rounded-lg border px-4 text-sm">동영상 추가</button>
        {choosing && <AuthoringDialog labelId={`${id}-picker`} onClose={() => setChoosing(false)} className="max-w-2xl"><section aria-label="동영상 선택" className="space-y-3 overflow-y-auto bg-white p-5"><h2 id={`${id}-picker`} className="text-lg font-semibold">동영상 선택</h2>
          <label className="block text-sm">자료 찾기<input aria-label="자료 찾기" value={search} onChange={event => setSearch(event.target.value)} type="search" className="mt-1 min-h-11 w-full rounded-lg border px-3" /></label>
          <div className="max-h-64 overflow-y-auto">{videos.filter(video => video.title.toLowerCase().includes(search.trim().toLowerCase())).map(video => <label key={video.id} className="flex min-h-12 items-center gap-3 border-b p-2 text-sm">
            <input type="checkbox" disabled={selected.includes(video.id)} checked={selected.includes(video.id) || pending.includes(video.id)} onChange={event => setPending(previous => event.target.checked ? [...previous, video.id] : previous.filter(key => key !== video.id))} />
            <span className="min-w-0 break-words">{video.title}{selected.includes(video.id) && <span className="ml-2 text-xs text-slate-500">추가됨</span>}</span>
          </label>)}</div>
          {!videos.some(video => video.title.toLowerCase().includes(search.trim().toLowerCase())) && <p className="text-sm">검색 결과가 없습니다.</p>}
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setChoosing(false)} className="min-h-11 border rounded px-3">선택 취소</button><button type="button" onClick={() => { setSelected(previous => [...new Set([...previous, ...pending])]); setChoosing(false); }} className="min-h-11 rounded bg-teal-700 px-3 text-white">선택한 동영상 추가</button></div>
        </section></AuthoringDialog>}
        <section aria-label="선택한 자료 확인" className="space-y-2 rounded-lg bg-slate-50 p-3">
          <h3 className="text-sm font-semibold">총 {rows.length}개 · {Math.floor(total / 60)}분 {Math.round(total % 60)}초{unknown > 0 ? ` · 길이 미확인 ${unknown}개` : ''}</h3>
          <p className="text-xs text-slate-600">현재 게시기간 기준입니다. 필수 영상은 기간 중 자동 포함되며 순서만 변경할 수 있습니다.</p>
          <ol className="space-y-2">{rows.map((row, index) => <li key={row.key} draggable={!saving && !uncertain && !header.current} onDragStart={event => event.dataTransfer.setData('text/plain', row.key)} onDragOver={event => event.preventDefault()} onDrop={event => {
              event.preventDefault(); if (saving || uncertain || header.current) return;
              const key = event.dataTransfer.getData('text/plain');
              setSelected(previous => { if (!previous.includes(key) || key === row.key) return previous; const next = previous.filter(id => id !== key); next.splice(next.indexOf(row.key), 0, key); return next; });
            }} className="flex flex-wrap items-center gap-2 border-b py-2 text-sm">
            <span className="min-w-0 flex-1 break-words">{index + 1}. {row.title}{row.required && <span className="ml-2 text-red-700">필수 영상</span>}</span>
            <button type="button" aria-label={`${row.title} 위로`} disabled={index === 0} onClick={() => move(row.key, -1)} className="min-h-11 border rounded px-2 disabled:opacity-40">위로</button>
            <button type="button" aria-label={`${row.title} 아래로`} disabled={index === rows.length - 1} onClick={() => move(row.key, 1)} className="min-h-11 border rounded px-2 disabled:opacity-40">아래로</button>
            {!row.required && <button type="button" aria-label={`${row.title} 목록에서 제거`} onClick={() => setSelected(previous => previous.filter(key => key !== row.key))} className="min-h-11 border rounded px-2">제거</button>}
            {row.url && videoPreviewUrl(row.url) && <button type="button" onClick={() => setPreview(previous => previous === row.url ? null : row.url!)} className="min-h-11 px-2 text-teal-800 underline">영상 확인</button>}
          </li>)}</ol>
        </section>
        <label className="block text-sm">태그 (쉼표로 구분)<input aria-label="재생목록 태그" value={tags} onChange={event => setTags(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border px-3" /></label>
      </fieldset>
      {preview && <div className="aspect-video w-full"><VideoPlayback url={preview} kind={hostedVideo(preview)?.provider ?? 'video'} title="선택 영상 미리보기" /></div>}
      <StoreAiSlot priority={2} label="사이니지 안내 작성" />
      <p className="text-xs text-slate-500">등록 영상은 매장 사본으로 추가됩니다. 원본 영상을 수정해도 기존 사본은 자동 갱신되지 않습니다.</p>
      </div>
      <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-200 bg-white p-4">
        <button type="button" disabled={saving} onClick={close} className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm">{header.current ? '저장된 초안에서 이어하기' : uncertain ? '저장된 목록 확인' : '닫기'}</button>
        <button type="button" disabled={saving || !title || !rows.length || !requiredReady || !!requiredError} onClick={() => void save()} className="min-h-11 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{saving ? '저장 중…' : uncertain ? '저장 결과 확인·재시도' : header.current ? '남은 자료 다시 추가' : '재생목록 저장'}</button>
      </div>
    </div>
  </AuthoringDialog>;
}
