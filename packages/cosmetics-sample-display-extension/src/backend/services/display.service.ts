/**
 * Display Service
 *
 * 진열 레이아웃 관리
 */

import { Repository, DataSource } from 'typeorm';
import {
  DisplayLayout,
  ShelfPosition,
  DisplayStatus,
  DisplayType,
} from '../entities/display-layout.entity';

export interface UpdateDisplayLayoutDto {
  storeId: string;
  productId: string;
  productName: string;
  supplierId?: string;
  categoryName?: string;
  shelfPosition?: ShelfPosition;
  shelfSection?: string;
  facingCount?: number;
  shelfRow?: number;
  shelfColumn?: number;
  displayType?: DisplayType;
  displayStartDate?: Date;
  displayEndDate?: Date;
  planogramOrder?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface SaveDisplayPhotoDto {
  displayId: string;
  photoUrl: string;
}

export interface DisplayFilter {
  storeId?: string;
  productId?: string;
  supplierId?: string;
  status?: DisplayStatus;
  displayType?: DisplayType;
  shelfPosition?: ShelfPosition;
  isVerified?: boolean;
}

export class DisplayService {
  private repository: Repository<DisplayLayout>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(DisplayLayout);
  }

  /**
   * Update or create display layout
   */
  async updateDisplayLayout(dto: UpdateDisplayLayoutDto): Promise<DisplayLayout> {
    // Check if layout exists for this store/product
    let layout = await this.repository.findOne({
      where: {
        storeId: dto.storeId,
        productId: dto.productId,
      },
    });

    if (layout) {
      // Update existing layout
      Object.assign(layout, dto);
    } else {
      // Create new layout
      layout = this.repository.create({
        ...dto,
        shelfPosition: dto.shelfPosition || 'eye_level',
        facingCount: dto.facingCount || 1,
        displayType: dto.displayType || 'permanent',
        status: 'active',
        isVerified: false,
      });
    }

    return this.repository.save(layout);
  }

  /**
   * Save display photo
   */
  async saveDisplayPhoto(dto: SaveDisplayPhotoDto): Promise<DisplayLayout | null> {
    const layout = await this.findById(dto.displayId);
    if (!layout) return null;

    layout.photoUrl = dto.photoUrl;
    layout.photoUploadedAt = new Date();
    layout.isVerified = false; // Reset verification when photo changes

    return this.repository.save(layout);
  }

  /**
   * Get display by ID
   */
  async findById(id: string): Promise<DisplayLayout | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * Get display by store and product
   */
  async getDisplay(storeId: string, productId: string): Promise<DisplayLayout | null> {
    return this.repository.findOne({
      where: { storeId, productId },
    });
  }

  /**
   * Get all displays for a store
   */
  async getDisplayByStore(storeId: string): Promise<DisplayLayout[]> {
    return this.repository.find({
      where: { storeId },
      order: { planogramOrder: 'ASC', updatedAt: 'DESC' },
    });
  }

  /**
   * List displays with filter
   */
  async findAll(filter: DisplayFilter): Promise<DisplayLayout[]> {
    const qb = this.repository.createQueryBuilder('display');

    if (filter.storeId) {
      qb.andWhere('display.storeId = :storeId', { storeId: filter.storeId });
    }

    if (filter.productId) {
      qb.andWhere('display.productId = :productId', { productId: filter.productId });
    }

    if (filter.supplierId) {
      qb.andWhere('display.supplierId = :supplierId', { supplierId: filter.supplierId });
    }

    if (filter.status) {
      qb.andWhere('display.status = :status', { status: filter.status });
    }

    if (filter.displayType) {
      qb.andWhere('display.displayType = :displayType', { displayType: filter.displayType });
    }

    if (filter.shelfPosition) {
      qb.andWhere('display.shelfPosition = :position', { position: filter.shelfPosition });
    }

    if (filter.isVerified !== undefined) {
      qb.andWhere('display.isVerified = :verified', { verified: filter.isVerified });
    }

    qb.orderBy('display.updatedAt', 'DESC');

    return qb.getMany();
  }

  /**
   * Verify display
   */
  async verifyDisplay(id: string, verifiedBy: string): Promise<DisplayLayout | null> {
    const layout = await this.findById(id);
    if (!layout) return null;

    layout.isVerified = true;
    layout.verifiedAt = new Date();
    layout.verifiedBy = verifiedBy;

    return this.repository.save(layout);
  }

  /**
   * Update display status
   */
  async updateStatus(id: string, status: DisplayStatus): Promise<DisplayLayout | null> {
    const layout = await this.findById(id);
    if (!layout) return null;

    layout.status = status;

    return this.repository.save(layout);
  }

  /**
   * Update facing count
   */
  async updateFacing(id: string, facingCount: number): Promise<DisplayLayout | null> {
    const layout = await this.findById(id);
    if (!layout) return null;

    layout.facingCount = facingCount;

    return this.repository.save(layout);
  }

  /**
   * Get display summary for store
   */
  async getStoreSummary(storeId: string): Promise<{
    totalDisplays: number;
    activeDisplays: number;
    verifiedDisplays: number;
    needsRefill: number;
    byPosition: Record<string, number>;
  }> {
    const displays = await this.getDisplayByStore(storeId);

    const byPosition: Record<string, number> = {};
    displays.forEach((d) => {
      byPosition[d.shelfPosition] = (byPosition[d.shelfPosition] || 0) + 1;
    });

    return {
      totalDisplays: displays.length,
      activeDisplays: displays.filter((d) => d.status === 'active').length,
      verifiedDisplays: displays.filter((d) => d.isVerified).length,
      needsRefill: displays.filter((d) => d.status === 'needs_refill').length,
      byPosition,
    };
  }

  /**
   * Get displays by shelf position
   */
  async getDisplaysByPosition(
    storeId: string,
    position: ShelfPosition
  ): Promise<DisplayLayout[]> {
    return this.repository.find({
      where: { storeId, shelfPosition: position },
      order: { planogramOrder: 'ASC' },
    });
  }

  /**
   * Get unverified displays
   */
  async getUnverifiedDisplays(storeId?: string): Promise<DisplayLayout[]> {
    const qb = this.repository.createQueryBuilder('display');

    qb.where('display.isVerified = :verified', { verified: false });
    qb.andWhere('display.photoUrl IS NOT NULL');

    if (storeId) {
      qb.andWhere('display.storeId = :storeId', { storeId });
    }

    qb.orderBy('display.photoUploadedAt', 'DESC');

    return qb.getMany();
  }

  /**
   * Delete display
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
