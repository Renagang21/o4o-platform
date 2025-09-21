import { FC, ReactNode, useState, useEffect, useMemo } from 'react';
import AdminSidebar from './AdminSidebar'
import AdminHeader from './AdminHeader'
import AdminBar from './AdminBar'
import { AdminNotices } from '../notices/AdminNotices'
import toast from 'react-hot-toast'
import { useAuth } from '@o4o/auth-context'
import { WordPressRouter } from '@/components/routing/WordPressRouter'
import { useLocation } from 'react-router-dom'
import { useAdminFullscreen } from '@/hooks/useAdminFullscreen'

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
  
  const { logout } = useAuth()
  const location = useLocation()
  const { isFullscreen: fullscreenState } = useAdminFullscreen()

  // Detect fullscreen customizer mode
  const isFullscreenCustomizer = useMemo(() => {
    const pathname = location.pathname || ''
    const search = location.search || ''
    // Enable fullscreen when visiting the Customizer route
    if (pathname.startsWith('/customize')) return true
    // Or via explicit query flags
    return /[?&](fullscreen|customizer)=(1|true)/i.test(search)
  }, [location.pathname, location.search])

  const isFullscreenMode = isFullscreenCustomizer || fullscreenState

  // Sync body class as a fallback to ensure layout hides chrome
  useEffect(() => {
    if (typeof document === 'undefined') return
    const cls = 'customizer-fullscreen'
    if (isFullscreenMode) document.body.classList.add(cls)
    else document.body.classList.remove(cls)
  }, [isFullscreenMode])

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
      
      {/* WordPress Admin Bar (hidden in fullscreen customizer) */}
      {!isFullscreenMode && <AdminBar onLogout={handleLogout} />}
      
      
      {/* Sidebar - CSS handles all styling, no inline styles needed */}
      {/* Sidebar (hidden in fullscreen customizer) */}
      {!isFullscreenMode && (
        <div 
          className={`admin-sidebar ${sidebarOpen ? 'open' : ''} ${!isMobile ? 'desktop-mode' : ''}`}
        >
          <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </div>
      )}
      
      {/* Main content wrapper with proper positioning */}
      <div className={`wordpress-admin-content ${!isMobile && !isFullscreenMode ? 'with-sidebar' : ''}`}>
        {/* Header with menu button for mobile */}
        {/* Mobile header toggle (hidden in fullscreen customizer) */}
        {isMobile && !isFullscreenMode && (
          <AdminHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        )}
        
        {/* Page content */}
        <main>
          <AdminNotices />
          {children}
        </main>
      </div>
      
      {/* Mobile sidebar backdrop */}
      {/* Mobile sidebar backdrop (hidden in fullscreen customizer) */}
      {!isFullscreenMode && (
        <div 
          className={`admin-sidebar-backdrop ${sidebarOpen && isMobile ? 'show' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}

export default AdminLayout
