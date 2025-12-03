import { Repository, FindManyOptions, DeepPartial } from 'typeorm';

/**
 * BaseService - Abstract base class for all NextGen services
 *
 * Provides common CRUD operations for TypeORM repositories.
 * All module services should extend this class for standard database operations.
 *
 * @example
 * ```typescript
 * export class UserService extends BaseService<User> {
 *   constructor() {
 *     super(AppDataSource.getRepository(User));
 *   }
 *
 *   // Add custom business logic methods here
 *   async findByEmail(email: string): Promise<User | null> {
 *     return this.repository.findOne({ where: { email } });
 *   }
 * }
 * ```
 */
export abstract class BaseService<T> {
  constructor(protected readonly repository: Repository<T>) {}

  /**
   * Find entity by ID
   * @param id - Entity ID
   * @returns Entity or null if not found
   */
  async findById(id: string): Promise<T | null> {
    return this.repository.findOne({ where: { id } as any });
  }

  /**
   * Find all entities with optional filtering
   * @param options - TypeORM find options
   * @returns Array of entities
   */
  async findAll(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find(options);
  }

  /**
   * Create a new entity
   * @param data - Partial entity data
   * @returns Created entity
   */
  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  /**
   * Update an existing entity
   * @param id - Entity ID
   * @param data - Partial entity data to update
   * @returns Updated entity or null if not found
   */
  async update(id: string, data: DeepPartial<T>): Promise<T | null> {
    await this.repository.update(id, data as any);
    return this.findById(id);
  }

  /**
   * Delete an entity by ID
   * @param id - Entity ID
   * @returns True if deleted, false if not found
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  /**
   * Paginate entities
   * @param page - Page number (1-indexed)
   * @param limit - Items per page (default: 20)
   * @param options - Additional TypeORM find options
   * @returns Paginated results with metadata
   */
  async paginate(
    page: number = 1,
    limit: number = 20,
    options?: FindManyOptions<T>
  ): Promise<{
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const skip = (page - 1) * limit;
    const [items, total] = await this.repository.findAndCount({
      ...options,
      skip,
      take: limit,
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Count entities with optional filtering
   * @param options - TypeORM find options
   * @returns Number of entities
   */
  async count(options?: FindManyOptions<T>): Promise<number> {
    return this.repository.count(options);
  }

  /**
   * Check if entity exists by ID
   * @param id - Entity ID
   * @returns True if exists, false otherwise
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.repository.count({ where: { id } as any });
    return count > 0;
  }
}
