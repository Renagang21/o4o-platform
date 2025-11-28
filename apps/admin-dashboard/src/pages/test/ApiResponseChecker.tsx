import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';

export default function ApiResponseChecker() {
  const [email, setEmail] = useState('partner04@test.com');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  const searchByEmail = async () => {
    try {
      setLoading(true);
      setResponse(null);

      console.log('🔍 Searching for:', email);

      // Search users by email
      const searchResponse = await authClient.api.get(`/v1/users?search=${email}`);

      console.log('📦 Search Response:', searchResponse.data);

      if (searchResponse.data?.data?.users?.length > 0) {
        const user = searchResponse.data.data.users[0];
        setUserId(user.id);

        // Get full user details
        const userResponse = await authClient.api.get(`/v1/users/${user.id}`);

        console.log('👤 User Response:', userResponse.data);
        setResponse(userResponse.data);

        toast.success('User found!');
      } else {
        toast.error('User not found');
        setResponse({ error: 'User not found' });
      }
    } catch (error: any) {
      console.error('❌ Error:', error);
      setResponse({
        error: error.message,
        details: error.response?.data
      });
      toast.error('Failed to search user');
    } finally {
      setLoading(false);
    }
  };

  const checkById = async () => {
    try {
      setLoading(true);
      setResponse(null);

      console.log('🔍 Fetching user:', userId);

      const userResponse = await authClient.api.get(`/v1/users/${userId}`);

      console.log('👤 User Response:', userResponse.data);
      setResponse(userResponse.data);

      toast.success('User found!');
    } catch (error: any) {
      console.error('❌ Error:', error);
      setResponse({
        error: error.message,
        details: error.response?.data
      });
      toast.error('Failed to fetch user');
    } finally {
      setLoading(false);
    }
  };

  const renderData = () => {
    if (!response) return null;

    const userData = response.data?.data || response.data || response;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-semibold">Email</Label>
            <p className="mt-1 p-2 bg-gray-100 rounded">{userData.email}</p>
          </div>
          <div>
            <Label className="text-sm font-semibold">Name</Label>
            <p className="mt-1 p-2 bg-gray-100 rounded">{userData.name || userData.firstName + ' ' + userData.lastName}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-semibold">Role (Single)</Label>
            <p className="mt-1 p-2 bg-blue-100 rounded font-mono text-blue-800">
              {userData.role}
            </p>
          </div>
          <div>
            <Label className="text-sm font-semibold">Roles (Array)</Label>
            <p className="mt-1 p-2 bg-green-100 rounded font-mono text-green-800">
              {JSON.stringify(userData.roles)}
            </p>
          </div>
        </div>

        <div>
          <Label className="text-sm font-semibold">Status</Label>
          <p className="mt-1 p-2 bg-gray-100 rounded">{userData.status}</p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
          <p className="text-sm font-semibold text-yellow-800 mb-2">🔍 Analysis:</p>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>✓ <strong>role</strong>: {userData.role} (단일 값, DB의 "role" 컬럼)</li>
            <li>✓ <strong>roles</strong>: {JSON.stringify(userData.roles)} (배열, DB의 "roles" 컬럼)</li>
            {Array.isArray(userData.roles) && userData.roles.length > 1 && (
              <li className="text-green-700">✅ 복수 역할이 저장되어 있습니다!</li>
            )}
            {Array.isArray(userData.roles) && userData.roles.length === 1 && (
              <li className="text-red-700">⚠️ 역할이 1개만 저장되어 있습니다.</li>
            )}
          </ul>
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold mb-2">Full API Response (JSON)</summary>
          <Textarea
            value={JSON.stringify(response, null, 2)}
            readOnly
            className="font-mono text-xs h-96 mt-2"
          />
        </details>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API Response Checker</h1>
        <p className="text-gray-600 mt-1">Check user data from API response</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Search by Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <Button
              onClick={searchByEmail}
              disabled={loading || !email}
              className="w-full"
            >
              {loading ? 'Searching...' : '🔍 Search by Email'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Check by User ID</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="UUID"
              />
            </div>
            <Button
              onClick={checkById}
              disabled={loading || !userId}
              className="w-full"
            >
              {loading ? 'Fetching...' : '🔍 Fetch by ID'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {response && (
        <Card>
          <CardHeader>
            <CardTitle>User Data from API</CardTitle>
          </CardHeader>
          <CardContent>
            {renderData()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
