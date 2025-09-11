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
  const [isMobile, setIsMobile] = useState(() => {
    // Safe window access for SSR
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false; // Default to desktop on server
  })

  useEffect(() => {
    const checkMobile = () => {
      const isCurrentlyMobile = window.innerWidth < 1024
      setIsMobile(isCurrentlyMobile)
      // Auto-close sidebar when switching to mobile
      if (isCurrentlyMobile && sidebarOpen) {
        setSidebarOpen(false)
      }
    }
    
    // Initial check on mount
    checkMobile()
    
    // Listen for resize events
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [sidebarOpen])
  
  // Additional effect to ensure mobile detection on first render
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth < 1024);
    }
  }, [])
  
  // Debug: Log sidebar state changes
  useEffect(() => {
    console.log('Sidebar state changed:', { sidebarOpen, isMobile });
  }, [sidebarOpen, isMobile])
  
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
        {/* Header with menu button for mobile */}
        {isMobile && <AdminHeader onMenuClick={() => {
          console.log('Menu clicked - current sidebarOpen:', sidebarOpen, 'isMobile:', isMobile);
          setSidebarOpen(!sidebarOpen);
        }} />}
        
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
    </div>
  )
}

export default AdminLayout