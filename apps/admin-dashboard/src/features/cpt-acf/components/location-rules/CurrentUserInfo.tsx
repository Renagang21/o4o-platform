/**
 * Current User Info Component
 * Displays current user's role for debugging location rules
 */

import React from 'react';
import { User, Shield } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

interface CurrentUserInfoProps {
  className?: string;
}

export const CurrentUserInfo: React.FC<CurrentUserInfoProps> = ({ className = '' }) => {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return null;
  }

  // Get user roles (support both single role and roles array)
  const roles = user.roles || (user.role ? [user.role] : []);
  const primaryRole = user.role || roles[0] || 'No role';

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-md p-3 ${className}`}>
      <div className="flex items-start gap-2">
        <User className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 flex-1">
          <p className="font-medium mb-1">Current User Information</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-blue-600">Name:</span>
              <span className="font-medium">{user.name || user.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-3 h-3 text-blue-600" />
              <span className="text-blue-600">Role:</span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium text-xs">
                {primaryRole}
              </span>
            </div>
            {roles.length > 1 && (
              <div className="flex items-start gap-2">
                <span className="text-blue-600">All Roles:</span>
                <div className="flex flex-wrap gap-1">
                  {roles.map((role, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium text-xs"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-blue-600 mt-2">
            💡 This information helps you test user role-based location rules
          </p>
        </div>
      </div>
    </div>
  );
};

export default CurrentUserInfo;
