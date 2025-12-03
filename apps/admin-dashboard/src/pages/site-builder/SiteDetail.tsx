import React, { useState } from 'react';

interface Site {
  id: string;
  domain: string;
  name: string;
  description?: string;
  template: string;
  apps: string[];
  status: 'pending' | 'scaffolding' | 'deploying' | 'ready' | 'failed';
  config?: any;
  deploymentId?: string;
  logs?: string;
  createdAt: string;
  updatedAt: string;
}

interface SiteDetailProps {
  site: Site;
  onClose: () => void;
  onScaffold: (siteId: string, autoDeploy: boolean) => Promise<void>;
  onRefresh: () => void;
}

export function SiteDetail({ site, onClose, onScaffold, onRefresh }: SiteDetailProps) {
  const [showLogs, setShowLogs] = useState(false);
  const [scaffolding, setScaffolding] = useState(false);

  const handleScaffold = async (autoDeploy: boolean) => {
    if (!confirm(`Start scaffolding for ${site.name}?${autoDeploy ? ' Site will be deployed automatically.' : ''}`)) {
      return;
    }

    setScaffolding(true);
    try {
      await onScaffold(site.id, autoDeploy);
    } finally {
      setScaffolding(false);
    }
  };

  const canScaffold = site.status === 'pending' || site.status === 'failed';
  const isInProgress = site.status === 'scaffolding' || site.status === 'deploying';

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {site.name}
            </h2>
            <a
              href={`https://${site.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`
                text-blue-600 hover:text-blue-800 hover:underline
                ${site.status !== 'ready' ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
              `}
            >
              {site.domain}
            </a>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
        {/* Status Section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Status</h3>
          <div className="flex items-center gap-3">
            <span
              className={`
                px-3 py-1 rounded-full text-sm font-medium
                ${site.status === 'ready' ? 'bg-green-100 text-green-700' : ''}
                ${site.status === 'pending' ? 'bg-gray-100 text-gray-700' : ''}
                ${site.status === 'scaffolding' || site.status === 'deploying' ? 'bg-blue-100 text-blue-700' : ''}
                ${site.status === 'failed' ? 'bg-red-100 text-red-700' : ''}
              `}
            >
              {site.status.toUpperCase()}
            </span>
            {isInProgress && (
              <span className="text-sm text-gray-600">Processing...</span>
            )}
          </div>
        </div>

        {/* Description */}
        {site.description && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
            <p className="text-gray-600">{site.description}</p>
          </div>
        )}

        {/* Template & Deployment Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Template</h3>
            <p className="text-gray-900 font-mono">{site.template}</p>
          </div>
          {site.deploymentId && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Deployment ID</h3>
              <p className="text-gray-900 font-mono text-xs truncate" title={site.deploymentId}>
                {site.deploymentId}
              </p>
            </div>
          )}
        </div>

        {/* Installed Apps */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Installed Apps ({site.apps.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {site.apps.map((app) => (
              <span
                key={app}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
              >
                {app}
              </span>
            ))}
          </div>
        </div>

        {/* Configuration */}
        {site.config && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Configuration</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              {site.config.theme && (
                <div>
                  <span className="text-xs font-medium text-gray-600">Theme:</span>
                  <span className="text-xs text-gray-900 ml-2">Configured</span>
                </div>
              )}
              {site.config.navigation && (
                <div>
                  <span className="text-xs font-medium text-gray-600">Navigation:</span>
                  <span className="text-xs text-gray-900 ml-2">Configured</span>
                </div>
              )}
              {site.config.pages && (
                <div>
                  <span className="text-xs font-medium text-gray-600">Pages:</span>
                  <span className="text-xs text-gray-900 ml-2">
                    {Object.keys(site.config.pages).length} pages
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Logs */}
        {site.logs && (
          <div>
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="text-sm font-semibold text-blue-600 hover:text-blue-800 mb-2"
            >
              {showLogs ? '▼' : '▶'} Scaffolding Logs
            </button>
            {showLogs && (
              <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto max-h-64 overflow-y-auto">
                {site.logs}
              </pre>
            )}
          </div>
        )}

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Created:</span>
            <div className="text-gray-900 font-medium">
              {new Date(site.createdAt).toLocaleString()}
            </div>
          </div>
          <div>
            <span className="text-gray-600">Updated:</span>
            <div className="text-gray-900 font-medium">
              {new Date(site.updatedAt).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-lg">
        <div className="flex gap-3">
          <button
            onClick={onRefresh}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors"
          >
            Refresh
          </button>

          {canScaffold && (
            <>
              <button
                onClick={() => handleScaffold(false)}
                disabled={scaffolding}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {scaffolding ? 'Starting...' : 'Scaffold Site'}
              </button>
              <button
                onClick={() => handleScaffold(true)}
                disabled={scaffolding}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {scaffolding ? 'Starting...' : 'Scaffold & Deploy'}
              </button>
            </>
          )}

          {site.status === 'ready' && (
            <a
              href={`https://${site.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Visit Site →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
