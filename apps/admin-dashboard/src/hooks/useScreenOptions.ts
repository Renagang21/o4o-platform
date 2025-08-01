import { useState, useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ColumnOption {
  id: string;
  label: string;
  visible: boolean;
  required?: boolean; // Some columns can't be hidden
}

export interface ScreenOptionsConfig {
  columns?: ColumnOption[];
  itemsPerPage?: number;
  customOptions?: Record<string, any>;
}

interface ScreenOptionsStore {
  options: Record<string, ScreenOptionsConfig>;
  getOptions: (pageId: string) => ScreenOptionsConfig;
  setOptions: (pageId: string, options: ScreenOptionsConfig) => void;
  updateColumnVisibility: (pageId: string, columnId: string, visible: boolean) => void;
  updateItemsPerPage: (pageId: string, items: number) => void;
}

/**
 * Zustand store for WordPress-style screen options with persistence
 */
const useScreenOptionsStore = create<ScreenOptionsStore>()(
  persist(
    (set, get) => ({
      options: {},
      
      getOptions: (pageId) => {
        return get().options[pageId] || {};
      },
      
      setOptions: (pageId, options) => {
        set((state) => ({
          options: {
            ...state.options,
            [pageId]: options
          }
        }));
      },
      
      updateColumnVisibility: (pageId, columnId, visible) => {
        set((state) => {
          const currentOptions = state.options[pageId] || {};
          const columns = currentOptions.columns || [];
          const updatedColumns = columns.map(col =>
            col.id === columnId ? { ...col, visible } : col
          );
          
          return {
            options: {
              ...state.options,
              [pageId]: {
                ...currentOptions,
                columns: updatedColumns
              }
            }
          };
        });
      },
      
      updateItemsPerPage: (pageId, items) => {
        set((state) => {
          const currentOptions = state.options[pageId] || {};
          
          return {
            options: {
              ...state.options,
              [pageId]: {
                ...currentOptions,
                itemsPerPage: items
              }
            }
          };
        });
      }
    }),
    {
      name: 'screen-options-storage',
    }
  )
);

/**
 * Hook for managing screen options for a specific page
 */
export function useScreenOptions(pageId: string, defaultOptions?: ScreenOptionsConfig) {
  const store = useScreenOptionsStore();
  const [initialized, setInitialized] = useState(false);
  
  // Initialize options if not exists
  useEffect(() => {
    if (!initialized && defaultOptions) {
      const existing = store.getOptions(pageId);
      if (!existing.columns && defaultOptions.columns) {
        store.setOptions(pageId, defaultOptions);
      }
      setInitialized(true);
    }
  }, [pageId, defaultOptions, initialized, store]);
  
  const options = store.getOptions(pageId);
  
  // Get visible columns
  const visibleColumns = (options.columns || []).filter(col => col.visible);
  
  // Helper functions
  const toggleColumn = (columnId: string) => {
    store.updateColumnVisibility(pageId, columnId, !isColumnVisible(columnId));
  };
  
  const isColumnVisible = (columnId: string): boolean => {
    const column = (options.columns || []).find(col => col.id === columnId);
    return column?.visible ?? true;
  };
  
  const setItemsPerPage = (items: number) => {
    store.updateItemsPerPage(pageId, items);
  };
  
  const resetToDefaults = () => {
    if (defaultOptions) {
      store.setOptions(pageId, defaultOptions);
    }
  };
  
  return {
    options,
    visibleColumns,
    itemsPerPage: options.itemsPerPage || 20,
    toggleColumn,
    isColumnVisible,
    setItemsPerPage,
    resetToDefaults,
    updateColumnVisibility: (columnId: string, visible: boolean) => 
      store.updateColumnVisibility(pageId, columnId, visible),
  };
}