import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { Taxonomy, Term, TermRelationship } from '../../entities/Taxonomy.js';
import type { AuthRequest } from '../../types/auth.js';
import { User } from '../../entities/User.js';
import { TreeRepository } from 'typeorm';

export class TaxonomiesController {
  private taxonomyRepo = AppDataSource.getRepository(Taxonomy);
  private termRepo = AppDataSource.getTreeRepository(Term);
  private termRelationshipRepo = AppDataSource.getRepository(TermRelationship);

  // ============= Taxonomies Management =============

  async getAllTaxonomies(req: Request, res: Response) {
    try {
      const { page = 1, limit = 20, search, objectType } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const queryBuilder = this.taxonomyRepo
        .createQueryBuilder('taxonomy')
        .leftJoinAndSelect('taxonomy.creator', 'creator')
        .loadRelationCountAndMap('taxonomy.termCount', 'taxonomy.terms')
        .orderBy('taxonomy.sortOrder', 'ASC')
        .addOrderBy('taxonomy.label', 'ASC');

      if (search) {
        queryBuilder.andWhere(
          '(taxonomy.label ILIKE :search OR taxonomy.name ILIKE :search OR taxonomy.description ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      if (objectType) {
        queryBuilder.andWhere(':objectType = ANY(taxonomy.objectTypes)', { objectType });
      }

      const [taxonomies, total] = await queryBuilder
        .skip(skip)
        .take(Number(limit))
        .getManyAndCount();

      res.json({
        success: true,
        data: {
          taxonomies,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error) {
      console.error('Error fetching taxonomies:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch taxonomies' }
      });
    }
  }

  async getTaxonomyById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const taxonomy = await this.taxonomyRepo.findOne({
        where: { id },
        relations: ['creator', 'terms']
      });

      if (!taxonomy) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Taxonomy not found' }
        });
      }

      res.json({ success: true, data: taxonomy });
    } catch (error) {
      console.error('Error fetching taxonomy:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch taxonomy' }
      });
    }
  }

  async createTaxonomy(req: Request, res: Response) {
    try {
      const {
        name,
        label,
        description,
        objectTypes,
        labels,
        settings,
        hierarchical = false,
        public: isPublic = true,
        showUI = true,
        showInMenu = true,
        showInNavMenus = true,
        showTagcloud = true,
        showInQuickEdit = true,
        showAdminColumn = false
      } = req.body;

      const user = (req as AuthRequest).user as User;

      if (!user || !user.roles?.includes('admin')) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' }
        });
      }

      // Check if taxonomy name already exists
      const existingTaxonomy = await this.taxonomyRepo.findOne({ where: { name } });
      if (existingTaxonomy) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Taxonomy name already exists' }
        });
      }

      const taxonomy = this.taxonomyRepo.create({
        name,
        label,
        description,
        objectTypes: objectTypes || [],
        labels,
        settings,
        hierarchical,
        public: isPublic,
        showUI,
        showInMenu,
        showInNavMenus,
        showTagcloud,
        showInQuickEdit,
        showAdminColumn,
        sortOrder: 0,
        createdBy: user.id
      });

      const savedTaxonomy = await this.taxonomyRepo.save(taxonomy);

      res.status(201).json({
        success: true,
        data: savedTaxonomy,
        message: 'Taxonomy created successfully'
      });
    } catch (error) {
      console.error('Error creating taxonomy:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create taxonomy' }
      });
    }
  }

  async updateTaxonomy(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as AuthRequest).user as User;

      if (!user || !user.roles?.includes('admin')) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' }
        });
      }

      const taxonomy = await this.taxonomyRepo.findOne({ where: { id } });

      if (!taxonomy) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Taxonomy not found' }
        });
      }

      const updateData = { ...req.body };
      delete updateData.id;
      delete updateData.name; // Prevent changing taxonomy name
      delete updateData.createdBy;

      await this.taxonomyRepo.update(id, updateData);

      const updatedTaxonomy = await this.taxonomyRepo.findOne({
        where: { id },
        relations: ['creator']
      });

      res.json({
        success: true,
        data: updatedTaxonomy,
        message: 'Taxonomy updated successfully'
      });
    } catch (error) {
      console.error('Error updating taxonomy:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update taxonomy' }
      });
    }
  }

  async deleteTaxonomy(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as AuthRequest).user as User;

      if (!user || !user.roles?.includes('admin')) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' }
        });
      }

      const taxonomy = await this.taxonomyRepo.findOne({
        where: { id },
        relations: ['terms']
      });

      if (!taxonomy) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Taxonomy not found' }
        });
      }

      // Delete all term relationships
      for (const term of taxonomy.terms) {
        await this.termRelationshipRepo.delete({ termId: term.id });
      }

      // Delete taxonomy (cascade will delete terms)
      await this.taxonomyRepo.remove(taxonomy);

      res.json({
        success: true,
        message: 'Taxonomy deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting taxonomy:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete taxonomy' }
      });
    }
  }

  // ============= Terms Management =============

  async getTermsByTaxonomy(req: Request, res: Response) {
    try {
      const { taxonomyId } = req.params;
      const { page = 1, limit = 50, search, parentId, hierarchical = 'true' } = req.query;

      const taxonomy = await this.taxonomyRepo.findOne({ where: { id: taxonomyId } });

      if (!taxonomy) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Taxonomy not found' }
        });
      }

      let terms;

      if (hierarchical === 'true' && taxonomy.hierarchical) {
        // Get hierarchical tree structure
        if (parentId && parentId !== 'null') {
          const parentTerm = await this.termRepo.findOne({ where: { id: parentId as string } });
          terms = parentTerm ? await this.termRepo.findDescendantsTree(parentTerm) : [];
        } else {
          terms = await this.termRepo.findTrees();
          // Filter by taxonomy
          terms = terms.filter(term => term.taxonomyId === taxonomyId);
        }
      } else {
        // Get flat list
        const skip = (Number(page) - 1) * Number(limit);
        const queryBuilder = this.termRepo
          .createQueryBuilder('term')
          .where('term.taxonomyId = :taxonomyId', { taxonomyId })
          .orderBy('term.name', 'ASC');

        if (search) {
          queryBuilder.andWhere(
            '(term.name ILIKE :search OR term.description ILIKE :search)',
            { search: `%${search}%` }
          );
        }

        if (parentId && parentId !== 'null') {
          queryBuilder.andWhere('term.parentId = :parentId', { parentId });
        } else if (parentId === 'null') {
          queryBuilder.andWhere('term.parentId IS NULL');
        }

        terms = await queryBuilder
          .skip(skip)
          .take(Number(limit))
          .getMany();
      }

      res.json({
        success: true,
        data: {
          terms,
          taxonomy,
          hierarchical: taxonomy.hierarchical && hierarchical === 'true'
        }
      });
    } catch (error) {
      console.error('Error fetching terms:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch terms' }
      });
    }
  }

  async getTermById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const term = await this.termRepo.findOne({
        where: { id },
        relations: ['taxonomy', 'parent', 'children']
      });

      if (!term) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Term not found' }
        });
      }

      res.json({ success: true, data: term });
    } catch (error) {
      console.error('Error fetching term:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch term' }
      });
    }
  }

  async createTerm(req: Request, res: Response) {
    try {
      const { taxonomyId } = req.params;
      const { name, slug, description, parentId, meta } = req.body;
      const user = (req as AuthRequest).user as User;

      if (!user || !['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin or manager access required' }
        });
      }

      const taxonomy = await this.taxonomyRepo.findOne({ where: { id: taxonomyId } });

      if (!taxonomy) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Taxonomy not found' }
        });
      }

      // Generate slug if not provided
      const termSlug = slug || name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Check if slug already exists in this taxonomy
      const existingTerm = await this.termRepo.findOne({
        where: { slug: termSlug, taxonomyId }
      });

      if (existingTerm) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Term slug already exists in this taxonomy' }
        });
      }

      const term = this.termRepo.create({
        name,
        slug: termSlug,
        description,
        taxonomyId,
        meta,
        count: 0,
        termOrder: 0
      });

      // Set parent if provided and taxonomy is hierarchical
      if (parentId && taxonomy.hierarchical) {
        const parentTerm = await this.termRepo.findOne({ where: { id: parentId } });
        if (parentTerm && parentTerm.taxonomyId === taxonomyId) {
          term.parent = parentTerm;
        }
      }

      const savedTerm = await this.termRepo.save(term);

      res.status(201).json({
        success: true,
        data: savedTerm,
        message: 'Term created successfully'
      });
    } catch (error) {
      console.error('Error creating term:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create term' }
      });
    }
  }

  async updateTerm(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as AuthRequest).user as User;

      if (!user || !['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin or manager access required' }
        });
      }

      const term = await this.termRepo.findOne({
        where: { id },
        relations: ['taxonomy']
      });

      if (!term) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Term not found' }
        });
      }

      const updateData = { ...req.body };
      delete updateData.id;
      delete updateData.taxonomyId;

      // Handle parent change for hierarchical taxonomies
      if (updateData.parentId && term.taxonomy.hierarchical) {
        const parentTerm = await this.termRepo.findOne({ where: { id: updateData.parentId } });
        if (parentTerm && parentTerm.taxonomyId === term.taxonomyId) {
          term.parent = parentTerm;
        }
        delete updateData.parentId;
      }

      await this.termRepo.update(id, updateData);
      if (term.parent) {
        await this.termRepo.save(term);
      }

      const updatedTerm = await this.termRepo.findOne({
        where: { id },
        relations: ['taxonomy', 'parent', 'children']
      });

      res.json({
        success: true,
        data: updatedTerm,
        message: 'Term updated successfully'
      });
    } catch (error) {
      console.error('Error updating term:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update term' }
      });
    }
  }

  async deleteTerm(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as AuthRequest).user as User;

      if (!user || !['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin or manager access required' }
        });
      }

      const term = await this.termRepo.findOne({
        where: { id },
        relations: ['children']
      });

      if (!term) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Term not found' }
        });
      }

      // Check if term has children (for hierarchical taxonomies)
      if (term.children && term.children.length > 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Cannot delete term with child terms. Please move or delete child terms first.' }
        });
      }

      // Delete term relationships
      await this.termRelationshipRepo.delete({ termId: id });

      // Delete term
      await this.termRepo.remove(term);

      res.json({
        success: true,
        message: 'Term deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting term:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete term' }
      });
    }
  }

  // ============= Term Relationships =============

  async assignTermsToObject(req: Request, res: Response) {
    try {
      const { objectId, objectType, termIds } = req.body;
      const user = (req as AuthRequest).user as User;

      if (!user || !['admin', 'manager', 'business'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Insufficient permissions' }
        });
      }

      // Remove existing relationships for this object
      await this.termRelationshipRepo.delete({ objectId, objectType });

      // Create new relationships
      if (termIds && termIds.length > 0) {
        const relationships = termIds.map((termId: string, index: number) =>
          this.termRelationshipRepo.create({
            objectId,
            objectType,
            termId,
            termOrder: index
          })
        );

        await this.termRelationshipRepo.save(relationships);

        // Update term counts
        for (const termId of termIds) {
          const count = await this.termRelationshipRepo.count({ where: { termId } });
          await this.termRepo.update(termId, { count });
        }
      }

      res.json({
        success: true,
        message: 'Terms assigned successfully'
      });
    } catch (error) {
      console.error('Error assigning terms:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to assign terms' }
      });
    }
  }

  async getObjectTerms(req: Request, res: Response) {
    try {
      const { objectId, objectType } = req.params;
      const { taxonomyId } = req.query;

      const queryBuilder = this.termRelationshipRepo
        .createQueryBuilder('relationship')
        .leftJoinAndSelect('relationship.term', 'term')
        .leftJoinAndSelect('term.taxonomy', 'taxonomy')
        .where('relationship.objectId = :objectId', { objectId })
        .andWhere('relationship.objectType = :objectType', { objectType })
        .orderBy('relationship.termOrder', 'ASC');

      if (taxonomyId) {
        queryBuilder.andWhere('term.taxonomyId = :taxonomyId', { taxonomyId });
      }

      const relationships = await queryBuilder.getMany();
      const terms = relationships.map(rel => rel.term);

      res.json({
        success: true,
        data: terms
      });
    } catch (error) {
      console.error('Error fetching object terms:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch object terms' }
      });
    }
  }
}