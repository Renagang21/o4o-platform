import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

interface AdminMainProps {
  children: React.ReactNode;
  sidebarCollapsed: boolean;
  currentPage: string;
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

const getBreadcrumbs = (currentPage: string): BreadcrumbItem[] => {
  const breadcrumbs: BreadcrumbItem[] = [
    { label: '홈', href: '/admin' }
  ];

  switch (currentPage) {
    case 'dashboard':
      breadcrumbs.push({ label: '알림판' });
      break;
    case 'posts':
      breadcrumbs.push({ label: '글' }, { label: '모든 글' });
      break;
    case 'posts-new':
      breadcrumbs.push({ label: '글' }, { label: '새 글 추가' });
      break;
    case 'pages':
      breadcrumbs.push({ label: '페이지' }, { label: '모든 페이지' });
      break;
    case 'pages-new':
      breadcrumbs.push({ label: '페이지' }, { label: '새 페이지 추가' });
      break;
    case 'pages-edit':
      breadcrumbs.push({ label: '페이지' }, { label: '페이지 편집' });
      break;
    case 'media':
      breadcrumbs.push({ label: '미디어' });
      break;
    case 'settings':
      breadcrumbs.push({ label: '설정' });
      break;
    default:
      breadcrumbs.push({ label: currentPage });
  }

  return breadcrumbs;
};

const getPageTitle = (currentPage: string): string => {
  const titles: Record<string, string> = {
    'dashboard': '알림판',
    'posts': '글',
    'posts-new': '새 글 추가',
    'pages': '페이지',
    'pages-new': '새 페이지 추가',
    'pages-edit': '페이지 편집',
    'media': '미디어 라이브러리',
    'settings': '설정'
  };

  return titles[currentPage] || currentPage;
};

export function AdminMain({ children, sidebarCollapsed, currentPage }: AdminMainProps) {
  const breadcrumbs = getBreadcrumbs(currentPage);
  const pageTitle = getPageTitle(currentPage);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-white">
      {/* Top spacing for AdminBar */}
      <div className="h-8"></div>
      
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        {/* Breadcrumbs */}
        <nav className="flex items-center text-sm text-gray-500 mb-2">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <ChevronRight className="h-4 w-4 mx-2" />}
              {crumb.href ? (
                <a href={crumb.href} className="hover:text-blue-600">
                  {index === 0 ? <Home className="h-4 w-4" /> : crumb.label}
                </a>
              ) : (
                <span className="text-gray-900">
                  {index === 0 ? <Home className="h-4 w-4" /> : crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>

        {/* Page Title */}
        <h1 className="text-2xl font-semibold text-gray-900">{pageTitle}</h1>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <span>WordPress 스타일 관리자</span>
              <span>버전 1.0.0</span>
            </div>
            <div className="flex items-center space-x-4 mt-2 sm:mt-0">
              <a href="/admin/help" className="hover:text-blue-600">도움말</a>
              <a href="/admin/about" className="hover:text-blue-600">정보</a>
              <span>O4O Platform으로 구동</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}