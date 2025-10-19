export declare class SlugService {
    private postRepository;
    private pageRepository;
    private tagRepository;
    private categoryRepository;
    /**
     * Generate URL-friendly slug from title
     */
    generateSlug(title: string): string;
    /**
     * Ensure slug uniqueness for posts
     */
    ensureUniquePostSlug(input: string, excludeId?: string, isSlug?: boolean): Promise<string>;
    /**
     * Ensure slug uniqueness for pages
     */
    ensureUniquePageSlug(slugOrTitle: string, excludeId?: string): Promise<string>;
    /**
     * Ensure slug uniqueness for tags
     */
    ensureUniqueTagSlug(slugOrName: string, excludeId?: string): Promise<string>;
    /**
     * Ensure slug uniqueness for categories
     */
    ensureUniqueCategorySlug(slugOrName: string, excludeId?: string): Promise<string>;
    /**
     * Validate slug format
     */
    validateSlug(slug: string): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Get slug suggestions based on title
     */
    getSuggestedSlugs(title: string, count?: number): string[];
    /**
     * Update page slug and handle redirects
     */
    updatePageSlug(pageId: string, newSlug: string): Promise<{
        success: boolean;
        slug: string;
        errors?: string[];
    }>;
    private isPostSlugTaken;
    private isPageSlugTaken;
    private isTagSlugTaken;
    private isCategorySlugTaken;
    /**
     * Basic Korean to Roman character mapping
     * This is a simplified version - for full romanization, use a dedicated library
     */
    private koreanToRoman;
    /**
     * Clean and optimize existing slugs in database
     */
    cleanupExistingSlugs(): Promise<{
        postsUpdated: number;
        pagesUpdated: number;
        categoriesUpdated: number;
        tagsUpdated: number;
    }>;
}
export declare const slugService: SlugService;
//# sourceMappingURL=slug.service.d.ts.map