/**
 * CMS View Creation Test Page
 *
 * Debug page for testing CMS View creation API
 * Path: /admin/test/cms-view-test
 */

import { useState } from 'react';
import cmsAPI from '@/lib/cms';
import { useToast } from '@/contexts/ToastContext';

export default function CMSViewCreateTest() {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: 'Test View ' + Date.now(),
    slug: 'test-view-' + Date.now(),
    description: 'Test view created from debug page',
    type: 'standard',
    status: 'draft' as any,
  });

  const [schema] = useState({
    version: '2.0',
    type: 'standard',
    components: [
      {
        id: 'hero-1',
        type: 'Hero',
        props: {
          title: 'Test Hero',
          subtitle: 'This is a test view',
        },
      },
    ],
    bindings: [],
    styles: {},
  });

  const [loading, setLoading] = useState(false);
  const [lastRequest, setLastRequest] = useState<any>(null);
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [lastError, setLastError] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLastError(null);
    setLastResponse(null);

    const payload = {
      ...formData,
      schema,
    };

    setLastRequest(payload);

    try {
      const response = await cmsAPI.createView(payload);
      setLastResponse(response);
      toast.success('✅ View created successfully!');
      console.log('Success response:', response);
    } catch (error: any) {
      setLastError({
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      });
      toast.error('❌ Failed to create view');
      console.error('Error response:', error.response);
    } finally {
      setLoading(false);
    }
  };

  const generateNewSlug = () => {
    setFormData(prev => ({
      ...prev,
      name: 'Test View ' + Date.now(),
      slug: 'test-view-' + Date.now(),
    }));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">CMS View Creation Test</h1>
        <p className="text-gray-600 mt-2">
          Debug page for testing View creation API endpoint
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Create Test View</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                />
                <button
                  type="button"
                  onClick={generateNewSlug}
                  className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  🔄
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="standard">Standard</option>
                <option value="landing">Landing</option>
                <option value="detail">Detail</option>
                <option value="list">List</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '⏳ Creating...' : '✅ Create View'}
            </button>
          </form>

          <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
            <p className="font-medium text-gray-700">Schema:</p>
            <pre className="mt-2 text-xs text-gray-600 overflow-auto">
              {JSON.stringify(schema, null, 2)}
            </pre>
          </div>
        </div>

        {/* Right: Debug Info */}
        <div className="space-y-4">
          {/* Request */}
          {lastRequest && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-3 text-blue-600">
                📤 Last Request
              </h3>
              <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-64">
                {JSON.stringify(lastRequest, null, 2)}
              </pre>
            </div>
          )}

          {/* Success Response */}
          {lastResponse && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-3 text-green-600">
                ✅ Success Response
              </h3>
              <pre className="text-xs bg-green-50 p-3 rounded overflow-auto max-h-64">
                {JSON.stringify(lastResponse, null, 2)}
              </pre>
            </div>
          )}

          {/* Error Response */}
          {lastError && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-3 text-red-600">
                ❌ Error Response
              </h3>
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Status:</span>
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
                    {lastError.status} {lastError.statusText}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Message:</span>
                  <p className="text-sm text-red-600 mt-1">{lastError.message}</p>
                </div>
              </div>
              <pre className="text-xs bg-red-50 p-3 rounded overflow-auto max-h-64">
                {JSON.stringify(lastError.data, null, 2)}
              </pre>
            </div>
          )}

          {/* Instructions */}
          {!lastRequest && (
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3 text-blue-800">
                📋 Instructions
              </h3>
              <ol className="space-y-2 text-sm text-blue-900">
                <li>1. Click "Create View" to test</li>
                <li>2. Check the API request/response</li>
                <li>3. Try with duplicate slug to test 409 error</li>
                <li>4. Check browser Console for details</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
