import React, { useState, useCallback, useRef } from 'react'
import {
  X,
  Save,
  Eye,
  Smartphone,
  Tablet,
  Monitor,
  Plus,
  Undo,
  Redo,
  Layers,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  ZoomIn,
  ZoomOut
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@o4o/auth-client'
import type { 
  Template, 
  TemplateBlock, 
  TemplateBuilderState, 
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateBlockType 
} from '@o4o/types'
import toast from 'react-hot-toast'
import BlockPalette from './BlockPalette'
import BlockEditor from './BlockEditor'
import BlockRenderer from './BlockRenderer'

interface TemplateBuilderProps {
  template?: Template | null
  onClose: () => void
  onSave: () => void
}

const TemplateBuilder: React.FC<TemplateBuilderProps> = ({
  template,
  onClose,
  onSave
}) => {
  const queryClient = useQueryClient()
  const canvasRef = useRef<HTMLDivElement>(null)

  // Builder state
  const [builderState, setBuilderState] = useState<TemplateBuilderState>(() => ({
    template: template || {
      id: '',
      name: '',
      description: '',
      type: 'page',
      category: 'homepage',
      status: 'draft',
      blocks: [],
      settings: {
        layout: {
          containerWidth: '1200px',
          contentWidth: '100%',
          sidebar: { enabled: false, position: 'right', width: '300px' },
          header: { enabled: true, sticky: false, transparent: false },
          footer: { enabled: true, sticky: false }
        },
        typography: {
          fontFamily: { primary: 'Inter', secondary: 'Inter', monospace: 'Monaco' },
          fontSize: { base: '16px', scale: 1.25 },
          lineHeight: { tight: 1.25, normal: 1.5, loose: 1.75 },
          fontWeight: { normal: 400, medium: 500, bold: 700 }
        },
        colors: {
          primary: '#3b82f6',
          secondary: '#64748b',
          accent: '#f59e0b',
          background: '#ffffff',
          surface: '#f8fafc',
          text: { primary: '#1e293b', secondary: '#64748b', muted: '#94a3b8' },
          border: '#e2e8f0',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444'
        },
        spacing: { top: '0', right: '0', bottom: '0', left: '0' },
        seo: {}
      },
      preview: { thumbnail: '', screenshots: [] },
      metadata: {
        tags: [],
        author: '',
        version: '1.0.0',
        compatibility: [],
        usageCount: 0,
        rating: 0,
        downloads: 0
      },
      createdBy: '',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    selectedBlockId: null,
    previewMode: false,
    devicePreview: 'desktop',
    zoom: 1,
    history: [],
    historyIndex: -1
  }))

  const [activeTab, setActiveTab] = useState('blocks')

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateTemplateDto) => {
      return authClient.api.post('/templates', data)
    },
    onSuccess: () => {
      toast.success('템플릿이 생성되었습니다')
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      onSave()
    },
    onError: () => {
      toast.error('생성에 실패했습니다')
    }
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: UpdateTemplateDto }) => {
      return authClient.api.put(`/templates/${data.id}`, data.updates)
    },
    onSuccess: () => {
      toast.success('템플릿이 저장되었습니다')
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      onSave()
    },
    onError: () => {
      toast.error('저장에 실패했습니다')
    }
  })

  // Add history state
  const addHistory = useCallback((action: string) => {
    const newState = {
      blocks: [...builderState.template.blocks],
      settings: { ...builderState.template.settings },
      timestamp: new Date(),
      action
    }
    
    setBuilderState(prev => ({
      ...prev,
      history: [...prev.history.slice(0, prev.historyIndex + 1), newState],
      historyIndex: prev.historyIndex + 1
    }))
  }, [builderState.template.blocks, builderState.template.settings, builderState.historyIndex])

  // Update template data
  const updateTemplate = useCallback((updates: Partial<Template>) => {
    setBuilderState(prev => ({
      ...prev,
      template: { ...prev.template, ...updates }
    }))
  }, [])

  // Add block
  const addBlock = useCallback((type: TemplateBlockType, afterBlockId?: string) => {
    const newBlock: TemplateBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content: getDefaultContent(type),
      settings: getDefaultSettings(type),
      order: builderState.template.blocks.length
    }

    let newBlocks = [...builderState.template.blocks]
    if (afterBlockId) {
      const index = newBlocks.findIndex(b => b.id === afterBlockId)
      newBlocks.splice(index + 1, 0, newBlock)
    } else {
      newBlocks.push(newBlock)
    }

    // Update order
    newBlocks = newBlocks.map((block, index) => ({ ...block, order: index }))

    updateTemplate({ blocks: newBlocks })
    setBuilderState(prev => ({ ...prev, selectedBlockId: newBlock.id }))
    addHistory(`Added ${type} block`)
  }, [builderState.template.blocks, updateTemplate, addHistory])

  // Update block
  const updateBlock = useCallback((blockId: string, updates: Partial<TemplateBlock>) => {
    const newBlocks = builderState.template.blocks.map(block =>
      block.id === blockId ? { ...block, ...updates } : block
    )
    updateTemplate({ blocks: newBlocks })
  }, [builderState.template.blocks, updateTemplate])

  // Delete block
  const deleteBlock = useCallback((blockId: string) => {
    const newBlocks = builderState.template.blocks
      .filter(block => block.id !== blockId)
      .map((block, index) => ({ ...block, order: index }))
    
    updateTemplate({ blocks: newBlocks })
    setBuilderState(prev => ({ 
      ...prev, 
      selectedBlockId: prev.selectedBlockId === blockId ? null : prev.selectedBlockId 
    }))
    addHistory('Deleted block')
  }, [builderState.template.blocks, updateTemplate, addHistory])

  // Move block
  const moveBlock = useCallback((blockId: string, direction: 'up' | 'down') => {
    const blocks = [...builderState.template.blocks]
    const currentIndex = blocks.findIndex(b => b.id === blockId)
    
    if (currentIndex === -1) return
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= blocks.length) return

    // Swap blocks
    [blocks[currentIndex], blocks[newIndex]] = [blocks[newIndex], blocks[currentIndex]]
    
    // Update order
    const newBlocks = blocks.map((block, index) => ({ ...block, order: index }))
    
    updateTemplate({ blocks: newBlocks })
    addHistory(`Moved block ${direction}`)
  }, [builderState.template.blocks, updateTemplate, addHistory])

  // Duplicate block
  const duplicateBlock = useCallback((blockId: string) => {
    const originalBlock = builderState.template.blocks.find(b => b.id === blockId)
    if (!originalBlock) return

    const newBlock: TemplateBlock = {
      ...originalBlock,
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }

    const newBlocks = [...builderState.template.blocks]
    const index = newBlocks.findIndex(b => b.id === blockId)
    newBlocks.splice(index + 1, 0, newBlock)
    
    // Update order
    const orderedBlocks = newBlocks.map((block, i) => ({ ...block, order: i }))
    
    updateTemplate({ blocks: orderedBlocks })
    setBuilderState(prev => ({ ...prev, selectedBlockId: newBlock.id }))
    addHistory('Duplicated block')
  }, [builderState.template.blocks, updateTemplate, addHistory])

  // Save template
  const handleSave = () => {
    if (!builderState.template.name) {
      toast.error('템플릿 이름을 입력해주세요')
      return
    }

    if (template?.id) {
      // Update existing template
      updateMutation.mutate({
        id: template.id,
        updates: {
          name: builderState.template.name,
          description: builderState.template.description,
          blocks: builderState.template.blocks,
          settings: builderState.template.settings,
          status: builderState.template.status
        }
      })
    } else {
      // Create new template
      createMutation.mutate({
        name: builderState.template.name,
        description: builderState.template.description,
        type: builderState.template.type,
        category: builderState.template.category,
        template: builderState.template
      })
    }
  }

  // Undo/Redo
  const undo = useCallback(() => {
    if (builderState.historyIndex > 0) {
      const prevState = builderState.history[builderState.historyIndex - 1]
      updateTemplate({
        blocks: prevState.blocks,
        settings: prevState.settings
      })
      setBuilderState(prev => ({ ...prev, historyIndex: prev.historyIndex - 1 }))
    }
  }, [builderState.history, builderState.historyIndex, updateTemplate])

  const redo = useCallback(() => {
    if (builderState.historyIndex < builderState.history.length - 1) {
      const nextState = builderState.history[builderState.historyIndex + 1]
      updateTemplate({
        blocks: nextState.blocks,
        settings: nextState.settings
      })
      setBuilderState(prev => ({ ...prev, historyIndex: prev.historyIndex + 1 }))
    }
  }, [builderState.history, builderState.historyIndex, updateTemplate])

  // Zoom controls
  const zoomIn = () => setBuilderState(prev => ({ 
    ...prev, 
    zoom: Math.min(prev.zoom + 0.1, 2) 
  }))
  
  const zoomOut = () => setBuilderState(prev => ({ 
    ...prev, 
    zoom: Math.max(prev.zoom - 0.1, 0.5) 
  }))

  // Get device preview class
  const getDeviceClass = () => {
    switch (builderState.devicePreview) {
      case 'mobile':
        return 'max-w-sm'
      case 'tablet':
        return 'max-w-2xl'
      default:
        return 'max-w-full'
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-full w-full h-full m-0 rounded-none">
        <div className="flex h-full">
          {/* Left Sidebar */}
          <div className="w-80 border-r bg-white flex flex-col">
            <DialogHeader className="p-4 border-b">
              <DialogTitle>템플릿 빌더</DialogTitle>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-3 mx-4 mt-4">
                <TabsTrigger value="blocks">블록</TabsTrigger>
                <TabsTrigger value="layers">레이어</TabsTrigger>
                <TabsTrigger value="settings">설정</TabsTrigger>
              </TabsList>

              <TabsContent value="blocks" className="flex-1 overflow-y-auto p-4">
                <BlockPalette onAddBlock={addBlock} />
              </TabsContent>

              <TabsContent value="layers" className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {builderState.template.blocks.map((block, index) => (
                    <div
                      key={block.id}
                      className={`group flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                        builderState.selectedBlockId === block.id
                          ? 'bg-blue-100 border border-blue-300'
                          : 'hover:bg-gray-100'
                      }`}
                      onClick={() => setBuilderState(prev => ({ 
                        ...prev, 
                        selectedBlockId: block.id 
                      }))}
                    >
                      <Layers className="w-4 h-4 text-gray-500" />
                      <span className="flex-1 text-sm">{block.type}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e: any) => {
                            e.stopPropagation()
                            moveBlock(block.id, 'up')
                          }}
                          disabled={index === 0}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e: any) => {
                            e.stopPropagation()
                            moveBlock(block.id, 'down')
                          }}
                          disabled={index === builderState.template.blocks.length - 1}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e: any) => {
                            e.stopPropagation()
                            duplicateBlock(block.id)
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e: any) => {
                            e.stopPropagation()
                            deleteBlock(block.id)
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="settings" className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="template-name">템플릿 이름</Label>
                    <Input
                      id="template-name"
                      value={builderState.template.name}
                      onChange={(e: any) => updateTemplate({ name: e.target.value })}
                      placeholder="템플릿 이름을 입력하세요"
                    />
                  </div>
                  <div>
                    <Label htmlFor="template-description">설명</Label>
                    <Textarea
                      id="template-description"
                      value={builderState.template.description}
                      onChange={(e: any) => updateTemplate({ description: e.target.value })}
                      placeholder="템플릿 설명을 입력하세요"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="template-type">타입</Label>
                    <Select
                      value={builderState.template.type}
                      onValueChange={(value) => updateTemplate({ type: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="page">페이지</SelectItem>
                        <SelectItem value="post">포스트</SelectItem>
                        <SelectItem value="email">이메일</SelectItem>
                        <SelectItem value="popup">팝업</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="template-category">카테고리</Label>
                    <Select
                      value={builderState.template.category}
                      onValueChange={(value) => updateTemplate({ category: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="homepage">홈페이지</SelectItem>
                        <SelectItem value="landing-page">랜딩 페이지</SelectItem>
                        <SelectItem value="blog">블로그</SelectItem>
                        <SelectItem value="ecommerce">이커머스</SelectItem>
                        <SelectItem value="portfolio">포트폴리오</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Main Canvas Area */}
          <div className="flex-1 flex flex-col">
            {/* Top Toolbar */}
            <div className="border-b bg-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Device Preview */}
                <div className="flex items-center gap-1 border rounded-lg p-1">
                  <Button
                    size="sm"
                    variant={builderState.devicePreview === 'desktop' ? 'default' : 'ghost'}
                    onClick={() => setBuilderState(prev => ({ 
                      ...prev, 
                      devicePreview: 'desktop' 
                    }))}
                  >
                    <Monitor className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={builderState.devicePreview === 'tablet' ? 'default' : 'ghost'}
                    onClick={() => setBuilderState(prev => ({ 
                      ...prev, 
                      devicePreview: 'tablet' 
                    }))}
                  >
                    <Tablet className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={builderState.devicePreview === 'mobile' ? 'default' : 'ghost'}
                    onClick={() => setBuilderState(prev => ({ 
                      ...prev, 
                      devicePreview: 'mobile' 
                    }))}
                  >
                    <Smartphone className="w-4 h-4" />
                  </Button>
                </div>

                {/* History Controls */}
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={undo}
                    disabled={builderState.historyIndex <= 0}
                  >
                    <Undo className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={redo}
                    disabled={builderState.historyIndex >= builderState.history.length - 1}
                  >
                    <Redo className="w-4 h-4" />
                  </Button>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={zoomOut}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-600 min-w-[3rem] text-center">
                    {Math.round(builderState.zoom * 100)}%
                  </span>
                  <Button size="sm" variant="ghost" onClick={zoomIn}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setBuilderState(prev => ({ 
                    ...prev, 
                    previewMode: !prev.previewMode 
                  }))}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {builderState.previewMode ? '편집' : '미리보기'}
                </Button>
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  저장
                </Button>
                <Button variant="ghost" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 bg-gray-100 overflow-auto">
              <div 
                ref={canvasRef}
                className="min-h-full p-8 flex justify-center"
                style={{ transform: `scale(${builderState.zoom})` }}
              >
                <div className={`bg-white shadow-lg ${getDeviceClass()} min-h-96 transition-all duration-300`}>
                  {builderState.template.blocks.length === 0 ? (
                    <div className="flex items-center justify-center h-96 text-gray-500">
                      <div className="text-center">
                        <Plus className="w-12 h-12 mx-auto mb-4" />
                        <p>블록을 추가해서 시작하세요</p>
                      </div>
                    </div>
                  ) : (
                    builderState.template.blocks.map((block) => (
                      <BlockRenderer
                        key={block.id}
                        block={block}
                        isSelected={builderState.selectedBlockId === block.id}
                        isPreview={builderState.previewMode}
                        onSelect={() => setBuilderState(prev => ({ 
                          ...prev, 
                          selectedBlockId: block.id 
                        }))}
                        onAddBlock={(type) => addBlock(type, block.id)}
                        onUpdate={(updates) => updateBlock(block.id, updates)}
                        onDelete={() => deleteBlock(block.id)}
                        onDuplicate={() => duplicateBlock(block.id)}
                        onMove={(direction) => moveBlock(block.id, direction)}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Block Editor */}
          {builderState.selectedBlockId && !builderState.previewMode && (
            <div className="w-80 border-l bg-white overflow-y-auto">
              <div className="p-4 border-b">
                <h3 className="font-semibold">블록 편집</h3>
              </div>
              <div className="p-4">
                <BlockEditor
                  block={builderState.template.blocks.find(b => b.id === builderState.selectedBlockId)!}
                  onChange={(updates) => updateBlock(builderState.selectedBlockId!, updates)}
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Helper functions
function getDefaultContent(type: TemplateBlockType): Record<string, unknown> {
  switch (type) {
    case 'hero':
      return {
        title: 'Hero Title',
        subtitle: 'Hero subtitle text',
        backgroundImage: '',
        buttons: [{ text: 'Get Started', url: '#', style: 'primary' }]
      }
    case 'heading':
      return { text: 'Heading Text', level: 2 }
    case 'paragraph':
      return { text: 'Your paragraph text goes here...' }
    case 'image':
      return { src: '', alt: 'Image description', caption: '' }
    case 'button':
      return { text: 'Button Text', url: '#', style: 'primary' }
    case 'columns':
      return { columns: [{ content: '' }, { content: '' }] }
    default:
      return {}
  }
}

function getDefaultSettings(_type: TemplateBlockType): Record<string, unknown> {
  return {
    margin: { top: '0', right: '0', bottom: '1rem', left: '0' },
    padding: { top: '1rem', right: '1rem', bottom: '1rem', left: '1rem' },
    background: { type: 'none' },
    border: {},
    animation: { type: 'none', duration: 300, delay: 0, trigger: 'page-load' },
    visibility: { desktop: true, tablet: true, mobile: true }
  }
}

export default TemplateBuilder