import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  GripVertical, 
  Edit2, 
  Trash2, 
  Plus, 
  Save, 
  X,
  Type,
  AlignLeft,
  Image,
  Columns,
  Square,
  Quote,
  List,
  Button as ButtonIcon,
  Minus
} from 'lucide-react';
import { Block } from '@/services/ai/pageGenerator';

interface PostGenerationEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (blocks: Block[]) => void;
  initialBlocks: Block[];
}

// 블록 타입별 아이콘 매핑
const getBlockIcon = (blockType: string) => {
  switch (blockType) {
    case 'core/heading': return <Type className="w-4 h-4" />;
    case 'core/paragraph': return <AlignLeft className="w-4 h-4" />;
    case 'core/image': return <Image className="w-4 h-4" />;
    case 'core/columns': return <Columns className="w-4 h-4" />;
    case 'core/group': return <Square className="w-4 h-4" />;
    case 'core/quote': return <Quote className="w-4 h-4" />;
    case 'core/list': return <List className="w-4 h-4" />;
    case 'core/button': return <ButtonIcon className="w-4 h-4" />;
    case 'core/separator': return <Minus className="w-4 h-4" />;
    default: return <Square className="w-4 h-4" />;
  }
};

// 블록 타입명 변환
const getBlockTypeName = (blockType: string) => {
  const typeMap: Record<string, string> = {
    'core/heading': '제목',
    'core/paragraph': '본문',
    'core/image': '이미지',
    'core/columns': '다단 레이아웃',
    'core/group': '그룹',
    'core/quote': '인용문',
    'core/list': '목록',
    'core/button': '버튼',
    'core/separator': '구분선',
    'enhanced/gallery': '갤러리',
    'enhanced/cover': '커버',
    'enhanced/social-icons': '소셜 아이콘',
  };
  return typeMap[blockType] || blockType;
};

export const PostGenerationEditor: React.FC<PostGenerationEditorProps> = ({
  isOpen,
  onClose,
  onSave,
  initialBlocks,
}) => {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<any>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // 초기 블록 설정
  useEffect(() => {
    setBlocks(initialBlocks);
  }, [initialBlocks]);

  // 네이티브 드래그 앤 드롭 처리
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.outerHTML);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newBlocks = [...blocks];
    const draggedBlock = newBlocks[draggedIndex];
    
    // 드래그된 블록을 제거
    newBlocks.splice(draggedIndex, 1);
    
    // 새 위치에 삽입
    const adjustedDropIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
    newBlocks.splice(adjustedDropIndex, 0, draggedBlock);
    
    setBlocks(newBlocks);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // 블록 편집 시작
  const startEditing = (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (block) {
      setEditingBlock(blockId);
      setEditingContent(block.content || {});
    }
  };

  // 블록 편집 저장
  const saveBlockEdit = () => {
    if (!editingBlock) return;

    setBlocks(blocks.map(block => 
      block.id === editingBlock 
        ? { ...block, content: editingContent }
        : block
    ));
    
    setEditingBlock(null);
    setEditingContent({});
  };

  // 블록 편집 취소
  const cancelBlockEdit = () => {
    setEditingBlock(null);
    setEditingContent({});
  };

  // 블록 삭제
  const deleteBlock = (blockId: string) => {
    setBlocks(blocks.filter(block => block.id !== blockId));
  };

  // 새 블록 추가
  const addNewBlock = (type: string, afterIndex?: number) => {
    const newBlock: Block = {
      id: `block-${Date.now()}`,
      type,
      content: getDefaultContent(type),
      attributes: getDefaultAttributes(type),
    };

    if (afterIndex !== undefined) {
      const newBlocks = [...blocks];
      newBlocks.splice(afterIndex + 1, 0, newBlock);
      setBlocks(newBlocks);
    } else {
      setBlocks([...blocks, newBlock]);
    }
  };

  // 기본 콘텐츠 생성
  const getDefaultContent = (type: string) => {
    switch (type) {
      case 'core/heading': return { text: '새 제목' };
      case 'core/paragraph': return { text: '새 문단을 입력하세요.' };
      case 'core/button': return { text: '버튼 텍스트', url: '#' };
      case 'core/quote': return { value: '인용문을 입력하세요.', citation: '' };
      default: return { text: '' };
    }
  };

  // 기본 속성 생성
  const getDefaultAttributes = (type: string) => {
    switch (type) {
      case 'core/heading': return { level: 2 };
      case 'core/button': return { align: 'center' };
      default: return {};
    }
  };

  // 블록 콘텐츠 렌더링
  const renderBlockContent = (block: Block) => {
    if (editingBlock === block.id) {
      return (
        <div className="space-y-3">
          {block.type === 'core/heading' && (
            <div>
              <Label className="text-xs text-gray-500">제목 텍스트</Label>
              <Input
                value={editingContent.text || ''}
                onChange={(e) => setEditingContent({ ...editingContent, text: e.target.value })}
                placeholder="제목을 입력하세요"
              />
            </div>
          )}
          
          {block.type === 'core/paragraph' && (
            <div>
              <Label className="text-xs text-gray-500">본문 텍스트</Label>
              <Textarea
                value={editingContent.text || ''}
                onChange={(e) => setEditingContent({ ...editingContent, text: e.target.value })}
                placeholder="본문을 입력하세요"
                rows={3}
              />
            </div>
          )}
          
          {block.type === 'core/button' && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-gray-500">버튼 텍스트</Label>
                <Input
                  value={editingContent.text || ''}
                  onChange={(e) => setEditingContent({ ...editingContent, text: e.target.value })}
                  placeholder="버튼 텍스트"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">링크 URL</Label>
                <Input
                  value={editingContent.url || ''}
                  onChange={(e) => setEditingContent({ ...editingContent, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
          )}
          
          {block.type === 'core/quote' && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-gray-500">인용문</Label>
                <Textarea
                  value={editingContent.value || ''}
                  onChange={(e) => setEditingContent({ ...editingContent, value: e.target.value })}
                  placeholder="인용문을 입력하세요"
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">출처</Label>
                <Input
                  value={editingContent.citation || ''}
                  onChange={(e) => setEditingContent({ ...editingContent, citation: e.target.value })}
                  placeholder="출처 (선택사항)"
                />
              </div>
            </div>
          )}
          
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={saveBlockEdit}>
              <Save className="w-3 h-3 mr-1" />
              저장
            </Button>
            <Button size="sm" variant="outline" onClick={cancelBlockEdit}>
              <X className="w-3 h-3 mr-1" />
              취소
            </Button>
          </div>
        </div>
      );
    }

    // 일반 블록 내용 표시
    const content = block.content || {};
    switch (block.type) {
      case 'core/heading':
        return (
          <div>
            <h3 className="font-medium text-gray-900">
              {content.text || '제목 없음'}
            </h3>
            <Badge variant="secondary" className="text-xs mt-1">
              H{block.attributes?.level || 1}
            </Badge>
          </div>
        );
      
      case 'core/paragraph':
        return (
          <p className="text-gray-700 text-sm">
            {content.text || '내용 없음'}
          </p>
        );
      
      case 'core/button':
        return (
          <div className="inline-flex items-center gap-2">
            <Button size="sm" className="pointer-events-none">
              {content.text || '버튼'}
            </Button>
            {content.url && (
              <span className="text-xs text-gray-500">→ {content.url}</span>
            )}
          </div>
        );
      
      case 'core/quote':
        return (
          <blockquote className="border-l-4 border-gray-300 pl-3 text-sm">
            <p className="italic text-gray-700">"{content.value || '인용문 없음'}"</p>
            {content.citation && (
              <cite className="text-xs text-gray-500">— {content.citation}</cite>
            )}
          </blockquote>
        );
      
      case 'core/columns':
        return (
          <div className="text-sm text-gray-600">
            다단 레이아웃 ({block.innerBlocks?.length || 0}개 컬럼)
          </div>
        );
      
      default:
        return (
          <div className="text-sm text-gray-500">
            {getBlockTypeName(block.type)} 블록
          </div>
        );
    }
  };

  // 빠른 블록 추가 옵션
  const quickAddBlocks = [
    { type: 'core/heading', name: '제목' },
    { type: 'core/paragraph', name: '본문' },
    { type: 'core/button', name: '버튼' },
    { type: 'core/quote', name: '인용문' },
    { type: 'core/separator', name: '구분선' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>AI 생성 페이지 편집</DialogTitle>
          <DialogDescription>
            블록을 드래그하여 순서를 변경하거나 편집할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* 빠른 추가 버튼 */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <Label className="text-sm font-medium mb-2 block">빠른 블록 추가</Label>
            <div className="flex flex-wrap gap-2">
              {quickAddBlocks.map(({ type, name }) => (
                <Button
                  key={type}
                  size="sm"
                  variant="outline"
                  onClick={() => addNewBlock(type)}
                  className="text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {name}
                </Button>
              ))}
            </div>
          </div>

          {/* 블록 목록 */}
          <div className="overflow-y-auto max-h-[50vh]">
            <div className="space-y-3">
              {blocks.map((block, index) => (
                <Card
                  key={block.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`transition-all duration-200 ${
                    draggedIndex === index ? 'opacity-50 scale-95' : ''
                  } ${editingBlock === block.id ? 'ring-2 ring-blue-500' : ''} hover:shadow-md cursor-move`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="cursor-grab hover:cursor-grabbing p-1">
                          <GripVertical className="w-4 h-4 text-gray-400" />
                        </div>
                        {getBlockIcon(block.type)}
                        <CardTitle className="text-sm">
                          {getBlockTypeName(block.type)}
                        </CardTitle>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEditing(block.id)}
                          disabled={editingBlock === block.id}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteBlock(block.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    {renderBlockContent(block)}
                  </CardContent>
                </Card>
              ))}
            </div>

            {blocks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Square className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>블록이 없습니다. 위에서 블록을 추가해보세요.</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-gray-500">
              총 {blocks.length}개 블록
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button onClick={() => onSave(blocks)}>
                페이지에 적용
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};