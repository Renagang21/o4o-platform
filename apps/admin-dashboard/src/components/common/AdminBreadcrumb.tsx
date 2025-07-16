import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  path?: string
}

interface AdminBreadcrumbProps {
  items?: BreadcrumbItem[]
  className?: string
}

const AdminBreadcrumb: React.FC<AdminBreadcrumbProps> = ({ items, className = '' }) => {
  const location = useLocation()
  
  // 경로 기반 자동 브레드크럼 생성
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean)
    
    const breadcrumbs: BreadcrumbItem[] = [
      { label: '대시보드', path: '/dashboard' }
    ]
    
    // 경로별 라벨 매핑
    const labelMap: Record<string, string> = {
      'users': '사용자 관리',
      'content': '콘텐츠 관리',
      'products': '상품 관리',
      'orders': '주문 관리',
      'analytics': '분석 & 리포트',
      'settings': '설정',
      'media': '미디어',
      'pending': '승인 대기',
      'business': '사업자 회원',
      'affiliates': '파트너 회원',
      'posts': '게시글',
      'pages': '페이지',
      'cpt': 'CPT 관리',
      'categories': '카테고리',
      'inventory': '재고 관리',
      'sales': '매출 분석',
      'overview': '전체 개요',
      'general': '일반 설정',
      'theme': '테마 설정',
      'email': '이메일 설정',
      'integrations': '연동 설정'
    }
    
    let currentPath = ''
    pathSegments.forEach((segment: string, index: number) => {
      currentPath += `/${segment}`
      
      if (segment !== 'dashboard') {
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
        <React.Fragment key={index}>
          {index > 0 && <ChevronRight className="w-4 h-4 text-wp-text-secondary" />}
          
          {item.path ? (
            <Link
              to={item.path}
              className="hover:text-admin-blue transition-colors duration-200 font-medium"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-wp-text-primary font-semibold">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}

export default AdminBreadcrumb