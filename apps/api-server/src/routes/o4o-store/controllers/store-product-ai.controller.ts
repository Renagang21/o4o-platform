import type { Router, RequestHandler, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import multer from 'multer';
import { z } from 'zod';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { apiLimiter } from '../../../middleware/rateLimiter.js';
import { aiContextLanguage, readStoreProductAiContext } from '../../../modules/neture/product-description-intake/ai-context.service.js';
import { MAX_PRODUCT_FILE_BYTES, previewStoreExcel } from '../../../modules/neture/product-description-intake/store-excel-preview.js';
import { DescriptionIntakeError } from '../../../modules/neture/product-description-intake/contracts.js';
import { readStoreAiReadiness } from '../../../modules/neture/product-description-intake/store-ai-readiness.js';

// Authenticated store members only; shared parser byte cap plus sheet/column/row bounds and API rate limit.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_PRODUCT_FILE_BYTES, files: 1, fields: 4, parts: 5 } }).single('file');
const column = z.coerce.number().int().min(0).max(99).optional();
export function registerStoreProductAiRoutes(router: Router, db: DataSource, storeAccess: RequestHandler) {
  const handle = (fn: (req: Request, res: Response, org: string) => Promise<void>): RequestHandler => (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    const org = (req as Request & { organizationId?: string }).organizationId;
    if (!org) { res.status(403).json({ success: false, code: 'STORE_REQUIRED' }); return; }
    void fn(req, res, org).catch(error => {
      const known = error instanceof DescriptionIntakeError;
      let status = 500, code = 'PRODUCT_AI_READ_FAILED';
      if (known) { status = error.status; code = error.code; }
      else if (error instanceof z.ZodError) { status = 400; code = 'INVALID_INPUT'; }
      res.status(status).json({ success: false, code,
        message: '파일의 상품명·바코드 열과 현재 매장을 확인해 주세요.' });
    });
  };
  router.post('/ai-context/import-preview', requireAuth, storeAccess, apiLimiter, (req, res, next) => {
    upload(req, res, error => {
      if (error) { res.status(400).json({ success: false, code: 'INVALID_PRODUCT_FILE' }); return; }
      next();
    });
  }, handle(async (req, res, org) => {
    if (!req.file || !/\.(xlsx|xls|csv)$/i.test(req.file.originalname)) throw new DescriptionIntakeError('PRODUCT_FILE_REQUIRED');
    const input = z.object({ barcodeColumn: column, nameColumn: column, headerRow: z.coerce.number().int().min(0).max(19).optional(), language: aiContextLanguage.default('ko') }).strict().parse(req.body);
    const mapping = input.barcodeColumn === undefined && input.nameColumn === undefined ? undefined : { ...input, language: input.language ?? 'ko' };
    res.json({ success: true, data: await previewStoreExcel(db, org, req.file.buffer, mapping, input.headerRow) });
  }));
  router.get('/ai-context/readiness', requireAuth, storeAccess, apiLimiter, handle(async (req, res, org) => {
    const language = aiContextLanguage.parse(req.query.language ?? 'ko');
    res.json({ success: true, data: await readStoreAiReadiness(db, org, language) });
  }));
  router.get('/ai-context/:listingId', requireAuth, storeAccess, apiLimiter, handle(async (req, res, org) => {
    const id = z.string().uuid().parse(req.params.listingId);
    const language = aiContextLanguage.parse(req.query.language ?? 'ko');
    const data = await readStoreProductAiContext(db, org, id, language);
    if (!data) { res.status(404).json({ success: false, code: 'REGISTERED_PRODUCT_REQUIRED' }); return; }
    res.json({ success: true, data });
  }));
}
