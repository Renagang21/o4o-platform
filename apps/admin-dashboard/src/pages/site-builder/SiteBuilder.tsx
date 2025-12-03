import React, { useState, useEffect } from 'react';
import { useAuth } from '@o4o/auth-context';
import { CreateSiteModal } from './CreateSiteModal';
import { SiteCard } from './SiteCard';
import { SiteDetail } from './SiteDetail';

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

function SiteBuilder() {
  const { authClient } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    ready: 0,
    scaffolding: 0,
    failed: 0,
  });

  useEffect(() => {
    loadSites();
    const interval = setInterval(loadSites, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const loadSites = async () => {
    try {
      const response = await authClient.api.get('/sites');
      const data = response.data.data || []; // API response: { success: true, data: [...] }

      setSites(data);

      // Calculate stats
      const newStats = {
        total: data.length,
        ready: data.filter((s: Site) => s.status === 'ready').length,
        scaffolding: data.filter((s: Site) => s.status === 'scaffolding' || s.status === 'deploying').length,
        failed: data.filter((s: Site) => s.status === 'failed').length,
      };
      setStats(newStats);

      setLoading(false);
    } catch (error) {
      console.error('Failed to load sites:', error);
      setLoading(false);
    }
  };

  const handleCreateSite = async (siteData: any) => {
    try {
      await authClient.api.post('/sites', siteData);
      setShowCreateModal(false);
      loadSites();
    } catch (error) {
      console.error('Failed to create site:', error);
      throw error;
    }
  };

  const handleDeleteSite = async (siteId: string) => {
    if (!confirm('Are you sure you want to delete this site? This action cannot be undone.')) {
      return;
    }

    try {
      await authClient.api.delete(`/sites/${siteId}`);
      loadSites();
      if (selectedSite?.id === siteId) {
        setSelectedSite(null);
      }
    } catch (error) {
      console.error('Failed to delete site:', error);
      alert('Failed to delete site. Please try again.');
    }
  };

  const handleScaffold = async (siteId: string, autoDeploy: boolean = false) => {
    try {
      await authClient.api.post(`/sites/${siteId}/scaffold`, { autoDeploy });
      loadSites();
    } catch (error) {
      console.error('Failed to trigger scaffolding:', error);
      alert('Failed to trigger scaffolding. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading sites...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Multi-Site Builder
        </h1>
        <p className="text-gray-600">
          Create and manage O4O Platform instances from templates
        </p>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">Total Sites</div>
          <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">Ready</div>
          <div className="text-3xl font-bold text-green-600">{stats.ready}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">In Progress</div>
          <div className="text-3xl font-bold text-blue-600">{stats.scaffolding}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">Failed</div>
          <div className="text-3xl font-bold text-red-600">{stats.failed}</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors"
        >
          + Create New Site
        </button>
        <button
          onClick={loadSites}
          className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg border border-gray-300 hover:border-gray-400 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Sites List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Sites ({sites.length})
          </h2>
          {sites.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500 mb-4">No sites created yet</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Create your first site
              </button>
            </div>
          ) : (
            sites.map((site) => (
              <SiteCard
                key={site.id}
                site={site}
                onSelect={() => setSelectedSite(site)}
                onDelete={() => handleDeleteSite(site.id)}
                isSelected={selectedSite?.id === site.id}
              />
            ))
          )}
        </div>

        {/* Site Detail Panel */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          {selectedSite ? (
            <SiteDetail
              site={selectedSite}
              onClose={() => setSelectedSite(null)}
              onScaffold={handleScaffold}
              onRefresh={loadSites}
            />
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">
                Select a site to view details
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Site Modal */}
      {showCreateModal && (
        <CreateSiteModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateSite}
        />
      )}
    </div>
  );
}

export default SiteBuilder;
