import React, { useState } from 'react';
import { usePreset } from '@o4o/utils';
import { PresetSelector } from '../../components/presets';
import { ShortcodeRenderer } from '@o4o/shortcodes';
import type { ViewPreset } from '@o4o/types';

/**
 * Preset Integration Test Page
 *
 * Tests:
 * 1. usePreset hook functionality
 * 2. PresetSelector component
 * 3. Preset shortcode rendering
 * 4. Consistency between block and shortcode rendering
 */
export default function PresetIntegrationTest() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('view_post_latest_10_posts_list_v1');
  const [shortcodeContent, setShortcodeContent] = useState<string>(
    '[preset id="view_post_latest_10_posts_list_v1" type="view"]'
  );

  // Sample data for testing
  const samplePosts = [
    {
      id: 1,
      title: 'First Post',
      content: 'This is the first post content',
      author: 'John Doe',
      date: new Date('2024-10-01').toISOString(),
      status: 'published'
    },
    {
      id: 2,
      title: 'Second Post',
      content: 'This is the second post content',
      author: 'Jane Smith',
      date: new Date('2024-10-15').toISOString(),
      status: 'published'
    },
    {
      id: 3,
      title: 'Third Post',
      content: 'This is the third post content',
      author: 'Bob Johnson',
      date: new Date('2024-10-20').toISOString(),
      status: 'draft'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Preset Integration Test
        </h1>
        <p className="text-gray-600">
          Testing Phase 3: Block and Shortcode Integration with Presets
        </p>
      </div>

      {/* Test 1: PresetSelector */}
      <section className="mb-8 border border-gray-200 rounded-lg p-6 bg-white">
        <h2 className="text-xl font-semibold mb-4">Test 1: PresetSelector Component</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select a View Preset:
            </label>
            <PresetSelector
              type="view"
              value={selectedPresetId}
              onChange={(value) => {
                setSelectedPresetId(value || '');
                if (value) {
                  setShortcodeContent(`[preset id="${value}" type="view"]`);
                }
              }}
              className="max-w-md"
            />
          </div>
          <div className="text-sm text-gray-600">
            <p>Selected Preset ID: <code className="bg-gray-100 px-2 py-1 rounded">{selectedPresetId || 'None'}</code></p>
          </div>
        </div>
      </section>

      {/* Test 2: usePreset Hook */}
      <section className="mb-8 border border-gray-200 rounded-lg p-6 bg-white">
        <h2 className="text-xl font-semibold mb-4">Test 2: usePreset Hook</h2>
        <PresetHookTest presetId={selectedPresetId} />
      </section>

      {/* Test 3: Shortcode Rendering */}
      <section className="mb-8 border border-gray-200 rounded-lg p-6 bg-white">
        <h2 className="text-xl font-semibold mb-4">Test 3: Preset Shortcode</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Shortcode Content:
            </label>
            <input
              type="text"
              value={shortcodeContent}
              onChange={(e) => setShortcodeContent(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md font-mono text-sm"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Rendered Output:</p>
            <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
              <ShortcodeRenderer
                content={shortcodeContent}
                context={{ data: samplePosts }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Test 4: Multiple Render Modes */}
      <section className="mb-8 border border-gray-200 rounded-lg p-6 bg-white">
        <h2 className="text-xl font-semibold mb-4">Test 4: Render Mode Examples</h2>
        <div className="space-y-6">
          {/* List Mode */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">List Mode</h3>
            <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
              <ShortcodeRenderer
                content='[preset id="view_post_latest_10_posts_list_v1" type="view"]'
                context={{ data: samplePosts }}
              />
            </div>
          </div>

          {/* Alternative presets if available */}
          <div className="text-xs text-gray-500">
            <p>Try creating presets with different render modes (grid, card, table) to see variations.</p>
          </div>
        </div>
      </section>

      {/* Test 5: Error Handling */}
      <section className="mb-8 border border-gray-200 rounded-lg p-6 bg-white">
        <h2 className="text-xl font-semibold mb-4">Test 5: Error Handling</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Invalid Preset ID:</p>
            <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
              <ShortcodeRenderer
                content='[preset id="invalid_preset_id" type="view"]'
                context={{ data: samplePosts }}
              />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Missing ID:</p>
            <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
              <ShortcodeRenderer
                content='[preset type="view"]'
                context={{ data: samplePosts }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Instructions */}
      <section className="border border-blue-200 rounded-lg p-6 bg-blue-50">
        <h2 className="text-xl font-semibold text-blue-900 mb-4">Test Instructions</h2>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>Select different presets from the dropdown</li>
          <li>Verify that preset data loads correctly in Test 2</li>
          <li>Check that the shortcode renders the same content</li>
          <li>Try editing the shortcode syntax manually</li>
          <li>Verify error states display properly</li>
          <li>Check that same presetId produces identical output</li>
        </ol>
      </section>
    </div>
  );
}

/**
 * Component to test usePreset hook
 */
function PresetHookTest({ presetId }: { presetId: string }) {
  const { preset, loading, error } = usePreset<ViewPreset>(presetId, 'view');

  if (loading) {
    return (
      <div className="text-gray-600">
        <p>Loading preset...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600">
        <p className="font-medium">Error:</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!preset) {
    return (
      <div className="text-yellow-600">
        <p>No preset loaded</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="font-medium text-gray-700">Name:</span>
          <span className="ml-2 text-gray-900">{preset.name}</span>
        </div>
        <div>
          <span className="font-medium text-gray-700">Version:</span>
          <span className="ml-2 text-gray-900">v{preset.version}</span>
        </div>
        <div>
          <span className="font-medium text-gray-700">CPT Slug:</span>
          <span className="ml-2 text-gray-900">{preset.cptSlug}</span>
        </div>
        <div>
          <span className="font-medium text-gray-700">Render Mode:</span>
          <span className="ml-2 text-gray-900">{preset.config.renderMode}</span>
        </div>
      </div>
      {preset.description && (
        <div>
          <span className="font-medium text-gray-700">Description:</span>
          <p className="text-gray-900 mt-1">{preset.description}</p>
        </div>
      )}
      <div>
        <span className="font-medium text-gray-700">Fields ({preset.config.fields.length}):</span>
        <ul className="mt-1 space-y-1">
          {preset.config.fields.sort((a, b) => a.order - b.order).map((field) => (
            <li key={field.fieldKey} className="text-gray-900 ml-4">
              • {field.label || field.fieldKey} ({field.format})
            </li>
          ))}
        </ul>
      </div>
      <div className="pt-4">
        <p className="text-xs text-gray-500 bg-gray-100 p-2 rounded font-mono">
          {JSON.stringify(preset.config, null, 2)}
        </p>
      </div>
    </div>
  );
}
