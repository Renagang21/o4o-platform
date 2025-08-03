import { 
  Post, 
  Page, 
  Category, 
  Tag, 
  MediaFile, 
  MediaFolder,
  FieldGroup,
  Template,
  Menu,
  ApiResponse,
  ContentFilters,
  PostType,
  PostStatus,
  TipTapJSONContent
} from '@/types/content'
import { api } from './base'

export class ContentApi {
  // Posts Management
  static async getPosts(
    page: number = 1, 
    pageSize: number = 20, 
    filters?: ContentFilters
  ): Promise<ApiResponse<Post[]>> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString()
    })
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString())
        }
      })
    }
    
    const response = await api.get(`/admin/posts?${params}`)
    return response.data
  }

  static async getPost(id: string): Promise<ApiResponse<Post>> {
    const response = await api.get(`/admin/posts/${id}`)
    return response.data
  }

  static async createPost(post: Partial<Post>): Promise<ApiResponse<Post>> {
    const response = await api.post('/admin/posts', post)
    return response.data
  }

  static async updatePost(id: string, post: Partial<Post>): Promise<ApiResponse<Post>> {
    const response = await api.put(`/admin/posts/${id}`, post)
    return response.data
  }

  static async deletePost(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/admin/posts/${id}`)
    return response.data
  }

  static async clonePost(id: string): Promise<ApiResponse<Post>> {
    const response = await api.post(`/admin/posts/${id}/clone`)
    return response.data
  }

  static async bulkUpdatePosts(ids: string[], data: Partial<Post>): Promise<ApiResponse<void>> {
    const response = await api.patch('/admin/posts/bulk', { ids, data })
    return response.data
  }

  static async bulkDeletePosts(ids: string[]): Promise<ApiResponse<void>> {
    const response = await api.delete('/admin/posts/bulk', { data: { ids } })
    return response.data
  }

  static async getPostPreview(id: string): Promise<ApiResponse<{ url: string }>> {
    const response = await api.get(`/admin/posts/${id}/preview`)
    return response.data
  }

  static async savePostDraft(id: string, content: TipTapJSONContent): Promise<ApiResponse<void>> {
    const response = await api.post(`/admin/posts/${id}/autosave`, { content })
    return response.data
  }

  static async getPostRevisions(id: string): Promise<ApiResponse<Post[]>> {
    const response = await api.get(`/admin/posts/${id}/revisions`)
    return response.data
  }

  static async restorePostRevision(postId: string, revisionId: string): Promise<ApiResponse<Post>> {
    const response = await api.post(`/admin/posts/${postId}/revisions/${revisionId}/restore`)
    return response.data
  }

  // Pages Management
  static async getPages(
    page: number = 1, 
    pageSize: number = 20, 
    filters?: ContentFilters
  ): Promise<ApiResponse<Page[]>> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString()
    })
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString())
        }
      })
    }
    
    const response = await api.get(`/admin/pages?${params}`)
    return response.data
  }

  static async getPage(id: string): Promise<ApiResponse<Page>> {
    const response = await api.get(`/admin/pages/${id}`)
    return response.data
  }

  static async createPage(page: Partial<Page>): Promise<ApiResponse<Page>> {
    const response = await api.post('/admin/pages', page)
    return response.data
  }

  static async updatePage(id: string, page: Partial<Page>): Promise<ApiResponse<Page>> {
    const response = await api.put(`/admin/pages/${id}`, page)
    return response.data
  }

  static async deletePage(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/admin/pages/${id}`)
    return response.data
  }

  static async clonePage(id: string): Promise<ApiResponse<Page>> {
    const response = await api.post(`/admin/pages/${id}/clone`)
    return response.data
  }

  static async bulkUpdatePages(ids: string[], data: Partial<Page>): Promise<ApiResponse<void>> {
    const response = await api.patch('/admin/pages/bulk', { ids, data })
    return response.data
  }

  static async bulkDeletePages(ids: string[]): Promise<ApiResponse<void>> {
    const response = await api.delete('/admin/pages/bulk', { data: { ids } })
    return response.data
  }

  static async savePageDraft(id: string, content: TipTapJSONContent): Promise<ApiResponse<void>> {
    const response = await api.post(`/admin/pages/${id}/autosave`, { content })
    return response.data
  }

  static async getPagePreview(id: string): Promise<ApiResponse<{ url: string }>> {
    const response = await api.get(`/admin/pages/${id}/preview`)
    return response.data
  }

  static async getPageRevisions(id: string): Promise<ApiResponse<Page[]>> {
    const response = await api.get(`/admin/pages/${id}/revisions`)
    return response.data
  }

  static async restorePageRevision(pageId: string, revisionId: string): Promise<ApiResponse<Page>> {
    const response = await api.post(`/admin/pages/${pageId}/revisions/${revisionId}/restore`)
    return response.data
  }

  static async getPageTree(): Promise<ApiResponse<Page[]>> {
    const response = await api.get('/admin/pages/tree')
    return response.data
  }

  // Categories Management
  static async getCategories(hierarchical: boolean = true): Promise<ApiResponse<Category[]>> {
    const response = await api.get(`/admin/categories?hierarchical=${hierarchical}`)
    return response.data
  }

  static async getCategory(id: string): Promise<ApiResponse<Category>> {
    const response = await api.get(`/admin/categories/${id}`)
    return response.data
  }

  static async createCategory(category: Partial<Category>): Promise<ApiResponse<Category>> {
    const response = await api.post('/admin/categories', category)
    return response.data
  }

  static async updateCategory(id: string, category: Partial<Category>): Promise<ApiResponse<Category>> {
    const response = await api.put(`/admin/categories/${id}`, category)
    return response.data
  }

  static async deleteCategory(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/admin/categories/${id}`)
    return response.data
  }

  static async reorderCategories(categories: { id: string; order: number; parentId?: string }[]): Promise<ApiResponse<void>> {
    const response = await api.patch('/admin/categories/reorder', { categories })
    return response.data
  }

  // Tags Management
  static async getTags(): Promise<ApiResponse<Tag[]>> {
    const response = await api.get('/admin/tags')
    return response.data
  }

  static async getTag(id: string): Promise<ApiResponse<Tag>> {
    const response = await api.get(`/admin/tags/${id}`)
    return response.data
  }

  static async createTag(tag: Partial<Tag>): Promise<ApiResponse<Tag>> {
    const response = await api.post('/admin/tags', tag)
    return response.data
  }

  static async updateTag(id: string, tag: Partial<Tag>): Promise<ApiResponse<Tag>> {
    const response = await api.put(`/admin/tags/${id}`, tag)
    return response.data
  }

  static async deleteTag(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/admin/tags/${id}`)
    return response.data
  }

  static async mergeTags(fromId: string, toId: string): Promise<ApiResponse<void>> {
    const response = await api.post(`/admin/tags/${fromId}/merge/${toId}`)
    return response.data
  }

  // Media Management
  static async getMediaFiles(
    page: number = 1,
    pageSize: number = 50,
    folderId?: string,
    type?: string,
    search?: string
  ): Promise<ApiResponse<MediaFile[]>> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      ...(folderId && { folderId }),
      ...(type && { type }),
      ...(search && { search })
    })
    
    const response = await api.get(`/admin/media?${params}`)
    return response.data
  }

  static async getMediaFile(id: string): Promise<ApiResponse<MediaFile>> {
    const response = await api.get(`/admin/media/${id}`)
    return response.data
  }

  static async uploadFiles(
    files: File[],
    folderId?: string,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<MediaFile[]>> {
    const formData = new FormData()
    
    files.forEach((file: any) => {
      formData.append('files', file)
    })
    
    if (folderId) {
      formData.append('folderId', folderId)
    }

    const response = await api.post('/admin/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      }
    })
    
    return response.data
  }

  static async updateMediaFile(id: string, data: Partial<MediaFile>): Promise<ApiResponse<MediaFile>> {
    const response = await api.put(`/admin/media/${id}`, data)
    return response.data
  }

  static async deleteMediaFile(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/admin/media/${id}`)
    return response.data
  }

  static async bulkDeleteMediaFiles(ids: string[]): Promise<ApiResponse<void>> {
    const response = await api.delete('/admin/media/bulk', { data: { ids } })
    return response.data
  }

  // Media Folders
  static async getMediaFolders(): Promise<ApiResponse<MediaFolder[]>> {
    const response = await api.get('/admin/media/folders')
    return response.data
  }

  static async createMediaFolder(folder: Partial<MediaFolder>): Promise<ApiResponse<MediaFolder>> {
    const response = await api.post('/admin/media/folders', folder)
    return response.data
  }

  static async updateMediaFolder(id: string, folder: Partial<MediaFolder>): Promise<ApiResponse<MediaFolder>> {
    const response = await api.put(`/admin/media/folders/${id}`, folder)
    return response.data
  }

  static async deleteMediaFolder(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/admin/media/folders/${id}`)
    return response.data
  }

  // Custom Fields
  static async getFieldGroups(): Promise<ApiResponse<FieldGroup[]>> {
    const response = await api.get('/admin/custom-fields/groups')
    return response.data
  }

  static async getFieldGroup(id: string): Promise<ApiResponse<FieldGroup>> {
    const response = await api.get(`/admin/custom-fields/groups/${id}`)
    return response.data
  }

  static async createFieldGroup(group: Partial<FieldGroup>): Promise<ApiResponse<FieldGroup>> {
    const response = await api.post('/admin/custom-fields/groups', group)
    return response.data
  }

  static async updateFieldGroup(id: string, group: Partial<FieldGroup>): Promise<ApiResponse<FieldGroup>> {
    const response = await api.put(`/admin/custom-fields/groups/${id}`, group)
    return response.data
  }

  static async deleteFieldGroup(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/admin/custom-fields/groups/${id}`)
    return response.data
  }

  static async exportFieldGroups(ids?: string[]): Promise<ApiResponse<{ downloadUrl: string }>> {
    const response = await api.post('/admin/custom-fields/export', { ids })
    return response.data
  }

  static async importFieldGroups(data: FormData): Promise<ApiResponse<FieldGroup[]>> {
    const response = await api.post('/admin/custom-fields/import', data)
    return response.data
  }

  // Templates
  static async getTemplates(type?: string): Promise<ApiResponse<Template[]>> {
    const params = type ? `?type=${type}` : ''
    const response = await api.get(`/admin/templates${params}`)
    return response.data
  }

  static async getTemplate(id: string): Promise<ApiResponse<Template>> {
    const response = await api.get(`/admin/templates/${id}`)
    return response.data
  }

  static async createTemplate(template: Partial<Template>): Promise<ApiResponse<Template>> {
    const response = await api.post('/admin/templates', template)
    return response.data
  }

  static async updateTemplate(id: string, template: Partial<Template>): Promise<ApiResponse<Template>> {
    const response = await api.put(`/admin/templates/${id}`, template)
    return response.data
  }

  static async deleteTemplate(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/admin/templates/${id}`)
    return response.data
  }

  // Menus
  static async getMenus(): Promise<ApiResponse<Menu[]>> {
    const response = await api.get('/admin/menus')
    return response.data
  }

  static async getMenu(id: string): Promise<ApiResponse<Menu>> {
    const response = await api.get(`/admin/menus/${id}`)
    return response.data
  }

  static async createMenu(menu: Partial<Menu>): Promise<ApiResponse<Menu>> {
    const response = await api.post('/admin/menus', menu)
    return response.data
  }

  static async updateMenu(id: string, menu: Partial<Menu>): Promise<ApiResponse<Menu>> {
    const response = await api.put(`/admin/menus/${id}`, menu)
    return response.data
  }

  static async deleteMenu(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/admin/menus/${id}`)
    return response.data
  }

  // Utility Functions
  static async getAuthors(): Promise<ApiResponse<Array<{id: string, name: string}>>> {
    const response = await api.get('/admin/users/authors')
    return response.data
  }

  static async generateSlug(title: string, type: 'post' | 'page' | 'category' | 'tag' = 'post'): Promise<ApiResponse<{slug: string}>> {
    const response = await api.post('/admin/utils/generate-slug', { title, type })
    return response.data
  }

  static async validateSlug(slug: string, type: 'post' | 'page' | 'category' | 'tag' = 'post', excludeId?: string): Promise<ApiResponse<{isValid: boolean, suggestion?: string}>> {
    const params = new URLSearchParams({ slug, type })
    if (excludeId) params.append('excludeId', excludeId)
    
    const response = await api.get(`/admin/utils/validate-slug?${params}`)
    return response.data
  }

  static async searchContent(query: string, types?: PostType[]): Promise<ApiResponse<Post[]>> {
    const params = new URLSearchParams({ query })
    if (types) {
      types.forEach((type: any) => params.append('types', type))
    }
    
    const response = await api.get(`/admin/search?${params}`)
    return response.data
  }

  static async getContentStats(): Promise<ApiResponse<{
    posts: Record<PostStatus, number>
    pages: Record<PostStatus, number>
    media: { total: number; byType: Record<string, number> }
    categories: number
    tags: number
  }>> {
    const response = await api.get('/admin/stats')
    return response.data
  }
}