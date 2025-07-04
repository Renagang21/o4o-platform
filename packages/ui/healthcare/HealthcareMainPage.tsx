import React, { useState, useCallback } from 'react';
import { 
  HealthcareBlock, 
  HeroBlockData, 
  ExpertContentBlockData, 
  ProductListBlockData, 
  TrendingBlockData, 
  BusinessBannersBlockData, 
  CommunityBannerBlockData,
  DragDropState,
  EditorMode,
  BlockActions
} from './types';
import { heroSectionData, expertContents, recommendedProducts, trendingIssues, businessBanners, communityBanner } from './sampleData';
import { HeroSectionBlock } from './blocks/HeroSectionBlock';
import { ExpertContentBlock } from './blocks/ExpertContentBlock';
import { ProductListBlock } from './blocks/ProductListBlock';
import { TrendingIssuesBlock } from './blocks/TrendingIssuesBlock';
import { BusinessBannersBlock } from './blocks/BusinessBannersBlock';
import { CommunityBannerBlock } from './blocks/CommunityBannerBlock';
import { Button } from '@o4o/shared/ui';
import { Edit3, Eye, EyeOff, Move, Trash2, Copy, Settings } from 'lucide-react';

interface HealthcareMainPageProps {
  isEditing?: boolean;
  onToggleEdit?: () => void;
}

export const HealthcareMainPage: React.FC<HealthcareMainPageProps> = ({
  isEditing = false,
  onToggleEdit
}) => {
  const [dragState, setDragState] = useState<DragDropState>({
    draggedIndex: null,
    draggedOverIndex: null
  });

  const [editorMode, setEditorMode] = useState<EditorMode>({
    isEditing: isEditing,
    selectedBlock: undefined
  });

  // Initialize default blocks with sample data
  const [blocks, setBlocks] = useState<HealthcareBlock[]>([
    {
      id: 'hero-1',
      type: 'hero',
      order: 0,
      visible: true,
      mobileVisible: true,
      data: heroSectionData as HeroBlockData
    },
    {
      id: 'expert-1',
      type: 'expert-content',
      order: 1,
      visible: true,
      mobileVisible: true,
      data: {
        title: '전문가 추천 콘텐츠',
        subtitle: '검증된 의료진과 전문가들의 건강 정보',
        contentIds: expertContents.map(c => c.id),
        layout: 'grid',
        showCount: 4
      } as ExpertContentBlockData
    },
    {
      id: 'product-recommended',
      type: 'product-list',
      order: 2,
      visible: true,
      mobileVisible: true,
      data: {
        title: '추천 제품',
        subtitle: '전문가가 선별한 믿을 수 있는 건강 제품',
        productIds: recommendedProducts.map(p => p.id),
        layout: 'grid',
        columns: 4,
        showPrice: true,
        showRating: true,
        productType: 'recommended'
      } as ProductListBlockData
    },
    {
      id: 'trending-1',
      type: 'trending',
      order: 3,
      visible: true,
      mobileVisible: true,
      data: {
        title: '트렌딩 건강 이슈',
        subtitle: '지금 가장 주목받는 건강 정보',
        issueIds: trendingIssues.map(t => t.id),
        layout: 'grid',
        showRelatedProducts: true
      } as TrendingBlockData
    },
    {
      id: 'community-1',
      type: 'community-banner',
      order: 4,
      visible: true,
      mobileVisible: true,
      data: {
        bannerId: communityBanner.id,
        position: 'middle',
        showRecentQA: true,
        qaCount: 3
      } as CommunityBannerBlockData
    },
    {
      id: 'product-new',
      type: 'product-list',
      order: 5,
      visible: true,
      mobileVisible: true,
      data: {
        title: '신제품',
        subtitle: '혁신적인 기술로 만든 최신 건강 제품',
        productIds: ['new-1', 'new-2', 'new-3', 'new-4'],
        layout: 'horizontal-scroll',
        columns: 4,
        showPrice: true,
        showRating: true,
        productType: 'new'
      } as ProductListBlockData
    },
    {
      id: 'business-1',
      type: 'business-banners',
      order: 6,
      visible: true,
      mobileVisible: false,
      data: {
        bannerIds: businessBanners.map(b => b.id),
        layout: 'horizontal',
        spacing: 'normal'
      } as BusinessBannersBlockData
    }
  ]);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragState({ draggedIndex: index, draggedOverIndex: null });
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragState.draggedIndex !== null && dragState.draggedIndex !== index) {
      setDragState(prev => ({ ...prev, draggedOverIndex: index }));
    }
  }, [dragState.draggedIndex]);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const { draggedIndex } = dragState;
    
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      const newBlocks = [...blocks];
      const draggedBlock = newBlocks[draggedIndex];
      
      // Remove the dragged block
      newBlocks.splice(draggedIndex, 1);
      
      // Insert at new position
      const insertIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
      newBlocks.splice(insertIndex, 0, draggedBlock);
      
      // Update order
      const updatedBlocks = newBlocks.map((block, index) => ({
        ...block,
        order: index
      }));
      
      setBlocks(updatedBlocks);
    }
    
    setDragState({ draggedIndex: null, draggedOverIndex: null });
  }, [blocks, dragState]);

  const handleDragEnd = useCallback(() => {
    setDragState({ draggedIndex: null, draggedOverIndex: null });
  }, []);

  const blockActions: BlockActions = {
    onMove: (fromIndex: number, toIndex: number) => {
      const newBlocks = [...blocks];
      const movedBlock = newBlocks.splice(fromIndex, 1)[0];
      newBlocks.splice(toIndex, 0, movedBlock);
      
      const updatedBlocks = newBlocks.map((block, index) => ({
        ...block,
        order: index
      }));
      
      setBlocks(updatedBlocks);
    },
    onEdit: (blockId: string, data: any) => {
      setBlocks(prev => prev.map(block => 
        block.id === blockId ? { ...block, data } : block
      ));
    },
    onDelete: (blockId: string) => {
      setBlocks(prev => prev.filter(block => block.id !== blockId));
    },
    onToggleVisibility: (blockId: string) => {
      setBlocks(prev => prev.map(block => 
        block.id === blockId ? { ...block, visible: !block.visible } : block
      ));
    },
    onDuplicate: (blockId: string) => {
      const blockToDuplicate = blocks.find(b => b.id === blockId);
      if (blockToDuplicate) {
        const newBlock: HealthcareBlock = {
          ...blockToDuplicate,
          id: `${blockToDuplicate.id}-copy-${Date.now()}`,
          order: blockToDuplicate.order + 1
        };
        
        const newBlocks = [...blocks];
        newBlocks.splice(blockToDuplicate.order + 1, 0, newBlock);
        
        const updatedBlocks = newBlocks.map((block, index) => ({
          ...block,
          order: index
        }));
        
        setBlocks(updatedBlocks);
      }
    }
  };

  const renderBlock = (block: HealthcareBlock, index: number) => {
    if (!block.visible) return null;

    const isDragged = dragState.draggedIndex === index;
    const isDraggedOver = dragState.draggedOverIndex === index;
    
    const blockElement = (() => {
      switch (block.type) {
        case 'hero':
          return (
            <HeroSectionBlock
              data={block.data as HeroBlockData}
              isEditing={editorMode.isEditing}
              onEdit={(data) => blockActions.onEdit(block.id, data)}
            />
          );
        case 'expert-content':
          return (
            <ExpertContentBlock
              data={block.data as ExpertContentBlockData}
              isEditing={editorMode.isEditing}
              onEdit={(data) => blockActions.onEdit(block.id, data)}
            />
          );
        case 'product-list':
          return (
            <ProductListBlock
              data={block.data as ProductListBlockData}
              isEditing={editorMode.isEditing}
              onEdit={(data) => blockActions.onEdit(block.id, data)}
            />
          );
        case 'trending':
          return (
            <TrendingIssuesBlock
              data={block.data as TrendingBlockData}
              isEditing={editorMode.isEditing}
              onEdit={(data) => blockActions.onEdit(block.id, data)}
            />
          );
        case 'business-banners':
          return (
            <BusinessBannersBlock
              data={block.data as BusinessBannersBlockData}
              isEditing={editorMode.isEditing}
              onEdit={(data) => blockActions.onEdit(block.id, data)}
            />
          );
        case 'community-banner':
          return (
            <CommunityBannerBlock
              data={block.data as CommunityBannerBlockData}
              isEditing={editorMode.isEditing}
              onEdit={(data) => blockActions.onEdit(block.id, data)}
            />
          );
        default:
          return null;
      }
    })();

    if (!editorMode.isEditing) {
      return <div key={block.id}>{blockElement}</div>;
    }

    return (
      <div
        key={block.id}
        className={`relative group ${isDragged ? 'opacity-50' : ''} ${isDraggedOver ? 'ring-2 ring-blue-500' : ''}`}
        draggable={editorMode.isEditing}
        onDragStart={(e) => handleDragStart(e, index)}
        onDragOver={(e) => handleDragOver(e, index)}
        onDrop={(e) => handleDrop(e, index)}
        onDragEnd={handleDragEnd}
      >
        {editorMode.isEditing && (
          <div className="absolute top-4 right-4 z-50 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex gap-2 bg-white shadow-lg rounded-lg p-2 border">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => blockActions.onToggleVisibility(block.id)}
                title={block.visible ? '숨기기' : '보이기'}
              >
                {block.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => blockActions.onDuplicate(block.id)}
                title="복제"
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="cursor-move"
                title="이동"
              >
                <Move className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => blockActions.onDelete(block.id)}
                title="삭제"
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
        {blockElement}
      </div>
    );
  };

  const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-white">
      {/* Editor Controls */}
      {onToggleEdit && (
        <div className="fixed top-4 left-4 z-50">
          <Button
            onClick={() => {
              onToggleEdit();
              setEditorMode(prev => ({ ...prev, isEditing: !prev.isEditing }));
            }}
            variant={editorMode.isEditing ? "default" : "outline"}
            className="shadow-lg"
          >
            {editorMode.isEditing ? (
              <>
                <Eye className="w-4 h-4 mr-2" />
                미리보기
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4 mr-2" />
                편집 모드
              </>
            )}
          </Button>
        </div>
      )}

      {/* Page Content */}
      <main>
        {sortedBlocks.map((block, index) => renderBlock(block, index))}
      </main>

      {/* Editor Instructions */}
      {editorMode.isEditing && (
        <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 border max-w-sm">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold">편집 모드</h3>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• 블록을 드래그해서 순서 변경</p>
            <p>• 각 블록 우측 상단의 버튼으로 편집</p>
            <p>• '편집' 버튼을 클릭해서 내용 수정</p>
            <p>• 눈 아이콘으로 표시/숨김 토글</p>
          </div>
        </div>
      )}
    </div>
  );
};