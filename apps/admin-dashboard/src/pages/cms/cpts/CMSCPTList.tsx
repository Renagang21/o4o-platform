/**
 * CMS V2 - Custom Post Type (CPT) Management
 *
 * Lists all Custom Post Types with CRUD operations
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Archive, CheckCircle, Database } from 'lucide-react';
import cmsAPI, { CPT, CPTStatus } from '@/lib/cms';
import toast from 'react-hot-toast';

export default function CMSCPTList() {
  const [cpts, setCpts] = useState<CPT[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CPTStatus | 'all'>('all');
  const navigate = useNavigate();

  useEffect(() => {
    loadCPTs();
  }, [filter]);

  const loadCPTs = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await cmsAPI.listCPTs(params);
      setCpts(response.data);
    } catch (error) {
      console.error('Failed to load CPTs:', error);
      toast.error('Failed to load Custom Post Types');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this CPT? This action cannot be undone.')) {
      return;
    }

    try {
      await cmsAPI.deleteCPT(id);
      toast.success('CPT deleted successfully');
      loadCPTs();
    } catch (error) {
      console.error('Failed to delete CPT:', error);
      toast.error('Failed to delete CPT');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await cmsAPI.archiveCPT(id);
      toast.success('CPT archived successfully');
      loadCPTs();
    } catch (error) {
      console.error('Failed to archive CPT:', error);
      toast.error('Failed to archive CPT');
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await cmsAPI.activateCPT(id);
      toast.success('CPT activated successfully');
      loadCPTs();
    } catch (error) {
      console.error('Failed to activate CPT:', error);
      toast.error('Failed to activate CPT');
    }
  };

  const getStatusBadge = (status: CPTStatus) => {
    const badges = {
      [CPTStatus.ACTIVE]: 'bg-green-100 text-green-800',
      [CPTStatus.DRAFT]: 'bg-gray-100 text-gray-800',
      [CPTStatus.ARCHIVED]: 'bg-yellow-100 text-yellow-800',
    };
    return badges[status] || badges[CPTStatus.DRAFT];
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Database className="w-6 h-6" />
              Custom Post Types
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage content types for your CMS
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/cms/cpts/new')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create CPT
          </button>
        </div>

        {/* Filters */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-md text-sm ${
              filter === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter(CPTStatus.ACTIVE)}
            className={`px-3 py-1 rounded-md text-sm ${
              filter === CPTStatus.ACTIVE
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter(CPTStatus.DRAFT)}
            className={`px-3 py-1 rounded-md text-sm ${
              filter === CPTStatus.DRAFT
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Draft
          </button>
          <button
            onClick={() => setFilter(CPTStatus.ARCHIVED)}
            className={`px-3 py-1 rounded-md text-sm ${
              filter === CPTStatus.ARCHIVED
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Archived
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && cpts.length === 0 && (
        <div className="text-center py-12">
          <Database className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No CPTs found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new custom post type.
          </p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/admin/cms/cpts/new')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create CPT
            </button>
          </div>
        </div>
      )}

      {/* CPT List */}
      {!loading && cpts.length > 0 && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {cpts.map((cpt) => (
              <li key={cpt.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{cpt.icon}</span>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{cpt.name}</h3>
                          <p className="text-sm text-gray-500">Slug: {cpt.slug}</p>
                          {cpt.description && (
                            <p className="mt-1 text-sm text-gray-600">{cpt.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                            cpt.status
                          )}`}
                        >
                          {cpt.status}
                        </span>
                        {cpt.isPublic && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Public
                          </span>
                        )}
                        {cpt.isHierarchical && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Hierarchical
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/admin/cms/cpts/${cpt.id}/edit`)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="Edit"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      {cpt.status === CPTStatus.ACTIVE ? (
                        <button
                          onClick={() => handleArchive(cpt.id)}
                          className="p-2 text-gray-400 hover:text-yellow-600"
                          title="Archive"
                        >
                          <Archive className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivate(cpt.id)}
                          className="p-2 text-gray-400 hover:text-green-600"
                          title="Activate"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(cpt.id)}
                        className="p-2 text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    Created: {new Date(cpt.createdAt).toLocaleDateString()} | Updated:{' '}
                    {new Date(cpt.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
