import { FC } from 'react';
import { useAuthStore } from '@/stores/authStore'
import ThemeSettings from './ThemeSettings'
import { Shield } from 'lucide-react'
import { hasAnyPermission } from '@/utils/permissions';

const ThemeSettingsWithAuth: FC = () => {
  const { user } = useAuthStore()

  // Only admins can manage themes
  const hasPermission = hasAnyPermission(user, ['settings:write', 'system:admin'])
  
  if (!hasPermission) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">테마 설정</h1>
          <p className="text-gray-600 mt-1">시스템 전체의 시각적 테마를 선택하고 관리합니다</p>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">접근 권한이 없습니다</h3>
              <p className="text-gray-600">
                테마 설정은 관리자만 변경할 수 있습니다.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                현재 권한: <span className="font-medium">{user?.role || '손님'}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return <ThemeSettings />
}

export default ThemeSettingsWithAuth