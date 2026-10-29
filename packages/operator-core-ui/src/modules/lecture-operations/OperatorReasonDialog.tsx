import { useId, useLayoutEffect, useRef, useState } from 'react';

/** Lecture-only decision input. The caller owns its target and async outcome. */
export default function OperatorReasonDialog({ title, target, busy, error, allowEmpty = false, onConfirm, onCancel }: {
  title: string; target: string; busy: boolean; error?: string | null; allowEmpty?: boolean;
  onConfirm: (reason: string) => void; onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  const titleId = useId();
  const form = useRef<HTMLFormElement>(null);
  const previousFocus = useRef(document.activeElement as HTMLElement | null);
  useLayoutEffect(() => { if (busy) form.current?.focus(); }, [busy]);
  useLayoutEffect(() => () => { if (previousFocus.current?.isConnected) previousFocus.current.focus(); }, []);
  return <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 p-4">
    <form ref={form} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className="panel w-full max-w-lg max-h-[90dvh] overflow-y-auto" onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); if (!busy) onCancel(); }
      if (event.key !== 'Tab') return;
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement | HTMLTextAreaElement>('button:not(:disabled), textarea:not(:disabled)'));
      const first = controls[0], last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }} onSubmit={event => { event.preventDefault(); if (!busy && (allowEmpty || reason.trim())) onConfirm(reason); }}>
      <h2 id={titleId}>{title}</h2><p className="muted break-all">대상: {target}</p>
      <label className="field"><span>처리 사유{allowEmpty ? ' (선택)' : ''}</span><textarea autoFocus disabled={busy} value={reason} onChange={event => setReason(event.target.value)} rows={4} /></label>
      {error && <p role="alert" className="notice notice-error">{error}</p>}
      <div className="row-actions"><button type="button" className="btn btn-ghost" disabled={busy} onClick={onCancel}>취소</button><button type="submit" className="btn btn-primary" disabled={busy || !allowEmpty && !reason.trim()}>{busy ? '처리 중...' : '처리 확인'}</button></div>
    </form>
  </div>;
}
