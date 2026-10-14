import { useEffect, useRef, type KeyboardEvent } from 'react';
import type { BusinessDecision } from './useAssignedBusinessWorkspace';

export function BusinessDecisionDialog({ decision, businessName, reason, onReasonChange, error, saving, onConfirm, onCancel }: Readonly<{
  decision: BusinessDecision; businessName: string; reason: string; onReasonChange: (value: string) => void;
  error: string; saving: boolean; onConfirm: () => void; onCancel: () => void;
}>) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    panel.current?.querySelector<HTMLElement>('textarea, button')?.focus();
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  const handleKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); if (!saving) onCancel(); }
    if (event.key !== 'Tab') return;
    const controls = Array.from(panel.current?.querySelectorAll<HTMLElement>('textarea:not(:disabled), button:not(:disabled)') ?? []);
    const first = controls[0], last = controls[controls.length - 1];
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <section ref={panel} onKeyDown={handleKey} role="dialog" aria-modal="true" aria-label={`${decision.label} 확인`} className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
      <h2 className="text-lg font-semibold">{decision.label} 확인</h2>
      <p className="text-sm text-gray-700">{businessName} · {decision.target}</p>
      <p className="text-sm">이 대상을 {decision.label} 처리할까요?</p>
      {decision.needsReason && <label className="block text-sm">처리 사유 (선택)
        <textarea aria-label="처리 사유" value={reason} disabled={saving} onChange={e => onReasonChange(e.target.value)}
          className="mt-2 w-full rounded border p-2" rows={3} />
      </label>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" disabled={saving} onClick={onCancel} className="rounded border px-4 py-2 disabled:opacity-50">닫기</button>
        <button type="button" disabled={saving} onClick={onConfirm} className="rounded bg-primary-600 px-4 py-2 text-white disabled:opacity-50">{saving ? '처리 중...' : '처리 확인'}</button>
      </div>
    </section>
  </div>;
}
