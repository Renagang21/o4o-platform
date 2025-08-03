import { useState, useEffect } from 'react';
import { useCookieAuth } from '@o4o/auth-context';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@o4o/ui';

interface SessionInfo {
  sessionId?: string;
  userId: string;
  email: string;
  role: string;
  status: string;
  loginAt: Date;
  expiresAt: Date;
}

export default function SessionSyncTest() {
  const { user, isAuthenticated, logout, logoutAll } = useCookieAuth();
  const [sessions, setSessions] = useState([]);
  const [linkedAccounts, setLinkedAccounts] = useState({
    local: false,
    google: false,
    kakao: false,
    naver: false
  });
  const [loading, setLoading] = useState(false);
  const [lastEvent, setLastEvent] = useState('');

  // Fetch active sessions
  const fetchSessions = async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await fetch('/api/v1/auth/sessions', {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  // Fetch linked accounts
  const fetchLinkedAccounts = async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await fetch('/api/v1/auth/linked-accounts', {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setLinkedAccounts(data.accounts);
      }
    } catch (error) {
      console.error('Failed to fetch linked accounts:', error);
    }
  };

  // Remove specific session
  const removeSession = async (sessionId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setLastEvent(`Session ${sessionId.substring(0, 8)}... removed`);
        await fetchSessions();
      }
    } catch (error) {
      console.error('Failed to remove session:', error);
    } finally {
      setLoading(false);
    }
  };

  // Listen for session events via localStorage (cross-tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => { // eslint-disable-line no-undef
      if (e.key === 'auth-sync') {
        const data = JSON.parse(e.newValue || '{}');
        setLastEvent(`Cross-tab event: ${data.event}`);
        
        // Refresh sessions on any auth event
        if (data.event) {
          fetchSessions();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Initial data fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchSessions();
      fetchLinkedAccounts();
    }
  }, [isAuthenticated]);

  // Auto-refresh sessions every 30 seconds
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const interval = setInterval(() => {
      fetchSessions();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Session Sync Test</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Please log in to test session synchronization.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle>Current User</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Role:</strong> <Badge>{user?.role}</Badge></p>
            <p><strong>Status:</strong> <Badge variant={user?.status === 'ACTIVE' ? 'default' : 'secondary'}>{user?.status}</Badge></p>
            {lastEvent && (
              <p className="text-sm text-blue-600">
                <strong>Last Event:</strong> {lastEvent}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Linked Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Linked Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`p-4 rounded ${linkedAccounts.local ? 'bg-green-100' : 'bg-gray-100'}`}>
                <span className="text-2xl">📧</span>
                <p className="mt-2 font-medium">Email</p>
                <Badge variant={linkedAccounts.local ? 'default' : 'outline'}>
                  {linkedAccounts.local ? 'Connected' : 'Not Connected'}
                </Badge>
              </div>
            </div>
            <div className="text-center">
              <div className={`p-4 rounded ${linkedAccounts.google ? 'bg-green-100' : 'bg-gray-100'}`}>
                <span className="text-2xl">🔍</span>
                <p className="mt-2 font-medium">Google</p>
                <Badge variant={linkedAccounts.google ? 'default' : 'outline'}>
                  {linkedAccounts.google ? 'Connected' : 'Not Connected'}
                </Badge>
              </div>
            </div>
            <div className="text-center">
              <div className={`p-4 rounded ${linkedAccounts.kakao ? 'bg-green-100' : 'bg-gray-100'}`}>
                <span className="text-2xl">💬</span>
                <p className="mt-2 font-medium">Kakao</p>
                <Badge variant={linkedAccounts.kakao ? 'default' : 'outline'}>
                  {linkedAccounts.kakao ? 'Connected' : 'Not Connected'}
                </Badge>
              </div>
            </div>
            <div className="text-center">
              <div className={`p-4 rounded ${linkedAccounts.naver ? 'bg-green-100' : 'bg-gray-100'}`}>
                <span className="text-2xl">🟢</span>
                <p className="mt-2 font-medium">Naver</p>
                <Badge variant={linkedAccounts.naver ? 'default' : 'outline'}>
                  {linkedAccounts.naver ? 'Connected' : 'Not Connected'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions ({sessions.length})</CardTitle>
          <div className="flex gap-2 mt-2">
            <Button onClick={fetchSessions} size="sm" disabled={loading}>
              Refresh
            </Button>
            <Button onClick={logoutAll} variant="destructive" size="sm" disabled={loading}>
              Logout All Devices
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-gray-600">No active sessions found.</p>
          ) : (
            <div className="space-y-4">
              {sessions.map((session, index) => (
                <div key={index} className="border rounded p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="font-medium">Session {index + 1}</p>
                      <p className="text-sm text-gray-600">
                        Login: {new Date(session.loginAt).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        Expires: {new Date(session.expiresAt).toLocaleString()}
                      </p>
                    </div>
                    {session.sessionId && (
                      <Button
                        onClick={() => removeSession(session.sessionId!)}
                        variant="outline"
                        size="sm"
                        disabled={loading}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Test Session Sync</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Open this page in multiple tabs or browsers to test session synchronization.
              Actions in one tab should be reflected in others within 30 seconds.
            </p>
            <div className="flex gap-2">
              <Button onClick={logout} variant="outline">
                Logout (This Device)
              </Button>
              <Button onClick={() => {
                window.open('/test/session-sync', '_blank');
              }} variant="outline">
                Open New Tab
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}