import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

/** Account presentation only; the service retains its session and role-aware menu items. */
export function ServiceAccountMenu({ displayName, email, roleLabel, badge, children, onLogout, logoutLabel = 'O4O 로그아웃' }: Readonly<{
  displayName: string;
  email?: string;
  roleLabel?: string;
  badge?: ReactNode;
  children?: ReactNode;
  onLogout: () => void | Promise<void>;
  logoutLabel?: string;
}>) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const location = useLocation();
  useEffect(() => { setOpen(false); }, [location.pathname, location.search, location.hash, location.key]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); button.current?.focus(); }
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  return <div className="o4o-service-account" ref={root}>
    <button ref={button} type="button" className="o4o-service-account__trigger" aria-label="계정 메뉴" aria-expanded={open} aria-controls={open ? id : undefined} title={displayName} onClick={() => setOpen(value => !value)}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="9" r="3" /><path d="M6 19v-1a6 6 0 0 1 12 0v1" /></svg>
      <span className="o4o-service-account__name">{displayName}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </button>
    {open && <section id={id} className="o4o-service-account__panel" aria-label="계정 메뉴">
      <div className="o4o-service-account__identity">
        <p className="o4o-service-account__display-name">{displayName}</p>
        {email && <p>{email}</p>}
        {roleLabel && <p>{roleLabel}</p>}
        {badge}
      </div>
      {children && <div className="o4o-service-account__items">{children}</div>}
      <button type="button" className="o4o-service-account__logout" onClick={() => { setOpen(false); void onLogout(); }}>{logoutLabel}</button>
    </section>}
  </div>;
}
