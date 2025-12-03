import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Server } from 'lucide-react';
import { useAuth } from '@o4o/auth-context';
import CreateInstanceModal from './CreateInstanceModal';
import InstanceCard from './InstanceCard';
import InstanceDetail from './InstanceDetail';

interface DeploymentInstance {
  id: string;
  domain: string;
  apps: string[];
  status: 'pending' | 'provisioning' | 'installing' | 'building' | 'configuring' | 'ready' | 'failed';
  ipAddress?: string;
  instanceId?: string;
  region?: string;
  instanceType?: string;
  logs?: string;
  createdAt: string;
  updatedAt: string;
}

const DeploymentManager: React.FC = () => {
  const { authClient } = useAuth();
  const [instances, setInstances] = useState<DeploymentInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<DeploymentInstance | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchInstances = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authClient.api.get('/api/deployment/list');

      if (response.data.success) {
        setInstances(response.data.data || []);
      } else {
        setError('Failed to load instances');
      }
    } catch (err: any) {
      console.error('Error fetching instances:', err);
      setError(err.response?.data?.error || 'Failed to load instances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstances();
  }, []);

  const handleCreateInstance = async (data: {
    domain: string;
    apps: string[];
    region?: string;
    instanceType?: string;
    description?: string;
  }) => {
    try {
      const response = await authClient.api.post('/api/deployment/create', data);

      if (response.data.success) {
        setShowCreateModal(false);
        fetchInstances();
      }
    } catch (err: any) {
      console.error('Error creating instance:', err);
      throw new Error(err.response?.data?.error || 'Failed to create instance');
    }
  };

  const handleDeleteInstance = async (id: string) => {
    if (!confirm('Are you sure you want to delete this instance?')) {
      return;
    }

    try {
      await authClient.api.delete(`/api/deployment/${id}`);
      fetchInstances();
    } catch (err: any) {
      console.error('Error deleting instance:', err);
      alert(err.response?.data?.error || 'Failed to delete instance');
    }
  };

  const handleViewDetails = (instance: DeploymentInstance) => {
    setSelectedInstance(instance);
  };

  const handleRefreshInstance = async (id: string) => {
    try {
      const response = await authClient.api.get(`/api/deployment/status/${id}`);

      if (response.data.success) {
        setInstances(prev =>
          prev.map(inst => (inst.id === id ? response.data.data : inst))
        );
      }
    } catch (err: any) {
      console.error('Error refreshing instance:', err);
    }
  };

  const getStatusStats = () => {
    const stats = {
      total: instances.length,
      ready: instances.filter(i => i.status === 'ready').length,
      deploying: instances.filter(i =>
        ['pending', 'provisioning', 'installing', 'building', 'configuring'].includes(i.status)
      ).length,
      failed: instances.filter(i => i.status === 'failed').length,
    };
    return stats;
  };

  const stats = getStatusStats();

  if (selectedInstance) {
    return (
      <InstanceDetail
        instance={selectedInstance}
        onBack={() => setSelectedInstance(null)}
        onRefresh={() => handleRefreshInstance(selectedInstance.id)}
        onDelete={() => {
          handleDeleteInstance(selectedInstance.id);
          setSelectedInstance(null);
        }}
      />
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Deployment Manager</h1>
        <p className="text-gray-600">
          Manage multi-instance deployments of O4O Platform
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Instances</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Server className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ready</p>
              <p className="text-2xl font-bold text-green-600">{stats.ready}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Deploying</p>
              <p className="text-2xl font-bold text-blue-600">{stats.deploying}</p>
            </div>
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          New Instance
        </button>

        <button
          onClick={fetchInstances}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* Instances Grid */}
      {loading && instances.length === 0 ? (
        <div className="text-center py-12">
          <RefreshCw className="w-12 h-12 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading instances...</p>
        </div>
      ) : instances.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Server className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No instances yet</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-blue-600 hover:underline"
          >
            Create your first instance
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {instances.map(instance => (
            <InstanceCard
              key={instance.id}
              instance={instance}
              onViewDetails={() => handleViewDetails(instance)}
              onRefresh={() => handleRefreshInstance(instance.id)}
              onDelete={() => handleDeleteInstance(instance.id)}
            />
          ))}
        </div>
      )}

      {/* Create Instance Modal */}
      {showCreateModal && (
        <CreateInstanceModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateInstance}
        />
      )}
    </div>
  );
};

export default DeploymentManager;
