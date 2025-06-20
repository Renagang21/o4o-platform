import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { JSONContent } from '@tiptap/react';

export interface Version {
  id: string;
  page: string;
  content: JSONContent;
  comment?: string;
  createdAt: Date;
  savedAt: Date; // alias for createdAt
  autoSave: boolean;
}

interface VersionStore {
  versions: Version[];
  
  // Actions
  addVersion: (page: string, content: JSONContent, comment?: string) => void;
  getVersionsByPage: (page: string) => Version[];
  getVersions: (page: string) => Version[]; // alias
  restoreVersion: (page: string, versionId: string) => JSONContent | null;
  deleteVersion: (page: string, versionId: string) => void;
  removeVersion: (page: string, versionId: string) => void; // alias
  getPageVersions: (page: string) => Version[];
  clearOldVersions: (page: string, keepCount?: number) => void;
}

export const useVersionStore = create<VersionStore>()(
  persist(
    (set, get) => ({
      versions: [],

      addVersion: (page, content, comment = '') => {
        const now = new Date();
        const version: Version = {
          id: Date.now().toString(),
          page,
          content,
          comment,
          createdAt: now,
          savedAt: now, // alias for createdAt
          autoSave: !comment, // If no comment provided, it's an auto-save
        };

        const state = get();
        const pageVersions = state.versions.filter(v => v.page === page);
        
        // Keep only last 10 versions per page to avoid storage bloat
        const maxVersions = 10;
        if (pageVersions.length >= maxVersions) {
          const versionsToKeep = pageVersions
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, maxVersions - 1);
          
          const otherVersions = state.versions.filter(v => v.page !== page);
          set({ versions: [...otherVersions, ...versionsToKeep, version] });
        } else {
          set({ versions: [...state.versions, version] });
        }
      },

      getVersionsByPage: (page) => {
        return get().versions
          .filter(v => v.page === page)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },

      getVersions: (page) => {
        // Alias for getVersionsByPage
        return get().getVersionsByPage(page);
      },

      restoreVersion: (page, versionId) => {
        const state = get();
        const version = state.versions.find(v => v.id === versionId && v.page === page);
        return version ? version.content : null;
      },

      deleteVersion: (page, versionId) => {
        const state = get();
        const versions = state.versions.filter(v => !(v.id === versionId && v.page === page));
        set({ versions });
      },

      removeVersion: (page, versionId) => {
        // Alias for deleteVersion
        return get().deleteVersion(page, versionId);
      },

      getPageVersions: (page) => {
        const versions = get().versions.filter(v => v.page === page);
        return versions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },

      clearOldVersions: (page, keepCount = 5) => {
        const state = get();
        const pageVersions = state.versions
          .filter(v => v.page === page)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, keepCount);
        
        const otherVersions = state.versions.filter(v => v.page !== page);
        set({ versions: [...otherVersions, ...pageVersions] });
      },
    }),
    {
      name: 'editor-versions-storage',
    }
  )
);