import { useRef, useState } from 'react';
import { getStoreMlcGroup, getMlcQr } from '../../../api/multilingualProductContentStore';
import type { AssetSelectorResult } from '../../../components/store/StoreAssetSelectorModal';
import { useLatestStoreRequest } from '../hooks/useLatestStoreRequest';
import type { MultilingualQrEntry } from '../multilingual/MultilingualChannelActions';

export function MultilingualQrEntryPanel({ entry, disabled, selected, onSelect, isCurrent }: {
  entry: MultilingualQrEntry; disabled: boolean; selected: boolean; onSelect: (item: AssetSelectorResult) => void; isCurrent: () => boolean;
}) {
  const request = useLatestStoreRequest(entry.groupId), lock = useRef(false);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const select = async () => {
    if (disabled || lock.current || !isCurrent()) return;
    const current = request.begin(); lock.current = true; setBusy(true); setError('');
    try {
      const group = await getStoreMlcGroup(entry.groupId);
      if (!current() || !isCurrent()) return;
      if (group.id !== entry.groupId || group.status === 'archived' || !group.pages.some(p => p.status === 'published'))
        throw new Error('현재 발행된 고객용 안내가 없습니다. 원래 자료에서 저장·발행 상태를 확인해 주세요.');
      const issued = await getMlcQr(group.id);
      if (!current() || !isCurrent()) return;
      if (typeof issued?.url !== 'string' || !issued.publicKey) throw new Error('발급된 고객용 링크를 확인하지 못했습니다.');
      const url = new URL(issued.url);
      if (url.protocol !== 'https:') throw new Error('고객용 링크를 확인하지 못했습니다.');
      url.searchParams.set('locale', entry.locale);
      onSelect({ id: group.id, title: group.title, category: null, fileUrl: null, assetType: 'mlc', source: 'mlc', url: url.toString(), htmlContent: null });
    } catch (e) { if (current() && isCurrent()) setError((e as { code?: string }).code === 'PUBLIC_KEY_NOT_ISSUED'
      ? '고객용 링크가 아직 준비되지 않았습니다. 원래 자료에서 고객용 링크·QR을 준비한 뒤 다시 시도해 주세요.'
      : (e as Error).message || '안내 상태를 확인하지 못했습니다. 다시 시도해 주세요.'); }
    finally { lock.current = false; if (current() && isCurrent()) setBusy(false); }
  };
  return <section aria-label="선택한 상품 안내로 QR 준비" className="mb-4 space-y-2 rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm">
    <p>선택한 상품 안내의 현재 발행 상태를 확인하고 QR에 연결합니다. 안내를 자동 발행하거나 QR을 자동 저장하지 않습니다.</p>
    {!selected && <button type="button" disabled={disabled || busy} className="min-h-11 rounded border bg-white px-3 disabled:opacity-50" onClick={() => void select()}>
      {busy ? '발행 상태 확인 중…' : error ? '선택한 안내 다시 확인' : '선택한 안내로 QR 준비'}
    </button>}
    {selected && <p role="status">QR 입력에 선택한 안내를 넣었습니다. 제목·연결 주소를 확인하고 저장해 주세요.</p>}
    {error && <p role="alert" className="text-red-800">{error}</p>}
  </section>;
}
