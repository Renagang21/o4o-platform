import { DataSource } from 'typeorm';
import {
  ReportTemplateService,
  CreateTemplateDto,
  UpdateTemplateDto,
} from '../services/ReportTemplateService.js';

/**
 * ReportTemplateController
 *
 * 신상신고 템플릿 관리 API 컨트롤러
 */
export class ReportTemplateController {
  private templateService: ReportTemplateService;

  constructor(private dataSource: DataSource) {
    this.templateService = new ReportTemplateService(dataSource);
  }

  /**
   * GET /api/reporting/templates
   * 모든 템플릿 목록 조회
   */
  async list(query: { active?: string }): Promise<{
    success: boolean;
    data: any[];
  }> {
    const filter = query.active !== undefined
      ? { active: query.active === 'true' }
      : undefined;

    const templates = await this.templateService.list(filter);

    return {
      success: true,
      data: templates,
    };
  }

  /**
   * GET /api/reporting/templates/current
   * 현재 연도 활성 템플릿 조회
   */
  async getCurrent(): Promise<{
    success: boolean;
    data: any | null;
  }> {
    const template = await this.templateService.findCurrentActive();

    return {
      success: true,
      data: template,
    };
  }

  /**
   * GET /api/reporting/templates/:id
   * 템플릿 상세 조회
   */
  async get(id: string): Promise<{
    success: boolean;
    data: any | null;
  }> {
    const template = await this.templateService.findById(id);

    if (!template) {
      throw new Error(`Template "${id}" not found`);
    }

    return {
      success: true,
      data: template,
    };
  }

  /**
   * GET /api/reporting/templates/year/:year
   * 특정 연도 템플릿 조회
   */
  async getByYear(year: number): Promise<{
    success: boolean;
    data: any | null;
  }> {
    const template = await this.templateService.findByYear(year);

    return {
      success: true,
      data: template,
    };
  }

  /**
   * POST /api/reporting/templates
   * 템플릿 생성
   */
  async create(dto: CreateTemplateDto): Promise<{
    success: boolean;
    data: any;
  }> {
    const template = await this.templateService.create(dto);

    return {
      success: true,
      data: template,
    };
  }

  /**
   * PUT /api/reporting/templates/:id
   * 템플릿 수정
   */
  async update(id: string, dto: UpdateTemplateDto): Promise<{
    success: boolean;
    data: any;
  }> {
    const template = await this.templateService.update(id, dto);

    return {
      success: true,
      data: template,
    };
  }

  /**
   * DELETE /api/reporting/templates/:id
   * 템플릿 삭제
   */
  async delete(id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.templateService.delete(id);

    return {
      success: true,
      message: 'Template deleted successfully',
    };
  }

  /**
   * PATCH /api/reporting/templates/:id/activate
   * 템플릿 활성화
   */
  async activate(id: string): Promise<{
    success: boolean;
    data: any;
  }> {
    const template = await this.templateService.setActive(id, true);

    return {
      success: true,
      data: template,
    };
  }

  /**
   * PATCH /api/reporting/templates/:id/deactivate
   * 템플릿 비활성화
   */
  async deactivate(id: string): Promise<{
    success: boolean;
    data: any;
  }> {
    const template = await this.templateService.setActive(id, false);

    return {
      success: true,
      data: template,
    };
  }

  /**
   * POST /api/reporting/templates/:id/duplicate
   * 템플릿 복제 (새 연도용)
   */
  async duplicate(id: string, body: { targetYear: number }): Promise<{
    success: boolean;
    data: any;
  }> {
    const template = await this.templateService.duplicateForYear(id, body.targetYear);

    return {
      success: true,
      data: template,
    };
  }
}
