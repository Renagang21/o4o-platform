import { create } from 'zustand'

interface AdminFullscreenStore {
  isFullscreen: boolean;
  reason: string | null;
  enter: (reason?: string) => void;
  exit: () => void;
  setFullscreen: (value: boolean, reason?: string | null) => void;
}

export const useAdminFullscreen = create<AdminFullscreenStore>((set) => ({
  isFullscreen: false,
  reason: null,
  enter: (reason) => set({ isFullscreen: true, reason: reason ?? null }),
  exit: () => set({ isFullscreen: false, reason: null }),
  setFullscreen: (value, reason = null) => set({ isFullscreen: value, reason }),
}));

