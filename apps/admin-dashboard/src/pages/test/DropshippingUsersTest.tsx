import React, { useState, useEffect } from 'react';
import { useAuth } from '@o4o/auth-context';
import { UserApi } from '../../api/userApi';
import { unifiedApi } from '../../api/unified-client';

const DropshippingUsersTest: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [tokenInfo, setTokenInfo] = useState<any>({});
  const [testResults, setTestResults] = useState<any>({});
  const [autoRedirect, setAutoRedirect] = useState(false);

  useEffect(() => {
    // Override window.location.href to prevent redirect
    const originalLocationHref = Object.getOwnPropertyDescriptor(window.location, 'href');

    Object.defineProperty(window.location, 'href', {
      set: function(newValue) {
        console.log('🚫 Prevented redirect to:', newValue);
        setAutoRedirect(true);
        setTestResults(prev => ({
          ...prev,
          redirectAttempt: {
            status: 'BLOCKED',
            targetUrl: newValue,
            timestamp: new Date().toISOString()
          }
        }));
      },
      get: function() {
        return originalLocationHref?.get?.call(window.location) || '';
      }
    });

    // Check localStorage for tokens
    const accessToken = localStorage.getItem('accessToken');
    const authToken = localStorage.getItem('authToken');
    const adminAuthStorage = localStorage.getItem('admin-auth-storage');

    let parsedAdminAuth = null;
    let extractedToken = null;
    if (adminAuthStorage) {
      try {
        parsedAdminAuth = JSON.parse(adminAuthStorage);
        extractedToken = parsedAdminAuth?.state?.token;
      } catch (e) {
        parsedAdminAuth = 'Parse error';
      }
    }

    // Decode token to check expiration
    let decodedToken = null;
    if (extractedToken) {
      try {
        const payload = JSON.parse(atob(extractedToken.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        decodedToken = {
          exp: payload.exp,
          iat: payload.iat,
          userId: payload.sub || payload.userId,
          role: payload.role,
          isExpired: payload.exp ? payload.exp < now : false,
          expiresIn: payload.exp ? payload.exp - now : null,
          expiresInMinutes: payload.exp ? Math.floor((payload.exp - now) / 60) : null
        };
      } catch (e) {
        decodedToken = { error: 'Failed to decode token' };
      }
    }

    setTokenInfo({
      accessToken: accessToken ? `${accessToken.substring(0, 20)}...` : 'Not found',
      authToken: authToken ? `${authToken.substring(0, 20)}...` : 'Not found',
      adminAuthStorage: parsedAdminAuth,
      extractedToken: extractedToken ? `${extractedToken.substring(0, 20)}...` : 'Not found',
      decodedToken
    });
  }, []);

  const testSellersAPI = async () => {
    console.log('🔍 Testing Sellers API...');
    setTestResults(prev => ({ ...prev, sellers: { status: 'Loading...' } }));

    try {
      const response = await UserApi.getUsers(1, 20, { role: 'seller' });
      console.log('✅ Sellers API Success:', response);

      setTestResults(prev => ({
        ...prev,
        sellers: {
          status: 'Success',
          data: response,
          total: response?.total || 0,
          users: response?.data?.length || 0
        }
      }));
    } catch (error: any) {
      console.error('❌ Sellers API Error:', error);
      console.error('Response:', error.response);
      console.error('Request:', error.config);

      setTestResults(prev => ({
        ...prev,
        sellers: {
          status: 'Error',
          message: error.message,
          statusCode: error.response?.status,
          statusText: error.response?.statusText,
          responseData: error.response?.data,
          requestUrl: error.config?.url,
          requestHeaders: error.config?.headers
        }
      }));
    }
  };

  const testSuppliersAPI = async () => {
    console.log('🔍 Testing Suppliers API...');
    setTestResults(prev => ({ ...prev, suppliers: { status: 'Loading...' } }));

    try {
      const response = await UserApi.getUsers(1, 20, { role: 'supplier' });
      console.log('✅ Suppliers API Success:', response);

      setTestResults(prev => ({
        ...prev,
        suppliers: {
          status: 'Success',
          data: response,
          total: response?.total || 0,
          users: response?.data?.length || 0
        }
      }));
    } catch (error: any) {
      console.error('❌ Suppliers API Error:', error);

      setTestResults(prev => ({
        ...prev,
        suppliers: {
          status: 'Error',
          message: error.message,
          statusCode: error.response?.status,
          statusText: error.response?.statusText,
          responseData: error.response?.data,
          requestUrl: error.config?.url,
          requestHeaders: error.config?.headers
        }
      }));
    }
  };

  const testPartnersAPI = async () => {
    console.log('🔍 Testing Partners API...');
    setTestResults(prev => ({ ...prev, partners: { status: 'Loading...' } }));

    try {
      const response = await UserApi.getUsers(1, 20, { role: 'partner' });
      console.log('✅ Partners API Success:', response);

      setTestResults(prev => ({
        ...prev,
        partners: {
          status: 'Success',
          data: response,
          total: response?.total || 0,
          users: response?.data?.length || 0
        }
      }));
    } catch (error: any) {
      console.error('❌ Partners API Error:', error);

      setTestResults(prev => ({
        ...prev,
        partners: {
          status: 'Error',
          message: error.message,
          statusCode: error.response?.status,
          statusText: error.response?.statusText,
          responseData: error.response?.data,
          requestUrl: error.config?.url,
          requestHeaders: error.config?.headers
        }
      }));
    }
  };

  const testRawAPI = async () => {
    console.log('🔍 Testing Raw API...');
    setTestResults(prev => ({ ...prev, raw: { status: 'Loading...' } }));

    try {
      const response = await unifiedApi.raw.get('/users?page=1&limit=20&role=seller');
      console.log('✅ Raw API Success:', response);

      setTestResults(prev => ({
        ...prev,
        raw: {
          status: 'Success',
          data: response.data,
          headers: response.headers,
          statusCode: response.status
        }
      }));
    } catch (error: any) {
      console.error('❌ Raw API Error:', error);

      setTestResults(prev => ({
        ...prev,
        raw: {
          status: 'Error',
          message: error.message,
          statusCode: error.response?.status,
          statusText: error.response?.statusText,
          responseData: error.response?.data,
          requestUrl: error.config?.url,
          requestHeaders: error.config?.headers
        }
      }));
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">드롭쉬핑 유저 API 테스트</h1>

      {autoRedirect && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          ⚠️ 자동 리다이렉트가 차단되었습니다! 아래 결과를 확인하세요.
        </div>
      )}

      {/* User Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">현재 사용자 정보</h2>
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium">인증 상태:</span>{' '}
            <span className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>
              {isAuthenticated ? '✅ 인증됨' : '❌ 미인증'}
            </span>
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
        <h2 className="text-lg font-semibold mb-4">토큰 정보</h2>
        <div className="space-y-3 text-sm font-mono">
          <div>
            <span className="font-medium">accessToken:</span> {tokenInfo.accessToken}
          </div>
          <div>
            <span className="font-medium">authToken:</span> {tokenInfo.authToken}
          </div>
          <div>
            <span className="font-medium">Extracted from admin-auth-storage:</span> {tokenInfo.extractedToken}
          </div>
          {tokenInfo.decodedToken && (
            <div>
              <span className="font-medium">Decoded Token:</span>
              <pre className="mt-1 text-xs bg-gray-100 p-2 rounded">
                {JSON.stringify(tokenInfo.decodedToken, null, 2)}
              </pre>
              {tokenInfo.decodedToken.isExpired && (
                <div className="text-red-600 font-bold mt-2">⚠️ 토큰이 만료되었습니다!</div>
              )}
              {!tokenInfo.decodedToken.isExpired && tokenInfo.decodedToken.expiresInMinutes !== null && (
                <div className="text-green-600 mt-2">
                  ✅ 토큰이 {tokenInfo.decodedToken.expiresInMinutes}분 후에 만료됩니다.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* API Tests */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">API 테스트</h2>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={testSellersAPI}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            판매자 목록 조회
          </button>
          <button
            onClick={testSuppliersAPI}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            공급자 목록 조회
          </button>
          <button
            onClick={testPartnersAPI}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            파트너 목록 조회
          </button>
          <button
            onClick={testRawAPI}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Raw API 테스트
          </button>
        </div>

        <div className="space-y-4">
          {Object.entries(testResults).map(([key, result]) => (
            <div key={key} className="border rounded p-4">
              <h3 className="font-medium mb-2 text-lg capitalize">{key}</h3>
              <div className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-96">
                <pre>{JSON.stringify(result, null, 2)}</pre>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold mb-2">사용 방법:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>브라우저 개발자 도구를 열고 Console 탭을 확인하세요</li>
          <li>Network 탭도 함께 확인하면 더 상세한 정보를 볼 수 있습니다</li>
          <li>위 버튼들을 클릭하여 API를 테스트하세요</li>
          <li>에러가 발생하면 자동 리다이렉트가 차단되고 여기에 결과가 표시됩니다</li>
          <li>모든 요청/응답은 콘솔에도 자세히 기록됩니다</li>
        </ol>
      </div>
    </div>
  );
};

export default DropshippingUsersTest;
