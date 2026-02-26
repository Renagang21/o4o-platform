import { Request, Response } from 'express';
import { AppDataSource } from '../database/connection.js';
import { Template } from '../entities/Template.js';
import { User } from '../entities/User.js';
// import { MockDataService } from '../services/MockDataService.js';
import path from 'path';
import fs from 'fs/promises';
import type { AuthRequest } from '../types/auth.js';

export class TemplatesController {
  private templateRepository = AppDataSource.getRepository(Template);
  private userRepository = AppDataSource.getRepository(User);

  // GET /api/admin/templates
  async getTemplates(req: Request, res: Response) {
    try {
      const { type, source, featured, search } = req.query;

      const queryBuilder = this.templateRepository
        .createQueryBuilder('template')
        .leftJoinAndSelect('template.author', 'author');

      // Filter by status if provided, otherwise show all
      const { status } = req.query;
      if (status === 'published' || status === 'draft') {
        queryBuilder.where('template.status = :status', { status });
      }

      // Apply filters
      if (type) {
        queryBuilder.andWhere('template.type = :type', { type });
      }

      if (source) {
        queryBuilder.andWhere('template.source = :source', { source });
      }

      if (featured === 'true') {
        queryBuilder.andWhere('template.featured = :featured', { featured: true });
      }

      if (search) {
        queryBuilder.andWhere(
          '(template.name ILIKE :search OR template.description ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      // Order by featured first, then by usage count
      queryBuilder.orderBy('template.featured', 'DESC')
                  .addOrderBy('template.usageCount', 'DESC')
                  .addOrderBy('template.createdAt', 'DESC');

      const userTemplates = await queryBuilder.getMany();

      // Get system templates
      const systemTemplates = await this.getSystemTemplates(type as string);

      // Combine and return
      const allTemplates = [
        ...systemTemplates,
        ...userTemplates
      ];

      res.json({
        success: true,
        data: allTemplates
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Failed to fetch templates',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/admin/templates/:id
  async getTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const template = await this.templateRepository.findOne({
        where: { id },
        relations: ['author']
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }

      // Increment usage count
      await this.templateRepository.update(id, {
        usageCount: template.usageCount + 1
      });

      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Failed to fetch template',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/admin/templates/system/:name
  async getSystemTemplate(req: Request, res: Response) {
    try {
      const { name } = req.params;
      
      const templatesDir = path.join(process.cwd(), 'templates', 'system');
      const templatePath = path.join(templatesDir, `${name}.json`);

      try {
        const templateData = await fs.readFile(templatePath, 'utf-8');
        const template = JSON.parse(templateData);

        res.json({
          success: true,
          data: {
            id: name,
            source: 'system',
            ...template
          }
        });
      } catch (fileError) {
        return res.status(404).json({
          success: false,
          message: 'System template not found'
        });
      }
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Failed to fetch system template',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST /api/admin/templates
  async createTemplate(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const {
        name,
        description,
        type = 'page',
        content,
        settings,
        customFields,
        preview,
        featured = false,
        tags,
        version = '1.0.0',
        compatibility
      } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Template name is required'
        });
      }

      // Generate unique slug
      let slug = name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      let counter = 1;
      let testSlug = slug;
      while (await this.templateRepository.findOne({ where: { slug: testSlug } })) {
        testSlug = `${slug}-${counter}`;
        counter++;
      }

      const template = this.templateRepository.create({
        name: name.trim(),
        slug: testSlug,
        description,
        type,
        source: 'user',
        content,
        settings,
        customFields,
        preview,
        authorId: userId,
        status: 'draft',
        featured,
        usageCount: 0,
        tags: Array.isArray(tags) ? tags : [],
        version,
        compatibility
      });

      const savedTemplate = await this.templateRepository.save(template);

      const completeTemplate = await this.templateRepository.findOne({
        where: { id: savedTemplate.id },
        relations: ['author']
      });

      res.status(201).json({
        success: true,
        data: completeTemplate,
        message: 'Template created successfully'
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Failed to create template',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // PUT /api/admin/templates/:id
  async updateTemplate(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const template = await this.templateRepository.findOne({ where: { id } });
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }

      // Check if user owns the template or is admin
      if (template.authorId !== userId) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user || !user.roles?.includes('admin')) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to edit this template'
          });
        }
      }

      const {
        name,
        description,
        type,
        content,
        settings,
        customFields,
        preview,
        status,
        featured,
        tags,
        version,
        compatibility
      } = req.body;

      await this.templateRepository.update(id, {
        name,
        description,
        type,
        content,
        settings,
        customFields,
        preview,
        status,
        featured,
        tags: Array.isArray(tags) ? tags : template.tags,
        version,
        compatibility
      });

      const updatedTemplate = await this.templateRepository.findOne({
        where: { id },
        relations: ['author']
      });

      res.json({
        success: true,
        data: updatedTemplate,
        message: 'Template updated successfully'
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Failed to update template',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // DELETE /api/admin/templates/:id
  async deleteTemplate(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const template = await this.templateRepository.findOne({ where: { id } });
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }

      // Check if user owns the template or is admin
      if (template.authorId !== userId) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user || !user.roles?.includes('admin')) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to delete this template'
          });
        }
      }

      // Hard delete the template
      await this.templateRepository.delete(id);

      res.json({
        success: true,
        message: 'Template deleted successfully'
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Failed to delete template',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST /api/admin/templates/:id/publish
  async publishTemplate(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const template = await this.templateRepository.findOne({ where: { id } });
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }

      // Check if user owns the template or is admin
      if (template.authorId !== userId) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user || !user.roles?.includes('admin')) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to publish this template'
          });
        }
      }

      await this.templateRepository.update(id, { status: 'published' });

      const updatedTemplate = await this.templateRepository.findOne({
        where: { id },
        relations: ['author']
      });

      res.json({
        success: true,
        data: updatedTemplate,
        message: 'Template published successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to publish template',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST /api/admin/templates/:id/unpublish
  async unpublishTemplate(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const template = await this.templateRepository.findOne({ where: { id } });
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }

      // Check if user owns the template or is admin
      if (template.authorId !== userId) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user || !user.roles?.includes('admin')) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to unpublish this template'
          });
        }
      }

      await this.templateRepository.update(id, { status: 'draft' });

      const updatedTemplate = await this.templateRepository.findOne({
        where: { id },
        relations: ['author']
      });

      res.json({
        success: true,
        data: updatedTemplate,
        message: 'Template unpublished successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to unpublish template',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST /api/admin/templates/import
  async importTemplate(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { templateData } = req.body;

      if (!templateData) {
        return res.status(400).json({
          success: false,
          message: 'Template data is required'
        });
      }

      let parsedTemplate;
      try {
        parsedTemplate = typeof templateData === 'string' ? JSON.parse(templateData) : templateData;
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid template data format'
        });
      }

      // Validate required fields
      if (!parsedTemplate.name || !parsedTemplate.content) {
        return res.status(400).json({
          success: false,
          message: 'Template must have name and content'
        });
      }

      // Generate unique slug
      let slug = parsedTemplate.name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      let counter = 1;
      let testSlug = slug;
      while (await this.templateRepository.findOne({ where: { slug: testSlug } })) {
        testSlug = `${slug}-${counter}`;
        counter++;
      }

      const template = this.templateRepository.create({
        name: `${parsedTemplate.name} (Imported)`,
        slug: testSlug,
        description: parsedTemplate.description || 'Imported template',
        type: parsedTemplate.type || 'page',
        source: 'user',
        content: parsedTemplate.content,
        settings: parsedTemplate.settings,
        customFields: parsedTemplate.customFields,
        preview: parsedTemplate.preview,
        authorId: userId,
        status: 'draft',
        featured: false,
        usageCount: 0,
        tags: parsedTemplate.tags || [],
        version: parsedTemplate.version || '1.0.0',
        compatibility: parsedTemplate.compatibility
      });

      const savedTemplate = await this.templateRepository.save(template);

      const completeTemplate = await this.templateRepository.findOne({
        where: { id: savedTemplate.id },
        relations: ['author']
      });

      res.status(201).json({
        success: true,
        data: completeTemplate,
        message: 'Template imported successfully'
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Failed to import template',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/admin/templates/:id/export
  async exportTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const template = await this.templateRepository.findOne({
        where: { id },
        relations: ['author']
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }

      // Create export data (exclude sensitive fields)
      const exportData = {
        name: template.name,
        description: template.description,
        type: template.type,
        content: template.content,
        settings: template.settings,
        customFields: template.customFields,
        preview: template.preview,
        tags: template.tags,
        version: template.version,
        compatibility: template.compatibility,
        exportedAt: new Date().toISOString(),
        exportedBy: template.author?.name || 'Unknown'
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${template.slug}-template.json"`);
      
      res.json({
        success: true,
        data: exportData
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Failed to export template',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Helper method to get system templates
  private async getSystemTemplates(type?: string): Promise<Partial<Template>[]> {
    try {
      const templatesDir = path.join(process.cwd(), 'templates', 'system');
      
      // Ensure templates directory exists
      try {
        await fs.access(templatesDir);
      } catch {
        // Create default system templates directory
        await fs.mkdir(templatesDir, { recursive: true });
        await this.createDefaultSystemTemplates(templatesDir);
      }

      const files = await fs.readdir(templatesDir);
      const templateFiles = files.filter((file: any) => file.endsWith('.json'));

      const systemTemplates = await Promise.all(
        templateFiles.map(async (file) => {
          try {
            const templatePath = path.join(templatesDir, file);
            const templateData = await fs.readFile(templatePath, 'utf-8');
            const template = JSON.parse(templateData);

            // Filter by type if specified
            if (type && template.type !== type) {
              return null;
            }

            return {
              id: path.basename(file, '.json'),
              source: 'system',
              status: 'published',
              usageCount: 0,
              ...template
            };
          } catch (error) {
            // Warning log removed
            return null;
          }
        })
      );

      return systemTemplates.filter((template: any) => template !== null);
    } catch (error) {
      // Error log removed
      return [];
    }
  }

  // Helper method to create default system templates
  private async createDefaultSystemTemplates(templatesDir: string): Promise<void> {
    const defaultTemplates = [
      {
        filename: 'blank-page.json',
        data: {
          name: 'Blank Page',
          description: 'A simple blank page template',
          type: 'page',
          content: {
            blocks: [
              {
                id: 'block-1',
                type: 'paragraph',
                data: {
                  text: 'Start writing your content here...'
                },
                order: 0
              }
            ]
          },
          settings: {
            layout: 'default',
            sidebar: false
          },
          featured: true,
          tags: ['basic', 'simple']
        }
      },
      {
        filename: 'landing-page.json',
        data: {
          name: 'Landing Page',
          description: 'A complete landing page with hero, features, and CTA',
          type: 'page',
          content: {
            blocks: [
              {
                id: 'hero-1',
                type: 'hero',
                data: {
                  title: 'Welcome to Our Amazing Product',
                  subtitle: 'Transform your business with our innovative solution',
                  backgroundType: 'color',
                  backgroundColor: '#3B82F6',
                  ctaText: 'Get Started',
                  ctaUrl: '#',
                  alignment: 'center',
                  height: 'large'
                },
                order: 0
              },
              {
                id: 'features-1',
                type: 'features',
                data: {
                  title: 'Why Choose Us',
                  features: [
                    {
                      title: 'Fast & Reliable',
                      description: 'Our solution is built for speed and reliability',
                      icon: 'zap'
                    },
                    {
                      title: 'Easy to Use',
                      description: 'Intuitive interface that anyone can master',
                      icon: 'heart'
                    },
                    {
                      title: '24/7 Support',
                      description: 'We\'re here to help whenever you need us',
                      icon: 'shield'
                    }
                  ],
                  columns: 3
                },
                order: 1
              }
            ]
          },
          settings: {
            layout: 'full-width',
            sidebar: false
          },
          featured: true,
          tags: ['landing', 'marketing', 'business']
        }
      }
    ];

    await Promise.all(
      defaultTemplates.map(async (template) => {
        const templatePath = path.join(templatesDir, template.filename);
        await fs.writeFile(templatePath, JSON.stringify(template.data, null, 2));
      })
    );
  }
}