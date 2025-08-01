import { useState, useCallback, useMemo } from 'react';
import { useAdminNotices } from './useAdminNotices';

export interface BulkAction {
  value: string;
  label: string;
  action: (selectedIds: string[]) => Promise<void>;
  confirmMessage?: string;
  isDestructive?: boolean;
}

interface UseBulkActionsProps {
  items: any[];
  idField?: string;
  actions: BulkAction[];
}

/**
 * Hook for managing bulk actions on list pages
 */
export function useBulkActions({ items, idField = 'id', actions }: UseBulkActionsProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const { success, error } = useAdminNotices();

  // Check if all items are selected
  const isAllSelected = useMemo(() => {
    if (items.length === 0) return false;
    return items.every(item => selectedIds.has(String(item[idField])));
  }, [items, selectedIds, idField]);

  // Check if some items are selected (for indeterminate state)
  const isSomeSelected = useMemo(() => {
    if (items.length === 0) return false;
    return items.some(item => selectedIds.has(String(item[idField]))) && !isAllSelected;
  }, [items, selectedIds, idField, isAllSelected]);

  // Toggle all items selection
  const toggleAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set(items.map(item => String(item[idField])));
      setSelectedIds(allIds);
    }
  }, [items, idField, isAllSelected]);

  // Toggle single item selection
  const toggleItem = useCallback((itemId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Execute bulk action
  const executeBulkAction = useCallback(async (actionValue: string) => {
    const action = actions.find(a => a.value === actionValue);
    if (!action) {
      error('Invalid action selected');
      return;
    }

    if (selectedIds.size === 0) {
      error('No items selected');
      return;
    }

    // Show confirmation if needed
    if (action.confirmMessage) {
      const confirmed = window.confirm(
        action.confirmMessage.replace('{count}', String(selectedIds.size))
      );
      if (!confirmed) return;
    }

    setIsProcessing(true);
    try {
      await action.action(Array.from(selectedIds));
      success(`${action.label} applied to ${selectedIds.size} item(s)`);
      clearSelection();
    } catch (err) {
      error(`Failed to apply ${action.label}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  }, [actions, selectedIds, success, error, clearSelection]);

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    isAllSelected,
    isSomeSelected,
    isProcessing,
    toggleAll,
    toggleItem,
    clearSelection,
    executeBulkAction,
    isSelected: (itemId: string) => selectedIds.has(itemId)
  };
}