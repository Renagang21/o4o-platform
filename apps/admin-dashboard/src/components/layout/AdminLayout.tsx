import { FC, ReactNode, useState, useEffect } from 'react';
import AdminSidebar from './AdminSidebar'
import AdminHeader from './AdminHeader'
import AdminBar from './AdminBar'
import { AdminNotices } from '../notices/AdminNotices'
import toast from 'react-hot-toast'
import { useAuth } from '@o4o/auth-context'
import { WordPressRouter } from '@/components/routing/WordPressRouter'
import '../../styles/admin-layout-fixed.css'

interface AdminLayoutProps {
  children: ReactNode
}

const AdminLayout: FC<AdminLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024)

  useEffect(() => {
    const checkMobile = () => {
      const isCurrentlyMobile = window.innerWidth < 1024
      setIsMobile(isCurrentlyMobile)
      // Auto-close sidebar when switching to mobile
      if (isCurrentlyMobile && sidebarOpen) {
        setSidebarOpen(false)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [sidebarOpen])
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
      {/* WordPress Router - only loads when admin is authenticated */}
      <WordPressRouter />
      
      {/* WordPress Admin Bar */}
      <AdminBar onLogout={handleLogout} />
      
      {/* Sidebar with proper classes */}
      <div className={`admin-sidebar ${sidebarOpen ? 'open' : ''} ${!isMobile ? 'desktop-mode' : ''}`}>
        <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>
      
      {/* Main content wrapper with proper positioning */}
      <div className={`wordpress-admin-content ${!isMobile ? 'with-sidebar' : ''}`}>
        {/* Header - show without menu button as we have a dedicated toggle button */}
        {isMobile && <AdminHeader />}
        
        {/* Page content */}
        <main>
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
      {isMobile && !sidebarOpen && (
        <button
          className="admin-sidebar-toggle"
          onClick={() => setSidebarOpen(true)}
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