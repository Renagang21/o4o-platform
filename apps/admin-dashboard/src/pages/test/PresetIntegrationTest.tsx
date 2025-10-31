import React, { useState } from 'react';
import { usePreset, usePresets, usePresetMutations, FormRenderer, TemplateRenderer } from '@o4o/utils';
import { PresetSelector } from '../../components/presets';
import { ShortcodeRenderer } from '@o4o/shortcodes';
import type { ViewPreset, FormPreset, TemplatePreset } from '@o4o/types';

/**
 * Preset Integration Test Page
 *
 * Tests:
 * 1. usePreset hook functionality (with TanStack Query)
 * 2. PresetSelector component
 * 3. Preset shortcode rendering
 * 4. FormRenderer component
 * 5. TemplateRenderer component
 * 6. Real data vs mock data toggle
 * 7. Cache invalidation
 */
export default function PresetIntegrationTest() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('view_post_latest_10_posts_list_v1');
  const [shortcodeContent, setShortcodeContent] = useState<string>(
    '[preset id="view_post_latest_10_posts_list_v1" type="view"]'
  );
  const [useRealData, setUseRealData] = useState<boolean>(false);

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

  // Cache invalidation
  const mutations = usePresetMutations();

  const handleInvalidateCache = async () => {
    await mutations.invalidateEverything();
    alert('Cache invalidated!');
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Preset Integration Test - Phase 4
        </h1>
        <p className="text-gray-600">
          Testing: TanStack Query, FormRenderer, TemplateRenderer, Real Data Integration
        </p>
        <div className="mt-4 flex gap-4">
          <button
            onClick={handleInvalidateCache}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Invalidate Cache
          </button>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useRealData}
              onChange={(e) => setUseRealData(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">Use Real Data (vs Mock)</span>
          </label>
        </div>
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
        <h2 className="text-xl font-semibold mb-4">Test 3: Preset Shortcode (with Real Data)</h2>
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
            <p className="text-sm font-medium text-gray-700 mb-2">
              Rendered Output {useRealData ? '(Real Data)' : '(Mock Data)'}:
            </p>
            <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
              <ShortcodeRenderer
                content={useRealData ? shortcodeContent : `${shortcodeContent.slice(0, -1)} mock="true"]`}
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

      {/* Test 6: FormRenderer */}
      <section className="mb-8 border border-gray-200 rounded-lg p-6 bg-white">
        <h2 className="text-xl font-semibold mb-4">Test 6: FormRenderer Component</h2>
        <FormPresetTest />
      </section>

      {/* Test 7: TemplateRenderer */}
      <section className="mb-8 border border-gray-200 rounded-lg p-6 bg-white">
        <h2 className="text-xl font-semibold mb-4">Test 7: TemplateRenderer Component</h2>
        <TemplatePresetTest />
      </section>

      {/* Test 8: usePresets Hook */}
      <section className="mb-8 border border-gray-200 rounded-lg p-6 bg-white">
        <h2 className="text-xl font-semibold mb-4">Test 8: usePresets Hook (List)</h2>
        <PresetsListTest />
      </section>

      {/* Instructions */}
      <section className="border border-blue-200 rounded-lg p-6 bg-blue-50">
        <h2 className="text-xl font-semibold text-blue-900 mb-4">Phase 4 Test Instructions</h2>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>Toggle "Use Real Data" to test data fetching vs mock data</li>
          <li>Click "Invalidate Cache" to test TanStack Query cache invalidation</li>
          <li>Test FormRenderer with sample form preset</li>
          <li>Test TemplateRenderer with sample template preset</li>
          <li>Verify preset list loads correctly in Test 8</li>
          <li>Check browser DevTools Network tab for API calls</li>
          <li>Verify cache behavior (requests should be cached for 5 minutes)</li>
        </ol>
      </section>
    </div>
  );
}

/**
 * Test FormRenderer
 */
function FormPresetTest() {
  const sampleFormPreset: FormPreset = {
    id: 'form_sample_test',
    name: 'Sample Contact Form',
    description: 'Test form for FormRenderer',
    cptSlug: 'contact',
    version: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    config: {
      fields: [
        {
          fieldKey: 'name',
          order: 1,
          sectionId: 'basic',
          required: true,
          placeholder: 'Enter your name',
          helpText: 'Full name required'
        },
        {
          fieldKey: 'email',
          order: 2,
          sectionId: 'basic',
          required: true,
          placeholder: 'your@email.com',
          helpText: 'We will never share your email'
        },
        {
          fieldKey: 'message',
          order: 3,
          sectionId: 'basic',
          required: true,
          placeholder: 'Your message...',
          helpText: ''
        }
      ],
      layout: {
        columns: 1,
        sections: [
          {
            id: 'basic',
            title: 'Contact Information',
            description: 'Please fill in your details',
            order: 1,
            collapsible: false,
            defaultCollapsed: false
          }
        ]
      },
      validation: [
        { field: 'name', type: 'required', message: 'Name is required' },
        { field: 'email', type: 'required', message: 'Email is required' },
        { field: 'email', type: 'email', message: 'Invalid email address' },
        { field: 'message', type: 'required', message: 'Message is required' }
      ],
      submitBehavior: {
        showSuccessMessage: true,
        successMessage: 'Thank you for contacting us!'
      }
    }
  };

  const handleSubmit = async (data: Record<string, any>) => {
    console.log('Form data:', data);
    alert(`Form submitted:\n${JSON.stringify(data, null, 2)}`);
  };

  return <FormRenderer preset={sampleFormPreset} onSubmit={handleSubmit} />;
}

/**
 * Test TemplateRenderer
 */
function TemplatePresetTest() {
  const sampleTemplatePreset: TemplatePreset = {
    id: 'template_sample_test',
    name: 'Sample 2-Column Layout',
    description: 'Test template for TemplateRenderer',
    cptSlug: 'page',
    version: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    config: {
      layout: {
        type: '2-column-right',
        header: {
          blocks: [
            { blockName: 'HeaderBlock', props: {}, order: 1 }
          ]
        },
        main: {
          blocks: [
            { blockName: 'ContentBlock', props: {}, order: 1 }
          ]
        },
        sidebar: {
          blocks: [
            { blockName: 'WidgetBlock', props: {}, order: 1 }
          ]
        },
        footer: {
          blocks: [
            { blockName: 'FooterBlock', props: {}, order: 1 }
          ]
        }
      },
      seoMeta: {
        titleTemplate: '{title} | Test Site',
        descriptionField: 'excerpt',
        keywords: ['test', 'sample']
      }
    }
  };

  return (
    <TemplateRenderer
      preset={sampleTemplatePreset}
      content={{ title: 'Sample Page', excerpt: 'This is a test page' }}
    >
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-2">Main Content Area</h3>
        <p className="text-gray-600">This content is rendered in the main zone.</p>
      </div>
    </TemplateRenderer>
  );
}

/**
 * Test usePresets hook
 */
function PresetsListTest() {
  const { presets, loading, error, total } = usePresets('view', { isActive: true });

  if (loading) {
    return <div className="text-gray-600">Loading presets...</div>;
  }

  if (error) {
    return <div className="text-red-600">Error: {error}</div>;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600">Total: {total} presets</p>
      {presets.length === 0 ? (
        <p className="text-gray-500">No presets found</p>
      ) : (
        <ul className="space-y-2">
          {presets.map((preset) => (
            <li key={preset.id} className="border border-gray-200 rounded p-3 bg-gray-50">
              <div className="font-medium">{preset.name}</div>
              <div className="text-sm text-gray-600">
                {preset.cptSlug} • v{preset.version}
              </div>
            </li>
          ))}
        </ul>
      )}
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
