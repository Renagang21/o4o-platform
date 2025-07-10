import { api } from './base';
export class ContentApi {
    static async getPosts(page = 1, pageSize = 20, filters) {
        const params = new URLSearchParams({
            page: page.toString(),
            pageSize: pageSize.toString()
        });
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined) {
                    params.append(key, value.toString());
                }
            });
        }
        const response = await api.get(`/admin/posts?${params}`);
        return response.data;
    }
    static async getPost(id) {
        const response = await api.get(`/admin/posts/${id}`);
        return response.data;
    }
    static async createPost(post) {
        const response = await api.post('/admin/posts', post);
        return response.data;
    }
    static async updatePost(id, post) {
        const response = await api.put(`/admin/posts/${id}`, post);
        return response.data;
    }
    static async deletePost(id) {
        const response = await api.delete(`/admin/posts/${id}`);
        return response.data;
    }
    static async clonePost(id) {
        const response = await api.post(`/admin/posts/${id}/clone`);
        return response.data;
    }
    static async bulkUpdatePosts(ids, data) {
        const response = await api.patch('/admin/posts/bulk', { ids, data });
        return response.data;
    }
    static async bulkDeletePosts(ids) {
        const response = await api.delete('/admin/posts/bulk', { data: { ids } });
        return response.data;
    }
    static async getPostPreview(id) {
        const response = await api.get(`/admin/posts/${id}/preview`);
        return response.data;
    }
    static async savePostDraft(id, content) {
        const response = await api.post(`/admin/posts/${id}/autosave`, { content });
        return response.data;
    }
    static async getPostRevisions(id) {
        const response = await api.get(`/admin/posts/${id}/revisions`);
        return response.data;
    }
    static async restorePostRevision(postId, revisionId) {
        const response = await api.post(`/admin/posts/${postId}/revisions/${revisionId}/restore`);
        return response.data;
    }
    static async getPages(page = 1, pageSize = 20, filters) {
        const params = new URLSearchParams({
            page: page.toString(),
            pageSize: pageSize.toString()
        });
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined) {
                    params.append(key, value.toString());
                }
            });
        }
        const response = await api.get(`/admin/pages?${params}`);
        return response.data;
    }
    static async getPage(id) {
        const response = await api.get(`/admin/pages/${id}`);
        return response.data;
    }
    static async createPage(page) {
        const response = await api.post('/admin/pages', page);
        return response.data;
    }
    static async updatePage(id, page) {
        const response = await api.put(`/admin/pages/${id}`, page);
        return response.data;
    }
    static async deletePage(id) {
        const response = await api.delete(`/admin/pages/${id}`);
        return response.data;
    }
    static async clonePage(id) {
        const response = await api.post(`/admin/pages/${id}/clone`);
        return response.data;
    }
    static async bulkUpdatePages(ids, data) {
        const response = await api.patch('/admin/pages/bulk', { ids, data });
        return response.data;
    }
    static async bulkDeletePages(ids) {
        const response = await api.delete('/admin/pages/bulk', { data: { ids } });
        return response.data;
    }
    static async savePageDraft(id, content) {
        const response = await api.post(`/admin/pages/${id}/autosave`, { content });
        return response.data;
    }
    static async getPagePreview(id) {
        const response = await api.get(`/admin/pages/${id}/preview`);
        return response.data;
    }
    static async getPageRevisions(id) {
        const response = await api.get(`/admin/pages/${id}/revisions`);
        return response.data;
    }
    static async restorePageRevision(pageId, revisionId) {
        const response = await api.post(`/admin/pages/${pageId}/revisions/${revisionId}/restore`);
        return response.data;
    }
    static async getPageTree() {
        const response = await api.get('/admin/pages/tree');
        return response.data;
    }
    static async getCategories(hierarchical = true) {
        const response = await api.get(`/admin/categories?hierarchical=${hierarchical}`);
        return response.data;
    }
    static async getCategory(id) {
        const response = await api.get(`/admin/categories/${id}`);
        return response.data;
    }
    static async createCategory(category) {
        const response = await api.post('/admin/categories', category);
        return response.data;
    }
    static async updateCategory(id, category) {
        const response = await api.put(`/admin/categories/${id}`, category);
        return response.data;
    }
    static async deleteCategory(id) {
        const response = await api.delete(`/admin/categories/${id}`);
        return response.data;
    }
    static async reorderCategories(categories) {
        const response = await api.patch('/admin/categories/reorder', { categories });
        return response.data;
    }
    static async getTags() {
        const response = await api.get('/admin/tags');
        return response.data;
    }
    static async getTag(id) {
        const response = await api.get(`/admin/tags/${id}`);
        return response.data;
    }
    static async createTag(tag) {
        const response = await api.post('/admin/tags', tag);
        return response.data;
    }
    static async updateTag(id, tag) {
        const response = await api.put(`/admin/tags/${id}`, tag);
        return response.data;
    }
    static async deleteTag(id) {
        const response = await api.delete(`/admin/tags/${id}`);
        return response.data;
    }
    static async mergeTags(fromId, toId) {
        const response = await api.post(`/admin/tags/${fromId}/merge/${toId}`);
        return response.data;
    }
    static async getMediaFiles(page = 1, pageSize = 50, folderId, type, search) {
        const params = new URLSearchParams({
            page: page.toString(),
            pageSize: pageSize.toString(),
            ...(folderId && { folderId }),
            ...(type && { type }),
            ...(search && { search })
        });
        const response = await api.get(`/admin/media?${params}`);
        return response.data;
    }
    static async getMediaFile(id) {
        const response = await api.get(`/admin/media/${id}`);
        return response.data;
    }
    static async uploadFiles(files, folderId, onProgress) {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });
        if (folderId) {
            formData.append('folderId', folderId);
        }
        const response = await api.post('/admin/media/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(progress);
                }
            }
        });
        return response.data;
    }
    static async updateMediaFile(id, data) {
        const response = await api.put(`/admin/media/${id}`, data);
        return response.data;
    }
    static async deleteMediaFile(id) {
        const response = await api.delete(`/admin/media/${id}`);
        return response.data;
    }
    static async bulkDeleteMediaFiles(ids) {
        const response = await api.delete('/admin/media/bulk', { data: { ids } });
        return response.data;
    }
    static async getMediaFolders() {
        const response = await api.get('/admin/media/folders');
        return response.data;
    }
    static async createMediaFolder(folder) {
        const response = await api.post('/admin/media/folders', folder);
        return response.data;
    }
    static async updateMediaFolder(id, folder) {
        const response = await api.put(`/admin/media/folders/${id}`, folder);
        return response.data;
    }
    static async deleteMediaFolder(id) {
        const response = await api.delete(`/admin/media/folders/${id}`);
        return response.data;
    }
    static async getFieldGroups() {
        const response = await api.get('/admin/custom-fields/groups');
        return response.data;
    }
    static async getFieldGroup(id) {
        const response = await api.get(`/admin/custom-fields/groups/${id}`);
        return response.data;
    }
    static async createFieldGroup(group) {
        const response = await api.post('/admin/custom-fields/groups', group);
        return response.data;
    }
    static async updateFieldGroup(id, group) {
        const response = await api.put(`/admin/custom-fields/groups/${id}`, group);
        return response.data;
    }
    static async deleteFieldGroup(id) {
        const response = await api.delete(`/admin/custom-fields/groups/${id}`);
        return response.data;
    }
    static async exportFieldGroups(ids) {
        const response = await api.post('/admin/custom-fields/export', { ids });
        return response.data;
    }
    static async importFieldGroups(data) {
        const response = await api.post('/admin/custom-fields/import', data);
        return response.data;
    }
    static async getTemplates(type) {
        const params = type ? `?type=${type}` : '';
        const response = await api.get(`/admin/templates${params}`);
        return response.data;
    }
    static async getTemplate(id) {
        const response = await api.get(`/admin/templates/${id}`);
        return response.data;
    }
    static async createTemplate(template) {
        const response = await api.post('/admin/templates', template);
        return response.data;
    }
    static async updateTemplate(id, template) {
        const response = await api.put(`/admin/templates/${id}`, template);
        return response.data;
    }
    static async deleteTemplate(id) {
        const response = await api.delete(`/admin/templates/${id}`);
        return response.data;
    }
    static async getMenus() {
        const response = await api.get('/admin/menus');
        return response.data;
    }
    static async getMenu(id) {
        const response = await api.get(`/admin/menus/${id}`);
        return response.data;
    }
    static async createMenu(menu) {
        const response = await api.post('/admin/menus', menu);
        return response.data;
    }
    static async updateMenu(id, menu) {
        const response = await api.put(`/admin/menus/${id}`, menu);
        return response.data;
    }
    static async deleteMenu(id) {
        const response = await api.delete(`/admin/menus/${id}`);
        return response.data;
    }
    static async getAuthors() {
        const response = await api.get('/admin/users/authors');
        return response.data;
    }
    static async generateSlug(title, type = 'post') {
        const response = await api.post('/admin/utils/generate-slug', { title, type });
        return response.data;
    }
    static async validateSlug(slug, type = 'post', excludeId) {
        const params = new URLSearchParams({ slug, type });
        if (excludeId)
            params.append('excludeId', excludeId);
        const response = await api.get(`/admin/utils/validate-slug?${params}`);
        return response.data;
    }
    static async searchContent(query, types) {
        const params = new URLSearchParams({ query });
        if (types) {
            types.forEach(type => params.append('types', type));
        }
        const response = await api.get(`/admin/search?${params}`);
        return response.data;
    }
    static async getContentStats() {
        const response = await api.get('/admin/stats');
        return response.data;
    }
}
//# sourceMappingURL=contentApi.js.map