import { FC, ReactNode, useState } from 'react';
import AdminSidebar from './AdminSidebar'
import AdminHeader from './AdminHeader'
import AdminBreadcrumb from '../common/AdminBreadcrumb'
import AdminBar from './AdminBar'
import { AdminNotices } from '../notices/AdminNotices'
import toast from 'react-hot-toast'
import { useAuth } from '@o4o/auth-context'

interface AdminLayoutProps {
  children: ReactNode
}

const AdminLayout: FC<AdminLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true) // Default to open on desktop
  const { logout } = useAuth()

  const handleLogout = async () => {
    try {
      logout()
      toast.success('로그아웃되었습니다.')
    } catch (error: any) {
    // Error logging - use proper error handler
      toast.error('로그아웃 처리 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-wp-bg-primary">
      {/* WordPress Admin Bar */}
      <AdminBar onLogout={handleLogout} />
      
      {/* Sidebar */}
      <AdminSidebar _isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main content wrapper with proper positioning */}
      <div className="wordpress-admin-content">
        {/* Header */}
        <AdminHeader onMenuClick={() => setSidebarOpen(true)} />
        
        {/* Page content */}
        <main className="p-6">
          <AdminBreadcrumb />
          <AdminNotices />
          {children}
        </main>
      </div>
      
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}

export default AdminLayout