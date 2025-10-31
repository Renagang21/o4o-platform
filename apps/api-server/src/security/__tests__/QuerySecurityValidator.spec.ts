import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { QuerySecurityValidator } from '../QuerySecurityValidator';
import { AdvancedQueryParams } from '../../services/AdvancedQueryService';

describe('QuerySecurityValidator', () => {
  let validator: QuerySecurityValidator;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuerySecurityValidator,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                queryMaxComplexity: 100,
                queryMaxExpands: 5,
                queryMaxConditions: 20,
                queryMaxSorts: 3,
                queryMaxLimit: 100
              };
              return config[key] || defaultValue;
            })
          }
        }
      ]
    }).compile();

    validator = module.get<QuerySecurityValidator>(QuerySecurityValidator);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('Source validation', () => {
    it('should allow valid sources', async () => {
      const params: AdvancedQueryParams = {
        source: 'post'
      };

      await expect(validator.validate(params)).resolves.toBeUndefined();
    });

    it('should reject invalid sources', async () => {
      const params: AdvancedQueryParams = {
        source: 'invalid_source'
      };

      await expect(validator.validate(params)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Expand validation', () => {
    it('should allow valid expands', async () => {
      const params: AdvancedQueryParams = {
        source: 'post',
        expand: ['author', 'category', 'tags']
      };

      await expect(validator.validate(params)).resolves.toBeUndefined();
    });

    it('should reject too many expands', async () => {
      const params: AdvancedQueryParams = {
        source: 'post',
        expand: ['author', 'category', 'tags', 'media', 'comments', 'reviews', 'extra']
      };

      await expect(validator.validate(params)).rejects.toThrow('Too many expand relations');
    });

    it('should reject invalid relations', async () => {
      const params: AdvancedQueryParams = {
        source: 'post',
        expand: ['invalid_relation']
      };

      await expect(validator.validate(params)).rejects.toThrow('Relation \'invalid_relation\' is not allowed');
    });

    it('should allow nested expands up to depth 3', async () => {
      const params: AdvancedQueryParams = {
        source: 'post',
        expand: ['category.parent.grandparent']
      };

      await expect(validator.validate(params)).resolves.toBeUndefined();
    });

    it('should reject deeply nested expands', async () => {
      const params: AdvancedQueryParams = {
        source: 'post',
        expand: ['category.parent.grandparent.greatgrandparent']
      };

      await expect(validator.validate(params)).rejects.toThrow('Expand nesting too deep');
    });
  });

  describe('Where conditions validation', () => {
    it('should allow valid fields in where conditions', async () => {
      const params: AdvancedQueryParams = {
        source: 'post',
        where: {
          AND: [
            { status: 'published' },
            { views: { gt: 100 } }
          ]
        }
      };

      await expect(validator.validate(params)).resolves.toBeUndefined();
    });

    it('should reject invalid fields', async () => {
      const params: AdvancedQueryParams = {
        source: 'post',
        where: {
          invalid_field: 'value'
        }
      };

      await expect(validator.validate(params)).rejects.toThrow('Field \'invalid_field\' is not allowed');
    });

    it('should reject sensitive fields', async () => {
      const params: AdvancedQueryParams = {
        source: 'user',
        where: {
          password: 'test123'
        }
      };

      await expect(validator.validate(params)).rejects.toThrow('Field \'password\' contains sensitive data');
    });

    it('should reject invalid operators', async () => {
      const params: AdvancedQueryParams = {
        source: 'post',
        where: {
          status: { invalid_op: 'value' }
        }
      };

      await expect(validator.validate(params)).rejects.toThrow('Operator \'invalid_op\' is not allowed');
    });

    it('should reject too many conditions', async () => {
      const conditions: any[] = [];
      for (let i = 0; i < 25; i++) {
        conditions.push({ [`field${i}`]: `value${i}` });
      }

      const params: AdvancedQueryParams = {
        source: 'post',
        where: { AND: conditions }
      };

      await expect(validator.validate(params)).rejects.toThrow('Too many conditions');
    });

    it('should reject too deep nesting', async () => {
      let deepWhere: any = { status: 'published' };
      for (let i = 0; i < 10; i++) {
        deepWhere = { AND: [deepWhere] };
      }

      const params: AdvancedQueryParams = {
        source: 'post',
        where: deepWhere
      };

      await expect(validator.validate(params)).rejects.toThrow('Where condition nesting too deep');
    });
  });

  describe('Sort validation', () => {
    it('should allow valid sort fields', async () => {
      const params: AdvancedQueryParams = {
        source: 'post',
        sort: [
          { field: 'createdAt', order: 'DESC' },
          { field: 'title', order: 'ASC' }
        ]
      };

      await expect(validator.validate(params)).resolves.toBeUndefined();
    });

    it('should reject too many sorts', async () => {
      const params: AdvancedQueryParams = {
        source: 'post',
        sort: [
          { field: 'createdAt', order: 'DESC' },
          { field: 'title', order: 'ASC' },
          { field: 'views', order: 'DESC' },
          { field: 'rating', order: 'DESC' }
        ]
      };

      await expect(validator.validate(params)).rejects.toThrow('Too many sort fields');
    });

    it('should reject invalid sort fields', async () => {
      const params: AdvancedQueryParams = {
        source: 'post',
        sort: [
          { field: 'invalid_field', order: 'DESC' }
        ]
      };

      await expect(validator.validate(params)).rejects.toThrow('Sort field \'invalid_field\' is not allowed');
    });

    it('should reject sorting by sensitive fields', async () => {
      const params: AdvancedQueryParams = {
        source: 'user',
        sort: [
          { field: 'password', order: 'ASC' }
        ]
      };

      await expect(validator.validate(params)).rejects.toThrow('Field \'password\' contains sensitive data');
    });
  });

  describe('Aggregate validation', () => {
    it('should allow valid aggregate fields', async () => {
      const params: AdvancedQueryParams = {
        source: 'post',
        aggregate: {
          count: true,
          sum: ['views'],
          avg: ['rating']
        }
      };

      await expect(validator.validate(params)).resolves.toBeUndefined();
    });

    it('should reject invalid aggregate fields', async () => {
      const params: AdvancedQueryParams = {
        source: 'post',
        aggregate: {
          sum: ['invalid_field']
        }
      };

      await expect(validator.validate(params)).rejects.toThrow('Aggregate field \'invalid_field\' is not allowed');
    });

    it('should reject aggregating sensitive fields', async () => {
      const params: AdvancedQueryParams = {
        source: 'user',
        aggregate: {
          avg: ['creditCard']
        }
      };

      await expect(validator.validate(params)).rejects.toThrow('Field \'creditCard\' contains sensitive data');
    });
  });

  describe('Rate limiting', () => {
    it('should accept queries within limit', async () => {
      const params: AdvancedQueryParams = {
        source: 'post',
        page: { limit: 50 }
      };

      await expect(validator.validate(params)).resolves.toBeUndefined();
    });

    it('should reject queries exceeding page limit', async () => {
      const params: AdvancedQueryParams = {
        source: 'post',
        page: { limit: 200 }
      };

      await expect(validator.validate(params)).rejects.toThrow('Page limit too high');
    });

    it('should reject queries exceeding complexity limit', async () => {
      const params: AdvancedQueryParams = {
        source: 'post',
        expand: ['author', 'category.parent', 'tags', 'media', 'comments.author'],
        where: {
          AND: Array.from({ length: 10 }, (_, i) => ({ [`field${i}`]: `value${i}` }))
        },
        sort: [
          { field: 'createdAt', order: 'DESC' },
          { field: 'views', order: 'DESC' },
          { field: 'rating', order: 'DESC' }
        ],
        aggregate: {
          count: true,
          sum: ['views', 'price'],
          avg: ['rating', 'score']
        }
      };

      await expect(validator.validate(params)).rejects.toThrow(/Query too complex/);
    });
  });

  describe('User permissions', () => {
    it('should require authentication for draft content', async () => {
      const params: AdvancedQueryParams = {
        source: 'post',
        where: { status: 'draft' }
      };

      await expect(validator.validate(params, undefined, undefined))
        .rejects.toThrow('Authentication required to access draft content');
    });

    it('should allow draft access for authenticated users', async () => {
      const params: AdvancedQueryParams = {
        source: 'post',
        where: { status: 'draft' }
      };

      await expect(validator.validate(params, 'user123', undefined))
        .resolves.toBeUndefined();
    });
  });

  describe('sanitizeOutput', () => {
    it('should remove sensitive fields from output', () => {
      const data = {
        id: 1,
        name: 'John',
        password: 'secret123',
        email: 'john@example.com',
        apiKey: 'key123'
      };

      const sanitized = validator.sanitizeOutput(data);

      expect(sanitized).toEqual({
        id: 1,
        name: 'John',
        email: 'john@example.com'
      });
      expect(sanitized).not.toHaveProperty('password');
      expect(sanitized).not.toHaveProperty('apiKey');
    });

    it('should handle nested sensitive fields', () => {
      const data = {
        id: 1,
        user: {
          name: 'John',
          password: 'secret',
          profile: {
            bio: 'Developer',
            creditCard: '1234-5678'
          }
        }
      };

      const sanitized = validator.sanitizeOutput(data);

      expect(sanitized.user).not.toHaveProperty('password');
      expect(sanitized.user.profile).not.toHaveProperty('creditCard');
      expect(sanitized.user.profile.bio).toBe('Developer');
    });

    it('should handle arrays', () => {
      const data = [
        { id: 1, password: 'secret1' },
        { id: 2, password: 'secret2' }
      ];

      const sanitized = validator.sanitizeOutput(data);

      expect(sanitized).toHaveLength(2);
      expect(sanitized[0]).not.toHaveProperty('password');
      expect(sanitized[1]).not.toHaveProperty('password');
    });
  });
});