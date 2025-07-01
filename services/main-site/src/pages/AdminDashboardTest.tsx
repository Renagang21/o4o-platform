import React, { useState } from 'react';
import { 
  AdminDashboard,
  DashboardHome,
  AllPages,
  AddNewPage,
  PageEditor
} from '@shared/components/admin';

type AdminPage = 'dashboard' | 'pages' | 'pages-new' | 'pages-edit';

export function AdminDashboardTest() {
  const [currentPage, setCurrentPage] = useState<AdminPage>('dashboard');
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  // URL 파라미터에서 페이지 정보 추출 (실제 환경에서는 React Router 사용)
  React.useEffect(() => {
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    
    if (path.includes('/admin/pages/edit/')) {
      const pageId = path.split('/').pop();
      setCurrentPage('pages-edit');
      setSelectedPageId(pageId || null);
    } else if (path.includes('/admin/pages/new')) {
      setCurrentPage('pages-new');
    } else if (path.includes('/admin/pages')) {
      setCurrentPage('pages');
    } else {
      setCurrentPage('dashboard');
    }
  }, []);

  // 페이지 네비게이션 핸들러
  const handleNavigation = (page: AdminPage, pageId?: string) => {
    setCurrentPage(page);
    if (pageId) {
      setSelectedPageId(pageId);
    }
    
    // URL 업데이트 (실제 환경에서는 React Router 사용)
    let newUrl = '/admin-test';
    switch (page) {
      case 'pages':
        newUrl = '/admin-test/pages';
        break;
      case 'pages-new':
        newUrl = '/admin-test/pages/new';
        break;
      case 'pages-edit':
        newUrl = `/admin-test/pages/edit/${pageId || 'new'}`;
        break;
      default:
        newUrl = '/admin-test';
    }
    
    window.history.pushState(null, '', newUrl);
  };

  // 페이지 에디터에서 뒤로가기
  const handleBackFromEditor = () => {
    handleNavigation('pages');
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'pages':
        return <AllPages />;
      
      case 'pages-new':
        return <AddNewPage />;
      
      case 'pages-edit':
        return (
          <PageEditor 
            pageId={selectedPageId || undefined}
            onBack={handleBackFromEditor}
          />
        );
      
      default:
        return <DashboardHome />;
    }
  };

  // 페이지 에디터는 풀스크린이므로 AdminDashboard 래퍼 없이 렌더링
  if (currentPage === 'pages-edit') {
    return renderCurrentPage();
  }

  return (
    <AdminDashboard 
      currentPage={currentPage}
      userRole="admin"
    >
      {renderCurrentPage()}
    </AdminDashboard>
  );
}