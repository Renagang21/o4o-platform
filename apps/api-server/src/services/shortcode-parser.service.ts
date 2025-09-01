import { AppDataSource } from '../database/connection';
import { Repository } from 'typeorm';
import { Shortcode, ShortcodeStatus } from '../entities/Shortcode';
import { ShortcodeExecution, ExecutionStatus } from '../entities/ShortcodeExecution';
import { shortcodeHandlers } from './shortcode-handlers';
import { ShortcodeParseOptions, ParsedShortcode, ExecutionContext } from '../types/shortcode';
import logger from '../utils/logger';

class ShortcodeParserService {
  private shortcodeRepository: Repository<Shortcode>;
  private executionRepository: Repository<ShortcodeExecution>;
  private cache: Map<string, { content: string; timestamp: number }> = new Map();
  private cacheTimeout = 3600000; // 1 hour in milliseconds

  constructor() {
    this.shortcodeRepository = AppDataSource.getRepository(Shortcode);
    this.executionRepository = AppDataSource.getRepository(ShortcodeExecution);
  }

  /**
   * Parse and render shortcodes in content
   */
  async parse(content: string, options: ShortcodeParseOptions = {}): Promise<string> {
    const {
      context = ExecutionContext.POST,
      contextId,
      userId,
      enableCache = true,
      maxExecutionTime = 5000,
      maxNestingLevel = 3
    } = options;

    try {
      // Check cache first
      if (enableCache) {
        const cacheKey = this.generateCacheKey(content, options);
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Parse shortcodes recursively
      let processedContent = await this.processShortcodes(
        content,
        options,
        0,
        maxNestingLevel,
        maxExecutionTime
      );

      // Cache the result
      if (enableCache) {
        const cacheKey = this.generateCacheKey(content, options);
        this.setCache(cacheKey, processedContent);
      }

      return processedContent;
    } catch (error) {
      logger.error('Error parsing shortcodes:', error);
      return content; // Return original content on error
    }
  }

  /**
   * Process shortcodes recursively
   */
  private async processShortcodes(
    content: string,
    options: ShortcodeParseOptions,
    currentLevel: number,
    maxLevel: number,
    maxExecutionTime: number
  ): Promise<string> {
    if (currentLevel >= maxLevel) {
      logger.warn('Maximum shortcode nesting level reached');
      return content;
    }

    const startTime = Date.now();
    
    // Regular expression patterns for shortcodes
    // Match both self-closing and enclosing shortcodes
    const shortcodePattern = /\[([a-zA-Z0-9_-]+)([^\]]*?)(?:\]([^[]*?)\[\/\1\]|\s*\/?\])/g;
    
    let result = content;
    let match;
    const replacements: { original: string; replacement: string }[] = [];

    while ((match = shortcodePattern.exec(content)) !== null) {
      // Check execution time
      if (Date.now() - startTime > maxExecutionTime) {
        logger.warn('Shortcode parsing timeout reached');
        break;
      }

      const [fullMatch, name, attributesStr, innerContent = ''] = match;
      const isSelfClosing = fullMatch.endsWith('/]') || !innerContent;

      // Parse shortcode
      const parsed: ParsedShortcode = {
        name,
        attributes: this.parseAttributes(attributesStr),
        content: innerContent,
        raw: fullMatch,
        isSelfClosing
      };

      // Process nested shortcodes in content
      if (innerContent && currentLevel < maxLevel - 1) {
        parsed.content = await this.processShortcodes(
          innerContent,
          options,
          currentLevel + 1,
          maxLevel,
          maxExecutionTime - (Date.now() - startTime)
        );
      }

      // Render the shortcode
      const rendered = await this.renderShortcode(parsed, options);
      replacements.push({ original: fullMatch, replacement: rendered });
    }

    // Apply replacements
    for (const { original, replacement } of replacements) {
      result = result.replace(original, replacement);
    }

    return result;
  }

  /**
   * Parse shortcode attributes from string
   */
  private parseAttributes(attributesStr: string): Record<string, any> {
    const attributes: Record<string, any> = {};
    
    if (!attributesStr || !attributesStr.trim()) {
      return attributes;
    }

    // Match attribute patterns: name="value" or name='value' or name=value or just name
    const attrPattern = /(\w+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s]+)))?/g;
    let match;

    while ((match = attrPattern.exec(attributesStr)) !== null) {
      const [, name, doubleQuoted, singleQuoted, unquoted] = match;
      const value = doubleQuoted || singleQuoted || unquoted;
      
      if (value !== undefined) {
        // Try to parse as JSON for arrays/objects
        if (value.startsWith('[') || value.startsWith('{')) {
          try {
            attributes[name] = JSON.parse(value);
          } catch {
            attributes[name] = value;
          }
        } else if (value === 'true') {
          attributes[name] = true;
        } else if (value === 'false') {
          attributes[name] = false;
        } else if (!isNaN(Number(value))) {
          attributes[name] = Number(value);
        } else {
          attributes[name] = value;
        }
      } else {
        // Boolean attribute without value
        attributes[name] = true;
      }
    }

    return attributes;
  }

  /**
   * Render a parsed shortcode
   */
  private async renderShortcode(
    parsed: ParsedShortcode,
    options: ShortcodeParseOptions
  ): Promise<string> {
    const startTime = Date.now();
    let execution: Partial<ShortcodeExecution> | null = null;

    try {
      // Get shortcode definition
      const shortcode = await this.shortcodeRepository.findOne({
        where: { name: parsed.name, status: ShortcodeStatus.ACTIVE }
      });

      if (!shortcode) {
        logger.warn(`Unknown shortcode: ${parsed.name}`);
        return parsed.raw; // Return original if shortcode not found
      }

      // Check if handler exists
      const handler = shortcodeHandlers[parsed.name];
      if (!handler) {
        logger.warn(`No handler for shortcode: ${parsed.name}`);
        return parsed.raw;
      }

      // Validate and merge attributes with defaults
      const validatedAttributes = this.validateAttributes(
        parsed.attributes,
        shortcode.attributes || []
      );

      // Render the shortcode
      const rendered = await handler({
        name: parsed.name,
        attributes: validatedAttributes,
        content: parsed.content,
        shortcode,
        options
      });

      // Log execution
      execution = {
        shortcode_id: shortcode.id,
        user_id: options.userId,
        raw_content: parsed.raw,
        parsed_attributes: validatedAttributes,
        rendered_content: rendered,
        status: ExecutionStatus.SUCCESS,
        context: options.context,
        context_id: options.contextId,
        execution_time_ms: Date.now() - startTime,
        from_cache: false
      };

      // Update usage count
      await this.shortcodeRepository.increment(
        { id: shortcode.id },
        'usageCount',
        1
      );

      return rendered;
    } catch (error: any) {
      logger.error(`Error rendering shortcode ${parsed.name}:`, error);
      
      // Log failed execution
      if (execution) {
        execution.status = ExecutionStatus.ERROR;
        execution.error_message = error.message;
        execution.error_details = { stack: error.stack };
      }

      return parsed.raw; // Return original on error
    } finally {
      // Save execution log
      if (execution && options.userId) {
        try {
          await this.executionRepository.save(execution);
        } catch (error) {
          logger.error('Failed to save shortcode execution log:', error);
        }
      }
    }
  }

  /**
   * Validate and merge attributes with defaults
   */
  private validateAttributes(
    provided: Record<string, any>,
    definitions: any[]
  ): Record<string, any> {
    const validated: Record<string, any> = {};

    for (const def of definitions) {
      const value = provided[def.name];
      
      if (value !== undefined) {
        // Validate type
        switch (def.type) {
          case 'number':
            validated[def.name] = Number(value);
            break;
          case 'boolean':
            validated[def.name] = Boolean(value);
            break;
          case 'select':
            if (def.options && def.options.includes(value)) {
              validated[def.name] = value;
            } else if (def.default !== undefined) {
              validated[def.name] = def.default;
            }
            break;
          default:
            validated[def.name] = String(value);
        }
      } else if (def.default !== undefined) {
        validated[def.name] = def.default;
      } else if (def.required) {
        logger.warn(`Required attribute ${def.name} missing for shortcode`);
      }
    }

    // Include any extra attributes not in definitions
    for (const key in provided) {
      if (!Object.prototype.hasOwnProperty.call(validated, key)) {
        validated[key] = provided[key];
      }
    }

    return validated;
  }

  /**
   * Preview a shortcode without saving execution
   */
  async preview(
    name: string,
    attributes: Record<string, any>,
    content: string = ''
  ): Promise<string> {
    try {
      const shortcode = await this.shortcodeRepository.findOne({
        where: { name, status: ShortcodeStatus.ACTIVE }
      });

      if (!shortcode) {
        throw new Error(`Shortcode ${name} not found`);
      }

      const handler = shortcodeHandlers[name];
      if (!handler) {
        throw new Error(`No handler for shortcode ${name}`);
      }

      const validatedAttributes = this.validateAttributes(
        attributes,
        shortcode.attributes || []
      );

      return await handler({
        name,
        attributes: validatedAttributes,
        content,
        shortcode,
        options: { context: ExecutionContext.PREVIEW }
      });
    } catch (error: any) {
      logger.error(`Error previewing shortcode ${name}:`, error);
      throw error;
    }
  }

  /**
   * Get available shortcodes
   */
  async getAvailableShortcodes(): Promise<Shortcode[]> {
    return this.shortcodeRepository.find({
      where: { status: ShortcodeStatus.ACTIVE, isVisible: true },
      order: { category: 'ASC', displayName: 'ASC' }
    });
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(content: string, options: ShortcodeParseOptions): string {
    const hash = require('crypto')
      .createHash('md5')
      .update(content + JSON.stringify(options))
      .digest('hex');
    return `shortcode_${hash}`;
  }

  /**
   * Get from cache
   */
  private getFromCache(key: string): string | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.content;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Set cache
   */
  private setCache(key: string, content: string): void {
    // Limit cache size
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, { content, timestamp: Date.now() });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get execution logs
   */
  async getExecutionLogs(filters?: {
    shortcodeId?: string;
    userId?: string;
    status?: ExecutionStatus;
    context?: ExecutionContext;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<ShortcodeExecution[]> {
    const query = this.executionRepository.createQueryBuilder('execution')
      .leftJoinAndSelect('execution.shortcode', 'shortcode')
      .leftJoinAndSelect('execution.user', 'user');

    if (filters?.shortcodeId) {
      query.andWhere('execution.shortcode_id = :shortcodeId', { shortcodeId: filters.shortcodeId });
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

    query.orderBy('execution.created_at', 'DESC');

    if (filters?.limit) {
      query.limit(filters.limit);
    }

    return query.getMany();
  }
}

// Export singleton instance
export const shortcodeParser = new ShortcodeParserService();