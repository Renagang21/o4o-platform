import { useImperativeHandle, useLayoutEffect, useRef, useState, type ReactNode, type Ref, type TextareaHTMLAttributes } from 'react';
import { tokens } from '../theme/tokens';

export interface AiRequestInputProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'style' | 'rows'> {
  inputRef?: Ref<HTMLTextAreaElement>;
  leading?: ReactNode;
  actions?: ReactNode;
  submitLabel?: string;
  submitDisabled?: boolean;
  submitTestId?: string;
  busy?: boolean;
  onSend?: () => void;
}

/** Design Core AI request surface. Works in Tailwind and plain CSS consumers. */
export function AiRequestInput({ inputRef, leading, actions, submitLabel, submitDisabled, submitTestId,
  busy, onSend, disabled, onFocus, onBlur, onKeyDown, ...input }: AiRequestInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(inputRef, () => ref.current!);
  const [focused, setFocused] = useState(false);
  const blocked = disabled || busy;
  const cannotSend = blocked || submitDisabled || !String(input.value ?? '').trim();
  useLayoutEffect(() => {
    const field = ref.current;
    if (!field) return;
    const resize = () => {
      field.style.height = '44px';
      // A multi-line example in a placeholder must not expand an empty request.
      if (field.value) field.style.height = `${Math.min(164, Math.max(44, field.scrollHeight))}px`;
    };
    resize();
    if (typeof ResizeObserver === 'undefined') return;
    let width = field.clientWidth;
    const observer = new ResizeObserver(() => {
      if (field.clientWidth !== width) { width = field.clientWidth; resize(); }
    });
    observer.observe(field);
    return () => observer.disconnect();
  }, [input.value]);
  return <div data-ai-request-input="" aria-busy={busy || undefined} style={{
    display: 'flex', alignItems: 'flex-end', gap: tokens.spacing.xs,
    width: '100%', maxWidth: 768, minHeight: 56, boxSizing: 'border-box',
    padding: tokens.spacing.xs, border: `2px solid ${focused ? tokens.colors.primary[600] : tokens.colors.neutral[500]}`,
    borderRadius: tokens.radius.xl, background: blocked ? tokens.colors.neutral[50] : '#fff',
    boxShadow: focused ? `0 0 0 2px ${tokens.colors.primary[100]}` : tokens.shadows.sm,
  }}>
    <style>{`[data-ai-request-input] textarea::placeholder { color: ${tokens.colors.neutral[500]}; opacity: 1; } [data-ai-request-input] button:focus-visible { outline: 2px solid ${tokens.colors.primary[600]}; outline-offset: 2px; }`}</style>
    {leading && <div style={{ flexShrink: 0 }}>{leading}</div>}
    <textarea {...input} ref={ref} disabled={disabled} rows={1}
      onFocus={event => { setFocused(true); onFocus?.(event); }}
      onBlur={event => { setFocused(false); onBlur?.(event); }}
      onKeyDown={event => {
        onKeyDown?.(event);
        if (!event.defaultPrevented && submitLabel && event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
          event.preventDefault();
          if (!cannotSend) { if (onSend) onSend(); else event.currentTarget.form?.requestSubmit(); }
        }
      }}
      style={{ flex: '1 1 0%', minWidth: 0, width: '100%', height: 44, minHeight: 44, maxHeight: 164,
        boxSizing: 'border-box', resize: 'none', overflowY: 'auto', margin: 0, padding: '10px 8px',
        border: 0, borderRadius: tokens.radius.lg, outline: 'none', boxShadow: 'none', background: 'transparent',
        fontFamily: 'inherit', fontSize: tokens.typography.bodyLg.fontSize, lineHeight: '24px', color: tokens.colors.neutral[900],
      }} />
    {submitLabel && <button type={onSend ? 'button' : 'submit'} onClick={onSend} disabled={cannotSend}
      aria-label={submitLabel} title={submitLabel} data-testid={submitTestId}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        width: 44, height: 44, padding: 0, border: 0, borderRadius: tokens.radius.lg,
        background: cannotSend ? tokens.colors.neutral[200] : tokens.colors.primary[600],
        color: cannotSend ? tokens.colors.neutral[600] : '#fff', cursor: cannotSend ? 'not-allowed' : 'pointer',
      }}>
      {busy ? <span aria-hidden="true" style={{ fontSize: 20 }}>…</span> : <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>}
    </button>}
    {actions && <div style={{ flexShrink: 0 }}>{actions}</div>}
  </div>;
}
