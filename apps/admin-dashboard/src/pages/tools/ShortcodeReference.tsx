import { useState, FC } from 'react';
import { 
  Copy, Check, Search, Package, Grid, ShoppingBag, 
  Zap, List, Tag, FileText, Eye, Video, Layout,
  Image, Code, Hash, Calendar, User, MessageSquare,
  ChevronDown, ChevronRight
} from 'lucide-react';

interface ShortcodeParameter {
  name: string;
  type: string;
  default?: string;
  description: string;
  required?: boolean;
  options?: string[];
}

interface ShortcodeExample {
  code: string;
  description: string;
}

interface ShortcodeInfo {
  name: string;
  category: 'ecommerce' | 'forms' | 'media' | 'content' | 'layout' | 'social';
  icon: React.ElementType;
  description: string;
  usage: string;
  parameters: ShortcodeParameter[];
  examples: ShortcodeExample[];
}

// 모든 Shortcode 정의
const allShortcodes: ShortcodeInfo[] = [
  // E-commerce Shortcodes
  {
    name: 'product',
    category: 'ecommerce',
    icon: Package,
    description: '단일 상품을 표시합니다',
    usage: '상품 상세 정보를 페이지에 삽입할 때 사용',
    parameters: [
      { name: 'id', type: 'string', description: '상품 ID 또는 슬러그', required: true },
      { name: 'show_price', type: 'boolean', default: 'true', description: '가격 표시 여부' },
      { name: 'show_cart', type: 'boolean', default: 'true', description: '장바구니 버튼 표시 여부' },
      { name: 'show_description', type: 'boolean', default: 'false', description: '상품 설명 표시 여부' },
      { name: 'class', type: 'string', description: '추가 CSS 클래스' }
    ],
    examples: [
      { code: '[product id="123"]', description: '기본 상품 표시' },
      { code: '[product id="awesome-product" show_cart="false"]', description: '장바구니 버튼 없이 표시' },
      { code: '[product id="123" show_description="true" class="featured"]', description: '설명과 함께 표시' }
    ]
  },
  {
    name: 'product_grid',
    category: 'ecommerce',
    icon: Grid,
    description: '상품을 그리드 형태로 표시합니다',
    usage: '카테고리 페이지나 상품 목록 페이지에서 사용',
    parameters: [
      { name: 'category', type: 'string', description: '카테고리 ID 또는 슬러그' },
      { name: 'limit', type: 'number', default: '12', description: '표시할 상품 수' },
      { name: 'columns', type: 'number', default: '4', description: '그리드 열 수 (1-6)' },
      { name: 'featured', type: 'boolean', default: 'false', description: '추천 상품만 표시' },
      { name: 'on_sale', type: 'boolean', default: 'false', description: '할인 상품만 표시' },
      { name: 'orderby', type: 'string', default: 'created_at', description: '정렬 기준', options: ['price', 'name', 'created_at', 'popularity'] },
      { name: 'order', type: 'string', default: 'desc', description: '정렬 순서', options: ['asc', 'desc'] },
      { name: 'show_pagination', type: 'boolean', default: 'false', description: '페이지네이션 표시' }
    ],
    examples: [
      { code: '[product_grid category="electronics" limit="8"]', description: '전자제품 8개 표시' },
      { code: '[product_grid featured="true" columns="3"]', description: '추천 상품 3열로 표시' },
      { code: '[product_grid on_sale="true" orderby="price" order="asc"]', description: '할인 상품을 가격 낮은 순으로' }
    ]
  },
  {
    name: 'add_to_cart',
    category: 'ecommerce',
    icon: ShoppingBag,
    description: '장바구니 추가 버튼을 표시합니다',
    usage: '블로그 포스트나 페이지 내에서 구매 버튼을 삽입할 때',
    parameters: [
      { name: 'id', type: 'string', description: '상품 ID', required: true },
      { name: 'text', type: 'string', default: '장바구니에 담기', description: '버튼 텍스트' },
      { name: 'show_price', type: 'boolean', default: 'true', description: '가격 표시 여부' },
      { name: 'quantity', type: 'number', default: '1', description: '기본 수량' },
      { name: 'style', type: 'string', default: 'primary', description: '버튼 스타일', options: ['primary', 'secondary', 'outline'] },
      { name: 'size', type: 'string', default: 'medium', description: '버튼 크기', options: ['small', 'medium', 'large'] },
      { name: 'class', type: 'string', description: '추가 CSS 클래스' }
    ],
    examples: [
      { code: '[add_to_cart id="123"]', description: '기본 장바구니 버튼' },
      { code: '[add_to_cart id="123" text="구매하기" style="secondary"]', description: '커스텀 텍스트와 스타일' },
      { code: '[add_to_cart id="123" quantity="2" size="large"]', description: '수량 2개, 큰 버튼' }
    ]
  },
  {
    name: 'product_carousel',
    category: 'ecommerce',
    icon: Zap,
    description: '상품 캐러셀(슬라이더)을 표시합니다',
    usage: '홈페이지나 랜딩 페이지에서 상품을 돋보이게 할 때',
    parameters: [
      { name: 'category', type: 'string', description: '카테고리 ID 또는 슬러그' },
      { name: 'limit', type: 'number', default: '10', description: '표시할 상품 수' },
      { name: 'autoplay', type: 'boolean', default: 'true', description: '자동 재생 여부' },
      { name: 'speed', type: 'number', default: '3000', description: '자동 재생 속도(ms)' },
      { name: 'title', type: 'string', description: '캐러셀 제목' },
      { name: 'show_dots', type: 'boolean', default: 'true', description: '네비게이션 점 표시' },
      { name: 'show_arrows', type: 'boolean', default: 'true', description: '좌우 화살표 표시' }
    ],
    examples: [
      { code: '[product_carousel category="new-arrivals"]', description: '신상품 캐러셀' },
      { code: '[product_carousel title="베스트셀러" limit="15" speed="5000"]', description: '베스트셀러 15개, 5초 간격' },
      { code: '[product_carousel category="sale" autoplay="false" show_dots="false"]', description: '수동 슬라이드, 점 숨김' }
    ]
  },
  {
    name: 'featured_products',
    category: 'ecommerce',
    icon: List,
    description: '추천 상품 목록을 표시합니다',
    usage: '메인 페이지나 사이드바에서 추천 상품 노출',
    parameters: [
      { name: 'limit', type: 'number', default: '4', description: '표시할 상품 수' },
      { name: 'columns', type: 'number', default: '4', description: '그리드 열 수' },
      { name: 'title', type: 'string', default: '추천 상품', description: '섹션 제목' },
      { name: 'show_rating', type: 'boolean', default: 'true', description: '평점 표시 여부' },
      { name: 'show_badge', type: 'boolean', default: 'true', description: '뱃지(NEW, SALE 등) 표시' }
    ],
    examples: [
      { code: '[featured_products]', description: '기본 추천 상품 4개' },
      { code: '[featured_products limit="6" columns="3"]', description: '3열로 6개 표시' },
      { code: '[featured_products title="이달의 추천" show_rating="false"]', description: '평점 없이 표시' }
    ]
  },
  {
    name: 'product_categories',
    category: 'ecommerce',
    icon: Tag,
    description: '상품 카테고리 목록을 표시합니다',
    usage: '카테고리 네비게이션이나 카테고리 쇼케이스용',
    parameters: [
      { name: 'show_count', type: 'boolean', default: 'true', description: '상품 수 표시 여부' },
      { name: 'hide_empty', type: 'boolean', default: 'true', description: '빈 카테고리 숨김' },
      { name: 'columns', type: 'number', default: '3', description: '그리드 열 수' },
      { name: 'parent', type: 'string', description: '특정 부모 카테고리의 하위만 표시' },
      { name: 'show_image', type: 'boolean', default: 'true', description: '카테고리 이미지 표시' }
    ],
    examples: [
      { code: '[product_categories]', description: '기본 카테고리 목록' },
      { code: '[product_categories show_count="false" columns="4"]', description: '4열로 상품 수 없이' },
      { code: '[product_categories parent="fashion" hide_empty="false"]', description: '패션 하위 카테고리 모두' }
    ]
  },
  
  // Form Shortcodes
  {
    name: 'form',
    category: 'forms',
    icon: FileText,
    description: '폼을 표시합니다',
    usage: '문의, 신청, 설문 등 각종 폼을 페이지에 삽입',
    parameters: [
      { name: 'id', type: 'string', description: '폼 ID', required: true },
      { name: 'name', type: 'string', description: '폼 이름 (ID 대신 사용 가능)' },
      { name: 'show_title', type: 'boolean', default: 'true', description: '폼 제목 표시' },
      { name: 'show_description', type: 'boolean', default: 'true', description: '폼 설명 표시' },
      { name: 'theme', type: 'string', default: 'default', description: '폼 테마', options: ['default', 'minimal', 'modern', 'classic'] },
      { name: 'layout', type: 'string', default: 'vertical', description: '폼 레이아웃', options: ['vertical', 'horizontal', 'inline'] },
      { name: 'ajax', type: 'boolean', default: 'true', description: 'AJAX 제출 사용' }
    ],
    examples: [
      { code: '[form id="contact-form"]', description: '기본 문의 폼' },
      { code: '[form name="newsletter" layout="inline"]', description: '인라인 뉴스레터 폼' },
      { code: '[form id="survey" theme="modern" show_description="false"]', description: '모던 테마 설문 폼' }
    ]
  },
  {
    name: 'view',
    category: 'forms',
    icon: Eye,
    description: '데이터 뷰(목록/테이블)를 표시합니다',
    usage: '제출된 폼 데이터나 사용자 생성 콘텐츠를 표시',
    parameters: [
      { name: 'id', type: 'string', description: '뷰 ID', required: true },
      { name: 'name', type: 'string', description: '뷰 이름 (ID 대신 사용 가능)' },
      { name: 'show_title', type: 'boolean', default: 'true', description: '뷰 제목 표시' },
      { name: 'items_per_page', type: 'number', default: '25', description: '페이지당 항목 수' },
      { name: 'enable_search', type: 'boolean', default: 'true', description: '검색 기능 활성화' },
      { name: 'enable_filters', type: 'boolean', default: 'true', description: '필터 기능 활성화' },
      { name: 'enable_export', type: 'boolean', default: 'false', description: '내보내기 기능 활성화' },
      { name: 'layout', type: 'string', default: 'table', description: '표시 레이아웃', options: ['table', 'grid', 'list'] }
    ],
    examples: [
      { code: '[view id="submissions"]', description: '기본 제출 목록' },
      { code: '[view name="gallery" layout="grid" items_per_page="12"]', description: '그리드 갤러리 뷰' },
      { code: '[view id="reports" enable_export="true" enable_search="false"]', description: '내보내기 가능한 리포트' }
    ]
  },
  
  // Media Shortcodes
  {
    name: 'video',
    category: 'media',
    icon: Video,
    description: '비디오를 삽입합니다',
    usage: 'YouTube, Vimeo 등 비디오를 임베드하거나 직접 업로드한 비디오 재생',
    parameters: [
      { name: 'url', type: 'string', description: '비디오 URL', required: true },
      { name: 'width', type: 'string', default: '100%', description: '비디오 너비' },
      { name: 'height', type: 'string', default: 'auto', description: '비디오 높이' },
      { name: 'autoplay', type: 'boolean', default: 'false', description: '자동 재생' },
      { name: 'loop', type: 'boolean', default: 'false', description: '반복 재생' },
      { name: 'controls', type: 'boolean', default: 'true', description: '컨트롤 표시' },
      { name: 'muted', type: 'boolean', default: 'false', description: '음소거' },
      { name: 'poster', type: 'string', description: '썸네일 이미지 URL' }
    ],
    examples: [
      { code: '[video url="https://youtube.com/watch?v=xxx"]', description: 'YouTube 비디오' },
      { code: '[video url="/uploads/demo.mp4" autoplay="true" muted="true"]', description: '자동재생 로컬 비디오' },
      { code: '[video url="https://vimeo.com/xxx" width="720" height="405"]', description: 'Vimeo 비디오 크기 지정' }
    ]
  },
  {
    name: 'gallery',
    category: 'media',
    icon: Image,
    description: '이미지 갤러리를 표시합니다',
    usage: '여러 이미지를 그리드나 슬라이더 형태로 표시',
    parameters: [
      { name: 'ids', type: 'string', description: '이미지 ID들 (쉼표로 구분)', required: true },
      { name: 'columns', type: 'number', default: '3', description: '갤러리 열 수' },
      { name: 'size', type: 'string', default: 'medium', description: '이미지 크기', options: ['thumbnail', 'medium', 'large', 'full'] },
      { name: 'link', type: 'string', default: 'file', description: '클릭시 연결', options: ['file', 'none', 'attachment'] },
      { name: 'orderby', type: 'string', default: 'menu_order', description: '정렬 기준' }
    ],
    examples: [
      { code: '[gallery ids="1,2,3,4,5"]', description: '기본 갤러리' },
      { code: '[gallery ids="1,2,3" columns="1" size="large"]', description: '큰 이미지 1열 갤러리' },
      { code: '[gallery ids="10,11,12,13" link="none"]', description: '클릭 불가능한 갤러리' }
    ]
  },
  
  // Content Shortcodes
  {
    name: 'recent_posts',
    category: 'content',
    icon: FileText,
    description: '최근 게시물 목록을 표시합니다',
    usage: '블로그 최신글이나 공지사항을 표시',
    parameters: [
      { name: 'limit', type: 'number', default: '5', description: '표시할 게시물 수' },
      { name: 'category', type: 'string', description: '특정 카테고리만 표시' },
      { name: 'show_date', type: 'boolean', default: 'true', description: '날짜 표시' },
      { name: 'show_excerpt', type: 'boolean', default: 'false', description: '요약 표시' },
      { name: 'show_thumbnail', type: 'boolean', default: 'true', description: '썸네일 표시' },
      { name: 'orderby', type: 'string', default: 'date', description: '정렬 기준' }
    ],
    examples: [
      { code: '[recent_posts]', description: '최근 게시물 5개' },
      { code: '[recent_posts limit="10" category="news"]', description: '뉴스 카테고리 10개' },
      { code: '[recent_posts show_excerpt="true" show_thumbnail="false"]', description: '요약과 함께, 썸네일 없이' }
    ]
  },
  {
    name: 'author',
    category: 'content',
    icon: User,
    description: '작성자 정보를 표시합니다',
    usage: '게시물 작성자의 프로필이나 정보 표시',
    parameters: [
      { name: 'id', type: 'string', description: '작성자 ID (미지정시 현재 게시물 작성자)' },
      { name: 'show_avatar', type: 'boolean', default: 'true', description: '아바타 표시' },
      { name: 'show_bio', type: 'boolean', default: 'true', description: '자기소개 표시' },
      { name: 'show_posts', type: 'boolean', default: 'false', description: '작성한 글 목록 표시' },
      { name: 'avatar_size', type: 'number', default: '96', description: '아바타 크기(px)' }
    ],
    examples: [
      { code: '[author]', description: '현재 글 작성자 정보' },
      { code: '[author id="john-doe" show_posts="true"]', description: '특정 작성자와 글 목록' },
      { code: '[author show_avatar="false" show_bio="false"]', description: '이름만 표시' }
    ]
  },
  
  // Layout Shortcodes
  {
    name: 'row',
    category: 'layout',
    icon: Layout,
    description: '행(row) 레이아웃을 생성합니다',
    usage: '컬럼 레이아웃의 컨테이너로 사용',
    parameters: [
      { name: 'class', type: 'string', description: '추가 CSS 클래스' },
      { name: 'style', type: 'string', description: '인라인 스타일' },
      { name: 'gap', type: 'string', default: '20px', description: '컬럼 간격' }
    ],
    examples: [
      { code: '[row][column]내용[/column][/row]', description: '기본 행' },
      { code: '[row gap="40px" class="my-row"]컨텐츠[/row]', description: '간격 조정된 행' }
    ]
  },
  {
    name: 'column',
    category: 'layout',
    icon: Layout,
    description: '열(column) 레이아웃을 생성합니다',
    usage: '행 안에서 컬럼을 생성하여 다단 레이아웃 구성',
    parameters: [
      { name: 'width', type: 'string', default: 'auto', description: '컬럼 너비 (1/2, 1/3, 2/3, 1/4 등)' },
      { name: 'class', type: 'string', description: '추가 CSS 클래스' },
      { name: 'style', type: 'string', description: '인라인 스타일' }
    ],
    examples: [
      { code: '[column width="1/2"]반폭 컨텐츠[/column]', description: '반폭 컬럼' },
      { code: '[column width="1/3" class="highlight"]1/3 컨텐츠[/column]', description: '1/3 너비 강조 컬럼' }
    ]
  },
  
  // Social Shortcodes
  {
    name: 'social_share',
    category: 'social',
    icon: MessageSquare,
    description: '소셜 공유 버튼을 표시합니다',
    usage: '현재 페이지나 특정 URL을 소셜 미디어에 공유',
    parameters: [
      { name: 'networks', type: 'string', default: 'facebook,twitter,linkedin', description: '표시할 소셜 네트워크' },
      { name: 'url', type: 'string', description: '공유할 URL (미지정시 현재 페이지)' },
      { name: 'title', type: 'string', description: '공유 제목' },
      { name: 'style', type: 'string', default: 'buttons', description: '표시 스타일', options: ['buttons', 'icons', 'text'] },
      { name: 'color', type: 'boolean', default: 'true', description: '브랜드 컬러 사용' }
    ],
    examples: [
      { code: '[social_share]', description: '기본 공유 버튼' },
      { code: '[social_share networks="facebook,instagram,kakao"]', description: '특정 네트워크만' },
      { code: '[social_share style="icons" color="false"]', description: '흑백 아이콘만' }
    ]
  },
  {
    name: 'instagram_feed',
    category: 'social',
    icon: Hash,
    description: '인스타그램 피드를 표시합니다',
    usage: '인스타그램 게시물을 웹사이트에 표시',
    parameters: [
      { name: 'username', type: 'string', description: '인스타그램 사용자명', required: true },
      { name: 'limit', type: 'number', default: '6', description: '표시할 게시물 수' },
      { name: 'columns', type: 'number', default: '3', description: '그리드 열 수' },
      { name: 'show_caption', type: 'boolean', default: 'false', description: '캡션 표시' },
      { name: 'show_likes', type: 'boolean', default: 'true', description: '좋아요 수 표시' }
    ],
    examples: [
      { code: '[instagram_feed username="myshop"]', description: '기본 인스타그램 피드' },
      { code: '[instagram_feed username="myshop" limit="9" columns="3"]', description: '3x3 그리드' },
      { code: '[instagram_feed username="myshop" show_caption="true"]', description: '캡션과 함께' }
    ]
  }
];

const ShortcodeReferencePage: FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedShortcode, setExpandedShortcode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // 카테고리 정의
  const categories = [
    { id: 'all', name: '전체', icon: Code },
    { id: 'ecommerce', name: 'E-commerce', icon: ShoppingBag },
    { id: 'forms', name: 'Forms', icon: FileText },
    { id: 'media', name: 'Media', icon: Image },
    { id: 'content', name: 'Content', icon: FileText },
    { id: 'layout', name: 'Layout', icon: Layout },
    { id: 'social', name: 'Social', icon: MessageSquare }
  ];

  // 필터링된 shortcodes
  const filteredShortcodes = allShortcodes.filter(shortcode => {
    const matchesSearch = searchTerm === '' || 
      shortcode.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shortcode.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shortcode.usage.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || shortcode.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const toggleExpand = (name: string) => {
    setExpandedShortcode(expandedShortcode === name ? null : name);
  };

  // 카테고리별 shortcode 수 계산
  const getCategoryCount = (categoryId: string) => {
    if (categoryId === 'all') return allShortcodes.length;
    return allShortcodes.filter(s => s.category === categoryId).length;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Code className="w-8 h-8 mr-3 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Shortcode Reference</h1>
          </div>
          <p className="text-gray-600 text-lg">
            페이지와 게시물에서 사용할 수 있는 모든 shortcode 목록입니다. 
            각 shortcode를 클릭하면 상세 정보와 사용 예시를 확인할 수 있습니다.
          </p>
        </div>

        {/* 검색 및 필터 */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* 검색창 */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Shortcode 검색... (이름, 설명, 용도)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* 카테고리 필터 */}
            <div className="flex flex-wrap gap-2">
              {categories.map(category => {
                const Icon = category.icon;
                const count = getCategoryCount(category.id);
                const isActive = selectedCategory === category.id;
                
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    <span>{category.name}</span>
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-blue-700' : 'bg-gray-300'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-2xl font-bold text-blue-600">{filteredShortcodes.length}</div>
            <div className="text-sm text-gray-600">검색된 Shortcode</div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-2xl font-bold text-green-600">{categories.length - 1}</div>
            <div className="text-sm text-gray-600">카테고리</div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-2xl font-bold text-purple-600">
              {filteredShortcodes.reduce((acc, s) => acc + s.examples.length, 0)}
            </div>
            <div className="text-sm text-gray-600">예제 코드</div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-2xl font-bold text-orange-600">
              {filteredShortcodes.reduce((acc, s) => acc + s.parameters.length, 0)}
            </div>
            <div className="text-sm text-gray-600">파라미터</div>
          </div>
        </div>

        {/* Shortcode 목록 */}
        <div className="space-y-4">
          {filteredShortcodes.length === 0 ? (
            <div className="bg-white rounded-lg p-12 text-center">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">검색 결과가 없습니다</h3>
              <p className="text-gray-600">다른 검색어나 카테고리를 선택해보세요.</p>
            </div>
          ) : (
            filteredShortcodes.map((shortcode) => {
              const Icon = shortcode.icon;
              const isExpanded = expandedShortcode === shortcode.name;
              const categoryInfo = categories.find(c => c.id === shortcode.category);

              return (
                <div key={shortcode.name} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  <button
                    onClick={() => toggleExpand(shortcode.name)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <Icon className="w-6 h-6 text-gray-500 mr-4" />
                      <div className="text-left">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-mono font-semibold text-lg text-gray-900">
                            [{shortcode.name}]
                          </h3>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            {categoryInfo?.name}
                          </span>
                        </div>
                        <p className="text-gray-600">{shortcode.description}</p>
                        <p className="text-sm text-gray-500 mt-1">{shortcode.usage}</p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-6 py-6 border-t bg-gray-50">
                      {/* 파라미터 */}
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <Hash className="w-4 h-4 mr-2" />
                          파라미터
                        </h4>
                        <div className="bg-white rounded-lg p-4 space-y-3">
                          {shortcode.parameters.map((param) => (
                            <div key={param.name} className="border-b last:border-0 pb-3 last:pb-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm font-mono">
                                    {param.name}
                                  </code>
                                  <span className="ml-2 text-xs text-gray-500">
                                    ({param.type})
                                    {param.required && <span className="text-red-500 ml-1">*필수</span>}
                                  </span>
                                  {param.default && (
                                    <span className="ml-2 text-xs text-gray-500">
                                      기본값: <code className="bg-gray-100 px-1 rounded">{param.default}</code>
                                    </span>
                                  )}
                                  <p className="text-sm text-gray-600 mt-1">{param.description}</p>
                                  {param.options && (
                                    <div className="mt-1">
                                      <span className="text-xs text-gray-500">옵션: </span>
                                      {param.options.map((opt, idx) => (
                                        <span key={opt} className="text-xs">
                                          <code className="bg-gray-100 px-1 rounded">{opt}</code>
                                          {idx < param.options!.length - 1 && ', '}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 사용 예시 */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <Code className="w-4 h-4 mr-2" />
                          사용 예시
                        </h4>
                        <div className="space-y-3">
                          {shortcode.examples.map((example, index) => (
                            <div key={index} className="bg-white rounded-lg p-4 border">
                              <div className="flex items-start justify-between mb-2">
                                <code className="text-sm font-mono text-blue-600 bg-blue-50 px-3 py-1 rounded">
                                  {example.code}
                                </code>
                                <button
                                  onClick={() => copyToClipboard(example.code)}
                                  className="text-gray-400 hover:text-gray-600 transition-colors ml-2"
                                  title="클립보드에 복사"
                                >
                                  {copiedCode === example.code ? (
                                    <Check className="w-5 h-5 text-green-500" />
                                  ) : (
                                    <Copy className="w-5 h-5" />
                                  )}
                                </button>
                              </div>
                              <p className="text-sm text-gray-600">{example.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 도움말 */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            Shortcode 사용 안내
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">기본 사용법</h4>
              <ul className="space-y-1">
                <li>• 페이지나 게시물 편집기에서 직접 입력</li>
                <li>• 블록 에디터의 "Shortcode 블록" 사용</li>
                <li>• 위젯 영역에서도 사용 가능</li>
                <li>• PHP 코드에서: <code className="bg-blue-100 px-1">do_shortcode('[...]')</code></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">주의사항</h4>
              <ul className="space-y-1">
                <li>• 파라미터 값에 공백이 있으면 따옴표 사용</li>
                <li>• 중첩된 shortcode는 일부만 지원</li>
                <li>• 필수 파라미터는 반드시 입력</li>
                <li>• 성능을 위해 한 페이지에 너무 많이 사용 자제</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShortcodeReferencePage;