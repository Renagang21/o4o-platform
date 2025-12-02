import type { LayoutProps } from './DefaultLayout';

export function AuthLayout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">O4O Platform</h1>
          <p className="text-gray-600 mt-2">NextGen Frontend</p>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {children}
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-sm text-gray-600">
          © 2025 O4O Platform. All rights reserved.
        </p>
      </div>
    </div>
  );
}
