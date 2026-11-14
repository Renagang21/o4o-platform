/**
 * useConfirmDialog — 브라우저 기본 confirm/prompt 대신 공용 확인 대화상자(@o4o/ui ConfirmActionDialog)
 *
 * 브라우저 기본 창은 모양이 화면과 다르고(특히 모바일), 사유 입력 칸 · 위험 동작 강조를 줄 수 없으며,
 * 리스트 표준(docs/architecture/O4O-OPERATOR-TABLE-CANONICAL-V1.md)도 피하도록 한다.
 *
 * 사용:
 *   const { confirm, prompt, dialog } = useConfirmDialog();
 *   if (!(await confirm({ title: '모집 마감', message: '...', variant: 'danger' }))) return;
 *   const reason = await prompt({ title: '반려', message: '...', reasonPlaceholder: '반려 사유 (선택)' });
 *   if (reason === null) return;      // 취소
 *   ...
 *   return <>{...}{dialog}</>;
 *
 * - confirm: 확인 → true, 취소 · 닫기 · Esc → false
 * - prompt: 확인 → 입력값(앞뒤 공백 제거, 비면 ''), 취소 → null
 * - 한 번에 하나만 연다. 열린 상태에서 다시 부르면 앞의 요청은 취소(false/null)로 끝난다.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ConfirmActionDialog } from '@o4o/ui';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger' | 'warning';
}

export interface PromptDialogOptions extends ConfirmDialogOptions {
  reasonPlaceholder?: string;
  /** 입력을 필수로 한다(비어 있으면 확인 버튼 비활성) */
  required?: boolean;
}

type Pending =
  | { kind: 'confirm'; options: ConfirmDialogOptions; resolve: (v: boolean) => void }
  | { kind: 'prompt'; options: PromptDialogOptions; resolve: (v: string | null) => void };

export function useConfirmDialog(): {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  prompt: (options: PromptDialogOptions) => Promise<string | null>;
  dialog: ReactNode;
} {
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);

  const settle = useCallback((next: Pending | null) => {
    const prev = pendingRef.current;
    if (prev && prev !== next) {
      if (prev.kind === 'confirm') prev.resolve(false);
      else prev.resolve(null);
    }
    pendingRef.current = next;
    setPending(next);
  }, []);

  const confirm = useCallback(
    (options: ConfirmDialogOptions) =>
      new Promise<boolean>((resolve) => settle({ kind: 'confirm', options, resolve })),
    [settle],
  );

  const prompt = useCallback(
    (options: PromptDialogOptions) =>
      new Promise<string | null>((resolve) => settle({ kind: 'prompt', options, resolve })),
    [settle],
  );

  const close = useCallback(() => settle(null), [settle]);

  // 키보드 흐름(브라우저 confirm/prompt 와 같게): 열리면 대화상자 안으로 포커스를 옮기고, 열린 동안 Tab 을 안에 가두며
  // Esc 로 취소한다. 닫히면 원래 누른 버튼으로 포커스를 되돌린다. (ConfirmActionDialog 는 document.body 로 portal 한다.)
  const isOpen = pending !== null;
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]');
    const box = dialogs[dialogs.length - 1];
    if (!box) return;
    const focusables = () =>
      Array.from(box.querySelectorAll<HTMLElement>('textarea, button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])'));
    const first = box.querySelector<HTMLElement>('textarea') ?? focusables()[focusables().length - 1] ?? null;
    first?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const index = items.indexOf(document.activeElement as HTMLElement);
      const next = event.shiftKey ? (index <= 0 ? items.length - 1 : index - 1) : (index === items.length - 1 || index < 0 ? 0 : index + 1);
      event.preventDefault();
      items[next].focus();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [isOpen, close]);

  const accept = useCallback(
    (reason?: string) => {
      const current = pendingRef.current;
      if (!current) return;
      pendingRef.current = null;
      setPending(null);
      if (current.kind === 'confirm') current.resolve(true);
      else current.resolve((reason ?? '').trim());
    },
    [],
  );

  const dialog = pending ? (
    <ConfirmActionDialog
      open
      onClose={close}
      onConfirm={accept}
      title={pending.options.title}
      message={pending.options.message}
      confirmText={pending.options.confirmText}
      cancelText={pending.options.cancelText}
      variant={pending.options.variant}
      showReason={pending.kind === 'prompt'}
      requireReason={pending.kind === 'prompt' && pending.options.required === true}
      reasonPlaceholder={pending.kind === 'prompt' ? pending.options.reasonPlaceholder : undefined}
    />
  ) : null;

  return { confirm, prompt, dialog };
}
