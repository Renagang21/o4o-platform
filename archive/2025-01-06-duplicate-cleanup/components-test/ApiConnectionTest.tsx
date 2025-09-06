import { useState, FC } from 'react';
import { CheckCircle2, XCircle, Loader2, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import { api } from '@/api/base';
import { useAuthStore } from '@/stores/authStore';
import { apiEndpoints, appsConfig, getAppUrl } from '@/config/apps.config';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface ApiEndpoint {
  name: string;
  endpoint: string;
  method: 'GET' | 'POST';
  requiresAuth: boolean;
  testData?: any;
}

const API_ENDPOINTS: ApiEndpoint[] = [
  // Core endpoints
  { name: 'Health Check', endpoint: '/health', method: 'GET', requiresAuth: false },
  { name: 'Auth Status', endpoint: apiEndpoints.auth.me, method: 'GET', requiresAuth: true },
  { name: 'SSO Check', endpoint: apiEndpoints.auth.ssoCheck, method: 'GET', requiresAuth: false },
  
  // Dashboard
  { name: 'Dashboard Overview', endpoint: apiEndpoints.dashboard.overview, method: 'GET', requiresAuth: true },
  { name: 'Dashboard Analytics', endpoint: apiEndpoints.dashboard.analytics, method: 'GET', requiresAuth: true },
  
  // E-commerce
  { name: 'Products List', endpoint: apiEndpoints.products.list + '?limit=5', method: 'GET', requiresAuth: true },
  { name: 'Orders Stats', endpoint: apiEndpoints.orders.stats, method: 'GET', requiresAuth: true },
  
  // Users
  { name: 'Users List', endpoint: apiEndpoints.users.list + '?limit=5', method: 'GET', requiresAuth: true },
  
  // App integrations
  { name: 'Forum Stats', endpoint: apiEndpoints.forum.stats, method: 'GET', requiresAuth: true },
  { name: 'Signage Stats', endpoint: apiEndpoints.signage.stats, method: 'GET', requiresAuth: true },
  { name: 'Crowdfunding Stats', endpoint: apiEndpoints.crowdfunding.stats, method: 'GET', requiresAuth: true },
];

interface TestResult {
  endpoint: string;
  status: 'pending' | 'success' | 'error';
  responseTime?: number;
  error?: string;
  data?: any;
}

const ApiConnectionTest: FC = () => {
  const [isTestingMock, setIsTestingMock] = useState(true);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [isRunning, setIsRunning] = useState(false);
  const token = useAuthStore(state => state.token);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults({});
    
    try {
      for (const endpoint of API_ENDPOINTS) {
        const startTime = Date.now();
        
        setTestResults((prev: any) => ({
          ...prev,
          [endpoint.endpoint]: { endpoint: endpoint.endpoint, status: 'pending' }
        }));

        try {
          let response;
          if (endpoint.method === 'GET') {
            response = await api.get(endpoint.endpoint);
          } else {
            response = await api.post(endpoint.endpoint, endpoint.testData || {});
          }
          
          const responseTime = Date.now() - startTime;
          
          setTestResults((prev: any) => ({
            ...prev,
            [endpoint.endpoint]: {
              endpoint: endpoint.endpoint,
              status: 'success',
              responseTime,
              data: response.data
            }
          }));
        } catch (error: any) {
          const responseTime = Date.now() - startTime;
          
          setTestResults((prev: any) => ({
            ...prev,
            [endpoint.endpoint]: {
              endpoint: endpoint.endpoint,
              status: 'error',
              responseTime,
              error: error.response?.data?.message || error.message
            }
          }));
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } finally {
      setIsRunning(false);
    }
  };

  const switchMode = () => {
    const newMode = !isTestingMock;
    setIsTestingMock(newMode);
    
    // Note: In real implementation, you'd need to update the environment variable
    // and potentially reload the app
    toast.success(`Switched to ${newMode ? 'Mock' : 'Real API'} mode`);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-modern-success" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-modern-error" />;
      case 'pending':
        return <Loader2 className="w-5 h-5 text-modern-primary animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-modern-text-tertiary" />;
    }
  };

  return (
    <div className="wp-card">
      <div className="wp-card-header">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-modern-text-primary">API Connection Test</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-modern-text-secondary">
              Mode: <span className="font-medium">{isTestingMock ? 'Mock' : 'Real API'}</span>
            </span>
            <button
              onClick={switchMode}
              className="px-3 py-1.5 text-sm border border-modern-border-primary rounded hover:bg-modern-bg-hover transition-colors"
            >
              Switch Mode
            </button>
          </div>
        </div>
      </div>
      
      <div className="wp-card-body">
        {/* Connection Info */}
        <div className="mb-6 p-4 bg-modern-bg-tertiary rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-modern-text-secondary">API URL:</span>
              <p className="font-mono text-modern-text-primary">{import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}</p>
            </div>
            <div>
              <span className="text-modern-text-secondary">Auth Token:</span>
              <p className="font-mono text-modern-text-primary">{token ? `${token.substring(0, 20)}...` : 'Not authenticated'}</p>
            </div>
          </div>
        </div>

        {/* Test Results */}
        <div className="space-y-2">
          {API_ENDPOINTS.map((endpoint: any) => {
            const result = testResults[endpoint.endpoint];
            
            return (
              <div
                key={endpoint.endpoint}
                className="flex items-center justify-between p-3 border border-modern-border-primary rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {result ? getStatusIcon(result.status) : <AlertCircle className="w-5 h-5 text-modern-text-tertiary" />}
                  <div>
                    <p className="text-sm font-medium text-modern-text-primary">{endpoint.name}</p>
                    <p className="text-xs text-modern-text-tertiary font-mono">{endpoint.endpoint}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {result && (
                    <>
                      {result.responseTime && (
                        <span className="text-xs text-modern-text-secondary">
                          {result.responseTime}ms
                        </span>
                      )}
                      {result.error && (
                        <span className="text-xs text-modern-error">
                          {result.error}
                        </span>
                      )}
                    </>
                  )}
                  {endpoint.requiresAuth && !token && (
                    <span className="text-xs text-modern-warning">Requires auth</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Run Tests Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={runTests}
            disabled={isRunning}
            className="flex items-center gap-2 px-6 py-2 bg-modern-primary text-white rounded-lg hover:bg-modern-primary-hover disabled:opacity-50 transition-colors"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running tests...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Run All Tests
              </>
            )}
          </button>
        </div>

        {/* External Apps Status */}
        <div className="mt-8 pt-6 border-t border-modern-border-primary">
          <h3 className="text-md font-semibold text-modern-text-primary mb-4">External Apps</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(appsConfig).map(([key, app]) => (
              <a
                key={key}
                href={getAppUrl(key as keyof typeof appsConfig)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "p-4 rounded-lg border transition-all",
                  "hover:shadow-md hover:border-modern-primary",
                  "border-modern-border-primary bg-modern-bg-secondary"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-modern-text-primary">{app.name}</h4>
                    <p className="text-sm text-modern-text-secondary">
                      {app.url}
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-modern-text-tertiary" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiConnectionTest;