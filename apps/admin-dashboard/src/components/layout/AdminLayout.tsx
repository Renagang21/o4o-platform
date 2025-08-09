import { FC, ReactNode, useState, useEffect } from 'react';
import AdminSidebar from './AdminSidebar'
import AdminHeader from './AdminHeader'
import AdminBreadcrumb from '../common/AdminBreadcrumb'
import AdminBar from './AdminBar'
import { AdminNotices } from '../notices/AdminNotices'
import toast from 'react-hot-toast'
import { useAuth } from '@o4o/auth-context'
import '../../styles/admin-layout.css'

interface AdminLayoutProps {
  children: ReactNode
}

const AdminLayout: FC<AdminLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false) // Default to closed on mobile
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
      // Auto-open sidebar on desktop
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
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
    <div className="wordpress-admin">
      {/* WordPress Admin Bar */}
      <AdminBar onLogout={handleLogout} />
      
      {/* Sidebar with proper classes */}
      <div className={`admin-sidebar ${sidebarOpen ? 'open' : ''} ${!isMobile ? 'expanded' : ''}`}>
        <AdminSidebar _isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>
      
      {/* Main content wrapper with proper positioning */}
      <div className="wordpress-admin-content">
        {/* Header - only show menu button on mobile */}
        {isMobile && <AdminHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />}
        
        {/* Page content */}
        <main>
          <AdminBreadcrumb />
          <AdminNotices />
          {children}
        </main>
      </div>
      
      {/* Mobile sidebar backdrop */}
      <div 
        className={`admin-sidebar-backdrop ${sidebarOpen && isMobile ? 'show' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      
      {/* Mobile menu toggle button */}
      {isMobile && (
        <button
          className="admin-sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}
    </div>
  )
}

export default AdminLayout