/**
 * AnnualReportTemplateController — 연도별 신상신고 양식 조회 (운영자)
 * WO-O4O-KPA-BRANCH-ANNUAL-REPORT-TEMPLATE-SCHEMA-V1
 *
 * 조회 전용이다. 본 WO 범위에 Template 편집·회원 제출은 없다.
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
}
