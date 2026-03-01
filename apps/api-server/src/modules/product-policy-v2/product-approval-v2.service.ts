/**
 * Product Approval v2 Service
 *
 * WO-PRODUCT-POLICY-V2-SERVICE-LAYER-INTRODUCTION-V1
 * WO-O4O-PRODUCT-MASTER-CORE-RESET-V1: offer_id 기준 구조 반영
 *
 * v2 승인/Listing 생성 로직을 기존 구조와 완전히 분리하여 병행 구현.
 */

import { DataSource } from 'typeorm';
import {
  ProductApproval,
  ProductApprovalType,
  ProductApprovalStatus,
} from '../../entities/ProductApproval.js';
import { OrganizationProductListing } from '../../routes/kpa/entities/organization-product-listing.entity.js';
import {
  SupplierProductOffer,
  OfferDistributionType,
} from '../neture/entities/SupplierProductOffer.entity.js';

export class ProductApprovalV2Service {
  constructor(private dataSource: DataSource) {}

  // ========================================================================
  // 1. createServiceApproval — SERVICE 분배 Offer 승인 요청 생성
  // ========================================================================

  async createServiceApproval(
    offerId: string,
    organizationId: string,
    serviceKey: string,
    requestedBy: string,
  ): Promise<{ success: boolean; data?: ProductApproval; error?: string }> {
    const offerRepo = this.dataSource.getRepository(SupplierProductOffer);
    const approvalRepo = this.dataSource.getRepository(ProductApproval);

    // 1. Offer 조회 + distributionType 검증
    const offer = await offerRepo.findOne({ where: { id: offerId } });
    if (!offer) {
      return { success: false, error: 'PRODUCT_NOT_FOUND' };
    }
    if (offer.distributionType !== OfferDistributionType.SERVICE) {
      return { success: false, error: 'INVALID_DISTRIBUTION_TYPE' };
    }
    if (!offer.isActive) {
      return { success: false, error: 'PRODUCT_INACTIVE' };
    }

    // 2. Supplier ACTIVE 검증
    const supplierCheck = await this.dataSource.query(
      `SELECT ns.status
       FROM supplier_product_offers spo
       JOIN neture_suppliers ns ON ns.id = spo.supplier_id
       WHERE spo.id = $1::uuid`,
      [offerId],
    );
    if (supplierCheck.length === 0 || supplierCheck[0].status !== 'ACTIVE') {
      return { success: false, error: 'SUPPLIER_NOT_ACTIVE' };
    }

    // 3. 중복 검사 + 재신청 처리
    const existing = await approvalRepo.findOne({
      where: {
        offer_id: offerId,
        organization_id: organizationId,
        approval_type: ProductApprovalType.SERVICE,
      },
    });
    if (existing) {
      if (existing.approval_status === ProductApprovalStatus.PENDING) {
        return { success: false, error: 'APPROVAL_ALREADY_PENDING' };
      }
      if (existing.approval_status === ProductApprovalStatus.APPROVED) {
        return { success: false, error: 'APPROVAL_ALREADY_APPROVED' };
      }
      // REJECTED / REVOKED → 재신청
      existing.approval_status = ProductApprovalStatus.PENDING;
      existing.requested_by = requestedBy;
      existing.decided_by = null;
      existing.decided_at = null;
      existing.reason = null;
      const saved = await approvalRepo.save(existing);
      return { success: true, data: saved };
    }

    // 4. 신규 승인 요청 생성
    const approval = approvalRepo.create({
      offer_id: offerId,
      organization_id: organizationId,
      service_key: serviceKey,
      approval_type: ProductApprovalType.SERVICE,
      approval_status: ProductApprovalStatus.PENDING,
      requested_by: requestedBy,
    });
    const saved = await approvalRepo.save(approval);

    return { success: true, data: saved };
  }

  // ========================================================================
  // 2. approveServiceProduct — SERVICE 승인 처리 + Listing 생성
  // ========================================================================

  async approveServiceProduct(
    approvalId: string,
    approvedBy: string,
  ): Promise<{
    success: boolean;
    data?: { approval: ProductApproval; listing: OrganizationProductListing };
    error?: string;
  }> {
    return this.dataSource.transaction(async (manager) => {
      const txApprovalRepo = manager.getRepository(ProductApproval);
      const txListingRepo = manager.getRepository(OrganizationProductListing);
      const txOfferRepo = manager.getRepository(SupplierProductOffer);

      // 1. Approval 조회 (PENDING + SERVICE)
      const approval = await txApprovalRepo.findOne({
        where: {
          id: approvalId,
          approval_status: ProductApprovalStatus.PENDING,
          approval_type: ProductApprovalType.SERVICE,
        },
      });
      if (!approval) {
        return { success: false, error: 'APPROVAL_NOT_FOUND_OR_NOT_PENDING' };
      }

      // 2. Offer 정보 조회
      const offer = await txOfferRepo.findOne({
        where: { id: approval.offer_id! },
      });
      if (!offer) {
        return { success: false, error: 'PRODUCT_NOT_FOUND' };
      }

      // 3. Supplier ACTIVE 재검증
      const supplierCheck = await manager.query(
        `SELECT ns.status
         FROM supplier_product_offers spo
         JOIN neture_suppliers ns ON ns.id = spo.supplier_id
         WHERE spo.id = $1::uuid`,
        [approval.offer_id],
      );
      if (supplierCheck.length === 0 || supplierCheck[0].status !== 'ACTIVE') {
        return { success: false, error: 'SUPPLIER_NOT_ACTIVE' };
      }

      // 4. 상태 전이: PENDING → APPROVED
      approval.approval_status = ProductApprovalStatus.APPROVED;
      approval.decided_by = approvedBy;
      approval.decided_at = new Date();
      await txApprovalRepo.save(approval);

      // 5. Listing 생성 (중복 방지)
      const existingListing = await txListingRepo.findOne({
        where: {
          organization_id: approval.organization_id,
          offer_id: approval.offer_id!,
          service_key: approval.service_key,
        },
      });

      let listing = existingListing;
      if (!existingListing) {
        try {
          listing = txListingRepo.create({
            organization_id: approval.organization_id,
            service_key: approval.service_key,
            master_id: offer.masterId,
            offer_id: offer.id,
            is_active: false,
          });
          listing = await txListingRepo.save(listing);
        } catch (err: any) {
          if (err.code === '23505' || err.driverError?.code === '23505') {
            listing = await txListingRepo.findOne({
              where: {
                organization_id: approval.organization_id,
                offer_id: approval.offer_id!,
                service_key: approval.service_key,
              },
            });
          } else {
            throw err;
          }
        }
      }

      return { success: true, data: { approval, listing: listing! } };
    });
  }

  // ========================================================================
  // 3. createPrivateApproval — PRIVATE 분배 Offer 승인 요청 생성
  // ========================================================================

  async createPrivateApproval(
    offerId: string,
    sellerOrgId: string,
    serviceKey: string,
  ): Promise<{ success: boolean; data?: ProductApproval; error?: string }> {
    const offerRepo = this.dataSource.getRepository(SupplierProductOffer);
    const offer = await offerRepo.findOne({ where: { id: offerId } });
    if (!offer) {
      return { success: false, error: 'PRODUCT_NOT_FOUND' };
    }
    if (offer.distributionType !== OfferDistributionType.PRIVATE) {
      return { success: false, error: 'INVALID_DISTRIBUTION_TYPE' };
    }
    if (!offer.isActive) {
      return { success: false, error: 'PRODUCT_INACTIVE' };
    }

    // allowedSellerIds에 포함 검증
    if (
      !offer.allowedSellerIds ||
      !offer.allowedSellerIds.includes(sellerOrgId)
    ) {
      return { success: false, error: 'SELLER_NOT_IN_ALLOWED_LIST' };
    }

    return this.dataSource.transaction(async (manager) => {
      const txApprovalRepo = manager.getRepository(ProductApproval);

      const existing = await txApprovalRepo.findOne({
        where: {
          offer_id: offerId,
          organization_id: sellerOrgId,
          approval_type: ProductApprovalType.PRIVATE,
        },
      });
      if (existing) {
        return { success: false, error: 'APPROVAL_ALREADY_EXISTS' };
      }

      try {
        const approval = txApprovalRepo.create({
          offer_id: offerId,
          organization_id: sellerOrgId,
          service_key: serviceKey,
          approval_type: ProductApprovalType.PRIVATE,
          approval_status: ProductApprovalStatus.PENDING,
        });
        const saved = await txApprovalRepo.save(approval);
        return { success: true, data: saved };
      } catch (err: any) {
        if (err.code === '23505' || err.driverError?.code === '23505') {
          return { success: false, error: 'APPROVAL_ALREADY_EXISTS' };
        }
        throw err;
      }
    });
  }

  // ========================================================================
  // 4. approvePrivateProduct — PRIVATE 승인 처리 + Listing 생성
  // ========================================================================

  async approvePrivateProduct(
    approvalId: string,
    approvedBy: string,
  ): Promise<{
    success: boolean;
    data?: { approval: ProductApproval; listing: OrganizationProductListing };
    error?: string;
  }> {
    return this.dataSource.transaction(async (manager) => {
      const txApprovalRepo = manager.getRepository(ProductApproval);
      const txListingRepo = manager.getRepository(OrganizationProductListing);
      const txOfferRepo = manager.getRepository(SupplierProductOffer);

      const approval = await txApprovalRepo.findOne({
        where: {
          id: approvalId,
          approval_status: ProductApprovalStatus.PENDING,
          approval_type: ProductApprovalType.PRIVATE,
        },
      });
      if (!approval) {
        return { success: false, error: 'APPROVAL_NOT_FOUND_OR_NOT_PENDING' };
      }

      const offer = await txOfferRepo.findOne({
        where: { id: approval.offer_id! },
      });
      if (!offer) {
        return { success: false, error: 'PRODUCT_NOT_FOUND' };
      }

      approval.approval_status = ProductApprovalStatus.APPROVED;
      approval.decided_by = approvedBy;
      approval.decided_at = new Date();
      await txApprovalRepo.save(approval);

      const existingListing = await txListingRepo.findOne({
        where: {
          organization_id: approval.organization_id,
          offer_id: approval.offer_id!,
          service_key: approval.service_key,
        },
      });

      let listing = existingListing;
      if (!existingListing) {
        try {
          listing = txListingRepo.create({
            organization_id: approval.organization_id,
            service_key: approval.service_key,
            master_id: offer.masterId,
            offer_id: offer.id,
            is_active: false,
          });
          listing = await txListingRepo.save(listing);
        } catch (err: any) {
          if (err.code === '23505' || err.driverError?.code === '23505') {
            listing = await txListingRepo.findOne({
              where: {
                organization_id: approval.organization_id,
                offer_id: approval.offer_id!,
                service_key: approval.service_key,
              },
            });
          } else {
            throw err;
          }
        }
      }

      return { success: true, data: { approval, listing: listing! } };
    });
  }

  // ========================================================================
  // 5. rejectServiceApproval — SERVICE 승인 거절
  // ========================================================================

  async rejectServiceApproval(
    approvalId: string,
    rejectedBy: string,
    reason?: string,
  ): Promise<{ success: boolean; data?: ProductApproval; error?: string }> {
    const approvalRepo = this.dataSource.getRepository(ProductApproval);

    const approval = await approvalRepo.findOne({
      where: {
        id: approvalId,
        approval_status: ProductApprovalStatus.PENDING,
        approval_type: ProductApprovalType.SERVICE,
      },
    });
    if (!approval) {
      return { success: false, error: 'APPROVAL_NOT_FOUND_OR_NOT_PENDING' };
    }

    approval.approval_status = ProductApprovalStatus.REJECTED;
    approval.decided_by = rejectedBy;
    approval.decided_at = new Date();
    if (reason) {
      approval.reason = reason;
    }
    const saved = await approvalRepo.save(approval);

    return { success: true, data: saved };
  }

  // ========================================================================
  // 6. revokeServiceApproval — SERVICE 승인 철회 (APPROVED → REVOKED)
  // ========================================================================

  async revokeServiceApproval(
    approvalId: string,
    revokedBy: string,
    reason?: string,
  ): Promise<{ success: boolean; data?: ProductApproval; error?: string }> {
    return this.dataSource.transaction(async (manager) => {
      const txApprovalRepo = manager.getRepository(ProductApproval);

      const approval = await txApprovalRepo.findOne({
        where: {
          id: approvalId,
          approval_status: ProductApprovalStatus.APPROVED,
          approval_type: ProductApprovalType.SERVICE,
        },
      });
      if (!approval) {
        return { success: false, error: 'APPROVAL_NOT_FOUND_OR_NOT_APPROVED' };
      }

      approval.approval_status = ProductApprovalStatus.REVOKED;
      approval.decided_by = revokedBy;
      approval.decided_at = new Date();
      if (reason) {
        approval.reason = reason;
      }
      await txApprovalRepo.save(approval);

      await manager.query(
        `UPDATE organization_product_listings
         SET is_active = false, updated_at = NOW()
         WHERE organization_id = $1 AND offer_id = $2 AND service_key = $3`,
        [approval.organization_id, approval.offer_id, approval.service_key],
      );

      return { success: true, data: approval };
    });
  }

  // ========================================================================
  // 7. createPublicListing — PUBLIC 분배 Offer 즉시 Listing 생성 (승인 불필요)
  // ========================================================================

  async createPublicListing(
    offerId: string,
    organizationId: string,
    serviceKey: string,
  ): Promise<{
    success: boolean;
    data?: OrganizationProductListing;
    error?: string;
  }> {
    const offerRepo = this.dataSource.getRepository(SupplierProductOffer);
    const offer = await offerRepo.findOne({ where: { id: offerId } });
    if (!offer) {
      return { success: false, error: 'PRODUCT_NOT_FOUND' };
    }
    if (offer.distributionType !== OfferDistributionType.PUBLIC) {
      return { success: false, error: 'INVALID_DISTRIBUTION_TYPE' };
    }
    if (!offer.isActive) {
      return { success: false, error: 'PRODUCT_INACTIVE' };
    }

    // Supplier ACTIVE 검증
    const supplierCheck = await this.dataSource.query(
      `SELECT ns.status
       FROM supplier_product_offers spo
       JOIN neture_suppliers ns ON ns.id = spo.supplier_id
       WHERE spo.id = $1::uuid`,
      [offerId],
    );
    if (supplierCheck.length === 0 || supplierCheck[0].status !== 'ACTIVE') {
      return { success: false, error: 'SUPPLIER_NOT_ACTIVE' };
    }

    return this.dataSource.transaction(async (manager) => {
      const txListingRepo = manager.getRepository(OrganizationProductListing);

      const existingListing = await txListingRepo.findOne({
        where: {
          organization_id: organizationId,
          offer_id: offerId,
          service_key: serviceKey,
        },
      });
      if (existingListing) {
        return { success: true, data: existingListing };
      }

      try {
        const listing = txListingRepo.create({
          organization_id: organizationId,
          service_key: serviceKey,
          master_id: offer.masterId,
          offer_id: offer.id,
          is_active: false,
        });
        const saved = await txListingRepo.save(listing);
        return { success: true, data: saved };
      } catch (err: any) {
        if (err.code === '23505' || err.driverError?.code === '23505') {
          const existing = await txListingRepo.findOne({
            where: {
              organization_id: organizationId,
              offer_id: offerId,
              service_key: serviceKey,
            },
          });
          if (existing) {
            return { success: true, data: existing };
          }
        }
        throw err;
      }
    });
  }
}
