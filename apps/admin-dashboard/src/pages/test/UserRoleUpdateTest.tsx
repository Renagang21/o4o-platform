import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';

export default function UserRoleUpdateTest() {
  const [userId, setUserId] = useState('735c6b27-5516-44a6-8398-93d5f2e982fe');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['customer', 'seller']);
  const [requestData, setRequestData] = useState<any>(null);
  const [responseData, setResponseData] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  const testRoleUpdate = async () => {
    try {
      setError(null);
      setResponseData(null);

      // Prepare request data
      const payload = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        status: 'active',
        roles: selectedRoles
      };

      setRequestData(payload);

      console.log('🔍 Request URL:', `${authClient.baseURL}/users/${userId}`);
      console.log('🔍 Request Method:', 'PUT');
      console.log('🔍 Request Payload:', JSON.stringify(payload, null, 2));

      // Make the request
      const response = await authClient.api.put(`/users/${userId}`, payload);

      console.log('✅ Response:', response);
      setResponseData(response.data);
      toast.success('Request successful!');
    } catch (err: any) {
      console.error('❌ Error:', err);
      console.error('❌ Error Response:', err.response);
      console.error('❌ Error Data:', err.response?.data);

      setError({
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        config: {
          url: err.config?.url,
          method: err.config?.method,
          data: err.config?.data
        }
      });

      toast.error(`Error: ${err.response?.status} - ${err.response?.data?.error || err.message}`);
    }
  };

  const availableRoles = [
    'super_admin',
    'admin',
    'vendor',
    'seller',
    'user',
    'business',
    'partner',
    'supplier',
    'affiliate',
    'manager',
    'customer'
  ];

  const toggleRole = (role: string) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter(r => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Role Update Test</h1>
          <p className="text-gray-600 mt-1">Debug page for testing user role update API</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Test Parameters</CardTitle>
            <CardDescription>Configure the test request</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter user ID"
              />
            </div>

            <div>
              <Label>Select Roles (Multiple)</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {availableRoles.map((role) => (
                  <div
                    key={role}
                    onClick={() => toggleRole(role)}
                    className={`p-2 border rounded cursor-pointer transition-colors ${
                      selectedRoles.includes(role)
                        ? 'bg-blue-500 text-white border-blue-600'
                        : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(role)}
                        onChange={() => {}}
                        className="pointer-events-none"
                      />
                      <span className="text-sm">{role}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={testRoleUpdate} className="w-full">
              🧪 Test Role Update API
            </Button>
          </CardContent>
        </Card>

        {/* API Info */}
        <Card>
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
            <CardDescription>Current API settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <Label className="text-xs text-gray-600">Base URL</Label>
              <p className="font-mono text-sm bg-gray-100 p-2 rounded">
                {authClient.baseURL}
              </p>
            </div>
            <div>
              <Label className="text-xs text-gray-600">Endpoint</Label>
              <p className="font-mono text-sm bg-gray-100 p-2 rounded">
                PUT /users/{'{userId}'}
              </p>
            </div>
            <div>
              <Label className="text-xs text-gray-600">Selected Roles</Label>
              <p className="font-mono text-sm bg-gray-100 p-2 rounded">
                {JSON.stringify(selectedRoles)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Request Data */}
      {requestData && (
        <Card>
          <CardHeader>
            <CardTitle>📤 Request Payload</CardTitle>
            <CardDescription>Data sent to API</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={JSON.stringify(requestData, null, 2)}
              readOnly
              className="font-mono text-sm h-40"
            />
          </CardContent>
        </Card>
      )}

      {/* Success Response */}
      {responseData && (
        <Card className="border-green-500">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-700">✅ Success Response</CardTitle>
            <CardDescription>API returned successfully</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Textarea
              value={JSON.stringify(responseData, null, 2)}
              readOnly
              className="font-mono text-sm h-60"
            />
          </CardContent>
        </Card>
      )}

      {/* Error Response */}
      {error && (
        <Card className="border-red-500">
          <CardHeader className="bg-red-50">
            <CardTitle className="text-red-700">❌ Error Response</CardTitle>
            <CardDescription>
              Status: {error.status} - {error.statusText}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <Label className="text-sm font-semibold">Error Message</Label>
              <p className="text-red-600 mt-1">{error.message}</p>
            </div>

            <div>
              <Label className="text-sm font-semibold">Error Data</Label>
              <Textarea
                value={JSON.stringify(error.data, null, 2)}
                readOnly
                className="font-mono text-sm h-32 mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold">Request Config</Label>
              <Textarea
                value={JSON.stringify(error.config, null, 2)}
                readOnly
                className="font-mono text-sm h-32 mt-1"
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <p className="text-sm font-semibold text-yellow-800 mb-2">🔍 Debug Tips:</p>
              <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                <li>Check if the API server has the latest code deployed</li>
                <li>Verify the request payload structure matches backend expectations</li>
                <li>Check server logs for detailed error messages</li>
                <li>Ensure authentication token is valid</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
