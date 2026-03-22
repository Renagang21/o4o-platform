import type { DataSource } from 'typeorm';
import { SignageContentRepository } from '../repositories/content.repository.js';
import {
  toContentBlockResponse,
  toLayoutPresetResponse,
} from './signage-formatters.js';
import type {
  CreateContentBlockDto,
  UpdateContentBlockDto,
  ContentBlockQueryDto,
  ContentBlockResponseDto,
  CreateLayoutPresetDto,
  UpdateLayoutPresetDto,
  LayoutPresetQueryDto,
  LayoutPresetResponseDto,
  ScopeFilter,
  PaginatedResponse,
  AiGenerateRequestDto,
  AiGenerateResponseDto,
} from '../dto/index.js';

export class SignageContentService {
  private repository: SignageContentRepository;

  constructor(dataSource: DataSource) {
    this.repository = new SignageContentRepository(dataSource);
  }

  // ========== Content Block Methods ==========

  async getContentBlock(id: string, scope: ScopeFilter): Promise<ContentBlockResponseDto | null> {
    const block = await this.repository.findContentBlockById(id, scope);
    if (!block) return null;
    return toContentBlockResponse(block);
  }

  async getContentBlocks(
    query: ContentBlockQueryDto,
    scope: ScopeFilter,
  ): Promise<PaginatedResponse<ContentBlockResponseDto>> {
    const { data, total } = await this.repository.findContentBlocks(query, scope);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(b => toContentBlockResponse(b)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async createContentBlock(
    dto: CreateContentBlockDto,
    scope: ScopeFilter,
    userId?: string,
  ): Promise<ContentBlockResponseDto> {
    const block = await this.repository.createContentBlock({
      ...dto,
      serviceKey: scope.serviceKey,
      organizationId: scope.organizationId || null,
      createdByUserId: userId || null,
    });
    return toContentBlockResponse(block);
  }

  async updateContentBlock(
    id: string,
    dto: UpdateContentBlockDto,
    scope: ScopeFilter,
  ): Promise<ContentBlockResponseDto | null> {
    const block = await this.repository.updateContentBlock(id, dto, scope);
    if (!block) return null;
    return toContentBlockResponse(block);
  }

  async deleteContentBlock(id: string, scope: ScopeFilter): Promise<boolean> {
    return this.repository.softDeleteContentBlock(id, scope);
  }

  // ========== Layout Preset Methods ==========

  async getLayoutPreset(id: string, serviceKey?: string): Promise<LayoutPresetResponseDto | null> {
    const preset = await this.repository.findLayoutPresetById(id, serviceKey);
    if (!preset) return null;
    return toLayoutPresetResponse(preset);
  }

  async getLayoutPresets(
    query: LayoutPresetQueryDto,
    serviceKey?: string,
  ): Promise<PaginatedResponse<LayoutPresetResponseDto>> {
    const { data, total } = await this.repository.findLayoutPresets(query, serviceKey);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(p => toLayoutPresetResponse(p)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async createLayoutPreset(
    dto: CreateLayoutPresetDto,
    serviceKey?: string,
  ): Promise<LayoutPresetResponseDto> {
    const preset = await this.repository.createLayoutPreset({
      ...dto,
      serviceKey: serviceKey || null,
    });
    return toLayoutPresetResponse(preset);
  }

  async updateLayoutPreset(
    id: string,
    dto: UpdateLayoutPresetDto,
  ): Promise<LayoutPresetResponseDto | null> {
    const preset = await this.repository.updateLayoutPreset(id, dto);
    if (!preset) return null;
    return toLayoutPresetResponse(preset);
  }

  async deleteLayoutPreset(id: string): Promise<boolean> {
    return this.repository.softDeleteLayoutPreset(id);
  }

  // ========== AI Generation ==========

  async generateWithAi(
    dto: AiGenerateRequestDto,
    scope: ScopeFilter,
    userId?: string,
  ): Promise<AiGenerateResponseDto> {
    const generatedContent = `<div class="ai-generated ${dto.style || 'modern'}">
      <h2>${dto.prompt.slice(0, 50)}</h2>
      <p>AI-generated content placeholder</p>
    </div>`;

    const block = await this.repository.createContentBlock({
      serviceKey: scope.serviceKey,
      organizationId: scope.organizationId || null,
      createdByUserId: userId || null,
      name: `AI Generated: ${dto.templateType}`,
      blockType: 'html',
      content: generatedContent,
      status: 'active',
      metadata: {
        aiGenerated: true,
        prompt: dto.prompt,
        templateType: dto.templateType,
        style: dto.style,
      },
    });

    await this.repository.createAiGenerationLog({
      serviceKey: scope.serviceKey,
      organizationId: scope.organizationId || null,
      userId: userId || null,
      generationType: dto.templateType as 'banner' | 'custom',
      request: {
        prompt: dto.prompt,
        parameters: {
          style: dto.style,
          width: dto.width,
          height: dto.height,
        },
      },
      outputData: {
        contentBlockId: block.id,
        resultType: 'content_block',
      },
      modelName: 'placeholder',
      tokensUsed: 0,
      status: 'completed',
    });

    return {
      contentBlockId: block.id,
      generatedContent,
      thumbnailUrl: null,
      generationLog: {
        prompt: dto.prompt,
        model: 'placeholder',
        tokensUsed: 0,
        generatedAt: new Date().toISOString(),
      },
    };
  }
}
