# Cross-App Session Synchronization

The O4O Platform implements comprehensive cross-app session synchronization to ensure users remain authenticated across all platform applications (main site, admin dashboard, e-commerce, etc.).

## Architecture Overview

### 1. Backend Infrastructure
- **Redis Session Store**: Central session storage with pub/sub for real-time events
- **WebSocket Integration**: Real-time session events via Socket.io
- **Cookie Configuration**: Cross-subdomain cookies with `COOKIE_DOMAIN` setting
- **Session Events**: Created, removed, refreshed, and logout_all events

### 2. Frontend Integration
- **WebSocketSessionClient**: Manages WebSocket connection and session events
- **CookieAuthProvider**: Enhanced with automatic WebSocket session sync
- **Cross-Tab Sync**: Local storage events for same-domain tabs
- **Auto-Reconnect**: Handles network interruptions gracefully

## Configuration

### Environment Variables
Add these to your `.env` files:

```env
# API Server (.env)
COOKIE_DOMAIN=.localhost  # For local development
# COOKIE_DOMAIN=.neture.co.kr  # For production
SESSION_CHECK_INTERVAL=30000  # 30 seconds
SESSION_SYNC_ENABLED=true

# Frontend Apps (.env)
REACT_APP_ENABLE_SESSION_SYNC=true
REACT_APP_SESSION_CHECK_INTERVAL=30000
```

### Production Setup
For production domains like neture.co.kr:
1. Set `COOKIE_DOMAIN=.neture.co.kr` (note the leading dot)
2. Ensure all apps are served from subdomains (admin.neture.co.kr, shop.neture.co.kr, etc.)
3. Use HTTPS for secure cookies

## Implementation

### 1. Backend Session Events

When a user logs in, logs out, or their session changes, the backend publishes events:

```typescript
// Session created (login)
await redis.publish('session:events', JSON.stringify({
  userId: user.id,
  event: 'created',
  sessionId,
  timestamp: Date.now()
}));

// Session removed (logout)
await redis.publish('session:events', JSON.stringify({
  userId,
  event: 'removed',
  sessionId,
  timestamp: Date.now()
}));

// Logout from all devices
await redis.publish('session:events', JSON.stringify({
  userId,
  event: 'logout_all',
  timestamp: Date.now()
}));
```

### 2. WebSocket Server Integration

The WebSocket server subscribes to Redis events and broadcasts to connected clients:

```typescript
// WebSocketSessionSync handles:
- User authentication via JWT
- Session status checks
- Real-time event broadcasting
- Force logout capabilities
- Session management commands
```

### 3. Frontend Usage

#### Basic Setup
```tsx
import { CookieAuthProvider } from '@o4o/auth-context';

function App() {
  return (
    <CookieAuthProvider 
      enableSessionSync={true}
      sessionCheckInterval={30000}
      onAuthChange={(user) => {
        console.log('Auth state changed:', user);
      }}
    >
      <YourApp />
    </CookieAuthProvider>
  );
}
```

#### Manual Session Management
```tsx
import { useCookieAuth } from '@o4o/auth-context';

function AccountSettings() {
  const { user, logoutAll } = useCookieAuth();

  const handleLogoutAllDevices = async () => {
    await logoutAll(); // Logs out from all devices
  };

  return (
    <button onClick={handleLogoutAllDevices}>
      Logout from all devices
    </button>
  );
}
```

## How It Works

### Login Flow
1. User logs in on main site (neture.co.kr)
2. Server creates session in Redis and sets cookies with `.neture.co.kr` domain
3. WebSocket connection established with session sync
4. User navigates to admin.neture.co.kr
5. Cookies are automatically sent (cross-subdomain)
6. Admin app validates session and connects to WebSocket
7. Both apps stay synchronized via WebSocket events

### Logout Flow
1. User logs out from any app
2. Server removes session from Redis and publishes event
3. WebSocket broadcasts logout event to all connected clients
4. All apps receive event and clear local auth state
5. User is logged out across all applications

### Session Events
- **created**: New login detected (useful for security notifications)
- **removed**: Session ended (logout or expiry)
- **refreshed**: Token refreshed (keeps sessions alive)
- **logout_all**: All sessions terminated (security action)

## Security Features

1. **httpOnly Cookies**: Tokens stored in httpOnly cookies (not accessible via JS)
2. **CSRF Protection**: SameSite=lax cookies prevent CSRF attacks
3. **Session Fingerprinting**: Device tracking for security (planned)
4. **Force Logout**: Ability to terminate sessions remotely
5. **Activity Monitoring**: Track active sessions per user

## Troubleshooting

### Sessions Not Syncing
1. Check `COOKIE_DOMAIN` is set correctly (with leading dot)
2. Verify Redis is running and accessible
3. Ensure WebSocket connection is established
4. Check browser console for WebSocket errors

### Cookies Not Shared
1. Verify all apps use same root domain
2. Check cookie domain in browser DevTools
3. Ensure HTTPS in production
4. Verify SameSite settings

### WebSocket Issues
1. Check CORS configuration includes all app origins
2. Verify firewall allows WebSocket connections
3. Check for proxy/load balancer WebSocket support
4. Monitor Socket.io connection events

## API Endpoints

### Session Management
- `GET /api/v1/auth/sessions` - Get user's active sessions
- `DELETE /api/v1/auth/sessions/:sessionId` - Remove specific session
- `POST /api/v1/auth/logout-all-devices` - Logout from all devices
- `GET /api/v1/auth/linked-accounts` - Get linked social accounts

## Best Practices

1. **Enable in Production Only**: Session sync adds overhead; consider disabling in development
2. **Monitor Redis Memory**: Sessions are stored for 7 days; implement cleanup
3. **Handle Network Issues**: Implement reconnection logic for WebSocket
4. **Security Alerts**: Notify users of new logins from different locations
5. **Session Limits**: Consider limiting concurrent sessions per user

## Future Enhancements

1. **Device Management**: Allow users to name and manage devices
2. **Location Tracking**: Show login locations on a map
3. **Session History**: Audit trail of all login activities
4. **2FA Integration**: Require 2FA for new device logins
5. **Suspicious Activity Detection**: ML-based anomaly detection