/**
 * Cosmetics Filter Editor Component
 *
 * Component for editing cosmetics filter values
 */

import React from 'react';

interface FilterEditorProps {
  filter: {
    id: string;
    name: string;
    type: string;
    filters: {
      values: string[];
    };
    enabled: boolean;
  };
  onChange: (filterId: string, updates: any) => void;
}

export const CosmeticsFilterEditor: React.FC<FilterEditorProps> = ({
  filter,
  onChange,
}) => {
  const handleToggleValue = (value: string) => {
    const currentValues = filter.filters.values;
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];

    onChange(filter.id, {
      ...filter,
      filters: { values: newValues },
    });
  };

  const handleAddValue = (newValue: string) => {
    if (!newValue.trim()) return;

    const newValues = [...filter.filters.values, newValue.trim()];
    onChange(filter.id, {
      ...filter,
      filters: { values: newValues },
    });
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">{filter.name}</h3>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={filter.enabled}
            onChange={(e) =>
              onChange(filter.id, { ...filter, enabled: e.target.checked })
            }
            className="mr-2"
          />
          <span className="text-sm">Enabled</span>
        </label>
      </div>

      <div className="text-sm text-gray-600 mb-2">Type: {filter.type}</div>

      <div className="flex flex-wrap gap-2 mb-4">
        {filter.filters.values.map((value) => (
          <div
            key={value}
            className="flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
          >
            <span>{value}</span>
            <button
              onClick={() => handleToggleValue(value)}
              className="ml-2 text-blue-600 hover:text-blue-900"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add new value..."
          className="flex-1 px-3 py-2 border rounded"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleAddValue(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
        />
        <button
          onClick={(e) => {
            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
            handleAddValue(input.value);
            input.value = '';
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add
        </button>
      </div>
    </div>
  );
};

export default CosmeticsFilterEditor;
