import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/auth';

export const validateRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'UNAUTHENTICATED'
        });
      }

      // Check if user has one of the allowed roles
      const userRole = req.user.role?.toLowerCase();
      const normalizedRoles = allowedRoles.map(role => role.toLowerCase());
      
      if (!userRole || !normalizedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredRoles: allowedRoles,
          currentRole: userRole
        });
      }

      // User has valid role, proceed
      next();
    } catch (error) {
      console.error('Role validation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during role validation',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};

// Helper function to check specific permissions
export const validatePermission = (requiredPermissions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'UNAUTHENTICATED'
        });
      }

      // Admin always has all permissions
      if (req.user.role?.toLowerCase() === 'admin') {
        return next();
      }

      // Check if user has required permissions
      const userPermissions = req.user.permissions || [];
      const hasPermission = requiredPermissions.every(permission => 
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredPermissions,
          currentPermissions: userPermissions
        });
      }

      // User has valid permissions, proceed
      next();
    } catch (error) {
      console.error('Permission validation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during permission validation',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};

// Combined role and permission check
export const validateAccess = (options: {
  roles?: string[];
  permissions?: string[];
  requireAll?: boolean;
}) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'UNAUTHENTICATED'
        });
      }

      const { roles = [], permissions = [], requireAll = false } = options;
      const userRole = req.user.role?.toLowerCase();
      const userPermissions = req.user.permissions || [];

      // Admin bypass
      if (userRole === 'admin') {
        return next();
      }

      let hasRoleAccess = false;
      let hasPermissionAccess = false;

      // Check roles
      if (roles.length > 0) {
        const normalizedRoles = roles.map(role => role.toLowerCase());
        hasRoleAccess = normalizedRoles.includes(userRole || '');
      } else {
        hasRoleAccess = true; // No role requirement
      }

      // Check permissions
      if (permissions.length > 0) {
        hasPermissionAccess = permissions.every(permission => 
          userPermissions.includes(permission)
        );
      } else {
        hasPermissionAccess = true; // No permission requirement
      }

      // Apply requireAll logic
      const hasAccess = requireAll 
        ? (hasRoleAccess && hasPermissionAccess)
        : (hasRoleAccess || hasPermissionAccess);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
          code: 'INSUFFICIENT_ACCESS',
          requiredRoles: roles,
          requiredPermissions: permissions,
          requireAll
        });
      }

      // User has valid access, proceed
      next();
    } catch (error) {
      console.error('Access validation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during access validation',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};