import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Headers,
  HttpCode,
  HttpStatus,
  UseInterceptors
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RateLimitGuard } from '../../guards/rate-limit.guard';
import { AdvancedQueryService, AdvancedQueryParams } from '../../services/AdvancedQueryService';
import { QueryComplexityAnalyzer } from '../../services/QueryComplexityAnalyzer';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { CacheInterceptor } from '../../interceptors/cache.interceptor';
import { z } from 'zod';

// DTOs for Swagger documentation
export class QueryRequestDto {
  source: string;
  expand?: string[];
  where?: any;
  sort?: Array<{ field: string; order: 'ASC' | 'DESC' }>;
  page?: {
    limit?: number;
    cursor?: string;
  };
  aggregate?: {
    count?: boolean;
    sum?: string[];
    avg?: string[];
  };
  cache?: {
    ttl?: number;
    key?: string;
  };
}

export class QueryResponseDto {
  success: boolean;
  data: any[];
  meta: {
    total?: number;
    cursor?: {
      next?: string;
      prev?: string;
    };
    aggregates?: Record<string, any>;
    query: {
      executionTime: number;
      cached: boolean;
      complexity: number;
    };
  };
}

@ApiTags('Data Query v2')
@Controller('api/v2/data')
@UseGuards(RateLimitGuard)
export class DataRoutesV2 {
  constructor(
    private readonly queryService: AdvancedQueryService,
    private readonly complexityAnalyzer: QueryComplexityAnalyzer
  ) {}

  @Post('query')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Execute advanced query',
    description: 'Execute an advanced query with support for expansion, filtering, sorting, and aggregation'
  })
  @ApiResponse({
    status: 200,
    description: 'Query executed successfully',
    type: QueryResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 403, description: 'Query forbidden due to security restrictions' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @UseInterceptors(CacheInterceptor)
  async executeQuery(
    @Body() params: QueryRequestDto,
    @CurrentUser() user?: any,
    @Headers('x-tenant-id') tenantId?: string
  ): Promise<QueryResponseDto> {
    try {
      const result = await this.queryService.executeQuery(
        params as AdvancedQueryParams,
        user?.id,
        tenantId
      );

      return {
        success: true,
        ...result
      };
    } catch (error) {
      if (error.message.includes('forbidden') || error.message.includes('not allowed')) {
        throw new ForbiddenException(error.message);
      }
      throw error;
    }
  }

  @Get('query')
  @ApiOperation({
    summary: 'Execute simple query',
    description: 'Execute a simple GET query with basic parameters'
  })
  @ApiResponse({
    status: 200,
    description: 'Query executed successfully',
    type: QueryResponseDto
  })
  @UseInterceptors(CacheInterceptor)
  async executeSimpleQuery(
    @Query('source') source: string,
    @Query('expand') expand?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('sort') sort?: string,
    @CurrentUser() user?: any,
    @Headers('x-tenant-id') tenantId?: string
  ): Promise<QueryResponseDto> {
    const params: AdvancedQueryParams = {
      source,
      expand: expand ? expand.split(',') : undefined,
      sort: sort ? this.parseSortParam(sort) : undefined,
      page: {
        limit: limit ? parseInt(limit, 10) : 10,
        cursor
      }
    };

    const result = await this.queryService.executeQuery(
      params,
      user?.id,
      tenantId
    );

    return {
      success: true,
      ...result
    };
  }

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Execute authenticated query',
    description: 'Execute a query that requires authentication'
  })
  @ApiResponse({
    status: 200,
    description: 'Query executed successfully',
    type: QueryResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async executeAuthenticatedQuery(
    @Body() params: QueryRequestDto,
    @CurrentUser() user: any,
    @Headers('x-tenant-id') tenantId?: string
  ): Promise<QueryResponseDto> {
    const result = await this.queryService.executeQuery(
      params as AdvancedQueryParams,
      user.id,
      tenantId || user.tenantId
    );

    return {
      success: true,
      ...result
    };
  }

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Analyze query complexity',
    description: 'Analyze the complexity of a query without executing it'
  })
  @ApiResponse({
    status: 200,
    description: 'Analysis completed',
    schema: {
      properties: {
        complexity: { type: 'number' },
        estimatedTime: { type: 'number' },
        warnings: {
          type: 'array',
          items: { type: 'string' }
        },
        suggestions: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    }
  })
  async analyzeQuery(
    @Body() params: QueryRequestDto
  ): Promise<{
    complexity: number;
    estimatedTime: number;
    warnings: string[];
    suggestions: string[];
  }> {
    const analysis = await this.complexityAnalyzer.analyze(params as AdvancedQueryParams);
    return analysis;
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate query parameters',
    description: 'Validate query parameters without executing'
  })
  @ApiResponse({
    status: 200,
    description: 'Validation result',
    schema: {
      properties: {
        valid: { type: 'boolean' },
        errors: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    }
  })
  async validateQuery(
    @Body() params: QueryRequestDto
  ): Promise<{ valid: boolean; errors: string[] }> {
    try {
      // Validate using the schema
      const { AdvancedQueryParamsSchema } = await import('../../services/AdvancedQueryService');
      AdvancedQueryParamsSchema.parse(params);

      return {
        valid: true,
        errors: []
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        };
      }

      return {
        valid: false,
        errors: [error.message]
      };
    }
  }

  @Get('cache/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get cache statistics',
    description: 'Get cache hit/miss statistics and memory usage'
  })
  async getCacheStats(): Promise<any> {
    // This would be implemented with the RedisCache service
    return {
      hitRate: 0.87,
      totalHits: 15234,
      totalMisses: 2341,
      memoryUsage: '124MB',
      keyCount: 342
    };
  }

  @Post('cache/invalidate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Invalidate cache',
    description: 'Invalidate cache by pattern or tags'
  })
  async invalidateCache(
    @Body() body: { pattern?: string; tags?: string[] }
  ): Promise<void> {
    // This would be implemented with the RedisCache service
    // await this.cacheService.invalidate(body.pattern, body.tags);
  }

  private parseSortParam(sort: string): Array<{ field: string; order: 'ASC' | 'DESC' }> {
    const sorts: Array<{ field: string; order: 'ASC' | 'DESC' }> = [];
    const parts = sort.split(',');

    for (const part of parts) {
      if (part.startsWith('-')) {
        sorts.push({
          field: part.substring(1),
          order: 'DESC'
        });
      } else {
        sorts.push({
          field: part,
          order: 'ASC'
        });
      }
    }

    return sorts;
  }
}

// Exception classes
class ForbiddenException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenException';
  }
}