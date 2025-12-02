import type { ViewSchema } from '@/view/types';

export interface LayoutProps {
  view: ViewSchema;
  children: React.ReactNode;
}

export function DefaultLayout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">O4O Platform</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-gray-600 text-sm">
            © 2025 O4O Platform. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
