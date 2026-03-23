/**
 * Service Access Middleware — Service User & Guest Authentication
 *
 * Extracted from auth.middleware.ts (WO-O4O-AUTH-MIDDLEWARE-SPLIT-V1)
 * Contains: requireServiceUser, optionalServiceAuth, requireGuestUser,
 *           requireGuestOrServiceUser, optionalGuestOrServiceAuth
 */
import { Response, NextFunction } from 'express';
import {
  verifyAccessToken,
  isPlatformUserToken,
  isServiceToken,
  isGuestToken,
  isGuestOrServiceToken,
} from '../../../utils/token.utils.js';
import logger from '../../../utils/logger.js';
import {
  ServiceAuthRequest,
  GuestAuthRequest,
  GuestOrServiceAuthRequest,
  extractToken,
} from './auth-context.helpers.js';

// ============================================================================
// Phase 1: Service User 인증 기반 (WO-AUTH-SERVICE-IDENTITY-PHASE1)
// ============================================================================

/**
 * Require Service User Authentication
 *
 * Validates that the token is a Service User token (tokenType: 'service').
 * Does NOT look up user in database - Service Users are not stored.
 *
 * Attaches serviceUser object to request with token payload data.
 *
 * Returns 401 if no token or invalid token.
 * Returns 403 if token is a Platform User token.
 *
 * @example
 * ```typescript
 * router.get('/service/profile', requireServiceUser, ServiceController.getProfile);
 * ```
 */
export const requireServiceUser = async (
  req: ServiceAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    // Phase 1: Check token type - reject Platform tokens
    if (isPlatformUserToken(token)) {
      logger.warn('[requireServiceUser] Platform token rejected for service-only endpoint', {
        path: req.path,
        method: req.method,
      });

      return res.status(403).json({
        success: false,
        error: 'Service user authentication required. Platform tokens are not allowed.',
        code: 'PLATFORM_TOKEN_NOT_ALLOWED',
      });
    }

    const payload = verifyAccessToken(token);

    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Access token is invalid or has expired',
        code: 'INVALID_TOKEN',
      });
    }

    // Attach service user data from token (no DB lookup)
    req.serviceUser = {
      providerUserId: payload.userId || payload.sub || '',
      provider: payload.role === 'service_user' ? undefined : payload.role,
      email: payload.email || '',
      displayName: payload.name,
      serviceId: payload.serviceId,
      storeId: payload.storeId,
      tokenType: 'service',
    };
    req.tokenPayload = payload;

    next();
  } catch (error) {
    logger.error('[requireServiceUser] Token verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(401).json({
      success: false,
      error: 'Access token is invalid or has expired',
      code: 'INVALID_TOKEN',
    });
  }
};

/**
 * Optional Service User Authentication
 *
 * Attempts to authenticate as Service User but doesn't fail if no token.
 * Useful for endpoints that have different behavior for authenticated vs anonymous users.
 *
 * @example
 * ```typescript
 * router.get('/service/products', optionalServiceAuth, ProductController.list);
 * ```
 */
export const optionalServiceAuth = async (
  req: ServiceAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);

    if (!token) {
      return next();
    }

    // Only process if it's a service token
    if (!isServiceToken(token)) {
      return next();
    }

    const payload = verifyAccessToken(token);

    if (payload) {
      req.serviceUser = {
        providerUserId: payload.userId || payload.sub || '',
        provider: payload.role === 'service_user' ? undefined : payload.role,
        email: payload.email || '',
        displayName: payload.name,
        serviceId: payload.serviceId,
        storeId: payload.storeId,
        tokenType: 'service',
      };
      req.tokenPayload = payload;
    }

    next();
  } catch (error) {
    next();
  }
};

// ============================================================================
// Phase 3: Guest 인증 (WO-AUTH-SERVICE-IDENTITY-PHASE3-QR-GUEST-DEVICE)
// ============================================================================

/**
 * Require Guest User Authentication
 *
 * Validates that the token is a Guest token (tokenType: 'guest').
 * Does NOT look up user in database - Guest Users are not stored.
 *
 * Attaches guestUser object to request with token payload data.
 *
 * Returns 401 if no token or invalid token.
 * Returns 403 if token is a Platform or Service User token.
 *
 * @example
 * ```typescript
 * router.get('/guest/activity', requireGuestUser, GuestController.getActivity);
 * ```
 */
export const requireGuestUser = async (
  req: GuestAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    // Phase 3: Check token type - reject Platform and Service tokens
    if (!isGuestToken(token)) {
      logger.warn('[requireGuestUser] Non-guest token rejected for guest-only endpoint', {
        path: req.path,
        method: req.method,
      });

      return res.status(403).json({
        success: false,
        error: 'Guest authentication required. Only guest tokens are allowed.',
        code: 'GUEST_TOKEN_REQUIRED',
      });
    }

    const payload = verifyAccessToken(token);

    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Access token is invalid or has expired',
        code: 'INVALID_TOKEN',
      });
    }

    // Attach guest user data from token (no DB lookup)
    req.guestUser = {
      guestSessionId: payload.guestSessionId || payload.userId || payload.sub || '',
      serviceId: payload.serviceId,
      storeId: payload.storeId,
      deviceId: payload.deviceId,
      tokenType: 'guest',
    };
    req.tokenPayload = payload;

    next();
  } catch (error) {
    logger.error('[requireGuestUser] Token verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(401).json({
      success: false,
      error: 'Access token is invalid or has expired',
      code: 'INVALID_TOKEN',
    });
  }
};

/**
 * Require Guest or Service User Authentication
 *
 * Validates that the token is either a Guest (tokenType: 'guest')
 * or Service User token (tokenType: 'service').
 *
 * Does NOT look up user in database - Guest/Service Users are not stored.
 *
 * Attaches guestUser OR serviceUser object to request based on token type.
 *
 * Returns 401 if no token or invalid token.
 * Returns 403 if token is a Platform User token.
 *
 * Use case: Endpoints that should be accessible by both Guest and Service Users
 * (e.g., store browsing, product catalog, QR entry points)
 *
 * @example
 * ```typescript
 * router.get('/store/products', requireGuestOrServiceUser, StoreController.getProducts);
 * ```
 */
export const requireGuestOrServiceUser = async (
  req: GuestOrServiceAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    // Phase 3: Check token type - reject Platform tokens
    if (!isGuestOrServiceToken(token)) {
      logger.warn('[requireGuestOrServiceUser] Platform token rejected for guest/service endpoint', {
        path: req.path,
        method: req.method,
      });

      return res.status(403).json({
        success: false,
        error: 'Guest or Service authentication required. Platform tokens are not allowed.',
        code: 'GUEST_OR_SERVICE_TOKEN_REQUIRED',
      });
    }

    const payload = verifyAccessToken(token);

    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Access token is invalid or has expired',
        code: 'INVALID_TOKEN',
      });
    }

    // Attach appropriate user data based on token type
    if (payload.tokenType === 'guest') {
      req.guestUser = {
        guestSessionId: payload.guestSessionId || payload.userId || payload.sub || '',
        serviceId: payload.serviceId,
        storeId: payload.storeId,
        deviceId: payload.deviceId,
        tokenType: 'guest',
      };
    } else {
      req.serviceUser = {
        providerUserId: payload.userId || payload.sub || '',
        provider: payload.role === 'service_user' ? undefined : payload.role,
        email: payload.email || '',
        displayName: payload.name,
        serviceId: payload.serviceId,
        storeId: payload.storeId,
        tokenType: 'service',
      };
    }
    req.tokenPayload = payload;

    next();
  } catch (error) {
    logger.error('[requireGuestOrServiceUser] Token verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(401).json({
      success: false,
      error: 'Access token is invalid or has expired',
      code: 'INVALID_TOKEN',
    });
  }
};

/**
 * Optional Guest or Service User Authentication
 *
 * Attempts to authenticate as Guest/Service User but doesn't fail if no token.
 * Useful for endpoints that have different behavior for authenticated vs anonymous users.
 *
 * @example
 * ```typescript
 * router.get('/store/landing', optionalGuestOrServiceAuth, StoreController.getLanding);
 * ```
 */
export const optionalGuestOrServiceAuth = async (
  req: GuestOrServiceAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);

    if (!token) {
      return next();
    }

    // Only process if it's a guest or service token
    if (!isGuestOrServiceToken(token)) {
      return next();
    }

    const payload = verifyAccessToken(token);

    if (payload) {
      if (payload.tokenType === 'guest') {
        req.guestUser = {
          guestSessionId: payload.guestSessionId || payload.userId || payload.sub || '',
          serviceId: payload.serviceId,
          storeId: payload.storeId,
          deviceId: payload.deviceId,
          tokenType: 'guest',
        };
      } else {
        req.serviceUser = {
          providerUserId: payload.userId || payload.sub || '',
          provider: payload.role === 'service_user' ? undefined : payload.role,
          email: payload.email || '',
          displayName: payload.name,
          serviceId: payload.serviceId,
          storeId: payload.storeId,
          tokenType: 'service',
        };
      }
      req.tokenPayload = payload;
    }

    next();
  } catch (error) {
    next();
  }
};
