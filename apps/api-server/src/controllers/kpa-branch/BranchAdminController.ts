/**
 * BranchAdminController — 분회 registry 생성·정리 (canonical admin API)
 * WO-O4O-KPA-BRANCH-CANONICAL-BRANCH-CREATION-API-V1
 *
 * 그동안 신규 분회(kpa_organizations type='group') 를 만드는 런타임 경로가 0건이었고
 * 파일럿 분회는 raw SQL 로 들어갔다. 이 컨트롤러가 그 유일한 canonical write 경로다.
 *
 * 계약(불변식):
 *   - platform:super_admin 만 호출한다 (라우트에서 requireRole 로 고정. kpa-branch:admin 불가).
 *   - type='group' · is_active=true 는 서버가 고정한다. body 의 id/type/organizationId/isActive 는 무시.
 *   - slug 는 부분 UNIQUE(WHERE slug IS NOT NULL) — 충돌은 409 SLUG_CONFLICT 로 옮긴다.
 *   - parentId 는 표시용 optional. 존재하는 kpa_organizations 행이어야 하지만 권한 계산에 쓰지 않는다.
 *   - 생성만으로 branch_sites row 를 만들지 않는다 → 홈페이지는 자동으로 미게시(publicSite 404).
 *   - 운영자·회원(branch_memberships / service_memberships / credential / role) 을 자동 생성하지 않는다.
 *   - organizations(플랫폼 조직) 미러를 만들지 않는다 — 기존 209 분회도 미러 없이 동작한다.
 *   - 삭제는 오생성·취소 정리용 최소 계약이다: type='group' 이고 분회 하위 데이터가 전부 0행일 때만.
 *     cascade 없음. 하위 데이터가 있으면 409 BRANCH_IN_USE (테이블별 카운트 반환).
 *   - 기본정보 수정(PATCH) 은 name/parentId/description/address/phone 만. slug·type·is_active 는 이 경로로
 *     바꾸지 않는다 (slug 는 tenant URL 키 — 개통 후 변경은 별도 운영 절차). 대표 이메일은 kpa_organizations 가
 *     아니라 branch_sites.contact 에 있으므로 operator/site 로 관리한다.
 *     WO-O4O-KPA-BRANCH-NEW-TENANT-ONBOARDING-OPERATIONS-V1
 */
import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import {
  KpaOrganization,
  BRANCH_ORG_TYPE,
} from '../../routes/kpa-branch/entities/kpa-organization.entity.js';

/** URL tenant key 형식 — 소문자 영숫자 + 단일 하이픈 구분, 2~80자 (컬럼 varchar(80)) */
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SLUG_MIN = 2;
const SLUG_MAX = 80;
const NAME_MAX = 200;
const DESCRIPTION_MAX = 500;
const ADDRESS_MAX = 200;
const PHONE_MAX = 50;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 분회 하위 데이터 테이블 — organization_id 로 분회를 가리키는 모든 테이블.
 * FK(ON DELETE RESTRICT) 가 있는 5개 + FK 없이 organization_id 만 가진 5개.
 * 하나라도 행이 남아 있으면 삭제하지 않는다 (cascade 금지).
 */
const CHILD_TABLES = [
  'branch_memberships',
  'branch_sites',
  'branch_domains',
  'branch_posts',
  'annual_reports',
  'branch_officers',
  'branch_events',
  'branch_fee_policies',
  'branch_fee_ledgers',
  'branch_education_credit_ledgers',
] as const;

function bad(res: Response, error: string, code: string, details?: Record<string, unknown>) {
  return res.status(400).json({ success: false, error, code, ...(details ? { details } : {}) });
}

function toDto(o: KpaOrganization) {
  return {
    id: o.id,
    slug: o.slug,
    name: o.name,
    type: o.type,
    parentId: o.parent_id,
    description: o.description,
    address: o.address,
    phone: o.phone,
    isActive: o.is_active,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
  };
}

type OrgRepo = ReturnType<typeof AppDataSource.getRepository<KpaOrganization>>;

/** 선택 문자열 필드 검증 — undefined 는 "변경 없음", null/빈 문자열은 "비움". 실패 시 응답을 이미 보냈다. */
function optionalText(
  res: Response,
  body: Record<string, unknown>,
  key: string,
  max: number,
  code: string,
): { ok: true; value: string | null | undefined } | { ok: false } {
  const v = body[key];
  if (v === undefined) return { ok: true, value: undefined };
  if (v === null) return { ok: true, value: null };
  if (typeof v !== 'string' || v.length > max) {
    bad(res, `${key} 은(는) ${max}자 이하 문자열이어야 합니다.`, code);
    return { ok: false };
  }
  return { ok: true, value: v.trim() || null };
}

/** parentId 검증 — 표시용 상위 조직(지부/약사회). 존재·활성만 확인하고 권한 계산에는 쓰지 않는다. */
async function resolveParentId(
  res: Response,
  raw: unknown,
  repo: OrgRepo,
  selfId?: string,
): Promise<{ ok: true; value: string | null } | { ok: false }> {
  if (raw === null || raw === '') return { ok: true, value: null };
  if (typeof raw !== 'string' || !UUID_RE.test(raw)) {
    bad(res, 'parentId 는 UUID 여야 합니다.', 'INVALID_PARENT_ID');
    return { ok: false };
  }
  if (selfId && raw === selfId) {
    bad(res, '자기 자신을 상위 조직으로 지정할 수 없습니다.', 'INVALID_PARENT_ID');
    return { ok: false };
  }
  const parent = await repo.findOne({ where: { id: raw, is_active: true }, select: ['id'] });
  if (!parent) {
    bad(res, '상위 조직을 찾을 수 없습니다.', 'PARENT_NOT_FOUND');
    return { ok: false };
  }
  return { ok: true, value: parent.id };
}

export class BranchAdminController {
  /**
   * POST /api/v1/kpa-branch/admin/branches — 신규 분회 생성 (platform:super_admin)
   * body: { name, slug, parentId?, description? }
   */
  static async create(req: Request, res: Response) {
    const body = (req.body ?? {}) as Record<string, unknown>;

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > NAME_MAX) {
      return bad(res, `name 은 1~${NAME_MAX}자 문자열이어야 합니다.`, 'INVALID_NAME');
    }

    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    if (!slug || slug.length < SLUG_MIN || slug.length > SLUG_MAX || !SLUG_RE.test(slug)) {
      return bad(
        res,
        `slug 는 소문자 영숫자와 하이픈(-)으로 된 ${SLUG_MIN}~${SLUG_MAX}자여야 합니다.`,
        'INVALID_SLUG',
      );
    }

    const desc = optionalText(res, body, 'description', DESCRIPTION_MAX, 'INVALID_DESCRIPTION');
    if (!desc.ok) return;
    const description = desc.value ?? null;

    const repo = AppDataSource.getRepository(KpaOrganization);

    let parentId: string | null = null;
    if (body.parentId !== undefined) {
      const parent = await resolveParentId(res, body.parentId, repo);
      if (!parent.ok) return;
      parentId = parent.value;
    }

    const conflict = await repo.findOne({ where: { slug }, select: ['id', 'name', 'type', 'is_active'] });
    if (conflict) return slugConflict(res, slug, conflict);

    try {
      // type / is_active 는 body 와 무관하게 서버가 고정한다.
      const created = await repo.save(
        repo.create({ name, slug, type: BRANCH_ORG_TYPE, parent_id: parentId, description, is_active: true }),
      );
      // 생성 직후에는 branch_sites row 가 없다 — 명시적으로 미게시임을 알린다.
      return res.status(201).json({ success: true, data: { ...toDto(created), site: { isPublished: false } } });
    } catch (e) {
      // 사전 조회와 INSERT 사이의 경합 — 부분 UNIQUE 위반을 500 으로 새지 않게 한다.
      if ((e as { code?: string })?.code === '23505') {
        const existing = await repo.findOne({ where: { slug }, select: ['id', 'name', 'type', 'is_active'] });
        return slugConflict(res, slug, existing);
      }
      throw e;
    }
  }

  /**
   * PATCH /api/v1/kpa-branch/admin/branches/:id — 분회 기본정보 수정 (platform:super_admin)
   * body: { name?, parentId?, description?, address?, phone? } — 보낸 키만 바꾼다(null = 비움).
   * slug / type / is_active / id 는 무시한다.
   */
  static async update(req: Request, res: Response) {
    const id = String(req.params.id ?? '');
    if (!UUID_RE.test(id)) return bad(res, 'id 는 UUID 여야 합니다.', 'INVALID_ID');

    const repo = AppDataSource.getRepository(KpaOrganization);
    const org = await repo.findOne({ where: { id, type: BRANCH_ORG_TYPE } });
    if (!org) {
      return res.status(404).json({ success: false, error: '분회를 찾을 수 없습니다.', code: 'BRANCH_NOT_FOUND' });
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const patch: Partial<KpaOrganization> = {};

    if (body.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name || name.length > NAME_MAX) {
        return bad(res, `name 은 1~${NAME_MAX}자 문자열이어야 합니다.`, 'INVALID_NAME');
      }
      patch.name = name;
    }
    if (body.parentId !== undefined) {
      const parent = await resolveParentId(res, body.parentId, repo, org.id);
      if (!parent.ok) return;
      patch.parent_id = parent.value;
    }
    const desc = optionalText(res, body, 'description', DESCRIPTION_MAX, 'INVALID_DESCRIPTION');
    if (!desc.ok) return;
    if (desc.value !== undefined) patch.description = desc.value;
    const address = optionalText(res, body, 'address', ADDRESS_MAX, 'INVALID_ADDRESS');
    if (!address.ok) return;
    if (address.value !== undefined) patch.address = address.value;
    const phone = optionalText(res, body, 'phone', PHONE_MAX, 'INVALID_PHONE');
    if (!phone.ok) return;
    if (phone.value !== undefined) patch.phone = phone.value;

    if (Object.keys(patch).length === 0) {
      return bad(res, '수정할 필드가 없습니다 (name/parentId/description/address/phone).', 'NO_FIELDS');
    }

    const saved = await repo.save(repo.merge(org, patch));
    return res.json({ success: true, data: toDto(saved) });
  }

  /**
   * DELETE /api/v1/kpa-branch/admin/branches/:id — 오생성 분회 정리 (platform:super_admin)
   * 분회(type='group') 이고 하위 데이터가 전부 0행일 때만 삭제한다. cascade 없음.
   */
  static async remove(req: Request, res: Response) {
    const id = String(req.params.id ?? '');
    if (!UUID_RE.test(id)) return bad(res, 'id 는 UUID 여야 합니다.', 'INVALID_ID');

    const repo = AppDataSource.getRepository(KpaOrganization);
    // 분회 축(type) 을 함께 걸어 지부/약사회 행은 이 경로로 지울 수 없게 한다.
    const org = await repo.findOne({ where: { id, type: BRANCH_ORG_TYPE } });
    if (!org) {
      return res.status(404).json({ success: false, error: '분회를 찾을 수 없습니다.', code: 'BRANCH_NOT_FOUND' });
    }

    const inUse: Record<string, number> = {};
    for (const table of CHILD_TABLES) {
      const [{ n }] = (await AppDataSource.query(
        `SELECT count(*)::int AS n FROM "${table}" WHERE organization_id = $1`,
        [org.id],
      )) as Array<{ n: number }>;
      if (n > 0) inUse[table] = n;
    }
    if (Object.keys(inUse).length > 0) {
      return res.status(409).json({
        success: false,
        error: '분회에 연결된 데이터가 있어 삭제할 수 없습니다.',
        code: 'BRANCH_IN_USE',
        details: { id: org.id, slug: org.slug, inUse },
      });
    }

    await repo.delete({ id: org.id, type: BRANCH_ORG_TYPE });
    return res.json({ success: true, data: { id: org.id, slug: org.slug, name: org.name, deleted: true } });
  }
}

function slugConflict(res: Response, slug: string, existing: KpaOrganization | null) {
  return res.status(409).json({
    success: false,
    error: `slug '${slug}' 는 이미 사용 중입니다.`,
    code: 'SLUG_CONFLICT',
    details: existing
      ? { id: existing.id, name: existing.name, type: existing.type, isActive: existing.is_active }
      : { slug },
  });
}
