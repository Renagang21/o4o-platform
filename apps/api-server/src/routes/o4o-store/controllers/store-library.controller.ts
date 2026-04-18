/**
 * Store Library Controller
 *
 * WO-O4O-STORE-LIBRARY-API-INTEGRATION-V1
 * WO-O4O-LIBRARY-SELECTOR-PAGINATION-V1
 * WO-STORE-LIBRARY-ASSET-EXTENSION-V1
 *
 * 매장 자료실 CRUD (Display Domain).
 *
 * GET    /pharmacy/library            — 자료 목록 (페이지네이션 + 검색)
 * POST   /pharmacy/library            — 자료 생성
 * PUT    /pharmacy/library/:id        — 자료 수정
 * DELETE /pharmacy/library/:id        — soft-delete (is_active=false)
 *
 * 인증: requireAuth + store owner 체크
 * 조직: organization_members 기반 자동 결정
 * Neture FK 금지 — 프리필은 클라이언트 측에서만 처리
 *
 * asset_type별 검증:
 *   file          → fileUrl 필수, htmlContent 금지
 *   content       → htmlContent 필수, fileUrl 금지
 *   external-link → url 필수, fileUrl·htmlContent 금지
 *
 * DELETE 보호: QR 코드가 참조하는 항목은 삭제 불가 (409)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { StoreLibraryItem } from '../../platform/entities/store-library-item.entity.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { createRequireStoreOwner } from '../../../utils/store-owner.utils.js';

const VALID_ASSET_TYPES = ['file', 'content', 'external-link'] as const;

type AuthMiddleware = RequestHandler;

export function createStoreLibraryController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();
  const libraryRepo = dataSource.getRepository(StoreLibraryItem);

  const requirePharmacyOwner = createRequireStoreOwner(dataSource);

  // ─── GET /pharmacy/library — 자료 목록 (페이지네이션) ──────────
  router.get(
    '/pharmacy/library',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const search = (req.query.search as string || '').trim();
      const category = (req.query.category as string || '').trim();

      const where: any = { organizationId, isActive: true };

      if (category && category !== 'all') {
        where.category = category;
      }

      const qb = libraryRepo.createQueryBuilder('item')
        .where('item.organizationId = :organizationId', { organizationId })
        .andWhere('item.isActive = :isActive', { isActive: true });

      if (category && category !== 'all') {
        qb.andWhere('item.category = :category', { category });
      }

      if (search) {
        qb.andWhere(
          '(item.title ILIKE :search OR item.description ILIKE :search OR item.category ILIKE :search)',
          { search: `%${search}%` },
        );
      }

      qb.orderBy('item.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      const [items, total] = await qb.getManyAndCount();

      res.json({
        success: true,
        data: {
          items,
          page,
          limit,
          total,
        },
      });
    }),
  );

  // ─── POST /pharmacy/library — 자료 생성 ────────────────────────
  router.post(
    '/pharmacy/library',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const {
        title, description, fileUrl, fileName, fileSize, mimeType, category,
        assetType: rawAssetType, url, htmlContent, sourceType,
      } = req.body;

      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'title is required' },
        });
        return;
      }

      // asset_type 기본값 및 검증
      const assetType = rawAssetType || 'file';
      if (!VALID_ASSET_TYPES.includes(assetType)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: `asset_type must be one of: ${VALID_ASSET_TYPES.join(', ')}` },
        });
        return;
      }

      // 타입별 필수/금지 필드 검증
      if (assetType === 'content') {
        if (!htmlContent || typeof htmlContent !== 'string' || htmlContent.trim().length === 0) {
          res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'htmlContent is required for content type' },
          });
          return;
        }
      }

      if (assetType === 'external-link') {
        if (!url || typeof url !== 'string' || url.trim().length === 0) {
          res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'url is required for external-link type' },
          });
          return;
        }
      }

      const item = libraryRepo.create({
        organizationId,
        title: title.trim(),
        description: description || null,
        fileUrl: assetType === 'file' ? (fileUrl || null) : null,
        fileName: assetType === 'file' ? (fileName || null) : null,
        fileSize: assetType === 'file' && typeof fileSize === 'number' ? fileSize : null,
        mimeType: assetType === 'file' ? (mimeType || null) : null,
        category: category || null,
        assetType,
        url: assetType === 'external-link' ? (url || null) : null,
        htmlContent: assetType === 'content' ? (htmlContent || null) : null,
        sourceType: sourceType || 'uploaded',
        isActive: true,
      });

      const saved = await libraryRepo.save(item);
      res.status(201).json({ success: true, data: saved });
    }),
  );

  // ─── PUT /pharmacy/library/:id — 자료 수정 ────────────────────
  router.put(
    '/pharmacy/library/:id',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const { id } = req.params;

      const item = await libraryRepo.findOne({
        where: { id, organizationId },
      });

      if (!item) {
        res.status(404).json({
          success: false,
          error: { code: 'LIBRARY_ITEM_NOT_FOUND', message: 'Library item not found' },
        });
        return;
      }

      const {
        title, description, fileUrl, fileName, fileSize, mimeType, category, isActive,
        url, htmlContent,
      } = req.body;

      if (title !== undefined) item.title = String(title).trim();
      if (description !== undefined) item.description = description;
      if (category !== undefined) item.category = category;
      if (typeof isActive === 'boolean') item.isActive = isActive;

      // 타입별 필드 업데이트
      const currentType = item.assetType || 'file';

      if (currentType === 'file') {
        if (fileUrl !== undefined) item.fileUrl = fileUrl;
        if (fileName !== undefined) item.fileName = fileName;
        if (fileSize !== undefined) item.fileSize = typeof fileSize === 'number' ? fileSize : null;
        if (mimeType !== undefined) item.mimeType = mimeType;
      } else if (currentType === 'content') {
        if (htmlContent !== undefined) item.htmlContent = htmlContent;
      } else if (currentType === 'external-link') {
        if (url !== undefined) item.url = url;
      }

      const saved = await libraryRepo.save(item);
      res.json({ success: true, data: saved });
    }),
  );

  // ─── DELETE /pharmacy/library/:id — soft-delete ──────────────────
  router.delete(
    '/pharmacy/library/:id',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const { id } = req.params;

      const item = await libraryRepo.findOne({
        where: { id, organizationId },
      });

      if (!item) {
        res.status(404).json({
          success: false,
          error: { code: 'LIBRARY_ITEM_NOT_FOUND', message: 'Library item not found' },
        });
        return;
      }

      // QR 코드 참조 보호: 활성 QR이 있으면 삭제 불가
      const qrRefResult = await dataSource.query(
        `SELECT COUNT(*)::int AS cnt FROM store_qr_codes WHERE library_item_id = $1 AND is_active = true`,
        [id],
      );
      const qrCount = qrRefResult?.[0]?.cnt || 0;

      if (qrCount > 0) {
        res.status(409).json({
          success: false,
          error: {
            code: 'QR_REFERENCE_EXISTS',
            message: `이 자료를 참조하는 QR 코드가 ${qrCount}개 있어 삭제할 수 없습니다. QR 코드를 먼저 삭제해주세요.`,
            qrCount,
          },
        });
        return;
      }

      item.isActive = false;
      await libraryRepo.save(item);

      res.json({ success: true, message: 'Library item deactivated' });
    }),
  );

  return router;
}
