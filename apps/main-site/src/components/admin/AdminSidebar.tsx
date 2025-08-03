import { Component, FC, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  FileText,
  Settings,
  Users,
  BarChart3,
  Puzzle,
  Store,
  Database,
  Folder,
  Image,
  UserCheck,
  Package,
  Tag,
  Link as LinkIcon,
  Eye,
  FileCode,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  path?: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: '대시보드',
    icon: Home,
    path: '/admin/dashboard'
  },
  {
    id: 'content',
    label: '콘텐츠 관리',
    icon: FileText,
    children: [
      { id: 'posts', label: '글', icon: FileText, path: '/admin/posts' },
      { id: 'pages', label: '페이지', icon: Folder, path: '/admin/pages' },
      { id: 'media', label: '미디어 라이브러리', icon: Image, path: '/admin/media' },
    ]
  },
  {
    id: 'data-structure',
    label: '데이터 구조',
    icon: Database,
    children: [
      { id: 'cpt', label: 'Custom Post Types', icon: Package, path: '/admin/cpt' },
      { id: 'taxonomy', label: 'Taxonomy', icon: Tag, path: '/admin/taxonomy' },
      { id: 'fields', label: 'Custom Fields', icon: LinkIcon, path: '/admin/fields' },
      { id: 'relations', label: 'Relations', icon: LinkIcon, path: '/admin/relations' },
      { id: 'views', label: 'Views', icon: Eye, path: '/admin/views' },
      { id: 'templates', label: 'Templates', icon: FileCode, path: '/admin/templates' },
    ]
  },
  {
    id: 'ecommerce',
    label: '전자상거래',
    icon: Store,
    children: [
      { id: 'products', label: '상품 관리', icon: Package, path: '/admin/products' },
      { id: 'orders', label: '주문 관리', icon: FileText, path: '/admin/orders' },
      { id: 'customers', label: '고객 관리', icon: Users, path: '/admin/customers' },
      { id: 'commerce-settings', label: '커머스 설정', icon: Settings, path: '/admin/commerce/settings' },
    ]
  },
  {
    id: 'users',
    label: '사용자 관리',
    icon: UserCheck,
    children: [
      { id: 'all-users', label: '모든 사용자', icon: Users, path: '/admin/users' },
      { id: 'roles', label: '역할 관리', icon: UserCheck, path: '/admin/roles' },
      { id: 'permissions', label: '권한 설정', icon: Settings, path: '/admin/permissions' },
    ]
  },
  {
    id: 'analytics',
    label: '통계 대시보드',
    icon: BarChart3,
    children: [
      { id: 'traffic', label: '트래픽 분석', icon: BarChart3, path: '/admin/analytics/traffic' },
      { id: 'sales', label: '매출 분석', icon: BarChart3, path: '/admin/analytics/sales' },
      { id: 'users-analytics', label: '사용자 분석', icon: BarChart3, path: '/admin/analytics/users' },
    ]
  },
  {
    id: 'plugins',
    label: '플러그인',
    icon: Puzzle,
    path: '/admin/plugins'
  },
  {
    id: 'settings',
    label: '설정',
    icon: Settings,
    children: [
      { id: 'general', label: '일반 설정', icon: Settings, path: '/admin/settings/general' },
      { id: 'auth', label: '인증 설정', icon: Settings, path: '/admin/settings/auth' },
      { id: 'email', label: '이메일 설정', icon: Settings, path: '/admin/settings/email' },
    ]
  }
];

const AdminSidebar: FC = () => {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState(['content', 'data-structure']);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isParentActive = (children: MenuItem[]) => {
    return children.some(child => child.path && isActive(child.path));
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const isItemActive = item.path ? isActive(item.path) : hasChildren && isParentActive(item.children!);

    return (
      <div key={item.id} className="mb-1">
        {item.path ? (
          <Link
            to={item.path}
            className={`
              w-full flex items-center px-3 py-2 text-left text-sm font-medium rounded-md
              transition-colors duration-150 ease-in-out
              ${level > 0 ? 'ml-6 pl-6' : ''}
              ${isItemActive
                ? 'bg-blue-100 text-blue-700 border-r-4 border-blue-500'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }
            `}
          >
            <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
            {item.label}
          </Link>
        ) : (
          <button
            onClick={() => toggleExpanded(item.id)}
            className={`
              w-full flex items-center justify-between px-3 py-2 text-left text-sm font-medium rounded-md
              transition-colors duration-150 ease-in-out
              ${level > 0 ? 'ml-6 pl-6' : ''}
              ${isItemActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }
            `}
          >
            <div className="flex items-center">
              <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
              {item.label}
            </div>
            {hasChildren && (
              isExpanded ? 
                <ChevronDown className="h-4 w-4" /> : 
                <ChevronRight className="h-4 w-4" />
            )}
          </button>
        )}

        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-64 bg-white shadow-lg h-screen fixed left-0 top-0 overflow-y-auto">
      {/* 로고 영역 */}
      <div className="h-16 flex items-center justify-center border-b border-gray-200">
        <div className="flex items-center">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">O</span>
          </div>
          <span className="ml-2 text-xl font-bold text-gray-900">4O Platform</span>
        </div>
      </div>

      {/* 메뉴 영역 */}
      <nav className="mt-4 px-3">
        <div className="space-y-1">
          {menuItems.map(item => renderMenuItem(item))}
        </div>
      </nav>

      {/* 하단 정보 */}
      <div className="absolute bottom-4 left-0 right-0 px-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500">
            <div>Version 1.0.0</div>
            <div className="mt-1">WordPress 스타일 CMS</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;