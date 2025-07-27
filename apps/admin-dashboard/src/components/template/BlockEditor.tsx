import { FC, useState, useEffect, useCallback } from 'react';
import { 
  Settings, 
  Monitor,
  Tablet,
  Smartphone,
  Plus,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TemplateBlock } from '@o4o/types'

interface BlockEditorProps {
  block: TemplateBlock
  onChange: (updates: Partial<TemplateBlock>) => void
}

const BlockEditor: FC<BlockEditorProps> = ({ block, onChange }) => {
  const [activeDevice, setActiveDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')

  // Update content
  const updateContent = (key: string, value: unknown) => {
    onChange({
      content: {
        ...block.content,
        [key]: value
      }
    })
  }

  // Update settings (removed as unused)
  // const updateSettings = (key: string, value: any) => {
  //   onChange({
  //     settings: {
  //       ...block.settings,
  //       [key]: value
  //     }
  //   })
  // }

  // Update nested settings
  const updateNestedSettings = (category: string, key: string, value: unknown) => {
    const currentSettings = block.settings as Record<string, unknown>
    onChange({
      settings: {
        ...block.settings,
        [category]: {
          ...(currentSettings[category] as Record<string, unknown> || {}),
          [key]: value
        }
      }
    })
  }

  // Color picker component
  const ColorPicker: FC<{ 
    label: string
    value: string
    onChange: (value: string) => void 
  }> = ({ label, value, onChange }) => (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e: any) => onChange(e.target.value)}
          className="w-8 h-8 rounded border cursor-pointer"
        />
        <Input
          value={value || ''}
          onChange={(e: any) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1"
        />
      </div>
    </div>
  )

  // Spacing controls
  const SpacingControls: FC<{
    label: string
    value: Record<string, string>
    onChange: (value: Record<string, string>) => void
  }> = ({ label, value = {}, onChange }) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Top</Label>
            <Input
              value={value.top || ''}
              onChange={(e: any) => onChange({ ...value, top: e.target.value })}
              placeholder="0px"
              className="text-xs h-8"
            />
          </div>
          <div>
            <Label className="text-xs">Right</Label>
            <Input
              value={value.right || ''}
              onChange={(e: any) => onChange({ ...value, right: e.target.value })}
              placeholder="0px"
              className="text-xs h-8"
            />
          </div>
          <div>
            <Label className="text-xs">Bottom</Label>
            <Input
              value={value.bottom || ''}
              onChange={(e: any) => onChange({ ...value, bottom: e.target.value })}
              placeholder="0px"
              className="text-xs h-8"
            />
          </div>
          <div>
            <Label className="text-xs">Left</Label>
            <Input
              value={value.left || ''}
              onChange={(e: any) => onChange({ ...value, left: e.target.value })}
              placeholder="0px"
              className="text-xs h-8"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // Render content editor based on block type
  const renderContentEditor = () => {
    switch (block.type) {
      case 'hero':
        return (
          <div className="space-y-4">
            <div>
              <Label>제목</Label>
              <Input
                value={block.content.title || ''}
                onChange={(e: any) => updateContent('title', e.target.value)}
                placeholder="Hero 제목"
              />
            </div>
            <div>
              <Label>부제목</Label>
              <Input
                value={block.content.subtitle || ''}
                onChange={(e: any) => updateContent('subtitle', e.target.value)}
                placeholder="Hero 부제목"
              />
            </div>
            <div>
              <Label>배경 이미지</Label>
              <Input
                value={block.content.backgroundImage || ''}
                onChange={(e: any) => updateContent('backgroundImage', e.target.value)}
                placeholder="이미지 URL"
              />
            </div>
            <div>
              <Label>버튼</Label>
              {(block.content.buttons || []).map((button: Record<string, unknown>, index: number) => (
                <div key={index} className="flex gap-2 mt-2">
                  <Input
                    value={String(button.text || '')}
                    onChange={(e: any) => {
                      const newButtons = [...(block.content.buttons || [])]
                      newButtons[index] = { ...button, text: e.target.value }
                      updateContent('buttons', newButtons)
                    }}
                    placeholder="버튼 텍스트"
                  />
                  <Input
                    value={String(button.url || '')}
                    onChange={(e: any) => {
                      const newButtons = [...(block.content.buttons || [])]
                      newButtons[index] = { ...button, url: e.target.value }
                      updateContent('buttons', newButtons)
                    }}
                    placeholder="URL"
                  />
                  <Button
                    size={"sm" as const}
                    variant={"ghost" as const}
                    onClick={() => {
                      const newButtons = (block.content.buttons || []).filter((_: unknown, i: number) => i !== index)
                      updateContent('buttons', newButtons)
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                size={"sm" as const}
                variant={"outline" as const}
                onClick={() => {
                  const newButtons = [...(block.content.buttons || []), { text: '버튼', url: '#', style: 'primary' }]
                  updateContent('buttons', newButtons)
                }}
                className="mt-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                버튼 추가
              </Button>
            </div>
          </div>
        )

      case 'heading':
        return (
          <div className="space-y-4">
            <div>
              <Label>텍스트</Label>
              <Input
                value={block.content.text || ''}
                onChange={(e: any) => updateContent('text', e.target.value)}
                placeholder="제목 텍스트"
              />
            </div>
            <div>
              <Label>레벨</Label>
              <Select
                value={block.content.level?.toString() || '2'}
                onValueChange={(value: string) => updateContent('level', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">H1</SelectItem>
                  <SelectItem value="2">H2</SelectItem>
                  <SelectItem value="3">H3</SelectItem>
                  <SelectItem value="4">H4</SelectItem>
                  <SelectItem value="5">H5</SelectItem>
                  <SelectItem value="6">H6</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case 'paragraph':
        return (
          <div>
            <Label>텍스트</Label>
            <Textarea
              value={block.content.text || ''}
              onChange={(e: any) => updateContent('text', e.target.value)}
              placeholder="단락 텍스트를 입력하세요"
              rows={4}
            />
          </div>
        )

      case 'image':
        return (
          <div className="space-y-4">
            <div>
              <Label>이미지 URL</Label>
              <Input
                value={block.content.src || ''}
                onChange={(e: any) => updateContent('src', e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div>
              <Label>대체 텍스트</Label>
              <Input
                value={block.content.alt || ''}
                onChange={(e: any) => updateContent('alt', e.target.value)}
                placeholder="이미지 설명"
              />
            </div>
            <div>
              <Label>캡션</Label>
              <Input
                value={block.content.caption || ''}
                onChange={(e: any) => updateContent('caption', e.target.value)}
                placeholder="이미지 캡션"
              />
            </div>
          </div>
        )

      case 'button':
        return (
          <div className="space-y-4">
            <div>
              <Label>텍스트</Label>
              <Input
                value={block.content.text || ''}
                onChange={(e: any) => updateContent('text', e.target.value)}
                placeholder="버튼 텍스트"
              />
            </div>
            <div>
              <Label>URL</Label>
              <Input
                value={block.content.url || ''}
                onChange={(e: any) => updateContent('url', e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div>
              <Label>스타일</Label>
              <Select
                value={block.content.style || 'primary'}
                onValueChange={(value: string) => updateContent('style', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                  <SelectItem value="ghost">Ghost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case 'columns':
        return (
          <div className="space-y-4">
            <div>
              <Label>컬럼 수</Label>
              <Select
                value={(block.content.columns?.length || 2).toString()}
                onValueChange={(value: string) => {
                  const count = parseInt(value)
                  const newColumns = Array.from({ length: count }, (_, i) => 
                    block.content.columns?.[i] || { content: '' }
                  )
                  updateContent('columns', newColumns)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 컬럼</SelectItem>
                  <SelectItem value="2">2 컬럼</SelectItem>
                  <SelectItem value="3">3 컬럼</SelectItem>
                  <SelectItem value="4">4 컬럼</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(block.content.columns || []).map((column: Record<string, unknown>, index: number) => (
              <div key={index}>
                <Label>컬럼 {index + 1} 내용</Label>
                <Textarea
                  value={String(column.content || '')}
                  onChange={(e: any) => {
                    const newColumns = [...(block.content.columns || [])]
                    newColumns[index] = { ...column, content: e.target.value }
                    updateContent('columns', newColumns)
                  }}
                  placeholder={`컬럼 ${index + 1} 내용`}
                  rows={3}
                />
              </div>
            ))}
          </div>
        )

      default:
        return (
          <div className="text-center py-8 text-gray-500">
            <Settings className="w-8 h-8 mx-auto mb-2" />
            <p>이 블록 타입에 대한 편집기가 준비 중입니다.</p>
          </div>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Block Info */}
      <div className="pb-4 border-b">
        <h3 className="font-semibold text-lg capitalize">{block.type}</h3>
        <p className="text-sm text-gray-600">블록 ID: {block.id}</p>
      </div>

      {/* Device Selector */}
      <div className="flex items-center gap-1 border rounded-lg p-1">
        <Button
          size={"sm" as const}
          variant={activeDevice === 'desktop' ? 'default' : 'ghost'}
          onClick={() => setActiveDevice('desktop')}
        >
          <Monitor className="w-4 h-4" />
        </Button>
        <Button
          size={"sm" as const}
          variant={activeDevice === 'tablet' ? 'default' : 'ghost'}
          onClick={() => setActiveDevice('tablet')}
        >
          <Tablet className="w-4 h-4" />
        </Button>
        <Button
          size={"sm" as const}
          variant={activeDevice === 'mobile' ? 'default' : 'ghost'}
          onClick={() => setActiveDevice('mobile')}
        >
          <Smartphone className="w-4 h-4" />
        </Button>
      </div>

      {/* Editor Tabs */}
      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="content">내용</TabsTrigger>
          <TabsTrigger value="design">디자인</TabsTrigger>
          <TabsTrigger value="advanced">고급</TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-4">
          {renderContentEditor()}
        </TabsContent>

        {/* Design Tab */}
        <TabsContent value="design" className="space-y-4">
          {/* Spacing */}
          <SpacingControls
            label="여백 (Margin)"
            value={block.settings.margin as Record<string, string> || {}}
            onChange={(value: string) => updateNestedSettings('margin', '', value)}
          />

          <SpacingControls
            label="패딩 (Padding)"
            value={block.settings.padding as Record<string, string> || {}}
            onChange={(value: string) => updateNestedSettings('padding', '', value)}
          />

          {/* Background */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">배경</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm">타입</Label>
                <Select
                  value={block.settings.background?.type || 'none'}
                  onValueChange={(value: string) => updateNestedSettings('background', 'type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">없음</SelectItem>
                    <SelectItem value="color">색상</SelectItem>
                    <SelectItem value="gradient">그라디언트</SelectItem>
                    <SelectItem value="image">이미지</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {block.settings.background?.type === 'color' && (
                <ColorPicker
                  label="배경 색상"
                  value={block.settings.background?.color || ''}
                  onChange={(value: string) => updateNestedSettings('background', 'color', value)}
                />
              )}

              {block.settings.background?.type === 'image' && (
                <div>
                  <Label className="text-sm">이미지 URL</Label>
                  <Input
                    value={block.settings.background?.image?.url || ''}
                    onChange={(e: any) => updateNestedSettings('background', 'image', {
                      ...block.settings.background?.image,
                      url: e.target.value
                    })}
                    placeholder="https://example.com/bg.jpg"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Border */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">테두리</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm">두께</Label>
                <Input
                  value={block.settings.border?.width || ''}
                  onChange={(e: any) => updateNestedSettings('border', 'width', e.target.value)}
                  placeholder="1px"
                />
              </div>
              <ColorPicker
                label="색상"
                value={block.settings.border?.color || ''}
                onChange={(value: string) => updateNestedSettings('border', 'color', value)}
              />
              <div>
                <Label className="text-sm">둥근 모서리</Label>
                <Input
                  value={block.settings.border?.radius || ''}
                  onChange={(e: any) => updateNestedSettings('border', 'radius', e.target.value)}
                  placeholder="4px"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-4">
          {/* Animation */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">애니메이션</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm">타입</Label>
                <Select
                  value={block.settings.animation?.type || 'none'}
                  onValueChange={(value: string) => updateNestedSettings('animation', 'type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">없음</SelectItem>
                    <SelectItem value="fade">페이드</SelectItem>
                    <SelectItem value="slide">슬라이드</SelectItem>
                    <SelectItem value="zoom">줌</SelectItem>
                    <SelectItem value="bounce">바운스</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {block.settings.animation?.type !== 'none' && (
                <>
                  <div>
                    <Label className="text-sm">지속시간 (ms)</Label>
                    <Slider
                      value={[block.settings.animation?.duration || 300]}
                      onValueChange={([value]: number[]) => updateNestedSettings('animation', 'duration', value)}
                      max={2000}
                      min={100}
                      step={100}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {block.settings.animation?.duration || 300}ms
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm">지연시간 (ms)</Label>
                    <Slider
                      value={[block.settings.animation?.delay || 0]}
                      onValueChange={([value]: number[]) => updateNestedSettings('animation', 'delay', value)}
                      max={2000}
                      min={0}
                      step={100}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {block.settings.animation?.delay || 0}ms
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Visibility */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">표시 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">데스크톱에서 표시</Label>
                <Switch
                  checked={block.settings.visibility?.desktop !== false}
                  onCheckedChange={(checked: boolean) => updateNestedSettings('visibility', 'desktop', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">태블릿에서 표시</Label>
                <Switch
                  checked={block.settings.visibility?.tablet !== false}
                  onCheckedChange={(checked: boolean) => updateNestedSettings('visibility', 'tablet', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">모바일에서 표시</Label>
                <Switch
                  checked={block.settings.visibility?.mobile !== false}
                  onCheckedChange={(checked: boolean) => updateNestedSettings('visibility', 'mobile', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default BlockEditor
interface SpacingValue {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

interface SpacingValue {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

interface SpacingControlProps {
  label: string;
  value: SpacingValue;
  onChange: (value: SpacingValue) => void;
}
