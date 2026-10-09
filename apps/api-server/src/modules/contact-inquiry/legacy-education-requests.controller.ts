/** Existing education inquiries remain in their ledger and are handled by study operators. */
import { Router } from 'express';
import type { Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { ContactRequest, type ContactRequestStatus } from '../../entities/ContactRequest.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import { requireServiceLegalScope } from '../service-legal/service-legal-scope.js';

const statuses: readonly ContactRequestStatus[] = ['pending', 'reviewing', 'done'];
const owned = { service_key: 'kpa-society', type: 'education' as const };
const validId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const lectureOnly: RequestHandler = (req, res, next) => {
  if (req.params.serviceKey !== 'lecture') {
    res.status(404).json({ success: false, error: { code: 'UNKNOWN_SERVICE', message: '지원하지 않는 서비스입니다.' } });
    return;
  }
  next();
};
function positiveNumber(value: unknown, fallback: number, maximum: number) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), maximum) : fallback;
}
function notFound(res: Response) {
  return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '문의를 찾을 수 없습니다.' } });
}
function listRow(row: ContactRequest) {
  return { id: row.id, name: row.name, organizationName: row.organization_name, subject: row.subject,
    status: row.status, createdAt: row.createdAt };
}

export function createLegacyEducationRequestController(dataSource: DataSource): Router {
  const router = Router();
  const repo = () => dataSource.getRepository(ContactRequest);
  const guards = [authenticate, lectureOnly, requireServiceLegalScope('operator')];
  const base = '/:serviceKey/legacy-education-requests';

  router.get(base, ...guards, asyncHandler(async (req: Request, res: Response) => {
    const page = positiveNumber(req.query.page, 1, 100000);
    const limit = positiveNumber(req.query.limit, 20, 100);
    const status = statuses.includes(req.query.status as ContactRequestStatus) ? req.query.status as ContactRequestStatus : undefined;
    const [rows, total] = await repo().findAndCount({ where: { ...owned, ...(status ? { status } : {}) },
      order: { createdAt: 'DESC' }, skip: (page - 1) * limit, take: limit });
    res.json({ success: true, data: { items: rows.map(listRow), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } });
  }));
  router.get(`${base}/:id`, ...guards, asyncHandler(async (req: Request, res: Response) => {
    if (!validId.test(req.params.id)) { notFound(res); return; }
    const row = await repo().findOne({ where: { ...owned, id: req.params.id } });
    if (!row) { notFound(res); return; }
    res.json({ success: true, data: { ...listRow(row), email: row.email, phone: row.phone, message: row.message } });
  }));
  router.patch(`${base}/:id/status`, ...guards, asyncHandler(async (req: Request, res: Response) => {
    const status = req.body?.status;
    if (!statuses.includes(status)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: '유효하지 않은 상태입니다.' } });
      return;
    }
    if (!validId.test(req.params.id)) { notFound(res); return; }
    const result = await repo().update({ ...owned, id: req.params.id }, { status });
    if (!result.affected) { notFound(res); return; }
    res.json({ success: true, data: { id: req.params.id, status } });
  }));
  return router;
}
