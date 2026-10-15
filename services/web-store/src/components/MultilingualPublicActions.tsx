/**
 * MultilingualPublicActions — 매장 다국어 콘텐츠의 고객용 링크 / QR 액션
 *
 * WO-O4O-MULTILINGUAL-PRODUCT-QR-LANDING-V1
 *
 * store-owner 가 연결된 store-scoped 다국어 콘텐츠의 public landing 을
 * 고객에게 보여줄 수 있도록 "고객용 보기 / URL 복사 / QR 보기" 를 제공한다.
 * - publicKey 는 첫 요청 시 backend 에서 idempotent 발급.
 * - QR 이미지는 backend SVG 로 생성(프론트 QR 의존성 없음).
 */

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Copy, QrCode, Check, Loader2, Tablet } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { useStoreOperationScope } from '../hooks/useStoreOperationScope';
import { useLatestStoreRequest } from '../pages/pharmacy/hooks/useLatestStoreRequest';
import { ensureMlcPublicKey, getMlcQr } from '../api/multilingualProductContentStore';

interface Props {
  groupId: string;
  /** At least one saved, non-archived page exists (see hasPublishableMlcPage); otherwise the landing 404s. */
  publishable: boolean;
  disabled?: boolean;
  onPublished?: () => Promise<void>;
}

/** url 에 mode=tablet 쿼리 부여 (기존 쿼리 유무 안전 처리). */
function withTabletMode(url: string): string {
  return url + (url.includes('?') ? '&' : '?') + 'mode=tablet';
}

export function MultilingualPublicActions(props: Readonly<Props>) {
  const scope = useStoreOperationScope();
  return <PublicActionsSession key={`${scope.key}:${props.groupId}`} {...props} isCurrent={scope.isCurrent} />;
}

type PublicAction = 'open' | 'tablet' | 'copy' | 'qr';

function PublicActionsSession({ groupId, publishable, disabled: disabledProp = false, onPublished, isCurrent }: Readonly<Props & { isCurrent: () => boolean }>) {
  const disabled = disabledProp || !publishable;
  const [busy, setBusy] = useState<null | PublicAction>(null);
  const lock = useRef(false);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<{ svg: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requests = useLatestStoreRequest();
  const openTab = useRef<Window | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    openTab.current?.close();
  }, []);
  const deliver = async (action: PublicAction, url: string, popup: Window | null, owned: () => boolean) => {
    if (action === 'qr') {
      const result = await getMlcQr(groupId);
      if (owned()) setQr({ svg: result.svg, url: result.url });
      return;
    }
    if (action === 'copy') {
      await navigator.clipboard.writeText(url);
      if (!owned()) return;
      setCopied(true);
      timer.current = setTimeout(() => { if (owned()) setCopied(false); }, 2000);
      return;
    }
    popup?.location.replace(action === 'tablet' ? withTabletMode(url) : url);
    openTab.current = null;
  };
  /** Open synchronously in the user gesture; returns false when the popup was blocked. */
  const openPopup = (action: PublicAction): { ok: boolean; popup: Window | null } => {
    if (action !== 'open' && action !== 'tablet') return { ok: true, popup: null };
    const popup = window.open('about:blank', '_blank');
    if (!popup) { setError('새 창이 차단되었습니다. 팝업을 허용하거나 URL 복사를 사용해 주세요.'); return { ok: false, popup: null }; }
    popup.opener = null;
    openTab.current = popup;
    return { ok: true, popup };
  };
  const run = async (action: PublicAction) => {
    if (lock.current || disabled || !isCurrent()) return;
    if (action === 'qr' && qr) { setQr(null); return; }
    // Never leave a stale store's tab open.
    const { ok, popup } = openPopup(action);
    if (!ok) return;
    const current = requests.begin();
    const owned = () => current() && isCurrent();
    lock.current = true; setBusy(action); setError(null); setCopied(false);
    if (timer.current) clearTimeout(timer.current);
    try {
      const { url } = await ensureMlcPublicKey(groupId);
      if (!owned()) { popup?.close(); return; }
      const link = new URL(url, window.location.origin);
      if (!['http:', 'https:'].includes(link.protocol)) throw new Error('Invalid link');
      if (onPublished) await onPublished();
      if (!owned()) { popup?.close(); return; }
      await deliver(action, url, popup, owned);
    } catch {
      popup?.close();
      if (owned()) {
        const message = '고객용 링크·QR 작업을 완료하지 못했습니다. 다시 시도해 주세요. 저장된 콘텐츠는 공개되었을 수 있습니다.';
        setError(message); toast.error(message);
      }
    } finally {
      lock.current = false;
      if (owned()) setBusy(null);
    }
  };

  const btn = 'inline-flex items-center gap-1.5 px-2.5 py-2.5 min-h-11 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-50';

  return (
    <div className="mt-3 pt-3 border-t border-indigo-100/70">
      <p className="text-[11px] text-slate-500 mb-2">
        고객용 보기·태블릿 보기·URL 복사·QR 보기를 실행하면 저장된 초안 언어도 함께 공개됩니다. 미저장 내용은 포함되지 않습니다.
      </p>
      {!publishable && (
        <p className="text-xs text-amber-800 mb-2">
          공개할 수 있는 저장된 언어 페이지가 없습니다. 언어별 내용을 저장한 뒤 고객용 링크·QR을 사용할 수 있습니다.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => void run('open')} disabled={disabled || busy !== null} className={btn}>
          {busy === 'open' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
          고객용 보기
        </button>
        <button type="button" onClick={() => void run('tablet')} disabled={disabled || busy !== null} className={btn}>
          {busy === 'tablet' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Tablet className="w-3.5 h-3.5" />}
          태블릿 보기
        </button>
        <button type="button" onClick={() => void run('copy')} disabled={disabled || busy !== null} className={btn}>
          {busy === 'copy' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? '복사됨' : 'URL 복사'}
        </button>
        <button type="button" onClick={() => void run('qr')} disabled={disabled || busy !== null} className={btn}>
          {busy === 'qr' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
          {qr ? 'QR 숨기기' : 'QR 보기'}
        </button>
      </div>

      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      {qr && (
        <div className="mt-3 flex flex-col items-center gap-2">
          <div
            className="w-40 h-40 bg-white rounded-lg border border-slate-200 p-2 [&>svg]:w-full [&>svg]:h-full"
            dangerouslySetInnerHTML={{ __html: qr.svg }}
          />
          <p className="text-[10px] text-slate-400 break-all text-center max-w-[220px]">{qr.url}</p>
        </div>
      )}
    </div>
  );
}

export default MultilingualPublicActions;
