/**
 * AppCard Component
 *
 * Displays an app with its metadata, status, and actions.
 */

import type { AppManifest } from '@/appstore/types';
import { AppEnableToggle } from './AppEnableToggle';
import { AppInstallButton } from './AppInstallButton';

export interface AppCardProps {
  app: AppManifest;
  installed?: boolean;
  onInstall?: (appId: string) => void;
  onUninstall?: (appId: string) => void;
  onToggleEnable?: (appId: string, enabled: boolean) => void;
}

export function AppCard({
  app,
  installed = true,
  onInstall,
  onUninstall,
  onToggleEnable,
}: AppCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {app.icon && (
              <img
                src={app.icon}
                alt={`${app.name} icon`}
                className="w-12 h-12 rounded-lg"
              />
            )}
            {!app.icon && (
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-xl">
                  {app.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900">{app.name}</h3>
              <p className="text-sm text-gray-500">v{app.version}</p>
            </div>
          </div>

          {/* Status Badge */}
          <div>
            {installed && app.enabled && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            )}
            {installed && !app.enabled && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Disabled
              </span>
            )}
            {!installed && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Available
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Description */}
        {app.description && (
          <p className="text-sm text-gray-600 mb-4">{app.description}</p>
        )}

        {/* Metadata */}
        <div className="space-y-2 mb-4">
          {app.author && (
            <div className="flex items-center text-xs text-gray-500">
              <span className="font-medium mr-2">Author:</span>
              <span>{app.author}</span>
            </div>
          )}
          {app.category && (
            <div className="flex items-center text-xs text-gray-500">
              <span className="font-medium mr-2">Category:</span>
              <span className="capitalize">{app.category}</span>
            </div>
          )}
        </div>

        {/* Stats */}
        {installed && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center py-2 bg-gray-50 rounded">
              <div className="text-lg font-semibold text-gray-900">
                {app.views?.length || 0}
              </div>
              <div className="text-xs text-gray-500">Views</div>
            </div>
            <div className="text-center py-2 bg-gray-50 rounded">
              <div className="text-lg font-semibold text-gray-900">
                {app.components ? Object.keys(app.components).length : 0}
              </div>
              <div className="text-xs text-gray-500">Components</div>
            </div>
            <div className="text-center py-2 bg-gray-50 rounded">
              <div className="text-lg font-semibold text-gray-900">
                {app.ui ? Object.keys(app.ui).length : 0}
              </div>
              <div className="text-xs text-gray-500">UI</div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          {installed ? (
            <>
              <AppEnableToggle
                appId={app.id}
                enabled={app.enabled}
                onToggle={onToggleEnable}
              />
              <button
                onClick={() => onUninstall?.(app.id)}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Uninstall
              </button>
            </>
          ) : (
            <AppInstallButton appId={app.id} onInstall={onInstall} />
          )}
        </div>
      </div>

      {/* Thumbnail */}
      {app.thumbnail && (
        <div className="border-t border-gray-100">
          <img
            src={app.thumbnail}
            alt={`${app.name} screenshot`}
            className="w-full h-32 object-cover rounded-b-lg"
          />
        </div>
      )}
    </div>
  );
}
