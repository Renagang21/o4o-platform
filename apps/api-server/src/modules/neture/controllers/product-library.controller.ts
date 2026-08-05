/**
 * ProductLibraryController — WO-O4O-GLOBAL-PRODUCT-LIBRARY-SEARCH-V1
 *
 * 공급자용 상품 라이브러리 검색 API (인증된 사용자 전용)
 * - GET /products/library/search  — 텍스트/필터 검색
 * - GET /products/library/:id     — 상세 조회
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { NetureService } from '../neture.service.js';
import { BulkMatchService } from '../services/bulk-match.service.js';
import { AliasService, AliasSource } from '../services/alias.service.js';
import { uploadSingleMiddleware } from '../../../middleware/upload.middleware.js';
import { parseXlsxToRecords } from '../services/xlsx-parser.service.js';
import { roleAssignmentService } from '../../auth/services/role-assignment.service.js';
import logger from '../../../utils/logger.js';

// WO-O4O-ADMIN-PRODUCT-MASTER-STATUS-ACTIONS-V1:
//   이 검색 엔드포인트는 관리자 목록과 공급자/저작 picker 가 공유한다(requireAuth).
//   비-ACTIVE(SUSPENDED/ARCHIVED) 조회는 관리자 롤에게만 허용하고, 그 외에는 항상 ACTIVE-only 로 강제한다.
const STATUS_ADMIN_ROLES = [
  'platform:super_admin',
  'neture:admin',
  'neture:operator',
  'glycopharm:admin',
  'glycopharm:operator',
  'cosmetics:admin',
  'cosmetics:operator',
  'kpa-society:admin',
  'kpa-society:operator',
];

/**
 * status 쿼리 파라미터 → statuses 필터 결정.
 * - 미전달/'active' → undefined(서비스 기본 ACTIVE-only)
 * - 'all'|'suspended'|'archived' → 관리자 롤일 때만 해당 필터, 아니면 undefined(ACTIVE-only 강제)
 */
async function resolveStatusFilter(
  req: Request,
): Promise<('ACTIVE' | 'SUSPENDED' | 'ARCHIVED')[] | undefined> {
  const raw = typeof req.query.status === 'string' ? req.query.status.toLowerCase() : '';
  if (!raw || raw === 'active') return undefined;
  const userId = (req as { user?: { id?: string } }).user?.id;
  const isAdmin = userId ? await roleAssignmentService.hasAnyRole(userId, STATUS_ADMIN_ROLES) : false;
  if (!isAdmin) return undefined; // 비관리자 → 항상 ACTIVE-only
  if (raw === 'all') return ['ACTIVE', 'SUSPENDED', 'ARCHIVED'];
  if (raw === 'suspended') return ['SUSPENDED'];
  if (raw === 'archived') return ['ARCHIVED'];
  return undefined;
}

export function createProductLibraryController(dataSource: DataSource): Router {
  const router = Router();
  const netureService = new NetureService();
  const bulkMatchService = new BulkMatchService(dataSource);
  const aliasService = new AliasService(dataSource);

  /**
   * GET /products/library/search
   * 텍스트(이름/바코드/제조사) + 카테고리/브랜드 필터 + 페이지네이션
   */
  router.get('/products/library/search', requireAuth, async (req: Request, res: Response) => {
    try {
      const { q, categoryId, brandId, page, limit } = req.query;

      const statuses = await resolveStatusFilter(req);

      const result = await netureService.searchProductMasters({
        q: typeof q === 'string' ? q : undefined,
        categoryId: typeof categoryId === 'string' ? categoryId : undefined,
        brandId: typeof brandId === 'string' ? brandId : undefined,
        statuses,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });

      // Attach primary images
      const masterIds = result.data.map((m) => m.id);
      let imageMap = new Map<string, string>();
      if (masterIds.length > 0) {
        const images: Array<{ master_id: string; image_url: string }> = await dataSource.query(
          `SELECT master_id, image_url FROM product_images
           WHERE master_id = ANY($1) AND is_primary = true AND deleted_at IS NULL`,
          [masterIds],
        );
        imageMap = new Map(images.map((i) => [i.master_id, i.image_url]));
      }

      const pageNum = page ? Number(page) : 1;
      // WO-O4O-ADMIN-PRODUCT-MASTER-TABLE-PERFORMANCE-V1: 관리 목록 페이지 크기 20/50/100 지원 (cap 50→100)
      const limitNum = limit ? Math.min(Number(limit), 100) : 20;

      const data = result.data.map((m) => ({
        id: m.id,
        barcode: m.barcode,
        name: m.name,
        regulatoryName: m.regulatoryName,
        manufacturerName: m.manufacturerName,
        specification: m.specification || null,
        category: m.category ? { id: m.category.id, name: m.category.name } : null,
        brand: m.brand ? { id: m.brand.id, name: m.brand.name } : null,
        primaryImageUrl: imageMap.get(m.id) || null,
        // WO-...-STATUS-ACTIONS-V1: 관리자 목록 상태 배지용 (참여자 응답에도 포함되나 항상 ACTIVE)
        status: m.status,
      }));

      res.json({
        success: true,
        data,
        meta: {
          page: pageNum,
          limit: limitNum,
          total: result.total,
          totalPages: Math.ceil(result.total / limitNum),
        },
      });
    } catch (error) {
      logger.error('[ProductLibrary] Error searching products:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to search products' });
    }
  });

  /**
   * GET /products/library/:id
   * Master 상세 조회 (with category, brand)
   */
  router.get('/products/library/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const master = await netureService.getProductMasterById(id);
      if (!master) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'ProductMaster not found' });
      }

      // Fetch all images for this master
      const images: Array<{ id: string; image_url: string; is_primary: boolean; sort_order: number; type: string }> =
        await dataSource.query(
          `SELECT id, image_url, is_primary, sort_order, type FROM product_images
           WHERE master_id = $1 AND deleted_at IS NULL ORDER BY sort_order ASC`,
          [id],
        );

      // WO-O4O-DRUG-CANONICAL-DESCRIPTION-OUTPUT-LINK-V1:
      //   canonical 공식 설명(status='canonical') 연결. is_canonical 컬럼은 없음 → status 기준.
      //   방어적: 2건 이상이면 최신 1건만 반환 + warning (partial-unique 상 정상은 1건).
      const canonRows: Array<{
        id: string; source_type: string; source_ref_id: string | null; content: string;
        summary: string | null; status: string; curated_at: string | null; updated_at: string;
      }> = await dataSource.query(
        `SELECT id, source_type, source_ref_id, content, summary, status, curated_at, updated_at
           FROM shared_product_descriptions
          WHERE master_id = $1 AND status='canonical' AND deleted_at IS NULL
          ORDER BY updated_at DESC LIMIT 2`,
        [id],
      );
      if (canonRows.length > 1) {
        logger.warn(`[ProductLibrary] master ${id} has multiple canonical descriptions; returning latest`);
      }
      const canonicalDescription = canonRows[0]
        ? {
            id: canonRows[0].id,
            sourceType: canonRows[0].source_type,
            sourceRefId: canonRows[0].source_ref_id,
            content: canonRows[0].content,
            summary: canonRows[0].summary,
            status: canonRows[0].status,
            isCanonical: true,
            curatedAt: canonRows[0].curated_at,
            updatedAt: canonRows[0].updated_at,
          }
        : null;

      // ── WO-O4O-ADMIN-O4O-PRODUCT-MASTER-DETAIL-GET-ENRICHMENT-V1 ──
      //   상품관리 콘솔 상세용 GET-only enrichment (identifiers / descriptions / sourceLinks / usageSummary).
      //   모두 read-only 집계. mutation 없음. 병렬 실행으로 상세 로딩 지연 최소화.
      const DESC_LIMIT = 20;
      const LINK_LIMIT = 20;
      const [identifierRows, descriptionRows, sourceLinkRows, usageRows] = await Promise.all([
        // 식별자 — 활성(soft-delete 제외), primary 우선
        dataSource.query(
          `SELECT id, identifier_type, identifier_value, normalized_value,
                  source_type, source_id, source_label, is_primary, verification_status, created_at
             FROM product_identifiers
            WHERE product_master_id = $1 AND deleted_at IS NULL
            ORDER BY is_primary DESC, identifier_type ASC, created_at ASC`,
          [id],
        ) as Promise<Array<{
          id: string; identifier_type: string; identifier_value: string; normalized_value: string | null;
          source_type: string | null; source_id: string | null; source_label: string | null;
          is_primary: boolean; verification_status: string | null; created_at: string | null;
        }>>,
        // 설명 후보 — canonical > needs_review > candidate > 기타, 최신순, 상한 20
        dataSource.query(
          `SELECT id, status, source_type, language, summary,
                  LEFT(content, 400) AS content_preview, quality_score, created_at, updated_at
             FROM shared_product_descriptions
            WHERE master_id = $1 AND deleted_at IS NULL
            ORDER BY (CASE status
                        WHEN 'canonical' THEN 0
                        WHEN 'needs_review' THEN 1
                        WHEN 'candidate' THEN 2
                        ELSE 3 END),
                     updated_at DESC
            LIMIT ${DESC_LIMIT}`,
          [id],
        ) as Promise<Array<{
          id: string; status: string; source_type: string; language: string | null; summary: string | null;
          content_preview: string | null; quality_score: string | null; created_at: string | null; updated_at: string | null;
        }>>,
        // 후보/원천 연결 — 이 master 로 매칭된 ProductCandidate, 최신순, 상한 20
        dataSource.query(
          `SELECT id AS candidate_id, source_type, source_label, candidate_name,
                  candidate_manufacturer, candidate_status, match_status, created_at
             FROM product_candidates
            WHERE matched_product_master_id = $1
            ORDER BY created_at DESC
            LIMIT ${LINK_LIMIT}`,
          [id],
        ) as Promise<Array<{
          candidate_id: string; source_type: string; source_label: string | null; candidate_name: string | null;
          candidate_manufacturer: string | null; candidate_status: string | null; match_status: string | null; created_at: string | null;
        }>>,
        // 사용 상태 요약 — count only. store_local_products 는 barcode 기반 loose 연결.
        dataSource.query(
          `SELECT
             (SELECT COUNT(*) FROM organization_product_listings WHERE master_id = $1) AS organization_listing_count,
             (SELECT COUNT(*) FROM store_local_products
               WHERE barcode IS NOT NULL AND barcode <> '' AND barcode = $2) AS store_local_product_count`,
          [id, master.barcode ?? ''],
        ) as Promise<Array<{ organization_listing_count: string; store_local_product_count: string }>>,
      ]);

      const identifiers = identifierRows.map((r) => ({
        id: r.id,
        type: r.identifier_type,
        value: r.identifier_value,
        normalizedValue: r.normalized_value,
        sourceType: r.source_type,
        sourceRefId: r.source_id,
        sourceLabel: r.source_label,
        isPrimary: r.is_primary,
        verificationStatus: r.verification_status,
        createdAt: r.created_at,
      }));

      const descriptions = descriptionRows.map((r) => ({
        id: r.id,
        status: r.status,
        sourceType: r.source_type,
        language: r.language,
        summary: r.summary,
        contentPreview: r.content_preview,
        qualityScore: r.quality_score != null ? Number(r.quality_score) : null,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));

      const sourceLinks = sourceLinkRows.map((r) => ({
        candidateId: r.candidate_id,
        sourceType: r.source_type,
        sourceLabel: r.source_label,
        candidateName: r.candidate_name,
        candidateManufacturer: r.candidate_manufacturer,
        candidateStatus: r.candidate_status,
        matchStatus: r.match_status,
        createdAt: r.created_at,
      }));

      const usageSummary = {
        organizationListingCount: Number(usageRows[0]?.organization_listing_count ?? 0),
        storeLocalProductCount: Number(usageRows[0]?.store_local_product_count ?? 0),
      };

      res.json({
        success: true,
        data: {
          id: master.id,
          barcode: master.barcode,
          regulatoryType: master.regulatoryType,
          regulatoryName: master.regulatoryName,
          name: master.name,
          // WO-...-STATUS-ACTIONS-V1: 상세 현재 상태 배지 + 상태 변경 액션용
          status: master.status,
          manufacturerName: master.manufacturerName,
          brandName: master.brandName,
          specification: master.specification,
          originCountry: master.originCountry,
          tags: master.tags,
          isMfdsVerified: master.isMfdsVerified,
          category: master.category ? { id: master.category.id, name: master.category.name } : null,
          brand: master.brand ? { id: master.brand.id, name: master.brand.name } : null,
          images: images.map((img) => ({
            id: img.id,
            imageUrl: img.image_url,
            isPrimary: img.is_primary,
            sortOrder: img.sort_order,
            type: img.type || 'detail',
          })),
          canonicalDescription,
          // WO-O4O-ADMIN-O4O-PRODUCT-MASTER-DETAIL-GET-ENRICHMENT-V1 (additive, read-only)
          identifiers,
          descriptions,
          sourceLinks,
          usageSummary,
          createdAt: master.createdAt,
        },
      });
    } catch (error) {
      logger.error('[ProductLibrary] Error fetching product detail:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch product detail' });
    }
  });

  /**
   * POST /products/bulk-match
   *
   * WO-O4O-BULK-MATCHING-NORMALIZATION-V1
   *
   * 이름 목록(JSON) 또는 XLSX 파일을 받아 ProductMaster 매칭 결과를 반환한다.
   * 배치 레코드 생성 없음 — 순수 preview 전용.
   *
   * Body (JSON): { names: string[] }
   * OR multipart file upload (XLSX/CSV): name 컬럼에서 추출
   *
   * Response: { success: true, data: MatchResult[], total: number }
   */
  router.post(
    '/products/bulk-match',
    requireAuth,
    uploadSingleMiddleware('file'),
    async (req: Request, res: Response) => {
      try {
        let names: string[];

        const uploadedFile = (req as any).file as Express.Multer.File | undefined;
        if (uploadedFile) {
          // File upload path: parse XLSX/CSV → extract name column
          const records: Array<Record<string, string>> = parseXlsxToRecords(uploadedFile.buffer);
          names = records
            .map((r) => (r['name'] || r['marketing_name'] || r['packaging_name'] || '').trim())
            .filter(Boolean);
        } else {
          // JSON path
          const body = req.body as { names?: unknown };
          if (!Array.isArray(body.names)) {
            return res.status(400).json({ success: false, error: 'INVALID_INPUT', message: 'names array required' });
          }
          names = (body.names as unknown[])
            .map((n) => String(n ?? '').trim())
            .filter(Boolean);
        }

        if (names.length === 0) {
          return res.status(400).json({ success: false, error: 'NO_NAMES', message: 'No names provided' });
        }
        if (names.length > 200) {
          return res.status(400).json({ success: false, error: 'TOO_MANY', message: 'Maximum 200 names per request' });
        }

        const data = await bulkMatchService.matchNames(names);
        const summary = {
          total: data.length,
          exactMatch: data.filter((r) => r.status === 'EXACT_MATCH').length,
          similarMatch: data.filter((r) => r.status === 'SIMILAR_MATCH').length,
          notFound: data.filter((r) => r.status === 'NOT_FOUND').length,
        };

        res.json({ success: true, data, summary });
      } catch (error) {
        logger.error('[ProductLibrary] Error in bulk-match:', error);
        res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Bulk match failed' });
      }
    },
  );

  /**
   * POST /products/library/select
   *
   * WO-O4O-PRODUCT-ALIAS-FOUNDATION-V1
   *
   * 사용자가 검색 결과에서 ProductMaster를 선택할 때 호출.
   * 검색어가 상품명과 다르면 alias로 저장하여 향후 검색 품질을 향상시킨다.
   *
   * Body: { masterId: string, searchTerm: string }
   */
  router.post('/products/library/select', requireAuth, async (req: Request, res: Response) => {
    try {
      const { masterId, searchTerm } = req.body as { masterId?: string; searchTerm?: string };
      if (!masterId || !searchTerm) {
        return res.status(400).json({ success: false, error: 'INVALID_INPUT' });
      }
      // best-effort — 실패해도 사용자 흐름에 영향 없음
      aliasService.upsertAlias(masterId, searchTerm, AliasSource.SEARCH).catch(() => {});
      res.json({ success: true });
    } catch (error) {
      logger.error('[ProductLibrary] Error recording select:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  return router;
}
