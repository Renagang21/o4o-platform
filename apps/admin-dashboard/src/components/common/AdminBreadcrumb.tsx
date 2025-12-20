import { FC, Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  /** Route path (preferred) */
  path?: string
  /** Route path (alias for path) */
  href?: string
}

interface AdminBreadcrumbProps {
  items?: BreadcrumbItem[]
  className?: string
}

const AdminBreadcrumb: FC<AdminBreadcrumbProps> = ({ items, className = '' }) => {
  const location = useLocation()
  
  // 경로 기반 자동 브레드크럼 생성
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean)
    
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Admin', path: '/admin' }
    ]
    
    // 경로별 라벨 매핑
    const labelMap: Record<string, string> = {
      'users': '사용자',
      'content': '콘텐츠',
      'products': '상품',
      'orders': '주문',
      'analytics': '분석',
      'settings': '설정',
      'pending': '승인 대기',
      'business': '사업자 회원',
      'affiliates': '파트너 회원',
      'posts': '글',
      'pages': '페이지',
      'cpt': 'CPT 관리',
      'categories': '카테고리',
      'inventory': '재고 관리',
      'sales': '매출 분석',
      'overview': '전체 개요',
      'general': '일반',
      'writing': '쓰기',
      'reading': '읽기',
      'discussion': '토론',
      'permalinks': '고유주소',
      'privacy': '개인정보',
      'theme': '테마',
      'oauth': 'OAuth',
      'email': '이메일',
      'integrations': '연동',
      'shortcodes': 'Shortcodes',
      'apps': 'Apps',
      'by-app': '앱별 분류',
      'by-category': '카테고리별',
      'stats': '사용 통계',
      'installed': '설치된 앱',
      'marketplace': '마켓플레이스',
      'all': '모든 글',
      'new': '새 글 추가',
      'tags': '태그',
      'comments': '댓글',
      'themes': '테마',
      'ecommerce': '전자상거래',
      'customize': '사용자 정의하기',
      'menus': '메뉴',
      'library': '라이브러리'
    }

    // 특별한 페이지들 처리 (설정, shortcodes 등)
    const specialPages = ['settings', 'shortcodes', 'apps']
    const mainPage = pathSegments[0]
    
    if (specialPages.includes(mainPage)) {
      // 메인 페이지 추가
      breadcrumbs.push({
        label: labelMap[mainPage] || mainPage,
        path: pathSegments.length === 1 ? undefined : `/${mainPage}`
      })
      
      // 하위 페이지가 있는 경우만 현재 탭 표시
      if (pathSegments.length > 1) {
        const subPage = pathSegments[1] // 마지막이 아닌 두 번째 세그먼트 사용
        // 유효한 설정 탭인지 확인
        const validSettingsTabs = ['general', 'writing', 'reading', 'discussion', 'privacy', 'oauth', 'email']
        if (mainPage === 'settings' && validSettingsTabs.includes(subPage)) {
          breadcrumbs.push({
            label: labelMap[subPage] || subPage,
            path: undefined // 현재 페이지는 링크 없음
          })
        } else if (mainPage !== 'settings') {
          // 설정이 아닌 다른 특별한 페이지의 경우
          const lastSegment = pathSegments[pathSegments.length - 1]
          breadcrumbs.push({
            label: labelMap[lastSegment] || lastSegment,
            path: undefined
          })
        }
      }
      
      return breadcrumbs
    }
    
    // 일반적인 경우 처리
    let currentPath = ''
    pathSegments.forEach((segment: string, index: number) => {
      currentPath += `/${segment}`
      
      // admin과 dashboard 세그먼트는 무시 (이미 Admin으로 추가됨)
      if (segment !== 'admin' && segment !== 'dashboard') {
        breadcrumbs.push({
          label: labelMap[segment] || segment,
          path: index === pathSegments.length - 1 ? undefined : currentPath
        })
      }
    })
    
    return breadcrumbs
  }
  
  const breadcrumbItems = items || generateBreadcrumbs()
  
  if (breadcrumbItems.length <= 1) {
    return null
  }
  
  return (
    <nav className={`flex items-center space-x-2 text-sm text-wp-text-secondary mb-6 ${className}`}>
      <Home className="w-4 h-4" />
      
      {breadcrumbItems.map((item, index) => (
        <Fragment key={index}>
          {index > 0 && <ChevronRight className="w-4 h-4 text-wp-text-secondary" />}
          
          {(item.path ?? item.href) ? (
            <Link
              to={(item.path ?? item.href)!}
              className="hover:text-admin-blue transition-colors duration-200 font-medium"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-wp-text-primary font-semibold">
              {item.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  )
}

export default AdminBreadcrumb