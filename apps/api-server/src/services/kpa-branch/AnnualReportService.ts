/**
 * AnnualReportService — 신상신고 Template 해석 · 값 정제 · 검증
 * WO-O4O-KPA-BRANCH-ANNUAL-REPORT-SUBMISSION-V1 §4 §5 §6 §8
 *
 * 이 파일이 **보안 경계**다. 클라이언트 validation 은 UX 이고, 여기가 진실이다.
 *
 * 3가지를 서버에서만 결정한다:
 *   1) ownership 필터 — association / readonly 필드는 클라이언트 payload 에서 **제거**한다.
 *   2) association 주입 — 소속 지부·분회는 원장에서 읽어 서버가 넣는다.
 *      연결 원장이 없는 항목(연수교육 등)은 **null + 미연결 표시**. 가짜 값을 만들지 않는다.
 *   3) visibleWhen 평가 — 숨겨진 필드는 required 에서 제외한다. 프런트만 적용하면
 *      "보이지도 않는 필드 때문에 제출 불가" 상태가 생긴다.
 *
 * Template 필드 목록을 코드에 복제하지 않는다. 전부 schema 를 읽어 동작한다.
 */
import { AppDataSource } from '../../database/connection.js';
import { AnnualReportTemplate } from '../../routes/kpa-branch/entities/annual-report-template.entity.js';
import type {
  AnnualReportFieldDefinition,
  AnnualReportRule,
} from '../../routes/kpa-branch/entities/annual-report-template.entity.js';
import { KpaOrganization } from '../../routes/kpa-branch/entities/kpa-organization.entity.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';

const SERVICE_KEY = SERVICE_KEYS.KPA_BRANCH;

export type AnnualReportValues = Record<string, unknown>;

export interface FieldIssue {
  key: string;
  code: 'REQUIRED' | 'INVALID_OPTION' | 'PATTERN' | 'RANGE' | 'CONSENT_REQUIRED';
  message: string;
}

/** 연결 원장이 아직 없는 association 필드의 상태 */
export type AssociationLinkStatus = 'resolved' | 'not_linked';

export class AnnualReportService {
  // ── Template ──────────────────────────────────────────────────────────────

  /** 해당 연도의 active 양식. 없으면 null */
  static async getActiveTemplate(year: number): Promise<AnnualReportTemplate | null> {
    return AppDataSource.getRepository(AnnualReportTemplate).findOne({
      where: { service_key: SERVICE_KEY, year, status: 'active' },
    });
  }

  static async getTemplateById(id: string): Promise<AnnualReportTemplate | null> {
    return AppDataSource.getRepository(AnnualReportTemplate).findOne({ where: { id } });
  }

  static fields(t: AnnualReportTemplate): AnnualReportFieldDefinition[] {
    return Array.isArray(t.schema?.fields) ? t.schema.fields : [];
  }

  static rules(t: AnnualReportTemplate): AnnualReportRule[] {
    return Array.isArray(t.schema?.rules) ? t.schema.rules : [];
  }

  // ── 신고 기간 ─────────────────────────────────────────────────────────────

  /**
   * 오늘이 신고 기간의 어디인가.
   * 기간 정보가 없으면 'open' 으로 본다 (기간 미설정 양식을 잠그지 않는다).
   */
  static periodStatus(t: AnnualReportTemplate, now = new Date()): 'before' | 'open' | 'closed' {
    const today = now.toISOString().slice(0, 10);
    if (t.period_start && today < t.period_start) return 'before';
    if (t.period_end && today > t.period_end) return 'closed';
    return 'open';
  }

  // ── 조건부 표시 (visibleWhen) ─────────────────────────────────────────────

  /**
   * 값 집합 기준으로 각 필드의 표시 여부를 계산한다.
   *
   * - 어떤 visible rule 의 target 도 아니면 항상 표시.
   * - 여러 rule 이 같은 필드를 가리키면 **모두 만족해야** 표시 (AND).
   * - `$system.` 조건은 평가할 수 없다 → 그 rule 은 판정에서 제외하고 notEvaluable 로 보고한다.
   *   (WO §10: 원장이 없는 정책을 있는 것처럼 구현하지 않는다)
   */
  static computeVisibility(
    t: AnnualReportTemplate,
    values: AnnualReportValues,
  ): { visible: Record<string, boolean>; notEvaluableRules: string[] } {
    const visible: Record<string, boolean> = {};
    const notEvaluable: string[] = [];

    for (const f of this.fields(t)) visible[f.key] = true;

    for (const rule of this.rules(t)) {
      if (rule.kind !== 'visible' || !rule.when) continue;

      if (rule.when.field.startsWith('$system.')) {
        notEvaluable.push(rule.id);
        continue;
      }

      const pass = this.evalCondition(rule.when, values);
      for (const target of rule.targets ?? []) {
        if (!(target in visible)) continue;
        visible[target] = visible[target] && pass;
      }
    }

    // notice 계열도 $system 이면 평가 불가로 보고한다 (R9)
    for (const rule of this.rules(t)) {
      if (rule.kind === 'visible') continue;
      if (rule.when?.field?.startsWith('$system.') && !notEvaluable.includes(rule.id)) {
        notEvaluable.push(rule.id);
      }
    }

    return { visible, notEvaluableRules: notEvaluable };
  }

  private static evalCondition(
    when: NonNullable<AnnualReportRule['when']>,
    values: AnnualReportValues,
  ): boolean {
    const actual = values[when.field];
    switch (when.op) {
      case 'eq':
        return actual === when.value;
      case 'neq':
        return actual !== when.value;
      case 'in':
        return Array.isArray(when.value) && (when.value as unknown[]).includes(actual);
      case 'notIn':
        return Array.isArray(when.value) && !(when.value as unknown[]).includes(actual);
      case 'truthy':
        return Boolean(actual);
      default:
        return true;
    }
  }

  // ── ownership 필터 (§5 — 핵심 방어) ───────────────────────────────────────

  /**
   * 클라이언트 payload 에서 **회원이 쓸 수 있는 값만** 남긴다.
   *
   * 제거 대상:
   *   - Template 에 없는 키 (오타·주입)
   *   - ownership='association' (지부·분회·연수교육·회비)
   *   - readonly=true (신고년도·제출일 등)
   *
   * 반환에 dropped 를 포함해 무엇이 무시됐는지 감사 가능하게 한다.
   */
  static sanitizeIncoming(
    t: AnnualReportTemplate,
    incoming: unknown,
  ): { accepted: AnnualReportValues; dropped: string[] } {
    const accepted: AnnualReportValues = {};
    const dropped: string[] = [];

    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
      return { accepted, dropped };
    }

    const byKey = new Map(this.fields(t).map((f) => [f.key, f]));

    for (const [key, value] of Object.entries(incoming as Record<string, unknown>)) {
      const field = byKey.get(key);
      if (!field) {
        dropped.push(key);
        continue;
      }
      if (field.ownership === 'association' || field.readonly === true) {
        dropped.push(key);
        continue;
      }
      accepted[key] = value;
    }

    return { accepted, dropped };
  }

  // ── association 주입 (§4) ─────────────────────────────────────────────────

  /**
   * 서버가 확정하는 값을 넣는다. 클라이언트 입력은 이미 sanitizeIncoming 이 버렸다.
   *
   * 연결 원장이 없는 항목은 **null 로 두고 linkStatus 를 'not_linked'** 로 보고한다.
   * 하드코딩한 평점·회비를 넣지 않는다 (WO §4 — 가짜 숫자 금지).
   */
  static async resolveAssociationValues(
    t: AnnualReportTemplate,
    ctx: { organizationId: string; year: number },
  ): Promise<{ values: AnnualReportValues; linkStatus: Record<string, AssociationLinkStatus> }> {
    const values: AnnualReportValues = {};
    const linkStatus: Record<string, AssociationLinkStatus> = {};

    const orgRepo = AppDataSource.getRepository(KpaOrganization);
    const branch = await orgRepo.findOne({ where: { id: ctx.organizationId } });
    const parent = branch?.parent_id ? await orgRepo.findOne({ where: { id: branch.parent_id } }) : null;

    for (const f of this.fields(t)) {
      if (f.ownership !== 'association' && f.readonly !== true) continue;

      switch (f.key) {
        case 'personal.division':
          values[f.key] = branch?.name ?? null;
          linkStatus[f.key] = branch ? 'resolved' : 'not_linked';
          break;
        case 'personal.branch':
          // 지부 = 분회의 parent. parent 가 없으면 미연결로 표시한다 (임의 추정 금지)
          values[f.key] = parent?.name ?? null;
          linkStatus[f.key] = parent ? 'resolved' : 'not_linked';
          break;
        case 'report.year':
          values[f.key] = ctx.year;
          break;
        case 'submission.declaredAt':
          // 제출 시점에만 채운다 (draft 에서는 비운다)
          break;
        default:
          if (f.ownership === 'association') {
            // 연수교육 평점·회비구분 — 연결 원장이 아직 없다 (W1 CHECK F2).
            values[f.key] = null;
            linkStatus[f.key] = 'not_linked';
          }
      }
    }

    return { values, linkStatus };
  }

  // ── prefill (§4 auto) ─────────────────────────────────────────────────────

  /**
   * ownership='auto' 필드의 초기값을 실제 원장에서 읽는다.
   * 초기값일 뿐이며 회원 수정 가능 여부는 Template 의 readonly 가 정한다.
   * 본 WO 에서 원장에 되쓰지 않는다 (sync 는 W3).
   */
  static async buildPrefill(
    t: AnnualReportTemplate,
    ctx: { userId: string },
  ): Promise<AnnualReportValues> {
    const prefill: AnnualReportValues = {};

    const rows: Array<Record<string, unknown>> = await AppDataSource.query(
      `SELECT u.name  AS user_name,
              u.email AS user_email,
              m.license_number,
              m.activity_type,
              m.pharmacy_name,
              m.pharmacy_address
         FROM users u
         LEFT JOIN kpa_members m ON m.user_id = u.id
        WHERE u.id = $1
        LIMIT 1`,
      [ctx.userId],
    );
    const src = rows[0] ?? {};

    /** source.column → 실제 조회 결과 키 */
    const columnMap: Record<string, unknown> = {
      'users.name': src.user_name,
      'users.email': src.user_email,
      'kpa_members.license_number': src.license_number,
      'kpa_members.activity_type': src.activity_type,
      'kpa_members.pharmacy_name': src.pharmacy_name,
      'kpa_members.pharmacy_address': src.pharmacy_address,
    };

    for (const f of this.fields(t)) {
      if (f.ownership !== 'auto' || !f.source) continue;
      if (f.readonly === true) continue; // report.year·declaredAt 은 association 단계에서 채운다
      const v = columnMap[`${f.source.entity}.${f.source.column}`];
      if (v !== undefined && v !== null && v !== '') prefill[f.key] = v;
    }

    return prefill;
  }

  // ── 제출 검증 (§8) ────────────────────────────────────────────────────────

  /**
   * 제출 가능한지 판정한다. draft 저장에는 적용하지 않는다 (§7 — draft 는 완성 요구 없음).
   * 숨겨진 필드는 required 에서 제외한다.
   */
  static validateForSubmit(t: AnnualReportTemplate, values: AnnualReportValues): FieldIssue[] {
    const issues: FieldIssue[] = [];
    const { visible } = this.computeVisibility(t, values);

    for (const f of this.fields(t)) {
      if (visible[f.key] === false) continue;
      if (f.ownership === 'association') continue; // 서버가 채운다. 미연결이어도 회원 책임 아님
      if (f.readonly === true) continue;

      const raw = values[f.key];
      const empty =
        raw === undefined ||
        raw === null ||
        raw === '' ||
        (Array.isArray(raw) && raw.length === 0);

      if (f.type === 'consent') {
        if (f.required && raw !== true) {
          issues.push({ key: f.key, code: 'CONSENT_REQUIRED', message: `${f.label}에 동의해 주세요.` });
        }
        continue;
      }

      if (f.required && empty) {
        issues.push({ key: f.key, code: 'REQUIRED', message: `${f.label}을(를) 입력해 주세요.` });
        continue;
      }
      if (empty) continue;

      // 선택지 유효성
      if (f.options?.length) {
        const allowed = f.options.map((o) => o.value);
        const list = Array.isArray(raw) ? raw : [raw];
        for (const v of list) {
          if (!allowed.includes(v as never)) {
            issues.push({ key: f.key, code: 'INVALID_OPTION', message: `${f.label}의 선택값이 올바르지 않습니다.` });
            break;
          }
        }
      }

      // validation
      const val = f.validation;
      if (val) {
        const s = typeof raw === 'string' ? raw : String(raw);
        if (val.pattern && !new RegExp(val.pattern).test(s)) {
          issues.push({ key: f.key, code: 'PATTERN', message: val.message ?? `${f.label} 형식이 올바르지 않습니다.` });
        }
        if (typeof val.maxLength === 'number' && s.length > val.maxLength) {
          issues.push({ key: f.key, code: 'PATTERN', message: `${f.label}이(가) 너무 깁니다.` });
        }
        const n = Number(raw);
        if (!Number.isNaN(n)) {
          if (typeof val.min === 'number' && n < val.min) {
            issues.push({ key: f.key, code: 'RANGE', message: val.message ?? `${f.label} 값이 너무 작습니다.` });
          }
          if (typeof val.max === 'number' && n > val.max) {
            issues.push({ key: f.key, code: 'RANGE', message: val.message ?? `${f.label} 값이 너무 큽니다.` });
          }
        }
      }
    }

    return issues;
  }
}
