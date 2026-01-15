/**
 * PartnerContentService
 * 파트너 콘텐츠 CRUD
 *
 * WO-PARTNER-DASHBOARD-API-BE-IMPLEMENTATION-V1
 *
 * 허용 필드: type, title, body, url, isActive
 * ❌ 상품 ID
 * ❌ 가격/재고
 * ❌ 노출 위치 필드
 */

import { AppDataSource } from '../../../database/connection.js';
import { PartnerContent } from '../entities/PartnerContent.js';
import type {
  PartnerContentDto,
  CreatePartnerContentDto,
  UpdatePartnerContentDto,
} from '../dto/partner.dto.js';

export class PartnerContentService {
  /**
   * Get all contents for partner
   */
  static async getContents(
    partnerId: string,
    serviceId: string
  ): Promise<PartnerContentDto[]> {
    const contentRepo = AppDataSource.getRepository(PartnerContent);

    const contents = await contentRepo.find({
      where: {
        partnerId,
        serviceId,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return contents.map((content) => ({
      id: content.id,
      type: content.type,
      title: content.title,
      body: content.body,
      url: content.url,
      isActive: content.isActive,
      status: content.getStatus(),
      createdAt: content.createdAt,
    }));
  }

  /**
   * Create new content
   */
  static async createContent(
    partnerId: string,
    serviceId: string,
    data: CreatePartnerContentDto
  ): Promise<PartnerContentDto> {
    const contentRepo = AppDataSource.getRepository(PartnerContent);

    const content = contentRepo.create({
      partnerId,
      serviceId,
      type: data.type,
      title: data.title,
      body: data.body,
      url: data.url,
      isActive: true,
    });

    const saved = await contentRepo.save(content);

    return {
      id: saved.id,
      type: saved.type,
      title: saved.title,
      body: saved.body,
      url: saved.url,
      isActive: saved.isActive,
      status: saved.getStatus(),
      createdAt: saved.createdAt,
    };
  }

  /**
   * Update content (title, body, url, isActive only)
   */
  static async updateContent(
    partnerId: string,
    serviceId: string,
    contentId: string,
    data: UpdatePartnerContentDto
  ): Promise<PartnerContentDto | null> {
    const contentRepo = AppDataSource.getRepository(PartnerContent);

    // Find content ensuring it belongs to this partner
    const content = await contentRepo.findOne({
      where: {
        id: contentId,
        partnerId,
        serviceId,
      },
    });

    if (!content) {
      return null;
    }

    // Update only allowed fields
    if (data.title !== undefined) content.title = data.title;
    if (data.body !== undefined) content.body = data.body;
    if (data.url !== undefined) content.url = data.url;
    if (data.isActive !== undefined) content.isActive = data.isActive;

    const saved = await contentRepo.save(content);

    return {
      id: saved.id,
      type: saved.type,
      title: saved.title,
      body: saved.body,
      url: saved.url,
      isActive: saved.isActive,
      status: saved.getStatus(),
      createdAt: saved.createdAt,
    };
  }

  /**
   * Get single content by ID
   */
  static async getContentById(
    partnerId: string,
    serviceId: string,
    contentId: string
  ): Promise<PartnerContentDto | null> {
    const contentRepo = AppDataSource.getRepository(PartnerContent);

    const content = await contentRepo.findOne({
      where: {
        id: contentId,
        partnerId,
        serviceId,
      },
    });

    if (!content) {
      return null;
    }

    return {
      id: content.id,
      type: content.type,
      title: content.title,
      body: content.body,
      url: content.url,
      isActive: content.isActive,
      status: content.getStatus(),
      createdAt: content.createdAt,
    };
  }
}
