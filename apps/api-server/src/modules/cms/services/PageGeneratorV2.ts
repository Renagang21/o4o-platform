import { ViewService } from './ViewService.js';
import { PageService } from './PageService.js';
import { CustomPostTypeService } from './CustomPostTypeService.js';
import { PageStatus } from '../entities/Page.js';
import type { Page } from '../entities/Page.js';
import logger from '../../../utils/logger.js';

export interface GeneratePageOptions {
  viewSlug: string;
  postTypeSlug?: string;
  slug: string;
  title: string;
  dataBindings?: Record<string, any>;
  siteId?: string;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
  };
}

export interface GeneratePagesFromCPTOptions {
  cptSlug: string;
  viewSlug: string;
  siteId?: string;
  slugPattern?: string; // e.g., 'blog/{slug}' or 'products/{id}'
}

export class PageGeneratorV2 {
  private static instance: PageGeneratorV2;
  private viewService: ViewService;
  private pageService: PageService;
  private cptService: CustomPostTypeService;

  constructor() {
    this.viewService = ViewService.getInstance();
    this.pageService = PageService.getInstance();
    this.cptService = CustomPostTypeService.getInstance();
  }

  static getInstance(): PageGeneratorV2 {
    if (!PageGeneratorV2.instance) {
      PageGeneratorV2.instance = new PageGeneratorV2();
    }
    return PageGeneratorV2.instance;
  }

  /**
   * Generate a single Page from a View template
   */
  async generatePage(options: GeneratePageOptions): Promise<Page> {
    // 1. Get View template
    const view = await this.viewService.getViewBySlug(options.viewSlug);
    if (!view) {
      throw new Error(`View not found: ${options.viewSlug}`);
    }

    // 2. Validate View is active
    if (!view.isActive) {
      throw new Error(`View '${options.viewSlug}' is not active.`);
    }

    // 3. Prepare content data
    const content = {
      ...options.dataBindings,
      viewId: view.id,
      viewSlug: options.viewSlug,
      generatedAt: new Date().toISOString(),
      generatedBy: 'PageGeneratorV2'
    };

    // 4. Create Page
    const page = await this.pageService.createPage({
      slug: options.slug,
      title: options.title,
      viewId: view.id,
      content,
      siteId: options.siteId,
      seo: options.seo
    });

    logger.info(`[PageGeneratorV2] Page generated: ${page.slug}`, {
      pageId: page.id,
      viewSlug: options.viewSlug,
      viewType: view.type
    });

    return page;
  }

  /**
   * Generate multiple Pages from CPT posts
   * Note: Requires Post entity implementation
   */
  async generatePagesFromCPT(options: GeneratePagesFromCPTOptions): Promise<Page[]> {
    // 1. Validate CPT exists
    const cpt = await this.cptService.getCPTBySlug(options.cptSlug);
    if (!cpt) {
      throw new Error(`CustomPostType not found: ${options.cptSlug}`);
    }

    // 2. Validate View exists
    const view = await this.viewService.getViewBySlug(options.viewSlug);
    if (!view) {
      throw new Error(`View not found: ${options.viewSlug}`);
    }

    if (!view.isActive) {
      throw new Error(`View '${options.viewSlug}' is not active`);
    }

    // 3. Get all posts for this CPT
    // TODO: Implement Post entity and query
    // For now, return empty array with warning
    logger.warn('[PageGeneratorV2] Post entity not implemented yet. Cannot generate pages from CPT posts.', {
      cptSlug: options.cptSlug
    });

    // When Post entity is ready, this would be:
    // const posts = await postService.getPostsByCPT(cpt.id);
    // const pages = await Promise.all(
    //   posts.map(post => this.generatePage({
    //     viewSlug: options.viewSlug,
    //     slug: this.generateSlugFromPattern(options.slugPattern || '{slug}', post),
    //     title: post.title,
    //     dataBindings: { post },
    //     siteId: options.siteId
    //   }))
    // );

    return [];
  }

  /**
   * Update Page content to reflect latest View changes
   */
  async updatePageFromView(pageId: string): Promise<Page> {
    // 1. Get Page with View relation
    const page = await this.pageService.getPage(pageId);
    if (!page || !page.viewId) {
      throw new Error('Page or View not found');
    }

    // 2. Get latest View
    const view = await this.viewService.getView(page.viewId);
    if (!view) {
      throw new Error(`View not found: ${page.viewId}`);
    }

    // 3. Update Page content with new View layout
    const updatedContent = {
      ...page.content,
      viewLayout: view.layout,
      lastSyncedAt: new Date().toISOString(),
      lastSyncedVersion: view.updatedAt.toISOString()
    };

    const updated = await this.pageService.updatePage(pageId, {
      content: updatedContent
    });

    logger.info(`[PageGeneratorV2] Page synced with View: ${page.slug}`, {
      pageId,
      viewId: page.viewId,
      viewSlug: view.slug
    });

    return updated;
  }

  /**
   * Bulk update all Pages using a specific View
   */
  async syncPagesWithView(viewId: string): Promise<{ updated: number; failed: number }> {
    const view = await this.viewService.getView(viewId);
    if (!view) {
      throw new Error(`View not found: ${viewId}`);
    }

    const { pages } = await this.pageService.listPages({ viewId, limit: 1000 });

    let updated = 0;
    let failed = 0;

    for (const page of pages) {
      try {
        await this.updatePageFromView(page.id);
        updated++;
      } catch (error: any) {
        logger.error(`[PageGeneratorV2] Failed to sync page ${page.slug}`, {
          error: error.message,
          pageId: page.id
        });
        failed++;
      }
    }

    logger.info(`[PageGeneratorV2] Bulk sync complete for View: ${view.slug}`, {
      viewId,
      totalPages: pages.length,
      updated,
      failed
    });

    return { updated, failed };
  }

  /**
   * Generate slug from pattern and data
   * Pattern examples: 'blog/{slug}', 'products/{id}', 'category/{category}/{slug}'
   */
  private generateSlugFromPattern(pattern: string, data: Record<string, any>): string {
    let slug = pattern;

    const placeholderRegex = /\{(\w+)\}/g;
    slug = slug.replace(placeholderRegex, (match, key) => {
      return data[key] || match;
    });

    return slug;
  }

  /**
   * Preview Page rendering without saving
   */
  async previewPage(options: GeneratePageOptions): Promise<{ viewLayout: any; content: any }> {
    const view = await this.viewService.getViewBySlug(options.viewSlug);
    if (!view) {
      throw new Error(`View not found: ${options.viewSlug}`);
    }

    if (!view.isActive) {
      throw new Error(`View '${options.viewSlug}' is not active`);
    }

    const content = {
      ...options.dataBindings,
      viewId: view.id,
      viewSlug: options.viewSlug,
      previewMode: true
    };

    return {
      viewLayout: view.layout,
      content
    };
  }

  /**
   * Generate landing page with specific components
   * Note: Requires organizationId for View creation
   */
  async generateLandingPage(
    slug: string,
    title: string,
    components: Array<{ type: string; props: Record<string, any> }>,
    siteId?: string,
    organizationId?: string
  ): Promise<Page> {
    // Create layout configuration for landing page
    const layout = {
      version: '2.0',
      type: 'page',
      components: components.map((comp, index) => ({
        id: `component_${index}`,
        type: comp.type,
        props: comp.props
      }))
    };

    // Create temporary View for this landing page
    const viewSlug = `landing-${slug}`;
    let view = await this.viewService.getViewBySlug(viewSlug);

    if (!view && organizationId) {
      view = await this.viewService.createView({
        organizationId,
        slug: viewSlug,
        name: `Landing Page View: ${title}`,
        type: 'page',
        layout,
        metadata: { landingPage: true, autoGenerated: true }
      });

      // Activate the view immediately
      await this.viewService.activateView(view.id);
    }

    if (!view) {
      throw new Error(`View not found and organizationId not provided for creation: ${viewSlug}`);
    }

    // Generate Page
    return this.generatePage({
      viewSlug: viewSlug,
      slug,
      title,
      siteId,
      dataBindings: { landingPage: true }
    });
  }
}
