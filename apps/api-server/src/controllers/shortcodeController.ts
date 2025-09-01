import { Request, Response } from 'express';
import { AppDataSource } from '../database/connection';
import { Shortcode, ShortcodeStatus, ShortcodeCategory } from '../entities/Shortcode';
import { validate } from 'class-validator';

export class ShortcodeController {
  // Get all shortcodes
  static async getShortcodes(req: Request, res: Response) {
    try {
      const { category, status, appId, search } = req.query;
      const shortcodeRepo = AppDataSource.getRepository(Shortcode);
      
      let query = shortcodeRepo.createQueryBuilder('shortcode');
      
      if (category) {
        query = query.andWhere('shortcode.category = :category', { category });
      }
      
      if (status) {
        query = query.andWhere('shortcode.status = :status', { status });
      } else {
        // Default to active shortcodes
        query = query.andWhere('shortcode.status = :status', { status: ShortcodeStatus.ACTIVE });
      }
      
      if (appId) {
        query = query.andWhere('shortcode.appId = :appId', { appId });
      }
      
      if (search) {
        query = query.andWhere(
          '(shortcode.name ILIKE :search OR shortcode.displayName ILIKE :search OR shortcode.description ILIKE :search)',
          { search: `%${search}%` }
        );
      }
      
      const shortcodes = await query
        .orderBy('shortcode.category', 'ASC')
        .addOrderBy('shortcode.displayName', 'ASC')
        .getMany();

      res.json({
        success: true,
        data: shortcodes,
        total: shortcodes.length
      });
    } catch (error: any) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to fetch shortcodes',
        message: error.message
      });
    }
  }

  // Get single shortcode
  static async getShortcode(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const shortcodeRepo = AppDataSource.getRepository(Shortcode);
      
      // Try to find by ID or name
      const shortcode = await shortcodeRepo.findOne({
        where: [
          { id },
          { name: id }
        ]
      });

      if (!shortcode) {
        return res.status(404).json({
          success: false,
          error: 'Shortcode not found'
        });
      }

      // Increment usage count
      await shortcodeRepo.update(shortcode.id, {
        usageCount: shortcode.usageCount + 1
      });

      res.json({
        success: true,
        data: shortcode
      });
    } catch (error: any) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to fetch shortcode',
        message: error.message
      });
    }
  }

  // Create shortcode
  static async createShortcode(req: Request, res: Response) {
    try {
      const shortcodeRepo = AppDataSource.getRepository(Shortcode);
      
      // Check if shortcode with same name exists
      const existing = await shortcodeRepo.findOne({
        where: { name: req.body.name }
      });
      
      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Shortcode with this name already exists'
        });
      }
      
      const shortcode = shortcodeRepo.create(req.body);
      const errors = await validate(shortcode);
      
      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors
        });
      }

      const savedShortcode = await shortcodeRepo.save(shortcode);

      res.status(201).json({
        success: true,
        data: savedShortcode,
        message: 'Shortcode created successfully'
      });
    } catch (error: any) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to create shortcode',
        message: error.message
      });
    }
  }

  // Update shortcode
  static async updateShortcode(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const shortcodeRepo = AppDataSource.getRepository(Shortcode);
      
      const shortcode = await shortcodeRepo.findOne({ where: { id } });
      
      if (!shortcode) {
        return res.status(404).json({
          success: false,
          error: 'Shortcode not found'
        });
      }

      // Prevent name change if specified
      const { name, ...updateData } = req.body;
      if (name && name !== shortcode.name) {
        return res.status(400).json({
          success: false,
          error: 'Shortcode name cannot be changed'
        });
      }

      Object.assign(shortcode, updateData);
      const updatedShortcode = await shortcodeRepo.save(shortcode);

      res.json({
        success: true,
        data: updatedShortcode,
        message: 'Shortcode updated successfully'
      });
    } catch (error: any) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to update shortcode',
        message: error.message
      });
    }
  }

  // Delete shortcode
  static async deleteShortcode(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const shortcodeRepo = AppDataSource.getRepository(Shortcode);
      
      const shortcode = await shortcodeRepo.findOne({ where: { id } });
      
      if (!shortcode) {
        return res.status(404).json({
          success: false,
          error: 'Shortcode not found'
        });
      }

      await shortcodeRepo.remove(shortcode);

      res.json({
        success: true,
        message: 'Shortcode deleted successfully'
      });
    } catch (error: any) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to delete shortcode',
        message: error.message
      });
    }
  }

  // Render shortcode
  static async renderShortcode(req: Request, res: Response) {
    try {
      const { tag, attributes, content } = req.body;
      
      if (!tag) {
        return res.status(400).json({
          success: false,
          error: 'Shortcode tag is required'
        });
      }

      const shortcodeRepo = AppDataSource.getRepository(Shortcode);
      const shortcode = await shortcodeRepo.findOne({
        where: { name: tag }
      });

      if (!shortcode) {
        return res.status(404).json({
          success: false,
          error: 'Shortcode not found'
        });
      }

      // Basic rendering logic (can be extended)
      let rendered = '';
      
      // Apply default attributes
      const finalAttributes = {
        ...(typeof shortcode.defaultContent === 'object' ? shortcode.defaultContent : {}),
        ...attributes
      };

      // Simple template replacement (can be enhanced)
      if (shortcode.renderFunction) {
        // If custom render function exists, use it
        // This would typically call a rendering service
        rendered = `<!-- Shortcode: ${tag} -->`;
        rendered += `<div class="shortcode-${tag}">`;
        
        // Add attributes as data attributes
        for (const [key, value] of Object.entries(finalAttributes)) {
          rendered += ` data-${key}="${value}"`;
        }
        
        if (content) {
          rendered += `>${content}</div>`;
        } else {
          rendered += ' />';
        }
      } else {
        // Default rendering
        rendered = `[${tag}`;
        
        for (const [key, value] of Object.entries(finalAttributes)) {
          rendered += ` ${key}="${value}"`;
        }
        
        if (shortcode.selfClosing) {
          rendered += ']';
        } else {
          rendered += `]${content || ''}[/${tag}]`;
        }
      }

      // Increment usage count
      await shortcodeRepo.update(shortcode.id, {
        usageCount: shortcode.usageCount + 1
      });

      res.json({
        success: true,
        data: {
          rendered,
          shortcode: {
            id: shortcode.id,
            name: shortcode.name,
            displayName: shortcode.displayName
          }
        }
      });
    } catch (error: any) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to render shortcode',
        message: error.message
      });
    }
  }

  // Get shortcode categories
  static async getCategories(req: Request, res: Response) {
    try {
      const categories = Object.values(ShortcodeCategory).map(category => ({
        value: category,
        label: category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')
      }));

      res.json({
        success: true,
        data: categories
      });
    } catch (error: any) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to fetch categories',
        message: error.message
      });
    }
  }

  // Bulk create default shortcodes
  static async createDefaultShortcodes(req: Request, res: Response) {
    try {
      const shortcodeRepo = AppDataSource.getRepository(Shortcode);
      
      const defaultShortcodes = [
        {
          appId: 'core',
          name: 'gallery',
          displayName: 'Gallery',
          description: 'Display an image gallery',
          category: ShortcodeCategory.MEDIA,
          icon: 'images',
          selfClosing: false,
          attributes: [
            {
              name: 'ids',
              type: 'string' as any,
              required: false,
              description: 'Comma-separated list of image IDs'
            },
            {
              name: 'columns',
              type: 'number' as any,
              required: false,
              default: 3,
              description: 'Number of columns'
            }
          ] as any
        },
        {
          appId: 'core',
          name: 'button',
          displayName: 'Button',
          description: 'Display a button',
          category: ShortcodeCategory.CONTENT,
          icon: 'button',
          selfClosing: false,
          attributes: [
            {
              name: 'url',
              type: 'url' as any,
              required: true,
              description: 'Button link URL'
            },
            {
              name: 'style',
              type: 'select' as any,
              required: false,
              default: 'primary',
              options: ['primary', 'secondary', 'outline'],
              description: 'Button style'
            }
          ] as any
        },
        {
          appId: 'core',
          name: 'video',
          displayName: 'Video',
          description: 'Embed a video',
          category: ShortcodeCategory.MEDIA,
          icon: 'video',
          selfClosing: true,
          attributes: [
            {
              name: 'src',
              type: 'url' as any,
              required: true,
              description: 'Video source URL'
            },
            {
              name: 'autoplay',
              type: 'boolean' as any,
              required: false,
              default: false,
              description: 'Auto-play video'
            }
          ] as any
        }
      ];

      const created = [];
      for (const shortcodeData of defaultShortcodes) {
        const existing = await shortcodeRepo.findOne({
          where: { name: shortcodeData.name }
        });
        
        if (!existing) {
          const shortcode = shortcodeRepo.create(shortcodeData);
          const saved = await shortcodeRepo.save(shortcode);
          created.push(saved);
        }
      }

      res.json({
        success: true,
        data: created,
        message: `Created ${created.length} default shortcodes`
      });
    } catch (error: any) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to create default shortcodes',
        message: error.message
      });
    }
  }
}