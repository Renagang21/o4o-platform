import { create } from 'zustand'
import { JSONContent } from '@tiptap/react'

export interface Template {
  id: string
  name: string
  content: JSONContent
  createdAt: string
  updatedAt: string
}

interface TemplateStore {
  templates: Template[]
  addTemplate: (name: string, content: JSONContent) => void
  removeTemplate: (id: string) => void
  updateTemplate: (id: string, name: string, content: JSONContent) => void
  getTemplate: (id: string) => Template | undefined
}

// localStorage 키
const STORAGE_KEY = 'editor_templates'
const MAX_TEMPLATES = 10

// localStorage에서 템플릿 불러오기
const loadTemplates = (): Template[] => {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored ? JSON.parse(stored) : []
}

// localStorage에 템플릿 저장
const saveTemplates = (templates: Template[]) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  templates: loadTemplates(),

  addTemplate: (name: string, content: JSONContent) => {
    const templates = get().templates

    // 최대 개수 제한 확인
    if (templates.length >= MAX_TEMPLATES) {
      throw new Error(`템플릿은 최대 ${MAX_TEMPLATES}개까지 저장할 수 있습니다.`)
    }

    const newTemplate: Template = {
      id: Date.now().toString(),
      name,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const updatedTemplates = [...templates, newTemplate]
    saveTemplates(updatedTemplates)
    set({ templates: updatedTemplates })
  },

  removeTemplate: (id: string) => {
    const templates = get().templates
    const updatedTemplates = templates.filter(t => t.id !== id)
    saveTemplates(updatedTemplates)
    set({ templates: updatedTemplates })
  },

  updateTemplate: (id: string, name: string, content: JSONContent) => {
    const templates = get().templates
    const updatedTemplates = templates.map(t => 
      t.id === id 
        ? { ...t, name, content, updatedAt: new Date().toISOString() }
        : t
    )
    saveTemplates(updatedTemplates)
    set({ templates: updatedTemplates })
  },

  getTemplate: (id: string) => {
    return get().templates.find(t => t.id === id)
  },
})) 