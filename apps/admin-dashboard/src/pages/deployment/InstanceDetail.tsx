import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Server,
  Globe,
  MapPin,
  Cpu,
  RefreshCw,
  Trash2,
  ExternalLink,
  FileText,
} from 'lucide-react';

interface Instance {
  id: string;
  domain: string;
  apps: string[];
  status: 'pending' | 'provisioning' | 'installing' | 'building' | 'configuring' | 'ready' | 'failed';
  ipAddress?: string;
  instanceId?: string;
  region?: string;
  instanceType?: string;
  description?: string;
  logs?: string;
  createdAt: string;
  updatedAt: string;
}

interface InstanceDetailProps {
  instance: Instance;
  onBack: () => void;
  onRefresh: () => void;
  onDelete: () => void;
}

const InstanceDetail: React.FC<InstanceDetailProps> = ({
  instance,
  onBack,
  onRefresh,
  onDelete,
}) => {
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (!autoRefresh) return;

    const isDeploying = ['pending', 'provisioning', 'installing', 'building', 'configuring'].includes(
      instance.status
    );

    if (!isDeploying) {
      setAutoRefresh(false);
      return;
    }

    const interval = setInterval(() => {
      onRefresh();
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, instance.status, onRefresh]);

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

  const isDeploying = ['pending', 'provisioning', 'installing', 'building', 'configuring'].includes(
    instance.status
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to instances
        </button>

        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Server className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{instance.domain}</h1>
              {instance.description && (
                <p className="text-gray-600">{instance.description}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              <RefreshCw className={`w-5 h-5 ${autoRefresh ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              onClick={onDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
            >
              <Trash2 className="w-5 h-5" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Status</h2>
          {isDeploying && (
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={e => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh (5s)
            </label>
          )}
        </div>

        <span
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(
            instance.status
          )}`}
        >
          <span className="capitalize">{instance.status}</span>
          {isDeploying && <RefreshCw className="w-4 h-4 animate-spin" />}
        </span>
      </div>

      {/* Instance Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Instance Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Domain</p>
              <p className="font-medium text-gray-900">{instance.domain}</p>
            </div>
          </div>

          {instance.ipAddress && (
            <div className="flex items-center gap-3">
              <Server className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">IP Address</p>
                <p className="font-medium text-gray-900">{instance.ipAddress}</p>
              </div>
            </div>
          )}

          {instance.instanceId && (
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Instance ID</p>
                <p className="font-medium text-gray-900 text-sm">{instance.instanceId}</p>
              </div>
            </div>
          )}

          {instance.region && (
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Region</p>
                <p className="font-medium text-gray-900">{instance.region}</p>
              </div>
            </div>
          )}

          {instance.instanceType && (
            <div className="flex items-center gap-3">
              <Cpu className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Instance Type</p>
                <p className="font-medium text-gray-900">{instance.instanceType}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Created</p>
              <p className="font-medium text-gray-900">
                {new Date(instance.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {instance.status === 'ready' && (
          <div className="mt-4 pt-4 border-t">
            <a
              href={`https://${instance.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <ExternalLink className="w-5 h-5" />
              Open instance
            </a>
          </div>
        )}
      </div>

      {/* Installed Apps */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Installed Apps ({instance.apps.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {instance.apps.map(app => (
            <div
              key={app}
              className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <p className="font-medium text-gray-900">{app}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Deployment Logs */}
      {instance.logs && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Deployment Logs</h2>

          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap">{instance.logs}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstanceDetail;
