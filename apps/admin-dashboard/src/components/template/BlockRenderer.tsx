import { createElement, FC } from 'react'
import { 
  Plus, 
  Copy, 
  Trash2, 
  ArrowUp, 
  ArrowDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TemplateBlock, TemplateBlockType } from '@o4o/types'

interface BlockRendererProps {
  block: TemplateBlock
  isSelected: boolean
  isPreview: boolean
  onSelect: () => void
  onAddBlock: (type: TemplateBlockType) => void
  onUpdate: (updates: Partial<TemplateBlock>) => void
  onDelete: () => void
  onDuplicate: () => void
  onMove: (direction: 'up' | 'down') => void
}

const BlockRenderer: FC<BlockRendererProps> = ({
  block,
  isSelected,
  isPreview,
  onSelect,
  onAddBlock,
  // onUpdate,
  onDelete,
  onDuplicate,
  onMove
}) => {
  // Get block styles from settings
  const getBlockStyles = () => {
    const { settings } = block
    const styles: React.CSSProperties = {}

    // Margin
    if (settings.margin) {
      styles.marginTop = settings.margin.top || '0'
      styles.marginRight = settings.margin.right || '0'
      styles.marginBottom = settings.margin.bottom || '0'
      styles.marginLeft = settings.margin.left || '0'
    }

    // Padding
    if (settings.padding) {
      styles.paddingTop = settings.padding.top || '0'
      styles.paddingRight = settings.padding.right || '0'
      styles.paddingBottom = settings.padding.bottom || '0'
      styles.paddingLeft = settings.padding.left || '0'
    }

    // Background
    if (settings.background) {
      switch (settings.background.type) {
        case 'color':
          styles.backgroundColor = settings.background.color
          break
        case 'image':
          if (settings.background.image?.url) {
            styles.backgroundImage = `url(${settings.background.image.url})`
            styles.backgroundPosition = settings.background.image.position || 'center'
            styles.backgroundRepeat = settings.background.image.repeat || 'no-repeat'
            styles.backgroundSize = settings.background.image.size || 'cover'
          }
          break
        case 'gradient':
          if (settings.background.gradient) {
            const { colors, direction = '45deg' } = settings.background.gradient
            styles.background = `linear-gradient(${direction}, ${colors?.join(', ') || ''})`
          }
          break
      }
    }

    // Border
    if (settings.border) {
      if (settings.border.width) styles.borderWidth = settings.border.width
      if (settings.border.color) styles.borderColor = settings.border.color
      if (settings.border.style) styles.borderStyle = settings.border.style
      if (settings.border.radius) styles.borderRadius = settings.border.radius
    }

    return styles
  }

  // Render block content based on type
  const renderBlockContent = () => {
    switch (block.type) {
      case 'hero':
        return (
          <div className="hero-section relative overflow-hidden" style={{ minHeight: '400px' }}>
            {block.content.backgroundImage && (
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${block.content.backgroundImage})` }}
              />
            )}
            <div className="relative z-10 flex flex-col items-center justify-center h-full text-center p-8">
              {block.content.title && (
                <h1 className="text-4xl md:text-6xl font-bold mb-4 text-white">
                  {block.content.title}
                </h1>
              )}
              {block.content.subtitle && (
                <p className="text-xl md:text-2xl mb-8 text-white/90">
                  {block.content.subtitle}
                </p>
              )}
              {block.content.buttons && (
                <div className="flex flex-wrap gap-4 justify-center">
                  {block.content.buttons.map((button: Record<string, unknown>, index: number) => (
                    <button
                      key={index}
                      className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                        button.style === 'primary' 
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-white text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      {String(button.text)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )

      case 'heading':
        const level = block.content.level || 2
        const headingClass = `font-bold ${
          level === 1 ? 'text-4xl' :
          level === 2 ? 'text-3xl' :
          level === 3 ? 'text-2xl' :
          level === 4 ? 'text-xl' :
          level === 5 ? 'text-lg' : 'text-base'
        }`
        
        return createElement(
          `h${level}`,
          { className: headingClass },
          block.content.text || 'Heading Text'
        )

      case 'paragraph':
        return (
          <p className="text-gray-700 leading-relaxed">
            {block.content.text || 'Enter your paragraph text here...'}
          </p>
        )

      case 'image':
        return (
          <div className="text-center">
            {block.content.src ? (
              <img
                src={block.content.src}
                alt={block.content.alt || ''}
                className="max-w-full h-auto rounded-lg"
              />
            ) : (
              <div className="bg-gray-200 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <div className="text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p>이미지를 추가하세요</p>
                </div>
              </div>
            )}
            {block.content.caption && (
              <p className="text-sm text-gray-600 mt-2">{block.content.caption}</p>
            )}
          </div>
        )

      case 'video':
        return (
          <div className="text-center">
            {block.content.src ? (
              <video
                controls
                className="max-w-full h-auto rounded-lg"
                poster={block.content.poster}
              >
                <source src={block.content.src} />
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="bg-gray-200 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <div className="text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p>비디오를 추가하세요</p>
                </div>
              </div>
            )}
          </div>
        )

      case 'button':
        return (
          <div className="text-center">
            <button
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                block.content.style === 'primary' 
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : block.content.style === 'secondary'
                  ? 'bg-gray-600 text-white hover:bg-gray-700'
                  : block.content.style === 'outline'
                  ? 'border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white'
                  : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              {block.content.text || 'Button Text'}
            </button>
          </div>
        )

      case 'columns':
        const columnCount = block.content.columns?.length || 2
        return (
          <div className={`grid grid-cols-1 md:grid-cols-${columnCount} gap-6`}>
            {(block.content.columns || []).map((column: Record<string, unknown>, index: number) => (
              <div key={index} className="space-y-4">
                <div className="p-4 border border-gray-200 rounded-lg min-h-[100px]">
                  {column.content ? (
                    <div className="prose prose-sm">
                      {String(column.content || '').split('\n').map((line: string, i: number) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center">
                      <p>Column {index + 1} content</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )

      case 'spacer':
        return (
          <div 
            style={{ height: block.content.height || '2rem' }}
            className="w-full bg-gray-100 border-2 border-dashed border-gray-300 rounded flex items-center justify-center"
          >
            <span className="text-gray-500 text-sm">Spacer</span>
          </div>
        )

      case 'card':
        return (
          <div className="border border-gray-200 rounded-lg p-6 shadow-sm">
            {block.content.title && (
              <h3 className="text-xl font-semibold mb-3">{block.content.title}</h3>
            )}
            {block.content.content && (
              <div className="text-gray-700">{block.content.content}</div>
            )}
            {!block.content.title && !block.content.content && (
              <div className="text-gray-500 text-center py-8">
                <p>카드 내용을 추가하세요</p>
              </div>
            )}
          </div>
        )

      case 'list':
        const isOrdered = block.content.type === 'ordered'
        const ListTag = isOrdered ? 'ol' : 'ul'
        return (
          <ListTag className={isOrdered ? 'list-decimal list-inside space-y-2' : 'list-disc list-inside space-y-2'}>
            {(block.content.items || ['목록 항목 1', '목록 항목 2']).map((item: string, index: number) => (
              <li key={index} className="text-gray-700">{item}</li>
            ))}
          </ListTag>
        )

      case 'quote':
        return (
          <blockquote className="border-l-4 border-blue-500 pl-6 py-4 bg-gray-50 rounded-r-lg">
            <p className="text-lg text-gray-700 italic mb-2">
              "{block.content.text || '인용문을 입력하세요'}"
            </p>
            {block.content.author && (
              <cite className="text-sm text-gray-600">— {block.content.author}</cite>
            )}
          </blockquote>
        )

      case 'divider':
        return (
          <hr className={`border-t ${
            block.content.style === 'dashed' ? 'border-dashed' :
            block.content.style === 'dotted' ? 'border-dotted' : 'border-solid'
          } border-gray-300`} />
        )

      default:
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
            <p>Block type: {block.type}</p>
            <p className="text-sm mt-2">Renderer not implemented yet</p>
          </div>
        )
    }
  }

  if (isPreview) {
    return (
      <div style={getBlockStyles()}>
        {renderBlockContent()}
      </div>
    )
  }

  return (
    <div
      className={`group relative border-2 transition-all duration-200 ${
        isSelected 
          ? 'border-blue-500 shadow-lg' 
          : 'border-transparent hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      {/* Block Controls */}
      <div className={`absolute -top-10 left-0 right-0 flex items-center justify-between transition-opacity ${
        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}>
        <div className="flex items-center gap-1 bg-white border rounded-lg shadow-sm p-1">
          <span className="text-xs text-gray-600 px-2">{block.type}</span>
          <Button size="sm" variant="ghost" onClick={(e: any) => { e.stopPropagation(); onMove('up') }}>
            <ArrowUp className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" onClick={(e: any) => { e.stopPropagation(); onMove('down') }}>
            <ArrowDown className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" onClick={(e: any) => { e.stopPropagation(); onDuplicate() }}>
            <Copy className="w-3 h-3" />
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={(e: any) => { e.stopPropagation(); onDelete() }}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>

        {/* Visibility indicators */}
        <div className="flex items-center gap-1 bg-white border rounded-lg shadow-sm p-1">
          {block.settings.visibility?.desktop !== false && (
            <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center">
              <span className="text-xs">D</span>
            </div>
          )}
          {block.settings.visibility?.tablet !== false && (
            <div className="w-4 h-4 bg-green-100 rounded flex items-center justify-center">
              <span className="text-xs">T</span>
            </div>
          )}
          {block.settings.visibility?.mobile !== false && (
            <div className="w-4 h-4 bg-purple-100 rounded flex items-center justify-center">
              <span className="text-xs">M</span>
            </div>
          )}
        </div>
      </div>

      {/* Block Content */}
      <div style={getBlockStyles()}>
        {renderBlockContent()}
      </div>

      {/* Add Block Button */}
      <div className={`absolute -bottom-6 left-1/2 transform -translate-x-1/2 transition-opacity ${
        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}>
        <Button
          size="sm"
          variant="outline"
          className="bg-white shadow-sm"
          onClick={(e: any) => {
            e.stopPropagation()
            onAddBlock('paragraph')
          }}
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Block
        </Button>
      </div>
    </div>
  )
}

export default BlockRenderer