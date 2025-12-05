/**
 * CMS Fields Debug Page
 * Test API responses for debugging
 */

import { useState } from 'react';
import api from '@/lib/api';

export default function CMSFieldsDebug() {
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const testListFields = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/cms/fields');
      console.log('Raw API response:', response);
      setRawResponse({
        status: response.status,
        data: response.data,
        headers: response.headers,
      });
    } catch (err: any) {
      console.error('API Error:', err);
      setError(err.message || 'Unknown error');
      setRawResponse(err.response?.data || null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">CMS Fields Debug</h1>

      <div className="mb-4">
        <button
          onClick={testListFields}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Test GET /cms/fields'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {rawResponse && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">Raw Response:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96 text-sm">
            {JSON.stringify(rawResponse, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
