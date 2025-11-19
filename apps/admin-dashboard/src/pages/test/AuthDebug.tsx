import React, { useState, useEffect } from 'react';
import { useAuth } from '@o4o/auth-context';
import { authClient } from '@o4o/auth-client';

const AuthDebug: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [tokenInfo, setTokenInfo] = useState<any>({});
  const [apiTestResults, setApiTestResults] = useState<any>({});

  useEffect(() => {
    // Check localStorage for tokens
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const authToken = localStorage.getItem('authToken');
    const adminAuthStorage = localStorage.getItem('admin-auth-storage');

    let parsedAdminAuth = null;
    if (adminAuthStorage) {
      try {
        parsedAdminAuth = JSON.parse(adminAuthStorage);
      } catch (e) {
        parsedAdminAuth = 'Parse error';
      }
    }

    setTokenInfo({
      accessToken: accessToken ? `${accessToken.substring(0, 20)}...` : 'Not found',
      refreshToken: refreshToken ? `${refreshToken.substring(0, 20)}...` : 'Not found',
      authToken: authToken ? `${authToken.substring(0, 20)}...` : 'Not found',
      adminAuthStorage: parsedAdminAuth
    });
  }, []);

  const testUserPermissions = async () => {
    if (!user?.id) {
      setApiTestResults(prev => ({ ...prev, userPermissions: 'No user ID' }));
      return;
    }

    try {
      const response = await authClient.api.get(`/userRole/${user.id}/permissions`);
      setApiTestResults(prev => ({
        ...prev,
        userPermissions: {
          status: 'Success',
          data: response.data
        }
      }));
    } catch (error: any) {
      setApiTestResults(prev => ({
        ...prev,
        userPermissions: {
          status: 'Error',
          message: error.response?.data?.message || error.message,
          statusCode: error.response?.status
        }
      }));
    }
  };

  const testPostsAPI = async () => {
    try {
      const response = await authClient.api.get('/posts', {
        params: { per_page: 1 }
      });
      setApiTestResults(prev => ({
        ...prev,
        posts: {
          status: 'Success',
          count: response.data?.length || 0
        }
      }));
    } catch (error: any) {
      setApiTestResults(prev => ({
        ...prev,
        posts: {
          status: 'Error',
          message: error.response?.data?.message || error.message,
          statusCode: error.response?.status
        }
      }));
    }
  };

  const testAuthCheck = async () => {
    try {
      const response = await authClient.api.get('/auth/check');
      setApiTestResults(prev => ({
        ...prev,
        authCheck: {
          status: 'Success',
          data: response.data
        }
      }));
    } catch (error: any) {
      setApiTestResults(prev => ({
        ...prev,
        authCheck: {
          status: 'Error',
          message: error.response?.data?.message || error.message,
          statusCode: error.response?.status
        }
      }));
    }
  };

  const refreshTokenTest = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        setApiTestResults(prev => ({
          ...prev,
          refresh: {
            status: 'Error',
            message: 'No refresh token found'
          }
        }));
        return;
      }

      const response = await authClient.api.post('/auth/refresh', { refreshToken });
      setApiTestResults(prev => ({
        ...prev,
        refresh: {
          status: 'Success',
          data: 'Token refreshed successfully'
        }
      }));

      // Reload token info
      window.location.reload();
    } catch (error: any) {
      setApiTestResults(prev => ({
        ...prev,
        refresh: {
          status: 'Error',
          message: error.response?.data?.message || error.message,
          statusCode: error.response?.status
        }
      }));
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug Panel</h1>

      {/* User Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Current User</h2>
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium">Authenticated:</span> {isAuthenticated ? 'Yes' : 'No'}
          </div>
          <div>
            <span className="font-medium">User ID:</span> {user?.id || 'None'}
          </div>
          <div>
            <span className="font-medium">Email:</span> {user?.email || 'None'}
          </div>
          <div>
            <span className="font-medium">Role:</span> {user?.role || 'None'}
          </div>
        </div>
      </div>

      {/* Token Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Token Storage</h2>
        <div className="space-y-2 text-sm font-mono">
          <div>
            <span className="font-medium">accessToken:</span> {tokenInfo.accessToken}
          </div>
          <div>
            <span className="font-medium">refreshToken:</span> {tokenInfo.refreshToken}
          </div>
          <div>
            <span className="font-medium">authToken:</span> {tokenInfo.authToken}
          </div>
          <div>
            <span className="font-medium">admin-auth-storage:</span>
            <pre className="mt-1 text-xs bg-gray-100 p-2 rounded">
              {JSON.stringify(tokenInfo.adminAuthStorage, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      {/* API Tests */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">API Tests</h2>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={testAuthCheck}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test /auth/check
          </button>
          <button
            onClick={testUserPermissions}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test User Permissions
          </button>
          <button
            onClick={testPostsAPI}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test Posts API
          </button>
          <button
            onClick={refreshTokenTest}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Refresh Token
          </button>
        </div>

        <div className="space-y-3">
          {Object.entries(apiTestResults).map(([key, result]) => (
            <div key={key} className="border rounded p-3">
              <h3 className="font-medium mb-1">{key}</h3>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>

      {/* authClient Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">AuthClient Configuration</h2>
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium">Base URL:</span> {(authClient.api.defaults as any).baseURL}
          </div>
          <div>
            <span className="font-medium">Timeout:</span> {(authClient.api.defaults as any).timeout}ms
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthDebug;