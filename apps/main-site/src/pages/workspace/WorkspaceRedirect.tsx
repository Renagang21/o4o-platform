/**
 * P2: WorkspaceRedirect - Workspace URL to Dashboard Redirect
 *
 * Handles /workspace/:role URLs and redirects to actual dashboard routes
 * based on user's active role assignments.
 *
 * Example:
 * - /workspace/supplier → /dashboard/supplier (if user has supplier role)
 * - /workspace/seller → /dashboard/seller (if user has seller role)
 * - /workspace/user → /account (if user has user role)
 */

import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Workspace to Dashboard path mapping
 * Maps role identifiers to their actual dashboard routes
 */
const workspacePaths: Record<string, string> = {
  user: '/account',
  seller: '/dashboard/seller',
  supplier: '/dashboard/supplier',
  partner: '/dashboard/partner',
  admin: '/dashboard/admin',
  administrator: '/dashboard/admin',
};

/**
 * WorkspaceRedirect Component
 *
 * P2: Unified workspace entry point
 * - Validates user has the requested role
 * - Redirects to appropriate dashboard
 * - Provides consistent /workspace/* URL structure
 */
export const WorkspaceRedirect: React.FC = () => {
  const { role } = useParams<{ role: string }>();
  const { hasRole, isLoading } = useAuth();

  // Show loading state while auth is being checked
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  // No role specified - redirect to home
  if (!role) {
    return <Navigate to="/" replace />;
  }

  // Check if user has the requested role
  if (!hasRole(role)) {
    // User doesn't have this role - redirect to home
    return <Navigate to="/" replace />;
  }

  // Get the target path for this role
  const targetPath = workspacePaths[role];

  if (!targetPath) {
    // Unknown role - redirect to home
    return <Navigate to="/" replace />;
  }

  // Redirect to the actual dashboard
  return <Navigate to={targetPath} replace />;
};

export default WorkspaceRedirect;
