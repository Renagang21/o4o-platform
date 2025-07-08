import React from 'react';
import { BlockType } from '@/types/block-editor';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Copy, ArrowUp, ArrowDown, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface BlockToolbarProps {
  block: BlockType;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  className?: string;
}

export const BlockToolbar: React.FC<BlockToolbarProps> = ({
  block,
  isEditing,
  onEdit,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  className = ''
}) => {
  return (
    <div className={`flex items-center gap-1 bg-white border border-gray-200 rounded-md shadow-sm p-1 ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={onEdit}
        className="h-6 px-2"
      >
        <Edit className="w-3 h-3" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onDuplicate}
        className="h-6 px-2"
      >
        <Copy className="w-3 h-3" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2">
            <MoreVertical className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {onMoveUp && (
            <DropdownMenuItem onClick={onMoveUp}>
              <ArrowUp className="w-4 h-4 mr-2" />
              위로 이동
            </DropdownMenuItem>
          )}
          {onMoveDown && (
            <DropdownMenuItem onClick={onMoveDown}>
              <ArrowDown className="w-4 h-4 mr-2" />
              아래로 이동
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onDelete} className="text-red-600">
            <Trash2 className="w-4 h-4 mr-2" />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};