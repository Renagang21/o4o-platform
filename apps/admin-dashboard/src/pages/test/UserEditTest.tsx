import React, { useState, useEffect } from 'react';
import { useAuth } from '@o4o/auth-context';
import axios from 'axios';

const UserEditTest: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [tokenInfo, setTokenInfo] = useState<any>({});
  const [testResults, setTestResults] = useState<any>({});
  const [testUserId, setTestUserId] = useState<string>('');

  useEffect(() => {
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
      fullToken: extractedToken,
      decodedToken
    });
  }, []);

  const getToken = () => {
    // Get token from multiple sources
    let token = localStorage.getItem('authToken');
    if (!token) {
      token = localStorage.getItem('accessToken');
    }
    if (!token) {
      const adminStorage = localStorage.getItem('admin-auth-storage');
      if (adminStorage) {
        try {
          const parsed = JSON.parse(adminStorage);
          token = parsed.state?.token;
        } catch (e) {
          console.error('Failed to parse admin-auth-storage:', e);
        }
      }
    }
    return token;
  };

  const testGetAllUsers = async () => {
    console.log('🔍 Testing Get All Users API...');
    setTestResults(prev => ({ ...prev, allUsers: { status: 'Loading...' } }));

    const token = getToken();
    const baseURL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr/api';

    console.log('🔑 Using token:', token?.substring(0, 30) + '...');
    console.log('🌐 Request URL:', `${baseURL}/users`);

    try {
      const response = await axios.get(`${baseURL}/users`, {
        params: { page: 1, limit: 10 },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      console.log('✅ Get All Users Success:', response);

      setTestResults(prev => ({
        ...prev,
        allUsers: {
          status: 'Success',
          data: response.data,
          statusCode: response.status,
          headers: response.headers
        }
      }));
    } catch (error: any) {
      console.error('❌ Get All Users Error:', error);
      console.error('Response:', error.response);
      console.error('Request:', error.config);

      setTestResults(prev => ({
        ...prev,
        allUsers: {
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

  const testGetUser = async () => {
    if (!testUserId) {
      alert('사용자 ID를 입력해주세요');
      return;
    }

    console.log('🔍 Testing Get Single User API...');
    setTestResults(prev => ({ ...prev, singleUser: { status: 'Loading...' } }));

    const token = getToken();
    const baseURL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr/api';

    console.log('🔑 Using token:', token?.substring(0, 30) + '...');
    console.log('🌐 Request URL:', `${baseURL}/users/${testUserId}`);

    try {
      const response = await axios.get(`${baseURL}/users/${testUserId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      console.log('✅ Get User Success:', response);

      setTestResults(prev => ({
        ...prev,
        singleUser: {
          status: 'Success',
          data: response.data,
          statusCode: response.status,
          headers: response.headers,
          dataStructure: {
            hasSuccess: 'success' in response.data,
            hasData: 'data' in response.data,
            dataType: typeof response.data.data,
            dataKeys: response.data.data ? Object.keys(response.data.data) : null
          }
        }
      }));
    } catch (error: any) {
      console.error('❌ Get User Error:', error);
      console.error('Response:', error.response);
      console.error('Request:', error.config);

      setTestResults(prev => ({
        ...prev,
        singleUser: {
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

  const testGetUserApprovalHistory = async () => {
    if (!testUserId) {
      alert('사용자 ID를 입력해주세요');
      return;
    }

    console.log('🔍 Testing Get User Approval History API...');
    setTestResults(prev => ({ ...prev, approvalHistory: { status: 'Loading...' } }));

    const token = getToken();
    const baseURL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr/api';

    console.log('🔑 Using token:', token?.substring(0, 30) + '...');
    console.log('🌐 Request URL:', `${baseURL}/users/${testUserId}/approval-history`);

    try {
      const response = await axios.get(`${baseURL}/users/${testUserId}/approval-history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      console.log('✅ Get Approval History Success:', response);

      setTestResults(prev => ({
        ...prev,
        approvalHistory: {
          status: 'Success',
          data: response.data,
          statusCode: response.status,
          headers: response.headers,
          dataStructure: {
            isArray: Array.isArray(response.data),
            hasData: 'data' in response.data,
            dataIsArray: Array.isArray(response.data?.data),
            hasActivities: 'activities' in response.data
          }
        }
      }));
    } catch (error: any) {
      console.error('❌ Get Approval History Error:', error);

      setTestResults(prev => ({
        ...prev,
        approvalHistory: {
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

  const testUnifiedClient = async () => {
    console.log('🔍 Testing with unifiedApi...');
    setTestResults(prev => ({ ...prev, unifiedClient: { status: 'Loading...' } }));

    try {
      // Import unifiedApi dynamically
      const { unifiedApi } = await import('@/api/unified-client');

      const response = await unifiedApi.raw.get('/users', {
        params: { page: 1, limit: 10 }
      });

      console.log('✅ Unified Client Success:', response);

      setTestResults(prev => ({
        ...prev,
        unifiedClient: {
          status: 'Success',
          data: response.data,
          note: 'unified-client를 통한 요청이 성공했습니다. 401 에러가 발생하면 자동으로 로그인 페이지로 리다이렉트됩니다.'
        }
      }));
    } catch (error: any) {
      console.error('❌ Unified Client Error:', error);

      setTestResults(prev => ({
        ...prev,
        unifiedClient: {
          status: 'Error',
          message: error.message,
          note: '이 에러가 발생하면 보통 로그인 페이지로 리다이렉트됩니다.'
        }
      }));
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">사용자 편집 API 테스트</h1>

      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
        ℹ️ 이 페이지는 unified-client를 우회하여 직접 API를 호출합니다. 401 에러가 발생해도 로그인 페이지로 리다이렉트되지 않습니다.
      </div>

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

      {/* Test User ID Input */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">테스트할 사용자 ID</h2>
        <input
          type="text"
          value={testUserId}
          onChange={(e) => setTestUserId(e.target.value)}
          placeholder="사용자 UUID를 입력하세요"
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-sm text-gray-600 mt-2">
          💡 먼저 "전체 사용자 조회"를 클릭하여 사용자 목록을 확인하고, 그 중 하나의 ID를 복사하세요
        </p>
      </div>

      {/* API Tests */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">API 테스트</h2>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={testGetAllUsers}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            전체 사용자 조회
          </button>
          <button
            onClick={testGetUser}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            disabled={!testUserId}
          >
            사용자 상세 조회
          </button>
          <button
            onClick={testGetUserApprovalHistory}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            disabled={!testUserId}
          >
            승인 이력 조회
          </button>
          <button
            onClick={testUnifiedClient}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Unified Client 테스트
          </button>
        </div>

        <div className="space-y-4">
          {Object.entries(testResults).map(([key, result]) => (
            <div key={key} className="border rounded p-4">
              <h3 className="font-medium mb-2 text-lg capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</h3>
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
          <li>브라우저 개발자 도구를 열고 <strong>Console 탭</strong>을 확인하세요</li>
          <li><strong>Network 탭</strong>도 함께 확인하면 더 상세한 정보를 볼 수 있습니다</li>
          <li>먼저 "전체 사용자 조회" 버튼을 클릭하여 사용자 목록을 확인하세요</li>
          <li>결과에서 사용자 ID를 복사하여 위 입력창에 붙여넣으세요</li>
          <li>"사용자 상세 조회" 및 "승인 이력 조회" 버튼을 클릭하여 테스트하세요</li>
          <li>에러가 발생해도 로그인 페이지로 리다이렉트되지 않고 여기에 결과가 표시됩니다</li>
          <li>모든 요청/응답은 콘솔에도 자세히 기록됩니다</li>
          <li>"Unified Client 테스트"는 실제 프로덕션 코드와 동일한 방식으로 요청합니다 (401 시 리다이렉트 발생)</li>
        </ol>
      </div>
    </div>
  );
};

export default UserEditTest;
