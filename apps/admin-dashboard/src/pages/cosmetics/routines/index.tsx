/**
 * Cosmetics Routine Templates Management Page
 *
 * Admin page for managing cosmetics routine templates
 * Permission required: cosmetics:edit
 */

import React, { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import { RoutineTemplateEditor } from '../components/RoutineTemplateEditor';

interface RoutineTemplate {
  id: string;
  title: string;
  description: string | null;
  steps: any[];
  metadata: {
    skinType: string[];
    concerns: string[];
    timeOfUse: string;
    tags: string[];
  };
  isPublished: boolean;
  viewCount: number;
  recommendCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function CosmeticsRoutinesPage() {
  const [routines, setRoutines] = useState<RoutineTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoutine, setSelectedRoutine] = useState<RoutineTemplate | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRoutines();
  }, []);

  const loadRoutines = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authClient.api.get('/api/v1/partner/routines');

      if (response.data.success) {
        setRoutines(response.data.data || []);
      } else {
        setError('Failed to load routines');
      }
    } catch (err: any) {
      console.error('Error loading routines:', err);
      setError(err.message || 'Failed to load routines');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this routine template?')) {
      return;
    }

    try {
      await authClient.api.delete(`/api/v1/partner/routines/${id}`);
      await loadRoutines();
    } catch (err: any) {
      console.error('Error deleting routine:', err);
      setError(err.message || 'Failed to delete routine');
    }
  };

  const handleEdit = (routine: RoutineTemplate) => {
    setSelectedRoutine(routine);
    setShowEditor(true);
  };

  const handleCreate = () => {
    setSelectedRoutine(null);
    setShowEditor(true);
  };

  const handleSave = async (routineData: any) => {
    try {
      setSaving(true);
      setError(null);

      if (selectedRoutine) {
        // Update existing routine
        const response = await authClient.api.put(
          `/api/v1/partner/routines/${selectedRoutine.id}`,
          {
            title: routineData.title,
            description: routineData.description,
            steps: routineData.steps,
            metadata: {
              skinType: routineData.skinType,
              concerns: routineData.concerns,
              timeOfUse: routineData.timeOfUse,
              tags: routineData.tags,
            },
          }
        );

        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to update routine');
        }
      } else {
        // Create new routine
        const response = await authClient.api.post('/api/v1/partner/routines', {
          title: routineData.title,
          description: routineData.description,
          steps: routineData.steps,
          metadata: {
            skinType: routineData.skinType,
            concerns: routineData.concerns,
            timeOfUse: routineData.timeOfUse,
            tags: routineData.tags,
          },
        });

        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to create routine');
        }
      }

      setShowEditor(false);
      await loadRoutines();
    } catch (err: any) {
      console.error('Error saving routine:', err);
      setError(err.response?.data?.message || err.message || 'Failed to save routine');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Routine Templates</h1>
        <div>Loading routines...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Routine Templates Management</h1>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create New Template
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Skin Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Concerns
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Steps
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stats
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {routines.map((routine) => (
              <tr key={routine.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {routine.title}
                  </div>
                  {routine.description && (
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {routine.description}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-wrap gap-1">
                    {routine.metadata.skinType?.map((type) => (
                      <span
                        key={type}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {routine.metadata.concerns?.slice(0, 3).map((concern) => (
                      <span
                        key={concern}
                        className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded"
                      >
                        {concern}
                      </span>
                    ))}
                    {routine.metadata.concerns?.length > 3 && (
                      <span className="px-2 py-1 text-xs text-gray-500">
                        +{routine.metadata.concerns.length - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {routine.steps?.length || 0} steps
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      routine.isPublished
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {routine.isPublished ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>{routine.viewCount} views</div>
                  <div>{routine.recommendCount} recommends</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(routine)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(routine.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {routines.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No routine templates found. Create your first template to get started.
          </div>
        )}
      </div>

      {showEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {selectedRoutine ? 'Edit Routine Template' : 'Create Routine Template'}
            </h2>
            <RoutineTemplateEditor
              routine={selectedRoutine || undefined}
              onSave={handleSave}
              onCancel={() => setShowEditor(false)}
              saving={saving}
            />
          </div>
        </div>
      )}
    </div>
  );
}
