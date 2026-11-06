import { Router, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import type { DataSource } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import {
  authenticate,
  type AuthRequest,
} from '../middleware/auth.middleware.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { OperationError } from '../services/operations/operation-audit.js';
import { MemberRegistrationService } from '../services/admin/member-registration.service.js';
import { memberRegistrationSchema } from '../services/admin/member-registration-contract.js';
import { memberWorkspaceAccess } from '../services/admin/central-member-workspace.service.js';
import { assertRecoverableTarget } from '../services/admin/member-identity-guards.js';
import {
  assertRegistrationDocument,
  readRegistrationView,
} from '../services/admin/member-registration-data.js';
import { BusinessRegistrationDocumentService } from '../modules/neture-pharmacy/services/business-registration-document.service.js';
import { PolicyAcceptanceError } from '../modules/policy-acceptance/policy-acceptance.service.js';
import { NeturePharmacyError } from '../modules/neture-pharmacy/constants.js';

const version = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}$/);
const command = z
  .object({ version, reason: z.string().trim().min(1).max(2000) })
  .strict();
const policies = z
  .array(
    z
      .object({
        policyDocumentId: z.string().uuid(),
        version: z.number().int().positive(),
        documentType: z.enum(['terms', 'privacy']),
      })
      .strict(),
  )
  .max(2)
  .optional();
const upload = multer({
  storage: multer.memoryStorage(),
  // Bound both the file buffer and non-file multipart allocations before storage work.
  limits: {
    fileSize: 8_000_000,
    files: 1,
    fields: 0,
    parts: 2,
    headerPairs: 100,
  },
}).single('file');
function fail(error: unknown, res: Response) {
  if (error instanceof OperationError) {
    res
      .status(error.status)
      .json({ success: false, code: error.code, error: error.message });
    return;
  }
  if (error instanceof PolicyAcceptanceError) {
    res
      .status(error.httpStatus)
      .json({ success: false, code: error.code, error: error.message });
    return;
  }
  if (error instanceof NeturePharmacyError) {
    res
      .status(error.httpStatus)
      .json({ success: false, code: error.code, error: error.message });
    return;
  }
  if (error instanceof z.ZodError) {
    res.status(400).json({
      success: false,
      code: 'INVALID_REGISTRATION_INPUT',
      error: error.issues[0]?.message ?? '입력 정보를 확인해 주세요.',
    });
    return;
  }
  if (error instanceof multer.MulterError) {
    res.status(400).json({
      success: false,
      code: 'INVALID_DOCUMENT',
      error: '8MB 이하 파일 한 개만 선택해 주시기 바랍니다.',
    });
    return;
  }
  res.status(503).json({
    success: false,
    code: 'MEMBER_REGISTRATION_UNAVAILABLE',
    error: '처리하지 못했습니다. 최신 정보와 권한을 확인해 주시기 바랍니다.',
  });
}
/** Identity middleware is common; central commands additionally require Google + current delegated authority. */
export function createMemberRegistrationRoutes(
  db: DataSource = AppDataSource,
  documents = () => new BusinessRegistrationDocumentService(db),
) {
  const router = Router(),
    service = new MemberRegistrationService(db);
  router.use(authenticate, apiLimiter, (_req, res, next) => {
    res.setHeader('Cache-Control', 'private, no-store');
    next();
  });
  const handle =
    (work: (req: AuthRequest) => Promise<unknown>) =>
    async (req: AuthRequest, res: Response) => {
      try {
        res.json({ success: true, data: await work(req) });
      } catch (error) {
        fail(error, res);
      }
    };
  const target = (req: AuthRequest) =>
    z.string().uuid().parse(req.params.userId);
  const central = async (req: AuthRequest, write = false) => {
    if ((req as AuthRequest & { authMethod?: string }).authMethod !== 'google')
      throw new OperationError(
        403,
        'GOOGLE_SESSION_REQUIRED',
        '중앙 운영은 Google 로그인이 필요합니다.',
      );
    const access = await memberWorkspaceAccess(db, req.user!.id);
    if (write)
      await assertRecoverableTarget(
        db,
        target(req),
        access.manageAccount,
        false,
      );
    return target(req);
  };
  router.get(
    '/self',
    handle((req) => service.self(req.user!.id)),
  );
  router.get(
    '/completion',
    handle(async (req) => {
      const [row] = await db.query(
        `SELECT ("businessInfo"::jsonb->'o4oMembershipRegistrationV1'->>'state'='pending'
      AND "businessInfo"::jsonb->'o4oMembershipRegistrationV1'->>'type' IS NULL) AS required FROM users WHERE id=$1`,
        [req.user!.id],
      );
      return { requiresRegistration: row?.required === true };
    }),
  );
  router.post(
    '/self',
    handle((req) => {
      const extra = z.object({
        name: z.string().trim().min(1).max(100),
        nickname: z.string().trim().min(1).max(100),
        phone: z.string().trim().max(20),
        version,
        policyReferences: policies,
      });
      const input = z
        .object({
          ...memberRegistrationSchema.innerType().shape,
          ...extra.shape,
        })
        .strict()
        .parse(req.body);
      memberRegistrationSchema.parse({
        type: input.type,
        fields: input.fields,
      });
      return service.submit(
        req.user!.id,
        input as Parameters<typeof service.submit>[1],
      );
    }),
  );
  router.get(
    '/policies/:type',
    handle(async (req) => {
      const type = memberRegistrationSchema.parse({
        type: req.params.type,
        fields: {},
      }).type;
      return (await service.policies(type)).map((d) => ({
        policyDocumentId: d.id,
        serviceKey: d.service_key,
        documentType: d.document_type,
        version: Number(d.version),
        title: d.title,
        content: d.content,
      }));
    }),
  );
  for (const action of ['approve', 'reject'] as const)
    router.post(
      `/members/:userId/${action}`,
      handle(async (req) => {
        const id = await central(req, true),
          input = command.parse(req.body);
        return service.decide(req.user!.id, id, {
          reason: input.reason!,
          version: input.version!,
          action,
        });
      }),
    );
  const authorizeDocument = async (req: AuthRequest, write: boolean) => {
    const id = req.params.userId ? await central(req, write) : req.user!.id;
    if (!req.params.userId && write) {
      await assertRecoverableTarget(db, id, false, false);
      if ((await readRegistrationView(db, id))?.state === 'approved')
        throw new OperationError(
          409,
          'REGISTRATION_ALREADY_APPROVED',
          '승인 후 서류 변경은 My Home의 해당 절차를 이용해 주시기 바랍니다.',
        );
    }
    return id;
  };
  for (const path of ['/self/document', '/members/:userId/document']) {
    router.post(path, async (req: AuthRequest, res: Response) => {
      try {
        const id = await authorizeDocument(req, true);
        await new Promise<void>((resolve, reject) =>
          upload(req, res, (error) => (error ? reject(error) : resolve())),
        );
        res.json({
          success: true,
          data: await documents().upload(id, req.file),
        });
      } catch (error) {
        fail(error, res);
      }
    });
  }
  for (const path of [
    '/self/document/:documentId',
    '/members/:userId/document/:documentId',
  ]) {
    router.get(
      path,
      async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
          const id = await authorizeDocument(req, false),
            documentId = z.string().uuid().parse(req.params.documentId);
          await assertRegistrationDocument(db, id, {
            businessRegistrationDocumentId: documentId,
          });
          const { document, stream } = await documents().read(documentId);
          res.setHeader(
            'Content-Type',
            document.mimeType || 'application/octet-stream',
          );
          res.setHeader(
            'Content-Disposition',
            'attachment; filename="business-registration"',
          );
          stream.once('error', () => {
            if (!res.headersSent) res.status(503).end();
            else res.destroy();
          });
          stream.pipe(res);
        } catch (error) {
          if (res.headersSent) next(error);
          else fail(error, res);
        }
      },
    );
  }
  return router;
}
