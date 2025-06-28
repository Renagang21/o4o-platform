import React, { useState } from 'react';
import { 
  BarChart3,
  FileText,
  Image,
  File,
  MessageCircle,
  Palette,
  Puzzle,
  Users,
  Wrench,
  Settings,
  ChevronRight,
  ChevronDown,
  X
} from 'lucide-react';

interface MenuItemProps {
  icon: React.ComponentType<any>;
  label: string;
  href?: string;
  active?: boolean;
  badge?: number;
  children?: MenuItemProps[];
}

interface AdminSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  currentPage: string;
  onCollapse: () => void;
  onMobileClose: () => void;
  userRole: 'admin' | 'editor' | 'author';
}

const menuItems: MenuItemProps[] = [
  {
    icon: BarChart3,
    label: '알림판',
    href: '/admin',
    active: true
  },
  {
    icon: FileText,
    label: '글',
    children: [
      { icon: FileText, label: '모든 글', href: '/admin/posts' },
      { icon: FileText, label: '새 글 추가', href: '/admin/posts/new' },
      { icon: FileText, label: '카테고리', href: '/admin/categories' },
      { icon: FileText, label: '태그', href: '/admin/tags' }
    ]
  },
  {
    icon: Image,
    label: '미디어',
    href: '/admin/media'
  },
  {
    icon: File,
    label: '페이지',
    children: [
      { icon: File, label: '모든 페이지', href: '/admin/pages' },
      { icon: File, label: '새 페이지 추가', href: '/admin/pages/new' }
    ]
  },
  {
    icon: MessageCircle,
    label: '댓글',
    href: '/admin/comments',
    badge: 5
  },
  {
    icon: Palette,
    label: '외모',
    children: [
      { icon: Palette, label: '테마', href: '/admin/themes' },
      { icon: Palette, label: '사용자 정의하기', href: '/admin/customize' },
      { icon: Palette, label: '위젯', href: '/admin/widgets' },
      { icon: Palette, label: '메뉴', href: '/admin/menus' }
    ]
  },
  {
    icon: Puzzle,
    label: '플러그인',
    href: '/admin/plugins',
    badge: 2
  },
  {
    icon: Users,
    label: '사용자',
    href: '/admin/users'
  },
  {
    icon: Wrench,
    label: '도구',
    children: [
      { icon: Wrench, label: '가져오기', href: '/admin/import' },
      { icon: Wrench, label: '내보내기', href: '/admin/export' },
      { icon: Wrench, label: '사이트 상태', href: '/admin/site-health' }
    ]
  },
  {
    icon: Settings,
    label: '설정',
    children: [
      { icon: Settings, label: '일반', href: '/admin/settings/general' },
      { icon: Settings, label: '쓰기', href: '/admin/settings/writing' },
      { icon: Settings, label: '읽기', href: '/admin/settings/reading' },
      { icon: Settings, label: '토론', href: '/admin/settings/discussion' },
      { icon: Settings, label: '미디어', href: '/admin/settings/media' }
    ]
  }
];

export function AdminSidebar({ 
  collapsed, 
  mobileOpen, 
  currentPage, 
  onCollapse, 
  onMobileClose,
  userRole 
}: AdminSidebarProps) {
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['글', '페이지']);

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  const filteredMenuItems = menuItems.filter(item => {
    if (userRole !== 'admin' && (item.label === '플러그인' || item.label === '사용자' || item.label === '도구')) {
      return false;
    }
    return true;
  });

  const sidebarContent = (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-800">
        <span className="font-medium">관리자 메뉴</span>
        <button onClick={onMobileClose} className="p-1 hover:bg-gray-800 rounded">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 py-4">
        {filteredMenuItems.map((item) => (
          <div key={item.label} className="mb-1">
            {item.children ? (
              // Parent Menu with Children
              <>
                <button
                  onClick={() => toggleMenu(item.label)}
                  className={`w-full flex items-center px-4 py-2 text-sm hover:bg-gray-800 transition-colors ${
                    currentPage.startsWith(item.label.toLowerCase()) ? 'bg-blue-600' : ''
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {expandedMenus.includes(item.label) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </>
                  )}
                  {item.badge && !collapsed && (
                    <span className="ml-2 bg-red-600 text-white text-xs rounded-full px-2 py-0.5">
                      {item.badge}
                    </span>
                  )}
                </button>
                
                {/* Submenu */}
                {expandedMenus.includes(item.label) && !collapsed && (
                  <div className="bg-gray-800">
                    {item.children.map((child) => (
                      <a
                        key={child.label}
                        href={child.href}
                        className="flex items-center px-8 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                      >
                        <span>{child.label}</span>
                      </a>
                    ))}
                  </div>
                )}
              </>
            ) : (
              // Simple Menu Item
              <a
                href={item.href}
                className={`flex items-center px-4 py-2 text-sm hover:bg-gray-800 transition-colors ${
                  currentPage === item.label.toLowerCase() ? 'bg-blue-600' : ''
                }`}
              >
                <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="ml-2 bg-red-600 text-white text-xs rounded-full px-2 py-0.5">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </a>
            )}
          </div>
        ))}
      </nav>

      {/* Collapse Button (Desktop) */}
      {!mobileOpen && (
        <div className="border-t border-gray-800 p-2">
          <button
            onClick={onCollapse}
            className="w-full flex items-center justify-center py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4 mr-2" />}
            {!collapsed && <span>접기</span>}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`hidden md:flex flex-col ${collapsed ? 'w-16' : 'w-64'} transition-all duration-300 border-r border-gray-300`}>
        <div className="mt-8">
          {sidebarContent}
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={onMobileClose}
          />
          <div className="fixed left-0 top-0 bottom-0 w-64 z-50 md:hidden">
            <div className="mt-8">
              {sidebarContent}
            </div>
          </div>
        </>
      )}
    </>
  );
}