import type { LayoutProps } from './DefaultLayout';

export function ShopLayout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Shop</h1>
        </div>
      </header>

      {/* Category Bar */}
      <div className="bg-gray-50 border-b">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex gap-6">
            <a href="#" className="text-sm hover:text-blue-600">All Products</a>
            <a href="#" className="text-sm hover:text-blue-600">Skincare</a>
            <a href="#" className="text-sm hover:text-blue-600">Makeup</a>
            <a href="#" className="text-sm hover:text-blue-600">Haircare</a>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-sm">© 2025 O4O Platform</p>
        </div>
      </footer>
    </div>
  );
}
