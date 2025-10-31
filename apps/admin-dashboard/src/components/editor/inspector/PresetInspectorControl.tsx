import React from 'react';
import { PresetSelector, PresetInfo } from '../../presets/PresetSelector';
import type { PresetSelectorType } from '../../presets/PresetSelector';

/**
 * Props for PresetInspectorControl
 */
export interface PresetInspectorControlProps {
  blockId: string;
  presetType: PresetSelectorType;
  value?: string;
  onChange: (presetId: string | null) => void;
  cptSlug?: string;
  label?: string;
  description?: string;
  className?: string;
}

/**
 * PresetInspectorControl Component
 *
 * Inspector panel control for selecting presets in block editor
 *
 * Usage in block edit component:
 * ```tsx
 * <PresetInspectorControl
 *   blockId={props.blockId}
 *   presetType="view"
 *   value={attributes.presetId}
 *   onChange={(presetId) => setAttributes({ presetId })}
 *   cptSlug="post"
 *   label="View Preset"
 *   description="Select a preset to configure how posts are displayed"
 * />
 * ```
 */
export function PresetInspectorControl({
  blockId,
  presetType,
  value,
  onChange,
  cptSlug,
  label,
  description,
  className = ''
}: PresetInspectorControlProps): React.ReactElement {
  const defaultLabel = {
    form: 'Form Preset',
    view: 'View Preset',
    template: 'Template Preset'
  }[presetType];

  return (
    <div className={`preset-inspector-control space-y-3 ${className}`}>
      {/* Label */}
      {label !== undefined && (
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            {label || defaultLabel}
          </label>
          {description && (
            <p className="text-xs text-gray-600 mb-2">{description}</p>
          )}
        </div>
      )}

      {/* Preset Selector */}
      <PresetSelector
        type={presetType}
        value={value}
        onChange={onChange}
        cptSlug={cptSlug}
        placeholder={`Select ${presetType} preset...`}
        allowEmpty={true}
      />

      {/* Preset Info */}
      {value && (
        <div className="mt-3">
          <PresetInfo presetId={value} type={presetType} />
        </div>
      )}

      {/* Clear Button */}
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-sm text-red-600 hover:text-red-700 underline"
        >
          Clear Preset
        </button>
      )}

      {/* Help Text */}
      {!value && (
        <p className="text-xs text-gray-500 mt-2">
          {presetType === 'form' &&
            'Form presets define field layouts, validation rules, and submission behavior.'}
          {presetType === 'view' &&
            'View presets configure how data is displayed, including fields, sorting, and pagination.'}
          {presetType === 'template' &&
            'Template presets define page layouts with header, main, sidebar, and footer zones.'}
        </p>
      )}
    </div>
  );
}

/**
 * Grouped Preset Controls
 * For blocks that need multiple preset selections
 */
export interface GroupedPresetControlsProps {
  blockId: string;
  controls: Array<{
    type: PresetSelectorType;
    value?: string;
    onChange: (presetId: string | null) => void;
    cptSlug?: string;
    label?: string;
  }>;
  className?: string;
}

export function GroupedPresetControls({
  blockId,
  controls,
  className = ''
}: GroupedPresetControlsProps): React.ReactElement {
  return (
    <div className={`grouped-preset-controls space-y-6 ${className}`}>
      {controls.map((control, index) => (
        <div key={`${blockId}-preset-${index}`} className="pb-4 border-b border-gray-200 last:border-0">
          <PresetInspectorControl
            blockId={blockId}
            presetType={control.type}
            value={control.value}
            onChange={control.onChange}
            cptSlug={control.cptSlug}
            label={control.label}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Compact Preset Control
 * Minimal version for tight spaces
 */
export interface CompactPresetControlProps {
  presetType: PresetSelectorType;
  value?: string;
  onChange: (presetId: string | null) => void;
  cptSlug?: string;
  className?: string;
}

export function CompactPresetControl({
  presetType,
  value,
  onChange,
  cptSlug,
  className = ''
}: CompactPresetControlProps): React.ReactElement {
  return (
    <div className={`compact-preset-control flex items-center gap-2 ${className}`}>
      <PresetSelector
        type={presetType}
        value={value}
        onChange={onChange}
        cptSlug={cptSlug}
        placeholder={`${presetType}...`}
        allowEmpty={true}
        className="flex-1"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs text-gray-500 hover:text-red-600"
          title="Clear preset"
        >
          ✕
        </button>
      )}
    </div>
  );
}
