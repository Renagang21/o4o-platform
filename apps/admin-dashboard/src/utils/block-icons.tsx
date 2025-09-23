/**
 * Block Icon Mapping System
 * Maps WordPress block names to lucide-react icons
 */
import React from 'react';
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  Image,
  List,
  ListOrdered,
  Quote,
  Code,
  FileText,
  Video,
  Music,
  Columns,
  Square,
  Box,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link,
  Table,
  Calendar,
  Tag,
  Hash,
  Search,
  Archive,
  Users,
  MessageSquare,
  ChevronRight,
  Layout,
  Grid3x3,
  Layers,
  PanelLeft,
  PanelRight,
  PanelTop,
  PanelBottom,
  Sparkles,
  FileImage,
  Play,
  Pause,
  Download,
  Upload,
  Share2,
  Heart,
  Star,
  Bookmark,
  Clock,
  MapPin,
  Mail,
  Phone,
  Globe,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Github,
  Linkedin,
  Menu,
  MoreHorizontal,
  Plus,
  Minus,
  X,
  Check,
  AlertCircle,
  Info,
  HelpCircle,
  Settings,
  Edit,
  Copy,
  Trash,
  Move,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  User,
  UserPlus,
  LogIn,
  LogOut,
  Home,
  File,
  Folder,
  FolderOpen,
  Palette,
  Brush,
  PaintBucket,
  Zap,
  TrendingUp,
  BarChart,
  PieChart,
  Activity,
  Map,
  Navigation,
  Compass,
  Flag,
  Target,
  Award,
  Trophy,
  Gift,
  ShoppingCart,
  ShoppingBag,
  Package,
  Truck,
  DollarSign,
  CreditCard,
  Wallet,
  Receipt,
  Calculator,
  Briefcase,
  Building,
  Cpu,
  Database,
  Server,
  Wifi,
  Cloud,
  CloudUpload,
  CloudDownload,
  Shield,
  ShieldCheck,
  Key,
  Fingerprint,
  Camera,
  Aperture,
  Mic,
  Volume,
  Volume2,
  VolumeX,
  Headphones,
  Speaker,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Watch,
  Printer,
  Keyboard,
  Mouse,
  HardDrive,
  Save,
  RefreshCw,
  RotateCw,
  Repeat,
  Shuffle,
  SkipForward,
  SkipBack,
  FastForward,
  Rewind,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUp,
  ChevronsDown,
  CornerUpLeft,
  CornerUpRight,
  CornerDownLeft,
  CornerDownRight,
  MoveUp,
  MoveDown,
  MoveLeft,
  MoveRight,
  Maximize,
  Minimize,
  Maximize2,
  Minimize2,
  Expand,
  Shrink,
  ZoomIn,
  ZoomOut,
  Command,
  Option,
  Shift,
  Delete,
  Terminal,
  Code2,
  FileCode,
  FolderCode,
  GitBranch,
  GitCommit,
  GitMerge,
  GitPullRequest,
  Binary,
  Braces,
  Brackets,
  FileJson,
  FileX,
  FilePlus,
  FileMinus,
  FileCheck,
  TextSelect
} from 'lucide-react';

// Icon mapping for WordPress core blocks and common blocks
const BLOCK_ICONS: Record<string, React.ElementType> = {
  // Text blocks
  'core/paragraph': Type,
  'core/heading': Heading1,
  'core/list': List,
  'core/list-item': ChevronRight,
  'core/quote': Quote,
  'core/code': Code,
  'core/preformatted': FileText,
  'core/pullquote': Quote,
  'core/verse': FileText,
  'core/freeform': FileText,
  'core/html': Code2,
  'core/more': MoreHorizontal,
  
  // Media blocks
  'core/image': Image,
  'core/gallery': Grid3x3,
  'core/audio': Music,
  'core/video': Video,
  'core/file': File,
  'core/media-text': PanelLeft,
  'core/cover': FileImage,
  
  // Layout blocks
  'core/columns': Columns,
  'core/column': Square,
  'core/group': Box,
  'core/row': PanelLeft,
  'core/stack': Layers,
  'core/spacer': MoveDown,
  'core/separator': Minus,
  'core/page-break': ChevronsDown,
  
  // Widget blocks
  'core/shortcode': Brackets,
  'core/archives': Archive,
  'core/calendar': Calendar,
  'core/categories': Folder,
  'core/latest-comments': MessageSquare,
  'core/latest-posts': FileText,
  'core/rss': Wifi,
  'core/search': Search,
  'core/social-links': Share2,
  'core/social-link': Link,
  'core/tag-cloud': Tag,
  'core/page-list': List,
  'core/site-logo': Home,
  'core/site-title': Heading1,
  'core/site-tagline': Type,
  'core/query-title': Heading1,
  'core/post-title': Heading1,
  'core/post-excerpt': FileText,
  'core/post-featured-image': Image,
  'core/post-content': FileText,
  'core/post-author': User,
  'core/post-date': Calendar,
  'core/post-terms': Tag,
  'core/post-navigation-link': ChevronRight,
  'core/post-template': Layout,
  'core/query': Database,
  'core/query-pagination': ChevronsRight,
  'core/query-pagination-next': ChevronRight,
  'core/query-pagination-previous': ChevronLeft,
  'core/query-pagination-numbers': Hash,
  'core/query-no-results': AlertCircle,
  'core/loginout': LogIn,
  'core/term-description': FileText,
  'core/avatar': User,
  'core/post-comments-form': MessageSquare,
  'core/comment-template': MessageSquare,
  'core/comment-content': MessageSquare,
  'core/comment-author-name': User,
  'core/comment-date': Calendar,
  'core/comment-edit-link': Edit,
  'core/comment-reply-link': CornerUpLeft,
  'core/comments-title': MessageSquare,
  'core/comments': MessageSquare,
  'core/comments-pagination': ChevronsRight,
  'core/comments-pagination-next': ChevronRight,
  'core/comments-pagination-previous': ChevronLeft,
  'core/comments-pagination-numbers': Hash,
  'core/navigation': Menu,
  'core/navigation-link': Link,
  'core/navigation-submenu': ChevronDown,
  'core/home-link': Home,
  'core/read-more': ChevronRight,
  
  // Embed blocks
  'core/embed': Globe,
  'core-embed/twitter': Twitter,
  'core-embed/youtube': Youtube,
  'core-embed/facebook': Facebook,
  'core-embed/instagram': Instagram,
  
  // Theme blocks
  'core/template-part': Layout,
  'core/post-author-name': User,
  'core/post-author-biography': FileText,
  'core/footnotes': Hash,
  
  // Design blocks
  'core/button': Square,
  'core/buttons': Square,
  'core/table': Table,
  'core/table-of-contents': List,
  'core/details': ChevronDown,
  
  // Default fallback
  'default': Plus
};

// Get icon for a block
export function getBlockIcon(blockName: string): React.ElementType {
  // Direct match
  if (BLOCK_ICONS[blockName]) {
    return BLOCK_ICONS[blockName];
  }
  
  // Try to match by suffix (e.g., any/heading -> Heading1)
  const suffix = blockName.split('/').pop();
  if (suffix) {
    // Check common patterns
    if (suffix.includes('heading')) return Heading1;
    if (suffix.includes('paragraph')) return Type;
    if (suffix.includes('text')) return FileText;
    if (suffix.includes('image')) return Image;
    if (suffix.includes('video')) return Video;
    if (suffix.includes('audio')) return Music;
    if (suffix.includes('list')) return List;
    if (suffix.includes('quote')) return Quote;
    if (suffix.includes('code')) return Code;
    if (suffix.includes('table')) return Table;
    if (suffix.includes('column')) return Columns;
    if (suffix.includes('button')) return Square;
    if (suffix.includes('link')) return Link;
    if (suffix.includes('embed')) return Globe;
    if (suffix.includes('gallery')) return Grid3x3;
    if (suffix.includes('spacer')) return MoveDown;
    if (suffix.includes('separator')) return Minus;
    if (suffix.includes('menu')) return Menu;
    if (suffix.includes('search')) return Search;
    if (suffix.includes('social')) return Share2;
    if (suffix.includes('comment')) return MessageSquare;
    if (suffix.includes('archive')) return Archive;
    if (suffix.includes('category')) return Folder;
    if (suffix.includes('tag')) return Tag;
    if (suffix.includes('user') || suffix.includes('author')) return User;
    if (suffix.includes('date') || suffix.includes('time')) return Calendar;
    if (suffix.includes('navigation')) return Menu;
    if (suffix.includes('template')) return Layout;
    if (suffix.includes('query')) return Database;
    if (suffix.includes('group')) return Box;
    if (suffix.includes('block')) return Square;
  }
  
  // Default icon
  return BLOCK_ICONS['default'];
}

// Get icon color based on category
export function getBlockIconColor(category: string): string {
  const colors: Record<string, string> = {
    'text': 'text-blue-600',
    'media': 'text-purple-600',
    'design': 'text-pink-600',
    'widgets': 'text-green-600',
    'theme': 'text-orange-600',
    'embed': 'text-indigo-600',
    'common': 'text-gray-600',
    'formatting': 'text-teal-600',
    'layout': 'text-cyan-600',
    'reusable': 'text-yellow-600'
  };
  
  return colors[category] || 'text-gray-600';
}

// Render block icon with proper styling
export function renderBlockIcon(
  blockName: string, 
  category?: string,
  className?: string,
  size?: 'sm' | 'md' | 'lg'
): React.ReactElement {
  const Icon = getBlockIcon(blockName);
  const colorClass = category ? getBlockIconColor(category) : 'text-gray-600';
  
  const sizeClasses = {
    'sm': 'h-4 w-4',
    'md': 'h-6 w-6',
    'lg': 'h-8 w-8'
  };
  
  const sizeClass = sizeClasses[size || 'md'];
  
  return (
    <Icon className={`${sizeClass} ${colorClass} ${className || ''}`} />
  );
}