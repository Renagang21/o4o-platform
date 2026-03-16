/**
 * ProductConsoleController — Extension Layer
 * WO-O4O-PRODUCT-MASTER-CONSOLE-V1
 *
 * 운영자 Product Master 콘솔: product_masters + images + brands + categories + supplier offers
 * Core Freeze 준수: Neture 엔티티 미수정, Extension 엔드포인트 사용
 */
import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import type { ServiceScope } from '../../utils/serviceScope.js';

/**
 * WO-O4O-SERVICE-DATA-ISOLATION-FIX-V1: Product scope filter via organization listings.
 * product_masters is platform reference data — service scope applies through
 * organization_product_listings linkage to organization_service_enrollments.
 */
const PRODUCT_SCOPE_EXISTS = `EXISTS (
  SELECT 1 FROM organization_product_listings opl
  JOIN organization_service_enrollments ose ON ose.organization_id = opl.organization_id
  WHERE opl.master_id = pm.id AND ose.service_code = ANY`;

export class ProductConsoleController {

  /**
   * GET /api/v1/operator/products
   * 상품 목록 + primary image + brand + category + supplier count
   */
  getProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const {
        page = 1,
        limit = 20,
        search,
        categoryId,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
      } = req.query;

      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(100, Math.max(1, Number(limit)));
      const offset = (pageNum - 1) * limitNum;

      // Build WHERE conditions
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIdx = 1;

      // WO-O4O-SERVICE-DATA-ISOLATION-FIX-V1: Service scope filter
      if (!scope.isPlatformAdmin) {
        conditions.push(`${PRODUCT_SCOPE_EXISTS}($${paramIdx}))`);
        params.push(scope.serviceKeys);
        paramIdx++;
      }

      if (search) {
        conditions.push(
          `(pm.marketing_name ILIKE $${paramIdx} OR pm.regulatory_name ILIKE $${paramIdx} OR pm.barcode ILIKE $${paramIdx} OR pm.manufacturer_name ILIKE $${paramIdx} OR b.name ILIKE $${paramIdx})`
        );
        params.push(`%${search}%`);
        paramIdx++;
      }

      if (categoryId && categoryId !== 'all') {
        conditions.push(`pm.category_id = $${paramIdx}`);
        params.push(categoryId);
        paramIdx++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Sorting
      const validSortFields: Record<string, string> = {
        createdAt: 'pm.created_at',
        marketingName: 'pm.marketing_name',
        barcode: 'pm.barcode',
        supplierCount: 'supplier_count',
      };
      const sortField = validSortFields[sortBy as string] || 'pm.created_at';
      const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';

      // Count total
      const countResult = await AppDataSource.query(
        `SELECT COUNT(*)::int as total
         FROM product_masters pm
         LEFT JOIN brands b ON pm.brand_id = b.id
         ${whereClause}`,
        params
      );
      const total = countResult[0]?.total || 0;
      const totalPages = Math.ceil(total / limitNum);

      // Fetch products
      const products = await AppDataSource.query(
        `SELECT pm.id, pm.barcode, pm.marketing_name, pm.regulatory_name,
                pm.manufacturer_name, pm.specification, pm.created_at,
                pm.brand_id, pm.category_id,
                b.name as brand_name,
                pc.name as category_name,
                (SELECT pi.image_url FROM product_images pi WHERE pi.master_id = pm.id AND pi.is_primary = true LIMIT 1) as primary_image,
                (SELECT COUNT(*)::int FROM supplier_product_offers spo WHERE spo.master_id = pm.id) as supplier_count
         FROM product_masters pm
         LEFT JOIN brands b ON pm.brand_id = b.id
         LEFT JOIN product_categories pc ON pm.category_id = pc.id
         ${whereClause}
         ORDER BY ${sortField} ${order}
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, limitNum, offset]
      );

      // Stats query — WO-O4O-SERVICE-DATA-ISOLATION-FIX-V1: scoped
      const scopeFilter = scope.isPlatformAdmin
        ? ''
        : `WHERE ${PRODUCT_SCOPE_EXISTS}($1))`;
      const scopeParams = scope.isPlatformAdmin ? [] : [scope.serviceKeys];

      const statsResult = await AppDataSource.query(
        `SELECT
           COUNT(*)::int as total_products,
           COUNT(CASE WHEN EXISTS (SELECT 1 FROM product_images pi2 WHERE pi2.master_id = pm.id) THEN 1 END)::int as with_image,
           COUNT(CASE WHEN EXISTS (SELECT 1 FROM supplier_product_offers spo2 WHERE spo2.master_id = pm.id) THEN 1 END)::int as with_supplier
         FROM product_masters pm
         ${scopeFilter}`,
        scopeParams
      );

      const duplicateResult = await AppDataSource.query(
        `SELECT COUNT(*)::int as duplicate_barcodes FROM (
           SELECT pm.barcode FROM product_masters pm
           ${scopeFilter}
           GROUP BY pm.barcode HAVING COUNT(*) > 1
         ) sub`,
        scopeParams
      );

      res.json({
        success: true,
        products: products.map((p: any) => ({
          id: p.id,
          barcode: p.barcode,
          marketingName: p.marketing_name,
          regulatoryName: p.regulatory_name,
          manufacturerName: p.manufacturer_name,
          specification: p.specification,
          brandId: p.brand_id,
          brandName: p.brand_name,
          categoryId: p.category_id,
          categoryName: p.category_name,
          primaryImage: p.primary_image,
          supplierCount: p.supplier_count,
          createdAt: p.created_at,
        })),
        stats: {
          totalProducts: statsResult[0]?.total_products || 0,
          withImage: statsResult[0]?.with_image || 0,
          withSupplier: statsResult[0]?.with_supplier || 0,
          duplicateBarcodes: duplicateResult[0]?.duplicate_barcodes || 0,
        },
        pagination: { page: pageNum, limit: limitNum, total, totalPages },
      });
    } catch (error) {
      console.error('[ProductConsole] getProducts error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch products' });
    }
  };

  /**
   * GET /api/v1/operator/products/duplicates
   * 바코드 중복 상품 그룹
   */
  getDuplicates = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;

      // WO-O4O-SERVICE-DATA-ISOLATION-FIX-V1: Service scope filter
      const scopeFilter = scope.isPlatformAdmin
        ? ''
        : `WHERE ${PRODUCT_SCOPE_EXISTS}($1))`;
      const scopeParams = scope.isPlatformAdmin ? [] : [scope.serviceKeys];

      const duplicates = await AppDataSource.query(
        `SELECT pm.barcode, COUNT(*)::int as count,
                JSON_AGG(JSON_BUILD_OBJECT(
                  'id', pm.id,
                  'marketingName', pm.marketing_name,
                  'regulatoryName', pm.regulatory_name,
                  'manufacturerName', pm.manufacturer_name,
                  'createdAt', pm.created_at
                ) ORDER BY pm.created_at) as products
         FROM product_masters pm
         ${scopeFilter}
         GROUP BY pm.barcode
         HAVING COUNT(*) > 1
         ORDER BY COUNT(*) DESC`,
        scopeParams
      );

      res.json({
        success: true,
        duplicates: duplicates.map((d: any) => ({
          barcode: d.barcode,
          count: d.count,
          products: d.products,
        })),
        total: duplicates.length,
      });
    } catch (error) {
      console.error('[ProductConsole] getDuplicates error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch duplicates' });
    }
  };

  /**
   * GET /api/v1/operator/products/:productId
   * 상품 상세: 기본정보 + 모든 이미지 + 카테고리 + 브랜드
   */
  getProductDetail = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const { productId } = req.params;

      // WO-O4O-SERVICE-DATA-ISOLATION-FIX-V1: Service boundary on product detail
      const scopeCondition = scope.isPlatformAdmin
        ? ''
        : `AND ${PRODUCT_SCOPE_EXISTS}($2))`;
      const productParams = scope.isPlatformAdmin
        ? [productId]
        : [productId, scope.serviceKeys];

      // Fetch product
      const productRows = await AppDataSource.query(
        `SELECT pm.id, pm.barcode, pm.regulatory_type, pm.regulatory_name,
                pm.marketing_name, pm.brand_name as legacy_brand_name,
                pm.manufacturer_name, pm.specification, pm.origin_country,
                pm.tags, pm.mfds_permit_number, pm.mfds_product_id,
                pm.is_mfds_verified, pm.mfds_synced_at,
                pm.brand_id, pm.category_id,
                pm.created_at, pm.updated_at,
                b.name as brand_name,
                pc.name as category_name
         FROM product_masters pm
         LEFT JOIN brands b ON pm.brand_id = b.id
         LEFT JOIN product_categories pc ON pm.category_id = pc.id
         WHERE pm.id = $1 ${scopeCondition}`,
        productParams
      );

      if (productRows.length === 0) {
        res.status(404).json({ success: false, error: 'Product not found' });
        return;
      }

      const p = productRows[0];

      // Fetch all images
      const images = await AppDataSource.query(
        `SELECT id, image_url, gcs_path, sort_order, is_primary, created_at
         FROM product_images
         WHERE master_id = $1
         ORDER BY is_primary DESC, sort_order ASC`,
        [productId]
      );

      res.json({
        success: true,
        product: {
          id: p.id,
          barcode: p.barcode,
          regulatoryType: p.regulatory_type,
          regulatoryName: p.regulatory_name,
          marketingName: p.marketing_name,
          legacyBrandName: p.legacy_brand_name,
          manufacturerName: p.manufacturer_name,
          specification: p.specification,
          originCountry: p.origin_country,
          tags: p.tags,
          mfdsPermitNumber: p.mfds_permit_number,
          mfdsProductId: p.mfds_product_id,
          isMfdsVerified: p.is_mfds_verified,
          mfdsSyncedAt: p.mfds_synced_at,
          brandId: p.brand_id,
          brandName: p.brand_name,
          categoryId: p.category_id,
          categoryName: p.category_name,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        },
        images: images.map((img: any) => ({
          id: img.id,
          imageUrl: img.image_url,
          gcsPath: img.gcs_path,
          sortOrder: img.sort_order,
          isPrimary: img.is_primary,
          createdAt: img.created_at,
        })),
      });
    } catch (error) {
      console.error('[ProductConsole] getProductDetail error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch product detail' });
    }
  };

  /**
   * GET /api/v1/operator/products/:productId/suppliers
   * 상품의 공급자 오퍼 목록
   */
  getProductSuppliers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { productId } = req.params;

      const offers = await AppDataSource.query(
        `SELECT spo.id, spo.supplier_id, spo.distribution_type, spo.approval_status,
                spo.is_active, spo.price_general, spo.price_gold, spo.price_platinum,
                spo.consumer_reference_price, spo.stock_quantity, spo.reserved_quantity,
                spo.low_stock_threshold, spo.track_inventory, spo.slug,
                spo.created_at, spo.updated_at,
                ns.company_name as supplier_name
         FROM supplier_product_offers spo
         LEFT JOIN neture_suppliers ns ON spo.supplier_id = ns.id
         WHERE spo.master_id = $1
         ORDER BY spo.created_at DESC`,
        [productId]
      );

      res.json({
        success: true,
        suppliers: offers.map((o: any) => ({
          id: o.id,
          supplierId: o.supplier_id,
          supplierName: o.supplier_name,
          distributionType: o.distribution_type,
          approvalStatus: o.approval_status,
          isActive: o.is_active,
          priceGeneral: o.price_general,
          priceGold: o.price_gold,
          pricePlatinum: o.price_platinum,
          consumerReferencePrice: o.consumer_reference_price,
          stockQuantity: o.stock_quantity,
          reservedQuantity: o.reserved_quantity,
          lowStockThreshold: o.low_stock_threshold,
          trackInventory: o.track_inventory,
          slug: o.slug,
          createdAt: o.created_at,
          updatedAt: o.updated_at,
        })),
      });
    } catch (error) {
      console.error('[ProductConsole] getProductSuppliers error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch product suppliers' });
    }
  };
}
