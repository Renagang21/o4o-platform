import { FC } from 'react';
import { useAuth } from '@o4o/auth-context';

const AuthInspector: FC = () => {
  const auth = useAuth();

  const clearAuth = () => {
    localStorage.removeItem('admin-auth-storage');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  // Get localStorage data
  const authStorage = localStorage.getItem('admin-auth-storage');
  const parsedStorage = authStorage ? JSON.parse(authStorage) : null;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Auth Inspector</h1>

        {/* Auth Context Status */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Auth Context Status</h2>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex gap-2">
              <span className="font-bold">isAuthenticated:</span>
              <span className={auth.isAuthenticated ? 'text-green-600' : 'text-red-600'}>
                {String(auth.isAuthenticated)}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold">isLoading:</span>
              <span>{String(auth.isLoading)}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold">isAdmin:</span>
              <span className={auth.isAdmin ? 'text-green-600' : 'text-red-600'}>
                {String(auth.isAdmin)}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold">error:</span>
              <span className="text-red-600">{auth.error || 'null'}</span>
            </div>
          </div>
        </div>

        {/* User Object */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">User Object from useAuth()</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
            {JSON.stringify(auth.user, null, 2)}
          </pre>
        </div>

        {/* LocalStorage */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">LocalStorage: admin-auth-storage</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
            {JSON.stringify(parsedStorage, null, 2)}
          </pre>
        </div>

        {/* Tokens */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Stored Tokens</h2>
          <div className="space-y-2 font-mono text-xs">
            <div>
              <span className="font-bold">accessToken:</span>
              <div className="break-all bg-gray-100 p-2 rounded mt-1">
                {localStorage.getItem('accessToken') || 'null'}
              </div>
            </div>
            <div>
              <span className="font-bold">refreshToken:</span>
              <div className="break-all bg-gray-100 p-2 rounded mt-1">
                {localStorage.getItem('refreshToken') || 'null'}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="space-x-4">
            <button
              onClick={clearAuth}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Clear All Auth & Reload
            </button>
            <button
              onClick={() => window.location.href = '/login'}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go to Login
            </button>
          </div>
        </div>

        {/* Diagnosis */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6">
          <h2 className="text-xl font-semibold mb-4 text-yellow-800">Diagnosis</h2>
          <div className="space-y-2 text-sm">
            {auth.isAuthenticated && !auth.isAdmin && (
              <div className="text-red-600 font-bold">
                ❌ Problem: User is authenticated but NOT admin!
                <div className="mt-2 text-gray-700">
                  User object is missing admin role. Check:
                  <ul className="list-disc ml-6 mt-2">
                    <li>user.role should be "admin" or "administrator"</li>
                    <li>OR user.roles array should include "admin"</li>
                    <li>Current role: {auth.user?.role || 'undefined'}</li>
                    <li>Current roles: {(auth.user as any)?.roles ? JSON.stringify((auth.user as any).roles) : 'undefined'}</li>
                  </ul>
                </div>
              </div>
            )}
            {auth.isAuthenticated && auth.isAdmin && (
              <div className="text-green-600 font-bold">
                ✅ Auth is working correctly - user has admin access
              </div>
            )}
            {!auth.isAuthenticated && (
              <div className="text-gray-600">
                Not authenticated - this is expected before login
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthInspector;
