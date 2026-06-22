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

import { useState } from 'react';
import { ExternalLink, Copy, QrCode, Check, Loader2 } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { ensureMlcPublicKey, getMlcQr } from '../api/multilingualProductContentStore';

interface Props {
  groupId: string;
}

export function MultilingualPublicActions({ groupId }: Props) {
  const [busy, setBusy] = useState<null | 'open' | 'copy' | 'qr'>(null);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<{ svg: string; url: string } | null>(null);

  const handleOpen = async () => {
    setBusy('open');
    try {
      const { url } = await ensureMlcPublicKey(groupId);
      window.open(url, '_blank', 'noopener');
    } catch (e: any) {
      toast.error(e?.message || '고객용 링크를 만들 수 없습니다');
    } finally {
      setBusy(null);
    }
  };

  const handleCopy = async () => {
    setBusy('copy');
    try {
      const { url } = await ensureMlcPublicKey(groupId);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e: any) {
      toast.error(e?.message || 'URL 복사에 실패했습니다');
    } finally {
      setBusy(null);
    }
  };

  const handleQr = async () => {
    if (qr) { setQr(null); return; }
    setBusy('qr');
    try {
      await ensureMlcPublicKey(groupId);
      const res = await getMlcQr(groupId);
      setQr({ svg: res.svg, url: res.url });
    } catch (e: any) {
      toast.error(e?.message || 'QR 생성에 실패했습니다');
    } finally {
      setBusy(null);
    }
  };

  const btn = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-50';

  return (
    <div className="mt-3 pt-3 border-t border-indigo-100/70">
      <p className="text-[11px] text-slate-500 mb-2">
        외국인 고객에게 보여줄 다국어 상품 안내 링크입니다. QR을 인쇄하거나 매장 화면에서 보여줄 수 있습니다.
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={handleOpen} disabled={busy !== null} className={btn}>
          {busy === 'open' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
          고객용 보기
        </button>
        <button type="button" onClick={handleCopy} disabled={busy !== null} className={btn}>
          {busy === 'copy' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? '복사됨' : 'URL 복사'}
        </button>
        <button type="button" onClick={handleQr} disabled={busy !== null} className={btn}>
          {busy === 'qr' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
          {qr ? 'QR 숨기기' : 'QR 보기'}
        </button>
      </div>

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
