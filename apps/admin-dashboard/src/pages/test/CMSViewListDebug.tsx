/**
 * CMS View List Debug Page
 * Direct API testing to diagnose list loading issue
 */

import { useState } from 'react';
import api from '@/lib/api';

export default function CMSViewListDebug() {
  const [loading, setLoading] = useState(false);
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  const testDirectFetch = async () => {
    setLoading(true);
    setError(null);
    setRawResponse(null);
    setParsedData(null);

    try {
      // Test 1: Direct fetch with api
      const response = await api.get('/cms/views');

      setRawResponse(response.data);

      // Test parsing logic (from cms.ts)
      const serverData = response.data?.data || response.data;
      const views = serverData.views || serverData.data || [];

      setParsedData({
        serverData,
        views: Array.isArray(views) ? views : [],
        viewCount: Array.isArray(views) ? views.length : 0
      });
    } catch (err: any) {
      setError({
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
    } finally {
      setLoading(false);
    }
  };

  const testWithFilter = async (filter: string) => {
    setLoading(true);
    setError(null);
    setRawResponse(null);
    setParsedData(null);

    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await api.get('/cms/views', { params });

      setRawResponse(response.data);

      const serverData = response.data?.data || response.data;
      const views = serverData.views || serverData.data || [];

      setParsedData({
        serverData,
        views: Array.isArray(views) ? views : [],
        viewCount: Array.isArray(views) ? views.length : 0,
        filter
      });
    } catch (err: any) {
      setError({
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">CMS View List API Debug</h1>

      <div className="mb-6 flex gap-2">
        <button
          onClick={testDirectFetch}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Test: GET /cms/views (no filter)
        </button>
        <button
          onClick={() => testWithFilter('draft')}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          Test: status=draft
        </button>
        <button
          onClick={() => testWithFilter('active')}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          Test: status=active
        </button>
      </div>

      {loading && <div className="text-gray-600">Loading...</div>}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded">
          <h2 className="text-lg font-semibold text-red-800 mb-2">❌ Error</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(error, null, 2)}
          </pre>
        </div>
      )}

      {rawResponse && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">
            📤 Raw API Response
          </h2>
          <pre className="text-xs overflow-auto max-h-96 bg-white p-3 rounded">
            {JSON.stringify(rawResponse, null, 2)}
          </pre>
        </div>
      )}

      {parsedData && (
        <div className="p-4 bg-green-50 border border-green-200 rounded">
          <h2 className="text-lg font-semibold text-green-800 mb-2">
            ✅ Parsed Data (from cms.ts logic)
          </h2>

          <div className="mb-4 p-3 bg-white rounded">
            <p className="font-medium">View Count: {parsedData.viewCount}</p>
            {parsedData.filter && <p className="text-sm text-gray-600">Filter: {parsedData.filter}</p>}
          </div>

          <div className="mb-4">
            <h3 className="font-medium mb-2">Views Array:</h3>
            <pre className="text-xs overflow-auto max-h-96 bg-white p-3 rounded">
              {JSON.stringify(parsedData.views, null, 2)}
            </pre>
          </div>

          <div>
            <h3 className="font-medium mb-2">Server Data Structure:</h3>
            <pre className="text-xs overflow-auto max-h-64 bg-white p-3 rounded">
              {JSON.stringify(parsedData.serverData, null, 2)}
            </pre>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h2 className="text-lg font-semibold text-yellow-800 mb-2">ℹ️ Debug Info</h2>
        <ul className="text-sm space-y-1">
          <li>• DB has 10 views (verified)</li>
          <li>• All views have status='draft'</li>
          <li>• This page tests the exact same API call as CMSViewList</li>
          <li>• Check if response structure matches expected format</li>
        </ul>
      </div>
    </div>
  );
}
