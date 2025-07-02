import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

const AdminBreadcrumb: React.FC = () => {
  const location = useLocation();

  // 경로를 기반으로 breadcrumb 생성
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(segment => segment);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: '대시보드', path: '/admin/dashboard' }
    ];

    // 현재 경로에 따른 breadcrumb 설정
    if (pathSegments.includes('admin')) {
      const adminIndex = pathSegments.indexOf('admin');
      const remainingSegments = pathSegments.slice(adminIndex + 1);

      remainingSegments.forEach((segment, index) => {
        const pathUpToIndex = '/' + pathSegments.slice(0, adminIndex + 2 + index).join('/');
        
        switch (segment) {
          case 'content':
            breadcrumbs.push({ label: '콘텐츠 관리', path: pathUpToIndex });
            break;
          case 'posts':
            breadcrumbs.push({ label: '글 관리', path: pathUpToIndex });
            break;
          case 'pages':
            breadcrumbs.push({ label: '페이지 관리', path: pathUpToIndex });
            break;
          case 'media':
            breadcrumbs.push({ label: '미디어 라이브러리', path: pathUpToIndex });
            break;
          case 'cpt':
            breadcrumbs.push({ label: 'Custom Post Types', path: pathUpToIndex });
            break;
          case 'taxonomy':
            breadcrumbs.push({ label: 'Taxonomy', path: pathUpToIndex });
            break;
          case 'fields':
            breadcrumbs.push({ label: 'Custom Fields', path: pathUpToIndex });
            break;
          case 'relations':
            breadcrumbs.push({ label: 'Relations', path: pathUpToIndex });
            break;
          case 'views':
            breadcrumbs.push({ label: 'Views', path: pathUpToIndex });
            break;
          case 'templates':
            breadcrumbs.push({ label: 'Templates', path: pathUpToIndex });
            break;
          case 'products':
            breadcrumbs.push({ label: '상품 관리', path: pathUpToIndex });
            break;
          case 'orders':
            breadcrumbs.push({ label: '주문 관리', path: pathUpToIndex });
            break;
          case 'customers':
            breadcrumbs.push({ label: '고객 관리', path: pathUpToIndex });
            break;
          case 'users':
            breadcrumbs.push({ label: '사용자 관리', path: pathUpToIndex });
            break;
          case 'roles':
            breadcrumbs.push({ label: '역할 관리', path: pathUpToIndex });
            break;
          case 'permissions':
            breadcrumbs.push({ label: '권한 설정', path: pathUpToIndex });
            break;
          case 'analytics':
            breadcrumbs.push({ label: '통계 분석', path: pathUpToIndex });
            break;
          case 'traffic':
            breadcrumbs.push({ label: '트래픽 분석', path: pathUpToIndex });
            break;
          case 'sales':
            breadcrumbs.push({ label: '매출 분석', path: pathUpToIndex });
            break;
          case 'plugins':
            breadcrumbs.push({ label: '플러그인', path: pathUpToIndex });
            break;
          case 'settings':
            breadcrumbs.push({ label: '설정', path: pathUpToIndex });
            break;
          case 'general':
            breadcrumbs.push({ label: '일반 설정', path: pathUpToIndex });
            break;
          case 'auth':
            breadcrumbs.push({ label: '인증 설정', path: pathUpToIndex });
            break;
          case 'email':
            breadcrumbs.push({ label: '이메일 설정', path: pathUpToIndex });
            break;
          case 'gutenberg':
            if (remainingSegments[index + 1] === 'new') {
              breadcrumbs.push({ label: '페이지 편집', path: undefined });
              breadcrumbs.push({ label: '새 페이지', path: undefined });
            } else if (remainingSegments[index + 1]) {
              breadcrumbs.push({ label: '페이지 편집', path: undefined });
              breadcrumbs.push({ label: '페이지 수정', path: undefined });
            }
            break;
          case 'new':
            // 이미 처리됨
            break;
          default:
            // ID나 기타 세그먼트는 마지막 breadcrumb로 처리
            if (index === remainingSegments.length - 1) {
              breadcrumbs.push({ label: segment, path: undefined });
            }
            break;
        }
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
      <Home className="h-4 w-4" />
      
      {breadcrumbs.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
          
          {item.path ? (
            <Link
              to={item.path}
              className="hover:text-blue-600 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default AdminBreadcrumb;