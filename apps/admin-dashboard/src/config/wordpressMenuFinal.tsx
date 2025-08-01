import { 
  Home,
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
  Mail,
  Monitor,
  DollarSign,
  FileCode,
  RefreshCw,
  Package,
  ClipboardList,
  UserPlus,
  TrendingUp,
  Cog,
  Link,
  BarChart3,
  Store,
  CreditCard,
  FileCheck,
  Layout,
  FolderTree,
  Activity,
  Shield
} from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactElement;
  path?: string;
  separator?: boolean;
  children?: MenuItem[];
}

export const wordpressMenuItems: MenuItem[] = [
  {
    id: 'home',
    label: '홈',
    icon: <Home className="w-5 h-5" />,
    path: '/home'
  },
  {
    id: 'dashboard',
    label: '대시보드',
    icon: <LayoutDashboard className="w-5 h-5" />,
    path: '/dashboard'
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
      { id: 'posts-new', label: '새 글 추가', icon: <FileText className="w-4 h-4" />, path: '/posts/new' },
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
      { id: 'pages-new', label: '새 페이지 추가', icon: <FileTextIcon className="w-4 h-4" />, path: '/pages/new' }
    ]
  },
  {
    id: 'theme',
    label: '테마',
    icon: <Palette className="w-5 h-5" />,
    children: [
      { id: 'themes', label: '테마 관리', icon: <Palette className="w-4 h-4" />, path: '/themes' },
      { id: 'customize', label: '사용자 정의하기', icon: <Palette className="w-4 h-4" />, path: '/themes/customize' },
      { id: 'homepage', label: '홈페이지 편집', icon: <Layout className="w-4 h-4" />, path: '/themes/homepage' },
      { id: 'menus', label: '메뉴', icon: <MenuIcon className="w-4 h-4" />, path: '/themes/menus' }
    ]
  },
  {
    id: 'separator-2',
    label: '',
    icon: <></>,
    separator: true
  },
  {
    id: 'ecommerce',
    label: 'E-commerce',
    icon: <ShoppingCart className="w-5 h-5" />,
    children: [
      { id: 'products', label: '제품 관리', icon: <Package className="w-4 h-4" />, path: '/ecommerce/products' },
      { id: 'categories', label: '카테고리', icon: <FolderTree className="w-4 h-4" />, path: '/ecommerce/categories' },
      { id: 'inventory', label: '재고 관리', icon: <Package className="w-4 h-4" />, path: '/ecommerce/inventory' },
      { id: 'orders', label: '주문 관리', icon: <ClipboardList className="w-4 h-4" />, path: '/ecommerce/orders' },
      { id: 'order-status', label: '주문 상태', icon: <RefreshCw className="w-4 h-4" />, path: '/ecommerce/order-status' },
      { id: 'customers', label: '고객 관리', icon: <Users className="w-4 h-4" />, path: '/ecommerce/customers' },
      { id: 'coupons', label: '쿠폰', icon: <CreditCard className="w-4 h-4" />, path: '/ecommerce/coupons' },
      { id: 'refunds', label: '환불 관리', icon: <RefreshCw className="w-4 h-4" />, path: '/ecommerce/refunds' },
      { id: 'toss-payments', label: '토스페이먼츠', icon: <CreditCard className="w-4 h-4" />, path: '/ecommerce/payments/toss' },
      { id: 'settlement-dashboard', label: '정산 대시보드', icon: <BarChart3 className="w-4 h-4" />, path: '/ecommerce/settlements' },
      { id: 'vendor-settlements', label: '판매자 정산', icon: <Store className="w-4 h-4" />, path: '/ecommerce/vendor-settlements' },
      { id: 'fee-management', label: '수수료 관리', icon: <DollarSign className="w-4 h-4" />, path: '/ecommerce/fee-management' },
      { id: 'settlement-reports', label: '정산 보고서', icon: <FileCheck className="w-4 h-4" />, path: '/ecommerce/settlement-reports' },
      { id: 'reports', label: '매출 보고서', icon: <BarChart3 className="w-4 h-4" />, path: '/ecommerce/reports' },
      { id: 'ecommerce-settings', label: '설정', icon: <Cog className="w-4 h-4" />, path: '/ecommerce/settings' }
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
    label: 'Forum',
    icon: <MessageSquare className="w-5 h-5" />,
    path: '/forum'
  },
  {
    id: 'signage',
    label: 'Signage',
    icon: <Monitor className="w-5 h-5" />,
    path: '/signage'
  },
  {
    id: 'crowdfunding',
    label: 'Crowdfunding',
    icon: <DollarSign className="w-5 h-5" />,
    path: '/crowdfunding'
  },
  {
    id: 'separator-4',
    label: '',
    icon: <></>,
    separator: true
  },
  {
    id: 'mail',
    label: '메일 관리',
    icon: <Mail className="w-5 h-5" />,
    children: [
      { id: 'mail-templates', label: '이메일 템플릿', icon: <FileText className="w-4 h-4" />, path: '/mail/templates' },
      { id: 'mail-smtp', label: 'SMTP 설정', icon: <Settings className="w-4 h-4" />, path: '/mail/smtp' },
      { id: 'mail-logs', label: '발송 기록', icon: <ClipboardList className="w-4 h-4" />, path: '/mail/logs' }
    ]
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
      { id: 'users-roles', label: '역할 관리', icon: <UserCheck className="w-4 h-4" />, path: '/users/roles' }
    ]
  },
  {
    id: 'tools',
    label: '도구',
    icon: <Wrench className="w-5 h-5" />,
    path: '/tools'
  },
  {
    id: 'apps',
    label: 'Apps',
    icon: <Package className="w-5 h-5" />,
    path: '/apps'
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