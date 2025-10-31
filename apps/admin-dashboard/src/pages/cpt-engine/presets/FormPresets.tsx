import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  FileCheck,
  AlertCircle,
  Loader2,
  Power
} from 'lucide-react';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import { Pagination } from '@/components/common/Pagination';
import { formPresetsApi } from '@/api/presets';
import FormPresetModal from '@/components/presets/FormPresetModal';
import type { FormPreset } from '@o4o/types';
import toast from 'react-hot-toast';

const FormPresets: React.FC = () => {
  const navigate = useNavigate();
  const [presets, setPresets] = useState<FormPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(20);
  const [editingPreset, setEditingPreset] = useState<FormPreset | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch presets
  const fetchPresets = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await formPresetsApi.list({
        page: currentPage,
        limit: itemsPerPage
      });

      if (response.success) {
        setPresets(response.data);
        setTotalItems(response.total);
        setTotalPages(response.pagination?.pages || 1);
      }
    } catch (err: any) {
      console.error('Error fetching form presets:', err);
      setError(err.message || 'Failed to load form presets');
      toast.error('Failed to load form presets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresets();
  }, [currentPage]);

  // Handle delete
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the preset "${name}"?`)) {
      return;
    }

    try {
      await formPresetsApi.delete(id);
      toast.success('Preset deleted successfully');
      fetchPresets();
    } catch (err: any) {
      console.error('Error deleting preset:', err);
      toast.error('Failed to delete preset');
    }
  };

  // Handle toggle active
  const handleToggleActive = async (preset: FormPreset) => {
    try {
      await formPresetsApi.update(preset.id, { isActive: !preset.isActive });
      toast.success(`Preset ${!preset.isActive ? 'activated' : 'deactivated'} successfully`);
      fetchPresets();
    } catch (err: any) {
      console.error('Error toggling preset:', err);
      toast.error('Failed to toggle preset');
    }
  };

  // Filter presets by search query
  const filteredPresets = presets.filter(preset => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      preset.name.toLowerCase().includes(query) ||
      preset.cptSlug.toLowerCase().includes(query) ||
      preset.description?.toLowerCase().includes(query)
    );
  });

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading form presets...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-8 py-3">
        <div className="flex items-center justify-between">
          <AdminBreadcrumb
            items={[
              { label: 'Dashboard', path: '/admin' },
              { label: 'CPT Engine', path: '/cpt-engine' },
              { label: 'Form Presets', path: '/cpt-engine/presets/forms' }
            ]}
          />
        </div>
      </div>

      <div className="px-8 py-6">
        {/* Title and Create Button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileCheck className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-normal">Form Presets</h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create New Form Preset
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, CPT slug, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Presets Table */}
        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">CPT Slug</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Version</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Created</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Updated</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPresets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <FileCheck className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-lg font-medium mb-1">No form presets found</p>
                    <p className="text-sm">Create your first form preset to get started</p>
                  </td>
                </tr>
              ) : (
                filteredPresets.map((preset) => (
                  <tr
                    key={preset.id}
                    className="border-b hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{preset.name}</div>
                        {preset.description && (
                          <div className="text-sm text-gray-500 mt-1">{preset.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="px-2 py-1 bg-gray-100 text-sm rounded">{preset.cptSlug}</code>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      v{preset.version}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          preset.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {preset.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {formatDate(preset.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {formatDate(preset.updatedAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleActive(preset)}
                          className={`p-2 rounded transition-colors ${
                            preset.isActive
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-gray-400 hover:bg-gray-50'
                          }`}
                          title={preset.isActive ? 'Deactivate' : 'Activate'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingPreset(preset)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(preset.id, preset.name)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredPresets.length > 0 && (
          <div className="mt-4 bg-white border rounded-lg overflow-hidden">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingPreset) && (
        <FormPresetModal
          preset={editingPreset}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPreset(null);
          }}
          onSuccess={() => {
            fetchPresets();
          }}
        />
      )}
    </div>
  );
};

export default FormPresets;
