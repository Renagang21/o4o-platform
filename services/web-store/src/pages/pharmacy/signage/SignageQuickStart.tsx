import { VideoPlayback } from '@o4o/tablet-kiosk-core';
import { hostedVideo } from '@o4o/tablet-kiosk-core/video-embed';
import { StoreAiSlot } from '../../../components/store/StoreAiPlacement';
import { useId, useRef, useState } from 'react';
import { AuthoringDialog } from '../authoring/AuthoringDialog';
import { createStorePlaylist, addPlaylistItem, addPlaylistItemFromSignage, type StorePlaylist } from '../../../api/storePlaylist';
import { videoPreviewUrl } from './videoPreview';
import type { UnifiedVideoItem } from './signageVideoList';

export function SignageQuickStart({ videos: sourceVideos, organizationId, isCurrent, onSaved, onClose }: Readonly<{
  videos: UnifiedVideoItem[];
  organizationId: string;
  isCurrent: () => boolean;
  onSaved: (playlist: StorePlaylist) => void;
  onClose: (draft: StorePlaylist | null) => void;
}>) {
  const videos = sourceVideos.filter(video => !video.isForced && !video.isLocked && !['archived', 'expired'].includes(video._snapshot?.lifecycleStatus ?? ''));
  const id = useId();
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const lock = useRef(false), header = useRef<StorePlaylist | null>(null), added = useRef(new Set<string>());
  const title = name.trim() || videos.find(video => video.id === selected[0])?.title || '매장 안내';
  const save = async () => {
    if (lock.current || uncertain || !selected.length || !isCurrent()) return;
    if (selected.some(key => !videos.some(video => video.id === key))) {
      setError('선택한 자료의 상태가 바뀌었습니다. 창을 닫고 자료를 다시 확인해 주세요.');
      return;
    }
    lock.current = true; setSaving(true); setError('');
    try {
      if (!header.current) header.current = await createStorePlaylist({ name: title, playlistType: 'LIST' });
      for (const key of selected) {
        if (!isCurrent()) return;
        if (added.current.has(key)) continue;
        if (key.startsWith('media_')) await addPlaylistItemFromSignage(header.current.id, key.slice(6), organizationId);
        else await addPlaylistItem(header.current.id, key);
        added.current.add(key);
      }
      if (isCurrent()) onSaved({ ...header.current, itemCount: added.current.size });
    } catch (cause) {
      if (!isCurrent()) return;
      const status = (cause as { status?: number }).status;
      const unknownResult = !status || status >= 500 || status === 408;
      setUncertain(unknownResult);
      setError(unknownResult
        ? '저장 결과를 확인하지 못했습니다. 중복 생성을 피하려면 먼저 저장된 초안과 자료를 확인한 뒤 이어서 추가하세요.'
        : header.current
          ? `초안을 저장했고 자료 ${added.current.size}개를 추가했습니다. 다시 시도하면 같은 초안에 남은 자료만 추가합니다.`
          : '초안을 저장하지 못했습니다. 선택한 자료를 유지했으니 다시 시도해 주세요.');
    } finally { lock.current = false; if (isCurrent()) setSaving(false); }
  };
  const close = () => { if (!lock.current) onClose(header.current); };
  return <AuthoringDialog labelId={id} onClose={close} className="max-w-2xl">
    <div className="flex max-h-[90vh] flex-col">
    <div className="space-y-4 overflow-y-auto p-5">
      <h2 id={id} className="text-lg font-semibold">새 사이니지 안내</h2>
      <StoreAiSlot priority={2} label="사이니지 안내 작성" />
      <p className="text-sm text-slate-600">보여줄 자료를 고르세요. 선택한 순서로 초안을 저장한 뒤 재생 시간과 게시를 정합니다.</p>
      {error && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
      <fieldset disabled={saving || uncertain || !!header.current} className="space-y-3 disabled:opacity-70">
        <label htmlFor={`${id}-search`} className="block text-sm">자료 찾기</label>
        <input id={`${id}-search`} value={search} onChange={event => setSearch(event.target.value)} type="search" className="min-h-11 w-full rounded-lg border border-slate-300 px-3" />
        <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200">
          {videos.filter(video => video.title.toLowerCase().includes(search.trim().toLowerCase())).map(video => <label key={video.id} className="flex min-h-12 cursor-pointer items-center gap-3 border-b border-slate-100 p-3 text-sm">
            <input type="checkbox" checked={selected.includes(video.id)} onChange={event => setSelected(previous => event.target.checked ? [...previous, video.id] : previous.filter(key => key !== video.id))} />
            <span className="min-w-0 flex-1 break-words">{video.title}<span className="ml-2 text-xs text-slate-500">{video.source === 'direct' ? '등록한 영상의 사본' : '매장 자료'}</span></span>
          </label>)}
          {!videos.length && <p className="p-4 text-sm text-slate-600">아직 사용할 자료가 없습니다. 내 동영상에서 등록하거나 제공 자료를 가져오세요.</p>}
          {videos.length > 0 && !videos.some(video => video.title.toLowerCase().includes(search.trim().toLowerCase())) && <p className="p-4 text-sm text-slate-600">검색 결과가 없습니다.</p>}
        </div>
        <details className="rounded-lg border border-slate-200 p-3"><summary className="min-h-11 cursor-pointer text-sm">관리 이름 변경 · 선택</summary>
          <input aria-label="안내 관리 이름" value={name} onChange={event => setName(event.target.value)} placeholder={title} maxLength={120} className="min-h-11 w-full rounded-lg border border-slate-300 px-3" />
        </details>
      </fieldset>
      {selected.length > 0 && <section aria-label="선택한 자료 확인" className="space-y-2 rounded-lg bg-slate-50 p-3">
        <h3 className="text-sm font-semibold">{title} · {selected.length}개</h3>
        <ol className="list-inside list-decimal space-y-2 text-sm">{selected.map(key => {
          const video = videos.find(item => item.id === key);
          const source = video?.sourceUrl ?? video?._snapshot?.contentJson?.sourceUrl;
          const stored = video?._media?.sourceType === 'url' || video?._snapshot?.contentJson?.sourceType === 'url';
          const url = typeof source === 'string' ? stored ? source : videoPreviewUrl(source) : null;
          return <li key={key}>{video?.title ?? '선택한 자료'}{url && <button type="button" onClick={() => setPreview(previous => previous === url ? null : url)} className="ml-2 min-h-11 px-2 text-teal-800 underline">영상 확인</button>}</li>;
        })}</ol>
        {preview && <div className="aspect-video w-full"><VideoPlayback url={preview} kind={hostedVideo(preview)?.provider ?? 'video'} title="선택 영상 미리보기" /></div>}
      </section>}
      <p className="text-xs text-slate-500">등록 영상은 매장 사본으로 추가됩니다. 원본 영상을 수정해도 기존 사본은 자동 갱신되지 않습니다.</p>
      </div>
      <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-200 bg-white p-4">
        <button type="button" disabled={saving} onClick={close} className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm">{header.current ? '저장된 초안에서 이어하기' : uncertain ? '저장된 목록 확인' : '닫기'}</button>
        <button type="button" disabled={saving || uncertain || !selected.length} onClick={() => void save()} className="min-h-11 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{saving ? '저장 중…' : header.current ? '남은 자료 다시 추가' : '선택 자료로 초안 저장'}</button>
      </div>
    </div>
  </AuthoringDialog>;
}
