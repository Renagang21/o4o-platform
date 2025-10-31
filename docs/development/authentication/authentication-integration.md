# Authentication System Integration Guide

## Overview

The O4O Platform now features a comprehensive authentication system with:
- httpOnly cookies for enhanced security
- Refresh token rotation
- Single Sign-On (SSO) across all apps
- Cross-tab session synchronization
- Backward compatibility with JWT tokens

## Quick Start

### 1. Update Your App.tsx

Replace the existing `AuthProvider` with `SSOAuthProvider`:

```tsx
import { SSOAuthProvider } from '@o4o/auth-context';

function App() {
  return (
    <SSOAuthProvider 
      enableSSO={true}
      onAuthChange={(user) => {
        console.log('Auth state changed:', user);
      }}
    >
      {/* Your app components */}
    </SSOAuthProvider>
  );
}
```

### 2. Using Authentication Hooks

```tsx
import { useCookieAuth } from '@o4o/auth-context';

function LoginPage() {
  const { login, loading, error } = useCookieAuth();

  const handleLogin = async (email: string, password: string) => {
    try {
      await login({ email, password });
      // Redirect on success
    } catch (err) {
      // Error is already set in the hook
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      {/* Login form fields */}
    </form>
  );
}
```

### 3. Protected Routes

```tsx
import { useCookieAuth, withRole } from '@o4o/auth-context';

// Using hook
function ProtectedComponent() {
  const { isAuthenticated, hasRole } = useCookieAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (!hasRole(['admin', 'manager'])) {
    return <div>Access Denied</div>;
  }

  return <div>Protected Content</div>;
}

// Using HOC
const AdminOnlyComponent = withRole(YourComponent, 'admin');
```

### 4. Logout with SSO

```tsx
function LogoutButton() {
  const { logout, logoutAll } = useCookieAuth();

  return (
    <>
      <button onClick={logout}>Logout</button>
      <button onClick={logoutAll}>Logout from all devices</button>
    </>
  );
}
```

## API Endpoints

### Cookie-Based Authentication (v2)

All new endpoints use httpOnly cookies:

- `POST /api/v1/auth/v2/login` - Login with email/password
- `POST /api/v1/auth/v2/register` - Register new user
- `POST /api/v1/auth/v2/logout` - Logout current session
- `POST /api/v1/auth/v2/logout-all` - Logout all sessions
- `POST /api/v1/auth/v2/refresh` - Refresh access token
- `GET /api/v1/auth/v2/me` - Get current user

### Legacy JWT Authentication (v1)

Still supported for backward compatibility:

- `POST /api/auth/login` - Returns JWT in response body
- `POST /api/auth/register` - Register new user
- `GET /api/auth/verify` - Verify JWT token

## Environment Configuration

### API Server (.env)

```env
# JWT Configuration
JWT_SECRET=your-secret-key
REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
REFRESH_EXPIRES_IN=7d

# Cookie Configuration
COOKIE_DOMAIN=.neture.co.kr  # For SSO across subdomains
NODE_ENV=production

# Redis Configuration (for SSO)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

### Frontend Apps

No special configuration needed. The auth client automatically detects the environment.

## Security Best Practices

1. **Always use HTTPS in production** - Cookies are set with `secure` flag
2. **Configure CORS properly** - Allow only your domains
3. **Set cookie domain** - For SSO across subdomains
4. **Implement CSRF protection** - Use CSRF tokens for state-changing operations
5. **Monitor sessions** - Use the session sync service to track active sessions

## Migration from JWT to Cookies

### Step 1: Update Auth Context

```tsx
// Before
import { AuthProvider } from '@o4o/auth-context';

// After
import { SSOAuthProvider } from '@o4o/auth-context';
```

### Step 2: Update API Calls

```tsx
// Before - Manual token management
const response = await fetch('/api/users/profile', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// After - Automatic cookie handling
const response = await fetch('/api/users/profile', {
  credentials: 'include'  // This is handled by the auth client
});
```

### Step 3: Update Login Flow

```tsx
// Before
const { data } = await authClient.login(credentials);
localStorage.setItem('token', data.token);

// After
await login(credentials);  // Cookies are set automatically
```

## Cross-Domain SSO Setup

For SSO across multiple domains:

1. Set the same `COOKIE_DOMAIN` in all environments
2. Use the same Redis instance for session storage
3. Configure CORS to allow all your domains

Example for multi-domain setup:

```env
# API Server
COOKIE_DOMAIN=.neture.co.kr
CORS_ORIGINS=https://neture.co.kr,https://admin.neture.co.kr,https://shop.neture.co.kr
```

## Troubleshooting

### Cookies Not Being Set

1. Check if you're using HTTPS (required for secure cookies in production)
2. Verify CORS configuration includes `credentials: true`
3. Ensure the frontend is sending `credentials: 'include'`

### SSO Not Working

1. Verify Redis is running and accessible
2. Check if `COOKIE_DOMAIN` is set correctly
3. Ensure all apps use the same domain/subdomain

### Session Expired Errors

1. The system automatically refreshes tokens
2. If issues persist, check refresh token expiry settings
3. Verify the refresh token rotation is working

## Advanced Features

### Custom Session Metadata

```tsx
// Add custom data to sessions
const { login } = useCookieAuth();

await login({
  email: 'user@example.com',
  password: 'password',
  metadata: {
    device: 'mobile',
    location: 'Seoul'
  }
});
```

### Session Monitoring

```tsx
import { useSSO } from '@o4o/auth-context';

function SessionMonitor() {
  const { hasSession } = useSSO();
  
  return (
    <div>
      Session Status: {hasSession ? 'Active' : 'Inactive'}
    </div>
  );
}
```

### Role-Based UI Components

```tsx
import { useRoleAccess } from '@o4o/auth-context';

function ConditionalUI() {
  const canManage = useRoleAccess(['admin', 'manager']);
  
  return (
    <div>
      {canManage && <AdminPanel />}
      <PublicContent />
    </div>
  );
}
```

## Performance Considerations

1. **Token Refresh** - Happens automatically in the background
2. **Session Checks** - Performed every 30 seconds by default
3. **Cross-Tab Sync** - Uses localStorage events (instant)
4. **Redis Caching** - Sessions are cached for fast validation

## Security Checklist

- [ ] HTTPS enabled in production
- [ ] Secure cookies configured
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Session monitoring active
- [ ] Refresh token rotation working
- [ ] Logout invalidates all tokens
- [ ] Cross-tab sync functioning