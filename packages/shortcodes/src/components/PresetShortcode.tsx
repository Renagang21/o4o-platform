import React from 'react';
import { usePreset, usePresetData, PresetRenderer, FormRenderer, TemplateRenderer, type PresetType } from '@o4o/utils';
import type { ViewPreset, FormPreset, TemplatePreset } from '@o4o/types';
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
  const useMockData = attributes.mock === 'true' || attributes.mock === true;

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
      return renderViewPreset(preset as ViewPreset, context, useMockData);

    case 'form':
      return renderFormPreset(preset as FormPreset, context);

    case 'template':
      return renderTemplatePreset(preset as TemplatePreset, context);

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
 * Render ViewPreset with real data
 */
function ViewPresetRenderer({ preset, useMockData, context }: { preset: ViewPreset; useMockData: boolean; context: any }): React.ReactElement {
  // Use mock data from context or fetch real data
  const mockData = context?.data || [];
  const { data: realData, loading: dataLoading, error: dataError } = usePresetData(useMockData ? undefined : preset);

  const data = useMockData ? mockData : realData;
  const loading = useMockData ? false : dataLoading;

  if (dataError) {
    return (
      <div className="border border-yellow-300 bg-yellow-50 rounded-lg p-4">
        <p className="text-yellow-800 font-medium">Data Loading Error</p>
        <p className="text-yellow-600 text-sm">{dataError}</p>
        <p className="text-xs text-yellow-500 mt-2">Falling back to mock data if available...</p>
      </div>
    );
  }

  return (
    <div className="preset-view" data-preset-id={preset.id}>
      <PresetRenderer preset={preset} data={data} loading={loading} />
    </div>
  );
}

/**
 * Render ViewPreset
 */
function renderViewPreset(preset: ViewPreset, context: any, useMockData: boolean): React.ReactElement {
  return <ViewPresetRenderer preset={preset} useMockData={useMockData} context={context} />;
}

/**
 * Render FormPreset
 */
function renderFormPreset(preset: FormPreset, _context: any): React.ReactElement {
  const handleSubmit = async (data: Record<string, any>) => {
    // In a real implementation, this would submit to the API
    // For now, form submission is handled by the FormRenderer
    void data; // Suppress unused variable warning
  };

  return (
    <div className="preset-form" data-preset-id={preset.id}>
      <FormRenderer
        preset={preset}
        onSubmit={handleSubmit}
        initialData={{}}
      />
    </div>
  );
}

/**
 * Render TemplatePreset
 */
function renderTemplatePreset(preset: TemplatePreset, context: any): React.ReactElement {
  const content = context?.content || {};

  return (
    <div className="preset-template" data-preset-id={preset.id}>
      <TemplateRenderer
        preset={preset}
        content={content}
      >
        {context?.children}
      </TemplateRenderer>
    </div>
  );
}
