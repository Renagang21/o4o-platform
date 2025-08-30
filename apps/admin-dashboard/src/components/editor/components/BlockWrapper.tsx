import { FC, useState } from 'react';
import { 
  GripVertical, 
  MoreVertical,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  Repeat
} from 'lucide-react';
import ParagraphBlock from '../blocks/ParagraphBlock';
import HeadingBlock from '../blocks/HeadingBlock';
import ImageBlock from '../blocks/ImageBlock';
import ListBlock from '../blocks/ListBlock';
import ButtonBlock from '../blocks/ButtonBlock';
// import QuoteBlock from '../blocks/QuoteBlock';
import { useBlockTransform } from '../hooks/useBlockTransform';
import type { Block, ThemeConfig } from '../types';

interface BlockWrapperProps {
  block: Block;
  blocks: Block[];
  setBlocks: React.Dispatch<React.SetStateAction<Block[]>>;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<Block>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  theme: ThemeConfig | null;
}

export const BlockWrapper: FC<BlockWrapperProps> = ({
  block,
  blocks,
  setBlocks,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDuplicate
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showTransformMenu, setShowTransformMenu] = useState(false);
  
  // 블록 변환 훅 사용
  const { getAvailableTransforms, transformBlock } = useBlockTransform(blocks, setBlocks);

  // 블록 타입별 컴포넌트 렌더링
  const renderBlock = () => {
    // Props for new-style components (ImageBlock, ButtonBlock, ListBlock)
    // const newStyleProps = {
    //   block,
    //   updateBlock: onUpdate,
    //   isSelected,
    // };

    // Props for old-style components (ParagraphBlock, HeadingBlock)
    const oldStyleProps = {
      id: block.id,
      content: block.content?.text || block.content || '',
      attributes: block.attributes as any, // Type compatibility with old components
      isSelected,
      onSelect,
      onChange: (content: any, attributes?: any) => {
        onUpdate({ content: typeof content === 'string' ? { text: content } : content, attributes });
      },
      onDelete,
      onDuplicate,
      onMoveUp,
      onMoveDown,
      onAddBlock: (_position: 'before' | 'after') => {
        // Add block logic would go here
        // Position: before or after current block
      }
    };

    switch (block.type) {
      case 'paragraph':
        return <ParagraphBlock {...oldStyleProps} />;
      case 'heading':
        return <HeadingBlock {...oldStyleProps} />;
      case 'image':
        return <ImageBlock {...oldStyleProps} />;
      case 'list':
        return <ListBlock {...oldStyleProps} />;
      case 'button':
        return <ButtonBlock {...oldStyleProps} />;
      case 'quote':
        return (
          <div className="p-4 bg-gray-100 rounded text-gray-500">
            Quote block (legacy component, use new editor instead)
          </div>
        );
      default:
        return (
          <div className="p-4 bg-gray-100 rounded text-gray-500">
            알 수 없는 블록 타입: {block.type}
          </div>
        );
    }
  };

  return (
    <div 
      className={`
        block-wrapper group relative transition-all
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        hover:shadow-sm
      `}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* 블록 툴바 - 선택되거나 호버 시 표시 */}
      <div className={`
        block-toolbar absolute -top-9 left-0 flex items-center gap-1 bg-white border border-gray-200 rounded shadow-sm
        ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
        transition-opacity z-10
      `}>
        {/* 드래그 핸들 */}
        <button 
          className="p-1.5 hover:bg-gray-100 cursor-move"
          title="드래그하여 이동"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </button>

        {/* 위로 이동 */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp();
          }}
          className="p-1.5 hover:bg-gray-100"
          title="위로 이동"
        >
          <ChevronUp className="w-4 h-4 text-gray-600" />
        </button>

        {/* 아래로 이동 */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown();
          }}
          className="p-1.5 hover:bg-gray-100"
          title="아래로 이동"
        >
          <ChevronDown className="w-4 h-4 text-gray-600" />
        </button>

        {/* 복제 */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="p-1.5 hover:bg-gray-100"
          title="복제"
        >
          <Copy className="w-4 h-4 text-gray-600" />
        </button>

        {/* 삭제 */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 hover:bg-gray-100 text-red-600"
          title="삭제"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* 더보기 메뉴 */}
        <div className="relative">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1.5 hover:bg-gray-100"
            title="옵션"
          >
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>

          {showMenu && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded shadow-lg z-20">
              {/* 블록 변환 메뉴 */}
              {getAvailableTransforms(block.type).length > 0 && (
                <>
                  <button 
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm flex items-center justify-between"
                    onClick={() => {
                      setShowTransformMenu(!showTransformMenu);
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <Repeat className="w-4 h-4" />
                      블록 변환
                    </span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  
                  {showTransformMenu && (
                    <div className="pl-4 bg-gray-50">
                      {getAvailableTransforms(block.type).map(targetType => (
                        <button
                          key={targetType}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                          onClick={() => {
                            transformBlock(block.id, targetType);
                            setShowMenu(false);
                            setShowTransformMenu(false);
                          }}
                        >
                          {targetType === 'paragraph' && '단락으로'}
                          {targetType === 'heading' && '제목으로'}
                          {targetType === 'list' && '목록으로'}
                          {targetType === 'quote' && '인용구로'}
                        </button>
                      ))}
                    </div>
                  )}
                  <hr className="my-1" />
                </>
              )}
              
              <button className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm">
                그룹으로 만들기
              </button>
              <hr className="my-1" />
              <button className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm">
                HTML로 편집
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 블록 콘텐츠 */}
      <div className="block-content">
        {renderBlock()}
      </div>
    </div>
  );
};