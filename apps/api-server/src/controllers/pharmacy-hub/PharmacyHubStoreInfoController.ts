/**
 * Pharmacy-Hub Store Info Controller — 매장 정보 조회·수정
 *
 * WO-PHARMACY-HUB-STORE-INFO-AND-ACCOUNT-V1
 *
 *   GET   /api/v1/pharmacy-hub/store-owner/info    내 매장 정보 조회
 *   PATCH /api/v1/pharmacy-hub/store-owner/info    내 매장 정보 수정 (allowlist)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SSOT
 *   매장 정보      organizations
 *   서비스 연결    organization_service_enrollments (service_code='pharmacy-hub')
 *   공개 매장 주소 platform_store_slugs
 *
 *   users.businessInfo 는 **매장 정보의 SSOT 가 아니다.** 가입 신청 시점의 신청자
 *   기재 사항이며, 이 화면은 그것을 읽지도 복제하지도 않는다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 조직 결정 (보안 계약)
 *   클라이언트가 보낸 organizationId 는 신뢰하지 않는다. 조회·수정 모두
 *   resolvePharmacyHubStoreOrganization(인증 사용자) 이 결정한 조직만 대상으로 한다.
 *   → 다른 서비스(KPA/K-Cosmetics/Neture) 조직은 이 경로로 조회·수정될 수 없다.
 *
 *   0개      : status='not_connected'  (GET 200 안내 / PATCH 409 STORE_NOT_CONNECTED)
 *   2개 이상 : status='ambiguous'      (GET 200 안내 / PATCH 409 AMBIGUOUS_STORE_CONNECTION)
 *   1개      : 조회·수정 수행
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 수정 허용 필드 (allowlist — 이 목록 밖은 서버가 거부한다)
 *   name · phone · address · addressDetail · description
 *
 *   읽기 전용으로 두는 이유:
 *     code             조직 식별자. 매장 임의 변경 대상 아님
 *     businessNumber   가입 심사 근거. 변경은 운영자 경로 (K-Cosmetics 정책과 동일)
 *     slug             공개 매장 주소. 전역 유일성 자원이라 매장 단독 변경 금지
 *     isActive         서비스 연결·활성 상태. governance 영역
 *
 *   schema 변경·migration·신규 테이블 0. 기존 컬럼만 사용한다.
 */
import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import logger from '../../utils/logger.js';
import {
  resolvePharmacyHubStoreOrganization,
  type StoreAddressDetail,
  type StoreOrgResolution,
  type StoreOrgRow,
} from './store-organization.resolver.js';

/** PATCH 로 수정할 수 있는 필드 — 이 배열이 유일한 근거다. */
const EDITABLE_FIELDS = ['name', 'phone', 'address', 'addressDetail', 'description'] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];

/** allowlist 필드 → 실제 컬럼명 (DB 는 snake_case 확장 컬럼) */
const COLUMN_OF: Record<EditableField, string> = {
  name: 'name',
  phone: 'phone',
  address: 'address',
  addressDetail: 'address_detail',
  description: 'description',
};

const MAX_LENGTH: Record<string, number> = {
  name: 255,
  phone: 50,
  address: 500,
  description: 2000,
  zipCode: 10,
  baseAddress: 300,
  detailAddress: 200,
  region: 50,
};

function view(resolution: StoreOrgResolution) {
  if (resolution.status !== 'connected') {
    return {
      store: {
        status: resolution.status,
        candidateCount: resolution.candidateCount,
        ...(resolution.status === 'ambiguous' ? { errorCode: resolution.errorCode } : {}),
        organizationId: null,
        name: null,
        code: null,
        address: null,
        addressDetail: null,
        phone: null,
        businessNumber: null,
        description: null,
        isActive: null,
        updatedAt: null,
      },
      enrollment: null,
      publicStore: null,
      editableFields: [] as string[],
    };
  }

  const org: StoreOrgRow = resolution.org;
  return {
    store: {
      status: 'connected' as const,
      candidateCount: 1,
      organizationId: org.id,
      name: org.name,
      code: org.code,
      address: org.address,
      addressDetail: org.addressDetail,
      phone: org.phone,
      businessNumber: org.businessNumber,
      description: org.description,
      isActive: org.isActive,
      updatedAt: org.updatedAt,
    },
    enrollment: {
      serviceCode: 'pharmacy-hub',
      status: org.enrollmentStatus,
      enrolledAt: org.enrolledAt,
    },
    publicStore: org.slug
      ? { slug: org.slug, isActive: org.slugActive ?? true }
      : { slug: null, isActive: null },
    editableFields: [...EDITABLE_FIELDS],
  };
}

/**
 * 문자열 필드 정규화: trim 후 빈 문자열은 null (컬럼 nullable).
 * 문자열도 null 도 아니면 undefined 를 돌려 호출부가 형식 오류로 처리하게 한다.
 */
function normalizeText(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export class PharmacyHubStoreInfoController {
  /** GET /store-owner/info */
  static async get(req: Request, res: Response): Promise<any> {
    const userId = (req as any).user?.id;
    if (typeof userId !== 'string' || userId.length === 0) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      return res.json({ success: true, data: view(resolution) });
    } catch (error) {
      logger.error('[PharmacyHubStoreInfo] get failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({
        success: false,
        error: '매장 정보를 불러오지 못했습니다.',
        code: 'STORE_INFO_LOAD_FAILED',
      });
    }
  }

  /** PATCH /store-owner/info — allowlist 필드만, 서버가 결정한 조직만 */
  static async update(req: Request, res: Response): Promise<any> {
    const userId = (req as any).user?.id;
    if (typeof userId !== 'string' || userId.length === 0) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({
        success: false,
        error: '요청 본문이 올바르지 않습니다.',
        code: 'INVALID_BODY',
      });
    }

    // allowlist 밖 키는 조용히 무시하지 않고 거부한다 —
    // 특히 organizationId 를 보내면 "다른 조직이 수정된다"고 오해할 수 있으므로 명시적으로 막는다.
    const unknownKeys = Object.keys(body).filter(
      (k) => !(EDITABLE_FIELDS as readonly string[]).includes(k),
    );
    if (unknownKeys.length > 0) {
      return res.status(400).json({
        success: false,
        error: `수정할 수 없는 항목입니다: ${unknownKeys.join(', ')}`,
        code: 'FIELD_NOT_EDITABLE',
      });
    }

    // ── 값 검증 ──
    const patch: Partial<Record<EditableField, string | null | StoreAddressDetail>> = {};
    const errors: string[] = [];

    for (const field of ['name', 'phone', 'address', 'description'] as const) {
      if (!(field in body)) continue;
      const normalized = normalizeText(body[field]);
      if (normalized === undefined) {
        errors.push(`${field} 값의 형식이 올바르지 않습니다.`);
        continue;
      }
      if (normalized !== null && normalized.length > MAX_LENGTH[field]) {
        errors.push(`${field} 은(는) ${MAX_LENGTH[field]}자를 넘을 수 없습니다.`);
        continue;
      }
      patch[field] = normalized;
    }

    // 매장명은 비울 수 없다 (NOT NULL 컬럼이며 화면 식별의 근거)
    if ('name' in patch && (patch.name === null || patch.name === '')) {
      errors.push('매장명은 비워 둘 수 없습니다.');
    }

    if ('addressDetail' in body) {
      const raw = body.addressDetail;
      if (raw === null) {
        patch.addressDetail = null;
      } else if (typeof raw !== 'object' || Array.isArray(raw)) {
        errors.push('주소 상세 형식이 올바르지 않습니다.');
      } else {
        const detail: StoreAddressDetail = {};
        for (const key of ['zipCode', 'baseAddress', 'detailAddress', 'region'] as const) {
          if (!(key in raw)) continue;
          const normalized = normalizeText(raw[key]);
          if (normalized === undefined) {
            errors.push(`주소 상세의 ${key} 형식이 올바르지 않습니다.`);
            continue;
          }
          if (normalized !== null) {
            if (normalized.length > MAX_LENGTH[key]) {
              errors.push(`주소 상세의 ${key} 이(가) 너무 깁니다.`);
              continue;
            }
            detail[key] = normalized;
          }
        }
        patch.addressDetail = Object.keys(detail).length > 0 ? detail : null;
      }
    }

    if (errors.length > 0) {
      return res
        .status(400)
        .json({ success: false, error: errors.join(' '), code: 'VALIDATION_FAILED' });
    }

    const fields = Object.keys(patch) as EditableField[];
    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: '변경할 항목이 없습니다.',
        code: 'NO_CHANGES',
      });
    }

    try {
      // 조직은 **여기서** 서버가 결정한다. 클라이언트 입력은 대상 선택에 관여하지 않는다.
      const resolution = await resolvePharmacyHubStoreOrganization(userId);

      if (resolution.status === 'not_connected') {
        return res.status(409).json({
          success: false,
          error: '연결된 매장이 없습니다. 운영자에게 매장 연결을 요청해 주세요.',
          code: 'STORE_NOT_CONNECTED',
        });
      }
      if (resolution.status === 'ambiguous') {
        return res.status(409).json({
          success: false,
          error: '연결된 매장이 여러 개로 확인됩니다. 운영자 확인이 필요합니다.',
          code: 'AMBIGUOUS_STORE_CONNECTION',
        });
      }

      const sets: string[] = [];
      const params: any[] = [];
      let idx = 1;
      for (const field of fields) {
        const value = patch[field];
        if (field === 'addressDetail') {
          sets.push(`address_detail = $${idx}::jsonb`);
          params.push(value === null ? null : JSON.stringify(value));
        } else {
          sets.push(`${COLUMN_OF[field]} = $${idx}`);
          params.push(value);
        }
        idx += 1;
      }
      sets.push(`"updatedAt" = NOW()`);
      params.push(resolution.organizationId);

      await AppDataSource.query(
        `UPDATE organizations SET ${sets.join(', ')} WHERE id = $${idx}::uuid`,
        params,
      );

      logger.info('[PharmacyHubStoreInfo] updated', {
        userId,
        organizationId: resolution.organizationId,
        fields,
      });

      // 저장 후 상태는 다시 읽어서 돌려준다 (프론트가 낙관적으로 만들어 낸 값을 쓰지 않는다).
      const after = await resolvePharmacyHubStoreOrganization(userId);
      return res.json({ success: true, data: view(after) });
    } catch (error) {
      logger.error('[PharmacyHubStoreInfo] update failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({
        success: false,
        error: '매장 정보를 저장하지 못했습니다.',
        code: 'STORE_INFO_UPDATE_FAILED',
      });
    }
  }
}
