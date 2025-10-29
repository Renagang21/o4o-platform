import React, { useState, useEffect } from 'react';
import { AccessControl } from '@o4o/types';
import { getAvailableRoles, validateAccessControl, getDefaultAccessControl } from '@o4o/utils';

interface PostAccessControlProps {
  value: AccessControl;
  onChange: (accessControl: AccessControl) => void;
}

/**
 * PostAccessControl Component
 *
 * UI for configuring role-based access control on posts/pages.
 * Used in the post editor sidebar.
 */
export const PostAccessControl: React.FC<PostAccessControlProps> = ({ value, onChange }) => {
  const [accessControl, setAccessControl] = useState<AccessControl>(value || getDefaultAccessControl());
  const [validationError, setValidationError] = useState<string | null>(null);

  const availableRoles = getAvailableRoles(true);

  useEffect(() => {
    setAccessControl(value || getDefaultAccessControl());
  }, [value]);

  const handleChange = (updates: Partial<AccessControl>) => {
    const updated = { ...accessControl, ...updates };

    // Validate
    const validation = validateAccessControl(updated);
    if (validation.isValid) {
      setValidationError(null);
      setAccessControl(updated);
      onChange(updated);
    } else {
      setValidationError(validation.error || null);
    }
  };

  const handleRoleToggle = (roleValue: string) => {
    const isCurrentlySelected = accessControl.allowedRoles.includes(roleValue);

    let newAllowedRoles: string[];
    if (isCurrentlySelected) {
      newAllowedRoles = accessControl.allowedRoles.filter(r => r !== roleValue);

      // Ensure at least one role is selected
      if (newAllowedRoles.length === 0) {
        setValidationError('최소 하나의 Role을 선택해야 합니다.');
        return;
      }
    } else {
      newAllowedRoles = [...accessControl.allowedRoles, roleValue];
    }

    handleChange({ allowedRoles: newAllowedRoles });
  };

  return (
    <div className="post-access-control">
      <h3 className="text-lg font-semibold mb-4">접근 제어 설정</h3>

      {/* Enable/Disable Access Control */}
      <div className="mb-4">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={accessControl.enabled}
            onChange={(e) => handleChange({ enabled: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="ml-2 text-sm font-medium text-gray-700">
            접근 제어 활성화
          </span>
        </label>
        <p className="mt-1 text-xs text-gray-500">
          이 포스트/페이지에 대한 접근 제어를 활성화합니다
        </p>
      </div>

      {/* Access Control Options (only if enabled) */}
      {accessControl.enabled && (
        <>
          {/* Require Login */}
          <div className="mb-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={accessControl.requireLogin}
                onChange={(e) => handleChange({ requireLogin: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                로그인 필수
              </span>
            </label>
            <p className="mt-1 text-xs text-gray-500">
              비로그인 사용자는 접근할 수 없습니다
            </p>
          </div>

          {/* Allowed Roles */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              허용된 Role
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-md p-3">
              {availableRoles.map((role) => (
                <label key={role.value} className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={accessControl.allowedRoles.includes(role.value)}
                    onChange={() => handleRoleToggle(role.value)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {role.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Redirect URL */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              리다이렉트 URL (선택사항)
            </label>
            <input
              type="text"
              value={accessControl.redirectUrl || ''}
              onChange={(e) => handleChange({ redirectUrl: e.target.value || undefined })}
              placeholder="/pricing 또는 https://example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              접근 거부 시 사용자를 리다이렉트할 URL
            </p>
          </div>

          {/* Custom Message */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              사용자 지정 메시지 (선택사항)
            </label>
            <textarea
              value={accessControl.customMessage || ''}
              onChange={(e) => handleChange({ customMessage: e.target.value || undefined })}
              placeholder="이 콘텐츠에 접근하려면 프리미엄 플랜이 필요합니다."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              접근 거부 시 표시할 사용자 지정 메시지 (HTML 지원)
            </p>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{validationError}</p>
            </div>
          )}

          {/* Info Box */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-xs text-blue-700">
              <strong>참고:</strong> 선택한 Role을 가진 사용자만 이 콘텐츠에 접근할 수 있습니다.
              다른 사용자는 사용자 지정 메시지를 보게 됩니다.
            </p>
          </div>
        </>
      )}

      <style jsx>{`
        .post-access-control {
          padding: 1rem;
          background-color: #f9fafb;
          border-radius: 0.5rem;
        }
      `}</style>
    </div>
  );
};

export default PostAccessControl;
