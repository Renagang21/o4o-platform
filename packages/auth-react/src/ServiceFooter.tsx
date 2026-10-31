import type { ReactNode } from "react";

/** Shared layout; each service retains its actual operator and policy destinations. */
export function ServiceFooter({
  brand,
  links,
  children,
  copyright = `© ${new Date().getFullYear()} Neture`,
}: {
  brand: string;
  links: ReactNode;
  children?: ReactNode;
  copyright?: ReactNode;
}) {
  return (
    <footer className="o4o-service-footer">
      <div className="o4o-service-footer-inner">
        <div>
          <strong>{brand}</strong>
          {copyright && <p>{copyright}</p>}
        </div>
        <nav aria-label="이용 안내 및 정책">{links}</nav>
        {children && <div className="o4o-service-footer-legal">{children}</div>}
      </div>
    </footer>
  );
}
