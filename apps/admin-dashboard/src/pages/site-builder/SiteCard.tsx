import React from 'react';

interface Site {
  id: string;
  domain: string;
  name: string;
  description?: string;
  template: string;
  apps: string[];
  status: 'pending' | 'scaffolding' | 'deploying' | 'ready' | 'failed';
  createdAt: string;
}

interface SiteCardProps {
  site: Site;
  onSelect: () => void;
  onDelete: () => void;
  isSelected: boolean;
}

const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-700',
  scaffolding: 'bg-blue-100 text-blue-700',
  deploying: 'bg-purple-100 text-purple-700',
  ready: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

const STATUS_ICONS = {
  pending: '⏳',
  scaffolding: '🔨',
  deploying: '🚀',
  ready: '✅',
  failed: '❌',
};

export function SiteCard({ site, onSelect, onDelete, isSelected }: SiteCardProps) {
  const statusColor = STATUS_COLORS[site.status];
  const statusIcon = STATUS_ICONS[site.status];

  return (
    <div
      className={`
        bg-white rounded-lg shadow-sm border-2 transition-all cursor-pointer
        ${isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300'}
      `}
      onClick={onSelect}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {site.name}
            </h3>
            <a
              href={`https://${site.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
                if (site.status !== 'ready') {
                  e.preventDefault();
                  alert('Site is not ready yet');
                }
              }}
              className={`
                text-sm text-blue-600 hover:text-blue-800 hover:underline
                ${site.status !== 'ready' ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {site.domain}
            </a>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 ml-2"
            title="Delete site"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>

        {/* Description */}
        {site.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {site.description}
          </p>
        )}

        {/* Status */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
            {statusIcon} {site.status.toUpperCase()}
          </span>
          <span className="text-xs text-gray-500">
            {site.template}
          </span>
        </div>

        {/* Apps */}
        <div className="flex flex-wrap gap-1 mb-3">
          {site.apps.slice(0, 5).map((app) => (
            <span
              key={app}
              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
            >
              {app}
            </span>
          ))}
          {site.apps.length > 5 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
              +{site.apps.length - 5} more
            </span>
          )}
        </div>

        {/* Created Date */}
        <div className="text-xs text-gray-500">
          Created {new Date(site.createdAt).toLocaleDateString()}
        </div>
      </div>

      {/* Loading Bar for In-Progress Sites */}
      {(site.status === 'scaffolding' || site.status === 'deploying') && (
        <div className="h-1 bg-gray-200 rounded-b-lg overflow-hidden">
          <div className="h-full bg-blue-500 animate-pulse w-full" />
        </div>
      )}
    </div>
  );
}
