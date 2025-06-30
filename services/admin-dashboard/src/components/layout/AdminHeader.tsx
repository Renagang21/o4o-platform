import React from 'react'
import { Menu, Bell, User, LogOut, Settings as SettingsIcon } from 'lucide-react'
import { useAuthStore } from '@/api/authStore'

interface AdminHeaderProps {
  onMenuClick: () => void
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuthStore()
  const [showUserMenu, setShowUserMenu] = React.useState(false)

  const handleLogout = () => {
    logout()
    setShowUserMenu(false)
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              관리자 대시보드
            </h1>
            <p className="text-sm text-gray-500">
              O4O 플랫폼 통합 관리 시스템
            </p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 relative">
            <Bell className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 p-2 rounded-md text-gray-700 hover:bg-gray-100"
            >
              <div className="w-8 h-8 bg-admin-blue text-white rounded-full flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div className="text-left hidden md:block">
                <div className="text-sm font-medium">{user?.name || 'Admin'}</div>
                <div className="text-xs text-gray-500">{user?.email}</div>
              </div>
            </button>

            {/* User dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                <div className="py-1">
                  <button
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <User className="w-4 h-4" />
                    프로필 설정
                  </button>
                  <button
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <SettingsIcon className="w-4 h-4" />
                    계정 설정
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    로그아웃
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default AdminHeader