/**
 * Store Product Request Controller — 매장 신규 상품 등록 요청 (P1: 제출·중복검색·상태)
 *
 * WO-O4O-KPA-STORE-NEW-PRODUCT-REQUEST-AND-ADMIN-APPROVAL-V1 (Phase 1)
 * 설계: docs/investigations/IR-O4O-KPA-STORE-NEW-PRODUCT-REQUEST-AND-ADMIN-APPROVAL-V1.md
 *
 * 매장(Store Owner)이 O4O DB 에 없는 신규 상품의 등록을 "요청"한다.
 * 저장소는 기존 product_candidates(source_type='store_web') 를 재사용하며,
 * 이 컨트롤러는 그 위의 wiring(매장 제출/상태 UI 엔드포인트)만 제공한다.
 * 관리자 candidate 콘솔 코어(/api/v1/operator/product-candidates)는 건드리지 않는다.
 *
 * GET  /               — 내 매장 신규 상품 등록 요청 목록 (org 스코프 + 매장 표시 상태)
 * POST /               — 요청 제출 (createCandidate: store_web)
 * PUT  /:id            — 보완 요청(revision_requested) 상태에서만 수정 후 재제출 → pending
 *
 * 인증: requireAuth + requireStoreOwner (organization_members 기반, req.organizationId 주입)
 *
 * 제외(WO): 상세설명서·허가번호·가격·재고·배송 미수신. 관리자 승인/자동연결/알림은 P2/P3.
 */

import { Router, Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { IsNull } from 'typeorm';
import { ProductCandidate, type ProductCandidateStatus } from '../../../modules/neture/entities/ProductCandidate.entity.js';
import { ProductCandidateService } from '../../../modules/neture/services/product-candidate.service.js';
import { notifyAdminsOfStoreProductRequest } from '../../../modules/neture/services/store-product-request-notify.js';
import { PRODUCT_CLASSIFICATION_CODES, classificationLabel, type ProductClassification } from '../../../modules/neture/utils/product-type.util.js';
import { inferIdentifierTypeFromBarcode, normalizeIdentifier, sanitizeIdentifierValue } from '../../../modules/neture/utils/product-identifier.util.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { createRequireStoreOwner } from '../../../utils/store-owner.utils.js';
import logger from '../../../utils/logger.js';

// 출처 라벨 — external_api(공공 seed) / operator import 등과 매장 요청을 구분하는 고정 태그.
const STORE_REQUEST_SOURCE_LABEL = 'kpa-store-product-request';

// ── 서비스 스코프 도출 (candidate.service_key) ─────────────────────────────
// service_memberships.service_key → candidate.service_key (organization_product_listings 와 동일 규칙).
// store-product-library.controller.ts 의 deriveListingServiceKey 와 정합.
const MEMBERSHIP_KEY_TO_SERVICE_KEY: Record<string, string> = {
  'kpa-society': 'kpa',
  'glycopharm': 'glycopharm',
  'neture': 'neture',
  'k-cosmetics': 'cosmetics',
};
const MULTI_MEMBERSHIP_PRIORITY = ['neture', 'kpa-society', 'glycopharm', 'k-cosmetics'];

interface MembershipLike { serviceKey: string; status: string }

function deriveServiceKey(req: Request): string | null {
  const memberships: MembershipLike[] = (req as any).user?.memberships ?? [];
  const active = memberships.filter((m) => m?.status === 'active');
  if (active.length === 0) return null;
  if (active.length === 1) return MEMBERSHIP_KEY_TO_SERVICE_KEY[active[0].serviceKey] ?? null;
  for (const key of MULTI_MEMBERSHIP_PRIORITY) {
    if (active.some((m) => m.serviceKey === key)) return MEMBERSHIP_KEY_TO_SERVICE_KEY[key] ?? null;
  }
  return MEMBERSHIP_KEY_TO_SERVICE_KEY[active[0].serviceKey] ?? null;
}

// ── 매장 표시 상태(4버킷) ↔ candidate_status 매핑 (IR §3) ──────────────────
type StoreDisplayStatus = 'reviewing' | 'revision_requested' | 'registered' | 'rejected';

const STORE_DISPLAY_STATUS_LABELS: Record<StoreDisplayStatus, string> = {
  reviewing: '검토 중',
  revision_requested: '보완 요청',
  registered: '등록 완료',
  rejected: '등록 불가',
};

function toStoreDisplayStatus(status: ProductCandidateStatus): StoreDisplayStatus {
  switch (status) {
    case 'pending':
    case 'reviewing':
      return 'reviewing';
    case 'revision_requested':
      return 'revision_requested';
    case 'matched':
    case 'linked':
    case 'approved_new_master':
      return 'registered';
    case 'rejected':
    case 'merged':
    case 'archived':
    default:
      return 'rejected';
  }
}

function isValidClassification(code: unknown): code is ProductClassification {
  return typeof code === 'string' && (PRODUCT_CLASSIFICATION_CODES as string[]).includes(code);
}

// 요청 본문 → candidate 매핑 결과(생성/수정 공용)
interface RequestFields {
  productName: string;
  classification: ProductClassification;
  manufacturer: string | null;
  spec: string | null;
  unit: string | null;
  imageUrl: string | null;
  barcode: string | null;
  noBarcode: boolean;
}

/**
 * 요청 본문 검증·정규화. 실패 시 { error: {code, message} } 반환.
 * 정책: 바코드는 절대 필수 아님(있으면 정규화·중복검사, 없으면 명시적 noBarcode 체크 필수).
 *       분류는 자유입력 금지 — 표준 분류 코드만 허용. 이미지 없어도 제출 가능.
 */
function parseRequestBody(body: any): { fields: RequestFields } | { error: { code: string; message: string } } {
  const productName = typeof body?.productName === 'string' ? body.productName.trim() : '';
  if (!productName) {
    return { error: { code: 'INVALID_INPUT', message: '포장 표시 상품명을 입력하세요.' } };
  }
  if (productName.length > 255) {
    return { error: { code: 'INVALID_INPUT', message: '상품명은 255자 이하로 입력하세요.' } };
  }

  const classification = body?.classification;
  if (!isValidClassification(classification)) {
    return { error: { code: 'INVALID_CLASSIFICATION', message: 'O4O 표준 분류를 선택하세요.' } };
  }

  const noBarcode = body?.noBarcode === true;
  const rawBarcode = typeof body?.barcode === 'string' ? sanitizeIdentifierValue(body.barcode) : '';
  const barcode = rawBarcode || null;

  // 바코드 없으면 명시적 '바코드 없음' 체크 필수 (오입력 방지)
  if (!barcode && !noBarcode) {
    return { error: { code: 'BARCODE_REQUIRED_OR_NONE', message: '바코드를 입력하거나 ‘바코드 없음’을 선택하세요.' } };
  }
  if (barcode && barcode.length > 128) {
    return { error: { code: 'INVALID_INPUT', message: '바코드 형식이 올바르지 않습니다.' } };
  }

  const trimOrNull = (v: unknown, max: number): string | null => {
    if (typeof v !== 'string') return null;
    const t = v.trim();
    if (!t) return null;
    return t.slice(0, max);
  };

  return {
    fields: {
      productName: productName.slice(0, 255),
      classification,
      manufacturer: trimOrNull(body?.manufacturer, 255),
      spec: trimOrNull(body?.spec, 255),
      unit: trimOrNull(body?.unit, 64),
      imageUrl: trimOrNull(body?.imageUrl, 2000),
      barcode: barcode,
      // barcode 가 있으면 noBarcode 는 무시(false 로 정규화)
      noBarcode: barcode ? false : noBarcode,
    },
  };
}

/** candidate row → 매장 요청 DTO */
function toRequestDto(c: ProductCandidate) {
  const displayStatus = toStoreDisplayStatus(c.candidateStatus);
  const classificationCode = (c.candidateCategory || (c.rawPayload?.classification as string) || 'unknown') as ProductClassification;
  return {
    id: c.id,
    productName: c.candidateName,
    classification: {
      code: classificationCode,
      label: classificationLabel(classificationCode),
    },
    manufacturer: c.candidateManufacturer,
    spec: c.candidateSpec,
    unit: c.candidateUnit,
    barcode: c.identifierValue,
    noBarcode: c.rawPayload?.noBarcode === true,
    imageUrl: c.candidateImageUrl,
    displayStatus,
    displayStatusLabel: STORE_DISPLAY_STATUS_LABELS[displayStatus],
    // 보완 요청 시 관리자 메모(매장 표시). 그 외 상태에서는 노출하지 않는다.
    reviewNote: displayStatus === 'revision_requested' ? c.reviewNote : null,
    matchedProductMasterId: c.matchedProductMasterId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    // 재제출 가능 여부
    editable: displayStatus === 'revision_requested',
  };
}

export function createStoreProductRequestController(dataSource: DataSource): Router {
  const router = Router();
  // WO-O4O-STORE-OWNER-BACKCOMPAT-SERVICEKEY-MIGRATION-V1 §3
  // `/api/v1/store/product-requests` 소비처는 services/web-kpa-society 뿐이다
  // (admin-dashboard 는 `/api/v1/operator/store-product-requests` 를 쓴다).
  const requireStoreOwner = createRequireStoreOwner(dataSource, 'kpa');
  const candidateRepo = dataSource.getRepository(ProductCandidate);
  const candidateService = new ProductCandidateService(dataSource);

  // ─── GET / — 내 매장 신규 상품 등록 요청 목록 ──────────────────────────
  router.get('/', requireAuth, requireStoreOwner as RequestHandler, asyncHandler(async (req: Request, res: Response) => {
    const organizationId = (req as any).organizationId as string | null;
    if (!organizationId) {
      return res.status(403).json({ success: false, error: { code: 'NO_ORGANIZATION', message: '매장(조직) 정보가 없어 요청 목록을 조회할 수 없습니다.' } });
    }

    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const [items, total] = await candidateRepo.findAndCount({
      where: {
        organizationId,
        sourceType: 'store_web',
        sourceLabel: STORE_REQUEST_SOURCE_LABEL,
        deletedAt: IsNull(),
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    res.json({
      success: true,
      data: items.map(toRequestDto),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }));

  // ─── POST / — 요청 제출 ───────────────────────────────────────────────
  router.post('/', requireAuth, requireStoreOwner as RequestHandler, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id as string | undefined;
    const organizationId = (req as any).organizationId as string | null;
    if (!organizationId) {
      return res.status(403).json({ success: false, error: { code: 'NO_ORGANIZATION', message: '매장(조직) 정보가 없어 요청을 제출할 수 없습니다.' } });
    }

    const parsed = parseRequestBody(req.body);
    if ('error' in parsed) {
      return res.status(400).json({ success: false, error: parsed.error });
    }
    const f = parsed.fields;

    // 바코드가 있으면 중복검사 — 이미 O4O 표준 상품에 존재하면 신규 요청 대신 기존 상품 추가 유도.
    if (f.barcode) {
      const existing: Array<{ id: string; name: string }> = await dataSource.query(
        `SELECT id, name FROM product_masters WHERE barcode = $1 AND deleted_at IS NULL LIMIT 1`,
        [f.barcode],
      );
      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'EXISTING_PRODUCT_FOUND',
            message: '이미 O4O 표준 상품에 등록된 바코드입니다. 기존 상품을 매장 경영활용 제품으로 추가하세요.',
          },
          data: { masterId: existing[0].id, name: existing[0].name },
        });
      }
    }

    const serviceKey = deriveServiceKey(req);
    const identifierType = f.barcode ? inferIdentifierTypeFromBarcode(f.barcode) : null;

    const candidate = await candidateService.createCandidate({
      sourceType: 'store_web',
      sourceLabel: STORE_REQUEST_SOURCE_LABEL,
      organizationId,
      serviceKey: serviceKey ?? undefined,
      submittedBy: userId ?? null,
      identifierType,
      identifierValue: f.barcode,
      candidateName: f.productName,
      candidateManufacturer: f.manufacturer,
      candidateCategory: f.classification, // 표준 분류 코드 저장
      candidateSpec: f.spec,
      candidateUnit: f.unit,
      candidateImageUrl: f.imageUrl,
      rawPayload: {
        source: 'kpa_store_web',
        classification: f.classification,
        noBarcode: f.noBarcode,
      },
    });

    logger.info(`[StoreProductRequest] Submitted: id=${candidate.id}, org=${organizationId}, by=${userId}`);
    // P3: 관리자/운영자 알림 (커밋 후 fire-and-forget, best-effort — 실패해도 제출 성공에 영향 없음)
    void notifyAdminsOfStoreProductRequest(dataSource, {
      serviceKey: serviceKey ?? null, requestId: candidate.id, productName: f.productName,
      actorId: userId ?? null, organizationId,
    });
    res.status(201).json({ success: true, data: toRequestDto(candidate) });
  }));

  // ─── PUT /:id — 보완 요청 건 수정 후 재제출 (revision_requested → pending) ──
  router.put('/:id', requireAuth, requireStoreOwner as RequestHandler, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id as string | undefined;
    const organizationId = (req as any).organizationId as string | null;
    const { id } = req.params;
    if (!organizationId) {
      return res.status(403).json({ success: false, error: { code: 'NO_ORGANIZATION', message: '매장(조직) 정보가 없어 요청을 수정할 수 없습니다.' } });
    }

    const candidate = await candidateRepo.findOne({
      where: { id, sourceType: 'store_web', sourceLabel: STORE_REQUEST_SOURCE_LABEL, deletedAt: IsNull() },
    });
    if (!candidate) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '요청을 찾을 수 없습니다.' } });
    }
    // org 경계 + 제출자 검증
    if (candidate.organizationId !== organizationId) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '다른 매장의 요청은 수정할 수 없습니다.' } });
    }
    if (candidate.submittedBy && userId && candidate.submittedBy !== userId) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '본인이 제출한 요청만 수정할 수 있습니다.' } });
    }
    // 보완 요청 상태에서만 재제출 허용
    if (candidate.candidateStatus !== 'revision_requested') {
      return res.status(409).json({ success: false, error: { code: 'NOT_EDITABLE', message: '보완 요청 상태의 요청만 수정·재제출할 수 있습니다.' } });
    }

    const parsed = parseRequestBody(req.body);
    if ('error' in parsed) {
      return res.status(400).json({ success: false, error: parsed.error });
    }
    const f = parsed.fields;

    // 바코드 변경 시 중복검사 재실행
    if (f.barcode && f.barcode !== candidate.identifierValue) {
      const existing: Array<{ id: string; name: string }> = await dataSource.query(
        `SELECT id, name FROM product_masters WHERE barcode = $1 AND deleted_at IS NULL LIMIT 1`,
        [f.barcode],
      );
      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'EXISTING_PRODUCT_FOUND',
            message: '이미 O4O 표준 상품에 등록된 바코드입니다. 기존 상품을 매장 경영활용 제품으로 추가하세요.',
          },
          data: { masterId: existing[0].id, name: existing[0].name },
        });
      }
    }

    candidate.candidateName = f.productName;
    candidate.candidateManufacturer = f.manufacturer;
    candidate.candidateCategory = f.classification;
    candidate.candidateSpec = f.spec;
    candidate.candidateUnit = f.unit;
    candidate.candidateImageUrl = f.imageUrl;
    const nextIdentifierType = f.barcode ? inferIdentifierTypeFromBarcode(f.barcode) : null;
    candidate.identifierType = nextIdentifierType;
    candidate.identifierValue = f.barcode;
    candidate.normalizedIdentifierValue = f.barcode && nextIdentifierType
      ? normalizeIdentifier(nextIdentifierType as any, f.barcode)
      : null;
    candidate.rawPayload = {
      ...(candidate.rawPayload ?? {}),
      source: 'kpa_store_web',
      classification: f.classification,
      noBarcode: f.noBarcode,
      resubmittedAt: new Date().toISOString(),
    };
    // 재제출 → 검토 중으로 복귀. 관리자 검토 흔적은 다음 검토에서 갱신된다.
    candidate.candidateStatus = 'pending';

    const saved = await candidateRepo.save(candidate);
    logger.info(`[StoreProductRequest] Resubmitted: id=${id}, org=${organizationId}, by=${userId}`);
    // P3: 재제출도 검토 대상 복귀 → 관리자 재알림 (best-effort)
    void notifyAdminsOfStoreProductRequest(dataSource, {
      serviceKey: saved.serviceKey, requestId: saved.id, productName: f.productName,
      actorId: userId ?? null, organizationId,
    });
    res.json({ success: true, data: toRequestDto(saved) });
  }));

  return router;
}
