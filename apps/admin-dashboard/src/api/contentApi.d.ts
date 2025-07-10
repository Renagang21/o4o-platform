import { Post, Page, Category, Tag, MediaFile, MediaFolder, FieldGroup, Template, Menu, ApiResponse, ContentFilters, PostType, PostStatus } from '@/types/content';
export declare class ContentApi {
    static getPosts(page?: number, pageSize?: number, filters?: ContentFilters): Promise<ApiResponse<Post[]>>;
    static getPost(id: string): Promise<ApiResponse<Post>>;
    static createPost(post: Partial<Post>): Promise<ApiResponse<Post>>;
    static updatePost(id: string, post: Partial<Post>): Promise<ApiResponse<Post>>;
    static deletePost(id: string): Promise<ApiResponse<void>>;
    static clonePost(id: string): Promise<ApiResponse<Post>>;
    static bulkUpdatePosts(ids: string[], data: Partial<Post>): Promise<ApiResponse<void>>;
    static bulkDeletePosts(ids: string[]): Promise<ApiResponse<void>>;
    static getPostPreview(id: string): Promise<ApiResponse<{
        url: string;
    }>>;
    static savePostDraft(id: string, content: any): Promise<ApiResponse<void>>;
    static getPostRevisions(id: string): Promise<ApiResponse<Post[]>>;
    static restorePostRevision(postId: string, revisionId: string): Promise<ApiResponse<Post>>;
    static getPages(page?: number, pageSize?: number, filters?: ContentFilters): Promise<ApiResponse<Page[]>>;
    static getPage(id: string): Promise<ApiResponse<Page>>;
    static createPage(page: Partial<Page>): Promise<ApiResponse<Page>>;
    static updatePage(id: string, page: Partial<Page>): Promise<ApiResponse<Page>>;
    static deletePage(id: string): Promise<ApiResponse<void>>;
    static clonePage(id: string): Promise<ApiResponse<Page>>;
    static bulkUpdatePages(ids: string[], data: Partial<Page>): Promise<ApiResponse<void>>;
    static bulkDeletePages(ids: string[]): Promise<ApiResponse<void>>;
    static savePageDraft(id: string, content: any): Promise<ApiResponse<void>>;
    static getPagePreview(id: string): Promise<ApiResponse<{
        url: string;
    }>>;
    static getPageRevisions(id: string): Promise<ApiResponse<Page[]>>;
    static restorePageRevision(pageId: string, revisionId: string): Promise<ApiResponse<Page>>;
    static getPageTree(): Promise<ApiResponse<Page[]>>;
    static getCategories(hierarchical?: boolean): Promise<ApiResponse<Category[]>>;
    static getCategory(id: string): Promise<ApiResponse<Category>>;
    static createCategory(category: Partial<Category>): Promise<ApiResponse<Category>>;
    static updateCategory(id: string, category: Partial<Category>): Promise<ApiResponse<Category>>;
    static deleteCategory(id: string): Promise<ApiResponse<void>>;
    static reorderCategories(categories: {
        id: string;
        order: number;
        parentId?: string;
    }[]): Promise<ApiResponse<void>>;
    static getTags(): Promise<ApiResponse<Tag[]>>;
    static getTag(id: string): Promise<ApiResponse<Tag>>;
    static createTag(tag: Partial<Tag>): Promise<ApiResponse<Tag>>;
    static updateTag(id: string, tag: Partial<Tag>): Promise<ApiResponse<Tag>>;
    static deleteTag(id: string): Promise<ApiResponse<void>>;
    static mergeTags(fromId: string, toId: string): Promise<ApiResponse<void>>;
    static getMediaFiles(page?: number, pageSize?: number, folderId?: string, type?: string, search?: string): Promise<ApiResponse<MediaFile[]>>;
    static getMediaFile(id: string): Promise<ApiResponse<MediaFile>>;
    static uploadFiles(files: File[], folderId?: string, onProgress?: (progress: number) => void): Promise<ApiResponse<MediaFile[]>>;
    static updateMediaFile(id: string, data: Partial<MediaFile>): Promise<ApiResponse<MediaFile>>;
    static deleteMediaFile(id: string): Promise<ApiResponse<void>>;
    static bulkDeleteMediaFiles(ids: string[]): Promise<ApiResponse<void>>;
    static getMediaFolders(): Promise<ApiResponse<MediaFolder[]>>;
    static createMediaFolder(folder: Partial<MediaFolder>): Promise<ApiResponse<MediaFolder>>;
    static updateMediaFolder(id: string, folder: Partial<MediaFolder>): Promise<ApiResponse<MediaFolder>>;
    static deleteMediaFolder(id: string): Promise<ApiResponse<void>>;
    static getFieldGroups(): Promise<ApiResponse<FieldGroup[]>>;
    static getFieldGroup(id: string): Promise<ApiResponse<FieldGroup>>;
    static createFieldGroup(group: Partial<FieldGroup>): Promise<ApiResponse<FieldGroup>>;
    static updateFieldGroup(id: string, group: Partial<FieldGroup>): Promise<ApiResponse<FieldGroup>>;
    static deleteFieldGroup(id: string): Promise<ApiResponse<void>>;
    static exportFieldGroups(ids?: string[]): Promise<ApiResponse<any>>;
    static importFieldGroups(data: any): Promise<ApiResponse<FieldGroup[]>>;
    static getTemplates(type?: string): Promise<ApiResponse<Template[]>>;
    static getTemplate(id: string): Promise<ApiResponse<Template>>;
    static createTemplate(template: Partial<Template>): Promise<ApiResponse<Template>>;
    static updateTemplate(id: string, template: Partial<Template>): Promise<ApiResponse<Template>>;
    static deleteTemplate(id: string): Promise<ApiResponse<void>>;
    static getMenus(): Promise<ApiResponse<Menu[]>>;
    static getMenu(id: string): Promise<ApiResponse<Menu>>;
    static createMenu(menu: Partial<Menu>): Promise<ApiResponse<Menu>>;
    static updateMenu(id: string, menu: Partial<Menu>): Promise<ApiResponse<Menu>>;
    static deleteMenu(id: string): Promise<ApiResponse<void>>;
    static getAuthors(): Promise<ApiResponse<Array<{
        id: string;
        name: string;
    }>>>;
    static generateSlug(title: string, type?: 'post' | 'page' | 'category' | 'tag'): Promise<ApiResponse<{
        slug: string;
    }>>;
    static validateSlug(slug: string, type?: 'post' | 'page' | 'category' | 'tag', excludeId?: string): Promise<ApiResponse<{
        isValid: boolean;
        suggestion?: string;
    }>>;
    static searchContent(query: string, types?: PostType[]): Promise<ApiResponse<Post[]>>;
    static getContentStats(): Promise<ApiResponse<{
        posts: Record<PostStatus, number>;
        pages: Record<PostStatus, number>;
        media: {
            total: number;
            byType: Record<string, number>;
        };
        categories: number;
        tags: number;
    }>>;
}
//# sourceMappingURL=contentApi.d.ts.map