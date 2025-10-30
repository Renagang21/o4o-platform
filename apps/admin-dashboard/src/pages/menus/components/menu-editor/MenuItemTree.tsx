import { FC, useState, useMemo, useCallback, memo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
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
  ChevronLeft,
  GripVertical,
  MoreVertical,
  Copy,
  Trash2,
  FileText,
  Link2,
  Folder,
  Tag as TagIcon,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import type { MenuItemTree as MenuItemTreeType } from '../../utils/menu-tree-helpers';
import {
  getAllItemIds,
  findItemById as findItemByIdHelper,
  findParentById,
  getTreeDepth
} from '../../utils/menu-tree-helpers';

// 최대 메뉴 깊이 제한 (1단계 = 루트, 2단계 = 서브메뉴)
const MAX_DEPTH = 2;
const INDENT_WIDTH = 40; // 들여쓰기 픽셀 너비

export interface MenuItemTreeProps {
  items: MenuItemTreeType[];
  selected?: string | null;
  onSelect: (id: string) => void;
  onReorder: (items: MenuItemTreeType[]) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onIndent?: (id: string) => void;
  onOutdent?: (id: string) => void;
}

interface SortableMenuItemProps {
  item: MenuItemTreeType;
  depth: number;
  selectedId: string | null;
  dropIndicator: DropIndicator | null;
  allItems: MenuItemTreeType[];  // 전체 트리 (부모 찾기용)
  index: number;  // 형제 중 인덱스
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onIndent?: (id: string) => void;
  onOutdent?: (id: string) => void;
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
  dropIndicator,
  allItems,
  index,
  onSelect,
  onToggle,
  onDuplicate,
  onDelete,
  onIndent,
  onOutdent
}) => {
  const [showActions, setShowActions] = useState(false);
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
  const isSelected = item.id === selectedId;

  // 들여쓰기/내어쓰기 가능 여부 계산
  const canIndent = index > 0 && depth < MAX_DEPTH - 1;  // 첫 항목이 아니고 최대 깊이 미만
  const canOutdent = depth > 0;  // 최상위가 아님

  // Drop indicator 계산
  const isDropTarget = dropIndicator?.overId === item.id;
  const dropDepth = dropIndicator?.depth || 0;
  const dropPosition = dropIndicator?.position || 'after';

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
      {/* Drop Indicator - Before */}
      {isDropTarget && dropPosition === 'before' && (
        <div
          className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 z-10"
          style={{ marginLeft: `${(depth + dropDepth) * 24}px` }}
        >
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full -ml-1" />
        </div>
      )}

      {/* Drop Indicator - Inside (자식으로) */}
      {isDropTarget && dropDepth === 1 && (
        <div className="absolute inset-0 bg-blue-100 border-2 border-blue-400 rounded-lg pointer-events-none z-10" />
      )}
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
            {/* 내어쓰기 버튼 */}
            {onOutdent && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (canOutdent) {
                    onOutdent(item.id);
                  }
                }}
                disabled={!canOutdent}
                className={`p-1.5 rounded transition-colors ${
                  canOutdent
                    ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer'
                    : 'text-gray-300 cursor-not-allowed'
                }`}
                title={canOutdent ? "내어쓰기 (레벨 올리기)" : "내어쓰기 불가 (최상위 레벨)"}
                aria-label={`${item.title} 내어쓰기`}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            {/* 들여쓰기 버튼 */}
            {onIndent && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (canIndent) {
                    onIndent(item.id);
                  }
                }}
                disabled={!canIndent}
                className={`p-1.5 rounded transition-colors ${
                  canIndent
                    ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer'
                    : 'text-gray-300 cursor-not-allowed'
                }`}
                title={
                  !canIndent && index === 0
                    ? "들여쓰기 불가 (첫 번째 항목)"
                    : !canIndent && depth >= MAX_DEPTH - 1
                    ? `들여쓰기 불가 (최대 ${MAX_DEPTH}단계)`
                    : "들여쓰기 (하위 항목으로)"
                }
                aria-label={`${item.title} 들여쓰기`}
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

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
      {hasChildren && item.isOpen && Array.isArray(item.children) && (
        <div className="mt-1">
          {item.children.map((child, childIndex) => (
            <SortableMenuItem
              key={child.id}
              item={child}
              depth={depth + 1}
              selectedId={selectedId}
              dropIndicator={dropIndicator}
              allItems={allItems}
              index={childIndex}
              onSelect={onSelect}
              onToggle={onToggle}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onIndent={onIndent}
              onOutdent={onOutdent}
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
// Drop indicator 상태 타입
interface DropIndicator {
  overId: string;
  depth: number; // 0 = same level, 1 = child, -1 = parent
  position: 'before' | 'after' | 'inside';
}

export const MenuItemTree: FC<MenuItemTreeProps> = ({
  items,
  selected,
  onSelect,
  onReorder,
  onDuplicate,
  onDelete,
  onIndent,
  onOutdent
}) => {
  const [localItems, setLocalItems] = useState(items);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);

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

  // Handle drag over - 실시간 드롭 위치 표시
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over, delta } = event;

    if (!over || active.id === over.id) {
      setDropIndicator(null);
      return;
    }

    // 마우스 X축 이동량으로 들여쓰기 레벨 계산
    const indentLevel = Math.floor(delta.x / INDENT_WIDTH);
    const clampedIndent = Math.max(-1, Math.min(1, indentLevel)); // -1, 0, 1로 제한

    // Drop 위치 계산
    let position: 'before' | 'after' | 'inside' = 'after';

    if (clampedIndent === 1) {
      // 오른쪽으로 드래그 -> 자식으로 만들기
      position = 'inside';
    } else if (delta.y < 0) {
      position = 'before';
    }

    setDropIndicator({
      overId: over.id as string,
      depth: clampedIndent,
      position
    });
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      setDropIndicator(null);
      return;
    }

    // Find active and over items
    const activeItem = findItemByIdHelper(localItems, active.id as string);
    const overItem = findItemByIdHelper(localItems, over.id as string);

    if (!activeItem || !overItem) {
      setDropIndicator(null);
      return;
    }

    // 계층 구조 변경 로직
    let newItems = [...localItems];
    let success = true;

    if (dropIndicator) {
      const { depth, position } = dropIndicator;

      if (position === 'inside' && depth === 1) {
        // 자식으로 만들기
        const overDepth = getItemDepth(localItems, over.id as string);
        const activeDepth = getItemDepth(localItems, active.id as string);

        // 최대 깊이 검증: over의 깊이 + active의 하위 깊이 확인
        const activeTreeDepth = getTreeDepth([activeItem]);

        if (overDepth + activeTreeDepth + 1 > MAX_DEPTH) {
          console.warn(`최대 ${MAX_DEPTH}단계까지만 지원합니다`);
          success = false;
        } else {
          newItems = makeChildOf(localItems, active.id as string, over.id as string);
        }
      } else if (depth === -1) {
        // 부모 레벨로 올리기
        const parent = findParentById(localItems, over.id as string);
        if (parent) {
          newItems = makeSiblingOf(localItems, active.id as string, parent.id);
        } else {
          // 이미 최상위 레벨
          newItems = reorderItems(localItems, active.id as string, over.id as string);
        }
      } else {
        // 같은 레벨에서 순서 변경
        newItems = reorderItems(localItems, active.id as string, over.id as string);
      }
    } else {
      // 기본: 같은 레벨 순서 변경
      newItems = reorderItems(localItems, active.id as string, over.id as string);
    }

    setDropIndicator(null);

    if (success) {
      setLocalItems(newItems);
      onReorder(newItems);
    }
  }, [localItems, onReorder, dropIndicator]);

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

  // Handle indent - 항목을 이전 형제의 자식으로 만들기
  const handleIndent = useCallback((id: string) => {
    // 부모에서 전달된 onIndent가 있으면 사용
    if (onIndent) {
      onIndent(id);
      return;
    }

    // Find the item and determine its siblings and index
    const findItemContext = (
      items: MenuItemTreeType[],
      targetId: string
    ): { item: MenuItemTreeType | null; siblings: MenuItemTreeType[]; index: number } | null => {
      for (let i = 0; i < items.length; i++) {
        if (items[i].id === targetId) {
          return { item: items[i], siblings: items, index: i };
        }
        if (Array.isArray(items[i].children) && items[i].children!.length > 0) {
          const result = findItemContext(items[i].children!, targetId);
          if (result) return result;
        }
      }
      return null;
    };

    const context = findItemContext(localItems, id);

    if (!context || context.index === 0) {
      // 첫 번째 항목이거나 찾을 수 없음
      return;
    }

    const { item, siblings, index } = context;
    const previousSibling = siblings[index - 1];

    // Check depth limit
    const currentDepth = getItemDepth(localItems, id);
    const itemTreeDepth = getTreeDepth([item]);

    if (currentDepth + itemTreeDepth >= MAX_DEPTH) {
      console.warn(`최대 ${MAX_DEPTH}단계까지만 지원합니다`);
      return;
    }

    // Move item to be child of previous sibling
    const newItems = makeChildOf(localItems, id, previousSibling.id);
    setLocalItems(newItems);
    onReorder(newItems);
  }, [localItems, onReorder, onIndent]);

  // Handle outdent - 항목을 부모와 같은 레벨로 올리기
  const handleOutdent = useCallback((id: string) => {
    // 부모에서 전달된 onOutdent가 있으면 사용
    if (onOutdent) {
      onOutdent(id);
      return;
    }

    // Find parent
    const parent = findParentById(localItems, id);

    if (!parent) {
      // Already at root level
      return;
    }

    // Move item to be sibling of parent (right after parent)
    const item = findItemByIdHelper(localItems, id);
    if (!item) return;

    // Find grandparent to get the correct parent_id for the new level
    const grandParent = findParentById(localItems, parent.id);
    const newParentId = grandParent?.id;

    // Remove from current location
    const withoutItem = removeItem(localItems, id);

    // Insert after parent with correct parent_id
    const newItems = insertItemNear(withoutItem, item, parent.id, newParentId);

    setLocalItems(newItems);
    onReorder(newItems);
  }, [localItems, onReorder, onOutdent]);

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
      onDragOver={handleDragOver}
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
                {items.map((item, index) => (
                  <SortableMenuItem
                    key={item.id}
                    item={item}
                    depth={0}
                    selectedId={selected || null}
                    dropIndicator={dropIndicator}
                    allItems={items}
                    index={index}
                    onSelect={onSelect}
                    onToggle={handleToggle}
                    onDuplicate={onDuplicate}
                    onDelete={onDelete}
                    onIndent={handleIndent}
                    onOutdent={handleOutdent}
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

/**
 * Local findItemById - used internally to avoid conflicts
 */
function findItemByIdLocal(items: MenuItemTreeType[], id: string): MenuItemTreeType | null {
  if (!Array.isArray(items)) return null;

  for (const item of items) {
    if (item.id === id) {
      return item;
    }
    if (item.children && Array.isArray(item.children) && item.children.length > 0) {
      const found = findItemByIdLocal(item.children, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

function findItemById(items: MenuItemTreeType[], id: string): MenuItemTreeType | null {
  if (!Array.isArray(items)) return null;

  for (const item of items) {
    if (item.id === id) {
      return item;
    }
    if (item.children && Array.isArray(item.children) && item.children.length > 0) {
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
  if (!Array.isArray(items)) return [];

  // Find active and over items - 로컬 함수 사용
  const activeItem = findItemByIdLocal(items, activeId);
  if (!activeItem) return items;

  // Remove active item from tree
  const withoutActive = removeItem(items, activeId);

  // Insert active item next to over item
  return insertItemNear(withoutActive, activeItem, overId);
}

function removeItem(items: MenuItemTreeType[], id: string): MenuItemTreeType[] {
  if (!Array.isArray(items)) {
    console.error('removeItem: items is not an array', items);
    return [];
  }

  return items
    .filter((item) => item.id !== id)
    .map((item) => {
      if (item.children && Array.isArray(item.children) && item.children.length > 0) {
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
  overId: string,
  parentId?: string
): MenuItemTreeType[] {
  if (!Array.isArray(items)) {
    console.error('insertItemNear: items is not an array', items);
    return [];
  }

  const result: MenuItemTreeType[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // If this is the over item, insert active item after it
    if (item.id === overId) {
      result.push(item);
      // Insert with parent_id based on current level
      result.push({
        ...activeItem,
        parent_id: parentId || undefined  // Set parent_id based on level
      });
      continue;
    }

    // Check children
    if (item.children && Array.isArray(item.children) && item.children.length > 0) {
      const hasOverInChildren = findItemByIdLocal(item.children, overId);
      if (hasOverInChildren) {
        result.push({
          ...item,
          children: insertItemNear(item.children, activeItem, overId, item.id)  // Pass item.id as parentId
        });
        continue;
      }
    }

    result.push(item);
  }

  return result;
}

function toggleInTree(items: MenuItemTreeType[], id: string): MenuItemTreeType[] {
  if (!Array.isArray(items)) return [];

  return items.map((item) => {
    if (item.id === id) {
      return { ...item, isOpen: !item.isOpen };
    }
    if (item.children && Array.isArray(item.children) && item.children.length > 0) {
      return { ...item, children: toggleInTree(item.children, id) };
    }
    return item;
  });
}

function expandInTree(items: MenuItemTreeType[]): MenuItemTreeType[] {
  if (!Array.isArray(items)) return [];

  return items.map((item) => ({
    ...item,
    isOpen: true,
    children: (item.children && Array.isArray(item.children)) ? expandInTree(item.children) : []
  }));
}

function collapseInTree(items: MenuItemTreeType[]): MenuItemTreeType[] {
  if (!Array.isArray(items)) return [];

  return items.map((item) => ({
    ...item,
    isOpen: false,
    children: (item.children && Array.isArray(item.children)) ? collapseInTree(item.children) : []
  }));
}

// 계층 구조 변경을 위한 헬퍼 함수들

/**
 * 항목의 현재 깊이 계산
 */
function getItemDepth(items: MenuItemTreeType[], itemId: string, currentDepth = 0): number {
  if (!Array.isArray(items)) return -1;

  for (const item of items) {
    if (item.id === itemId) {
      return currentDepth;
    }
    if (item.children && Array.isArray(item.children) && item.children.length > 0) {
      const foundDepth = getItemDepth(item.children, itemId, currentDepth + 1);
      if (foundDepth !== -1) {
        return foundDepth;
      }
    }
  }
  return -1;
}

/**
 * 항목을 다른 항목의 자식으로 만들기
 */
function makeChildOf(
  items: MenuItemTreeType[],
  childId: string,
  parentId: string
): MenuItemTreeType[] {
  // 자식 항목 찾기 및 제거 - 로컬 함수 사용
  const childItem = findItemByIdLocal(items, childId);
  if (!childItem) return items;

  const withoutChild = removeItem(items, childId);

  // 부모에 자식 추가 (parent_id 필드도 업데이트)
  return withoutChild.map(item => {
    if (item.id === parentId) {
      const currentChildren = Array.isArray(item.children) ? item.children : [];
      return {
        ...item,
        isOpen: true, // 자식이 추가되면 자동으로 펼치기
        children: [...currentChildren, {
          ...childItem,
          parent_id: parentId,  // parent_id 필드 설정
          children: childItem.children || []
        }]
      };
    }
    if (item.children && Array.isArray(item.children) && item.children.length > 0) {
      return {
        ...item,
        children: makeChildOf(item.children, childId, parentId)
      };
    }
    return item;
  });
}

/**
 * 항목을 다른 항목의 형제로 만들기
 */
function makeSiblingOf(
  items: MenuItemTreeType[],
  itemId: string,
  siblingId: string
): MenuItemTreeType[] {
  const item = findItemByIdLocal(items, itemId);
  if (!item) return items;

  const withoutItem = removeItem(items, itemId);
  return insertItemNear(withoutItem, item, siblingId);
}
