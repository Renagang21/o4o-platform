import { Test, TestingModule } from '@nestjs/testing';
import { AdvancedQueryService, AdvancedQueryParams } from '../AdvancedQueryService';
import { QuerySecurityValidator } from '../../security/QuerySecurityValidator';
import { PresetDataLoader } from '../../loaders/PresetDataLoader';
import { RedisCache } from '../../cache/RedisCache';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PostEntity } from '../../entities/post.entity';
import { MetaEntity } from '../../entities/meta.entity';

describe('AdvancedQueryService', () => {
  let service: AdvancedQueryService;
  let securityValidator: QuerySecurityValidator;
  let dataLoader: PresetDataLoader;
  let redisCache: RedisCache;
  let postRepository: Repository<PostEntity>;
  let metaRepository: Repository<MetaEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvancedQueryService,
        {
          provide: QuerySecurityValidator,
          useValue: {
            validate: jest.fn().mockResolvedValue(undefined),
            sanitizeOutput: jest.fn(data => data)
          }
        },
        {
          provide: PresetDataLoader,
          useValue: {
            load: jest.fn().mockResolvedValue(null),
            loadMany: jest.fn().mockResolvedValue([])
          }
        },
        {
          provide: RedisCache,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined)
          }
        },
        {
          provide: getRepositoryToken(PostEntity),
          useValue: {
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              addOrderBy: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              getCount: jest.fn().mockResolvedValue(10),
              getMany: jest.fn().mockResolvedValue([]),
              getRawOne: jest.fn().mockResolvedValue({ sum: 100, avg: 50 }),
              select: jest.fn().mockReturnThis()
            }))
          }
        },
        {
          provide: getRepositoryToken(MetaEntity),
          useValue: {
            createQueryBuilder: jest.fn()
          }
        }
      ]
    }).compile();

    service = module.get<AdvancedQueryService>(AdvancedQueryService);
    securityValidator = module.get<QuerySecurityValidator>(QuerySecurityValidator);
    dataLoader = module.get<PresetDataLoader>(PresetDataLoader);
    redisCache = module.get<RedisCache>(RedisCache);
    postRepository = module.get<Repository<PostEntity>>(getRepositoryToken(PostEntity));
    metaRepository = module.get<Repository<MetaEntity>>(getRepositoryToken(MetaEntity));
  });

  describe('executeQuery', () => {
    it('should execute a simple query', async () => {
      const params: AdvancedQueryParams = {
        source: 'post',
        page: { limit: 10 }
      };

      const result = await service.executeQuery(params);

      expect(result).toBeDefined();
      expect(result.data).toEqual([]);
      expect(result.meta.query.cached).toBe(false);
      expect(securityValidator.validate).toHaveBeenCalledWith(params, undefined, undefined);
    });

    it('should return cached result if available', async () => {
      const cachedData = {
        data: [{ id: 1, title: 'Cached Post' }],
        meta: {
          total: 1,
          query: {
            executionTime: 50,
            cached: false,
            complexity: 10
          }
        }
      };

      (redisCache.get as jest.Mock).mockResolvedValue(cachedData);

      const params: AdvancedQueryParams = {
        source: 'post',
        page: { limit: 10 }
      };

      const result = await service.executeQuery(params);

      expect(result.meta.query.cached).toBe(true);
      expect(result.data).toEqual(cachedData.data);
    });

    it('should handle expand relations', async () => {
      const params: AdvancedQueryParams = {
        source: 'post',
        expand: ['author', 'category'],
        page: { limit: 10 }
      };

      const mockPosts = [
        { id: 1, title: 'Post 1', authorId: 1, categoryId: 1 },
        { id: 2, title: 'Post 2', authorId: 2, categoryId: 1 }
      ];

      const qb = postRepository.createQueryBuilder() as any;
      qb.getMany.mockResolvedValue(mockPosts);

      await service.executeQuery(params);

      expect(dataLoader.load).toHaveBeenCalledWith('author', 1);
      expect(dataLoader.load).toHaveBeenCalledWith('author', 2);
      expect(dataLoader.load).toHaveBeenCalledWith('category', 1);
    });

    it('should apply where conditions', async () => {
      const params: AdvancedQueryParams = {
        source: 'post',
        where: {
          AND: [
            { status: 'published' },
            { views: { gt: 100 } }
          ]
        },
        page: { limit: 10 }
      };

      await service.executeQuery(params);

      const qb = postRepository.createQueryBuilder();
      expect(qb.where).toHaveBeenCalledWith('post.postType = :source', { source: 'post' });
      expect(qb.andWhere).toHaveBeenCalled();
    });

    it('should apply sorting', async () => {
      const params: AdvancedQueryParams = {
        source: 'post',
        sort: [
          { field: 'createdAt', order: 'DESC' },
          { field: 'title', order: 'ASC' }
        ],
        page: { limit: 10 }
      };

      await service.executeQuery(params);

      const qb = postRepository.createQueryBuilder();
      expect(qb.orderBy).toHaveBeenCalledWith('post.createdAt', 'DESC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('post.title', 'ASC');
    });

    it('should calculate aggregates', async () => {
      const params: AdvancedQueryParams = {
        source: 'post',
        aggregate: {
          count: true,
          sum: ['views'],
          avg: ['rating']
        },
        page: { limit: 10 }
      };

      const result = await service.executeQuery(params);

      expect(result.meta.aggregates).toBeDefined();
      expect(result.meta.aggregates.count).toBe(10);
      expect(result.meta.aggregates.sum_views).toBe(100);
      expect(result.meta.aggregates.avg_rating).toBe(50);
    });

    it('should handle cursor pagination', async () => {
      const cursor = Buffer.from(JSON.stringify({ id: 10 })).toString('base64');
      const params: AdvancedQueryParams = {
        source: 'post',
        page: {
          limit: 10,
          cursor
        }
      };

      await service.executeQuery(params);

      const qb = postRepository.createQueryBuilder();
      expect(qb.andWhere).toHaveBeenCalledWith('post.id > :cursor', { cursor: 10 });
    });

    it('should calculate query complexity', async () => {
      const params: AdvancedQueryParams = {
        source: 'post',
        expand: ['author', 'category.parent'],
        where: {
          AND: [
            { status: 'published' },
            { views: { gt: 100 } }
          ]
        },
        sort: [
          { field: 'createdAt', order: 'DESC' }
        ],
        aggregate: {
          count: true,
          sum: ['views']
        },
        page: { limit: 10 }
      };

      const result = await service.executeQuery(params);

      expect(result.meta.query.complexity).toBeGreaterThan(10);
      expect(result.meta.query.complexity).toBeLessThanOrEqual(100);
    });

    it('should cache query results', async () => {
      const params: AdvancedQueryParams = {
        source: 'post',
        cache: { ttl: 600 },
        page: { limit: 10 }
      };

      await service.executeQuery(params);

      expect(redisCache.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        600
      );
    });
  });

  describe('Complex WHERE conditions', () => {
    it('should handle OR conditions', async () => {
      const params: AdvancedQueryParams = {
        source: 'post',
        where: {
          OR: [
            { status: 'published' },
            { featured: true }
          ]
        },
        page: { limit: 10 }
      };

      await service.executeQuery(params);

      const qb = postRepository.createQueryBuilder();
      expect(qb.andWhere).toHaveBeenCalled();
    });

    it('should handle nested AND/OR conditions', async () => {
      const params: AdvancedQueryParams = {
        source: 'post',
        where: {
          AND: [
            { status: 'published' },
            {
              OR: [
                { rating: { gte: 4 } },
                { featured: true }
              ]
            }
          ]
        },
        page: { limit: 10 }
      };

      await service.executeQuery(params);

      expect(securityValidator.validate).toHaveBeenCalled();
    });

    it('should handle between operator', async () => {
      const params: AdvancedQueryParams = {
        source: 'product',
        where: {
          AND: [
            { price: { between: [10000, 50000] } }
          ]
        },
        page: { limit: 10 }
      };

      await service.executeQuery(params);

      const qb = postRepository.createQueryBuilder();
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('BETWEEN'),
        expect.objectContaining({
          price_start: 10000,
          price_end: 50000
        })
      );
    });

    it('should handle IN operator', async () => {
      const params: AdvancedQueryParams = {
        source: 'post',
        where: {
          AND: [
            { status: { in: ['published', 'featured'] } }
          ]
        },
        page: { limit: 10 }
      };

      await service.executeQuery(params);

      const qb = postRepository.createQueryBuilder();
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('IN'),
        expect.objectContaining({
          status_in: ['published', 'featured']
        })
      );
    });
  });

  describe('Nested Relations', () => {
    it('should load nested relations', async () => {
      const params: AdvancedQueryParams = {
        source: 'post',
        expand: ['category.parent'],
        page: { limit: 10 }
      };

      const mockPosts = [
        { id: 1, title: 'Post 1', categoryId: 1 }
      ];

      const mockCategory = { id: 1, name: 'Category 1', parentId: 2 };
      const mockParent = { id: 2, name: 'Parent Category' };

      const qb = postRepository.createQueryBuilder() as any;
      qb.getMany.mockResolvedValue(mockPosts);

      (dataLoader.load as jest.Mock)
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce(mockParent);

      const result = await service.executeQuery(params);

      expect(dataLoader.load).toHaveBeenCalledWith('category', 1);
      expect(dataLoader.load).toHaveBeenCalledWith('parent', 2);
    });
  });
});