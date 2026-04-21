/**
 * Store Library Service
 *
 * WO-O4O-STORE-LIBRARY-FOUNDATION-V1
 *
 * 매장 내부 전용 자료실 CRUD.
 * 모든 쿼리에 organizationId 필터 필수 (Boundary Policy §7).
 */

import type { DataSource, Repository } from 'typeorm';
import { StoreExecutionAsset } from '../../routes/platform/entities/index.js';

export interface CreateStoreLibraryItemInput {
  title: string;
  description?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  category?: string | null;
}

export interface UpdateStoreLibraryItemInput {
  title?: string;
  description?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  category?: string | null;
}

export class StoreLibraryService {
  private repo: Repository<StoreExecutionAsset>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(StoreExecutionAsset);
  }

  async getStoreLibraryItems(organizationId: string): Promise<StoreExecutionAsset[]> {
    return this.repo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async getStoreLibraryItemById(
    id: string,
    organizationId: string,
  ): Promise<StoreExecutionAsset | null> {
    return this.repo.findOne({ where: { id, organizationId } });
  }

  async createStoreLibraryItem(
    organizationId: string,
    input: CreateStoreLibraryItemInput,
  ): Promise<StoreExecutionAsset> {
    const item = this.repo.create({
      organizationId,
      title: input.title,
      description: input.description ?? null,
      fileUrl: input.fileUrl ?? null,
      fileName: input.fileName ?? null,
      fileSize: input.fileSize ?? null,
      mimeType: input.mimeType ?? null,
      category: input.category ?? null,
    });
    return this.repo.save(item);
  }

  async updateStoreLibraryItem(
    id: string,
    organizationId: string,
    updates: UpdateStoreLibraryItemInput,
  ): Promise<{ success: boolean; data?: StoreExecutionAsset; error?: string }> {
    const item = await this.repo.findOne({ where: { id, organizationId } });
    if (!item) {
      return { success: false, error: 'ITEM_NOT_FOUND' };
    }

    if (updates.title !== undefined) item.title = updates.title;
    if (updates.description !== undefined) item.description = updates.description;
    if (updates.fileUrl !== undefined) item.fileUrl = updates.fileUrl;
    if (updates.fileName !== undefined) item.fileName = updates.fileName;
    if (updates.fileSize !== undefined) item.fileSize = updates.fileSize;
    if (updates.mimeType !== undefined) item.mimeType = updates.mimeType;
    if (updates.category !== undefined) item.category = updates.category;

    const saved = await this.repo.save(item);
    return { success: true, data: saved };
  }

  async deleteStoreLibraryItem(
    id: string,
    organizationId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const item = await this.repo.findOne({ where: { id, organizationId } });
    if (!item) {
      return { success: false, error: 'ITEM_NOT_FOUND' };
    }

    await this.repo.remove(item);
    return { success: true };
  }
}
