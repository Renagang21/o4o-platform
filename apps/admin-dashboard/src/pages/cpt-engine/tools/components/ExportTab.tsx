/**
 * Export Tab Component
 * Allows users to select and export Field Groups
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, CheckSquare, Square, Loader2 } from 'lucide-react';
import acfApi from '@/features/cpt-acf/services/acf.api';
import type { FieldGroup } from '@/features/cpt-acf/types/acf.types';

export const ExportTab: React.FC = () => {
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  // Fetch all field groups
  const { data: response, isLoading, error } = useQuery({
    queryKey: ['fieldGroups'],
    queryFn: () => acfApi.groups.getAllGroups(),
  });

  const fieldGroups = response?.data || [];

  // Toggle selection
  const toggleGroup = (groupId: string) => {
    setSelectedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Select/Deselect all
  const toggleAll = () => {
    if (selectedGroups.size === fieldGroups.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(fieldGroups.map(g => g.id)));
    }
  };

  // Export selected groups
  const handleExport = async () => {
    if (selectedGroups.size === 0) return;

    setIsExporting(true);
    try {
      const response = await acfApi.groups.exportGroups({
        groupIds: Array.from(selectedGroups),
      });

      // Create JSON file and download
      const exportData = response.data;
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `field-groups-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Reset selection
      setSelectedGroups(new Set());
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        <span className="ml-2 text-gray-600">Loading Field Groups...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-600">
        Failed to load Field Groups. Please try again.
      </div>
    );
  }

  if (fieldGroups.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No Field Groups available to export.
      </div>
    );
  }

  return (
    <div>
      {/* Header with Select All and Export Button */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={toggleAll}
          className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 font-medium"
        >
          {selectedGroups.size === fieldGroups.length ? (
            <CheckSquare className="w-4 h-4 text-blue-600" />
          ) : (
            <Square className="w-4 h-4" />
          )}
          {selectedGroups.size === fieldGroups.length ? 'Deselect All' : 'Select All'}
        </button>

        <button
          onClick={handleExport}
          disabled={selectedGroups.size === 0 || isExporting}
          className="
            flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md
            hover:bg-blue-700 transition-colors font-medium text-sm
            disabled:bg-gray-300 disabled:cursor-not-allowed
          "
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Export ({selectedGroups.size})
            </>
          )}
        </button>
      </div>

      {/* Field Groups List */}
      <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {fieldGroups.map((group) => (
          <label
            key={group.id}
            className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              checked={selectedGroups.has(group.id)}
              onChange={() => toggleGroup(group.id)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900">{group.title}</div>
              <div className="text-sm text-gray-500 truncate">{group.key}</div>
            </div>
            <div className="text-sm text-gray-400">
              {group.fields?.length || 0} fields
            </div>
          </label>
        ))}
      </div>

      {/* Selection Summary */}
      {selectedGroups.size > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          {selectedGroups.size} Field Group{selectedGroups.size !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
};
