/**
 * Routine Template Editor Component
 *
 * Component for creating/editing routine templates
 */

import React, { useState } from 'react';

interface RoutineStep {
  step: number;
  category: string;
  productId?: string;
  productName?: string;
  description?: string;
  orderInRoutine: number;
}

interface RoutineTemplateEditorProps {
  routine?: {
    id?: string;
    title: string;
    description: string | null;
    steps: RoutineStep[];
    metadata: {
      skinType: string[];
      concerns: string[];
      timeOfUse: string;
      tags: string[];
    };
  };
  onSave: (routine: any) => void;
  onCancel: () => void;
  saving?: boolean;
}

export const RoutineTemplateEditor: React.FC<RoutineTemplateEditorProps> = ({
  routine,
  onSave,
  onCancel,
  saving = false,
}) => {
  const [formData, setFormData] = useState({
    title: routine?.title || '',
    description: routine?.description || '',
    skinType: routine?.metadata?.skinType || [],
    concerns: routine?.metadata?.concerns || [],
    timeOfUse: routine?.metadata?.timeOfUse || 'both',
    tags: routine?.metadata?.tags || [],
    steps: routine?.steps || [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const skinTypeOptions = ['dry', 'oily', 'combination', 'sensitive', 'normal'];
  const concernOptions = [
    'acne',
    'whitening',
    'wrinkle',
    'pore',
    'soothing',
    'moisturizing',
    'elasticity',
    'trouble',
  ];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (formData.skinType.length === 0) {
      newErrors.skinType = 'Please select at least one skin type';
    }

    if (formData.concerns.length === 0) {
      newErrors.concerns = 'Please select at least one concern';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSave(formData);
    }
  };

  const toggleArrayValue = (field: 'skinType' | 'concerns', value: string) => {
    const current = formData[field];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    setFormData({ ...formData, [field]: updated });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Title *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => {
            setFormData({ ...formData, title: e.target.value });
            if (errors.title) {
              setErrors({ ...errors, title: '' });
            }
          }}
          className={`w-full px-3 py-2 border rounded ${
            errors.title ? 'border-red-500' : ''
          }`}
          required
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          rows={3}
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      {/* Skin Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Skin Type *
        </label>
        <div className="flex flex-wrap gap-2">
          {skinTypeOptions.map((type) => (
            <label key={type} className="flex items-center">
              <input
                type="checkbox"
                checked={formData.skinType.includes(type)}
                onChange={() => {
                  toggleArrayValue('skinType', type);
                  if (errors.skinType) {
                    setErrors({ ...errors, skinType: '' });
                  }
                }}
                className="mr-2"
              />
              {type}
            </label>
          ))}
        </div>
        {errors.skinType && (
          <p className="mt-1 text-sm text-red-600">{errors.skinType}</p>
        )}
      </div>

      {/* Concerns */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Concerns *
        </label>
        <div className="flex flex-wrap gap-2">
          {concernOptions.map((concern) => (
            <label key={concern} className="flex items-center">
              <input
                type="checkbox"
                checked={formData.concerns.includes(concern)}
                onChange={() => {
                  toggleArrayValue('concerns', concern);
                  if (errors.concerns) {
                    setErrors({ ...errors, concerns: '' });
                  }
                }}
                className="mr-2"
              />
              {concern}
            </label>
          ))}
        </div>
        {errors.concerns && (
          <p className="mt-1 text-sm text-red-600">{errors.concerns}</p>
        )}
      </div>

      {/* Time of Use */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Time of Use *
        </label>
        <select
          value={formData.timeOfUse}
          onChange={(e) =>
            setFormData({ ...formData, timeOfUse: e.target.value })
          }
          className="w-full px-3 py-2 border rounded"
        >
          <option value="morning">Morning</option>
          <option value="evening">Evening</option>
          <option value="both">Both</option>
        </select>
      </div>

      {/* Steps - Simplified for now */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Routine Steps
        </label>
        <div className="text-sm text-gray-600">
          Step editor will be implemented in the next phase
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Template'}
        </button>
      </div>
    </form>
  );
};

export default RoutineTemplateEditor;
