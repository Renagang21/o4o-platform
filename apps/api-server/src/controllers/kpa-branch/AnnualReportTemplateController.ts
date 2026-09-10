/**
 * AnnualReportTemplateController — 연도별 신상신고 양식 조회 (운영자)
 * WO-O4O-KPA-BRANCH-ANNUAL-REPORT-TEMPLATE-SCHEMA-V1
 *
 * 조회 전용이다. 본 WO 범위에 Template 편집·회원 제출은 없다.
 *
 * WO-O4O-KPA-BRANCH-TENANT-ONBOARDING-AND-MVP-PRODUCTION-E2E-V1 §9:
 *   연도별 양식 **개설**(openYear)과 **신고기간 설정**(updatePeriod)을 admin 축에 추가했다.
 *   그 전에는 `annual_report_templates` 의 유일한 write 경로가 migration 이어서,
 *   해가 바뀌면 개발자가 배포하기 전까지 신상신고·회비 축 전체가 멈췄다 (MUST_AUTOMATE).
 *
 *   추가한 것은 **연도 개설과 접수기간뿐이다.** 양식 본문(schema)을 HTTP 로 편집하지 않는다 —
 *   필드 정의는 여전히 직전 연도 복제 + migration 이 정본이고, 여기서는 복제만 한다.
 *   양식은 service_key 축 공통 자원이므로 분회 경계 가드를 붙이지 않는다(admin 전용).
 *
 * 경계:
 *   양식은 **서비스 전체 공통**(service_key 축)이므로 row 에 organization_id 가 없다.
 *   분회 경계는 라우터의 resolveBranch + requireBranchScope 가 "요청자가 그 분회의
 *   운영자인가"를 판정하는 데 쓰이고, 조회 결과 자체는 모든 분회가 동일하다.
 *   → service_key 필터는 항상 상수로 고정한다. 클라이언트가 service_key 를 지정할 수
 *     없게 하여 타 서비스 양식 열람을 차단한다 (Guard Rule 4 서비스키 스푸핑 금지).
 */
import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import { AnnualReportTemplate } from '../../routes/kpa-branch/entities/annual-report-template.entity.js';

const SERVICE_KEY = SERVICE_KEYS.KPA_BRANCH;

/** 목록 응답 — schema 본문은 제외한다(수십 KB). 요약만 낸다. */
function toSummary(t: AnnualReportTemplate) {
  const schema = t.schema ?? ({} as AnnualReportTemplate['schema']);
  const steps = Array.isArray(schema.steps) ? schema.steps : [];
  const fields = Array.isArray(schema.fields) ? schema.fields : [];
  const rules = Array.isArray(schema.rules) ? schema.rules : [];

  return {
    id: t.id,
    serviceKey: t.service_key,
    year: t.year,
    version: t.version,
    title: t.title,
    status: t.status,
    periodStart: t.period_start,
    periodEnd: t.period_end,
    templateVersion: schema.templateVersion ?? null,
    stepCount: steps.length,
    fieldCount: fields.length,
    ruleCount: rules.length,
    /** 소유권 분포 — 운영자가 "약사회 관리값이 몇 개인가"를 바로 본다 */
    ownershipBreakdown: {
      auto: fields.filter((f) => f.ownership === 'auto').length,
      member: fields.filter((f) => f.ownership === 'member').length,
      association: fields.filter((f) => f.ownership === 'association').length,
    },
    updatedAt: t.updated_at,
  };
}

/** `YYYY-MM-DD` 만 받는다. 시작이 종료보다 늦으면 거부한다. */
function normalizePeriod(
  start: unknown,
  end: unknown,
): { periodStart: string | null; periodEnd: string | null } | { error: string } {
  const parse = (v: unknown, label: string): string | null | { error: string } => {
    if (v === undefined || v === null || v === '') return null;
    const s = String(v).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) {
      return { error: `${label}가 올바르지 않습니다. (YYYY-MM-DD)` };
    }
    return s;
  };
  const periodStart = parse(start, '신고 시작일');
  if (periodStart && typeof periodStart === 'object') return periodStart;
  const periodEnd = parse(end, '신고 종료일');
  if (periodEnd && typeof periodEnd === 'object') return periodEnd;
  if (periodStart && periodEnd && String(periodStart) > String(periodEnd)) {
    return { error: '신고 시작일이 종료일보다 늦을 수 없습니다.' };
  }
  return { periodStart: periodStart as string | null, periodEnd: periodEnd as string | null };
}

/** 연도당 active 1개(부분 UNIQUE) 위반을 409 로 옮긴다 — 500 으로 새지 않게 한다. */
function activeConflict(res: Response, e: unknown, year: number) {
  if ((e as { code?: string })?.code === '23505') {
    return res.status(409).json({
      success: false,
      error: `${year}년도에는 이미 활성 양식이 있습니다.`,
      code: 'ACTIVE_TEMPLATE_EXISTS',
    });
  }
  throw e;
}

export class AnnualReportTemplateController {
  /**
   * GET /api/v1/kpa-branch/branches/:branchSlug/operator/annual-report-templates?status=
   * 양식 목록 (요약). 최신 연도 우선.
   */
  static async list(req: Request, res: Response) {
    const status = req.query.status as string | undefined;

    const qb = AppDataSource.getRepository(AnnualReportTemplate)
      .createQueryBuilder('t')
      // service_key 는 상수 고정 — 요청 파라미터에서 받지 않는다
      .where('t.service_key = :serviceKey', { serviceKey: SERVICE_KEY });

    if (status) {
      if (!['draft', 'active', 'archived'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'status 는 draft | active | archived 중 하나여야 합니다.',
          code: 'INVALID_STATUS',
        });
      }
      qb.andWhere('t.status = :status', { status });
    }

    const items = await qb.orderBy('t.year', 'DESC').addOrderBy('t.version', 'DESC').getMany();

    return res.json({ success: true, data: items.map(toSummary) });
  }

  /**
   * GET /api/v1/kpa-branch/branches/:branchSlug/operator/annual-report-templates/:year
   * 해당 연도의 **활성** 양식 1건 (schema 전문 포함).
   * 활성본이 없으면 최신 version 을 낸다 — 운영자가 준비 중인 개정본을 확인할 수 있어야 한다.
   */
  static async byYear(req: Request, res: Response) {
    const year = Number.parseInt(req.params.year, 10);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return res.status(400).json({
        success: false,
        error: '연도가 올바르지 않습니다.',
        code: 'INVALID_YEAR',
      });
    }

    const repo = AppDataSource.getRepository(AnnualReportTemplate);

    let template = await repo.findOne({
      where: { service_key: SERVICE_KEY, year, status: 'active' },
    });

    let fallback = false;
    if (!template) {
      template = await repo.findOne({
        where: { service_key: SERVICE_KEY, year },
        order: { version: 'DESC' },
      });
      fallback = !!template;
    }

    if (!template) {
      return res.status(404).json({
        success: false,
        error: `${year}년도 신고서 양식이 없습니다.`,
        code: 'TEMPLATE_NOT_FOUND',
      });
    }

    return res.json({
      success: true,
      data: {
        ...toSummary(template),
        /** 활성본이 아니라 최신본으로 대체 응답했음을 알린다 */
        isActive: template.status === 'active',
        fallbackToLatestVersion: fallback,
        schema: template.schema,
      },
    });
  }

  /**
   * POST /api/v1/kpa-branch/admin/annual-report-templates
   * body: { year, sourceYear?, title?, periodStart?, periodEnd?, status? }
   *
   * 연도 개설. schema 는 **직전(또는 지정) 연도의 최신본을 그대로 복제**한다 —
   * 여기서 양식 본문을 만들거나 고치지 않는다. 개정은 migration 축에 남긴다.
   * 이미 그 연도 양식이 있으면 만들지 않는다(409) — 같은 요청을 두 번 보내도 늘지 않는다.
   */
  static async openYear(req: Request, res: Response) {
    const { year, sourceYear, title, periodStart, periodEnd, status } = req.body ?? {};

    const y = Number.parseInt(String(year), 10);
    if (!Number.isInteger(y) || y < 2000 || y > 2100) {
      return res.status(400).json({ success: false, error: '연도가 올바르지 않습니다.', code: 'INVALID_YEAR' });
    }
    const nextStatus = status === undefined ? 'active' : String(status);
    if (!['draft', 'active'].includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        error: '개설 상태는 draft | active 중 하나여야 합니다.',
        code: 'INVALID_STATUS',
      });
    }
    const period = normalizePeriod(periodStart, periodEnd);
    if ('error' in period) {
      return res.status(400).json({ success: false, error: period.error, code: 'INVALID_PERIOD' });
    }

    const repo = AppDataSource.getRepository(AnnualReportTemplate);

    const existing = await repo.findOne({ where: { service_key: SERVICE_KEY, year: y } });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `${y}년도 양식이 이미 있습니다.`,
        code: 'TEMPLATE_ALREADY_EXISTS',
        data: toSummary(existing),
      });
    }

    // 복제 원본: 지정 연도, 없으면 y 미만의 가장 최근 연도
    const srcYear = sourceYear === undefined ? null : Number.parseInt(String(sourceYear), 10);
    const sourceQb = repo
      .createQueryBuilder('t')
      .where('t.service_key = :serviceKey', { serviceKey: SERVICE_KEY });
    if (srcYear !== null) {
      if (!Number.isInteger(srcYear)) {
        return res.status(400).json({ success: false, error: '원본 연도가 올바르지 않습니다.', code: 'INVALID_YEAR' });
      }
      sourceQb.andWhere('t.year = :srcYear', { srcYear });
    } else {
      sourceQb.andWhere('t.year < :y', { y });
    }
    const source = await sourceQb.orderBy('t.year', 'DESC').addOrderBy('t.version', 'DESC').getOne();

    if (!source) {
      // 복제 원본이 없으면 빈 양식을 만들지 않는다 — 필드 없는 신고서는 제출도 검수도 무의미하다
      return res.status(409).json({
        success: false,
        error: '복제할 이전 연도 양식이 없습니다. 최초 양식은 migration 으로 넣습니다.',
        code: 'TEMPLATE_SOURCE_NOT_FOUND',
      });
    }

    const created = repo.create({
      service_key: SERVICE_KEY,
      year: y,
      version: 1,
      title: typeof title === 'string' && title.trim() ? title.trim() : `${y}년도 약사 회원 신고서`,
      status: nextStatus as AnnualReportTemplate['status'],
      period_start: period.periodStart,
      period_end: period.periodEnd,
      schema: source.schema,
    });

    try {
      const saved = await repo.save(created);
      return res.status(201).json({ success: true, data: { ...toSummary(saved), copiedFromYear: source.year } });
    } catch (e) {
      return activeConflict(res, e, y);
    }
  }

  /**
   * PATCH /api/v1/kpa-branch/admin/annual-report-templates/:id
   * body: { title?, periodStart?, periodEnd?, status? }
   *
   * 접수기간 · 상태만 바꾼다. **schema 는 받지 않는다** — 양식 본문 편집 경로를 열지 않는다.
   */
  static async updateTemplate(req: Request, res: Response) {
    const { title, periodStart, periodEnd, status } = req.body ?? {};

    const repo = AppDataSource.getRepository(AnnualReportTemplate);
    // service_key 를 함께 조건에 넣는다 — id 를 알아도 타 서비스 양식에는 닿지 않는다
    const template = await repo.findOne({ where: { id: req.params.id, service_key: SERVICE_KEY } });
    if (!template) {
      return res.status(404).json({ success: false, error: '양식을 찾을 수 없습니다.', code: 'TEMPLATE_NOT_FOUND' });
    }

    if (status !== undefined) {
      if (!['draft', 'active', 'archived'].includes(String(status))) {
        return res.status(400).json({
          success: false,
          error: 'status 는 draft | active | archived 중 하나여야 합니다.',
          code: 'INVALID_STATUS',
        });
      }
      template.status = String(status) as AnnualReportTemplate['status'];
    }
    if (title !== undefined) {
      const t = String(title).trim();
      if (!t || t.length > 200) {
        return res.status(400).json({ success: false, error: '제목이 올바르지 않습니다.', code: 'INVALID_TITLE' });
      }
      template.title = t;
    }
    if (periodStart !== undefined || periodEnd !== undefined) {
      const period = normalizePeriod(
        periodStart === undefined ? template.period_start : periodStart,
        periodEnd === undefined ? template.period_end : periodEnd,
      );
      if ('error' in period) {
        return res.status(400).json({ success: false, error: period.error, code: 'INVALID_PERIOD' });
      }
      template.period_start = period.periodStart;
      template.period_end = period.periodEnd;
    }

    try {
      const saved = await repo.save(template);
      return res.json({ success: true, data: toSummary(saved) });
    } catch (e) {
      return activeConflict(res, e, template.year);
    }
  }
}
