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
 * - external_product_id 입력 사용 ❌ (product_id만 사용)
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

    // 3. 중복 검사
    const existing = await approvalRepo.findOne({
      where: {
        product_id: productId,
        organization_id: organizationId,
        approval_type: ProductApprovalType.SERVICE,
      },
    });
    if (existing) {
      return { success: false, error: 'APPROVAL_ALREADY_EXISTS' };
    }

    // 4. 승인 요청 생성 (Listing 생성 ❌)
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
        listing = txListingRepo.create({
          organization_id: approval.organization_id,
          service_key: approval.service_key,
          external_product_id: product.id, // 하위호환: 기존 쿼리와 공존
          product_name: product.name,
          product_metadata: {},
          product_id: product.id, // v2: proper FK
          retail_price: null,
          is_active: false, // 승인 후에도 비활성 (운영자가 수동 활성화)
          display_order: 0,
        });
        listing = await txListingRepo.save(listing);
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
    const productRepo = this.dataSource.getRepository(NetureSupplierProduct);
    const approvalRepo = this.dataSource.getRepository(ProductApproval);

    // 1. 제품 조회 + distributionType 검증
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

    // 3. 중복 검사
    const existing = await approvalRepo.findOne({
      where: {
        product_id: productId,
        organization_id: sellerOrgId,
        approval_type: ProductApprovalType.PRIVATE,
      },
    });
    if (existing) {
      return { success: false, error: 'APPROVAL_ALREADY_EXISTS' };
    }

    // 4. 승인 요청 생성 (Listing 생성 ❌)
    const approval = approvalRepo.create({
      product_id: productId,
      organization_id: sellerOrgId,
      service_key: serviceKey,
      approval_type: ProductApprovalType.PRIVATE,
      approval_status: ProductApprovalStatus.PENDING,
    });
    const saved = await approvalRepo.save(approval);

    return { success: true, data: saved };
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
        listing = txListingRepo.create({
          organization_id: approval.organization_id,
          service_key: approval.service_key,
          external_product_id: product.id, // 하위호환
          product_name: product.name,
          product_metadata: {},
          product_id: product.id, // v2: proper FK
          retail_price: null,
          is_active: false,
          display_order: 0,
        });
        listing = await txListingRepo.save(listing);
      }

      return { success: true, data: { approval, listing: listing! } };
    });
  }

  // ========================================================================
  // 5. createPublicListing — PUBLIC 분배 제품 즉시 Listing 생성 (승인 불필요)
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
    const productRepo = this.dataSource.getRepository(NetureSupplierProduct);
    const listingRepo = this.dataSource.getRepository(OrganizationProductListing);

    // 1. 제품 조회 + distributionType 검증
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

    // 3. 중복 Listing 방지
    const existingListing = await listingRepo.findOne({
      where: {
        organization_id: organizationId,
        product_id: productId,
        service_key: serviceKey,
      },
    });
    if (existingListing) {
      return { success: true, data: existingListing };
    }

    // 4. Listing 즉시 생성 (approval 없음)
    const listing = listingRepo.create({
      organization_id: organizationId,
      service_key: serviceKey,
      external_product_id: product.id, // 하위호환
      product_name: product.name,
      product_metadata: {},
      product_id: product.id, // v2: proper FK
      retail_price: null,
      is_active: false,
      display_order: 0,
    });
    const saved = await listingRepo.save(listing);

    return { success: true, data: saved };
  }
}
