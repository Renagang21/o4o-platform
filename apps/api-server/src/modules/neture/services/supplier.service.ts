import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import {
  NetureSupplier,
  SupplierStatus,
  ContactVisibility,
} from '../entities/index.js';
import type { NeturePartner } from '../../../routes/neture/entities/neture-partner.entity.js';
import { NeturePartnerStatus } from '../../../routes/neture/entities/neture-partner.entity.js';
import logger from '../../../utils/logger.js';
import { roleAssignmentService } from '../../auth/services/role-assignment.service.js';
import { ServiceMembership } from '../../auth/entities/ServiceMembership.js';
import { organizationOpsService } from '../../organization/services/organization-ops.service.js';

/**
 * NetureSupplierService
 *
 * All Supplier-related methods extracted from NetureService.
 * (WO-O4O-NETURE-SERVICE-SPLIT-V1)
 */
export class NetureSupplierService {
  // Lazy repositories
  private _supplierRepo?: Repository<NetureSupplier>;
  private _membershipRepo?: Repository<ServiceMembership>;

  private get supplierRepo(): Repository<NetureSupplier> {
    if (!this._supplierRepo) {
      this._supplierRepo = AppDataSource.getRepository(NetureSupplier);
    }
    return this._supplierRepo;
  }

  private get membershipRepo(): Repository<ServiceMembership> {
    if (!this._membershipRepo) {
      this._membershipRepo = AppDataSource.getRepository(ServiceMembership);
    }
    return this._membershipRepo;
  }

  // ==================== Supplier Identity ====================

  async getSupplierIdByUserId(userId: string): Promise<string | null> {
    try {
      const supplier = await this.supplierRepo.findOne({
        where: { userId },
        select: ['id'],
      });
      return supplier?.id || null;
    } catch (error) {
      logger.error('[NetureSupplierService] Error finding supplier by user ID:', error);
      return null;
    }
  }

  async getSupplierByUserId(userId: string): Promise<NetureSupplier | null> {
    try {
      return await this.supplierRepo.findOne({
        where: { userId },
        relations: ['offers'],
      });
    } catch (error) {
      logger.error('[NetureSupplierService] Error finding supplier by user ID:', error);
      return null;
    }
  }

  // ==================== Supplier Registration & Approval ====================

  async registerSupplier(
    userId: string,
    data: { name: string; slug: string; contactEmail?: string },
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    try {
      const name = data.name?.trim();
      if (!name) {
        return { success: false, error: 'MISSING_NAME' };
      }
      const slug = data.slug?.trim().toLowerCase();
      if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
        return { success: false, error: 'INVALID_SLUG' };
      }
      const existingByUser = await this.supplierRepo.findOne({ where: { userId }, select: ['id'] });
      if (existingByUser) {
        return { success: false, error: 'USER_ALREADY_HAS_SUPPLIER' };
      }
      const existingBySlug = await this.supplierRepo.findOne({ where: { slug }, select: ['id'] });
      if (existingBySlug) {
        return { success: false, error: 'SLUG_ALREADY_EXISTS' };
      }
      const supplier = this.supplierRepo.create({
        slug, userId,
        contactEmail: data.contactEmail || null,
        status: SupplierStatus.PENDING,
      });
      const saved = await this.supplierRepo.save(supplier);
      logger.info(`[NetureSupplierService] Supplier registered: ${saved.id} (PENDING) by user ${userId}`);

      // WO-O4O-NETURE-ORG-DATA-MODEL-V1: create org (isActive=false for PENDING)
      await this.syncSupplierOrganization(saved, { isActive: false, name });

      return {
        success: true,
        data: { id: saved.id, name, slug: saved.slug, status: saved.status, createdAt: saved.createdAt },
      };
    } catch (error) {
      logger.error('[NetureSupplierService] Error registering supplier:', error);
      throw error;
    }
  }

  async approveSupplier(
    supplierId: string,
    approvedByUserId: string,
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    try {
      const supplier = await this.supplierRepo.findOne({ where: { id: supplierId } });
      if (!supplier) return { success: false, error: 'SUPPLIER_NOT_FOUND' };
      if (supplier.status !== SupplierStatus.PENDING) return { success: false, error: 'INVALID_STATUS' };

      supplier.status = SupplierStatus.ACTIVE;
      supplier.approvedBy = approvedByUserId;
      supplier.approvedAt = new Date();
      await this.supplierRepo.save(supplier);

      if (supplier.userId) {
        const membership = await this.membershipRepo.findOne({
          where: { userId: supplier.userId, serviceKey: 'neture' },
        });
        if (membership && membership.status !== 'active') {
          membership.status = 'active';
          await this.membershipRepo.save(membership);
          logger.info(`[NetureSupplierService] Membership activated for user ${supplier.userId}`);
        }
        await roleAssignmentService.assignRole({
          userId: supplier.userId, role: 'neture:supplier', assignedBy: approvedByUserId,
        });
        logger.info(`[NetureSupplierService] Role neture:supplier assigned to user ${supplier.userId}`);
      }

      // WO-O4O-NETURE-ORG-DATA-MODEL-V1: ensure org exists + activate
      await this.syncSupplierOrganization(supplier, { isActive: true });
      await this.setOrgActive(supplier, true);

      // WO-O4O-NETURE-SUPPLIER-DEPRECATION-V1 Phase 5-B: read name from org
      const org = await this.getOrgData(supplier.organizationId);
      logger.info(`[NetureSupplierService] Supplier approved: ${supplierId} by ${approvedByUserId}`);
      return {
        success: true,
        data: { id: supplier.id, name: org?.name ?? '', status: supplier.status, approvedBy: supplier.approvedBy, approvedAt: supplier.approvedAt },
      };
    } catch (error) {
      logger.error('[NetureSupplierService] Error approving supplier:', error);
      throw error;
    }
  }

  async rejectSupplier(
    supplierId: string,
    rejectedByUserId: string,
    reason?: string,
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    try {
      const supplier = await this.supplierRepo.findOne({ where: { id: supplierId } });
      if (!supplier) return { success: false, error: 'SUPPLIER_NOT_FOUND' };
      if (supplier.status !== SupplierStatus.PENDING) return { success: false, error: 'INVALID_STATUS' };

      supplier.status = SupplierStatus.REJECTED;
      supplier.approvedBy = rejectedByUserId;
      supplier.approvedAt = new Date();
      supplier.rejectedReason = reason || null;
      await this.supplierRepo.save(supplier);

      if (supplier.userId) {
        const membership = await this.membershipRepo.findOne({
          where: { userId: supplier.userId, serviceKey: 'neture' },
        });
        if (membership) {
          membership.status = 'rejected';
          await this.membershipRepo.save(membership);
        }
        await roleAssignmentService.removeRole(supplier.userId, 'neture:supplier');
      }

      const org = await this.getOrgData(supplier.organizationId);
      logger.info(`[NetureSupplierService] Supplier rejected: ${supplierId} by ${rejectedByUserId}`);
      return {
        success: true,
        data: { id: supplier.id, name: org?.name ?? '', status: supplier.status, rejectedReason: supplier.rejectedReason },
      };
    } catch (error) {
      logger.error('[NetureSupplierService] Error rejecting supplier:', error);
      throw error;
    }
  }

  // ==================== Supplier Queries ====================

  async getPendingSuppliers(): Promise<Array<{ id: string; name: string; slug: string; contactEmail: string | null; userId: string; identityStatus: string | null; userEmail: string | null; createdAt: Date }>> {
    try {
      const suppliers = await this.supplierRepo.find({
        where: { status: SupplierStatus.PENDING },
        order: { createdAt: 'ASC' },
      });

      // WO-O4O-NETURE-SUPPLIER-DEPRECATION-V1 Phase 5-B: batch org read for name
      const orgIds = suppliers.map((s) => s.organizationId).filter(Boolean) as string[];
      const orgMap = await this.getOrgDataBatch(orgIds);

      const userIds = suppliers.map((s) => s.userId).filter(Boolean);
      const userStatusMap = new Map<string, { status: string; email: string }>();
      if (userIds.length > 0) {
        const rows: Array<{ id: string; status: string; email: string }> = await AppDataSource.query(
          `SELECT u.id, u.status, u.email FROM users u
           JOIN service_memberships sm ON sm.user_id = u.id AND sm.service_key = 'neture'
           WHERE u.id = ANY($1)`,
          [userIds],
        );
        for (const row of rows) {
          userStatusMap.set(row.id, { status: row.status, email: row.email });
        }
      }

      return suppliers.map((s) => {
        const org = s.organizationId ? orgMap.get(s.organizationId) : null;
        const userInfo = s.userId ? userStatusMap.get(s.userId) : null;
        return {
          id: s.id, name: org?.name ?? '', slug: s.slug,
          contactEmail: s.contactEmail || null,
          userId: s.userId,
          identityStatus: userInfo?.status || null,
          userEmail: userInfo?.email || null,
          createdAt: s.createdAt,
        };
      });
    } catch (error) {
      logger.error('[NetureSupplierService] Error fetching pending suppliers:', error);
      throw error;
    }
  }

  async deactivateSupplier(
    supplierId: string,
    adminUserId: string,
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    try {
      const supplier = await this.supplierRepo.findOne({ where: { id: supplierId } });
      if (!supplier) return { success: false, error: 'SUPPLIER_NOT_FOUND' };
      if (supplier.status !== SupplierStatus.ACTIVE) return { success: false, error: 'INVALID_STATUS' };

      supplier.status = SupplierStatus.INACTIVE;
      await this.supplierRepo.save(supplier);

      const revokeResult = await AppDataSource.query(
        `UPDATE product_approvals
         SET approval_status = 'revoked',
             decided_by = $2::uuid,
             decided_at = NOW(),
             reason = 'Supplier deactivated',
             updated_at = NOW()
         WHERE offer_id IN (
           SELECT id FROM supplier_product_offers WHERE supplier_id = $1
         )
         AND approval_status = 'approved'`,
        [supplierId, adminUserId],
      );
      const revokedCount = revokeResult?.[1] ?? 0;

      await AppDataSource.query(
        `UPDATE organization_product_listings
         SET is_active = false, updated_at = NOW()
         WHERE offer_id IN (
           SELECT id FROM supplier_product_offers WHERE supplier_id = $1
         )`,
        [supplierId],
      );

      if (supplier.userId) {
        const membership = await this.membershipRepo.findOne({
          where: { userId: supplier.userId, serviceKey: 'neture' },
        });
        if (membership) {
          membership.status = 'suspended';
          await this.membershipRepo.save(membership);
        }
        await roleAssignmentService.removeRole(supplier.userId, 'neture:supplier');
      }

      // WO-O4O-NETURE-ORG-DATA-MODEL-V1: deactivate org
      await this.setOrgActive(supplier, false);

      const org = await this.getOrgData(supplier.organizationId);
      logger.info(`[NetureSupplierService] Supplier deactivated: ${supplierId} by ${adminUserId} (revoked ${revokedCount} approvals, deactivated listings)`);
      return {
        success: true,
        data: { id: supplier.id, name: org?.name ?? '', status: supplier.status },
      };
    } catch (error) {
      logger.error('[NetureSupplierService] Error deactivating supplier:', error);
      throw error;
    }
  }

  async getAllSuppliers(
    filters?: { status?: SupplierStatus },
  ): Promise<Array<{ id: string; name: string; slug: string; status: SupplierStatus; contactEmail: string; userId: string; identityStatus: string | null; userEmail: string | null; createdAt: Date; updatedAt: Date }>> {
    try {
      const where: { status?: SupplierStatus } = {};
      if (filters?.status) where.status = filters.status;

      const suppliers = await this.supplierRepo.find({ where, order: { createdAt: 'DESC' } });

      // WO-O4O-NETURE-ORG-READ-PATH-SWITCH-V1: batch org read for name
      const orgIds = suppliers.map((s) => s.organizationId).filter(Boolean) as string[];
      const orgMap = await this.getOrgDataBatch(orgIds);

      const userIds = suppliers.map((s) => s.userId).filter(Boolean);
      const userStatusMap = new Map<string, { status: string; email: string }>();
      if (userIds.length > 0) {
        const rows: Array<{ id: string; status: string; email: string }> = await AppDataSource.query(
          `SELECT u.id, u.status, u.email FROM users u
           JOIN service_memberships sm ON sm.user_id = u.id AND sm.service_key = 'neture'
           WHERE u.id = ANY($1)`,
          [userIds],
        );
        for (const row of rows) {
          userStatusMap.set(row.id, { status: row.status, email: row.email });
        }
      }

      return suppliers.map((s) => {
        const org = s.organizationId ? orgMap.get(s.organizationId) : null;
        const userInfo = s.userId ? userStatusMap.get(s.userId) : null;
        return {
          id: s.id, name: org?.name ?? '', slug: s.slug, status: s.status,
          contactEmail: s.contactEmail || '',
          userId: s.userId,
          identityStatus: userInfo?.status || null,
          userEmail: userInfo?.email || null,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        };
      });
    } catch (error) {
      logger.error('[NetureSupplierService] Error fetching all suppliers:', error);
      throw error;
    }
  }

  // ==================== Public Supplier List & Detail ====================

  async getSuppliers(filters?: { category?: string; status?: SupplierStatus }) {
    try {
      const query = this.supplierRepo
        .createQueryBuilder('supplier')
        .leftJoinAndSelect('supplier.offers', 'products');
      if (filters?.category) {
        query.andWhere('supplier.category = :category', { category: filters.category });
      }
      if (filters?.status) {
        query.andWhere('supplier.status = :status', { status: filters.status });
      } else {
        query.andWhere('supplier.status = :status', { status: SupplierStatus.ACTIVE });
      }
      query.orderBy('supplier.createdAt', 'DESC');
      const suppliers = await query.getMany();

      // WO-O4O-NETURE-ORG-READ-PATH-SWITCH-V1: batch org read for name
      const orgIds = suppliers.map((s) => s.organizationId).filter(Boolean) as string[];
      const orgMap = await this.getOrgDataBatch(orgIds);

      const results = await Promise.all(
        suppliers.map(async (supplier) => {
          const org = supplier.organizationId ? orgMap.get(supplier.organizationId) : null;
          const trustSignals = await this.computeTrustSignals(supplier.id, supplier);
          return {
            id: supplier.id, slug: supplier.slug, name: org?.name ?? '',
            logo: supplier.logoUrl, category: supplier.category,
            shortDescription: supplier.shortDescription,
            productCount: supplier.offers?.length || 0,
            trustSignals,
          };
        })
      );
      return results;
    } catch (error) {
      logger.error('[NetureSupplierService] Error fetching suppliers:', error);
      throw error;
    }
  }

  async hasApprovedPartnership(supplierId: string, viewerId: string): Promise<boolean> {
    try {
      const [{ count }] = await AppDataSource.query(
        `SELECT COUNT(*)::int AS count FROM product_approvals pa
         JOIN supplier_product_offers spo ON spo.id = pa.offer_id
         WHERE spo.supplier_id = $1 AND pa.organization_id = $2
           AND pa.approval_type = 'private' AND pa.approval_status = 'approved'`,
        [supplierId, viewerId],
      );
      return count > 0;
    } catch (error) {
      logger.error('[NetureSupplierService] Error checking partnership:', error);
      return false;
    }
  }

  async getSupplierBySlug(slug: string, viewerId?: string | null) {
    try {
      const supplier = await this.supplierRepo.findOne({
        where: { slug, status: SupplierStatus.ACTIVE },
        relations: ['offers'],
      });
      if (!supplier) return null;

      // WO-O4O-NETURE-ORG-READ-PATH-SWITCH-V1: org-primary read for name
      const org = await this.getOrgData(supplier.organizationId);

      const isOwner = !!viewerId && supplier.userId === viewerId;
      const isPartner = !!viewerId && !isOwner
        ? await this.hasApprovedPartnership(supplier.id, viewerId)
        : false;
      const contact = this.filterContactInfo(supplier, viewerId || null, isPartner, isOwner);
      const contactHints = this.computeContactHints(supplier, isPartner, isOwner);
      const trustSignals = await this.computeTrustSignals(supplier.id, supplier);

      return {
        id: supplier.id, slug: supplier.slug, name: org?.name ?? '',
        logo: supplier.logoUrl, category: supplier.category,
        shortDescription: supplier.shortDescription,
        description: supplier.description,
        products: supplier.offers.map((p) => ({
          id: p.id, name: p.master?.marketingName || '',
          category: p.master?.brandName || '', description: '',
        })),
        pricingPolicy: supplier.pricingPolicy,
        moq: supplier.moq,
        shippingPolicy: {
          standard: supplier.shippingStandard,
          island: supplier.shippingIsland,
          mountain: supplier.shippingMountain,
        },
        contact, contactHints, trustSignals,
      };
    } catch (error) {
      logger.error('[NetureSupplierService] Error fetching supplier by slug:', error);
      throw error;
    }
  }

  // ==================== Supplier Profile ====================

  async getSupplierProfile(supplierId: string) {
    try {
      const supplier = await this.supplierRepo.findOne({ where: { id: supplierId } });
      if (!supplier) return null;

      // WO-O4O-NETURE-ORG-READ-PATH-SWITCH-V1: org-primary read for canonical fields
      const org = await this.getOrgData(supplier.organizationId);

      // WO-NETURE-SUPPLIER-BUSINESS-PROFILE-FORM-ALIGNMENT-V1: pre-fill from users.businessInfo
      let prefilled: Record<string, string | null> = {};
      const needsPrefill =
        supplier.userId &&
        !org?.business_number &&
        !supplier.representativeName &&
        !org?.address;

      if (needsPrefill) {
        try {
          const rows = await AppDataSource.query(
            `SELECT "businessInfo" FROM users WHERE id = $1 LIMIT 1`,
            [supplier.userId],
          );
          const bi = rows[0]?.businessInfo;
          if (bi && typeof bi === 'object') {
            prefilled = {
              businessNumber: bi.businessNumber || null,
              businessAddress: [bi.address, bi.address2].filter(Boolean).join(' ') || null,
              businessType: bi.businessType || null,
              taxEmail: bi.email || null,
            };
          }
        } catch (prefillError) {
          logger.warn('[NetureSupplierService] Pre-fill from businessInfo failed:', prefillError);
        }
      }

      // WO-O4O-POSTAL-CODE-ADDRESS-V1
      const addrDetail = org?.address_detail;

      return {
        id: supplier.id,
        name: org?.name ?? '',
        slug: supplier.slug,
        // Business profile — org-primary with supplier + prefill fallback
        businessNumber: org?.business_number ?? prefilled.businessNumber ?? null,
        representativeName: supplier.representativeName || null,
        businessZipCode: addrDetail?.zipCode ?? null,
        businessAddress: org?.address ?? prefilled.businessAddress ?? null,
        businessAddressDetail: addrDetail?.detailAddress ?? null,
        managerName: supplier.managerName || null,
        managerPhone: supplier.managerPhone || null,
        businessType: supplier.businessType || prefilled.businessType || null,
        taxEmail: supplier.taxEmail || prefilled.taxEmail || null,
        _prefilled: Object.keys(prefilled).length > 0,
        // Contact (existing — supplier remains SSOT for contact visibility)
        contactEmail: supplier.contactEmail || null,
        contactPhone: supplier.contactPhone || null,
        contactWebsite: supplier.contactWebsite || null,
        contactKakao: supplier.contactKakao || null,
        contactEmailVisibility: supplier.contactEmailVisibility,
        contactPhoneVisibility: supplier.contactPhoneVisibility,
        contactWebsiteVisibility: supplier.contactWebsiteVisibility,
        contactKakaoVisibility: supplier.contactKakaoVisibility,
      };
    } catch (error) {
      logger.error('[NetureSupplierService] Error fetching supplier profile:', error);
      throw error;
    }
  }

  async updateSupplierProfile(
    supplierId: string,
    data: {
      contactEmail?: string;
      contactPhone?: string;
      contactWebsite?: string;
      contactKakao?: string;
      contactEmailVisibility?: ContactVisibility;
      contactPhoneVisibility?: ContactVisibility;
      contactWebsiteVisibility?: ContactVisibility;
      contactKakaoVisibility?: ContactVisibility;
      // WO-NETURE-SUPPLIER-BUSINESS-PROFILE-FORM-ALIGNMENT-V1
      businessNumber?: string;
      representativeName?: string;
      businessAddress?: string;
      // WO-O4O-POSTAL-CODE-ADDRESS-V1
      businessZipCode?: string;
      businessAddressDetail?: string;
      managerName?: string;
      managerPhone?: string;
      businessType?: string;
      taxEmail?: string;
    },
  ) {
    try {
      const supplier = await this.supplierRepo.findOne({ where: { id: supplierId } });
      if (!supplier) return null;

      // Existing contact fields
      if (data.contactEmail !== undefined) supplier.contactEmail = data.contactEmail || '';
      if (data.contactPhone !== undefined) supplier.contactPhone = data.contactPhone ? data.contactPhone.replace(/\D/g, '') : '';
      if (data.contactWebsite !== undefined) supplier.contactWebsite = data.contactWebsite || '';
      if (data.contactKakao !== undefined) supplier.contactKakao = data.contactKakao || '';
      if (data.contactEmailVisibility !== undefined) supplier.contactEmailVisibility = data.contactEmailVisibility;
      if (data.contactPhoneVisibility !== undefined) supplier.contactPhoneVisibility = data.contactPhoneVisibility;
      if (data.contactWebsiteVisibility !== undefined) supplier.contactWebsiteVisibility = data.contactWebsiteVisibility;
      if (data.contactKakaoVisibility !== undefined) supplier.contactKakaoVisibility = data.contactKakaoVisibility;

      // Business profile fields (WO-NETURE-SUPPLIER-BUSINESS-PROFILE-FORM-ALIGNMENT-V1)
      // WO-O4O-NETURE-SUPPLIER-DEPRECATION-V1 Phase 5-B: businessNumber/businessAddress → org only
      if (data.representativeName !== undefined) supplier.representativeName = data.representativeName || null;
      if (data.managerName !== undefined) supplier.managerName = data.managerName || null;
      if (data.managerPhone !== undefined) supplier.managerPhone = data.managerPhone ? data.managerPhone.replace(/\D/g, '') : null;
      if (data.businessType !== undefined) supplier.businessType = data.businessType || null;
      if (data.taxEmail !== undefined) supplier.taxEmail = data.taxEmail || null;

      // WO-O4O-NETURE-SUPPLIER-DEPRECATION-V1 Phase 5-B: org-only write (no supplier reverse-sync)
      const orgWriteNeeded =
        data.businessNumber !== undefined ||
        data.businessAddress !== undefined ||
        data.businessZipCode !== undefined ||
        data.businessAddressDetail !== undefined ||
        data.contactPhone !== undefined;
      if (orgWriteNeeded && supplier.organizationId) {
        // WO-O4O-POSTAL-CODE-ADDRESS-V1: build address_detail JSONB
        let addressDetail: Record<string, string | null> | undefined;
        if (data.businessAddress !== undefined || data.businessZipCode !== undefined || data.businessAddressDetail !== undefined) {
          // Read existing address_detail to merge
          const orgRows = await AppDataSource.query(
            `SELECT address_detail FROM organizations WHERE id = $1`,
            [supplier.organizationId],
          );
          const existing = (orgRows[0]?.address_detail as Record<string, string | null>) || {};
          addressDetail = {
            zipCode: data.businessZipCode !== undefined ? (data.businessZipCode || null) : (existing.zipCode || null),
            baseAddress: data.businessAddress !== undefined ? (data.businessAddress || '') : (existing.baseAddress || ''),
            detailAddress: data.businessAddressDetail !== undefined ? (data.businessAddressDetail || null) : (existing.detailAddress || null),
          };
        }

        await this.writeOrgBusinessData(supplier.organizationId, {
          business_number: data.businessNumber !== undefined ? (data.businessNumber || null) : undefined,
          address: data.businessAddress !== undefined ? (data.businessAddress || null) : undefined,
          phone: data.contactPhone !== undefined ? (data.contactPhone ? data.contactPhone.replace(/\D/g, '') : null) : undefined,
          address_detail: addressDetail,
        });
      }

      await this.supplierRepo.save(supplier);

      // WO-O4O-NETURE-SUPPLIER-DEPRECATION-V1 Phase 5-B: read org for canonical fields
      const org = await this.getOrgData(supplier.organizationId);

      return {
        id: supplier.id,
        // Business profile — org SSOT
        businessNumber: org?.business_number ?? null,
        representativeName: supplier.representativeName || null,
        businessZipCode: org?.address_detail?.zipCode ?? null,
        businessAddress: org?.address ?? null,
        businessAddressDetail: org?.address_detail?.detailAddress ?? null,
        managerName: supplier.managerName || null,
        managerPhone: supplier.managerPhone || null,
        businessType: supplier.businessType || null,
        taxEmail: supplier.taxEmail || null,
        // Contact
        contactEmail: supplier.contactEmail || null,
        contactPhone: supplier.contactPhone || null,
        contactWebsite: supplier.contactWebsite || null,
        contactKakao: supplier.contactKakao || null,
        contactEmailVisibility: supplier.contactEmailVisibility,
        contactPhoneVisibility: supplier.contactPhoneVisibility,
        contactWebsiteVisibility: supplier.contactWebsiteVisibility,
        contactKakaoVisibility: supplier.contactKakaoVisibility,
      };
    } catch (error) {
      logger.error('[NetureSupplierService] Error updating supplier profile:', error);
      throw error;
    }
  }

  // ==================== Profile Completeness (WO-O4O-SUPPLIER-PROFILE-COMPLETENESS-V1) ====================

  /**
   * GET /supplier/profile/completeness
   * Internal-only profile completeness indicator
   *
   * 8 items checked:
   * 1. name - 상호명 등록
   * 2. description - 소개글 50자 이상
   * 3. logoUrl - 프로필 이미지
   * 4. contactEmail - 이메일 (public/partners)
   * 5. contactWebsite - 웹사이트 (public/partners)
   * 6. contactKakao - 카카오톡 (public/partners)
   * 7. hasApprovedPartners - 파트너 승인 1건+
   * 8. recentActivity - 최근 30일 활동
   *
   * Phone excluded (private allowed).
   */
  async computeProfileCompleteness(supplierId: string) {
    try {
      const supplier = await this.supplierRepo.findOne({ where: { id: supplierId } });
      if (!supplier) return null;

      // WO-O4O-NETURE-SUPPLIER-DEPRECATION-V1 Phase 5-B: read name from org
      const org = await this.getOrgData(supplier.organizationId);
      const missing: string[] = [];

      // 1. name (from org SSOT)
      const orgName = org?.name ?? '';
      if (!orgName || orgName.trim().length === 0) {
        missing.push('name');
      }

      // 2. description (50+ chars)
      if (!supplier.description || supplier.description.trim().length < 50) {
        missing.push('description');
      }

      // 3. logoUrl
      if (!supplier.logoUrl || supplier.logoUrl.trim().length === 0) {
        missing.push('logoUrl');
      }

      // 4. email (public or partners visibility + value exists)
      if (
        !supplier.contactEmail ||
        supplier.contactEmailVisibility === ContactVisibility.PRIVATE
      ) {
        missing.push('email');
      }

      // 5. website (public or partners visibility + value exists)
      if (
        !supplier.contactWebsite ||
        supplier.contactWebsiteVisibility === ContactVisibility.PRIVATE
      ) {
        missing.push('website');
      }

      // 6. kakao (public or partners visibility + value exists)
      if (
        !supplier.contactKakao ||
        supplier.contactKakaoVisibility === ContactVisibility.PRIVATE
      ) {
        missing.push('kakao');
      }

      // 7. hasApprovedPartners (1+ approved PRIVATE approval)
      // WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: v2 product_approvals
      const [{ count: pApprovedCount }] = await AppDataSource.query(
        `SELECT COUNT(*)::int AS count FROM product_approvals pa
         JOIN supplier_product_offers spo ON spo.id = pa.offer_id
         WHERE spo.supplier_id = $1 AND pa.approval_type = 'private' AND pa.approval_status = 'approved'`,
        [supplierId],
      );
      if (pApprovedCount === 0) {
        missing.push('partnerApproval');
      }

      // 8. recentActivity (30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const [{ count: pRecentCount }] = await AppDataSource.query(
        `SELECT COUNT(*)::int AS count FROM product_approvals pa
         JOIN supplier_product_offers spo ON spo.id = pa.offer_id
         WHERE spo.supplier_id = $1 AND pa.approval_type = 'private'
           AND pa.created_at >= $2`,
        [supplierId, thirtyDaysAgo],
      );
      if (pRecentCount === 0) {
        missing.push('recentActivity');
      }

      const total = 8;
      const completed = total - missing.length;

      return { total, completed, missing };
    } catch (error) {
      logger.error('[NetureSupplierService] Error computing profile completeness:', error);
      throw error;
    }
  }

  // ==================== Private Helpers ====================

  private async computeTrustSignals(supplierId: string, supplier: NetureSupplier) {
    const publicContacts = [
      supplier.contactEmail && supplier.contactEmailVisibility === ContactVisibility.PUBLIC,
      supplier.contactPhone && supplier.contactPhoneVisibility === ContactVisibility.PUBLIC,
      supplier.contactWebsite && supplier.contactWebsiteVisibility === ContactVisibility.PUBLIC,
      supplier.contactKakao && supplier.contactKakaoVisibility === ContactVisibility.PUBLIC,
    ].filter(Boolean).length;

    const [{ count: approvedCount }] = await AppDataSource.query(
      `SELECT COUNT(*)::int AS count FROM product_approvals pa
       JOIN supplier_product_offers spo ON spo.id = pa.offer_id
       WHERE spo.supplier_id = $1 AND pa.approval_type = 'private' AND pa.approval_status = 'approved'`,
      [supplierId],
    );

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const [{ count: recentCount }] = await AppDataSource.query(
      `SELECT COUNT(*)::int AS count FROM product_approvals pa
       JOIN supplier_product_offers spo ON spo.id = pa.offer_id
       WHERE spo.supplier_id = $1 AND pa.approval_type = 'private' AND pa.created_at >= $2`,
      [supplierId, thirtyDaysAgo],
    );

    return {
      contactCompleteness: publicContacts,
      hasApprovedPartners: approvedCount > 0,
      recentActivity: recentCount > 0,
    };
  }

  private filterContactInfo(
    supplier: NetureSupplier,
    viewerId: string | null,
    isPartner: boolean,
    isOwner: boolean,
  ) {
    const canView = (visibility: ContactVisibility): boolean => {
      if (isOwner) return true;
      if (!viewerId) return false;
      if (visibility === ContactVisibility.PUBLIC) return true;
      if (visibility === ContactVisibility.PARTNERS) return isPartner;
      return false;
    };
    return {
      email: canView(supplier.contactEmailVisibility) ? (supplier.contactEmail || null) : null,
      phone: canView(supplier.contactPhoneVisibility) ? (supplier.contactPhone || null) : null,
      website: canView(supplier.contactWebsiteVisibility) ? (supplier.contactWebsite || null) : null,
      kakao: canView(supplier.contactKakaoVisibility) ? (supplier.contactKakao || null) : null,
    };
  }

  // ==================== Organization Sync (WO-O4O-NETURE-ORG-DATA-MODEL-V1 Phase 2-B) ====================

  /**
   * Ensure an organizations record exists for this supplier.
   * Creates org + organization_members + enrollment as side-effects.
   * Idempotent: skips if already linked.
   *
   * WO-O4O-ORGANIZATION-SERVICE-CENTRALIZATION-V1: organizationOpsService 전환
   */
  private async syncSupplierOrganization(
    supplier: NetureSupplier,
    options?: { isActive?: boolean; name?: string },
  ): Promise<void> {
    const isActive = options?.isActive ?? (supplier.status === SupplierStatus.ACTIVE);
    const orgName = options?.name || supplier.slug;

    try {
      // 1. Ensure org exists
      if (!supplier.organizationId) {
        const orgCode = `neture-${supplier.slug}`;
        const result = await organizationOpsService.ensureOrganization({
          name: orgName,
          code: orgCode,
          type: 'supplier',
          metadata: { serviceKey: 'neture', netureSupplierSlug: supplier.slug },
          createdByUserId: supplier.userId || undefined,
          isActive,
        });

        // Link supplier → organization (domain-specific)
        await AppDataSource.query(
          `UPDATE neture_suppliers SET organization_id = $1 WHERE id = $2 AND organization_id IS NULL`,
          [result.id, supplier.id],
        );
        supplier.organizationId = result.id;
        logger.info(`[NetureSupplierService] Org linked: supplier=${supplier.id} → org=${result.id}`);
      }

      const orgId = supplier.organizationId;

      // 2. Ensure owner member
      if (supplier.userId) {
        await organizationOpsService.setOwner(orgId, supplier.userId);
      }

      // 3. Ensure service enrollment (only when active)
      if (isActive) {
        await organizationOpsService.enrollService({ organizationId: orgId, serviceCode: 'neture' });
      }
    } catch (error) {
      // Non-fatal: log and continue (org sync is a side-effect, must not break core flow)
      logger.warn(`[NetureSupplierService] Org sync failed for supplier ${supplier.id}:`, error);
    }
  }

  /**
   * WO-O4O-NETURE-SUPPLIER-DEPRECATION-V1 Phase 5-B:
   * Write business data to organizations (SSOT). Partial update — only provided fields.
   */
  private async writeOrgBusinessData(
    organizationId: string,
    data: {
      business_number?: string | null;
      address?: string | null;
      phone?: string | null;
      // WO-O4O-POSTAL-CODE-ADDRESS-V1
      address_detail?: Record<string, string | null> | null;
    },
  ): Promise<void> {
    try {
      const setClauses: string[] = [];
      const params: any[] = [];
      let idx = 1;

      if (data.business_number !== undefined) {
        setClauses.push(`business_number = $${idx++}`);
        params.push(data.business_number);
      }
      if (data.address !== undefined) {
        setClauses.push(`address = $${idx++}`);
        params.push(data.address);
      }
      if (data.phone !== undefined) {
        setClauses.push(`phone = $${idx++}`);
        params.push(data.phone);
      }
      // WO-O4O-POSTAL-CODE-ADDRESS-V1
      if (data.address_detail !== undefined) {
        setClauses.push(`address_detail = $${idx++}`);
        params.push(data.address_detail ? JSON.stringify(data.address_detail) : null);
      }

      if (setClauses.length === 0) return;

      setClauses.push(`"updatedAt" = NOW()`);
      params.push(organizationId);

      await AppDataSource.query(
        `UPDATE organizations SET ${setClauses.join(', ')} WHERE id = $${idx}`,
        params,
      );
    } catch (error) {
      logger.warn(`[NetureSupplierService] Org business write failed for org ${organizationId}:`, error);
    }
  }

  /**
   * Set organizations.isActive based on supplier status change.
   */
  private async setOrgActive(supplier: NetureSupplier, isActive: boolean): Promise<void> {
    if (!supplier.organizationId) return;

    try {
      await AppDataSource.query(
        `UPDATE organizations SET "isActive" = $1, "updatedAt" = NOW() WHERE id = $2`,
        [isActive, supplier.organizationId],
      );
    } catch (error) {
      logger.warn(`[NetureSupplierService] Org active sync failed for org ${supplier.organizationId}:`, error);
    }
  }

  // ==================== Organization Read Helpers (WO-O4O-NETURE-ORG-READ-PATH-SWITCH-V1) ====================

  /**
   * Fetch canonical business fields from organizations table.
   * Returns null if organizationId is null or query fails (supplier fallback).
   */
  private async getOrgData(organizationId: string | null): Promise<{
    name: string;
    business_number: string | null;
    address: string | null;
    phone: string | null;
    address_detail: Record<string, string | null> | null;
  } | null> {
    if (!organizationId) return null;

    try {
      const rows = await AppDataSource.query(
        `SELECT name, business_number, address, phone, address_detail FROM organizations WHERE id = $1 LIMIT 1`,
        [organizationId],
      );
      return rows[0] || null;
    } catch (error) {
      logger.warn(`[NetureSupplierService] Org data read failed for ${organizationId}:`, error);
      return null;
    }
  }

  /**
   * Batch fetch org data for a list of organization IDs.
   * Returns Map<orgId, orgData> for efficient list rendering.
   */
  private async getOrgDataBatch(organizationIds: string[]): Promise<Map<string, {
    name: string;
    business_number: string | null;
    address: string | null;
    phone: string | null;
  }>> {
    const map = new Map<string, { name: string; business_number: string | null; address: string | null; phone: string | null }>();
    if (organizationIds.length === 0) return map;

    try {
      const rows: Array<{ id: string; name: string; business_number: string | null; address: string | null; phone: string | null }> =
        await AppDataSource.query(
          `SELECT id, name, business_number, address, phone FROM organizations WHERE id = ANY($1)`,
          [organizationIds],
        );
      for (const row of rows) {
        map.set(row.id, { name: row.name, business_number: row.business_number, address: row.address, phone: row.phone });
      }
    } catch (error) {
      logger.warn('[NetureSupplierService] Org batch read failed:', error);
    }
    return map;
  }

  private computeContactHints(
    supplier: NetureSupplier,
    isPartner: boolean,
    isOwner: boolean,
  ) {
    type ContactHint = 'available' | 'partner_exclusive' | 'not_registered' | 'private' | 'partners_only';
    const getHint = (value: string | null | undefined, visibility: ContactVisibility): ContactHint => {
      if (isOwner) return value ? 'available' : 'not_registered';
      if (!value) return 'not_registered';
      if (visibility === ContactVisibility.PUBLIC) return 'available';
      if (visibility === ContactVisibility.PARTNERS) return isPartner ? 'partner_exclusive' : 'partners_only';
      return 'private';
    };
    return {
      email: getHint(supplier.contactEmail, supplier.contactEmailVisibility),
      phone: getHint(supplier.contactPhone, supplier.contactPhoneVisibility),
      website: getHint(supplier.contactWebsite, supplier.contactWebsiteVisibility),
      kakao: getHint(supplier.contactKakao, supplier.contactKakaoVisibility),
    };
  }
}
