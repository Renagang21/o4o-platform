import { ReactElement } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Image, 
  FileTextIcon,
  ShoppingCart,
  Users,
  Wrench,
  Settings,
  MessageSquare,
  Tag,
  Menu as MenuIcon,
  Palette,
  UserCheck,
  Share2,
  Monitor,
  DollarSign,
  FileCode,
  RefreshCw,
  Package,
  ClipboardList,
  UserPlus,
  TrendingUp,
  Link,
  BarChart3,
  Store,
  CreditCard,
  FileCheck,
  Layout,
  FolderTree,
  Activity,
  Shield,
  Puzzle,
  Plus,
  Code
} from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  icon: ReactElement;
  path?: string;
  separator?: boolean;
  children?: MenuItem[];
}

export const wordpressMenuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: '대시보드',
    icon: <LayoutDashboard className="w-5 h-5" />,
    path: '/admin'
  },
  {
    id: 'separator-1',
    label: '',
    icon: <></>,
    separator: true
  },
  {
    id: 'posts',
    label: '글',
    icon: <FileText className="w-5 h-5" />,
    children: [
      { id: 'posts-all', label: '모든 글', icon: <FileText className="w-4 h-4" />, path: '/posts' },
      { id: 'posts-new', label: '새 글 추가', icon: <FileText className="w-4 h-4" />, path: '/editor/posts/new' },
      { id: 'posts-categories', label: '카테고리', icon: <Tag className="w-4 h-4" />, path: '/posts/categories' },
      { id: 'posts-tags', label: '태그', icon: <Tag className="w-4 h-4" />, path: '/posts/tags' }
    ]
  },
  {
    id: 'media',
    label: '미디어',
    icon: <Image className="w-5 h-5" />,
    children: [
      { id: 'media-library', label: '라이브러리', icon: <Image className="w-4 h-4" />, path: '/media' },
      { id: 'media-new', label: '새로 추가', icon: <Image className="w-4 h-4" />, path: '/media/new' }
    ]
  },
  {
    id: 'pages',
    label: '페이지',
    icon: <FileTextIcon className="w-5 h-5" />,
    children: [
      { id: 'pages-all', label: '모든 페이지', icon: <FileTextIcon className="w-4 h-4" />, path: '/pages' },
      { id: 'pages-new', label: '새 페이지 추가', icon: <FileTextIcon className="w-4 h-4" />, path: '/editor/pages/new' }
    ]
  },
  {
    id: 'appearance',
    label: '외모',
    icon: <Palette className="w-5 h-5" />,
    children: [
      { id: 'customize', label: '사용자 정의하기', icon: <Palette className="w-4 h-4" />, path: '/admin/customize' },
      { id: 'menus', label: '메뉴', icon: <MenuIcon className="w-4 h-4" />, path: '/admin/appearance/menus' },
      { id: 'widgets', label: '위젯', icon: <Layout className="w-4 h-4" />, path: '/admin/appearance/widgets' },
      { id: 'template-parts', label: '템플릿 파트', icon: <Layout className="w-4 h-4" />, path: '/admin/appearance/template-parts' }
    ]
  },
  {
    id: 'separator-2',
    label: '',
    icon: <></>,
    separator: true
  },
  // 플러그인
  {
    id: 'plugins',
    label: '플러그인',
    icon: <Puzzle className="w-5 h-5" />,
    children: [
      { id: 'plugins-installed', label: '설치된 플러그인', icon: <Puzzle className="w-4 h-4" />, path: '/plugins' },
      { id: 'plugins-add', label: '새로 추가', icon: <Plus className="w-4 h-4" />, path: '/plugins/add' },
      { id: 'plugins-editor', label: '플러그인 편집기', icon: <Code className="w-4 h-4" />, path: '/plugins/editor' }
    ]
  },
  {
    id: 'ecommerce',
    label: '전자상거래',
    icon: <ShoppingCart className="w-5 h-5" />,
    children: [
      { id: 'ecommerce-dashboard', label: '대시보드', icon: <BarChart3 className="w-4 h-4" />, path: '/ecommerce' },
      { id: 'products', label: '상품 관리', icon: <Package className="w-4 h-4" />, path: '/ecommerce/products' },
      { id: 'categories', label: '카테고리', icon: <FolderTree className="w-4 h-4" />, path: '/ecommerce/categories' },
      { id: 'orders', label: '주문 관리', icon: <ClipboardList className="w-4 h-4" />, path: '/ecommerce/orders' },
      { id: 'inventory', label: '재고 관리', icon: <Package className="w-4 h-4" />, path: '/ecommerce/inventory' },
      { id: 'coupons', label: '쿠폰 관리', icon: <CreditCard className="w-4 h-4" />, path: '/ecommerce/coupons' },
      { id: 'refunds', label: '환불/교환', icon: <RefreshCw className="w-4 h-4" />, path: '/ecommerce/refunds' },
      { id: 'toss-payments', label: '결제 설정', icon: <CreditCard className="w-4 h-4" />, path: '/ecommerce/payments/toss' },
      { id: 'settlement-dashboard', label: '정산 관리', icon: <DollarSign className="w-4 h-4" />, path: '/ecommerce/settlements' },
      { id: 'reports', label: '매출 보고서', icon: <BarChart3 className="w-4 h-4" />, path: '/ecommerce/reports' },
      { id: 'ecommerce-settings', label: '설정', icon: <Settings className="w-4 h-4" />, path: '/ecommerce/settings' }
    ]
  },
  {
    id: 'vendors',
    label: '판매자/공급자',
    icon: <Store className="w-5 h-5" />,
    children: [
      { id: 'vendors-all', label: '모든 판매자', icon: <Store className="w-4 h-4" />, path: '/vendors' },
      { id: 'vendors-pending', label: '승인 대기', icon: <UserCheck className="w-4 h-4" />, path: '/vendors/pending' },
      { id: 'vendors-commission', label: '수수료 관리', icon: <DollarSign className="w-4 h-4" />, path: '/vendors/commission' },
      { id: 'vendors-reports', label: '판매자 보고서', icon: <FileCheck className="w-4 h-4" />, path: '/vendors/reports' }
    ]
  },
  {
    id: 'affiliate',
    label: '제휴 마케팅',
    icon: <Share2 className="w-5 h-5" />,
    children: [
      { id: 'affiliates-manage', label: '제휴사 관리', icon: <UserPlus className="w-4 h-4" />, path: '/affiliate/partners' },
      { id: 'affiliate-links', label: '추천 링크', icon: <Link className="w-4 h-4" />, path: '/affiliate/links' },
      { id: 'affiliate-commission', label: '수수료 현황', icon: <DollarSign className="w-4 h-4" />, path: '/affiliate/commission' },
      { id: 'affiliate-analytics', label: '성과 분석', icon: <TrendingUp className="w-4 h-4" />, path: '/affiliate/analytics' }
    ]
  },
  {
    id: 'separator-3',
    label: '',
    icon: <></>,
    separator: true
  },
  {
    id: 'forum',
    label: '포럼',
    icon: <MessageSquare className="w-5 h-5" />,
    children: [
      { id: 'forum-boards', label: '게시판 관리', icon: <MessageSquare className="w-4 h-4" />, path: '/forum/boards' },
      { id: 'forum-categories', label: '카테고리', icon: <FolderTree className="w-4 h-4" />, path: '/forum/categories' },
      { id: 'forum-posts', label: '게시글 관리', icon: <FileText className="w-4 h-4" />, path: '/forum/posts' },
      { id: 'forum-comments', label: '댓글 관리', icon: <MessageSquare className="w-4 h-4" />, path: '/forum/comments' },
      { id: 'forum-reports', label: '신고 관리', icon: <Shield className="w-4 h-4" />, path: '/forum/reports' },
      { id: 'forum-settings', label: '설정', icon: <Settings className="w-4 h-4" />, path: '/forum/settings' }
    ]
  },
  {
    id: 'signage',
    label: '디지털 사이니지',
    icon: <Monitor className="w-5 h-5" />,
    children: [
      { id: 'signage-screens', label: '화면 관리', icon: <Monitor className="w-4 h-4" />, path: '/signage/screens' },
      { id: 'signage-content', label: '콘텐츠 관리', icon: <FileText className="w-4 h-4" />, path: '/signage/content' },
      { id: 'signage-playlists', label: '재생목록', icon: <ClipboardList className="w-4 h-4" />, path: '/signage/playlists' },
      { id: 'signage-schedule', label: '스케줄 관리', icon: <Activity className="w-4 h-4" />, path: '/signage/schedule' },
      { id: 'signage-devices', label: '디바이스 관리', icon: <Monitor className="w-4 h-4" />, path: '/signage/devices' },
      { id: 'signage-analytics', label: '분석', icon: <BarChart3 className="w-4 h-4" />, path: '/signage/analytics' }
    ]
  },
  {
    id: 'crowdfunding',
    label: '크라우드펀딩',
    icon: <DollarSign className="w-5 h-5" />,
    children: [
      { id: 'crowdfunding-projects', label: '프로젝트 관리', icon: <FileText className="w-4 h-4" />, path: '/crowdfunding/projects' },
      { id: 'crowdfunding-backers', label: '후원자 관리', icon: <Users className="w-4 h-4" />, path: '/crowdfunding/backers' },
      { id: 'crowdfunding-rewards', label: '리워드 관리', icon: <Package className="w-4 h-4" />, path: '/crowdfunding/rewards' },
      { id: 'crowdfunding-payments', label: '결제 관리', icon: <CreditCard className="w-4 h-4" />, path: '/crowdfunding/payments' },
      { id: 'crowdfunding-reports', label: '보고서', icon: <BarChart3 className="w-4 h-4" />, path: '/crowdfunding/reports' },
      { id: 'crowdfunding-settings', label: '설정', icon: <Settings className="w-4 h-4" />, path: '/crowdfunding/settings' }
    ]
  },
  {
    id: 'separator-4',
    label: '',
    icon: <></>,
    separator: true
  },
  {
    id: 'cpt-acf',
    label: 'CPT & ACF',
    icon: <FileCode className="w-5 h-5" />,
    children: [
      { id: 'cpt-types', label: 'Custom Post Types', icon: <FileCode className="w-4 h-4" />, path: '/cpt' },
      { id: 'acf-fields', label: 'Custom Fields', icon: <FileCode className="w-4 h-4" />, path: '/acf' },
      { id: 'acf-groups', label: 'Field Groups', icon: <FileCode className="w-4 h-4" />, path: '/acf/groups' }
    ]
  },
  {
    id: 'separator-5',
    label: '',
    icon: <></>,
    separator: true
  },
  {
    id: 'users',
    label: '사용자',
    icon: <Users className="w-5 h-5" />,
    children: [
      { id: 'users-all', label: '모든 사용자', icon: <Users className="w-4 h-4" />, path: '/users' },
      { id: 'users-new', label: '새로 추가', icon: <UserPlus className="w-4 h-4" />, path: '/users/new' },
      { id: 'users-profile', label: '프로필', icon: <Users className="w-4 h-4" />, path: '/users/profile' },
      { id: 'users-roles', label: '역할 관리', icon: <UserCheck className="w-4 h-4" />, path: '/users/roles' },
      { id: 'users-statistics', label: '사용자 통계', icon: <BarChart3 className="w-4 h-4" />, path: '/users/statistics' }
    ]
  },
  {
    id: 'tools',
    label: '도구',
    icon: <Wrench className="w-5 h-5" />,
    children: [
      { id: 'tools-available', label: '사용 가능한 도구', icon: <Wrench className="w-4 h-4" />, path: '/tools' },
      { id: 'tools-shortcodes', label: 'Shortcode 관리', icon: <Code className="w-4 h-4" />, path: '/tools/shortcodes' },
      { id: 'tools-import', label: '가져오기', icon: <FileText className="w-4 h-4" />, path: '/tools/import' },
      { id: 'tools-export', label: '내보내기', icon: <FileText className="w-4 h-4" />, path: '/tools/export' }
    ]
  },
  {
    id: 'apps',
    label: '앱 관리',
    icon: <Package className="w-5 h-5" />,
    children: [
      { id: 'apps-installed', label: '설치된 앱', icon: <Package className="w-4 h-4" />, path: '/apps' },
      { id: 'apps-settings', label: '앱 설정', icon: <Settings className="w-4 h-4" />, path: '/apps/settings' },
      { id: 'apps-marketplace', label: '앱 마켓플레이스', icon: <Store className="w-4 h-4" />, path: '/apps/marketplace' }
    ]
  },
  {
    id: 'shortcodes',
    label: 'Shortcodes',
    icon: <Code className="w-5 h-5" />,
    children: [
      { id: 'shortcodes-all', label: '모든 Shortcodes', icon: <Code className="w-4 h-4" />, path: '/shortcodes' },
      { id: 'shortcodes-by-app', label: '앱별 분류', icon: <Package className="w-4 h-4" />, path: '/shortcodes/by-app' },
      { id: 'shortcodes-by-category', label: '카테고리별', icon: <FolderTree className="w-4 h-4" />, path: '/shortcodes/by-category' },
      { id: 'shortcodes-stats', label: '사용 통계', icon: <BarChart3 className="w-4 h-4" />, path: '/shortcodes/stats' },
      { id: 'shortcodes-settings', label: 'Shortcode 설정', icon: <Settings className="w-4 h-4" />, path: '/shortcodes/settings' }
    ]
  },
  {
    id: 'monitoring',
    label: '시스템 모니터링',
    icon: <Activity className="w-5 h-5" />,
    children: [
      { id: 'monitoring-dashboard', label: '통합 모니터링', icon: <Activity className="w-4 h-4" />, path: '/monitoring' },
      { id: 'performance', label: '성능 대시보드', icon: <BarChart3 className="w-4 h-4" />, path: '/monitoring/performance' },
      { id: 'security-logs', label: '보안 로그', icon: <Shield className="w-4 h-4" />, path: '/monitoring/security' }
    ]
  },
  {
    id: 'settings',
    label: '설정',
    icon: <Settings className="w-5 h-5" />,
    path: '/settings'
  },
  {
    id: 'separator-6',
    label: '',
    icon: <></>,
    separator: true
  },
  {
    id: 'collapse',
    label: '메뉴 접기',
    icon: <Layout className="w-5 h-5" />,
    path: '#collapse'
  }
];