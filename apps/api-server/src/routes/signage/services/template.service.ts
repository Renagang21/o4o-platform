import type { DataSource } from 'typeorm';
import { SignageTemplateRepository } from '../repositories/template.repository.js';
import {
  toTemplateResponse,
  toTemplateDetailResponse,
  toTemplateZoneResponse,
} from './signage-formatters.js';
import type {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateQueryDto,
  TemplateResponseDto,
  TemplateDetailResponseDto,
  CreateTemplateZoneDto,
  UpdateTemplateZoneDto,
  TemplateZoneResponseDto,
  ScopeFilter,
  PaginatedResponse,
  TemplatePreviewDto,
  TemplatePreviewResponseDto,
} from '../dto/index.js';

export class SignageTemplateService {
  private repository: SignageTemplateRepository;

  constructor(dataSource: DataSource) {
    this.repository = new SignageTemplateRepository(dataSource);
  }

  async getTemplate(id: string, scope: ScopeFilter): Promise<TemplateDetailResponseDto | null> {
    const template = await this.repository.findTemplateById(id, scope);
    if (!template) return null;
    return toTemplateDetailResponse(template);
  }

  async getTemplates(
    query: TemplateQueryDto,
    scope: ScopeFilter,
  ): Promise<PaginatedResponse<TemplateResponseDto>> {
    const { data, total } = await this.repository.findTemplates(query, scope);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(t => toTemplateResponse(t)),
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

  async createTemplate(
    dto: CreateTemplateDto,
    scope: ScopeFilter,
    userId?: string,
  ): Promise<TemplateResponseDto> {
    const template = await this.repository.createTemplate({
      ...dto,
      serviceKey: scope.serviceKey,
      organizationId: scope.organizationId || null,
      createdByUserId: userId || null,
    });
    return toTemplateResponse(template);
  }

  async updateTemplate(
    id: string,
    dto: UpdateTemplateDto,
    scope: ScopeFilter,
  ): Promise<TemplateResponseDto | null> {
    const template = await this.repository.updateTemplate(id, dto, scope);
    if (!template) return null;
    return toTemplateResponse(template);
  }

  async deleteTemplate(id: string, scope: ScopeFilter): Promise<boolean> {
    return this.repository.softDeleteTemplate(id, scope);
  }

  // ========== Template Zone Methods ==========

  async getTemplateZones(
    templateId: string,
    scope: ScopeFilter,
  ): Promise<TemplateZoneResponseDto[]> {
    const template = await this.repository.findTemplateById(templateId, scope);
    if (!template) {
      throw new Error('Template not found');
    }
    const zones = await this.repository.findTemplateZones(templateId);
    return zones.map(z => toTemplateZoneResponse(z));
  }

  async addTemplateZone(
    templateId: string,
    dto: CreateTemplateZoneDto,
    scope: ScopeFilter,
  ): Promise<TemplateZoneResponseDto> {
    const template = await this.repository.findTemplateById(templateId, scope);
    if (!template) {
      throw new Error('Template not found');
    }

    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const maxOrder = await this.repository.getMaxZoneSortOrder(templateId);
      sortOrder = maxOrder + 1;
    }

    const zone = await this.repository.createTemplateZone({
      templateId,
      ...dto,
      sortOrder,
      zIndex: dto.zIndex ?? 0,
      isActive: dto.isActive ?? true,
    });
    return toTemplateZoneResponse(zone);
  }

  async updateTemplateZone(
    templateId: string,
    zoneId: string,
    dto: UpdateTemplateZoneDto,
    scope: ScopeFilter,
  ): Promise<TemplateZoneResponseDto | null> {
    const template = await this.repository.findTemplateById(templateId, scope);
    if (!template) {
      throw new Error('Template not found');
    }

    const existingZone = await this.repository.findTemplateZoneById(zoneId);
    if (!existingZone || existingZone.templateId !== templateId) {
      return null;
    }

    const zone = await this.repository.updateTemplateZone(zoneId, dto);
    if (!zone) return null;
    return toTemplateZoneResponse(zone);
  }

  async deleteTemplateZone(
    templateId: string,
    zoneId: string,
    scope: ScopeFilter,
  ): Promise<boolean> {
    const template = await this.repository.findTemplateById(templateId, scope);
    if (!template) {
      throw new Error('Template not found');
    }
    return this.repository.deleteTemplateZone(zoneId);
  }

  async generateTemplatePreview(
    dto: TemplatePreviewDto,
    scope: ScopeFilter,
  ): Promise<TemplatePreviewResponseDto> {
    const template = await this.repository.findTemplateById(dto.templateId, scope);
    if (!template) {
      throw new Error('Template not found');
    }

    const previewHtml = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; background: ${template.layoutConfig.backgroundColor || '#000'}; }
    .zone { position: absolute; border: 1px dashed #fff; }
  </style>
</head>
<body style="width: ${template.layoutConfig.width}px; height: ${template.layoutConfig.height}px;">
  ${(template.zones || []).map(zone => `
    <div class="zone" style="
      left: ${zone.position.x}${zone.position.unit};
      top: ${zone.position.y}${zone.position.unit};
      width: ${zone.position.width}${zone.position.unit};
      height: ${zone.position.height}${zone.position.unit};
    ">
      ${zone.name}
    </div>
  `).join('')}
</body>
</html>`;

    return {
      previewHtml,
      previewUrl: null,
      compiledAt: new Date().toISOString(),
    };
  }
}
