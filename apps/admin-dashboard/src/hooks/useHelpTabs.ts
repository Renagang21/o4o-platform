import { create } from 'zustand';
import { useLocation } from 'react-router-dom';
import { ReactNode, useEffect } from 'react';

export interface HelpTab {
  id: string;
  title: string;
  content: string | ReactNode;
}

export interface HelpSidebar {
  title: string;
  content: string | ReactNode;
}

interface HelpTabsStore {
  _isOpen: boolean;
  activeTab: string | null;
  tabs: HelpTab[];
  sidebar: HelpSidebar | null;
  
  // Actions
  toggleHelp: () => void;
  openHelp: () => void;
  closeHelp: () => void;
  setActiveTab: (tabId: string) => void;
  setTabs: (tabs: HelpTab[]) => void;
  setSidebar: (sidebar: HelpSidebar | null) => void;
  reset: () => void;
}

/**
 * Zustand store for WordPress-style Help Tabs
 */
const useHelpTabsStore = create<HelpTabsStore>((set) => ({
  _isOpen: false,
  activeTab: null,
  tabs: [],
  sidebar: null,
  
  toggleHelp: () => set((state) => ({ 
    _isOpen: !state._isOpen,
    activeTab: state._isOpen ? null : (state.tabs[0]?.id || null)
  })),
  
  openHelp: () => set((state) => ({ 
    _isOpen: true,
    activeTab: state.tabs[0]?.id || null
  })),
  
  closeHelp: () => set({ _isOpen: false, activeTab: null }),
  
  setActiveTab: (tabId) => set({ activeTab: tabId }),
  
  setTabs: (tabs) => set((state) => ({ 
    tabs,
    activeTab: state._isOpen ? (tabs[0]?.id || null) : state.activeTab
  })),
  
  setSidebar: (sidebar) => set({ sidebar }),
  
  reset: () => set({ 
    _isOpen: false, 
    activeTab: null, 
    tabs: [], 
    sidebar: null 
  })
}));

/**
 * Hook for managing WordPress-style help tabs
 */
export function useHelpTabs() {
  const store = useHelpTabsStore();
  const location = useLocation();
  
  // Reset help tabs when route changes
  useEffect(() => {
    store.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Intentionally omitting store to avoid re-render loop
  
  return store;
}

/**
 * Hook for registering help content for current page
 */
export function useRegisterHelp(tabs: HelpTab[], sidebar?: HelpSidebar | null) {
  const setTabs = useHelpTabsStore((state) => state.setTabs);
  const setSidebar = useHelpTabsStore((state) => state.setSidebar);
  
  // Create stable reference for tabs
  const tabsKey = JSON.stringify(tabs);
  const sidebarKey = JSON.stringify(sidebar);
  
  useEffect(() => {
    setTabs(tabs);
    setSidebar(sidebar || null);
    
    return () => {
      // Cleanup when component unmounts
      setTabs([]);
      setSidebar(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabsKey, sidebarKey]); // Using stable keys to avoid infinite re-renders
}