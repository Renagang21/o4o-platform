import type { ReactNode } from 'react';

interface AccountPageLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AccountPageLayout({ title, subtitle, children }: AccountPageLayoutProps) {
  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}
