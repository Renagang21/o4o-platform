import { useCallback } from 'react';
import toast from 'react-hot-toast';
import MenuApi from '../../../api/menuApi';
import type { MenuItemTree, MenuItemFlat } from '../utils/menu-tree-helpers';
import { cloneTree, getAllItemIds } from '../utils/menu-tree-helpers';

export interface UseMenuOperationsOptions {
  items: MenuItemTree[];
  onItemsChange: (items: MenuItemTree[]) => void;
  menuId?: string;
}

export interface UseMenuOperationsReturn {
  // Single item operations
  duplicateItem: (id: string) => void;
  moveItem: (itemId: string, targetParentId: string | null, index: number) => void;

  // Bulk operations
  bulkDelete: (ids: string[]) => void;
  bulkDuplicate: (ids: string[]) => void;

  // Import/Export
  exportItems: () => string;
  importItems: (jsonString: string) => void;
}

/**
 * Hook for advanced menu item operations
 * Handles duplication, bulk operations, import/export
 */
export function useMenuOperations(options: UseMenuOperationsOptions): UseMenuOperationsReturn {
  const { items, onItemsChange, menuId } = options;

  // Duplicate single item
  const duplicateItem = useCallback((id: string) => {
    // Generate new IDs recursively for cloned items
    const generateNewIds = (items: MenuItemTree[]): MenuItemTree[] => {
      return items.map(item => ({
        ...item,
        id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        children: item.children ? generateNewIds(item.children) : undefined
      }));
    };

    // Find item and insert duplicate after it
    const findAndInsertDuplicate = (items: MenuItemTree[]): MenuItemTree[] => {
      const newItems: MenuItemTree[] = [];

      items.forEach(item => {
        newItems.push(item);

        if (item.id === id) {
          // Create duplicate with new IDs for all children
          const duplicate: MenuItemTree = {
            ...item,
            id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: `${item.title} (복사본)`,
            children: item.children ? generateNewIds(item.children) : undefined
          };
          newItems.push(duplicate);
        } else if (item.children && item.children.length > 0) {
          newItems[newItems.length - 1] = {
            ...item,
            children: findAndInsertDuplicate(item.children)
          };
        }
      });

      return newItems;
    };

    const newItems = findAndInsertDuplicate(items);
    onItemsChange(newItems);
    toast.success('메뉴 항목이 복제되었습니다');
  }, [items, onItemsChange]);

  // Move item to new position
  const moveItem = useCallback((itemId: string, targetParentId: string | null, index: number) => {
    // This is a placeholder - actual drag-and-drop logic will be in MenuItemTree component
    // using @dnd-kit library
    toast('아이템이 이동되었습니다');
  }, []);

  // Bulk delete
  const bulkDelete = useCallback((ids: string[]) => {
    if (ids.length === 0) {
      toast.error('삭제할 항목을 선택하세요');
      return;
    }

    if (!confirm(`선택한 ${ids.length}개 항목을 삭제하시겠습니까?`)) {
      return;
    }

    const deleteMultiple = (items: MenuItemTree[], idsToDelete: Set<string>): MenuItemTree[] => {
      return items
        .filter(item => !idsToDelete.has(item.id))
        .map(item => {
          if (item.children && item.children.length > 0) {
            return {
              ...item,
              children: deleteMultiple(item.children, idsToDelete)
            };
          }
          return item;
        });
    };

    const newItems = deleteMultiple(items, new Set(ids));
    onItemsChange(newItems);
    toast.success(`${ids.length}개 항목이 삭제되었습니다`);
  }, [items, onItemsChange]);

  // Bulk duplicate
  const bulkDuplicate = useCallback((ids: string[]) => {
    if (ids.length === 0) {
      toast.error('복제할 항목을 선택하세요');
      return;
    }

    // Duplicate each selected item
    ids.forEach(id => duplicateItem(id));
    toast.success(`${ids.length}개 항목이 복제되었습니다`);
  }, [duplicateItem]);

  // Export items as JSON
  const exportItems = useCallback((): string => {
    try {
      const exportData = {
        version: '1.0',
        menuId,
        timestamp: new Date().toISOString(),
        items
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      toast.success('메뉴 항목이 내보내기되었습니다');
      return jsonString;
    } catch (error) {
      toast.error('내보내기에 실패했습니다');
      console.error('Export failed:', error);
      return '';
    }
  }, [items, menuId]);

  // Import items from JSON
  const importItems = useCallback((jsonString: string) => {
    try {
      const importData = JSON.parse(jsonString);

      // Validate structure
      if (!importData.version || !importData.items || !Array.isArray(importData.items)) {
        throw new Error('Invalid import format');
      }

      // Generate new IDs for imported items
      const generateNewIds = (items: MenuItemTree[]): MenuItemTree[] => {
        return items.map(item => ({
          ...item,
          id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          children: item.children ? generateNewIds(item.children) : undefined
        }));
      };

      const newItems = generateNewIds(importData.items);

      if (confirm('현재 메뉴 항목을 가져온 항목으로 교체하시겠습니까?')) {
        onItemsChange(newItems);
        toast.success('메뉴 항목을 가져왔습니다');
      } else {
        // Append to existing items
        onItemsChange([...items, ...newItems]);
        toast.success('메뉴 항목이 추가되었습니다');
      }
    } catch (error) {
      toast.error('가져오기에 실패했습니다. JSON 형식을 확인하세요');
      console.error('Import failed:', error);
    }
  }, [items, onItemsChange]);

  return {
    duplicateItem,
    moveItem,
    bulkDelete,
    bulkDuplicate,
    exportItems,
    importItems
  };
}
