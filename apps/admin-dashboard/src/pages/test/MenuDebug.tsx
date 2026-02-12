import React from 'react';
import { useAuth } from '@o4o/auth-context';
import { useAdminMenu } from '@/hooks/useAdminMenu';
import { adminMenuStatic } from '@/admin/menu/admin-menu.static';
import { menuPermissions, hasMenuPermission } from '@/config/rolePermissions';

export default function MenuDebug() {
  const { user } = useAuth();
  const { menuItems, userRoles, userPermissions, isLoading } = useAdminMenu();

  // Test tools menu specifically
  const toolsMenuItem = adminMenuStatic.find(m => m.id === 'tools');
  const toolsPermission = menuPermissions.find(m => m.menuId === 'tools');
  const hasToolsAccess = hasMenuPermission(userRoles, userPermissions, 'tools');

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Menu Debug 정보</h1>

      {/* User Info */}
      <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">1. 사용자 정보</h2>
        <div className="space-y-2 font-mono text-sm">
          <div><strong>ID:</strong> {user?.id}</div>
          <div><strong>Email:</strong> {user?.email}</div>
          <div><strong>user.role:</strong> {JSON.stringify((user as any)?.role)}</div>
          <div><strong>user.roles (raw objects):</strong> {JSON.stringify((user as any)?.roles)}</div>
          <div className="text-lg font-bold text-green-600">
            <strong>✅ Computed userRoles (strings):</strong> {JSON.stringify(userRoles)}
          </div>
          <div className="text-xs text-gray-600">
            (Should be string array like ["super_admin"] for permission checking to work)
          </div>
        </div>
      </div>

      {/* Permissions */}
      <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">2. 권한 정보</h2>
        <div className="font-mono text-sm">
          <div><strong>userPermissions ({userPermissions.length}):</strong></div>
          <pre className="mt-2 p-3 bg-white rounded overflow-auto max-h-40">
            {JSON.stringify(userPermissions, null, 2)}
          </pre>
        </div>
      </div>

      {/* Tools Menu Check */}
      <div className="mb-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">3. "도구" 메뉴 체크</h2>
        <div className="space-y-3 font-mono text-sm">
          <div>
            <strong>toolsMenuItem exists:</strong> {toolsMenuItem ? '✅ Yes' : '❌ No'}
          </div>
          <div>
            <strong>toolsPermission config:</strong>
            <pre className="mt-1 p-3 bg-white rounded">
              {JSON.stringify(toolsPermission, null, 2)}
            </pre>
          </div>
          <div className="text-lg">
            <strong>hasToolsAccess:</strong>{' '}
            <span className={hasToolsAccess ? 'text-green-600' : 'text-red-600'}>
              {hasToolsAccess ? '✅ TRUE (보여야 함)' : '❌ FALSE (숨김)'}
            </span>
          </div>
        </div>
      </div>

      {/* Filtered Menu Items */}
      <div className="mb-8 p-6 bg-purple-50 border border-purple-200 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">4. 필터링된 메뉴 ({menuItems.length}개)</h2>
        <div className="font-mono text-sm">
          <div className="space-y-1">
            {menuItems.map((item, idx) => (
              <div key={idx} className={item.separator ? 'text-gray-400' : ''}>
                {item.separator ? '---' : `${item.id}: ${item.label}`}
                {(item as any).appId && <span className="text-blue-600 ml-2">(appId: {(item as any).appId})</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* All Menu Permissions */}
      <div className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">5. 전체 menuPermissions 설정</h2>
        <div className="font-mono text-sm">
          <pre className="p-3 bg-white rounded overflow-auto max-h-96">
            {JSON.stringify(menuPermissions, null, 2)}
          </pre>
        </div>
      </div>

      {/* Raw User Object */}
      <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">6. Raw User 객체 (전체)</h2>
        <div className="font-mono text-sm">
          <pre className="p-3 bg-white rounded overflow-auto max-h-96">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
