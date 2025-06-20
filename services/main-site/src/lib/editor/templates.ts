import { create } from 'zustand';
import { JSONContent } from '@tiptap/react';

export interface Template {
  id: string;
  name: string;
  description: string;
  content: JSONContent;
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface TemplateStore {
  templates: Template[];
  selectedTemplate: Template | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadTemplates: () => Promise<void>;
  saveTemplate: (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  addTemplate: (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>; // alias
  updateTemplate: (id: string, updates: Partial<Template>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  removeTemplate: (id: string) => Promise<void>; // alias
  selectTemplate: (template: Template | null) => void;
  getTemplatesByCategory: (category: string) => Template[];
  searchTemplates: (query: string) => Template[];
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  templates: [],
  selectedTemplate: null,
  isLoading: false,
  error: null,

  loadTemplates: async () => {
    set({ isLoading: true, error: null });
    try {
      // Load templates from localStorage for now
      const stored = localStorage.getItem('editor-templates');
      const templates = stored ? JSON.parse(stored) : [];
      set({ templates, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to load templates', isLoading: false });
    }
  },

  saveTemplate: async (templateData) => {
    const template: Template = {
      ...templateData,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const templates = [...get().templates, template];
    localStorage.setItem('editor-templates', JSON.stringify(templates));
    set({ templates });
  },

  addTemplate: async (templateData) => {
    // Alias for saveTemplate
    return get().saveTemplate(templateData);
  },

  updateTemplate: async (id, updates) => {
    const templates = get().templates.map(t => 
      t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t
    );
    localStorage.setItem('editor-templates', JSON.stringify(templates));
    set({ templates });
  },

  deleteTemplate: async (id) => {
    const templates = get().templates.filter(t => t.id !== id);
    localStorage.setItem('editor-templates', JSON.stringify(templates));
    set({ templates });
  },

  removeTemplate: async (id) => {
    // Alias for deleteTemplate
    return get().deleteTemplate(id);
  },

  selectTemplate: (template) => {
    set({ selectedTemplate: template });
  },

  getTemplatesByCategory: (category) => {
    return get().templates.filter(t => t.category === category);
  },

  searchTemplates: (query) => {
    const templates = get().templates;
    return templates.filter(t => 
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.description.toLowerCase().includes(query.toLowerCase()) ||
      t.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );
  },
}));