import { useState, FC } from 'react';
import { Wrench, Palette, Layout } from 'lucide-react';
import GutenbergBlockEditor from '@/components/editor/GutenbergBlockEditor';
import ApiConnectionTest from '@/components/test/ApiConnectionTest';
import AuthFlowTest from '@/components/test/AuthFlowTest';

const TestPage: FC = () => {
  const [activeTab, setActiveTab] = useState<'editor' | 'api' | 'auth'>('editor');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-modern-text-primary flex items-center">
            <Wrench className="w-8 h-8 mr-3 text-modern-primary" />
            Integration Test Page
          </h1>
          <p className="text-modern-text-secondary mt-2">
            Test new WordPress features and API integrations
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-modern-border-primary">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('editor')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'editor'
                ? 'text-modern-primary border-modern-primary'
                : 'text-modern-text-secondary border-transparent hover:text-modern-text-primary'
            }`}
          >
            <Layout className="w-4 h-4 inline mr-2" />
            Gutenberg Editor
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'api'
                ? 'text-modern-primary border-modern-primary'
                : 'text-modern-text-secondary border-transparent hover:text-modern-text-primary'
            }`}
          >
            <Wrench className="w-4 h-4 inline mr-2" />
            API Connection
          </button>
          <button
            onClick={() => setActiveTab('auth')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'auth'
                ? 'text-modern-primary border-modern-primary'
                : 'text-modern-text-secondary border-transparent hover:text-modern-text-primary'
            }`}
          >
            <Palette className="w-4 h-4 inline mr-2" />
            Authentication
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'editor' && (
          <div className="space-y-6">
            <div className="wp-card">
              <div className="wp-card-header">
                <h2 className="text-lg font-semibold text-modern-text-primary">
                  Gutenberg Editor with Spectra Blocks
                </h2>
                <p className="text-sm text-modern-text-secondary mt-1">
                  Test the new block editor with Spectra block support
                </p>
              </div>
            </div>
            <GutenbergBlockEditor />
          </div>
        )}

        {activeTab === 'api' && (
          <div className="space-y-6">
            <ApiConnectionTest />
            <div className="wp-notice wp-notice-info">
              <p>
                API tests help verify the connection between the admin dashboard and backend services.
                Switch between Mock and Real API modes to test different environments.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'auth' && (
          <div className="space-y-6">
            <AuthFlowTest />
            <div className="wp-notice wp-notice-warning">
              <p>
                Authentication tests verify the SSO integration with auth.neture.co.kr.
                Make sure the auth server is running before testing real authentication.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modern Color System Demo */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h2 className="text-lg font-semibold text-modern-text-primary">Modern Color System</h2>
        </div>
        <div className="wp-card-body">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <h3 className="text-sm font-medium text-modern-text-primary mb-2">Primary Colors</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 bg-modern-primary rounded"></div>
                  <span className="text-xs">Primary</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 bg-modern-secondary rounded"></div>
                  <span className="text-xs">Secondary</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 bg-modern-accent rounded"></div>
                  <span className="text-xs">Accent</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-modern-text-primary mb-2">Status Colors</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 bg-modern-success rounded"></div>
                  <span className="text-xs">Success</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 bg-modern-warning rounded"></div>
                  <span className="text-xs">Warning</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 bg-modern-error rounded"></div>
                  <span className="text-xs">Error</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-modern-text-primary mb-2">Gradients</h3>
              <div className="space-y-2">
                <div className="w-full h-12 rounded" style={{ background: 'var(--modern-gradient-primary)' }}></div>
                <div className="w-full h-12 rounded" style={{ background: 'var(--modern-gradient-success)' }}></div>
                <div className="w-full h-12 rounded" style={{ background: 'var(--modern-gradient-warning)' }}></div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-modern-text-primary mb-2">Shadows</h3>
              <div className="space-y-3">
                <div className="w-full h-10 bg-white rounded shadow-modern-shadow flex items-center justify-center text-xs">Shadow</div>
                <div className="w-full h-10 bg-white rounded shadow-modern-shadow-md flex items-center justify-center text-xs">Shadow MD</div>
                <div className="w-full h-10 bg-white rounded shadow-modern-shadow-lg flex items-center justify-center text-xs">Shadow LG</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPage;