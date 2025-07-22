import { create } from 'zustand';
import type { SignageContent, SignageSchedule } from '../types/signage';

interface SignageStore {
  // Content
  contents: SignageContent[];
  selectedContent: SignageContent | null;
  setContents: (contents: SignageContent[]) => void;
  setSelectedContent: (content: SignageContent | null) => void;
  
  // Schedules
  schedules: SignageSchedule[];
  setSchedules: (schedules: SignageSchedule[]) => void;
  
  // Filters
  contentFilter: {
    type: string;
    status: string;
    search: string;
  };
  setContentFilter: (filter: Partial<SignageStore['contentFilter']>) => void;
  
  // UI State
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useSignageStore = create<SignageStore>((set) => ({
  // Content
  contents: [],
  selectedContent: null,
  setContents: (contents) => set({ contents }),
  setSelectedContent: (content) => set({ selectedContent: content }),
  
  // Schedules
  schedules: [],
  setSchedules: (schedules) => set({ schedules }),
  
  // Filters
  contentFilter: {
    type: 'all',
    status: 'all',
    search: '',
  },
  setContentFilter: (filter) => set((state) => ({
    contentFilter: { ...state.contentFilter, ...filter },
  })),
  
  // UI State
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
}));