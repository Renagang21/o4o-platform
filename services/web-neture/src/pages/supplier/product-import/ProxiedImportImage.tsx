import { useState, useCallback, useEffect, useRef } from 'react';
import { supplierApi } from '../../../lib/api/supplier';

export default function ProxiedImg({
  url,
  shopOrigin,
  alt,
  imgClassName,
  onStatus,
  onLoaded,
}: {
  url: string;
  shopOrigin?: string;
  alt: string;
  imgClassName?: string;
  /** 미리보기 성공(true)/실패(false) 보고 — 부모가 선택 가능 여부 판단 */
  onStatus?: (ok: boolean) => void;
  /** 실제 자연 크기 보고 (원본 크기 표시용) */
  onLoaded?: (w: number, h: number) => void;
}) {
  const [state, setState] = useState<'loading' | 'ok' | 'fail'>('loading');
  const [src, setSrc] = useState<string | null>(null);
  const objRef = useRef<string | null>(null);
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;

  const load = useCallback(async () => {
    setState('loading');
    if (objRef.current) {
      URL.revokeObjectURL(objRef.current);
      objRef.current = null;
    }
    try {
      const obj = await supplierApi.proxyImageObjectUrl(url, shopOrigin);
      objRef.current = obj;
      setSrc(obj);
      setState('ok');
      statusRef.current?.(true);
    } catch {
      setState('fail');
      statusRef.current?.(false);
    }
  }, [url, shopOrigin]);

  useEffect(() => {
    load();
    return () => {
      if (objRef.current) URL.revokeObjectURL(objRef.current);
    };
  }, [load]);

  if (state === 'loading') {
    return (
      <div
        className={`flex aspect-[3/4] w-full items-center justify-center bg-slate-50 text-[11px] text-slate-400 ${imgClassName ?? ''}`}
      >
        불러오는 중…
      </div>
    );
  }
  if (state === 'fail' || !src) {
    return (
      <div
        className={`flex aspect-[3/4] w-full flex-col items-center justify-center gap-1 bg-slate-50 px-2 text-center text-[11px] text-slate-500 ${imgClassName ?? ''}`}
      >
        <span>미리보기 실패</span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            load();
          }}
          className="rounded border border-slate-300 px-2 py-0.5 text-[10px] text-slate-600 hover:bg-white"
        >
          재시도
        </button>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={imgClassName}
      loading="lazy"
      onLoad={(e) => {
        const t = e.currentTarget;
        if (t.naturalWidth) onLoaded?.(t.naturalWidth, t.naturalHeight);
      }}
    />
  );
}
