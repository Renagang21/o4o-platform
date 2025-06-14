import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { JSONContent } from '@tiptap/react'

export interface Version {
  id: string
  page: string
  content: JSONContent
  savedAt: string
  comment?: string
}

interface VersionStore {
  versions: Version[]
  addVersion: (page: string, content: JSONContent, comment?: string) => void
  removeVersion: (page: string, versionId: string) => void
  getVersions: (page: string) => Version[]
  clearVersions: (page: string) => void
}

const MAX_VERSIONS_PER_PAGE = 10

export const useVersionStore = create<VersionStore>()(
  persist(
    (set, get) => ({
      versions: [],
      addVersion: (page, content, comment) => {
        const newVersion: Version = {
          id: Date.now().toString(),
          page,
          content,
          savedAt: new Date().toISOString(),
          comment,
        }

        set((state) => {
          const pageVersions = state.versions.filter((v) => v.page === page)
          const otherVersions = state.versions.filter((v) => v.page !== page)

          // 최대 버전 수를 초과하면 가장 오래된 버전 제거
          const updatedPageVersions = [newVersion, ...pageVersions].slice(0, MAX_VERSIONS_PER_PAGE)

          return {
            versions: [...otherVersions, ...updatedPageVersions],
          }
        })
      },
      removeVersion: (page, versionId) => {
        set((state) => ({
          versions: state.versions.filter(
            (v) => !(v.page === page && v.id === versionId)
          ),
        }))
      },
      getVersions: (page) => {
        return get()
          .versions.filter((v) => v.page === page)
          .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
      },
      clearVersions: (page) => {
        set((state) => ({
          versions: state.versions.filter((v) => v.page !== page),
        }))
      },
    }),
    {
      name: 'editor-versions',
    }
  )
) 