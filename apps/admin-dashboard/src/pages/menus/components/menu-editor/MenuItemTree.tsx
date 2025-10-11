import { FC, useState, useMemo, useCallback, memo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronRight,
  ChevronDown,
  GripVertical,
  MoreVertical,
  Copy,
  Trash2,
  FileText,
  Link2,
  Folder,
  Tag as TagIcon
} from 'lucide-react';
import type { MenuItemTree as MenuItemTreeType } from '../../utils/menu-tree-helpers';
import { getAllItemIds } from '../../utils/menu-tree-helpers';

export interface MenuItemTreeProps {
  items: MenuItemTreeType[];
  selected?: string | null;
  onSelect: (id: string) => void;
  onReorder: (items: MenuItemTreeType[]) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
}

interface SortableMenuItemProps {
  item: MenuItemTreeType;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
}

/**
 * Get icon based on item type
 */
const getTypeIcon = (type: string) => {
  switch (type) {
    case 'page':
      return <FileText className="w-4 h-4 text-blue-500" />;
    case 'post':
      return <FileText className="w-4 h-4 text-green-500" />;
    case 'category':
      return <Folder className="w-4 h-4 text-yellow-500" />;
    case 'tag':
      return <TagIcon className="w-4 h-4 text-purple-500" />;
    case 'custom':
      return <Link2 className="w-4 h-4 text-gray-500" />;
    default:
      return <Link2 className="w-4 h-4 text-gray-500" />;
  }
};

/**
 * Sortable Menu Item Node
 * Uses @dnd-kit for drag and drop
 */
const SortableMenuItem = memo<SortableMenuItemProps>(({
  item,
  depth,
  selectedId,
  onSelect,
  onToggle,
  onDuplicate,
  onDelete
}) => {
  const [showActions, setShowActions] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const isSelected = item.id === selectedId;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Item Row */}
      <div
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={hasChildren ? item.isOpen : undefined}
        aria-label={`${item.title} ${item.type}`}
        tabIndex={0}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
          isSelected
            ? 'bg-blue-100 border border-blue-300'
            : 'hover:bg-gray-100 border border-transparent'
        }`}
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
        onClick={() => onSelect(item.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(item.id);
          } else if (e.key === 'Delete' && onDelete) {
            e.preventDefault();
            onDelete(item.id);
          } else if (e.key === 'Escape') {
            e.currentTarget.blur();
          }
        }}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-move text-gray-400 hover:text-gray-600 touch-none"
          title="드래그하여 이동"
          aria-label="드래그하여 이동"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Toggle Button */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(item.id);
            }}
            className="text-gray-500 hover:text-gray-700"
            aria-label={item.isOpen ? "하위 항목 접기" : "하위 항목 펼치기"}
          >
            {item.isOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : (
          <div className="w-4" />
        )}

        {/* Type Icon */}
        {getTypeIcon(item.type)}

        {/* Title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 truncate">{item.title}</span>
            {item.target === '_blank' && (
              <span className="text-xs text-gray-500" title="새 창에서 열기">
                ↗
              </span>
            )}
          </div>
          {item.url && (
            <div className="text-xs text-gray-500 truncate" title={item.url}>
              {item.url}
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-1">
            {onDuplicate && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(item.id);
                }}
                className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                title="복제"
                aria-label={`${item.title} 복제`}
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
                className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                title="삭제"
                aria-label={`${item.title} 삭제`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              className="p-1 text-gray-500 hover:text-gray-700"
              title="더보기"
              aria-label="더 많은 옵션"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && item.isOpen && (
        <div className="mt-1">
          {item.children!.map((child) => (
            <SortableMenuItem
              key={child.id}
              item={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onToggle={onToggle}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
});

SortableMenuItem.displayName = 'SortableMenuItem';

/**
 * Menu Item Tree Component
 * Displays hierarchical menu structure with drag-and-drop support
 */
export const MenuItemTree: FC<MenuItemTreeProps> = ({
  items,
  selected,
  onSelect,
  onReorder,
  onDuplicate,
  onDelete
}) => {
  const [localItems, setLocalItems] = useState(items);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Setup sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  );

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    // Find active and over items
    const activeItem = findItemById(localItems, active.id as string);
    const overItem = findItemById(localItems, over.id as string);

    if (!activeItem || !overItem) {
      return;
    }

    // Simple reordering logic - move active item next to over item
    const newItems = reorderItems(localItems, active.id as string, over.id as string);
    setLocalItems(newItems);
    onReorder(newItems);
  }, [localItems, onReorder]);

  // Handle toggle open/closed
  const handleToggle = useCallback((id: string) => {
    const newItems = toggleInTree(localItems, id);
    setLocalItems(newItems);
    onReorder(newItems);
  }, [localItems, onReorder]);

  // Expand all items
  const expandAll = useCallback(() => {
    const newItems = expandInTree(localItems);
    setLocalItems(newItems);
    onReorder(newItems);
  }, [localItems, onReorder]);

  // Collapse all items
  const collapseAll = useCallback(() => {
    const newItems = collapseInTree(localItems);
    setLocalItems(newItems);
    onReorder(newItems);
  }, [localItems, onReorder]);

  // Sync with props
  if (JSON.stringify(items) !== JSON.stringify(localItems)) {
    setLocalItems(items);
  }

  // Get all item IDs for SortableContext (memoized)
  const itemIds = useMemo(() => getAllItemIds(items), [items]);

  // Find active item for drag overlay
  const activeItem = activeId ? findItemById(localItems, activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">메뉴 구조</h2>
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="text-sm text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50"
            >
              모두 펼치기
            </button>
            <button
              onClick={collapseAll}
              className="text-sm text-gray-600 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
            >
              모두 접기
            </button>
          </div>
        </div>

        {/* Tree */}
        <div className="p-4">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-2">
                <FileText className="w-12 h-12 mx-auto" />
              </div>
              <p className="text-gray-500 text-sm">메뉴 항목이 없습니다</p>
              <p className="text-gray-400 text-xs mt-1">
                오른쪽에서 항목을 선택하여 추가하세요
              </p>
            </div>
          ) : (
            <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
              <div role="tree" aria-label="메뉴 항목 트리" className="space-y-1">
                {items.map((item) => (
                  <SortableMenuItem
                    key={item.id}
                    item={item}
                    depth={0}
                    selectedId={selected || null}
                    onSelect={onSelect}
                    onToggle={handleToggle}
                    onDuplicate={onDuplicate}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </div>

        {/* Footer Info */}
        {items.length > 0 && (
          <div className="px-4 py-3 border-t bg-gray-50 text-xs text-gray-500">
            총 {items.length}개 항목
            {selected && ' • 항목을 클릭하여 편집'}
          </div>
        )}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeItem ? (
          <div className="bg-white rounded-lg shadow-lg border-2 border-blue-400 px-3 py-2">
            <div className="flex items-center gap-2">
              {getTypeIcon(activeItem.type)}
              <span className="text-sm font-medium text-gray-900">{activeItem.title}</span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

// Helper functions

function findItemById(items: MenuItemTreeType[], id: string): MenuItemTreeType | null {
  for (const item of items) {
    if (item.id === id) {
      return item;
    }
    if (item.children && item.children.length > 0) {
      const found = findItemById(item.children, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

function reorderItems(
  items: MenuItemTreeType[],
  activeId: string,
  overId: string
): MenuItemTreeType[] {
  // Find active and over items
  const activeItem = findItemById(items, activeId);
  if (!activeItem) return items;

  // Remove active item from tree
  const withoutActive = removeItem(items, activeId);

  // Insert active item next to over item
  return insertItemNear(withoutActive, activeItem, overId);
}

function removeItem(items: MenuItemTreeType[], id: string): MenuItemTreeType[] {
  return items
    .filter((item) => item.id !== id)
    .map((item) => {
      if (item.children && item.children.length > 0) {
        return {
          ...item,
          children: removeItem(item.children, id)
        };
      }
      return item;
    });
}

function insertItemNear(
  items: MenuItemTreeType[],
  activeItem: MenuItemTreeType,
  overId: string
): MenuItemTreeType[] {
  const result: MenuItemTreeType[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // If this is the over item, insert active item after it
    if (item.id === overId) {
      result.push(item);
      result.push(activeItem);
      continue;
    }

    // Check children
    if (item.children && item.children.length > 0) {
      const hasOverInChildren = findItemById(item.children, overId);
      if (hasOverInChildren) {
        result.push({
          ...item,
          children: insertItemNear(item.children, activeItem, overId)
        });
        continue;
      }
    }

    result.push(item);
  }

  return result;
}

function toggleInTree(items: MenuItemTreeType[], id: string): MenuItemTreeType[] {
  return items.map((item) => {
    if (item.id === id) {
      return { ...item, isOpen: !item.isOpen };
    }
    if (item.children && item.children.length > 0) {
      return { ...item, children: toggleInTree(item.children, id) };
    }
    return item;
  });
}

function expandInTree(items: MenuItemTreeType[]): MenuItemTreeType[] {
  return items.map((item) => ({
    ...item,
    isOpen: true,
    children: item.children ? expandInTree(item.children) : undefined
  }));
}

function collapseInTree(items: MenuItemTreeType[]): MenuItemTreeType[] {
  return items.map((item) => ({
    ...item,
    isOpen: false,
    children: item.children ? collapseInTree(item.children) : undefined
  }));
}
