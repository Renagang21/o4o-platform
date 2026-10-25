import { Link, useLocation } from 'react-router-dom';
import { useStoreOperationScope } from '../../../hooks/useStoreOperationScope';
import { storeWorkspaceBase } from '../../../components/store/StoreWorkflowNavigation';

export interface MultilingualQrEntry { scope: string; groupId: string; locale: string }
export function readMultilingualQrEntry(state: unknown, scope: string): MultilingualQrEntry | null {
  const value = (state as { multilingualQrEntry?: MultilingualQrEntry } | null)?.multilingualQrEntry;
  return value && value.scope === scope && typeof value.groupId === 'string' && !!value.groupId &&
    ['ko', 'en', 'zh', 'ja', 'vi', 'th', 'id'].includes(value.locale) ? value : null;
}
/** A navigation hint with IDs only; the QR page reads the current publication again. */
export function MultilingualChannelActions({ groupId, locale, published, disabled = false }: {
  groupId: string; locale: string; published: boolean; disabled?: boolean;
}) {
  const scope = useStoreOperationScope(), location = useLocation(), base = storeWorkspaceBase(location.pathname);
  return <nav aria-label="상품 안내 활용" className="flex flex-wrap items-center gap-3 text-sm">
    {!disabled && published ? <Link className="inline-flex min-h-11 items-center text-teal-800 underline"
      to={`${base}/marketing/qr?workspace=studio`} state={{ multilingualQrEntry: { scope: scope.key, groupId, locale } }}>
      이 안내로 매장 QR 배치·출력
    </Link> : <span className="text-slate-500">내용을 저장·발행한 뒤 매장 QR로 배치할 수 있습니다.</span>}
    <Link className="inline-flex min-h-11 items-center text-teal-800 underline" to={`${base}/workspace/use?topic=tablet`}>태블릿 화면·기기 관리</Link>
    <Link className="inline-flex min-h-11 items-center text-teal-800 underline" to={`${base}/workspace/use?topic=signage`}>사이니지 재생 관리</Link>
  </nav>;
}
