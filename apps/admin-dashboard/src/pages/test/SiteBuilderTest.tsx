import { Suspense } from 'react';
import SiteBuilder from '../site-builder/SiteBuilder';

/**
 * Test page for Site Builder
 * Located at /admin/test/site-builder
 * Purpose: Isolate and debug Site Builder component issues
 */
export default function SiteBuilderTest() {
  return (
    <div className="p-6">
      <div className="mb-6 bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
        <h2 className="text-xl font-bold text-yellow-800 mb-2">
          ⚠️ Test Page - Site Builder
        </h2>
        <p className="text-yellow-700">
          This is a test page for debugging the Site Builder component.
          <br />
          Location: <code className="bg-yellow-100 px-2 py-1 rounded">/admin/test/site-builder</code>
        </p>
      </div>

      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading Site Builder...</div>
        </div>
      }>
        <SiteBuilder />
      </Suspense>
    </div>
  );
}
