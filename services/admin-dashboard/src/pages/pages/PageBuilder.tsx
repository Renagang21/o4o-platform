import React, { useState } from 'react'
import { 
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Type,
  Layout,
  Image,
  Video,
  Table,
  Quote,
  List,
  Code,
  Minus,
  Grid3X3,
  Star,
  DollarSign,
  Mail,
  MessageSquare,
  Album,
  GripVertical
} from 'lucide-react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import TipTapBlock from './components/TipTapBlock'
import HeroSection from './components/blocks/HeroSection'
import FeatureGrid from './components/blocks/FeatureGrid'
import TwoColumn from './components/blocks/TwoColumn'
import PricingTable from './components/blocks/PricingTable'
import Testimonials from './components/blocks/Testimonials'
import ContactForm from './components/blocks/ContactForm'
import ImageGallery from './components/blocks/ImageGallery'
import VideoEmbed from './components/blocks/VideoEmbed'
import FAQ from './components/blocks/FAQ'
import toast from 'react-hot-toast'

interface Block {
  id: string
  type: string
  data: any
  settings?: {
    visible?: boolean
    cssClasses?: string
    customCSS?: string
  }
}

interface PageBuilderProps {
  blocks: Block[]
  onChange: (blocks: Block[]) => void
  template?: string
}

const PageBuilder: React.FC<PageBuilderProps> = ({
  blocks,
  onChange,
  template // eslint-disable-line @typescript-eslint/no-unused-vars
}) => {
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null)
  const [showBlockSelector, setShowBlockSelector] = useState(false)
  const [insertPosition, setInsertPosition] = useState<number>(0)
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null)

  // Block type definitions
  const blockTypes = {
    text: [
      { type: 'paragraph', label: '단락', icon: Type, description: '기본 텍스트 단락' },
      { type: 'heading', label: '제목', icon: Type, description: '제목 (H1-H6)' },
      { type: 'list', label: '목록', icon: List, description: '순서/무순서 목록' },
      { type: 'quote', label: '인용문', icon: Quote, description: '인용구 블록' },
      { type: 'code', label: '코드', icon: Code, description: '코드 블록' },
      { type: 'table', label: '표', icon: Table, description: '데이터 표' },
      { type: 'divider', label: '구분선', icon: Minus, description: '콘텐츠 구분선' }
    ],
    layout: [
      { type: 'hero-section', label: '히어로 섹션', icon: Layout, description: '대형 배너 섹션' },
      { type: 'two-column', label: '2단 레이아웃', icon: Layout, description: '좌우 2단 구성' },
      { type: 'feature-grid', label: '기능 그리드', icon: Grid3X3, description: 'NxN 기능 그리드' },
      { type: 'pricing-table', label: '가격표', icon: DollarSign, description: '상품/서비스 가격표' },
      { type: 'testimonials', label: '고객 후기', icon: Star, description: '고객 리뷰 슬라이더' },
      { type: 'contact-form', label: '문의 양식', icon: Mail, description: '연락처 폼' },
      { type: 'faq', label: '자주 묻는 질문', icon: MessageSquare, description: '접히는 FAQ' }
    ],
    media: [
      { type: 'image', label: '이미지', icon: Image, description: '단일 이미지' },
      { type: 'gallery', label: '갤러리', icon: Album, description: '이미지 갤러리' },
      { type: 'video', label: '동영상', icon: Video, description: 'YouTube/Vimeo 임베드' }
    ]
  }

  const generateBlockId = () => {
    return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  const addBlock = (type: string, position: number) => {
    const newBlock: Block = {
      id: generateBlockId(),
      type,
      data: getDefaultBlockData(type),
      settings: {
        visible: true,
        cssClasses: '',
        customCSS: ''
      }
    }

    const newBlocks = [...blocks]
    newBlocks.splice(position, 0, newBlock)
    onChange(newBlocks)
    setSelectedBlock(newBlock.id)
    setShowBlockSelector(false)
    
    toast.success(`${getBlockTypeLabel(type)} 블록이 추가되었습니다.`)
  }

  const getDefaultBlockData = (type: string) => {
    switch (type) {
      case 'paragraph':
        return { content: { type: 'doc', content: [{ type: 'paragraph' }] } }
      case 'heading':
        return { level: 2, content: { type: 'doc', content: [{ type: 'heading', attrs: { level: 2 } }] } }
      case 'list':
        return { listType: 'bullet', content: { type: 'doc', content: [{ type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }] }] } }
      case 'quote':
        return { content: { type: 'doc', content: [{ type: 'blockquote', content: [{ type: 'paragraph' }] }] } }
      case 'code':
        return { language: 'javascript', code: '// 코드를 입력하세요' }
      case 'table':
        return { rows: 3, cols: 3, headers: true, data: [] }
      case 'divider':
        return { style: 'solid', color: '#e5e7eb', thickness: 1 }
      case 'hero-section':
        return {
          title: '멋진 제목을 입력하세요',
          subtitle: '부제목을 입력하세요',
          backgroundImage: '',
          backgroundType: 'image',
          backgroundColor: '#3b82f6',
          ctaText: '시작하기',
          ctaLink: '#',
          alignment: 'center',
          height: 'large'
        }
      case 'two-column':
        return {
          leftContent: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '왼쪽 콘텐츠' }] }] },
          rightContent: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '오른쪽 콘텐츠' }] }] },
          leftWidth: 50,
          gap: 'medium',
          verticalAlign: 'top'
        }
      case 'feature-grid':
        return {
          columns: 3,
          features: [
            { title: '기능 1', description: '기능에 대한 설명', icon: 'star' },
            { title: '기능 2', description: '기능에 대한 설명', icon: 'heart' },
            { title: '기능 3', description: '기능에 대한 설명', icon: 'check' }
          ]
        }
      case 'pricing-table':
        return {
          plans: [
            {
              name: '기본',
              price: '9,900',
              period: '월',
              features: ['기능 1', '기능 2', '기능 3'],
              highlighted: false,
              ctaText: '선택하기'
            }
          ]
        }
      case 'testimonials':
        return {
          testimonials: [
            {
              content: '정말 훌륭한 서비스입니다!',
              author: '고객 이름',
              role: '직책',
              avatar: '',
              company: '회사명'
            }
          ],
          autoplay: true,
          showDots: true
        }
      case 'contact-form':
        return {
          title: '문의하기',
          description: '궁금한 점이 있으시면 언제든 연락주세요.',
          fields: [
            { type: 'text', name: 'name', label: '이름', required: true },
            { type: 'email', name: 'email', label: '이메일', required: true },
            { type: 'textarea', name: 'message', label: '메시지', required: true }
          ],
          submitText: '전송하기'
        }
      case 'faq':
        return {
          title: '자주 묻는 질문',
          items: [
            { question: '질문을 입력하세요', answer: '답변을 입력하세요' }
          ],
          allowMultiple: false
        }
      case 'image':
        return { src: '', alt: '', caption: '', alignment: 'center', size: 'large' }
      case 'gallery':
        return { images: [], columns: 3, spacing: 'medium', lightbox: true }
      case 'video':
        return { url: '', provider: 'youtube', aspectRatio: '16:9', autoplay: false }
      default:
        return {}
    }
  }

  const getBlockTypeLabel = (type: string) => {
    for (const category of Object.values(blockTypes)) {
      const blockType = category.find(bt => bt.type === type)
      if (blockType) return blockType.label
    }
    return type
  }

  const updateBlock = (blockId: string, newData: any) => {
    const newBlocks = blocks.map(block =>
      block.id === blockId
        ? { ...block, data: { ...block.data, ...newData } }
        : block
    )
    onChange(newBlocks)
  }

  const updateBlockSettings = (blockId: string, newSettings: any) => {
    const newBlocks = blocks.map(block =>
      block.id === blockId
        ? { ...block, settings: { ...block.settings, ...newSettings } }
        : block
    )
    onChange(newBlocks)
  }

  const duplicateBlock = (blockId: string) => {
    const blockIndex = blocks.findIndex(b => b.id === blockId)
    if (blockIndex !== -1) {
      const originalBlock = blocks[blockIndex]
      const duplicatedBlock: Block = {
        ...originalBlock,
        id: generateBlockId()
      }
      
      const newBlocks = [...blocks]
      newBlocks.splice(blockIndex + 1, 0, duplicatedBlock)
      onChange(newBlocks)
      
      toast.success('블록이 복제되었습니다.')
    }
  }

  const deleteBlock = (blockId: string) => {
    const newBlocks = blocks.filter(block => block.id !== blockId)
    onChange(newBlocks)
    setSelectedBlock(null)
    toast.success('블록이 삭제되었습니다.')
  }

  const toggleBlockVisibility = (blockId: string) => {
    const block = blocks.find(b => b.id === blockId)
    if (block) {
      updateBlockSettings(blockId, { visible: !block.settings?.visible })
    }
  }

  const onDragEnd = (result: any) => {
    if (!result.destination) {
      return
    }

    const items = Array.from(blocks)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    onChange(items)
  }

  const renderBlock = (block: Block, index: number) => {
    const isSelected = selectedBlock === block.id
    const isHovered = hoveredBlock === block.id
    const isVisible = block.settings?.visible !== false

    const blockProps = {
      data: block.data,
      onChange: (newData: any) => updateBlock(block.id, newData),
      onSettingsChange: (newSettings: any) => updateBlockSettings(block.id, newSettings),
      isSelected,
      settings: block.settings
    }

    let BlockComponent: React.ComponentType<any>

    // TipTap blocks (text-based)
    if (['paragraph', 'heading', 'list', 'quote', 'code', 'table', 'divider', 'image'].includes(block.type)) {
      BlockComponent = TipTapBlock
    } else {
      // Layout blocks (React components)
      switch (block.type) {
        case 'hero-section':
          BlockComponent = HeroSection
          break
        case 'two-column':
          BlockComponent = TwoColumn
          break
        case 'feature-grid':
          BlockComponent = FeatureGrid
          break
        case 'pricing-table':
          BlockComponent = PricingTable
          break
        case 'testimonials':
          BlockComponent = Testimonials
          break
        case 'contact-form':
          BlockComponent = ContactForm
          break
        case 'gallery':
          BlockComponent = ImageGallery
          break
        case 'video':
          BlockComponent = VideoEmbed
          break
        case 'faq':
          BlockComponent = FAQ
          break
        default:
          BlockComponent = () => <div className="p-4 bg-red-100 text-red-800 rounded">Unknown block type: {block.type}</div>
      }
    }

    return (
      <Draggable key={block.id} draggableId={block.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`group relative ${snapshot.isDragging ? 'opacity-75' : ''}`}
            onMouseEnter={() => setHoveredBlock(block.id)}
            onMouseLeave={() => setHoveredBlock(null)}
          >
            {/* Block Toolbar */}
            {(isSelected || isHovered) && (
              <div className="absolute -top-10 left-0 z-10 flex items-center gap-1 bg-white border border-gray-200 rounded shadow-sm p-1">
                <div {...provided.dragHandleProps} className="p-1 text-gray-400 hover:text-gray-600 cursor-move">
                  <GripVertical className="w-4 h-4" />
                </div>
                
                <span className="text-xs text-gray-500 px-2 border-r">
                  {getBlockTypeLabel(block.type)}
                </span>
                
                <button
                  onClick={() => toggleBlockVisibility(block.id)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title={isVisible ? '숨기기' : '표시하기'}
                >
                  {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                
                <button
                  onClick={() => duplicateBlock(block.id)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="복제"
                >
                  <Copy className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => deleteBlock(block.id)}
                  className="p-1 text-red-400 hover:text-red-600"
                  title="삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Block Content */}
            <div
              className={`${!isVisible ? 'opacity-50' : ''} ${
                isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
              } ${isHovered ? 'ring-1 ring-gray-300' : ''} rounded transition-all`}
              onClick={() => setSelectedBlock(block.id)}
            >
              <BlockComponent {...blockProps} blockType={block.type} />
            </div>

            {/* Add Block Button (between blocks) */}
            <div className="group-hover:opacity-100 opacity-0 transition-opacity">
              <div className="relative h-4 flex items-center justify-center">
                <div className="w-full h-px bg-gray-200"></div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setInsertPosition(index + 1)
                    setShowBlockSelector(true)
                  }}
                  className="absolute bg-white border border-gray-300 rounded-full w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-400"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </Draggable>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Empty State */}
      {blocks.length === 0 && (
        <div className="text-center py-16">
          <Layout className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">빈 페이지</h3>
          <p className="text-gray-500 mb-6">블록을 추가하여 페이지를 만들어보세요.</p>
          <button
            onClick={() => {
              setInsertPosition(0)
              setShowBlockSelector(true)
            }}
            className="wp-button-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            첫 번째 블록 추가
          </button>
        </div>
      )}

      {/* Blocks */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="blocks">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
              {blocks.map((block, index) => renderBlock(block, index))}
              {provided.placeholder}
              
              {/* Final Add Block Button */}
              {blocks.length > 0 && (
                <div className="text-center py-8">
                  <button
                    onClick={() => {
                      setInsertPosition(blocks.length)
                      setShowBlockSelector(true)
                    }}
                    className="wp-button-secondary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    블록 추가
                  </button>
                </div>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Block Selector Modal */}
      {showBlockSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">블록 추가</h3>
                <button
                  onClick={() => setShowBlockSelector(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Text Blocks */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Type className="w-4 h-4" />
                    텍스트 블록
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {blockTypes.text.map((blockType) => (
                      <button
                        key={blockType.type}
                        onClick={() => addBlock(blockType.type, insertPosition)}
                        className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 text-left transition-colors"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <blockType.icon className="w-5 h-5 text-gray-600" />
                          <span className="font-medium text-gray-900">{blockType.label}</span>
                        </div>
                        <p className="text-sm text-gray-500">{blockType.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Layout Blocks */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Layout className="w-4 h-4" />
                    레이아웃 블록
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {blockTypes.layout.map((blockType) => (
                      <button
                        key={blockType.type}
                        onClick={() => addBlock(blockType.type, insertPosition)}
                        className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 text-left transition-colors"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <blockType.icon className="w-5 h-5 text-gray-600" />
                          <span className="font-medium text-gray-900">{blockType.label}</span>
                        </div>
                        <p className="text-sm text-gray-500">{blockType.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Media Blocks */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    미디어 블록
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {blockTypes.media.map((blockType) => (
                      <button
                        key={blockType.type}
                        onClick={() => addBlock(blockType.type, insertPosition)}
                        className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 text-left transition-colors"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <blockType.icon className="w-5 h-5 text-gray-600" />
                          <span className="font-medium text-gray-900">{blockType.label}</span>
                        </div>
                        <p className="text-sm text-gray-500">{blockType.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PageBuilder