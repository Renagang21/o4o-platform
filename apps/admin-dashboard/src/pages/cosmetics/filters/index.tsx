/**
 * Cosmetics Filters Management Page
 *
 * Admin page for managing cosmetics product filters
 * Permission required: cosmetics:manage_filters
 */

import React, { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import { CosmeticsFilterEditor } from '../components/CosmeticsFilterEditor';

interface FilterConfiguration {
  id: string;
  name: string;
  type: string;
  filters: {
    values: string[];
  };
  enabled: boolean;
  updatedAt: string;
}

export default function CosmeticsFiltersPage() {
  const [filters, setFilters] = useState<FilterConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authClient.api.get('/api/v1/cosmetics/filters');

      if (response.data.success) {
        setFilters(response.data.data || []);
      } else {
        setError('Failed to load filters');
      }
    } catch (err: any) {
      console.error('Error loading filters:', err);
      setError(err.message || 'Failed to load filters');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterId: string, updates: any) => {
    const updatedFilters = filters.map((f) =>
      f.id === filterId ? { ...f, ...updates } : f
    );
    setFilters(updatedFilters);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Update each filter
      const results = await Promise.allSettled(
        filters.map((filter) =>
          authClient.api.put(`/api/v1/cosmetics/filters/${filter.id}`, filter)
        )
      );

      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        throw new Error(`Failed to update ${failures.length} filter(s)`);
      }

      alert('Filters updated successfully');
      await loadFilters();
    } catch (err: any) {
      console.error('Error saving filters:', err);
      setError(err.response?.data?.message || err.message || 'Failed to save filters');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Cosmetics Filters</h1>
        <div>Loading filters...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Cosmetics Filters Management</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {filters.map((filter) => (
          <CosmeticsFilterEditor
            key={filter.id}
            filter={filter}
            onChange={handleFilterChange}
          />
        ))}
      </div>

      {filters.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No filters configured yet
        </div>
      )}
    </div>
  );
}
