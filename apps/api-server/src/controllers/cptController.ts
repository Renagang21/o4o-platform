import { Request, Response } from 'express';
import { AppDataSource } from '../database/connection';
import { CustomPostType, FieldGroup, FieldSchema } from '../entities/CustomPostType';
import { CustomPost, PostStatus } from '../entities/CustomPost';
import { AuthRequest } from '../types/auth';
import { WordPressTransformer } from '../utils/wordpress-transformer';

export class CPTController {
  // ============= Custom Post Type Management =============

  // Get all CPTs
  static async getAllCPTs(req: Request, res: Response) {
    try {
      const cptRepo = AppDataSource.getRepository(CustomPostType);
      const cpts = await cptRepo.find({
        where: { active: true },
        order: { createdAt: 'DESC' }
      });

      res.json({
        success: true,
        data: cpts
      });
    } catch (error) {
      console.error('Error fetching CPTs:', error);
      res.status(500).json({
        success: false,
        message: 'CPT 목록을 가져오는데 실패했습니다.'
      });
    }
  }

  // Get single CPT by slug
  static async getCPTBySlug(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const cptRepo = AppDataSource.getRepository(CustomPostType);
      
      const cpt = await cptRepo.findOne({
        where: { slug, active: true }
      });

      if (!cpt) {
        return res.status(404).json({
          success: false,
          message: 'CPT를 찾을 수 없습니다.'
        });
      }

      res.json({
        success: true,
        data: cpt
      });
    } catch (error) {
      console.error('Error fetching CPT:', error);
      res.status(500).json({
        success: false,
        message: 'CPT를 가져오는데 실패했습니다.'
      });
    }
  }

  // Create new CPT
  static async createCPT(req: Request, res: Response) {
    try {
      const { 
        slug, 
        name, 
        singularName, 
        description, 
        icon, 
        fieldGroups,
        settings 
      } = req.body;

      const cptRepo = AppDataSource.getRepository(CustomPostType);

      // Check if slug already exists
      const existingCPT = await cptRepo.findOne({ where: { slug } });
      if (existingCPT) {
        return res.status(400).json({
          success: false,
          message: '이미 존재하는 슬러그입니다.'
        });
      }

      // Validate field groups
      if (!CPTController.validateFieldGroups(fieldGroups)) {
        return res.status(400).json({
          success: false,
          message: '필드 그룹 구조가 올바르지 않습니다.'
        });
      }

      const cpt = new CustomPostType();
      cpt.slug = slug;
      cpt.name = name;
      cpt.singularName = singularName;
      cpt.description = description;
      cpt.icon = icon || '📄';
      cpt.fieldGroups = fieldGroups || [];
      cpt.settings = {
        public: true,
        hasArchive: true,
        supports: ['title'],
        ...settings
      };
      cpt.createdBy = (req as AuthRequest).user?.id || '';

      await cptRepo.save(cpt);

      res.status(201).json({
        success: true,
        message: 'CPT가 성공적으로 생성되었습니다.',
        data: cpt
      });
    } catch (error) {
      console.error('Error creating CPT:', error);
      res.status(500).json({
        success: false,
        message: 'CPT 생성에 실패했습니다.'
      });
    }
  }

  // Update CPT
  static async updateCPT(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const updates = req.body;

      const cptRepo = AppDataSource.getRepository(CustomPostType);
      const cpt = await cptRepo.findOne({ where: { slug } });

      if (!cpt) {
        return res.status(404).json({
          success: false,
          message: 'CPT를 찾을 수 없습니다.'
        });
      }

      // Validate field groups if provided
      if (updates.fieldGroups && !CPTController.validateFieldGroups(updates.fieldGroups)) {
        return res.status(400).json({
          success: false,
          message: '필드 그룹 구조가 올바르지 않습니다.'
        });
      }

      Object.assign(cpt, updates);
      await cptRepo.save(cpt);

      res.json({
        success: true,
        message: 'CPT가 성공적으로 수정되었습니다.',
        data: cpt
      });
    } catch (error) {
      console.error('Error updating CPT:', error);
      res.status(500).json({
        success: false,
        message: 'CPT 수정에 실패했습니다.'
      });
    }
  }

  // Delete CPT (soft delete)
  static async deleteCPT(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const cptRepo = AppDataSource.getRepository(CustomPostType);

      const cpt = await cptRepo.findOne({ where: { slug } });
      if (!cpt) {
        return res.status(404).json({
          success: false,
          message: 'CPT를 찾을 수 없습니다.'
        });
      }

      cpt.active = false;
      await cptRepo.save(cpt);

      res.json({
        success: true,
        message: 'CPT가 성공적으로 삭제되었습니다.'
      });
    } catch (error) {
      console.error('Error deleting CPT:', error);
      res.status(500).json({
        success: false,
        message: 'CPT 삭제에 실패했습니다.'
      });
    }
  }

  // ============= Custom Post Management =============

  // Get posts by CPT slug
  static async getPostsByCPT(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const { 
        page = 1, 
        per_page = 10, // WordPress-style parameter
        status, 
        search,
        orderby = 'date', // WordPress-style parameter
        order = 'desc', // WordPress-style parameter
        _embed = false // WordPress-style parameter
      } = req.query;

      const postRepo = AppDataSource.getRepository(CustomPost);
      const queryBuilder = postRepo.createQueryBuilder('post')
        .leftJoinAndSelect('post.postType', 'postType')
        .leftJoinAndSelect('post.author', 'author')
        .leftJoinAndSelect('post.featuredImage', 'featuredImage')
        .leftJoinAndSelect('post.categories', 'categories')
        .leftJoinAndSelect('post.tags', 'tags')
        .where('post.postTypeSlug = :slug', { slug });

      // Filter by status
      if (status) {
        queryBuilder.andWhere('post.status = :status', { status });
      }

      // Search in title and fields
      if (search) {
        queryBuilder.andWhere(
          '(post.title ILIKE :search OR post.content ILIKE :search OR post.fields::text ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      // WordPress-style sorting
      const sortField = orderby === 'date' ? 'createdAt' : 
                       orderby === 'modified' ? 'updatedAt' : 
                       orderby === 'title' ? 'title' : 'createdAt';
      const sortOrder = typeof order === 'string' ? order.toUpperCase() : 'DESC';
      queryBuilder.orderBy(`post.${sortField}`, sortOrder as 'ASC' | 'DESC');

      // Pagination
      const skip = (Number(page) - 1) * Number(per_page);
      queryBuilder.skip(skip).take(Number(per_page));

      const [posts, total] = await queryBuilder.getManyAndCount();

      // Transform to WordPress format
      const wpPosts = WordPressTransformer.transformCustomPosts(posts, {
        includeContent: true,
        includeEmbedded: String(_embed) === 'true'
      });

      // WordPress-style headers
      res.set({
        'X-WP-Total': total.toString(),
        'X-WP-TotalPages': Math.ceil(total / Number(per_page)).toString()
      });

      res.json(wpPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      res.status(500).json({
        code: 'rest_posts_error',
        message: '포스트 목록을 가져오는데 실패했습니다.',
        data: { status: 500 }
      });
    }
  }

  // Create new post
  static async createPost(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const { title, fields, content, status, meta } = req.body;

      const cptRepo = AppDataSource.getRepository(CustomPostType);
      const postRepo = AppDataSource.getRepository(CustomPost);

      // Verify CPT exists
      const cpt = await cptRepo.findOne({ where: { slug, active: true } });
      if (!cpt) {
        return res.status(404).json({
          success: false,
          message: 'CPT를 찾을 수 없습니다.'
        });
      }

      // Validate fields against CPT schema
      const validationResult = CPTController.validatePostFields(fields, cpt.fieldGroups);
      if (!validationResult.valid) {
        return res.status(400).json({
          success: false,
          message: '필드 유효성 검사 실패',
          errors: validationResult.errors
        });
      }

      const post = new CustomPost();
      post.title = title;
      post.slug = post.generateSlug();
      post.postTypeSlug = slug;
      post.fields = fields || {};
      post.content = content;
      post.status = status || PostStatus.DRAFT;
      post.meta = meta;
      post.authorId = (req as AuthRequest).user?.id || '';

      if (status === PostStatus.PUBLISHED) {
        post.publishedAt = new Date();
      }

      await postRepo.save(post);

      res.status(201).json({
        success: true,
        message: '포스트가 성공적으로 생성되었습니다.',
        data: post
      });
    } catch (error) {
      console.error('Error creating post:', error);
      res.status(500).json({
        success: false,
        message: '포스트 생성에 실패했습니다.'
      });
    }
  }

  // ============= Helper Methods =============

  private static validateFieldGroups(fieldGroups: FieldGroup[]): boolean {
    if (!Array.isArray(fieldGroups)) return false;

    for (const group of fieldGroups) {
      if (!group.id || !group.name || !Array.isArray(group.fields)) {
        return false;
      }

      for (const field of group.fields) {
        if (!field.id || !field.name || !field.type) {
          return false;
        }
      }
    }

    return true;
  }

  private static validatePostFields(fields: Record<string, unknown>, fieldGroups: FieldGroup[]) {
    const errors: string[] = [];
    let valid = true;

    for (const group of fieldGroups) {
      for (const fieldSchema of group.fields) {
        const fieldValue = fields[fieldSchema.name];

        // Required field validation
        if (fieldSchema.required && (!fieldValue || fieldValue === '')) {
          errors.push(`${fieldSchema.label}은(는) 필수 필드입니다.`);
          valid = false;
        }

        // Type-specific validation
        if (fieldValue) {
          switch (fieldSchema.type) {
            case 'number':
              if (isNaN(Number(fieldValue))) {
                errors.push(`${fieldSchema.label}은(는) 숫자여야 합니다.`);
                valid = false;
              }
              break;
            case 'email':
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(fieldValue as string)) {
                errors.push(`${fieldSchema.label}의 이메일 형식이 올바르지 않습니다.`);
                valid = false;
              }
              break;
          }
        }
      }
    }

    return { valid, errors };
  }

  // Get single post by ID
  static async getPostById(req: Request, res: Response) {
    try {
      const { slug, postId } = req.params;
      const { _embed = false } = req.query;
      const postRepo = AppDataSource.getRepository(CustomPost);

      const post = await postRepo.findOne({
        where: { id: postId, postTypeSlug: slug },
        relations: ['postType', 'author', 'featuredImage', 'categories', 'tags']
      });

      if (!post) {
        return res.status(404).json({
          code: 'rest_post_invalid_id',
          message: '포스트를 찾을 수 없습니다.',
          data: { status: 404 }
        });
      }

      // Transform to WordPress format
      const wpPost = WordPressTransformer.transformCustomPost(post, {
        includeContent: true,
        includeEmbedded: String(_embed) === 'true'
      });

      res.json(wpPost);
    } catch (error) {
      console.error('Error fetching post:', error);
      res.status(500).json({
        code: 'rest_post_error',
        message: '포스트를 가져오는데 실패했습니다.',
        data: { status: 500 }
      });
    }
  }

  // Update post
  static async updatePost(req: Request, res: Response) {
    try {
      const { slug, postId } = req.params;
      const updates = req.body;

      const postRepo = AppDataSource.getRepository(CustomPost);
      const post = await postRepo.findOne({
        where: { id: postId, postTypeSlug: slug }
      });

      if (!post) {
        return res.status(404).json({
          success: false,
          message: '포스트를 찾을 수 없습니다.'
        });
      }

      Object.assign(post, updates);
      await postRepo.save(post);

      res.json({
        success: true,
        message: '포스트가 성공적으로 수정되었습니다.',
        data: post
      });
    } catch (error) {
      console.error('Error updating post:', error);
      res.status(500).json({
        success: false,
        message: '포스트 수정에 실패했습니다.'
      });
    }
  }

  // Delete post
  static async deletePost(req: Request, res: Response) {
    try {
      const { slug, postId } = req.params;
      const postRepo = AppDataSource.getRepository(CustomPost);

      const result = await postRepo.delete({
        id: postId,
        postTypeSlug: slug
      });

      if (result.affected === 0) {
        return res.status(404).json({
          success: false,
          message: '포스트를 찾을 수 없습니다.'
        });
      }

      res.json({
        success: true,
        message: '포스트가 성공적으로 삭제되었습니다.'
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      res.status(500).json({
        success: false,
        message: '포스트 삭제에 실패했습니다.'
      });
    }
  }

  // Get public posts
  static async getPublicPosts(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const { 
        per_page = 10, 
        page = 1,
        orderby = 'date',
        order = 'desc',
        _embed = false,
        search
      } = req.query;

      const postRepo = AppDataSource.getRepository(CustomPost);
      const queryBuilder = postRepo.createQueryBuilder('post')
        .leftJoinAndSelect('post.postType', 'postType')
        .leftJoinAndSelect('post.author', 'author')
        .leftJoinAndSelect('post.featuredImage', 'featuredImage')
        .leftJoinAndSelect('post.categories', 'categories')
        .leftJoinAndSelect('post.tags', 'tags')
        .where('post.postTypeSlug = :slug', { slug })
        .andWhere('post.status = :status', { status: PostStatus.PUBLISHED });

      // Search
      if (search) {
        queryBuilder.andWhere(
          '(post.title ILIKE :search OR post.content ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      // WordPress-style sorting
      const sortField = orderby === 'date' ? 'publishedAt' : 
                       orderby === 'modified' ? 'updatedAt' : 
                       orderby === 'title' ? 'title' : 'publishedAt';
      const sortOrder = typeof order === 'string' ? order.toUpperCase() : 'DESC';
      queryBuilder.orderBy(`post.${sortField}`, sortOrder as 'ASC' | 'DESC');

      // Pagination
      const skip = (Number(page) - 1) * Number(per_page);
      queryBuilder.skip(skip).take(Number(per_page));

      const [posts, total] = await queryBuilder.getManyAndCount();

      // Transform to WordPress format
      const wpPosts = WordPressTransformer.transformCustomPosts(posts, {
        includeContent: true,
        includeEmbedded: String(_embed) === 'true'
      });

      // WordPress-style headers
      res.set({
        'X-WP-Total': total.toString(),
        'X-WP-TotalPages': Math.ceil(total / Number(per_page)).toString()
      });

      res.json(wpPosts);
    } catch (error) {
      console.error('Error fetching public posts:', error);
      res.status(500).json({
        code: 'rest_posts_error',
        message: '공개 포스트를 가져오는데 실패했습니다.',
        data: { status: 500 }
      });
    }
  }
}
