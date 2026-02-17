/**
 * Cosmetics Store Service
 *
 * WO-KCOS-STORES-PHASE1-V1: K-Cosmetics Store Core
 * Business logic for store management
 */

import { DataSource } from 'typeorm';
import { normalizeBusinessNumber } from '../../../utils/business-number.js';
import { StoreSlugService } from '@o4o/platform-core/store-identity';
import { CosmeticsStoreRepository } from '../repositories/cosmetics-store.repository.js';
import {
  CosmeticsStoreStatus,
  CosmeticsStoreApplicationStatus,
  CosmeticsStoreMemberRole,
} from '../entities/index.js';
import { CosmeticsProduct } from '../entities/index.js';

export class CosmeticsStoreService {
  private repository: CosmeticsStoreRepository;

  constructor(private dataSource: DataSource) {
    this.repository = new CosmeticsStoreRepository(dataSource);
  }

  // ============================================================================
  // Application Flow
  // ============================================================================

  async submitApplication(dto: {
    storeName: string;
    businessNumber: string;
    ownerName: string;
    contactPhone?: string;
    address?: string;
    region?: string;
    note?: string;
    requestedSlug?: string; // WO-CORE-STORE-REQUESTED-SLUG-V1
  }, userId: string) {
    const normalizedBN = normalizeBusinessNumber(dto.businessNumber);

    // Check for existing pending application
    const pending = await this.repository.findPendingApplicationByUserId(userId);
    if (pending) {
      throw new Error('PENDING_APPLICATION_EXISTS');
    }

    // Check business_number not already used by an existing store
    const existingStore = await this.repository.findStoreByBusinessNumber(normalizedBN);
    if (existingStore) {
      throw new Error('BUSINESS_NUMBER_ALREADY_REGISTERED');
    }

    // WO-CORE-STORE-REQUESTED-SLUG-V1: Validate requestedSlug if provided
    let validatedSlug: string | undefined;
    if (dto.requestedSlug) {
      const { normalizeSlug } = await import('@o4o/platform-core/store-identity');
      const normalized = normalizeSlug(dto.requestedSlug);
      const slugService = new StoreSlugService(this.dataSource);
      const availability = await slugService.checkAvailability(normalized);

      if (!availability.available) {
        throw new Error(`SLUG_NOT_AVAILABLE:${availability.reason}`);
      }
      validatedSlug = normalized;
    }

    const application = await this.repository.createApplication({
      applicantUserId: userId,
      storeName: dto.storeName,
      businessNumber: normalizedBN,
      ownerName: dto.ownerName,
      contactPhone: dto.contactPhone,
      address: dto.address,
      region: dto.region,
      note: dto.note,
      requestedSlug: validatedSlug,
      status: CosmeticsStoreApplicationStatus.SUBMITTED,
    });

    return { data: application };
  }

  async getMyApplications(userId: string) {
    const applications = await this.repository.findApplicationsByUserId(userId);
    return { data: applications };
  }

  async reviewApplication(
    applicationId: string,
    action: 'approve' | 'reject',
    reviewedBy: string,
    rejectionReason?: string,
  ) {
    const application = await this.repository.findApplicationById(applicationId);
    if (!application) {
      throw new Error('APPLICATION_NOT_FOUND');
    }
    if (application.status !== CosmeticsStoreApplicationStatus.SUBMITTED) {
      throw new Error('APPLICATION_NOT_PENDING');
    }

    if (action === 'approve') {
      // Check business_number not already taken by another store
      const existingStore = await this.repository.findStoreByBusinessNumber(application.businessNumber);
      if (existingStore) {
        throw new Error('BUSINESS_NUMBER_ALREADY_REGISTERED');
      }

      // Use transaction: create store + member atomically
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Update application
        await queryRunner.manager.update(
          'CosmeticsStoreApplication',
          applicationId,
          {
            status: CosmeticsStoreApplicationStatus.APPROVED,
            reviewedBy,
            reviewedAt: new Date(),
          },
        );

        // Create store
        const storeCode = this.generateStoreCode();

        // WO-CORE-STORE-SLUG-INTEGRATION-V1 + TRANSACTION-HARDENING: Use Core StoreSlugService with manager
        const slugService = new StoreSlugService(queryRunner.manager);

        // WO-CORE-STORE-REQUESTED-SLUG-V1: Use requestedSlug if available
        let slug: string;
        if (application.requestedSlug) {
          const availability = await slugService.checkAvailability(application.requestedSlug);
          if (!availability.available) {
            throw new Error(`Requested slug '${application.requestedSlug}' is no longer available: ${availability.reason}`);
          }
          slug = application.requestedSlug;
        } else {
          slug = await slugService.generateUniqueSlug(application.storeName);
        }

        const store = queryRunner.manager.create('CosmeticsStore', {
          name: application.storeName,
          code: storeCode,
          slug,
          businessNumber: application.businessNumber,
          ownerName: application.ownerName,
          contactPhone: application.contactPhone,
          address: application.address,
          region: application.region,
          status: CosmeticsStoreStatus.APPROVED,
        });
        const savedStore = await queryRunner.manager.save('CosmeticsStore', store);

        // Register slug in platform-wide registry
        await slugService.reserveSlug({
          storeId: (savedStore as any).id,
          serviceKey: 'cosmetics',
          slug,
        });

        // Create owner member
        const member = queryRunner.manager.create('CosmeticsStoreMember', {
          storeId: (savedStore as any).id,
          userId: application.applicantUserId,
          role: CosmeticsStoreMemberRole.OWNER,
        });
        await queryRunner.manager.save('CosmeticsStoreMember', member);

        await queryRunner.commitTransaction();

        return { data: { application: { ...application, status: 'approved' }, store: savedStore } };
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } else {
      // Reject
      await this.repository.updateApplication(applicationId, {
        status: CosmeticsStoreApplicationStatus.REJECTED,
        reviewedBy,
        reviewedAt: new Date(),
        rejectionReason: rejectionReason || null,
      });

      return { data: { application: { ...application, status: 'rejected' } } };
    }
  }

  // ============================================================================
  // Store Management
  // ============================================================================

  async getMyStores(userId: string) {
    const stores = await this.repository.findStoresByUserId(userId);
    return { data: stores };
  }

  async getStoreDetail(storeId: string, userId: string) {
    const member = await this.repository.findMemberByStoreAndUser(storeId, userId);
    if (!member) {
      throw new Error('STORE_MEMBER_NOT_FOUND');
    }

    const store = await this.repository.findStoreById(storeId);
    if (!store) {
      throw new Error('STORE_NOT_FOUND');
    }

    const members = await this.repository.findMembersByStoreId(storeId);
    const { total: listingCount } = await this.repository.findListingsByStoreId(storeId, { limit: 1 });

    return {
      data: {
        ...store,
        memberCount: members.length,
        listingCount,
        myRole: member.role,
      },
    };
  }

  async getAllStores(query: {
    page?: number;
    limit?: number;
    status?: string;
    region?: string;
  }) {
    const { stores, total } = await this.repository.findAllStores(query);
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const totalPages = Math.ceil(total / limit);

    return {
      data: stores,
      meta: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
    };
  }

  async getAllApplications(query: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const { applications, total } = await this.repository.findAllApplications(query);
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const totalPages = Math.ceil(total / limit);

    return {
      data: applications,
      meta: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
    };
  }

  async updateStoreStatus(storeId: string, status: string) {
    const store = await this.repository.findStoreById(storeId);
    if (!store) {
      throw new Error('STORE_NOT_FOUND');
    }

    const validStatuses = Object.values(CosmeticsStoreStatus);
    if (!validStatuses.includes(status as CosmeticsStoreStatus)) {
      throw new Error('INVALID_STATUS');
    }

    await this.repository.updateStoreStatus(storeId, status);
    return { data: { id: storeId, status } };
  }

  // ============================================================================
  // Listing Management
  // ============================================================================

  async addListing(storeId: string, dto: {
    productId: string;
    priceOverride?: number;
    isVisible?: boolean;
    sortOrder?: number;
  }, userId: string) {
    // Verify membership
    const member = await this.repository.findMemberByStoreAndUser(storeId, userId);
    if (!member) {
      throw new Error('STORE_MEMBER_NOT_FOUND');
    }

    // Verify product exists
    const productRepo = this.dataSource.getRepository(CosmeticsProduct);
    const product = await productRepo.findOne({ where: { id: dto.productId } });
    if (!product) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    // Check duplicate
    const existing = await this.repository.findListingByStoreAndProduct(storeId, dto.productId);
    if (existing) {
      throw new Error('LISTING_ALREADY_EXISTS');
    }

    const listing = await this.repository.createListing({
      storeId,
      productId: dto.productId,
      priceOverride: dto.priceOverride,
      isVisible: dto.isVisible !== undefined ? dto.isVisible : true,
      sortOrder: dto.sortOrder || 0,
    });

    return { data: listing };
  }

  async updateListing(storeId: string, listingId: string, dto: {
    priceOverride?: number | null;
    isVisible?: boolean;
    sortOrder?: number;
  }, userId: string) {
    const member = await this.repository.findMemberByStoreAndUser(storeId, userId);
    if (!member) {
      throw new Error('STORE_MEMBER_NOT_FOUND');
    }

    const listing = await this.repository.findListingByIdAndStore(listingId, storeId);
    if (!listing) {
      throw new Error('LISTING_NOT_FOUND');
    }

    const updateData: Record<string, any> = {};
    if (dto.priceOverride !== undefined) updateData.priceOverride = dto.priceOverride;
    if (dto.isVisible !== undefined) updateData.isVisible = dto.isVisible;
    if (dto.sortOrder !== undefined) updateData.sortOrder = dto.sortOrder;

    await this.repository.updateListing(listingId, updateData);
    return { data: { id: listingId, ...updateData } };
  }

  async getStoreListings(storeId: string, query: {
    page?: number;
    limit?: number;
  }, userId: string) {
    const member = await this.repository.findMemberByStoreAndUser(storeId, userId);
    if (!member) {
      throw new Error('STORE_MEMBER_NOT_FOUND');
    }

    const { listings, total } = await this.repository.findListingsByStoreId(storeId, query);
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const totalPages = Math.ceil(total / limit);

    return {
      data: listings,
      meta: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
    };
  }

  // ============================================================================
  // Member Management
  // ============================================================================

  async addMember(storeId: string, dto: {
    userId: string;
    role: string;
  }, requestingUserId: string) {
    // Verify requesting user is owner
    const requestingMember = await this.repository.findMemberByStoreAndUser(storeId, requestingUserId);
    if (!requestingMember || requestingMember.role !== CosmeticsStoreMemberRole.OWNER) {
      throw new Error('STORE_OWNER_REQUIRED');
    }

    const validRoles = Object.values(CosmeticsStoreMemberRole);
    if (!validRoles.includes(dto.role as CosmeticsStoreMemberRole)) {
      throw new Error('INVALID_ROLE');
    }

    // Check if member exists (including deactivated) — reactivate if inactive
    const existing = await this.repository.findMemberByStoreAndUserIncludingInactive(storeId, dto.userId);
    if (existing) {
      if (existing.isActive) {
        throw new Error('MEMBER_ALREADY_EXISTS');
      }
      // Reactivate previously deactivated member
      await this.repository.reactivateMember(existing.id, dto.role as CosmeticsStoreMemberRole);
      return { data: { ...existing, role: dto.role, isActive: true, deactivatedAt: null, deactivatedBy: null } };
    }

    const member = await this.repository.createMember({
      storeId,
      userId: dto.userId,
      role: dto.role as CosmeticsStoreMemberRole,
    });

    return { data: member };
  }

  async removeMember(storeId: string, memberId: string, requestingUserId: string) {
    const requestingMember = await this.repository.findMemberByStoreAndUser(storeId, requestingUserId);
    if (!requestingMember || requestingMember.role !== CosmeticsStoreMemberRole.OWNER) {
      throw new Error('STORE_OWNER_REQUIRED');
    }

    const targetMember = await this.repository.findMemberById(memberId);
    if (!targetMember || targetMember.storeId !== storeId || !targetMember.isActive) {
      throw new Error('MEMBER_NOT_FOUND');
    }

    // Prevent removing sole owner
    if (targetMember.role === CosmeticsStoreMemberRole.OWNER) {
      const ownerCount = await this.repository.countOwnersByStoreId(storeId);
      if (ownerCount <= 1) {
        throw new Error('CANNOT_REMOVE_SOLE_OWNER');
      }
    }

    await this.repository.deactivateMember(memberId, requestingUserId);
    return { data: { id: memberId, deactivated: true } };
  }

  async getStoreMembers(storeId: string, userId: string) {
    const member = await this.repository.findMemberByStoreAndUser(storeId, userId);
    if (!member) {
      throw new Error('STORE_MEMBER_NOT_FOUND');
    }

    const members = await this.repository.findMembersByStoreId(storeId);
    return { data: members };
  }

  // ============================================================================
  // Admin: Member Management
  // ============================================================================

  async getAllMembers(includeInactive = false) {
    const members = await this.repository.findAllMembers(includeInactive);
    return {
      data: members.map((m) => ({
        id: m.id,
        storeId: m.storeId,
        storeName: m.store?.name || '-',
        userId: m.userId,
        role: m.role,
        isActive: m.isActive,
        deactivatedAt: m.deactivatedAt,
        deactivatedBy: m.deactivatedBy,
        createdAt: m.createdAt,
      })),
    };
  }

  async adminDeactivateMember(memberId: string, adminUserId: string) {
    const member = await this.repository.findMemberById(memberId);
    if (!member || !member.isActive) {
      throw new Error('MEMBER_NOT_FOUND');
    }

    // Prevent deactivating sole owner
    if (member.role === CosmeticsStoreMemberRole.OWNER) {
      const ownerCount = await this.repository.countOwnersByStoreId(member.storeId);
      if (ownerCount <= 1) {
        throw new Error('CANNOT_REMOVE_SOLE_OWNER');
      }
    }

    await this.repository.deactivateMember(memberId, adminUserId);
    return { data: { id: memberId, deactivated: true } };
  }

  async adminReactivateMember(memberId: string) {
    const member = await this.repository.findMemberById(memberId);
    if (!member) {
      throw new Error('MEMBER_NOT_FOUND');
    }
    if (member.isActive) {
      throw new Error('MEMBER_ALREADY_ACTIVE');
    }

    await this.repository.reactivateMember(memberId, member.role);
    return { data: { id: memberId, reactivated: true } };
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private generateStoreCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `CS-${timestamp}-${random}`;
  }

  // normalizeBusinessNumber imported from utils/business-number.ts
}
