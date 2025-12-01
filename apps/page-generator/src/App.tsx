/**
 * Page Generator App
 * Main application component
 */

import { useState } from 'react';
import { JsxEditor } from './components/JsxEditor';
import { BlockViewer } from './components/BlockViewer';
import { PlaceholderList } from './components/PlaceholderList';
import { PageForm } from './components/PageForm';
import { convertJSXToBlocks, validateJSX } from './core/converter';
import { apiClient } from './services/o4o-api';
import type { Block } from './core/types';
import type { ConversionResult } from './core/converter';

function App() {
  const [jsxCode, setJsxCode] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleConvert = () => {
    setError(null);
    setSuccess(null);

    // Validate JSX
    const validation = validateJSX(jsxCode);
    if (!validation.valid) {
      setError(validation.error || 'Invalid JSX code');
      return;
    }

    setIsConverting(true);

    try {
      // Convert JSX to blocks
      const result = convertJSXToBlocks(jsxCode);
      setBlocks(result.blocks);
      setConversionResult(result);
      setSuccess(`Successfully converted ${result.stats.successfulConversions} blocks!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed');
      setBlocks([]);
      setConversionResult(null);
    } finally {
      setIsConverting(false);
    }
  };

  const handleCreatePage = async (formData: any) => {
    setError(null);
    setSuccess(null);

    if (blocks.length === 0) {
      setError('No blocks to create. Please convert JSX code first.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient.createPage({
        ...formData,
        content: blocks,
      });

      setSuccess(
        `Page created successfully! ID: ${response.data.id}. You can now edit it in O4O Admin.`
      );

      // Clear form
      setJsxCode('');
      setBlocks([]);
      setConversionResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create page');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">O4O Page Generator</h1>
          <p className="mt-1 text-sm text-gray-600">
            Convert AI-generated JSX to O4O Platform pages
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Alert Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-400 rounded-md">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-400 rounded-md">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <p className="text-sm text-green-800">{success}</p>
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: JSX Editor */}
          <div className="bg-white rounded-lg shadow p-6" style={{ height: '600px' }}>
            <JsxEditor
              value={jsxCode}
              onChange={setJsxCode}
              onConvert={handleConvert}
              isConverting={isConverting}
            />
          </div>

          {/* Right Column: Block Viewer */}
          <div className="bg-white rounded-lg shadow p-6" style={{ height: '600px' }}>
            <BlockViewer blocks={blocks} stats={conversionResult?.stats} />
          </div>
        </div>

        {/* Placeholder Warning */}
        {conversionResult && conversionResult.placeholders.length > 0 && (
          <div className="mt-6">
            <PlaceholderList placeholders={conversionResult.placeholders} />
          </div>
        )}

        {/* Page Form */}
        {blocks.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Page</h2>
            <div className="max-w-2xl">
              <PageForm
                onSubmit={handleCreatePage}
                isSubmitting={isSubmitting}
                disabled={isSubmitting}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-600">
          <p>
            O4O Page Generator v1.0.0 |{' '}
            <a
              href="https://admin.neture.co.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              O4O Admin
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
