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
      { id: 'customize', label: '사용자 정의하기', icon: <Palette className="w-4 h-4" />, path: '/customize' },
      { id: 'menus', label: '메뉴', icon: <MenuIcon className="w-4 h-4" />, path: '/appearance/menus' },
      { id: 'template-parts', label: '템플릿 파트', icon: <Layout className="w-4 h-4" />, path: '/appearance/template-parts' }
    ]
  },
  {
    id: 'separator-2',
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
    id: 'cpt-engine',
    label: 'CPT 엔진',
    icon: <Package className="w-5 h-5" />,
    children: [
      { id: 'cpt-dashboard', label: '대시보드', icon: <LayoutDashboard className="w-4 h-4" />, path: '/cpt-engine' },
      { id: 'cpt-types', label: 'Post Types', icon: <FileCode className="w-4 h-4" />, path: '/cpt-engine?view=types' },
      { id: 'cpt-fields', label: 'Custom Fields', icon: <Layout className="w-4 h-4" />, path: '/cpt-engine?view=fields' },
      { id: 'cpt-taxonomies', label: 'Taxonomies', icon: <Tag className="w-4 h-4" />, path: '/cpt-engine?view=taxonomies' },
      { id: 'cpt-archives', label: 'Archives', icon: <FolderTree className="w-4 h-4" />, path: '/cpt-engine?view=archives' },
      { id: 'cpt-templates', label: 'Content Templates', icon: <FileCode className="w-4 h-4" />, path: '/cpt-engine?view=templates' },
      { id: 'cpt-forms', label: 'Forms', icon: <FileText className="w-4 h-4" />, path: '/cpt-engine/forms' }
    ]
  },
  {
    id: 'dropshipping',
    label: '드롭쉬핑',
    icon: <ShoppingCart className="w-5 h-5" />,
    children: [
      { id: 'ds-products', label: '상품 관리', icon: <Package className="w-4 h-4" />, path: '/dropshipping/products' },
      { id: 'ds-suppliers', label: '공급자', icon: <Store className="w-4 h-4" />, path: '/dropshipping/suppliers' },
      { id: 'ds-sellers', label: '판매자', icon: <UserCheck className="w-4 h-4" />, path: '/dropshipping/sellers' },
      { id: 'ds-partners', label: '파트너', icon: <Users className="w-4 h-4" />, path: '/dropshipping/partners' },
      { id: 'ds-approvals', label: '승인 관리', icon: <FileCheck className="w-4 h-4" />, path: '/dropshipping/approvals' },
      { id: 'ds-commissions', label: '수수료 정책', icon: <DollarSign className="w-4 h-4" />, path: '/dropshipping/commissions' },
      { id: 'ds-setup', label: '시스템 설정', icon: <Settings className="w-4 h-4" />, path: '/dropshipping/setup' }
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
      { id: 'tools-import', label: '가져오기', icon: <FileText className="w-4 h-4" />, path: '/tools/import' },
      { id: 'tools-export', label: '내보내기', icon: <FileText className="w-4 h-4" />, path: '/tools/export' }
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