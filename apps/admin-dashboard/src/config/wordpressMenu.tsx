import { ReactElement } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Image, 
  FileTextIcon,
  Users,
  Wrench,
  Settings,
  MessageSquare,
  Tag,
  Menu as MenuIcon,
  Palette,
  RefreshCw,
  Brush,
  Box,
  Plug,
  Layout,
  Archive
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
    children: [
      { id: 'dashboard-home', label: '홈', icon: <LayoutDashboard className="w-4 h-4" />, path: '/dashboard' },
      { id: 'dashboard-updates', label: '업데이트', icon: <RefreshCw className="w-4 h-4" />, path: '/dashboard/updates' }
    ]
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
      { id: 'posts-all', label: '모든 글', icon: <FileText className="w-4 h-4" />, path: '/content/posts' },
      { id: 'posts-new', label: '새 글 쓰기', icon: <FileText className="w-4 h-4" />, path: '/content/posts/new' },
      { id: 'posts-categories', label: '카테고리', icon: <Tag className="w-4 h-4" />, path: '/categories' },
      { id: 'posts-tags', label: '태그', icon: <Tag className="w-4 h-4" />, path: '/categories?type=tags' }
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
      { id: 'pages-new', label: '새 페이지', icon: <FileTextIcon className="w-4 h-4" />, path: '/pages/new' }
    ]
  },
  {
    id: 'reusable-blocks',
    label: '재사용 블록',
    icon: <Archive className="w-5 h-5" />,
    children: [
      { id: 'reusable-blocks-all', label: '모든 블록', icon: <Archive className="w-4 h-4" />, path: '/reusable-blocks' },
      { id: 'reusable-blocks-new', label: '새 블록', icon: <Archive className="w-4 h-4" />, path: '/reusable-blocks/new' }
    ]
  },
  {
    id: 'comments',
    label: '댓글',
    icon: <MessageSquare className="w-5 h-5" />,
    path: '/comments'
  },
  {
    id: 'separator-2',
    label: '',
    icon: <></>,
    separator: true
  },
  {
    id: 'appearance',
    label: '외관',
    icon: <Palette className="w-5 h-5" />,
    children: [
      { id: 'themes', label: '테마', icon: <Palette className="w-4 h-4" />, path: '/appearance/themes' },
      { id: 'customize', label: '사용자 정의하기', icon: <Brush className="w-4 h-4" />, path: '/appearance/customize' },
      { id: 'widgets', label: '위젯', icon: <Box className="w-4 h-4" />, path: '/content/widgets' },
      { id: 'menus', label: '메뉴', icon: <MenuIcon className="w-4 h-4" />, path: '/menus' },
      { id: 'theme-editor', label: '테마 편집기', icon: <FileText className="w-4 h-4" />, path: '/appearance/editor' }
    ]
  },
  {
    id: 'plugins',
    label: '플러그인',
    icon: <Plug className="w-5 h-5" />,
    children: [
      { id: 'plugins-installed', label: '설치된 플러그인', icon: <Plug className="w-4 h-4" />, path: '/plugins' },
      { id: 'plugins-add', label: '새로 추가', icon: <Plug className="w-4 h-4" />, path: '/plugins/add' },
      { id: 'plugin-editor', label: '플러그인 편집기', icon: <FileText className="w-4 h-4" />, path: '/plugins/editor' }
    ]
  },
  {
    id: 'users',
    label: '사용자',
    icon: <Users className="w-5 h-5" />,
    children: [
      { id: 'users-all', label: '모든 사용자', icon: <Users className="w-4 h-4" />, path: '/users' },
      { id: 'users-new', label: '새로 추가', icon: <Users className="w-4 h-4" />, path: '/users/create' },
      { id: 'users-profile', label: '프로필', icon: <Users className="w-4 h-4" />, path: '/users/profile' }
    ]
  },
  {
    id: 'tools',
    label: '도구',
    icon: <Wrench className="w-5 h-5" />,
    children: [
      { id: 'tools-available', label: '사용 가능한 도구', icon: <Wrench className="w-4 h-4" />, path: '/tools' },
      { id: 'tools-import', label: '가져오기', icon: <Wrench className="w-4 h-4" />, path: '/tools/import' },
      { id: 'tools-export', label: '내보내기', icon: <Wrench className="w-4 h-4" />, path: '/tools/export' },
      { id: 'tools-health', label: '사이트 상태', icon: <Wrench className="w-4 h-4" />, path: '/tools/health' },
      { id: 'tools-export-personal', label: '개인정보 내보내기', icon: <Wrench className="w-4 h-4" />, path: '/tools/export-personal' },
      { id: 'tools-erase-personal', label: '개인정보 지우기', icon: <Wrench className="w-4 h-4" />, path: '/tools/erase-personal' }
    ]
  },
  {
    id: 'settings',
    label: '설정',
    icon: <Settings className="w-5 h-5" />,
    children: [
      { id: 'settings-general', label: '일반', icon: <Settings className="w-4 h-4" />, path: '/settings' },
      { id: 'settings-writing', label: '쓰기', icon: <Settings className="w-4 h-4" />, path: '/settings/writing' },
      { id: 'settings-reading', label: '읽기', icon: <Settings className="w-4 h-4" />, path: '/settings/reading' },
      { id: 'settings-discussion', label: '토론', icon: <Settings className="w-4 h-4" />, path: '/settings/discussion' },
      { id: 'settings-media', label: '미디어', icon: <Settings className="w-4 h-4" />, path: '/settings/media' },
      { id: 'settings-permalinks', label: '고유주소', icon: <Settings className="w-4 h-4" />, path: '/settings/permalinks' },
      { id: 'settings-privacy', label: '개인정보', icon: <Settings className="w-4 h-4" />, path: '/settings/privacy' }
    ]
  },
  {
    id: 'separator-3',
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