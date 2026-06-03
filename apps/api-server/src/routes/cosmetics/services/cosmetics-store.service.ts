/**
 * Cosmetics Store Service
 *
 * WO-KCOS-STORES-PHASE1-V1: K-Cosmetics Store Core
 * Business logic for store management
 */

import { DataSource, QueryRunner } from 'typeorm';
import { normalizeBusinessNumber } from '../../../utils/business-number.js';
import { StoreSlugService } from '@o4o/platform-core/store-identity';
import { CosmeticsStoreRepository } from '../repositories/cosmetics-store.repository.js';
import {
  CosmeticsStoreStatus,
  CosmeticsStoreApplicationStatus,
  CosmeticsStoreMemberRole,
} from '../entities/index.js';
import { CosmeticsProduct } from '../entities/index.js';
import { organizationOpsService } from '../../../modules/organization/services/organization-ops.service.js';
import { RoleAssignmentService } from '../../../modules/auth/services/role-assignment.service.js';

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

        // WO-O4O-KCOSMETICS-SELLER-STORE-OWNER-WRITEPATH-FIX-V1:
        //   store/org/member/enrollment 생성은 canonical provisioning 헬퍼로 공유한다.
        //   (판매자 승인 자동 provision: ensureStoreContextForOwner 와 동일 경로 — createStoreWithOrg.)
        const savedStore = await this.createStoreWithOrg(queryRunner, {
          applicantUserId: application.applicantUserId,
          storeName: application.storeName,
          businessNumber: application.businessNumber,
          ownerName: application.ownerName,
          contactPhone: application.contactPhone,
          address: application.address,
          region: application.region,
          requestedSlug: application.requestedSlug,
        });

        await queryRunner.commitTransaction();

        // WO-O4O-STORE-OWNER-ROLE-BASED-ACCESS-UNIFICATION-V1: cosmetics:store_owner 역할 부여 (트랜잭션 후)
        await this.ensureStoreOwnerRole(application.applicantUserId, reviewedBy);

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
  // Store Provisioning (canonical)
  // WO-O4O-KCOSMETICS-SELLER-STORE-OWNER-WRITEPATH-FIX-V1
  // ============================================================================

  /**
   * store + organization + members + service enrollment 를 트랜잭션 내에서 생성한다.
   * reviewApplication(매장 신청 승인)과 ensureStoreContextForOwner(판매자 승인 자동 provision)가
   * 공유하는 canonical provisioning 로직. organization 은 사업자번호 기준 재사용(멱등).
   */
  private async createStoreWithOrg(
    queryRunner: QueryRunner,
    input: {
      applicantUserId: string;
      storeName: string;
      businessNumber: string;
      ownerName: string;
      contactPhone?: string | null;
      address?: string | null;
      region?: string | null;
      requestedSlug?: string | null;
    },
  ) {
    const storeCode = this.generateStoreCode();

    // WO-CORE-STORE-SLUG-INTEGRATION-V1: Core StoreSlugService with manager
    const slugService = new StoreSlugService(queryRunner.manager);

    // WO-CORE-STORE-REQUESTED-SLUG-V1: Use requestedSlug if available
    let slug: string;
    if (input.requestedSlug) {
      const availability = await slugService.checkAvailability(input.requestedSlug);
      if (!availability.available) {
        throw new Error(`Requested slug '${input.requestedSlug}' is no longer available: ${availability.reason}`);
      }
      slug = input.requestedSlug;
    } else {
      slug = await slugService.generateUniqueSlug(input.storeName);
    }

    // WO-O4O-COSMETICS-ORG-REUSE-AND-ENROLLMENT-V1:
    //   같은 사업자번호로 이미 등록된 organization 이 있으면 재사용한다.
    let orgId: string;
    const existingOrgRows = await queryRunner.query(
      `SELECT id FROM organizations WHERE business_number = $1 LIMIT 1`,
      [input.businessNumber],
    );
    if (existingOrgRows.length > 0) {
      orgId = existingOrgRows[0].id;
    } else {
      orgId = crypto.randomUUID();
      await queryRunner.query(`
        INSERT INTO organizations (id, name, code, type, level, path, "isActive",
          address, phone, business_number, metadata, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, 'store', 0, $4, true, $5, $6, $7, $8, NOW(), NOW())
      `, [
        orgId,
        input.storeName,
        storeCode,
        '/' + storeCode,
        input.address || null,
        input.contactPhone || null,
        input.businessNumber,
        JSON.stringify({ serviceKey: 'cosmetics' }),
      ]);
    }

    const store = queryRunner.manager.create('CosmeticsStore', {
      name: input.storeName,
      code: storeCode,
      slug,
      businessNumber: input.businessNumber,
      ownerName: input.ownerName,
      contactPhone: input.contactPhone,
      address: input.address,
      region: input.region,
      status: CosmeticsStoreStatus.APPROVED,
      organization_id: orgId,
    });
    const savedStore = await queryRunner.manager.save('CosmeticsStore', store);

    // Register slug in platform-wide registry
    await slugService.reserveSlug({
      storeId: (savedStore as any).id,
      serviceKey: 'cosmetics',
      slug,
    });

    // Create owner member (cosmetics_store_members)
    const member = queryRunner.manager.create('CosmeticsStoreMember', {
      storeId: (savedStore as any).id,
      userId: input.applicantUserId,
      role: CosmeticsStoreMemberRole.OWNER,
    });
    await queryRunner.manager.save('CosmeticsStoreMember', member);

    // organization_members + organization_service_enrollments (멱등 helper)
    await organizationOpsService.addMember({
      organizationId: orgId,
      userId: input.applicantUserId,
      role: 'owner',
      isPrimary: false,
    }, queryRunner);
    await organizationOpsService.enrollService({
      organizationId: orgId,
      serviceCode: 'k-cosmetics',
    }, queryRunner);

    return savedStore;
  }

  /** cosmetics:store_owner 역할 부여 (멱등 — assignRole 은 기존 row 재활성화). 실패해도 흐름 비차단. */
  private async ensureStoreOwnerRole(userId: string, assignedBy: string | null) {
    try {
      const roleAssignmentService = new RoleAssignmentService();
      await roleAssignmentService.assignRole({
        userId,
        role: 'cosmetics:store_owner',
        assignedBy: assignedBy ?? undefined,
      });
    } catch (err) {
      console.error('[CosmeticsStoreService] Failed to assign cosmetics:store_owner role:', err);
    }
  }

  /**
   * 동일 사업자번호 store 가 이미 존재할 때, 사용자를 해당 store 의 owner 로 연결한다 (멱등).
   * (org member + enrollment + cosmetics:store_owner 역할까지 보강.)
   */
  private async linkOwnerToStore(storeId: string, userId: string, assignedBy: string | null) {
    const existing = await this.repository.findMemberByStoreAndUserIncludingInactive(storeId, userId);
    if (existing) {
      if (!existing.isActive || existing.role !== CosmeticsStoreMemberRole.OWNER) {
        await this.repository.reactivateMember(existing.id, CosmeticsStoreMemberRole.OWNER);
      }
    } else {
      await this.repository.createMember({
        storeId,
        userId,
        role: CosmeticsStoreMemberRole.OWNER,
      });
    }

    const rows = await this.dataSource.query(
      `SELECT organization_id FROM cosmetics.cosmetics_stores WHERE id = $1 LIMIT 1`,
      [storeId],
    );
    const orgId = rows[0]?.organization_id;
    if (orgId) {
      await organizationOpsService.addMember({
        organizationId: orgId,
        userId,
        role: 'owner',
        isPrimary: false,
      });
      await organizationOpsService.enrollService({
        organizationId: orgId,
        serviceCode: 'k-cosmetics',
      });
    }

    await this.ensureStoreOwnerRole(userId, assignedBy);
  }

  /**
   * 판매자(=매장 경영자) 승인 시 내 매장 context 를 자동 생성/보강한다 (멱등).
   * 별도 /cosmetics/stores/apply 승인 없이 store/org/member/enrollment + cosmetics:store_owner 준비.
   *   - 이미 매장 보유 → 역할만 보강
   *   - 동일 사업자번호 store 존재 → 해당 store 에 owner 로 연결
   *   - 그 외 → businessInfo 로부터 신규 store/org context 생성
   *   - businessNumber 부재 시 store 생성 불가(NOT NULL/UNIQUE) → 역할만 보강
   */
  async ensureStoreContextForOwner(
    userId: string,
    assignedBy: string | null,
  ): Promise<{ provisioned: boolean; reason: string; storeId?: string }> {
    // 0. 이미 매장 보유 → 멱등 종료
    const existingStores = await this.repository.findStoresByUserId(userId);
    if (existingStores.length > 0) {
      await this.ensureStoreOwnerRole(userId, assignedBy);
      return { provisioned: false, reason: 'ALREADY_HAS_STORE', storeId: existingStores[0].id };
    }

    // 1. businessInfo 로부터 store 입력 파생
    const userRows = await this.dataSource.query(
      `SELECT id, name, phone, "businessInfo" AS "businessInfo" FROM users WHERE id = $1 LIMIT 1`,
      [userId],
    );
    if (userRows.length === 0) {
      return { provisioned: false, reason: 'USER_NOT_FOUND' };
    }
    const u = userRows[0];
    const biz = (u.businessInfo as Record<string, any>) || {};
    const rawBN = biz.businessNumber;
    if (!rawBN) {
      // businessNumber 없으면 store 생성 불가 → 역할만 보강 (메뉴/가드는 통과, cockpit 은 no-store)
      await this.ensureStoreOwnerRole(userId, assignedBy);
      return { provisioned: false, reason: 'NO_BUSINESS_NUMBER' };
    }
    const businessNumber = normalizeBusinessNumber(rawBN);
    const storeName = biz.businessName || `${u.name || ''}`.trim() || '내 매장';
    const ownerName = biz.representativeName || u.name || storeName;
    const contactPhone = biz.managerPhone || u.phone || null;
    const address = biz.businessAddress || null;

    // 2. 동일 사업자번호 store 존재 → 연결 (멱등)
    const existingStore = await this.repository.findStoreByBusinessNumber(businessNumber);
    if (existingStore) {
      await this.linkOwnerToStore(existingStore.id, userId, assignedBy);
      return { provisioned: true, reason: 'LINKED_EXISTING_STORE', storeId: existingStore.id };
    }

    // 3. 신규 store/org context 생성
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const savedStore = await this.createStoreWithOrg(queryRunner, {
        applicantUserId: userId,
        storeName,
        businessNumber,
        ownerName,
        contactPhone,
        address,
      });
      await queryRunner.commitTransaction();
      await this.ensureStoreOwnerRole(userId, assignedBy);
      return { provisioned: true, reason: 'CREATED', storeId: (savedStore as any).id };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
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

    // WO-O4O-OPERATOR-BUSINESS-REGISTRATION-DISPLAY-ALIGNMENT-V1:
    //   각 application 의 applicantUserId 로 users.businessInfo 를 bulk 조회 후
    //   4 canonical 사업자등록증 필드 (업태/종목/사업자유형/개업일) 만 projection 하여
    //   응답에 businessInfo 객체로 부착. operator/admin Drawer 표시 용.
    const userIds = Array.from(new Set(applications.map((a) => a.applicantUserId).filter(Boolean)));
    const userBusinessMap = new Map<string, Record<string, string | null>>();
    if (userIds.length > 0) {
      const rows = await this.dataSource.query(
        `SELECT id, "businessInfo" FROM users WHERE id = ANY($1::uuid[])`,
        [userIds],
      );
      for (const row of rows as Array<{ id: string; businessInfo: Record<string, unknown> | null }>) {
        const bi = row.businessInfo;
        if (bi && typeof bi === 'object') {
          userBusinessMap.set(row.id, {
            businessType: (bi.businessType as string | undefined) ?? null,
            businessItem: (bi.businessItem as string | undefined) ?? null,
            businessEntityType: (bi.businessEntityType as string | undefined) ?? null,
            businessStartDate: (bi.businessStartDate as string | undefined) ?? null,
          });
        }
      }
    }

    const enriched = applications.map((app) => ({
      ...app,
      businessInfo: userBusinessMap.get(app.applicantUserId) ?? null,
    }));

    return {
      data: enriched,
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
