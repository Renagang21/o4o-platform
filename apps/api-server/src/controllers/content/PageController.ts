import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection';
import { Page } from '../../entities/Page';
import { User } from '../../entities/User';
import { slugService } from '../../services/slug.service';
import { revisionService } from '../../services/revision.service';
import logger from '../../utils/logger';
import { TreeRepository } from 'typeorm';

export class PageController {
  private pageRepository = AppDataSource.getRepository(Page);
  private userRepository = AppDataSource.getRepository(User);

  // GET /api/pages - 페이지 목록 (계층구조)
  getPages = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        includeChildren = true,
        status = 'published',
        showInMenu,
        parentId,
        maxDepth = 5
      } = req.query;

      let queryBuilder = this.pageRepository
        .createQueryBuilder('page')
        .leftJoinAndSelect('page.author', 'author')
        .leftJoinAndSelect('page.lastModifier', 'lastModifier');

      // Add parent/child relationships if needed
      if (includeChildren === 'true') {
        queryBuilder = queryBuilder
          .leftJoinAndSelect('page.children', 'children')
          .leftJoinAndSelect('page.parent', 'parent');
      }

      // Status filter
      if (status !== 'all') {
        queryBuilder.andWhere('page.status = :status', { status });
      }

      // Menu visibility filter
      if (showInMenu !== undefined) {
        queryBuilder.andWhere('page.showInMenu = :showInMenu', { 
          showInMenu: showInMenu === 'true' 
        });
      }

      // Parent filter for nested listing
      if (parentId) {
        queryBuilder.andWhere('page.parentId = :parentId', { parentId });
      } else if (includeChildren === 'false') {
        // Get only root pages if not including children
        queryBuilder.andWhere('page.parentId IS NULL');
      }

      // Order by menu order, then by title
      queryBuilder
        .orderBy('page.menuOrder', 'ASC')
        .addOrderBy('page.title', 'ASC');

      const pages = await queryBuilder.getMany();

      // Build hierarchical structure
      const hierarchicalPages = this.buildPageHierarchy(pages, null, Number(maxDepth));

      res.json({
        success: true,
        data: {
          pages: hierarchicalPages.map(page => this.formatPageResponse(page, includeChildren === 'true'))
        }
      });
    } catch (error) {
      logger.error('Error getting pages:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve pages'
      });
    }
  };

  // GET /api/pages/:id - 페이지 상세 조회
  getPage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { includeChildren = false, includeRevisions = false } = req.query;

      let queryBuilder = this.pageRepository
        .createQueryBuilder('page')
        .leftJoinAndSelect('page.author', 'author')
        .leftJoinAndSelect('page.lastModifier', 'lastModifier')
        .leftJoinAndSelect('page.parent', 'parent')
        .where('page.id = :id', { id });

      if (includeChildren === 'true') {
        queryBuilder = queryBuilder.leftJoinAndSelect('page.children', 'children');
      }

      const page = await queryBuilder.getOne();

      if (!page) {
        res.status(404).json({
          success: false,
          error: 'Page not found'
        });
        return;
      }

      let revisions = [];
      if (includeRevisions === 'true') {
        revisions = await revisionService.getPageRevisions(id, 10);
      }

      // Increment view count
      await this.pageRepository.increment({ id }, 'views', 1);

      res.json({
        success: true,
        data: {
          page: this.formatPageResponse(page, includeChildren === 'true'),
          revisions: includeRevisions === 'true' ? revisions : undefined
        }
      });
    } catch (error) {
      logger.error('Error getting page:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve page'
      });
    }
  };

  // POST /api/pages - 페이지 생성
  createPage = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        title,
        content,
        excerpt,
        status = 'draft',
        template,
        parentId = null,
        menuOrder = 0,
        showInMenu = true,
        isHomepage = false,
        seo = {},
        customFields = {},
        publishedAt,
        scheduledAt,
        password,
        allowComments = true
      } = req.body;

      const authorId = req.user?.id;

      if (!authorId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Validate parent hierarchy
      if (parentId) {
        const parent = await this.pageRepository.findOne({ where: { id: parentId } });
        if (!parent) {
          res.status(400).json({
            success: false,
            error: 'Parent page not found'
          });
          return;
        }

        // Check depth limit
        const depth = await this.calculatePageDepth(parentId);
        if (depth >= 5) {
          res.status(400).json({
            success: false,
            error: 'Maximum page depth exceeded'
          });
          return;
        }
      }

      // Generate unique slug
      const slug = await slugService.ensureUniquePageSlug(title);

      // Handle homepage setting
      if (isHomepage) {
        // Unset current homepage
        await this.pageRepository.update(
          { isHomepage: true },
          { isHomepage: false }
        );
      }

      // Create page
      const page = this.pageRepository.create({
        title,
        slug,
        content,
        excerpt,
        status,
        template,
        parentId,
        menuOrder,
        showInMenu,
        isHomepage,
        seo,
        customFields,
        publishedAt: status === 'published' ? (publishedAt ? new Date(publishedAt) : new Date()) : null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        authorId,
        lastModifiedBy: authorId,
        password: password || null,
        passwordProtected: !!password,
        allowComments
      });

      const savedPage = await this.pageRepository.save(page);

      // Create initial revision
      await revisionService.createPageRevision(savedPage, {
        entityId: savedPage.id,
        entityType: 'page',
        authorId,
        revisionType: 'manual',
        changeDescription: 'Initial creation',
        isRestorePoint: true
      });

      // Load complete page with relations
      const completePage = await this.pageRepository
        .createQueryBuilder('page')
        .leftJoinAndSelect('page.author', 'author')
        .leftJoinAndSelect('page.parent', 'parent')
        .where('page.id = :id', { id: savedPage.id })
        .getOne();

      res.status(201).json({
        success: true,
        data: {
          page: this.formatPageResponse(completePage!)
        }
      });
    } catch (error) {
      logger.error('Error creating page:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create page'
      });
    }
  };

  // PUT /api/pages/:id - 페이지 수정
  updatePage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const page = await this.pageRepository
        .createQueryBuilder('page')
        .leftJoinAndSelect('page.parent', 'parent')
        .where('page.id = :id', { id })
        .getOne();

      if (!page) {
        res.status(404).json({
          success: false,
          error: 'Page not found'
        });
        return;
      }

      // Validate parent changes
      if (updates.parentId !== undefined && updates.parentId !== page.parentId) {
        if (updates.parentId) {
          // Check if new parent exists
          const newParent = await this.pageRepository.findOne({ 
            where: { id: updates.parentId } 
          });
          if (!newParent) {
            res.status(400).json({
              success: false,
              error: 'Parent page not found'
            });
            return;
          }

          // Check for circular reference
          if (await this.wouldCreateCircularReference(id, updates.parentId)) {
            res.status(400).json({
              success: false,
              error: 'Circular reference detected'
            });
            return;
          }

          // Check depth limit
          const depth = await this.calculatePageDepth(updates.parentId);
          if (depth >= 5) {
            res.status(400).json({
              success: false,
              error: 'Maximum page depth exceeded'
            });
            return;
          }
        }
      }

      // Create revision before updating
      await revisionService.createPageRevision(page, {
        entityId: id,
        entityType: 'page',
        authorId: userId,
        revisionType: 'manual',
        changeDescription: updates.changeDescription || 'Page updated'
      });

      // Handle slug update
      if (updates.title && updates.title !== page.title) {
        updates.slug = await slugService.ensureUniquePageSlug(updates.title, id);
      }

      // Handle homepage setting
      if (updates.isHomepage && !page.isHomepage) {
        await this.pageRepository.update(
          { isHomepage: true },
          { isHomepage: false }
        );
      }

      // Handle publication status changes
      if (updates.status === 'published' && page.status !== 'published' && !page.publishedAt) {
        updates.publishedAt = new Date();
      }

      // Update page
      Object.assign(page, {
        ...updates,
        lastModifiedBy: userId,
        updatedAt: new Date()
      });

      const savedPage = await this.pageRepository.save(page);

      // Load complete page with relations
      const completePage = await this.pageRepository
        .createQueryBuilder('page')
        .leftJoinAndSelect('page.author', 'author')
        .leftJoinAndSelect('page.parent', 'parent')
        .leftJoinAndSelect('page.lastModifier', 'lastModifier')
        .where('page.id = :id', { id: savedPage.id })
        .getOne();

      res.json({
        success: true,
        data: {
          page: this.formatPageResponse(completePage!)
        }
      });
    } catch (error) {
      logger.error('Error updating page:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update page'
      });
    }
  };

  // DELETE /api/pages/:id - 페이지 삭제
  deletePage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { permanent = false, moveChildren = 'parent' } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const page = await this.pageRepository
        .createQueryBuilder('page')
        .leftJoinAndSelect('page.children', 'children')
        .where('page.id = :id', { id })
        .getOne();

      if (!page) {
        res.status(404).json({
          success: false,
          error: 'Page not found'
        });
        return;
      }

      // Handle children pages
      if (page.children && page.children.length > 0) {
        if (moveChildren === 'parent') {
          // Move children to this page's parent
          await this.pageRepository.update(
            { parentId: id },
            { parentId: page.parentId }
          );
        } else if (moveChildren === 'trash') {
          // Move children to trash
          await this.pageRepository.update(
            { parentId: id },
            { status: 'trash', lastModifiedBy: userId }
          );
        }
        // If 'delete', children will be cascade deleted
      }

      if (permanent === 'true') {
        // Permanent deletion
        await this.pageRepository.remove(page);
        res.json({
          success: true,
          message: 'Page permanently deleted'
        });
      } else {
        // Move to trash
        page.status = 'trash';
        page.lastModifiedBy = userId;
        await this.pageRepository.save(page);
        
        res.json({
          success: true,
          message: 'Page moved to trash'
        });
      }
    } catch (error) {
      logger.error('Error deleting page:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete page'
      });
    }
  };

  // POST /api/pages/reorder - 페이지 순서 변경
  reorderPages = async (req: Request, res: Response): Promise<void> => {
    try {
      const { pageOrders } = req.body; // Array of { id, menuOrder, parentId? }
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      if (!Array.isArray(pageOrders)) {
        res.status(400).json({
          success: false,
          error: 'Page orders must be an array'
        });
        return;
      }

      // Update each page's order and parent
      for (const pageOrder of pageOrders) {
        await this.pageRepository.update(
          { id: pageOrder.id },
          {
            menuOrder: pageOrder.menuOrder,
            parentId: pageOrder.parentId || null,
            lastModifiedBy: userId,
            updatedAt: new Date()
          }
        );
      }

      res.json({
        success: true,
        message: 'Pages reordered successfully',
        data: { updatedCount: pageOrders.length }
      });
    } catch (error) {
      logger.error('Error reordering pages:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reorder pages'
      });
    }
  };

  // GET /api/pages/:id/children - 하위 페이지
  getChildren = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { recursive = false, status = 'published' } = req.query;

      const page = await this.pageRepository.findOne({ where: { id } });

      if (!page) {
        res.status(404).json({
          success: false,
          error: 'Page not found'
        });
        return;
      }

      let queryBuilder = this.pageRepository
        .createQueryBuilder('page')
        .leftJoinAndSelect('page.author', 'author')
        .where('page.parentId = :parentId', { parentId: id });

      if (status !== 'all') {
        queryBuilder.andWhere('page.status = :status', { status });
      }

      queryBuilder
        .orderBy('page.menuOrder', 'ASC')
        .addOrderBy('page.title', 'ASC');

      const children = await queryBuilder.getMany();

      if (recursive === 'true') {
        // Get all descendants recursively
        const allDescendants = await this.getAllDescendants(id, status as string);
        res.json({
          success: true,
          data: {
            children: allDescendants.map(child => this.formatPageResponse(child))
          }
        });
      } else {
        res.json({
          success: true,
          data: {
            children: children.map(child => this.formatPageResponse(child))
          }
        });
      }
    } catch (error) {
      logger.error('Error getting page children:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get page children'
      });
    }
  };

  // GET /api/pages/breadcrumb/:id - 경로 조회
  getBreadcrumb = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const page = await this.pageRepository.findOne({ where: { id } });

      if (!page) {
        res.status(404).json({
          success: false,
          error: 'Page not found'
        });
        return;
      }

      const breadcrumb = await this.buildBreadcrumb(page);

      res.json({
        success: true,
        data: {
          breadcrumb: breadcrumb.map(item => ({
            id: item.id,
            title: item.title,
            slug: item.slug,
            url: this.buildPageUrl(item)
          }))
        }
      });
    } catch (error) {
      logger.error('Error getting breadcrumb:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get breadcrumb'
      });
    }
  };

  // Private helper methods

  private buildPageHierarchy(pages: Page[], parentId: string | null = null, maxDepth: number = 5, currentDepth: number = 0): Page[] {
    if (currentDepth >= maxDepth) {
      return [];
    }

    const children = pages.filter(page => page.parentId === parentId);
    
    return children.map(page => {
      const pageWithChildren = { ...page };
      pageWithChildren.children = this.buildPageHierarchy(pages, page.id, maxDepth, currentDepth + 1);
      return pageWithChildren;
    });
  }

  private async calculatePageDepth(pageId: string, depth: number = 0): Promise<number> {
    const page = await this.pageRepository.findOne({ where: { id: pageId } });
    
    if (!page || !page.parentId) {
      return depth;
    }

    return this.calculatePageDepth(page.parentId, depth + 1);
  }

  private async wouldCreateCircularReference(pageId: string, newParentId: string): Promise<boolean> {
    if (pageId === newParentId) {
      return true;
    }

    const newParent = await this.pageRepository.findOne({ where: { id: newParentId } });
    
    if (!newParent || !newParent.parentId) {
      return false;
    }

    return this.wouldCreateCircularReference(pageId, newParent.parentId);
  }

  private async getAllDescendants(pageId: string, status: string): Promise<Page[]> {
    let queryBuilder = this.pageRepository
      .createQueryBuilder('page')
      .leftJoinAndSelect('page.author', 'author')
      .where('page.parentId = :parentId', { parentId: pageId });

    if (status !== 'all') {
      queryBuilder.andWhere('page.status = :status', { status });
    }

    const directChildren = await queryBuilder.getMany();
    let allDescendants = [...directChildren];

    for (const child of directChildren) {
      const childDescendants = await this.getAllDescendants(child.id, status);
      allDescendants = allDescendants.concat(childDescendants);
    }

    return allDescendants;
  }

  private async buildBreadcrumb(page: Page): Promise<Page[]> {
    const breadcrumb: Page[] = [page];

    let currentPage = page;
    while (currentPage.parentId) {
      const parent = await this.pageRepository.findOne({ 
        where: { id: currentPage.parentId } 
      });
      
      if (!parent) break;
      
      breadcrumb.unshift(parent);
      currentPage = parent;
    }

    return breadcrumb;
  }

  private buildPageUrl(page: Page): string {
    // Build hierarchical URL based on page slug and parent structure
    // This is a simplified version - in a real app, you'd need to traverse up the hierarchy
    return `/pages/${page.slug}`;
  }

  private formatPageResponse(page: any, includeChildren: boolean = false): any {
    const response = {
      id: page.id,
      title: page.title,
      slug: page.slug,
      content: page.content,
      excerpt: page.excerpt,
      status: page.status,
      type: page.type,
      template: page.template,
      parentId: page.parentId,
      menuOrder: page.menuOrder,
      showInMenu: page.showInMenu,
      isHomepage: page.isHomepage,
      seo: page.seo,
      customFields: page.customFields,
      publishedAt: page.publishedAt,
      scheduledAt: page.scheduledAt,
      author: page.author ? {
        id: page.author.id,
        name: page.author.name,
        email: page.author.email
      } : null,
      lastModifiedBy: page.lastModifier ? {
        id: page.lastModifier.id,
        name: page.lastModifier.name,
        email: page.lastModifier.email
      } : null,
      views: page.views,
      passwordProtected: page.passwordProtected,
      allowComments: page.allowComments,
      commentStatus: page.commentStatus,
      layoutSettings: page.layoutSettings,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
      parent: page.parent ? {
        id: page.parent.id,
        title: page.parent.title,
        slug: page.parent.slug
      } : null
    };

    if (includeChildren && page.children) {
      response.children = page.children.map((child: any) => this.formatPageResponse(child, false));
    }

    return response;
  }
}