/**
 * Store Library Service
 *
 * WO-O4O-STORE-LIBRARY-FOUNDATION-V1
 *
 * 매장 내부 전용 자료실 CRUD.
 * 모든 쿼리에 storeId(= organizationId) 필터 필수 (Boundary Policy §7).
 */

import type { DataSource, Repository } from 'typeorm';
import { StoreLibraryItem } from './entities/StoreLibraryItem.entity.js';

export interface CreateStoreLibraryItemInput {
  title: string;
  description?: string | null;
  fileUrl: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  category?: string | null;
}

export interface UpdateStoreLibraryItemInput {
  title?: string;
  description?: string | null;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  mimeType?: string;
  category?: string | null;
}

export class StoreLibraryService {
  private repo: Repository<StoreLibraryItem>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(StoreLibraryItem);
  }

  async getStoreLibraryItems(storeId: string): Promise<StoreLibraryItem[]> {
    return this.repo.find({
      where: { storeId },
      order: { createdAt: 'DESC' },
    });
  }

  async getStoreLibraryItemById(
    id: string,
    storeId: string,
  ): Promise<StoreLibraryItem | null> {
    return this.repo.findOne({ where: { id, storeId } });
  }

  async createStoreLibraryItem(
    storeId: string,
    createdBy: string,
    input: CreateStoreLibraryItemInput,
  ): Promise<StoreLibraryItem> {
    const item = this.repo.create({
      storeId,
      createdBy,
      title: input.title,
      description: input.description ?? null,
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      category: input.category ?? null,
    });
    return this.repo.save(item);
  }

  async updateStoreLibraryItem(
    id: string,
    storeId: string,
    updates: UpdateStoreLibraryItemInput,
  ): Promise<{ success: boolean; data?: StoreLibraryItem; error?: string }> {
    const item = await this.repo.findOne({ where: { id, storeId } });
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
    storeId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const item = await this.repo.findOne({ where: { id, storeId } });
    if (!item) {
      return { success: false, error: 'ITEM_NOT_FOUND' };
    }

    await this.repo.remove(item);
    return { success: true };
  }
}
