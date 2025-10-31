import React from 'react';
import { usePreset, PresetRenderer, type PresetType } from '@o4o/utils';
import type { ViewPreset } from '@o4o/types';
import type { ShortcodeProps } from '../types.js';

/**
 * Preset Shortcode Component
 *
 * Renders content based on preset configuration
 *
 * Usage:
 * [preset id="view_post_latest_10_posts_list_v1" type="view"]
 * [preset id="form_contact_standard_v1" type="form"]
 * [preset id="template_page_standard_v1" type="template"]
 */
export function PresetShortcode({ attributes, context }: ShortcodeProps): React.ReactElement {
  const presetId = attributes.id as string | undefined;
  const presetType = (attributes.type as PresetType) || 'view';

  const { preset, loading, error } = usePreset(presetId, presetType);

  // Error state
  if (error) {
    return (
      <div className="border border-red-300 bg-red-50 rounded-lg p-4">
        <p className="text-red-800 font-medium">Preset Error</p>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="border border-gray-200 rounded-lg p-8 text-center">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    );
  }

  // No preset found
  if (!preset || !presetId) {
    return (
      <div className="border border-yellow-300 bg-yellow-50 rounded-lg p-4">
        <p className="text-yellow-800 font-medium">Preset Not Found</p>
        <p className="text-yellow-600 text-sm">
          {presetId ? `Preset "${presetId}" does not exist.` : 'No preset ID specified.'}
        </p>
      </div>
    );
  }

  // Render based on preset type
  switch (presetType) {
    case 'view':
      return renderViewPreset(preset as ViewPreset, context);

    case 'form':
      return renderFormPreset(preset, context);

    case 'template':
      return renderTemplatePreset(preset, context);

    default:
      return (
        <div className="border border-gray-300 bg-gray-50 rounded-lg p-4">
          <p className="text-gray-800 font-medium">Unsupported Preset Type</p>
          <p className="text-gray-600 text-sm">Type "{presetType}" is not supported.</p>
        </div>
      );
  }
}

/**
 * Render ViewPreset
 */
function renderViewPreset(preset: ViewPreset, context: any): React.ReactElement {
  // Get data from context if available
  const data = context?.data || [];

  return (
    <div className="preset-view" data-preset-id={preset.id}>
      <PresetRenderer preset={preset} data={data} loading={false} />
    </div>
  );
}

/**
 * Render FormPreset (placeholder)
 */
function renderFormPreset(preset: any, _context: any): React.ReactElement {
  return (
    <div className="preset-form border border-gray-200 rounded-lg p-6" data-preset-id={preset.id}>
      <h3 className="text-lg font-semibold mb-4">{preset.name}</h3>
      <p className="text-gray-600 mb-4">Form rendering coming soon...</p>
      <div className="text-xs text-gray-500">
        <p>CPT: {preset.cptSlug}</p>
        <p>Fields: {preset.config.fields?.length || 0}</p>
      </div>
    </div>
  );
}

/**
 * Render TemplatePreset (placeholder)
 */
function renderTemplatePreset(preset: any, _context: any): React.ReactElement {
  return (
    <div className="preset-template border border-gray-200 rounded-lg p-6" data-preset-id={preset.id}>
      <h3 className="text-lg font-semibold mb-4">{preset.name}</h3>
      <p className="text-gray-600 mb-4">Template rendering coming soon...</p>
      <div className="text-xs text-gray-500">
        <p>CPT: {preset.cptSlug}</p>
        <p>Layout: {preset.config.layout?.type || 'N/A'}</p>
      </div>
    </div>
  );
}
