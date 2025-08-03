import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { JSONContent } from '@tiptap/react'

interface EditorVersion {
  id: string
  content: JSONContent
  timestamp: number
  page: string
}

interface VersionStore {
  versions: EditorVersion[]
  addVersion: (page: string, content: JSONContent) => void
  getVersions: (page: string) => EditorVersion[]
  clearVersions: (page: string) => void
}

export const useVersionStore = create<VersionStore>()(
  persist(
    (set, get) => ({
      versions: [],
      addVersion: (page, content) => {
        const version: EditorVersion = {
          id: Date.now().toString(),
          content,
          timestamp: Date.now(),
          page,
        }
        set(state => ({
          versions: [...state.versions, version].slice(-10) // 최대 10개 버전 유지
        }))
      },
      getVersions: (page) => {
        return get().versions.filter((v: any) => v.page === page)
      },
      clearVersions: (page) => {
        set(state => ({
          versions: state.versions.filter((v: any) => v.page !== page)
        }))
      },
    }),
    {
      name: 'editor-versions-storage',
    }
  )
)