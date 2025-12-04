/**
 * CMS V2 - Preview Frame Component
 *
 * Displays CMS pages/views in an iframe for preview before publishing
 */

import { useState, useEffect } from 'react';
import { X, RefreshCw, Monitor, Smartphone } from 'lucide-react';

interface PreviewFrameProps {
  /** The slug to preview */
  slug: string;
  /** Callback when preview is closed */
  onClose: () => void;
  /** Base URL for the main site (default: https://neture.co.kr) */
  baseUrl?: string;
}

type ViewportMode = 'desktop' | 'mobile';

export default function PreviewFrame({ slug, onClose, baseUrl = 'https://neture.co.kr' }: PreviewFrameProps) {
  const [loading, setLoading] = useState(true);
  const [viewport, setViewport] = useState<ViewportMode>('desktop');
  const [refreshKey, setRefreshKey] = useState(0);

  const previewUrl = `${baseUrl}/${slug}?preview=1`;

  useEffect(() => {
    setLoading(true);
    setRefreshKey(Date.now());
  }, [slug]);

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleRefresh = () => {
    setLoading(true);
    setRefreshKey(Date.now());
  };

  const toggleViewport = () => {
    setViewport(prev => prev === 'desktop' ? 'mobile' : 'desktop');
  };

  const viewportStyles = viewport === 'desktop'
    ? 'w-full h-full'
    : 'w-[375px] h-[667px] mx-auto border-8 border-gray-800 rounded-3xl';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">Preview: {slug}</h2>
            <p className="text-sm text-gray-500 mt-1">{previewUrl}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Viewport Toggle */}
            <button
              onClick={toggleViewport}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              title={viewport === 'desktop' ? 'Switch to mobile view' : 'Switch to desktop view'}
            >
              {viewport === 'desktop' ? (
                <Monitor className="w-5 h-5" />
              ) : (
                <Smartphone className="w-5 h-5" />
              )}
            </button>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              title="Refresh preview"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              title="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview Frame Container */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          <div className={viewportStyles}>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
                <div className="text-center">
                  <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <div className="text-gray-600">Loading preview...</div>
                </div>
              </div>
            )}

            <iframe
              key={refreshKey}
              src={previewUrl}
              className="w-full h-full bg-white shadow-lg"
              onLoad={handleIframeLoad}
              title={`Preview: ${slug}`}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500">
            ⚠️ This is a preview. Changes are not yet published to the live site.
          </p>
        </div>
      </div>
    </div>
  );
}
