import React, { useState, useEffect } from 'react';
import type {
  FormPreset,
  ViewPreset,
  TemplatePreset,
  PresetListResponse
} from '@o4o/types';
import { formPresetsApi, viewPresetsApi, templatePresetsApi } from '../../api/presets';

/**
 * Preset type for selector
 */
export type PresetSelectorType = 'form' | 'view' | 'template';

/**
 * Props for PresetSelector
 */
export interface PresetSelectorProps {
  type: PresetSelectorType;
  value?: string;
  onChange: (presetId: string | null) => void;
  cptSlug?: string;
  className?: string;
  placeholder?: string;
  allowEmpty?: boolean;
}

type AnyPreset = FormPreset | ViewPreset | TemplatePreset;

/**
 * PresetSelector Component
 *
 * Dropdown selector for choosing presets based on type
 */
export function PresetSelector({
  type,
  value,
  onChange,
  cptSlug,
  className = '',
  placeholder = 'Select a preset...',
  allowEmpty = true
}: PresetSelectorProps): React.ReactElement {
  const [presets, setPresets] = useState<AnyPreset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPresets();
  }, [type, cptSlug]);

  const loadPresets = async () => {
    setLoading(true);
    setError(null);

    try {
      let response: PresetListResponse<AnyPreset>;

      const options = cptSlug ? { cptSlug, isActive: true } : { isActive: true };

      switch (type) {
        case 'form':
          response = await formPresetsApi.list(options);
          break;
        case 'view':
          response = await viewPresetsApi.list(options);
          break;
        case 'template':
          response = await templatePresetsApi.list(options);
          break;
        default:
          throw new Error(`Invalid preset type: ${type}`);
      }

      if (response.success && response.data) {
        setPresets(response.data);
      } else {
        setPresets([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load presets';
      setError(errorMessage);
      setPresets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.target.value;
    onChange(selectedValue ? selectedValue : null);
  };

  if (loading) {
    return (
      <div className={`relative ${className}`}>
        <select disabled className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
          <option>Loading presets...</option>
        </select>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`relative ${className}`}>
        <select disabled className="w-full p-2 border border-red-300 rounded-md bg-red-50 text-red-600">
          <option>Error loading presets</option>
        </select>
        <p className="text-xs text-red-600 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <select
        value={value || ''}
        onChange={handleChange}
        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        {allowEmpty && (
          <option value="">{placeholder}</option>
        )}
        {presets.length === 0 && !allowEmpty && (
          <option value="" disabled>No presets available</option>
        )}
        {presets.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.name} ({preset.cptSlug}) v{preset.version}
          </option>
        ))}
      </select>

      {presets.length === 0 && (
        <p className="text-xs text-gray-500 mt-1">
          No {type} presets available{cptSlug ? ` for CPT "${cptSlug}"` : ''}.
        </p>
      )}
    </div>
  );
}

/**
 * PresetInfo Component
 *
 * Displays preset information
 */
export interface PresetInfoProps {
  presetId: string;
  type: PresetSelectorType;
  className?: string;
}

export function PresetInfo({ presetId, type, className = '' }: PresetInfoProps): React.ReactElement {
  const [preset, setPreset] = useState<AnyPreset | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadPresetInfo();
  }, [presetId, type]);

  const loadPresetInfo = async () => {
    setLoading(true);

    try {
      let response;

      switch (type) {
        case 'form':
          response = await formPresetsApi.get(presetId);
          break;
        case 'view':
          response = await viewPresetsApi.get(presetId);
          break;
        case 'template':
          response = await templatePresetsApi.get(presetId);
          break;
      }

      if (response?.success && response.data) {
        setPreset(response.data);
      }
    } catch (err) {
      console.error('Failed to load preset info:', err);
      setPreset(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        Loading preset info...
      </div>
    );
  }

  if (!preset) {
    return (
      <div className={`text-sm text-red-500 ${className}`}>
        Preset not found
      </div>
    );
  }

  return (
    <div className={`text-sm ${className}`}>
      <div className="space-y-1">
        <p className="font-medium text-gray-900">{preset.name}</p>
        {preset.description && (
          <p className="text-gray-600">{preset.description}</p>
        )}
        <div className="flex gap-2 text-xs text-gray-500">
          <span>CPT: {preset.cptSlug}</span>
          <span>•</span>
          <span>v{preset.version}</span>
          {preset.roles && preset.roles.length > 0 && (
            <>
              <span>•</span>
              <span>Roles: {preset.roles.join(', ')}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
