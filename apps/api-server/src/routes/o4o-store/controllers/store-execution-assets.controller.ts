/**
 * Store Execution Assets Controller
 *
 * WO-KPA-STORE-ASSET-STRUCTURE-REFACTOR-V1
 * (renamed from store-library.controller.ts)
 *
 * 매장 실행 자산 CRUD (Display Domain).
 *
 * GET    /store/assets            — 자산 목록 (페이지네이션 + 검색)
 * POST   /store/assets            — 자산 생성
 * PUT    /store/assets/:id        — 자산 수정
 * DELETE /store/assets/:id        — soft-delete (is_active=false)
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
import { StoreExecutionAsset } from '../../platform/entities/store-execution-asset.entity.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { createRequireStoreOwner } from '../../../utils/store-owner.utils.js';

const VALID_ASSET_TYPES = ['file', 'content', 'external-link'] as const;

type AuthMiddleware = RequestHandler;

export function createStoreExecutionAssetsController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();
  const assetsRepo = dataSource.getRepository(StoreExecutionAsset);

  const requirePharmacyOwner = createRequireStoreOwner(dataSource);

  // ─── GET /store/assets — 자산 목록 (페이지네이션) ──────────
  router.get(
    '/store/assets',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const search = (req.query.search as string || '').trim();
      const category = (req.query.category as string || '').trim();
      const usageType = (req.query.usage_type as string || '').trim();

      const qb = assetsRepo.createQueryBuilder('item')
        .where('item.organizationId = :organizationId', { organizationId })
        .andWhere('item.isActive = :isActive', { isActive: true });

      if (category && category !== 'all') {
        qb.andWhere('item.category = :category', { category });
      }

      if (usageType && usageType !== 'all') {
        qb.andWhere('item.usageType = :usageType', { usageType });
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

  // ─── POST /store/assets — 자산 생성 ────────────────────────
  router.post(
    '/store/assets',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const {
        title, description, fileUrl, fileName, fileSize, mimeType, category,
        assetType: rawAssetType, usageType, url, htmlContent, sourceType,
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

      const item = assetsRepo.create({
        organizationId,
        title: title.trim(),
        description: description || null,
        fileUrl: assetType === 'file' ? (fileUrl || null) : null,
        fileName: assetType === 'file' ? (fileName || null) : null,
        fileSize: assetType === 'file' && typeof fileSize === 'number' ? fileSize : null,
        mimeType: assetType === 'file' ? (mimeType || null) : null,
        category: category || null,
        assetType,
        usageType: usageType || null,
        url: assetType === 'external-link' ? (url || null) : null,
        htmlContent: assetType === 'content' ? (htmlContent || null) : null,
        sourceType: sourceType || 'uploaded',
        isActive: true,
      });

      const saved = await assetsRepo.save(item);
      res.status(201).json({ success: true, data: saved });
    }),
  );

  // ─── PUT /store/assets/:id — 자산 수정 ────────────────────
  router.put(
    '/store/assets/:id',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const { id } = req.params;

      const item = await assetsRepo.findOne({
        where: { id, organizationId },
      });

      if (!item) {
        res.status(404).json({
          success: false,
          error: { code: 'ASSET_NOT_FOUND', message: 'Asset not found' },
        });
        return;
      }

      const {
        title, description, fileUrl, fileName, fileSize, mimeType, category, isActive,
        usageType, url, htmlContent,
      } = req.body;

      if (title !== undefined) item.title = String(title).trim();
      if (description !== undefined) item.description = description;
      if (category !== undefined) item.category = category;
      if (usageType !== undefined) item.usageType = usageType;
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

      const saved = await assetsRepo.save(item);
      res.json({ success: true, data: saved });
    }),
  );

  // ─── DELETE /store/assets/:id — soft-delete ──────────────────
  router.delete(
    '/store/assets/:id',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const { id } = req.params;

      const item = await assetsRepo.findOne({
        where: { id, organizationId },
      });

      if (!item) {
        res.status(404).json({
          success: false,
          error: { code: 'ASSET_NOT_FOUND', message: 'Asset not found' },
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
            message: `이 자산을 참조하는 QR 코드가 ${qrCount}개 있어 삭제할 수 없습니다. QR 코드를 먼저 삭제해주세요.`,
            qrCount,
          },
        });
        return;
      }

      item.isActive = false;
      await assetsRepo.save(item);

      res.json({ success: true, message: 'Asset deactivated' });
    }),
  );

  return router;
}
