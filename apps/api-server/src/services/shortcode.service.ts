import { AppDataSource } from '../database/connection';
import { Repository } from 'typeorm';
import { Shortcode, ShortcodeStatus, ShortcodeCategory } from '../entities/Shortcode';
import { ShortcodeExecution, ExecutionStatus } from '../entities/ShortcodeExecution';
import { shortcodeParser } from './shortcode-parser.service';
import logger from '../utils/logger';

class ShortcodeService {
  private shortcodeRepository: Repository<Shortcode>;
  private executionRepository: Repository<ShortcodeExecution>;

  constructor() {
    this.shortcodeRepository = AppDataSource.getRepository(Shortcode);
    this.executionRepository = AppDataSource.getRepository(ShortcodeExecution);
  }

  /**
   * Get all shortcodes
   */
  async findAllShortcodes(filters?: {
    category?: ShortcodeCategory;
    status?: ShortcodeStatus;
    isVisible?: boolean;
    search?: string;
  }): Promise<Shortcode[]> {
    const query = this.shortcodeRepository.createQueryBuilder('shortcode');

    if (filters?.category) {
      query.andWhere('shortcode.category = :category', { category: filters.category });
    }

    if (filters?.status) {
      query.andWhere('shortcode.status = :status', { status: filters.status });
    }

    if (filters?.isVisible !== undefined) {
      query.andWhere('shortcode.isVisible = :isVisible', { isVisible: filters.isVisible });
    }

    if (filters?.search) {
      query.andWhere(
        '(shortcode.name ILIKE :search OR shortcode.displayName ILIKE :search OR shortcode.description ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    return query
      .orderBy('shortcode.category', 'ASC')
      .addOrderBy('shortcode.displayName', 'ASC')
      .getMany();
  }

  /**
   * Get shortcode by name
   */
  async findShortcodeByName(name: string): Promise<Shortcode | null> {
    return this.shortcodeRepository.findOne({
      where: { name }
    });
  }

  /**
   * Create new shortcode
   */
  async createShortcode(data: {
    appId: string;
    name: string;
    displayName: string;
    description?: string;
    category?: ShortcodeCategory;
    icon?: string;
    attributes?: any[];
    examples?: any[];
    defaultContent?: string;
    selfClosing?: boolean;
    status?: ShortcodeStatus;
    version?: string;
    documentation?: string;
    tags?: string[];
    renderFunction?: string;
    permissions?: string[];
  }): Promise<Shortcode> {
    // Check if shortcode name already exists
    const existing = await this.findShortcodeByName(data.name);
    if (existing) {
      throw new Error(`Shortcode with name "${data.name}" already exists`);
    }

    // Validate shortcode name format
    if (!/^[a-zA-Z0-9_-]+$/.test(data.name)) {
      throw new Error('Shortcode name must contain only letters, numbers, hyphens, and underscores');
    }

    const shortcode = this.shortcodeRepository.create({
      ...data,
      status: data.status || ShortcodeStatus.ACTIVE,
      category: data.category || ShortcodeCategory.UTILITY,
      selfClosing: data.selfClosing ?? false,
      isVisible: true,
      usageCount: 0
    });

    return this.shortcodeRepository.save(shortcode);
  }

  /**
   * Update shortcode
   */
  async updateShortcode(
    name: string,
    data: Partial<{
      displayName: string;
      description: string;
      category: ShortcodeCategory;
      icon: string;
      attributes: any[];
      examples: any[];
      defaultContent: string;
      selfClosing: boolean;
      status: ShortcodeStatus;
      version: string;
      documentation: string;
      tags: string[];
      isVisible: boolean;
      renderFunction: string;
      permissions: string[];
    }>
  ): Promise<Shortcode | null> {
    const shortcode = await this.findShortcodeByName(name);
    
    if (!shortcode) {
      return null;
    }

    Object.assign(shortcode, data);
    return this.shortcodeRepository.save(shortcode);
  }

  /**
   * Delete shortcode
   */
  async deleteShortcode(name: string): Promise<boolean> {
    const shortcode = await this.findShortcodeByName(name);
    
    if (!shortcode) {
      return false;
    }

    await this.shortcodeRepository.remove(shortcode);
    return true;
  }

  /**
   * Parse content with shortcodes
   */
  async parseContent(
    content: string,
    options?: {
      context?: string;
      contextId?: string;
      userId?: string;
      enableCache?: boolean;
    }
  ): Promise<string> {
    return shortcodeParser.parse(content, {
      context: options?.context as any,
      contextId: options?.contextId,
      userId: options?.userId,
      enableCache: options?.enableCache
    });
  }

  /**
   * Preview shortcode
   */
  async previewShortcode(
    name: string,
    attributes: Record<string, any>,
    content?: string
  ): Promise<string> {
    return shortcodeParser.preview(name, attributes, content);
  }

  /**
   * Get execution logs
   */
  async getExecutionLogs(filters?: {
    shortcodeName?: string;
    userId?: string;
    status?: ExecutionStatus;
    context?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{
    logs: ShortcodeExecution[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query = this.executionRepository.createQueryBuilder('execution')
      .leftJoinAndSelect('execution.shortcode', 'shortcode')
      .leftJoinAndSelect('execution.user', 'user');

    // Apply filters
    if (filters?.shortcodeName) {
      query.andWhere('shortcode.name = :name', { name: filters.shortcodeName });
    }

    if (filters?.userId) {
      query.andWhere('execution.user_id = :userId', { userId: filters.userId });
    }

    if (filters?.status) {
      query.andWhere('execution.status = :status', { status: filters.status });
    }

    if (filters?.context) {
      query.andWhere('execution.context = :context', { context: filters.context });
    }

    if (filters?.startDate) {
      query.andWhere('execution.created_at >= :startDate', { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      query.andWhere('execution.created_at <= :endDate', { endDate: filters.endDate });
    }

    // Pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    query
      .orderBy('execution.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    const [logs, total] = await query.getManyAndCount();

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get shortcode statistics
   */
  async getShortcodeStatistics(name?: string): Promise<{
    totalShortcodes: number;
    activeShortcodes: number;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    topShortcodes: Array<{ name: string; usageCount: number }>;
  }> {
    const shortcodeQuery = this.shortcodeRepository.createQueryBuilder('shortcode');
    const executionQuery = this.executionRepository.createQueryBuilder('execution');

    if (name) {
      const shortcode = await this.findShortcodeByName(name);
      if (shortcode) {
        executionQuery.where('execution.shortcode_id = :id', { id: shortcode.id });
      }
    }

    // Get shortcode counts
    const totalShortcodes = await shortcodeQuery.getCount();
    const activeShortcodes = await shortcodeQuery
      .where('shortcode.status = :status', { status: ShortcodeStatus.ACTIVE })
      .getCount();

    // Get execution statistics
    const totalExecutions = await executionQuery.getCount();
    const successfulExecutions = await executionQuery
      .clone()
      .andWhere('execution.status = :status', { status: ExecutionStatus.SUCCESS })
      .getCount();
    const failedExecutions = await executionQuery
      .clone()
      .andWhere('execution.status = :status', { status: ExecutionStatus.ERROR })
      .getCount();

    // Get average execution time
    const avgResult = await executionQuery
      .clone()
      .select('AVG(execution.execution_time_ms)', 'avg')
      .getRawOne();
    const averageExecutionTime = parseFloat(avgResult?.avg || '0');

    // Get top used shortcodes
    const topShortcodes = await this.shortcodeRepository
      .createQueryBuilder('shortcode')
      .select(['shortcode.name', 'shortcode.usageCount'])
      .orderBy('shortcode.usageCount', 'DESC')
      .limit(10)
      .getMany();

    return {
      totalShortcodes,
      activeShortcodes,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageExecutionTime,
      topShortcodes: topShortcodes.map(s => ({
        name: s.name,
        usageCount: s.usageCount
      }))
    };
  }

  /**
   * Clear shortcode cache
   */
  clearCache(): void {
    shortcodeParser.clearCache();
  }

  /**
   * Bulk update shortcode status
   */
  async bulkUpdateStatus(
    names: string[],
    status: ShortcodeStatus
  ): Promise<number> {
    const result = await this.shortcodeRepository
      .createQueryBuilder()
      .update(Shortcode)
      .set({ status })
      .where('name IN (:...names)', { names })
      .execute();

    return result.affected || 0;
  }

  /**
   * Export shortcodes configuration
   */
  async exportShortcodes(names?: string[]): Promise<any[]> {
    const query = this.shortcodeRepository.createQueryBuilder('shortcode');
    
    if (names && names.length > 0) {
      query.where('shortcode.name IN (:...names)', { names });
    }

    const shortcodes = await query.getMany();

    return shortcodes.map(shortcode => ({
      name: shortcode.name,
      displayName: shortcode.displayName,
      description: shortcode.description,
      category: shortcode.category,
      icon: shortcode.icon,
      attributes: shortcode.attributes,
      examples: shortcode.examples,
      defaultContent: shortcode.defaultContent,
      selfClosing: shortcode.selfClosing,
      documentation: shortcode.documentation,
      tags: shortcode.tags,
      renderFunction: shortcode.renderFunction,
      permissions: shortcode.permissions
    }));
  }

  /**
   * Import shortcodes configuration
   */
  async importShortcodes(
    shortcodes: any[],
    appId: string,
    overwrite: boolean = false
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const data of shortcodes) {
      try {
        const existing = await this.findShortcodeByName(data.name);
        
        if (existing && !overwrite) {
          skipped++;
          continue;
        }

        if (existing) {
          await this.updateShortcode(data.name, data);
        } else {
          await this.createShortcode({
            ...data,
            appId,
            status: ShortcodeStatus.ACTIVE
          });
        }
        
        imported++;
      } catch (error: any) {
        errors.push(`${data.name}: ${error.message}`);
      }
    }

    return { imported, skipped, errors };
  }
}

// Export singleton instance
export const shortcodeService = new ShortcodeService();