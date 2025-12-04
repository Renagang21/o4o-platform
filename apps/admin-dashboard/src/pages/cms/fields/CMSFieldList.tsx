/**
 * CMS V2 - Custom Fields (ACF) Management
 *
 * Lists all Custom Fields with CRUD operations
 */

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, List } from 'lucide-react';
import cmsAPI, { CustomField } from '@/lib/cms';
import toast from 'react-hot-toast';

export default function CMSFieldList() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    try {
      setLoading(true);
      const response = await cmsAPI.listFields();
      setFields(response.data);
    } catch (error) {
      console.error('Failed to load fields:', error);
      toast.error('Failed to load Custom Fields');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this field?')) {
      return;
    }

    try {
      await cmsAPI.deleteField(id);
      toast.success('Field deleted successfully');
      loadFields();
    } catch (error) {
      console.error('Failed to delete field:', error);
      toast.error('Failed to delete field');
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <List className="w-6 h-6" />
              Custom Fields (ACF)
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage custom fields for your content types
            </p>
          </div>
          <button
            onClick={() => toast('Create Field UI coming soon')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Field
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
      {!loading && fields.length === 0 && (
        <div className="text-center py-12">
          <List className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No fields found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new custom field.
          </p>
        </div>
      )}

      {/* Field List */}
      {!loading && fields.length > 0 && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {fields.map((field) => (
              <li key={field.id}>
                <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{field.label}</h3>
                    <p className="text-sm text-gray-500">
                      Name: {field.name} | Type: {field.type}
                      {field.groupName && ` | Group: ${field.groupName}`}
                    </p>
                    {field.required && (
                      <span className="inline-flex mt-1 items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Required
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toast('Edit Field UI coming soon')}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(field.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
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
