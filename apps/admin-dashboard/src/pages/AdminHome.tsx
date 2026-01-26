import { FC } from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  FileText, 
  Settings,
  TrendingUp,
  Package,
  MessageSquare,
  Calendar,
  Activity,
  DollarSign,
  Eye,
  Store,
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface QuickStatCard {
  title: string;
  value: string;
  change: string;
  icon: React.ElementType;
  link: string;
  color: string;
}

interface AtAGlance {
  label: string;
  value: string;
  link: string;
  icon?: React.ElementType;
}

const AdminHome: FC = () => {
  const quickStats: QuickStatCard[] = [
    {
      title: '총 매출',
      value: '₩12,345,000',
      change: '+12.5%',
      icon: DollarSign,
      link: '/reports/sales',
      color: 'bg-green-500'
    },
    {
      title: '신규 주문',
      value: '24',
      change: '+8',
      icon: ShoppingBag,
      link: '/orders',
      color: 'bg-blue-500'
    },
    {
      title: '방문자 수',
      value: '1,234',
      change: '+5.2%',
      icon: Eye,
      link: '/analytics',
      color: 'bg-purple-500'
    },
    {
      title: '활성 사용자',
      value: '456',
      change: '+15',
      icon: Users,
      link: '/users',
      color: 'bg-orange-500'
    }
  ];

  const quickActions = [
    { title: '새 상품 추가', icon: Package, link: '/ecommerce/products/new', color: 'text-blue-600' },
    { title: '주문 관리', icon: ShoppingBag, link: '/ecommerce/orders', color: 'text-green-600' },
    { title: '고객 관리', icon: Users, link: '/users', color: 'text-purple-600' },
    { title: '콘텐츠 작성', icon: FileText, link: '/posts/new', color: 'text-orange-600' },
    { title: '리뷰 관리', icon: MessageSquare, link: '/reviews', color: 'text-pink-600' },
    { title: '일정 관리', icon: Calendar, link: '/calendar', color: 'text-indigo-600' }
  ];

  const recentActivity = [
    { id: 1, type: 'order', message: '새 주문 #12345가 접수되었습니다', time: '5분 전' },
    { id: 2, type: 'user', message: '신규 사용자 김철수님이 가입했습니다', time: '15분 전' },
    { id: 3, type: 'product', message: '상품 "프리미엄 세트"의 재고가 부족합니다', time: '30분 전' },
    { id: 4, type: 'review', message: '새로운 5성 리뷰가 등록되었습니다', time: '1시간 전' },
    { id: 5, type: 'system', message: '시스템 백업이 완료되었습니다', time: '2시간 전' }
  ];

  // WordPress style "At a Glance" data
  const atAGlanceItems: AtAGlance[] = [
    { label: '게시글', value: '15', link: '/content/posts', icon: FileText },
    { label: '페이지', value: '5', link: '/content/pages', icon: FileText },
    { label: '댓글', value: '2', link: '/comments', icon: MessageSquare },
    { label: '상품', value: '125', link: '/products', icon: Package },
    { label: '주문', value: '24', link: '/orders', icon: ShoppingBag },
    { label: '사용자', value: '456', link: '/users', icon: Users },
    { label: '벤더', value: '12', link: '/vendors', icon: Store },
  ];

  return (
    <div className="space-y-6">
      {/* 배포 테스트 배너 v4.0 */}
      <div className="bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 text-white p-6 rounded-xl shadow-2xl animate-pulse">
        <h1 className="text-3xl font-bold mb-2">🎉 배포 성공 v4.0! 🎉</h1>
        <p className="text-lg">최종 업데이트: {new Date().toLocaleString('ko-KR')}</p>
        <p className="text-sm mt-2 opacity-90">캐시 문제 해결 완료 ✅</p>
      </div>
      
      {/* WordPress 스타일 환영 메시지 */}
      <div>
        <h1 className="text-2xl font-bold text-o4o-text-primary">대시보드</h1>
        <p className="text-sm text-o4o-text-secondary mt-1">O4O Platform 관리자 홈 - v4.0 Updated</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 한눈에 보기 (At a Glance) - WordPress 스타일 */}
        <div className="o4o-card">
          <h3 className="text-base font-semibold text-o4o-text-primary mb-4">한눈에 보기</h3>
          <div className="space-y-2">
            {atAGlanceItems.map((item: any) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center justify-between py-1">
                  <Link to={item.link} className="flex items-center gap-2 text-admin-blue hover:text-admin-blue-dark">
                    {Icon && <Icon className="h-4 w-4" />}
                    <span className="text-sm">{item.value} {item.label}</span>
                  </Link>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border border-gray-200">
            <p className="text-sm text-o4o-text-secondary">
              WordPress 5.8 테마 사용중
            </p>
          </div>
        </div>

        {/* 활동 (Activity) */}
        <div className="o4o-card">
          <h3 className="text-base font-semibold text-o4o-text-primary mb-4">활동</h3>
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-o4o-text-primary mb-2">최근 게시됨</h4>
              <div className="space-y-1">
                <Link to="/content/posts/123" className="text-sm text-admin-blue hover:text-admin-blue-dark block">
                  신규 프로모션 안내
                </Link>
                <p className="text-xs text-o4o-text-secondary">2시간 전</p>
              </div>
            </div>
            <div className="pt-3 border-t border border-gray-200">
              <h4 className="text-sm font-medium text-o4o-text-primary mb-2">최근 댓글</h4>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-o4o-text-secondary">김고객님이 </span>
                  <Link to="/products/456" className="text-admin-blue hover:text-admin-blue-dark">
                    프리미엄 상품
                  </Link>
                  <span className="text-o4o-text-secondary">에 댓글</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 빠른 작업 (Quick Draft) */}
        <div className="o4o-card">
          <h3 className="text-base font-semibold text-o4o-text-primary mb-4">빠른 작업</h3>
          <div className="space-y-3">
            <Link to="/content/posts/new" className="flex items-center gap-2 text-sm text-admin-blue hover:text-admin-blue-dark">
              <Plus className="h-4 w-4" />
              새 게시글 작성
            </Link>
            <Link to="/ecommerce/products/new" className="flex items-center gap-2 text-sm text-admin-blue hover:text-admin-blue-dark">
              <Plus className="h-4 w-4" />
              새 상품 추가
            </Link>
            <Link to="/users/new" className="flex items-center gap-2 text-sm text-admin-blue hover:text-admin-blue-dark">
              <Plus className="h-4 w-4" />
              새 사용자 추가
            </Link>
            <Link to="/vendors/new" className="flex items-center gap-2 text-sm text-admin-blue hover:text-admin-blue-dark">
              <Plus className="h-4 w-4" />
              새 벤더 추가
            </Link>
          </div>
          <div className="mt-4 pt-4 border-t border border-gray-200">
            <Link to="/activity-log" className="text-sm text-admin-blue hover:text-admin-blue-dark">
              모든 활동 로그 보기 →
            </Link>
          </div>
        </div>
      </div>

      {/* 빠른 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat: any) => {
          const Icon = stat.icon;
          return (
            <Link 
              key={stat.title} 
              to={stat.link}
              className="o4o-card hover:shadow-lg transition-shadow duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-o4o-text-secondary">{stat.title}</p>
                  <p className="text-2xl font-bold text-o4o-text-primary mt-1">{stat.value}</p>
                  <p className="text-sm text-green-600 mt-1">{stat.change} 전일 대비</p>
                </div>
                <div className={`p-3 rounded-full ${stat.color} bg-opacity-10`}>
                  <Icon className={`h-6 w-6 ${stat.color.replace('bg-', 'text-')}`} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 빠른 작업 */}
        <div className="lg:col-span-2">
          <div className="o4o-card">
            <h2 className="text-lg font-semibold text-o4o-text-primary mb-4">빠른 작업</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {quickActions.map((action: any) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.title}
                    to={action.link}
                    className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-admin-blue hover:bg-admin-blue hover:bg-opacity-5 transition-all duration-200"
                  >
                    <Icon className={`h-8 w-8 ${action.color} mb-2`} />
                    <span className="text-sm text-center text-o4o-text-primary">{action.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* 시스템 상태 */}
          <div className="o4o-card mt-6">
            <h2 className="text-lg font-semibold text-o4o-text-primary mb-4">시스템 상태</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-green-500" />
                  <span className="text-o4o-text-primary">API 서버</span>
                </div>
                <span className="text-sm text-green-600 font-medium">정상 작동</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-green-500" />
                  <span className="text-o4o-text-primary">데이터베이스</span>
                </div>
                <span className="text-sm text-green-600 font-medium">정상 작동</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-yellow-500" />
                  <span className="text-o4o-text-primary">캐시 서버</span>
                </div>
                <span className="text-sm text-yellow-600 font-medium">사용률 85%</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border border-gray-200">
              <Link 
                to="/system/monitoring" 
                className="text-sm text-admin-blue hover:text-admin-blue-dark"
              >
                상세 모니터링 보기 →
              </Link>
            </div>
          </div>
        </div>

        {/* 최근 활동 */}
        <div className="o4o-card">
          <h2 className="text-lg font-semibold text-o4o-text-primary mb-4">최근 활동</h2>
          <div className="space-y-3">
            {recentActivity.map((activity: any) => (
              <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border border-gray-200 last:border-0 last:pb-0">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-2 h-2 bg-admin-blue rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-o4o-text-primary">{activity.message}</p>
                  <p className="text-xs text-o4o-text-secondary mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border border-gray-200">
            <Link 
              to="/activity-log" 
              className="text-sm text-admin-blue hover:text-admin-blue-dark"
            >
              전체 활동 내역 보기 →
            </Link>
          </div>
        </div>
      </div>

      {/* 주요 기능 바로가기 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/dashboard" className="o4o-card hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500 bg-opacity-10 rounded-lg">
              <LayoutDashboard className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h3 className="font-medium text-o4o-text-primary">대시보드</h3>
              <p className="text-sm text-o4o-text-secondary">통계 및 분석 보기</p>
            </div>
          </div>
        </Link>

        <Link to="/reports" className="o4o-card hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500 bg-opacity-10 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <h3 className="font-medium text-o4o-text-primary">리포트</h3>
              <p className="text-sm text-o4o-text-secondary">매출 및 성과 분석</p>
            </div>
          </div>
        </Link>

        <Link to="/settings" className="o4o-card hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-500 bg-opacity-10 rounded-lg">
              <Settings className="h-6 w-6 text-gray-500" />
            </div>
            <div>
              <h3 className="font-medium text-o4o-text-primary">설정</h3>
              <p className="text-sm text-o4o-text-secondary">시스템 환경 설정</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default AdminHome;