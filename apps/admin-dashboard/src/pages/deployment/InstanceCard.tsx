import React from 'react';
import { Server, Eye, RefreshCw, Trash2, ExternalLink } from 'lucide-react';

interface Instance {
  id: string;
  domain: string;
  apps: string[];
  status: 'pending' | 'provisioning' | 'installing' | 'building' | 'configuring' | 'ready' | 'failed';
  ipAddress?: string;
  instanceId?: string;
  createdAt: string;
}

interface InstanceCardProps {
  instance: Instance;
  onViewDetails: () => void;
  onRefresh: () => void;
  onDelete: () => void;
}

const InstanceCard: React.FC<InstanceCardProps> = ({
  instance,
  onViewDetails,
  onRefresh,
  onDelete,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'failed') {
      return '❌';
    } else if (status === 'ready') {
      return '✅';
    } else {
      return '⏳';
    }
  };

  const isDeploying = ['pending', 'provisioning', 'installing', 'building', 'configuring'].includes(
    instance.status
  );

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Server className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">{instance.domain}</h3>
            <p className="text-sm text-gray-500">
              {new Date(instance.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {instance.status === 'ready' && (
          <a
            href={`https://${instance.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        )}
      </div>

      {/* Status */}
      <div className="mb-4">
        <span
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
            instance.status
          )}`}
        >
          <span>{getStatusIcon(instance.status)}</span>
          <span className="capitalize">{instance.status}</span>
          {isDeploying && <RefreshCw className="w-3 h-3 animate-spin" />}
        </span>
      </div>

      {/* IP Address */}
      {instance.ipAddress && (
        <div className="mb-4 text-sm text-gray-600">
          <span className="font-medium">IP:</span> {instance.ipAddress}
        </div>
      )}

      {/* Apps */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">Installed Apps ({instance.apps.length}):</p>
        <div className="flex flex-wrap gap-2">
          {instance.apps.slice(0, 3).map(app => (
            <span
              key={app}
              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
            >
              {app}
            </span>
          ))}
          {instance.apps.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
              +{instance.apps.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <button
          onClick={onViewDetails}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
        >
          <Eye className="w-4 h-4" />
          Details
        </button>

        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition"
          title="Refresh status"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          onClick={onDelete}
          className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition"
          title="Delete instance"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default InstanceCard;
