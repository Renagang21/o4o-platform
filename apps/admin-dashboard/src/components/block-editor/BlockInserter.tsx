import React, { useState } from 'react';
import { useBlockEditorStore } from '@/stores/block-editor-store';
import { blockRegistry } from '@/lib/block-registry';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Plus } from 'lucide-react';

interface BlockInserterProps {
  position?: number;
  onInsert?: () => void;
  onCancel?: () => void;
}

export const BlockInserter: React.FC<BlockInserterProps> = ({
  position,
  onInsert,
  onCancel
}) => {
  const { addBlock } = useBlockEditorStore();
  const [isOpen, setIsOpen] = useState(false);

  const handleInsertBlock = (type: string) => {
    addBlock(type, position);
    setIsOpen(false);
    onInsert?.();
  };

  // 레지스트리에서 블록 목록 가져오기
  const allBlocks = blockRegistry.getAllBlocks();
  const textBlocks = allBlocks.filter(block => block.category === 'text');
  const mediaBlocks = allBlocks.filter(block => block.category === 'media');
  const designBlocks = allBlocks.filter(block => block.category === 'design');
  const widgetBlocks = allBlocks.filter(block => block.category === 'widgets');

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          블록 추가
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        {/* 텍스트 블록 */}
        {textBlocks.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
              텍스트
            </div>
            {textBlocks.map((block) => {
              const Icon = block.icon;
              return (
                <DropdownMenuItem 
                  key={block.name}
                  onClick={() => handleInsertBlock(block.name)}
                  className="flex items-center"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  <div>
                    <div className="font-medium">{block.title}</div>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </>
        )}

        {/* 미디어 블록 */}
        {mediaBlocks.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
              미디어
            </div>
            {mediaBlocks.map((block) => {
              const Icon = block.icon;
              return (
                <DropdownMenuItem 
                  key={block.name}
                  onClick={() => handleInsertBlock(block.name)}
                  className="flex items-center"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  <div>
                    <div className="font-medium">{block.title}</div>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </>
        )}

        {/* 기타 카테고리들도 동일하게 추가 가능 */}
        {(designBlocks.length > 0 || widgetBlocks.length > 0) && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
              기타
            </div>
            {[...designBlocks, ...widgetBlocks].map((block) => {
              const Icon = block.icon;
              return (
                <DropdownMenuItem 
                  key={block.name}
                  onClick={() => handleInsertBlock(block.name)}
                  className="flex items-center"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  <div>
                    <div className="font-medium">{block.title}</div>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </>
        )}

        {/* 블록이 없을 때 */}
        {allBlocks.length === 0 && (
          <DropdownMenuItem disabled>
            사용 가능한 블록이 없습니다.
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};