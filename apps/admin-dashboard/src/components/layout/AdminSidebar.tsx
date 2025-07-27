import React from 'react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom'
import { 
  X,
  ChevronDown,
  ChevronLeft
} from 'lucide-react'
import { clsx } from 'clsx'
import { MenuItem } from '@/config/wordpressMenuFinal'
import { filterMenuByRole, UserRole } from '@/config/rolePermissions'
import { useAuth } from '@o4o/auth-context'
import { useDynamicMenu } from '@/hooks/useDynamicMenu'

interface AdminSidebarProps {
  isOpen: boolean
  onClose: () => void
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation()
  const { user } = useAuth()
  const [expandedItems, setExpandedItems] = React.useState<string[]>([])
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  // 동적 메뉴 가져오기 (활성화된 앱 기반)
  const { menuItems: dynamicMenuItems, isLoading: menuLoading } = useDynamicMenu()
  
  // 역할 기반 메뉴 필터링
  const userRole = (user?.role || 'customer') as UserRole
  const userPermissions: string[] = [] // User type doesn't have permissions field yet
  const menuItems = filterMenuByRole(dynamicMenuItems, userRole, userPermissions)

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const isActive = (path: string) => location.pathname === path

  const isParentActive = (children: MenuItem[] | undefined) => 
    children?.some(child => child.path && isActive(child.path)) || false

  const handleMenuItemClick = (item: MenuItem) => {
    if (item.id === 'collapse') {
      setIsCollapsed(!isCollapsed)
      return
    }
  }

  const renderMenuItem = (item: MenuItem) => {
    if (item.separator) {
      return <div key={item.id} className="my-2 border-t border-[#444]" />
    }

    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.id)
    const parentActive = hasChildren && isParentActive(item.children)

    if (item.id === 'collapse') {
      return (
        <button
          key={item.id}
          onClick={() => handleMenuItemClick(item)}
          className="admin-sidebar-item w-full relative mt-auto"
        >
          <div className="flex items-center gap-3">
            {isCollapsed ? <ChevronLeft className="w-5 h-5" /> : item.icon}
            {!isCollapsed && <span>{item.label}</span>}
          </div>
        </button>
      )
    }

    if (hasChildren) {
      return (
        <div key={item.id}>
          <button
            onClick={() => toggleExpanded(item.id)}
            className={clsx(
              'admin-sidebar-item w-full relative',
              parentActive && 'active'
            )}
          >
            <div className="flex items-center gap-3">
              {item.icon}
              {!isCollapsed && <span>{item.label}</span>}
            </div>
            <ChevronDown 
              className={clsx(
                'w-4 h-4 transition-transform duration-200',
                isExpanded && 'rotate-180'
              )}
            />
          </button>
          
          {isExpanded && item.children && !isCollapsed && (
            <div className="ml-6 mt-1 space-y-1">
              {item.children.map(child => (
                <Link
                  key={child.id}
                  to={child.path!}
                  className={clsx(
                    'admin-sidebar-item relative',
                    isActive(child.path!) && 'active'
                  )}
                  onClick={onClose}
                >
                  <div className="flex items-center gap-3">
                    {child.icon}
                    <span>{child.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link
        key={item.id}
        to={item.path!}
        className={clsx(
          'admin-sidebar-item relative',
          isActive(item.path!) && 'active'
        )}
        onClick={onClose}
      >
        <div className="flex items-center gap-3">
          {item.icon}
          {!isCollapsed && <span>{item.label}</span>}
        </div>
      </Link>
    )
  }

  return (
    <aside 
      className={clsx(
        'admin-sidebar fixed left-0 z-40 transform transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-[36px] collapsed' : 'w-[160px]',
        'lg:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-8 items-center justify-between px-2 bg-[#1d2327]">
          {!isCollapsed && (
            <Link to="/" className="flex items-center gap-1 text-[13px] hover:text-modern-primary transition-colors">
              <div className="w-5 h-5 bg-modern-primary rounded-sm flex items-center justify-center">
                <span className="text-white text-xs font-bold">O</span>
              </div>
              <span>O4O Admin</span>
            </Link>
          )}
          <button
            onClick={onClose}
            className="lg:hidden text-sidebar-text hover:text-white ml-auto"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 custom-scrollbar overflow-y-auto">
          {menuLoading ? (
            <div className="flex justify-center items-center h-20">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          ) : (
            menuItems.map(renderMenuItem)
          )}
        </nav>

        {/* Footer */}
        {!isCollapsed && (
          <div className="p-2 border-t border-sidebar-border">
            <div className="text-xs text-sidebar-text text-center">
              O4O v1.0.0
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

export default AdminSidebar