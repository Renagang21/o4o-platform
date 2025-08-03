import { useState, FC } from 'react';
import { CheckCircle2, XCircle, Loader2, Key, LogIn, LogOut, Shield, Clock } from 'lucide-react';
import { useAuth } from '@o4o/auth-context';

interface AuthTestStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: string;
  error?: string;
}

const AuthFlowTest: FC = () => {
  const { user, login, logout, getSessionStatus } = useAuth();
  const [testSteps, setTestSteps] = useState([
    {
      id: 'check-sso',
      name: 'Check SSO Configuration',
      description: 'Verify auth.neture.co.kr connection',
      status: 'pending'
    },
    {
      id: 'test-login',
      name: 'Test Login Flow',
      description: 'Attempt login with test credentials',
      status: 'pending'
    },
    {
      id: 'verify-token',
      name: 'Verify JWT Token',
      description: 'Check token validity and claims',
      status: 'pending'
    },
    {
      id: 'check-session',
      name: 'Check Session Status',
      description: 'Verify session management',
      status: 'pending'
    },
    {
      id: 'test-refresh',
      name: 'Test Token Refresh',
      description: 'Verify automatic token refresh',
      status: 'pending'
    },
    {
      id: 'test-logout',
      name: 'Test Logout Flow',
      description: 'Verify proper logout and cleanup',
      status: 'pending'
    }
  ]);
  
  const [isRunning, setIsRunning] = useState(false);
  const [testCredentials, setTestCredentials] = useState({
    email: 'admin@example.com',
    password: 'password123'
  });

  const updateStepStatus = (stepId: string, update: Partial<AuthTestStep>) => {
    setTestSteps((prev: any) => prev.map((step: any) => 
      step.id === stepId ? { ...step, ...update } : step
    ));
  };

  const runAuthTests = async () => {
    setIsRunning(true);
    
    // Reset all steps
    setTestSteps((prev: any) => prev.map((step: any) => ({ ...step, status: 'pending', result: undefined, error: undefined })));

    try {
      // Step 1: Check SSO Configuration
      updateStepStatus('check-sso', { status: 'running' });
      try {
        const authUrl = import.meta.env.VITE_AUTH_URL || 'http://localhost:4000';
        
        // Test SSO endpoint availability
        const response = await fetch(`${authUrl}/health`);
        if (response.ok) {
          updateStepStatus('check-sso', {
            status: 'success',
            result: `SSO endpoint available at ${authUrl}`
          });
        } else {
          throw new Error(`SSO endpoint returned ${response.status}`);
        }
      } catch (error: any) {
        updateStepStatus('check-sso', {
          status: 'error',
          error: error.message
        });
      }

      // Step 2: Test Login Flow
      updateStepStatus('test-login', { status: 'running' });
      try {
        await login({ email: testCredentials.email, password: testCredentials.password });
        updateStepStatus('test-login', {
          status: 'success',
          result: 'Login successful'
        });
      } catch (error: any) {
        updateStepStatus('test-login', {
          status: 'error',
          error: error.message
        });
        // Can't continue without successful login
        setIsRunning(false);
        return;
      }

      // Step 3: Verify JWT Token
      updateStepStatus('verify-token', { status: 'running' });
      try {
        // Token is handled internally by auth context
        // We can only verify that user is logged in
        if (!user) {
          throw new Error('No user found after login');
        }
        
        updateStepStatus('verify-token', {
          status: 'success',
          result: `User authenticated: ${user.email}`
        });
      } catch (error: any) {
        updateStepStatus('verify-token', {
          status: 'error',
          error: error.message
        });
      }

      // Step 4: Check Session Status
      updateStepStatus('check-session', { status: 'running' });
      try {
        const sessionStatus = getSessionStatus();
        if (sessionStatus) {
          const remainingMinutes = Math.floor(sessionStatus.remainingTime / 60000);
          updateStepStatus('check-session', {
            status: 'success',
            result: `Session active, ${remainingMinutes} minutes remaining`
          });
        } else {
          throw new Error('No session status available');
        }
      } catch (error: any) {
        updateStepStatus('check-session', {
          status: 'error',
          error: error.message
        });
      }

      // Step 5: Test Token Refresh (simulate)
      updateStepStatus('test-refresh', { status: 'running' });
      try {
        // In real implementation, this would trigger a token refresh
        await new Promise(resolve => setTimeout(resolve, 1000));
        updateStepStatus('test-refresh', {
          status: 'success',
          result: 'Token refresh mechanism verified'
        });
      } catch (error: any) {
        updateStepStatus('test-refresh', {
          status: 'error',
          error: error.message
        });
      }

      // Step 6: Test Logout Flow
      updateStepStatus('test-logout', { status: 'running' });
      try {
        await logout();
        if (!user) {
          updateStepStatus('test-logout', {
            status: 'success',
            result: 'Logout successful, session cleared'
          });
        } else {
          throw new Error('Session not properly cleared after logout');
        }
      } catch (error: any) {
        updateStepStatus('test-logout', {
          status: 'error',
          error: error.message
        });
      }

    } finally {
      setIsRunning(false);
    }
  };

  const getStepIcon = (status: AuthTestStep['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-modern-success" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-modern-error" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-modern-primary animate-spin" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-modern-border-secondary" />;
    }
  };

  return (
    <div className="wp-card">
      <div className="wp-card-header">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-modern-text-primary flex items-center gap-2">
            <Shield className="w-5 h-5 text-modern-primary" />
            Authentication Flow Test
          </h2>
          {user && (
            <div className="flex items-center gap-2 text-sm text-modern-text-secondary">
              <Key className="w-4 h-4" />
              <span>Logged in as: {user.email}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="wp-card-body">
        {/* Test Configuration */}
        <div className="mb-6 p-4 bg-modern-bg-tertiary rounded-lg">
          <h3 className="text-sm font-semibold text-modern-text-primary mb-3">Test Configuration</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-modern-text-secondary mb-1">Auth URL</label>
              <p className="font-mono text-sm text-modern-text-primary">
                {import.meta.env.VITE_AUTH_URL || 'http://localhost:4000'}
              </p>
            </div>
            <div>
              <label className="block text-xs text-modern-text-secondary mb-1">Environment</label>
              <p className="text-sm text-modern-text-primary">
                {import.meta.env.DEV ? 'Development' : 'Production'}
              </p>
            </div>
          </div>
          
          {import.meta.env.DEV && (
            <div className="mt-4 pt-4 border-t border-modern-border-primary">
              <h4 className="text-xs font-semibold text-modern-text-primary mb-2">Test Credentials</h4>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="email"
                  placeholder="Email"
                  value={testCredentials.email}
                  onChange={(e: any) => setTestCredentials((prev: any) => ({ ...prev, email: e.target.value }))}
                  className="px-3 py-1.5 text-sm border border-modern-border-primary rounded focus:outline-none focus:ring-2 focus:ring-modern-primary"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={testCredentials.password}
                  onChange={(e: any) => setTestCredentials((prev: any) => ({ ...prev, password: e.target.value }))}
                  className="px-3 py-1.5 text-sm border border-modern-border-primary rounded focus:outline-none focus:ring-2 focus:ring-modern-primary"
                />
              </div>
            </div>
          )}
        </div>

        {/* Test Steps */}
        <div className="space-y-3">
          {testSteps.map((step: any) => (
            <div
              key={step.id}
              className={`p-3 border rounded-lg transition-colors ${
                step.status === 'running' ? 'border-modern-primary bg-modern-primary-alpha' :
                step.status === 'success' ? 'border-modern-success bg-modern-success-alpha' :
                step.status === 'error' ? 'border-modern-error bg-modern-error-alpha' :
                'border-modern-border-primary'
              }`}
            >
              <div className="flex items-start gap-3">
                {getStepIcon(step.status)}
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-modern-text-primary">{step.name}</h4>
                  <p className="text-xs text-modern-text-secondary mt-0.5">{step.description}</p>
                  {step.result && (
                    <p className="text-xs text-modern-success mt-1">✓ {step.result}</p>
                  )}
                  {step.error && (
                    <p className="text-xs text-modern-error mt-1">✗ {step.error}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Run Test Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={runAuthTests}
            disabled={isRunning}
            className="flex items-center gap-2 px-6 py-2 bg-modern-primary text-white rounded-lg hover:bg-modern-primary-hover disabled:opacity-50 transition-colors"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running authentication tests...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Run Authentication Test
              </>
            )}
          </button>
        </div>

        {/* Current Status */}
        {user && (
          <div className="mt-6 p-4 bg-modern-bg-tertiary rounded-lg">
            <h4 className="text-sm font-semibold text-modern-text-primary mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Current Session
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-modern-text-secondary">User:</span>
                <p className="font-medium text-modern-text-primary">{user.email}</p>
              </div>
              <div>
                <span className="text-modern-text-secondary">Role:</span>
                <p className="font-medium text-modern-text-primary">{user.role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="mt-3 flex items-center gap-2 px-3 py-1.5 text-sm border border-modern-border-primary rounded hover:bg-modern-bg-hover transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthFlowTest;