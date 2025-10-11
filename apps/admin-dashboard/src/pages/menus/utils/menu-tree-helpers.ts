/**
 * Menu Tree Helper Functions
 * Utilities for managing hierarchical menu item structures
 */

export interface MenuItemFlat {
  id: string;
  title: string;
  url?: string;
  type: 'page' | 'post' | 'custom' | 'category' | 'tag';
  target?: '_blank' | '_self';
  cssClass?: string;
  description?: string;
  parent_id?: string;
  order_num: number;
  originalId?: string;
  menu_id?: string;
  isOpen?: boolean;
  target_audience?: {
    roles: string[];
    user_ids?: string[];
  };
}

export interface MenuItemTree extends MenuItemFlat {
  children?: MenuItemTree[];
}

/**
 * Convert flat array of menu items to hierarchical tree structure
 */
export function buildTree(items: MenuItemFlat[]): MenuItemTree[] {
  const itemMap = new Map<string, MenuItemTree>();
  const rootItems: MenuItemTree[] = [];

  // First pass: create map with children arrays
  items.forEach(item => {
    itemMap.set(item.id, { ...item, children: [] });
  });

  // Second pass: build tree structure
  items.forEach(item => {
    const treeItem = itemMap.get(item.id)!;

    if (item.parent_id) {
      const parent = itemMap.get(item.parent_id);
      if (parent) {
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(treeItem);
      } else {
        // Parent not found, treat as root
        rootItems.push(treeItem);
      }
    } else {
      rootItems.push(treeItem);
    }
  });

  // Sort by order_num
  const sortItems = (items: MenuItemTree[]) => {
    items.sort((a, b) => a.order_num - b.order_num);
    items.forEach(item => {
      if (item.children && item.children.length > 0) {
        sortItems(item.children);
      }
    });
  };

  sortItems(rootItems);
  return rootItems;
}

/**
 * Convert hierarchical tree to flat array with order_num
 */
export function flattenTree(items: MenuItemTree[], parentId?: string): MenuItemFlat[] {
  const result: MenuItemFlat[] = [];
  let orderNum = 0;

  const processItems = (items: MenuItemTree[], parentId?: string) => {
    items.forEach(item => {
      const { children, ...flatItem } = item;
      result.push({
        ...flatItem,
        parent_id: parentId,
        order_num: orderNum++
      });

      if (children && children.length > 0) {
        processItems(children, item.id);
      }
    });
  };

  processItems(items, parentId);
  return result;
}

/**
 * Find item by ID in tree (recursive search)
 */
export function findItemById(items: MenuItemTree[], id: string): MenuItemTree | null {
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

/**
 * Find parent item by child ID
 */
export function findParentById(items: MenuItemTree[], childId: string, parent: MenuItemTree | null = null): MenuItemTree | null {
  for (const item of items) {
    if (item.id === childId) {
      return parent;
    }
    if (item.children && item.children.length > 0) {
      const found = findParentById(item.children, childId, item);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

/**
 * Update item in tree (immutable)
 */
export function updateItemInTree(
  items: MenuItemTree[],
  id: string,
  updates: Partial<MenuItemTree> | ((item: MenuItemTree) => Partial<MenuItemTree>)
): MenuItemTree[] {
  return items.map(item => {
    if (item.id === id) {
      const finalUpdates = typeof updates === 'function' ? updates(item) : updates;
      return { ...item, ...finalUpdates };
    }
    if (item.children && item.children.length > 0) {
      return {
        ...item,
        children: updateItemInTree(item.children, id, updates)
      };
    }
    return item;
  });
}

/**
 * Delete item from tree (immutable)
 */
export function deleteItemFromTree(items: MenuItemTree[], id: string): MenuItemTree[] {
  return items
    .filter(item => item.id !== id)
    .map(item => {
      if (item.children && item.children.length > 0) {
        return {
          ...item,
          children: deleteItemFromTree(item.children, id)
        };
      }
      return item;
    });
}

/**
 * Move item to new position in tree
 */
export function moveItemInTree(
  items: MenuItemTree[],
  itemId: string,
  targetParentId: string | null,
  newIndex: number
): MenuItemTree[] {
  // Find and remove item
  const item = findItemById(items, itemId);
  if (!item) {
    return items;
  }

  let newTree = deleteItemFromTree(items, itemId);

  // Insert at new position
  if (targetParentId === null) {
    // Insert at root level
    newTree.splice(newIndex, 0, { ...item, parent_id: undefined });
  } else {
    // Insert as child of target parent
    newTree = updateItemInTree(newTree, targetParentId, (parent) => {
      const children = [...(parent.children || [])];
      children.splice(newIndex, 0, { ...item, parent_id: targetParentId });
      return { children };
    });
  }

  return newTree;
}

/**
 * Toggle item open/closed state
 */
export function toggleItemOpen(items: MenuItemTree[], id: string): MenuItemTree[] {
  return updateItemInTree(items, id, (item) => ({
    isOpen: !item.isOpen
  }));
}

/**
 * Get all item IDs (for selection/deletion)
 */
export function getAllItemIds(items: MenuItemTree[]): string[] {
  const ids: string[] = [];

  const collectIds = (items: MenuItemTree[]) => {
    items.forEach(item => {
      ids.push(item.id);
      if (item.children && item.children.length > 0) {
        collectIds(item.children);
      }
    });
  };

  collectIds(items);
  return ids;
}

/**
 * Get tree depth
 */
export function getTreeDepth(items: MenuItemTree[], currentDepth = 0): number {
  if (items.length === 0) {
    return currentDepth;
  }

  let maxDepth = currentDepth;
  items.forEach(item => {
    if (item.children && item.children.length > 0) {
      const childDepth = getTreeDepth(item.children, currentDepth + 1);
      maxDepth = Math.max(maxDepth, childDepth);
    }
  });

  return maxDepth;
}

/**
 * Validate tree structure (no circular references, etc.)
 */
export function validateTree(items: MenuItemTree[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const visitedIds = new Set<string>();

  const validateItem = (item: MenuItemTree, ancestors: Set<string>) => {
    // Check for duplicate IDs
    if (visitedIds.has(item.id)) {
      errors.push(`Duplicate item ID: ${item.id}`);
      return;
    }
    visitedIds.add(item.id);

    // Check for circular references
    if (ancestors.has(item.id)) {
      errors.push(`Circular reference detected: ${item.id}`);
      return;
    }

    // Validate children
    if (item.children && item.children.length > 0) {
      const newAncestors = new Set(ancestors);
      newAncestors.add(item.id);
      item.children.forEach(child => validateItem(child, newAncestors));
    }
  };

  items.forEach(item => validateItem(item, new Set()));

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Clone tree (deep copy)
 */
export function cloneTree(items: MenuItemTree[]): MenuItemTree[] {
  return items.map(item => ({
    ...item,
    children: item.children ? cloneTree(item.children) : undefined
  }));
}
