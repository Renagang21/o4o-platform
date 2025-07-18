import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  ShoppingCart,
  Package,
  BarChart3,
  Settings,
  X,
  ChevronDown,
  Home,
  Globe,
  Tag,
  Store
} from 'lucide-react'
import { clsx } from 'clsx'

interface AdminSidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface MenuItem {
  id: string
  label: string
  icon: React.ReactElement
  path?: string
  children?: MenuItem[]
}

const menuItems: MenuItem[] = [
  {
    id: 'home',
    label: '홈',
    icon: <Home className="w-5 h-5" />,
    path: '/'
  },
  {
    id: 'dashboard',
    label: '대시보드',
    icon: <LayoutDashboard className="w-5 h-5" />,
    path: '/dashboard'
  },
  {
    id: 'users',
    label: '사용자 관리',
    icon: <Users className="w-5 h-5" />,
    children: [
      { id: 'users-all', label: '전체 사용자', icon: <Users className="w-4 h-4" />, path: '/users' },
      { id: 'users-pending', label: '승인 대기', icon: <Users className="w-4 h-4" />, path: '/users/pending' },
      { id: 'users-business', label: '사업자 회원', icon: <Users className="w-4 h-4" />, path: '/users/business' },
      { id: 'users-affiliates', label: '파트너 회원', icon: <Users className="w-4 h-4" />, path: '/users/affiliates' }
    ]
  },
  {
    id: 'content',
    label: '콘텐츠 관리',
    icon: <FileText className="w-5 h-5" />,
    children: [
      { id: 'content-posts', label: '게시글', icon: <FileText className="w-4 h-4" />, path: '/content/posts' },
      { id: 'content-pages', label: '페이지', icon: <FileText className="w-4 h-4" />, path: '/content/pages' },
      { id: 'content-homepage', label: '홈페이지 편집', icon: <Globe className="w-4 h-4" />, path: '/homepage-editor' },
      { id: 'content-categories', label: '카테고리 & 태그', icon: <Tag className="w-4 h-4" />, path: '/categories' },
      { id: 'content-menus', label: '메뉴 관리', icon: <FileText className="w-4 h-4" />, path: '/menus' },
      { id: 'content-cpt', label: 'CPT 관리', icon: <FileText className="w-4 h-4" />, path: '/content/cpt' },
      { id: 'content-acf', label: 'ACF 관리', icon: <FileText className="w-4 h-4" />, path: '/content/acf' },
      { id: 'content-media', label: '미디어 라이브러리', icon: <FileText className="w-4 h-4" />, path: '/content/media' },
      { id: 'content-templates', label: '템플릿 관리', icon: <FileText className="w-4 h-4" />, path: '/content/templates' },
      { id: 'content-widgets', label: '위젯 관리', icon: <FileText className="w-4 h-4" />, path: '/content/widgets' }
    ]
  },
  {
    id: 'ecommerce',
    label: '이커머스',
    icon: <ShoppingCart className="w-5 h-5" />,
    children: [
      { id: 'products', label: '상품 관리', icon: <Package className="w-4 h-4" />, path: '/products' },
      { id: 'orders', label: '주문 관리', icon: <ShoppingCart className="w-4 h-4" />, path: '/orders' },
      { id: 'categories', label: '카테고리', icon: <Package className="w-4 h-4" />, path: '/products/categories' },
      { id: 'inventory', label: '재고 관리', icon: <Package className="w-4 h-4" />, path: '/products/inventory' }
    ]
  },
  {
    id: 'vendors',
    label: '벤더 관리',
    icon: <Store className="w-5 h-5" />,
    children: [
      { id: 'vendors-all', label: '전체 벤더', icon: <Store className="w-4 h-4" />, path: '/vendors' },
      { id: 'vendors-pending', label: '승인 대기', icon: <Store className="w-4 h-4" />, path: '/vendors/pending' },
      { id: 'vendors-commission', label: '수수료 관리', icon: <Store className="w-4 h-4" />, path: '/vendors/commission' },
      { id: 'vendors-reports', label: '벤더 리포트', icon: <Store className="w-4 h-4" />, path: '/vendors/reports' }
    ]
  },
  {
    id: 'analytics',
    label: '분석 & 리포트',
    icon: <BarChart3 className="w-5 h-5" />,
    children: [
      { id: 'analytics-overview', label: '전체 개요', icon: <BarChart3 className="w-4 h-4" />, path: '/analytics' },
      { id: 'analytics-sales', label: '매출 분석', icon: <BarChart3 className="w-4 h-4" />, path: '/analytics/sales' },
      { id: 'analytics-users', label: '사용자 분석', icon: <BarChart3 className="w-4 h-4" />, path: '/analytics/users' },
      { id: 'analytics-products', label: '상품 분석', icon: <BarChart3 className="w-4 h-4" />, path: '/analytics/products' }
    ]
  },
  {
    id: 'settings',
    label: '설정',
    icon: <Settings className="w-5 h-5" />,
    children: [
      { id: 'settings-general', label: '일반 설정', icon: <Settings className="w-4 h-4" />, path: '/settings' },
      { id: 'settings-theme', label: '테마 설정', icon: <Settings className="w-4 h-4" />, path: '/settings/theme' },
      { id: 'settings-users', label: '사용자 설정', icon: <Settings className="w-4 h-4" />, path: '/settings/users' },
      { id: 'settings-email', label: '이메일 설정', icon: <Settings className="w-4 h-4" />, path: '/settings/email' },
      { id: 'settings-integrations', label: '연동 설정', icon: <Settings className="w-4 h-4" />, path: '/settings/integrations' }
    ]
  }
]

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation()
  const [expandedItems, setExpandedItems] = React.useState<string[]>(['users', 'content', 'ecommerce'])

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

  const renderMenuItem = (item: MenuItem) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.id)
    const parentActive = hasChildren && isParentActive(item.children)

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
              <span>{item.label}</span>
            </div>
            <ChevronDown 
              className={clsx(
                'w-4 h-4 transition-transform duration-200',
                isExpanded && 'rotate-180'
              )}
            />
          </button>
          
          {isExpanded && item.children && (
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
          <span>{item.label}</span>
        </div>
      </Link>
    )
  }

  return (
    <aside 
      className={clsx(
        'admin-sidebar fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out',
        'lg:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Home className="w-8 h-8 text-white" />
            <span className="text-lg font-bold text-white">O4O Admin</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-sidebar-text hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 custom-scrollbar overflow-y-auto">
          {menuItems.map(renderMenuItem)}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="text-xs text-sidebar-text text-center">
            O4O Platform Admin v1.0.0
          </div>
        </div>
      </div>
    </aside>
  )
}

export default AdminSidebar