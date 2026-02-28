/**
 * Product Approval v2 Service
 *
 * WO-PRODUCT-POLICY-V2-SERVICE-LAYER-INTRODUCTION-V1
 *
 * v2 승인/Listing 생성 로직을 기존 구조와 완전히 분리하여 병행 구현.
 *
 * 격리 원칙:
 * - organization_product_applications 참조 ❌
 * - supplier_requests 참조 ❌
 * - external_product_id 제거 완료 (product_id만 사용)
 * - 기존 controller import ❌
 */

import { DataSource } from 'typeorm';
import {
  ProductApproval,
  ProductApprovalType,
  ProductApprovalStatus,
} from '../../entities/ProductApproval.js';
import { OrganizationProductListing } from '../../routes/kpa/entities/organization-product-listing.entity.js';
import {
  NetureSupplierProduct,
  DistributionType,
} from '../neture/entities/NetureSupplierProduct.entity.js';

export class ProductApprovalV2Service {
  constructor(private dataSource: DataSource) {}

  // ========================================================================
  // 1. createServiceApproval — SERVICE 분배 제품 승인 요청 생성
  // ========================================================================

  async createServiceApproval(
    productId: string,
    organizationId: string,
    serviceKey: string,
    requestedBy: string,
  ): Promise<{ success: boolean; data?: ProductApproval; error?: string }> {
    const productRepo = this.dataSource.getRepository(NetureSupplierProduct);
    const approvalRepo = this.dataSource.getRepository(ProductApproval);

    // 1. 제품 조회 + distributionType 검증
    const product = await productRepo.findOne({ where: { id: productId } });
    if (!product) {
      return { success: false, error: 'PRODUCT_NOT_FOUND' };
    }
    if (product.distributionType !== DistributionType.SERVICE) {
      return { success: false, error: 'INVALID_DISTRIBUTION_TYPE' };
    }
    if (!product.isActive) {
      return { success: false, error: 'PRODUCT_INACTIVE' };
    }

    // 2. Supplier ACTIVE 검증
    const supplierCheck = await this.dataSource.query(
      `SELECT ns.status
       FROM neture_supplier_products nsp
       JOIN neture_suppliers ns ON ns.id = nsp.supplier_id
       WHERE nsp.id = $1::uuid`,
      [productId],
    );
    if (supplierCheck.length === 0 || supplierCheck[0].status !== 'ACTIVE') {
      return { success: false, error: 'SUPPLIER_NOT_ACTIVE' };
    }

    // 3. 중복 검사 + 재신청 처리
    const existing = await approvalRepo.findOne({
      where: {
        product_id: productId,
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
      // REJECTED / REVOKED → 재신청 (기존 row 재사용, UNIQUE 충돌 방지)
      existing.approval_status = ProductApprovalStatus.PENDING;
      existing.requested_by = requestedBy;
      existing.decided_by = null;
      existing.decided_at = null;
      existing.reason = null;
      const saved = await approvalRepo.save(existing);
      return { success: true, data: saved };
    }

    // 4. 신규 승인 요청 생성 (Listing 생성 ❌)
    const approval = approvalRepo.create({
      product_id: productId,
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
      const txProductRepo = manager.getRepository(NetureSupplierProduct);

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

      // 2. 제품 정보 조회
      const product = await txProductRepo.findOne({
        where: { id: approval.product_id },
      });
      if (!product) {
        return { success: false, error: 'PRODUCT_NOT_FOUND' };
      }

      // 3. Supplier ACTIVE 재검증
      const supplierCheck = await manager.query(
        `SELECT ns.status
         FROM neture_supplier_products nsp
         JOIN neture_suppliers ns ON ns.id = nsp.supplier_id
         WHERE nsp.id = $1::uuid`,
        [approval.product_id],
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
          product_id: approval.product_id,
          service_key: approval.service_key,
        },
      });

      let listing = existingListing;
      if (!existingListing) {
        try {
          listing = txListingRepo.create({
            organization_id: approval.organization_id,
            service_key: approval.service_key,
            product_name: product.name,
            product_metadata: {},
            product_id: product.id,
            is_active: false, // 승인 후에도 비활성 (운영자가 수동 활성화)
            display_order: 0,
          });
          listing = await txListingRepo.save(listing);
        } catch (err: any) {
          if (err.code === '23505' || err.driverError?.code === '23505') {
            listing = await txListingRepo.findOne({
              where: {
                organization_id: approval.organization_id,
                product_id: approval.product_id,
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
  // 3. createPrivateApproval — PRIVATE 분배 제품 승인 요청 생성
  // ========================================================================

  async createPrivateApproval(
    productId: string,
    sellerOrgId: string,
    serviceKey: string,
  ): Promise<{ success: boolean; data?: ProductApproval; error?: string }> {
    // 1. 제품 조회 + distributionType 검증 (TX 외부 — early validation)
    const productRepo = this.dataSource.getRepository(NetureSupplierProduct);
    const product = await productRepo.findOne({ where: { id: productId } });
    if (!product) {
      return { success: false, error: 'PRODUCT_NOT_FOUND' };
    }
    if (product.distributionType !== DistributionType.PRIVATE) {
      return { success: false, error: 'INVALID_DISTRIBUTION_TYPE' };
    }
    if (!product.isActive) {
      return { success: false, error: 'PRODUCT_INACTIVE' };
    }

    // 2. allowedSellerIds에 포함 검증
    if (
      !product.allowedSellerIds ||
      !product.allowedSellerIds.includes(sellerOrgId)
    ) {
      return { success: false, error: 'SELLER_NOT_IN_ALLOWED_LIST' };
    }

    // 3. TX 내에서 중복 검사 + 승인 생성
    return this.dataSource.transaction(async (manager) => {
      const txApprovalRepo = manager.getRepository(ProductApproval);

      const existing = await txApprovalRepo.findOne({
        where: {
          product_id: productId,
          organization_id: sellerOrgId,
          approval_type: ProductApprovalType.PRIVATE,
        },
      });
      if (existing) {
        return { success: false, error: 'APPROVAL_ALREADY_EXISTS' };
      }

      try {
        const approval = txApprovalRepo.create({
          product_id: productId,
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
      const txProductRepo = manager.getRepository(NetureSupplierProduct);

      // 1. Approval 조회 (PENDING + PRIVATE)
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

      // 2. 제품 정보 조회
      const product = await txProductRepo.findOne({
        where: { id: approval.product_id },
      });
      if (!product) {
        return { success: false, error: 'PRODUCT_NOT_FOUND' };
      }

      // 3. 상태 전이: PENDING → APPROVED
      approval.approval_status = ProductApprovalStatus.APPROVED;
      approval.decided_by = approvedBy;
      approval.decided_at = new Date();
      await txApprovalRepo.save(approval);

      // 4. Target seller organization에 Listing 생성 (중복 방지)
      const existingListing = await txListingRepo.findOne({
        where: {
          organization_id: approval.organization_id,
          product_id: approval.product_id,
          service_key: approval.service_key,
        },
      });

      let listing = existingListing;
      if (!existingListing) {
        try {
          listing = txListingRepo.create({
            organization_id: approval.organization_id,
            service_key: approval.service_key,
            product_name: product.name,
            product_metadata: {},
            product_id: product.id,
            is_active: false,
            display_order: 0,
          });
          listing = await txListingRepo.save(listing);
        } catch (err: any) {
          if (err.code === '23505' || err.driverError?.code === '23505') {
            listing = await txListingRepo.findOne({
              where: {
                organization_id: approval.organization_id,
                product_id: approval.product_id,
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

    // 1. Approval 조회 (PENDING + SERVICE)
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

    // 2. 상태 전이: PENDING → REJECTED (Listing 생성 ❌)
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

      // 1. APPROVED + SERVICE만 revoke 가능
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

      // 2. 상태 전이: APPROVED → REVOKED
      approval.approval_status = ProductApprovalStatus.REVOKED;
      approval.decided_by = revokedBy;
      approval.decided_at = new Date();
      if (reason) {
        approval.reason = reason;
      }
      await txApprovalRepo.save(approval);

      // 3. 해당 listing is_active=false 강제
      await manager.query(
        `UPDATE organization_product_listings
         SET is_active = false, updated_at = NOW()
         WHERE organization_id = $1 AND product_id = $2 AND service_key = $3`,
        [approval.organization_id, approval.product_id, approval.service_key],
      );

      return { success: true, data: approval };
    });
  }

  // ========================================================================
  // 7. createPublicListing — PUBLIC 분배 제품 즉시 Listing 생성 (승인 불필요)
  // ========================================================================

  async createPublicListing(
    productId: string,
    organizationId: string,
    serviceKey: string,
  ): Promise<{
    success: boolean;
    data?: OrganizationProductListing;
    error?: string;
  }> {
    // 1. 제품 조회 + distributionType 검증 (TX 외부 — early validation)
    const productRepo = this.dataSource.getRepository(NetureSupplierProduct);
    const product = await productRepo.findOne({ where: { id: productId } });
    if (!product) {
      return { success: false, error: 'PRODUCT_NOT_FOUND' };
    }
    if (product.distributionType !== DistributionType.PUBLIC) {
      return { success: false, error: 'INVALID_DISTRIBUTION_TYPE' };
    }
    if (!product.isActive) {
      return { success: false, error: 'PRODUCT_INACTIVE' };
    }

    // 2. Supplier ACTIVE 검증 (TX 외부 — early validation)
    const supplierCheck = await this.dataSource.query(
      `SELECT ns.status
       FROM neture_supplier_products nsp
       JOIN neture_suppliers ns ON ns.id = nsp.supplier_id
       WHERE nsp.id = $1::uuid`,
      [productId],
    );
    if (supplierCheck.length === 0 || supplierCheck[0].status !== 'ACTIVE') {
      return { success: false, error: 'SUPPLIER_NOT_ACTIVE' };
    }

    // 3. TX 내에서 중복 방지 + Listing 생성
    return this.dataSource.transaction(async (manager) => {
      const txListingRepo = manager.getRepository(OrganizationProductListing);

      const existingListing = await txListingRepo.findOne({
        where: {
          organization_id: organizationId,
          product_id: productId,
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
          product_name: product.name,
          product_metadata: {},
          product_id: product.id, // v2: proper FK
          is_active: false,
          display_order: 0,
        });
        const saved = await txListingRepo.save(listing);
        return { success: true, data: saved };
      } catch (err: any) {
        if (err.code === '23505' || err.driverError?.code === '23505') {
          const existing = await txListingRepo.findOne({
            where: {
              organization_id: organizationId,
              product_id: productId,
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
