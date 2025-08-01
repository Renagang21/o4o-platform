import { create } from 'zustand';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

export interface HelpTab {
  id: string;
  title: string;
  content: string | React.ReactNode;
}

export interface HelpSidebar {
  title: string;
  content: string | React.ReactNode;
}

interface HelpTabsStore {
  isOpen: boolean;
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
  isOpen: false,
  activeTab: null,
  tabs: [],
  sidebar: null,
  
  toggleHelp: () => set((state) => ({ 
    isOpen: !state.isOpen,
    activeTab: state.isOpen ? null : (state.tabs[0]?.id || null)
  })),
  
  openHelp: () => set((state) => ({ 
    isOpen: true,
    activeTab: state.tabs[0]?.id || null
  })),
  
  closeHelp: () => set({ isOpen: false, activeTab: null }),
  
  setActiveTab: (tabId) => set({ activeTab: tabId }),
  
  setTabs: (tabs) => set((state) => ({ 
    tabs,
    activeTab: state.isOpen ? (tabs[0]?.id || null) : state.activeTab
  })),
  
  setSidebar: (sidebar) => set({ sidebar }),
  
  reset: () => set({ 
    isOpen: false, 
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
  }, [location.pathname]);
  
  return store;
}

/**
 * Hook for registering help content for current page
 */
export function useRegisterHelp(tabs: HelpTab[], sidebar?: HelpSidebar | null) {
  const { setTabs, setSidebar } = useHelpTabsStore();
  
  useEffect(() => {
    setTabs(tabs);
    setSidebar(sidebar || null);
    
    return () => {
      // Cleanup when component unmounts
      setTabs([]);
      setSidebar(null);
    };
  }, [tabs, sidebar, setTabs, setSidebar]);
}