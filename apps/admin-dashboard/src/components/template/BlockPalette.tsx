import { FC } from 'react';
import { 
  Type, 
  Image, 
  Video, 
  MousePointer,
  Columns,
  Minus,
  CreditCard,
  List,
  Quote,
  Code,
  Navigation,
  ImageIcon,
  Clock,
  BarChart,
  Mail,
  Share2,
  MessageCircle,
  MapPin,
  HelpCircle
} from 'lucide-react'
import type { TemplateBlockType } from '@o4o/types'

interface BlockPaletteProps {
  onAddBlock: (type: TemplateBlockType) => void
}

interface BlockDefinition {
  type: TemplateBlockType
  name: string
  icon: ReactNode
  category: string
  description: string
}

const blockDefinitions: BlockDefinition[] = [
  // Basic Blocks
  {
    type: 'hero',
    name: 'Hero Section',
    icon: <ImageIcon className="w-5 h-5" />,
    category: 'Basic',
    description: '대형 배너와 CTA 버튼이 있는 히어로 섹션'
  },
  {
    type: 'heading',
    name: 'Heading',
    icon: <Type className="w-5 h-5" />,
    category: 'Basic',
    description: '제목 텍스트 (H1-H6)'
  },
  {
    type: 'paragraph',
    name: 'Paragraph',
    icon: <Type className="w-5 h-5" />,
    category: 'Basic',
    description: '일반 텍스트 단락'
  },
  {
    type: 'button',
    name: 'Button',
    icon: <MousePointer className="w-5 h-5" />,
    category: 'Basic',
    description: '클릭 가능한 버튼'
  },
  {
    type: 'spacer',
    name: 'Spacer',
    icon: <Minus className="w-5 h-5" />,
    category: 'Basic',
    description: '공백 영역'
  },
  {
    type: 'divider',
    name: 'Divider',
    icon: <Minus className="w-5 h-5" />,
    category: 'Basic',
    description: '구분선'
  },

  // Media Blocks
  {
    type: 'image',
    name: 'Image',
    icon: <Image className="w-5 h-5" />,
    category: 'Media',
    description: '단일 이미지'
  },
  {
    type: 'video',
    name: 'Video',
    icon: <Video className="w-5 h-5" />,
    category: 'Media',
    description: '비디오 플레이어'
  },
  {
    type: 'gallery',
    name: 'Gallery',
    icon: <ImageIcon className="w-5 h-5" />,
    category: 'Media',
    description: '이미지 갤러리'
  },
  {
    type: 'carousel',
    name: 'Carousel',
    icon: <Navigation className="w-5 h-5" />,
    category: 'Media',
    description: '이미지 슬라이더'
  },

  // Layout Blocks
  {
    type: 'columns',
    name: 'Columns',
    icon: <Columns className="w-5 h-5" />,
    category: 'Layout',
    description: '다단 레이아웃'
  },
  {
    type: 'card',
    name: 'Card',
    icon: <CreditCard className="w-5 h-5" />,
    category: 'Layout',
    description: '카드 컨테이너'
  },

  // Content Blocks
  {
    type: 'list',
    name: 'List',
    icon: <List className="w-5 h-5" />,
    category: 'Content',
    description: '순서 있는/없는 목록'
  },
  {
    type: 'quote',
    name: 'Quote',
    icon: <Quote className="w-5 h-5" />,
    category: 'Content',
    description: '인용문'
  },
  {
    type: 'code',
    name: 'Code',
    icon: <Code className="w-5 h-5" />,
    category: 'Content',
    description: '코드 블록'
  },
  {
    type: 'testimonial',
    name: 'Testimonial',
    icon: <MessageCircle className="w-5 h-5" />,
    category: 'Content',
    description: '고객 후기'
  },
  {
    type: 'faq',
    name: 'FAQ',
    icon: <HelpCircle className="w-5 h-5" />,
    category: 'Content',
    description: '자주 묻는 질문'
  },

  // Interactive Blocks
  {
    type: 'contact-form',
    name: 'Contact Form',
    icon: <Mail className="w-5 h-5" />,
    category: 'Interactive',
    description: '연락처 폼'
  },
  {
    type: 'newsletter',
    name: 'Newsletter',
    icon: <Mail className="w-5 h-5" />,
    category: 'Interactive',
    description: '뉴스레터 구독 폼'
  },
  {
    type: 'social-media',
    name: 'Social Media',
    icon: <Share2 className="w-5 h-5" />,
    category: 'Interactive',
    description: '소셜 미디어 링크'
  },
  {
    type: 'map',
    name: 'Map',
    icon: <MapPin className="w-5 h-5" />,
    category: 'Interactive',
    description: '지도'
  },

  // Advanced Blocks
  {
    type: 'pricing-table',
    name: 'Pricing Table',
    icon: <CreditCard className="w-5 h-5" />,
    category: 'Advanced',
    description: '가격표'
  },
  {
    type: 'countdown',
    name: 'Countdown',
    icon: <Clock className="w-5 h-5" />,
    category: 'Advanced',
    description: '카운트다운 타이머'
  },
  {
    type: 'progress-bar',
    name: 'Progress Bar',
    icon: <BarChart className="w-5 h-5" />,
    category: 'Advanced',
    description: '진행률 바'
  }
]

const categories = ['Basic', 'Media', 'Layout', 'Content', 'Interactive', 'Advanced']

const BlockPalette: FC<BlockPaletteProps> = ({ onAddBlock }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Basic')

  const filteredBlocks = blockDefinitions.filter(
    block => block.category === selectedCategory
  )

  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      <div className="space-y-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              selectedCategory === category
                ? 'bg-blue-100 text-blue-900 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Block List */}
      <div className="space-y-2">
        {filteredBlocks.map((block) => (
          <div
            key={block.type}
            className="border rounded-lg p-3 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all group"
            onClick={() => onAddBlock(block.type)}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                {block.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm text-gray-900 group-hover:text-blue-900">
                  {block.name}
                </h4>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  {block.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Usage Tips */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-sm text-gray-900 mb-2">💡 사용 팁</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• 블록을 클릭하여 캔버스에 추가</li>
          <li>• 드래그하여 순서 변경</li>
          <li>• 오른쪽 패널에서 상세 설정</li>
          <li>• 복사/붙여넣기로 빠른 복제</li>
        </ul>
      </div>
    </div>
  )
}

export default BlockPalette