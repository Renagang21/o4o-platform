/**
 * Glycopharm Pharmacy Controller
 *
 * WO-GLYCOPHARM-SCOPE-SIMPLIFICATION-V1:
 * - resolve 직접 호출 제거 → 미들웨어(requirePharmacyContext) 사용
 * - 핸들러는 req.pharmacyId만 참조
 *
 * Pharmacy-specific API endpoints for:
 * - Products management (my pharmacy's products)
 * - Categories
 * - Orders
 * - Customers
 * - B2B products
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { GlycopharmProduct } from '../entities/glycopharm-product.entity.js';
// GlycopharmOrder - REMOVED (Phase 4-A: Legacy Order System Deprecation)
// Orders will be handled via E-commerce Core with OrderType.GLYCOPHARM
import type { PharmacyContextRequest } from '../../../modules/care/care-pharmacy-context.middleware.js';
import { GlycopharmRepository } from '../repositories/glycopharm.repository.js';

type AuthMiddleware = RequestHandler;

// Product categories for blood glucose products
const PRODUCT_CATEGORIES = [
  { id: 'cgm_device', name: 'CGM 기기', description: '연속혈당측정기' },
  { id: 'test_strip', name: '시험지', description: '혈당측정 시험지' },
  { id: 'lancet', name: '란셋', description: '채혈용 란셋' },
  { id: 'meter', name: '혈당측정기', description: '혈당측정기기' },
  { id: 'accessory', name: '액세서리', description: '관련 액세서리' },
  { id: 'other', name: '기타', description: '기타 제품' },
];

export function createPharmacyController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  requirePharmacyContext: AuthMiddleware,
): Router {
  const router = Router();

  /**
   * GET /pharmacy/products
   * Get products for the authenticated user's pharmacy
   */
  router.get(
    '/products',
    requireAuth,
    requirePharmacyContext,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const pcReq = req as PharmacyContextRequest;
        const pharmacyId = pcReq.pharmacyId!;

        // Get query params
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 20;
        const categoryId = req.query.categoryId as string;
        const status = req.query.status as string;
        const search = req.query.search as string;

        // Build query
        const productRepo = dataSource.getRepository(GlycopharmProduct);
        const queryBuilder = productRepo
          .createQueryBuilder('product')
          .where('product.pharmacy_id = :pharmacyId', { pharmacyId });

        // Apply filters
        if (categoryId) {
          queryBuilder.andWhere('product.category = :category', { category: categoryId });
        }

        if (status) {
          queryBuilder.andWhere('product.status = :status', { status });
        }

        if (search) {
          queryBuilder.andWhere(
            '(product.name ILIKE :search OR product.sku ILIKE :search)',
            { search: `%${search}%` }
          );
        }

        // Get total count
        const total = await queryBuilder.getCount();

        // Apply pagination
        const products = await queryBuilder
          .orderBy('product.created_at', 'DESC')
          .skip((page - 1) * pageSize)
          .take(pageSize)
          .getMany();

        // Map to response format
        const items = products.map((p) => ({
          id: p.id,
          name: p.name,
          categoryId: p.category,
          categoryName: PRODUCT_CATEGORIES.find((c) => c.id === p.category)?.name || p.category,
          price: Number(p.price),
          salePrice: p.sale_price ? Number(p.sale_price) : undefined,
          stock: p.stock_quantity || 0,
          status: p.status,
          thumbnailUrl: undefined, // image_url not in entity
          isDropshipping: false,
          supplierId: '',
          supplierName: p.manufacturer || '',
          createdAt: p.created_at.toISOString(),
        }));

        res.json({
          success: true,
          data: {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
          },
        });
      } catch (error: any) {
        console.error('Failed to get pharmacy products:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /pharmacy/categories
   * Get product categories
   */
  router.get(
    '/categories',
    requireAuth,
    async (_req: Request, res: Response): Promise<void> => {
      try {
        res.json({
          success: true,
          data: PRODUCT_CATEGORIES.map((c) => ({
            id: c.id,
            name: c.name,
          })),
        });
      } catch (error: any) {
        console.error('Failed to get categories:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /pharmacy/orders
   * Get orders for the authenticated user's pharmacy
   *
   * NOTE: Phase 4-A - Legacy Order System Deprecated
   * This endpoint returns empty data until E-commerce Core integration is complete.
   * Orders will be handled via E-commerce Core with OrderType.GLYCOPHARM
   */
  router.get(
    '/orders',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 20;

        // Phase 4-A: Legacy Order System removed
        // Return empty data until E-commerce Core integration
        res.json({
          success: true,
          data: {
            items: [],
            total: 0,
            page,
            pageSize,
            totalPages: 0,
          },
          _notice: 'Order system migration in progress. Orders will be available via E-commerce Core.',
        });
      } catch (error: any) {
        console.error('Failed to get pharmacy orders:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /pharmacy/customers
   * Get customers for the authenticated user's pharmacy
   *
   * WO-CARE-ORG-SCOPE-MIGRATION-V1: organization_id 기준 약국 단위 조회
   * WO-GLYCOPHARM-SCOPE-SIMPLIFICATION-V1: resolve → middleware
   */
  router.get(
    '/customers',
    requireAuth,
    requirePharmacyContext,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const pcReq = req as PharmacyContextRequest;
        const pharmacyId = pcReq.pharmacyId!;

        const page = parseInt(req.query.page as string) || 1;
        const pageSize = Math.min(parseInt(req.query.pageSize as string) || 50, 100);
        const search = (req.query.search as string) || '';
        const offset = (page - 1) * pageSize;

        // Build WHERE clause — organization_id 기준
        const conditions = ['c.organization_id = $1'];
        const params: any[] = [pharmacyId];

        if (search.trim()) {
          params.push(`%${search.trim()}%`);
          conditions.push(`(c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length})`);
        }

        const whereClause = conditions.join(' AND ');

        // safeQuery: glucoseview_customers 테이블 미존재 시 빈 결과 반환
        let items: any[] = [];
        let total = 0;

        try {
          const [countResult, dataResult] = await Promise.all([
            dataSource.query(
              `SELECT COUNT(*)::int AS count FROM glucoseview_customers c WHERE ${whereClause}`,
              params,
            ),
            dataSource.query(
              `SELECT c.id, c.name, c.phone, c.email, c.birth_year, c.gender,
                      c.visit_count, c.sync_status, c.last_visit, c.notes,
                      c.created_at, c.updated_at
               FROM glucoseview_customers c
               WHERE ${whereClause}
               ORDER BY c.created_at DESC
               LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
              [...params, pageSize, offset],
            ),
          ]);

          total = countResult[0]?.count ?? 0;
          items = dataResult.map((row: any) => ({
            id: row.id,
            name: row.name,
            phone: row.phone || '',
            email: row.email || undefined,
            totalOrders: 0,
            totalSpent: 0,
            status: 'active' as const,
            createdAt: row.created_at?.toISOString?.() || row.created_at,
          }));
        } catch {
          // Table missing — return empty (production may not have this table)
          console.warn('[pharmacy/customers] glucoseview_customers table not available');
        }

        res.json({
          success: true,
          data: {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
          },
        });
      } catch (error: any) {
        console.error('Failed to get pharmacy customers:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /pharmacy/customers/:id
   * Get a single customer detail for the authenticated user's pharmacy
   *
   * WO-GLYCOPHARM-PATIENT-DETAIL-V1
   * Boundary: organization_id 필터 필수 (CLAUDE.md §7 Guard Rule 1)
   */
  router.get(
    '/customers/:id',
    requireAuth,
    requirePharmacyContext,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const pcReq = req as PharmacyContextRequest;
        const pharmacyId = pcReq.pharmacyId;
        const customerId = req.params.id;

        // Build query with boundary check
        const conditions = ['c.id = $1'];
        const params: any[] = [customerId];

        // Non-admin: enforce organization_id boundary
        if (pharmacyId) {
          conditions.push('c.organization_id = $2');
          params.push(pharmacyId);
        }

        const whereClause = conditions.join(' AND ');

        const rows = await dataSource.query(
          `SELECT c.id, c.name, c.phone, c.email, c.birth_year, c.gender,
                  c.visit_count, c.sync_status, c.last_visit, c.notes,
                  c.created_at, c.updated_at
           FROM glucoseview_customers c
           WHERE ${whereClause}
           LIMIT 1`,
          params,
        );

        if (rows.length === 0) {
          res.status(404).json({
            success: false,
            error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' },
          });
          return;
        }

        const row = rows[0];
        res.json({
          success: true,
          data: {
            id: row.id,
            name: row.name,
            phone: row.phone || '',
            email: row.email || undefined,
            birthYear: row.birth_year || undefined,
            gender: row.gender || undefined,
            visitCount: row.visit_count || 0,
            syncStatus: row.sync_status || undefined,
            lastVisit: row.last_visit?.toISOString?.() || row.last_visit || undefined,
            notes: row.notes || undefined,
            totalOrders: 0,
            totalSpent: 0,
            status: 'active' as const,
            createdAt: row.created_at?.toISOString?.() || row.created_at,
          },
        });
      } catch (error: any) {
        console.error('Failed to get customer detail:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * POST /pharmacy/customers
   * Create a new customer for the authenticated user's pharmacy
   *
   * WO-GLYCOPHARM-CARE-UI-ADJUST-V1: Care 환자 등록 기능
   * WO-GLYCOPHARM-PHARMACY-PATIENT-REGISTER-FORM-COMPLETE-V1: gender/birthYear, 중복검사, 검증 강화
   */
  router.post(
    '/customers',
    requireAuth,
    requirePharmacyContext,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const pcReq = req as PharmacyContextRequest;
        const pharmacyId = pcReq.pharmacyId!;
        const pharmacistId = (pcReq as any).user?.id;

        if (!pharmacistId) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
          });
          return;
        }

        const { name, phone, email, gender, birthYear, notes } = req.body;

        // 이름 필수
        if (!name || typeof name !== 'string' || !name.trim()) {
          res.status(400).json({
            error: { code: 'VALIDATION_ERROR', message: '이름은 필수 입력입니다.' },
          });
          return;
        }

        // 전화번호 정리 및 검증
        const cleanPhone = phone ? String(phone).replace(/\D/g, '') : null;
        if (cleanPhone && cleanPhone.length < 10) {
          res.status(400).json({
            error: { code: 'VALIDATION_ERROR', message: '전화번호는 최소 10자리여야 합니다.' },
          });
          return;
        }

        // 이메일 기본 형식 검증
        const trimEmail = email ? String(email).trim() : null;
        if (trimEmail && !trimEmail.includes('@')) {
          res.status(400).json({
            error: { code: 'VALIDATION_ERROR', message: '올바른 이메일 형식이 아닙니다.' },
          });
          return;
        }

        // 성별 검증
        const validGender = gender && ['male', 'female'].includes(gender) ? gender : null;

        // 출생연도 검증
        const validBirthYear = birthYear && Number(birthYear) >= 1900 && Number(birthYear) <= new Date().getFullYear()
          ? Number(birthYear)
          : null;

        // 전화번호 중복 검사 (같은 약국 내)
        if (cleanPhone) {
          const existing = await dataSource.query(
            `SELECT id, name FROM glucoseview_customers WHERE organization_id = $1 AND phone = $2 LIMIT 1`,
            [pharmacyId, cleanPhone],
          );
          if (existing.length > 0) {
            res.status(409).json({
              error: {
                code: 'DUPLICATE_CUSTOMER',
                message: `동일한 연락처의 당뇨인이 이미 등록되어 있습니다. (${existing[0].name})`,
              },
            });
            return;
          }
        }

        const result = await dataSource.query(
          `INSERT INTO glucoseview_customers
             (pharmacist_id, organization_id, name, phone, email, gender, birth_year, notes, last_visit, visit_count, sync_status, data_sharing_consent)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), 1, 'pending', false)
           RETURNING id, name, phone, email, gender, birth_year, created_at`,
          [pharmacistId, pharmacyId, name.trim(), cleanPhone, trimEmail, validGender, validBirthYear, notes || null],
        );

        res.status(201).json({ success: true, data: result[0] });
      } catch (error: any) {
        console.error('Failed to create pharmacy customer:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  return router;
}

/**
 * Create B2B products controller
 *
 * WO-GLYCOPHARM-B2B-PRODUCT-SEED-LINKING-V1 (Task T1-T2)
 * - Query actual products from database
 * - Filter by status='active' for both franchise and general B2B
 */
export function createB2BController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware
): Router {
  const router = Router();
  const repository = new GlycopharmRepository(dataSource);

  /**
   * GET /b2b/products
   * Get B2B products (franchise or general)
   */
  router.get(
    '/products',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const type = req.query.type as string; // 'franchise' or 'general'
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 100;

        // Query active products from database with type filter
        // franchise → is_featured = true (exclusive products for franchise partners)
        // general → all active products
        const result = await repository.findAllProducts({
          status: 'active',
          is_featured: type === 'franchise' ? true : undefined,
          page,
          limit,
        });

        // Map to B2B product format
        const products = result.data.map((product) => ({
          id: product.id,
          name: product.name,
          category: product.category,
          price: Number(product.price),
          discountPrice: product.sale_price ? Number(product.sale_price) : undefined,
          supplierName: product.manufacturer || 'Unknown',
          image: product.images?.[0]?.url,
          stock: product.stock_quantity,
          status: product.status,
          type: type || 'general',
          isRecommended: product.is_featured || false,
        }));

        res.json({
          success: true,
          data: products,
          meta: result.meta,
        });
      } catch (error: any) {
        console.error('Failed to get B2B products:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  return router;
}

// WO-MARKET-TRIAL-B2B-API-UNIFICATION-V1:
// createMarketTrialsController removed.
// Market Trial is now a platform-common B2B feature at GET /api/market-trial?serviceKey=glycopharm
