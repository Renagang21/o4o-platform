/**
 * Neture Library Service
 *
 * 공급자 전용 자료실 CRUD
 * 독립 도메인 — HUB/Signage/CMS 연동 없음
 *
 * WO-O4O-NETURE-LIBRARY-FOUNDATION-V1
 */

import { DataSource, Repository } from 'typeorm';
import { NetureSupplierLibraryItem } from '../entities/index.js';
import logger from '../../../utils/logger.js';

interface ListOptions {
  category?: string;
  page?: number;
  limit?: number;
}

interface CreateInput {
  title: string;
  description?: string | null;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  category?: string | null;
  isPublic?: boolean;
  contentType?: string;
  blocks?: Record<string, unknown>[] | null;
}

interface UpdateInput {
  title?: string;
  description?: string | null;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  category?: string | null;
  isPublic?: boolean;
  contentType?: string;
  blocks?: Record<string, unknown>[] | null;
}

export class NetureLibraryService {
  private repo: Repository<NetureSupplierLibraryItem>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(NetureSupplierLibraryItem);
  }

  /**
   * 공급자 자신의 자료 목록 조회
   */
  async listBySupplier(
    supplierId: string,
    opts?: ListOptions,
  ): Promise<{ success: true; data: { items: NetureSupplierLibraryItem[]; total: number } }> {
    try {
      const page = opts?.page || 1;
      const limit = Math.min(opts?.limit || 20, 100);

      const where: Record<string, unknown> = { supplierId };
      if (opts?.category) {
        where.category = opts.category;
      }

      const [items, total] = await this.repo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return { success: true, data: { items, total } };
    } catch (error) {
      logger.error('[NetureLibraryService] Error listing supplier items:', error);
      throw error;
    }
  }

  /**
   * 단건 조회 (공급자 본인 소유만)
   *
   * WO-O4O-NETURE-SUPPLIER-LIBRARY-EDIT-ITEM-LOOKUP-PAGINATION-V1:
   *   수정 화면이 목록(limit 100) 에서 find(id) 하던 구조를 대체한다.
   *   소유권은 update()/delete() 와 동일하게 `where: { id, supplierId }` 로 강제하며,
   *   타인 소유·미존재는 모두 null → 라우트에서 404 로 숨긴다(기존 관례 유지).
   */
  async getByIdForSupplier(id: string, supplierId: string): Promise<NetureSupplierLibraryItem | null> {
    try {
      return await this.repo.findOne({ where: { id, supplierId } });
    } catch (error) {
      logger.error('[NetureLibraryService] Error fetching item:', error);
      throw error;
    }
  }

  /**
   * 공개 자료 목록 조회 (인증 불필요)
   */
  async listPublic(
    opts?: ListOptions,
  ): Promise<{ success: true; data: { items: NetureSupplierLibraryItem[]; total: number } }> {
    try {
      const page = opts?.page || 1;
      const limit = Math.min(opts?.limit || 20, 100);

      const where: Record<string, unknown> = { isPublic: true };
      if (opts?.category) {
        where.category = opts.category;
      }

      const [items, total] = await this.repo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return { success: true, data: { items, total } };
    } catch (error) {
      logger.error('[NetureLibraryService] Error listing public items:', error);
      throw error;
    }
  }

  /**
   * 자료 생성
   */
  async create(
    supplierId: string,
    input: CreateInput,
  ): Promise<{ success: true; data: NetureSupplierLibraryItem }> {
    try {
      const isPublic = input.isPublic ?? false;
      const item = this.repo.create({
        supplierId,
        title: input.title,
        description: input.description ?? null,
        fileUrl: input.fileUrl ?? '',
        fileName: input.fileName ?? '',
        fileSize: input.fileSize ?? 0,
        mimeType: input.mimeType ?? '',
        category: input.category ?? null,
        isPublic,
        contentType: input.contentType ?? 'media',
        visibility: isPublic ? 'service' : 'personal',
        blocks: input.blocks ?? null,
      });

      const saved = await this.repo.save(item);
      logger.info(`[NetureLibraryService] Item created: ${saved.id} by supplier ${supplierId}`);
      return { success: true, data: saved };
    } catch (error) {
      logger.error('[NetureLibraryService] Error creating item:', error);
      throw error;
    }
  }

  /**
   * 자료 수정 (소유권 검증: supplierId 복합 조건)
   */
  async update(
    id: string,
    supplierId: string,
    input: UpdateInput,
  ): Promise<{ success: true; data: NetureSupplierLibraryItem } | { success: false; error: string }> {
    try {
      const item = await this.repo.findOne({ where: { id, supplierId } });
      if (!item) {
        return { success: false, error: 'ITEM_NOT_FOUND' };
      }

      if (input.title !== undefined) item.title = input.title;
      if (input.description !== undefined) item.description = input.description;
      if (input.fileUrl !== undefined) item.fileUrl = input.fileUrl;
      if (input.fileName !== undefined) item.fileName = input.fileName;
      if (input.fileSize !== undefined) item.fileSize = input.fileSize;
      if (input.mimeType !== undefined) item.mimeType = input.mimeType;
      if (input.category !== undefined) item.category = input.category;
      if (input.isPublic !== undefined) {
        item.isPublic = input.isPublic;
        item.visibility = input.isPublic ? 'service' : 'personal';
      }
      if (input.contentType !== undefined) item.contentType = input.contentType;
      if (input.blocks !== undefined) item.blocks = input.blocks;

      const saved = await this.repo.save(item);
      logger.info(`[NetureLibraryService] Item updated: ${id} by supplier ${supplierId}`);
      return { success: true, data: saved };
    } catch (error) {
      logger.error('[NetureLibraryService] Error updating item:', error);
      throw error;
    }
  }

  /**
   * 자료 삭제 (소유권 검증: supplierId 복합 조건)
   */
  async delete(
    id: string,
    supplierId: string,
  ): Promise<{ success: true } | { success: false; error: string }> {
    try {
      const item = await this.repo.findOne({ where: { id, supplierId } });
      if (!item) {
        return { success: false, error: 'ITEM_NOT_FOUND' };
      }

      await this.repo.remove(item);
      logger.info(`[NetureLibraryService] Item deleted: ${id} by supplier ${supplierId}`);
      return { success: true };
    } catch (error) {
      logger.error('[NetureLibraryService] Error deleting item:', error);
      throw error;
    }
  }
}
