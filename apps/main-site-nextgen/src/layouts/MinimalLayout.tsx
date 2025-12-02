import type { LayoutProps } from './DefaultLayout';

export function MinimalLayout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      {children}
    </div>
  );
}
