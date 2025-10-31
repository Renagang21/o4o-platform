import React, { useState } from 'react';
import { Database, Loader2, CheckCircle, XCircle } from 'lucide-react';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import { seedFormPreset, seedViewPreset, seedTemplatePreset, seedAllPresets } from '@/utils/seedPresets';

const SeedPresets: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    form?: { success: boolean; id?: string; error?: string };
    view?: { success: boolean; id?: string; error?: string };
    template?: { success: boolean; id?: string; error?: string };
  }>({});

  const handleSeedForm = async () => {
    setLoading(true);
    try {
      const result = await seedFormPreset();
      setResults(prev => ({
        ...prev,
        form: { success: true, id: result.data.id }
      }));
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        form: { success: false, error: error.message }
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSeedView = async () => {
    setLoading(true);
    try {
      const result = await seedViewPreset();
      setResults(prev => ({
        ...prev,
        view: { success: true, id: result.data.id }
      }));
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        view: { success: false, error: error.message }
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSeedTemplate = async () => {
    setLoading(true);
    try {
      const result = await seedTemplatePreset();
      setResults(prev => ({
        ...prev,
        template: { success: true, id: result.data.id }
      }));
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        template: { success: false, error: error.message }
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSeedAll = async () => {
    setLoading(true);
    setResults({});
    try {
      const result = await seedAllPresets();
      setResults({
        form: { success: true, id: result.formPreset.id },
        view: { success: true, id: result.viewPreset.id },
        template: { success: true, id: result.templatePreset.id }
      });
    } catch (error: any) {
      console.error('Seed all failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResults({});
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-8 py-3">
        <AdminBreadcrumb
          items={[
            { label: 'Dashboard', path: '/admin' },
            { label: 'Test', path: '/test' },
            { label: 'Seed Presets', path: '/test/seed-presets' }
          ]}
        />
      </div>

      <div className="px-8 py-6">
        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <Database className="w-8 h-8 text-purple-600" />
          <h1 className="text-2xl font-normal">Seed Presets</h1>
        </div>

        {/* Description */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-900 text-sm">
            This page allows you to seed example preset data for testing purposes.
            Each preset includes a complete configuration example.
          </p>
        </div>

        {/* Seed Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Form Preset */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Form Preset</h3>
            <p className="text-sm text-gray-600 mb-4">
              Standard Contact Form with name, email, phone, and message fields
            </p>
            <button
              onClick={handleSeedForm}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Seed Form Preset
            </button>
            {results.form && (
              <div className={`mt-3 p-3 rounded ${results.form.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                <div className="flex items-center gap-2 text-sm">
                  {results.form.success ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Created: {results.form.id}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      <span>{results.form.error}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* View Preset */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">View Preset</h3>
            <p className="text-sm text-gray-600 mb-4">
              Latest 10 Posts List with title, author, date, and status fields
            </p>
            <button
              onClick={handleSeedView}
              disabled={loading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Seed View Preset
            </button>
            {results.view && (
              <div className={`mt-3 p-3 rounded ${results.view.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                <div className="flex items-center gap-2 text-sm">
                  {results.view.success ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Created: {results.view.id}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      <span>{results.view.error}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Template Preset */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Template Preset</h3>
            <p className="text-sm text-gray-600 mb-4">
              Standard Single Page with 1-column layout and basic SEO
            </p>
            <button
              onClick={handleSeedTemplate}
              disabled={loading}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Seed Template Preset
            </button>
            {results.template && (
              <div className={`mt-3 p-3 rounded ${results.template.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                <div className="flex items-center gap-2 text-sm">
                  {results.template.success ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Created: {results.template.id}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      <span>{results.template.error}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Seed All */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Seed All Presets</h3>
            <p className="text-sm text-gray-600 mb-4">
              Create all three example presets at once
            </p>
            <button
              onClick={handleSeedAll}
              disabled={loading}
              className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Seed All Presets
            </button>
          </div>
        </div>

        {/* Reset Button */}
        {Object.keys(results).length > 0 && (
          <div className="flex justify-center">
            <button
              onClick={handleReset}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear Results
            </button>
          </div>
        )}

        {/* Links */}
        <div className="mt-8 bg-white border rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">View Presets</h3>
          <div className="space-y-2">
            <a
              href="/cpt-engine/presets/forms"
              className="block text-blue-600 hover:text-blue-800 hover:underline"
            >
              View Form Presets
            </a>
            <a
              href="/cpt-engine/presets/views"
              className="block text-green-600 hover:text-green-800 hover:underline"
            >
              View View Presets
            </a>
            <a
              href="/cpt-engine/presets/templates"
              className="block text-purple-600 hover:text-purple-800 hover:underline"
            >
              View Template Presets
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeedPresets;
