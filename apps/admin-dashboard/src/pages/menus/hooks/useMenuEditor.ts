import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import MenuApi from '../../../api/menuApi';
import type { Menu, MenuItem as MenuItemType } from '../../../api/menuApi';
import {
  buildTree,
  flattenTree,
  updateItemInTree,
  deleteItemFromTree,
  findItemById,
  type MenuItemTree,
  type MenuItemFlat
} from '../utils/menu-tree-helpers';

export interface UseMenuEditorOptions {
  menuId?: string;
  onSaveSuccess?: (menuId: string) => void;
  onSaveError?: (error: Error) => void;
}

export interface UseMenuEditorReturn {
  // Menu data
  menu: Partial<Menu> | null;
  items: MenuItemTree[];
  selectedItem: MenuItemTree | null;

  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;

  // Menu operations
  updateMenu: (data: Partial<Menu>) => void;
  setMenuName: (name: string) => void;
  setMenuLocation: (location: string) => void;

  // Item operations
  addItem: (item: Partial<MenuItemFlat>) => void;
  selectItem: (id: string | null) => void;
  updateItem: (id: string, updates: Partial<MenuItemTree>) => void;
  deleteItem: (id: string) => void;
  reorderItems: (newItems: MenuItemTree[]) => void;

  // Save operations
  saveMenu: () => Promise<void>;
  discardChanges: () => void;
}

/**
 * Main hook for menu editor state management
 * Handles menu data loading, item tree management, and save operations
 */
export function useMenuEditor(options: UseMenuEditorOptions = {}): UseMenuEditorReturn {
  const { menuId, onSaveSuccess, onSaveError } = options;

  // Core state (4 useState only)
  const [menu, setMenu] = useState<Partial<Menu> | null>(null);
  const [items, setItems] = useState<MenuItemTree[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [originalData, setOriginalData] = useState<{
    menu: Partial<Menu> | null;
    items: MenuItemTree[];
  }>({ menu: null, items: [] });

  // Computed state
  const isDirty = JSON.stringify({ menu, items }) !== JSON.stringify(originalData);
  const selectedItem = selectedItemId ? findItemById(items, selectedItemId) : null;

  // Load menu data
  useEffect(() => {
    if (!menuId) {
      // New menu
      setMenu({ name: '', slug: '', location: '', is_active: true });
      setItems([]);
      setOriginalData({ menu: { name: '', slug: '', location: '', is_active: true }, items: [] });
      return;
    }

    const loadMenu = async () => {
      try {
        setIsLoading(true);
        const response = await MenuApi.getMenu(menuId);

        if (response.data) {
          const menuData = response.data;
          setMenu(menuData);

          // Convert API items to tree structure
          if (menuData.items && menuData.items.length > 0) {
            const flatItems: MenuItemFlat[] = menuData.items.map((item: MenuItemType) => ({
              id: item.id,
              title: item.title,
              url: item.url,
              type: item.type as 'page' | 'post' | 'custom' | 'category' | 'tag',
              target: item.target as '_blank' | '_self',
              cssClass: item.css_classes,
              description: item.description,
              parent_id: item.parent?.id,
              order_num: item.order_num,
              originalId: item.object_id,
              menu_id: item.menu_id,
              isOpen: true,
              target_audience: undefined // Will be added when we have role system
            }));

            const tree = buildTree(flatItems);
            setItems(tree);
            setOriginalData({ menu: menuData, items: tree });
          } else {
            setItems([]);
            setOriginalData({ menu: menuData, items: [] });
          }
        }
      } catch (err) {
        toast.error('메뉴를 불러오는데 실패했습니다');
        console.error('Failed to load menu:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadMenu();
  }, [menuId]);

  // Menu operations
  const updateMenu = useCallback((data: Partial<Menu>) => {
    setMenu(prev => prev ? { ...prev, ...data } : data);
  }, []);

  const setMenuName = useCallback((name: string) => {
    updateMenu({ name, slug: name.toLowerCase().replace(/\s+/g, '-') });
  }, [updateMenu]);

  const setMenuLocation = useCallback((location: string) => {
    updateMenu({ location });
  }, [updateMenu]);

  // Item operations
  const addItem = useCallback((item: Partial<MenuItemFlat>) => {
    const newItem: MenuItemTree = {
      id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: item.title || 'New Item',
      url: item.url || '',
      type: item.type || 'custom',
      target: item.target || '_self',
      cssClass: item.cssClass || '',
      description: item.description || '',
      parent_id: item.parent_id,
      order_num: items.length,
      originalId: item.originalId,
      menu_id: menu?.id,
      isOpen: true,
      children: []
    };

    if (item.parent_id) {
      // Add as child
      setItems(prev => updateItemInTree(prev, item.parent_id!, (parent) => ({
        children: [...(parent.children || []), newItem]
      })));
    } else {
      // Add to root
      setItems(prev => [...prev, newItem]);
    }
  }, [items, menu]);

  const selectItem = useCallback((id: string | null) => {
    setSelectedItemId(id);
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<MenuItemTree>) => {
    setItems(prev => updateItemInTree(prev, id, updates));
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems(prev => deleteItemFromTree(prev, id));
    if (selectedItemId === id) {
      setSelectedItemId(null);
    }
  }, [selectedItemId]);

  const reorderItems = useCallback((newItems: MenuItemTree[]) => {
    setItems(newItems);
  }, []);

  // Save operation
  const saveMenu = useCallback(async () => {
    if (!menu?.name) {
      toast.error('메뉴 이름을 입력하세요');
      return;
    }

    try {
      setIsSaving(true);

      // Flatten tree for API
      const flatItems = flattenTree(items);

      // Create or update menu
      let savedMenuId = menuId;
      if (!menuId || menuId === 'new') {
        // Create new menu
        const createResponse = await MenuApi.createMenu({
          name: menu.name,
          slug: menu.slug || menu.name.toLowerCase().replace(/\s+/g, '-'),
          description: menu.description,
          location: menu.location,
          is_active: menu.is_active ?? true,
          metadata: menu.metadata
        });
        savedMenuId = createResponse.data.id;
      } else {
        // Update existing menu
        await MenuApi.updateMenu(menuId, {
          name: menu.name,
          slug: menu.slug,
          description: menu.description,
          location: menu.location,
          is_active: menu.is_active,
          metadata: menu.metadata
        });
      }

      // Save all items
      if (savedMenuId) {
        // Delete all existing items first
        if (menuId && menuId !== 'new') {
          const existingMenu = await MenuApi.getMenu(menuId);
          if (existingMenu.data?.items) {
            await Promise.all(
              existingMenu.data.items.map((item: MenuItemType) =>
                MenuApi.deleteMenuItem(item.id)
              )
            );
          }
        }

        // Create all items (parents first, then children)
        // Map old IDs to new IDs
        const idMap = new Map<string, string>();

        // Sort items: parents first (no parent_id), then children
        const sortedItems = [...flatItems].sort((a, b) => {
          if (!a.parent_id && b.parent_id) return -1;
          if (a.parent_id && !b.parent_id) return 1;
          return 0;
        });

        for (const item of sortedItems) {
          // Map parent_id to new ID if it was remapped
          const mappedParentId = item.parent_id && idMap.has(item.parent_id)
            ? idMap.get(item.parent_id)
            : item.parent_id;

          const created = await MenuApi.createMenuItem({
            menu_id: savedMenuId,
            parent_id: mappedParentId || null,
            title: item.title,
            url: item.url,
            target: item.target,
            type: item.type,
            object_id: item.originalId,
            css_classes: item.cssClass,
            description: item.description,
            order_num: item.order_num,
            is_active: true
          });

          // Remember the mapping from old ID to new ID
          if (item.id && created.data?.id) {
            idMap.set(item.id, created.data.id);
          }
        }
      }

      toast.success('메뉴가 저장되었습니다!');

      // Update original data
      setOriginalData({ menu, items });

      if (onSaveSuccess && savedMenuId) {
        onSaveSuccess(savedMenuId);
      }
    } catch (error) {
      toast.error('메뉴 저장 중 오류가 발생했습니다');
      console.error('Failed to save menu:', error);
      if (onSaveError) {
        onSaveError(error as Error);
      }
    } finally {
      setIsSaving(false);
    }
  }, [menu, items, menuId, onSaveSuccess, onSaveError]);

  // Discard changes
  const discardChanges = useCallback(() => {
    setMenu(originalData.menu);
    setItems(originalData.items);
    setSelectedItemId(null);
  }, [originalData]);

  return {
    menu,
    items,
    selectedItem,
    isLoading,
    isSaving,
    isDirty,
    updateMenu,
    setMenuName,
    setMenuLocation,
    addItem,
    selectItem,
    updateItem,
    deleteItem,
    reorderItems,
    saveMenu,
    discardChanges
  };
}
