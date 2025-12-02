import type { LayoutProps } from './DefaultLayout';

export function DashboardLayout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-6">Dashboard</h2>
          <nav className="space-y-2">
            <a href="#" className="block px-4 py-2 rounded hover:bg-gray-100">
              Overview
            </a>
            <a href="#" className="block px-4 py-2 rounded hover:bg-gray-100">
              Products
            </a>
            <a href="#" className="block px-4 py-2 rounded hover:bg-gray-100">
              Orders
            </a>
            <a href="#" className="block px-4 py-2 rounded hover:bg-gray-100">
              Settings
            </a>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
