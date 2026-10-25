import { useId, useState } from 'react';
import { AuthoringDialog } from '../authoring/AuthoringDialog';
import { videoPreviewUrl } from './videoPreview';
import type { StorePlaylistItem } from '../../../api/storePlaylist';

/** Preview uses the saved snapshot items; it never publishes or reports device playback. */
export function SignagePlaylistPreview({ name, items, onClose }: Readonly<{ name: string; items: StorePlaylistItem[]; onClose: () => void }>) {
  const id = useId();
  const [index, setIndex] = useState(0);
  const item = items[index];
  const raw = item?.contentJson?.sourceUrl ?? item?.contentJson?.url ?? item?.contentJson?.fileUrl;
  const url = typeof raw === 'string' ? videoPreviewUrl(raw) : null;
  return <AuthoringDialog labelId={id} onClose={onClose} className="max-w-3xl">
    <div className="space-y-4 p-5">
      <h2 id={id} className="text-lg font-semibold">{name} · 저장된 안내 미리보기</h2>
      <p className="text-sm text-slate-600">저장된 순서와 영상 자료를 확인합니다. 기기의 전체화면·자동 재생 결과는 재생 화면에서 확인하세요.</p>
      {url ? <iframe key={url} src={url} title={`${item.title} 미리보기`} className="aspect-video w-full rounded-lg bg-slate-900" allowFullScreen />
        : <p className="rounded-lg bg-slate-100 p-6 text-sm">{item?.title ?? '자료가 없습니다.'}{item && ' · 이 자료 형식의 재생 결과는 재생 화면에서 확인하세요.'}</p>}
      <ol className="max-h-52 space-y-1 overflow-y-auto">{items.map((row, rowIndex) => <li key={row.id}><button type="button" aria-current={rowIndex === index ? 'step' : undefined} onClick={() => setIndex(rowIndex)} className={`min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm ${rowIndex === index ? 'bg-teal-50 text-teal-900' : 'text-slate-700'}`}>{rowIndex + 1}. {row.title}{row.isForced ? ' · 필수 자료' : ''}</button></li>)}</ol>
      <button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm">닫기</button>
    </div>
  </AuthoringDialog>;
}
