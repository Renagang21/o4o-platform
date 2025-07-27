import { FC, ReactNode } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import AdminBreadcrumb from './AdminBreadcrumb';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showBreadcrumb?: boolean;
  fullWidth?: boolean;
}

const AdminLayout: FC<AdminLayoutProps> = ({ 
  children, 
  title, 
  subtitle, 
  showBreadcrumb = true,
  fullWidth = false
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 사이드바 */}
      <AdminSidebar />
      
      {/* 헤더 */}
      <AdminHeader />
      
      {/* 메인 콘텐츠 영역 */}
      <main className={`pt-16 ${fullWidth ? 'pl-64' : 'pl-64'}`}>
        <div className={fullWidth ? '' : 'max-w-7xl mx-auto'}>
          <div className="p-6">
            {/* Breadcrumb */}
            {showBreadcrumb && <AdminBreadcrumb />}
            
            {/* 페이지 헤더 */}
            {(title || subtitle) && (
              <div className="mb-6">
                {title && (
                  <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                )}
                {subtitle && (
                  <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
                )}
              </div>
            )}
            
            {/* 페이지 콘텐츠 */}
            <div className="bg-white shadow-sm rounded-lg">
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;