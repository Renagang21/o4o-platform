import { candidateIntakeSql } from '../neture/services/candidate-triage.js';
import { DESCRIPTION_INTAKE_LABEL } from "../neture/product-description-intake/namespace.js";
import type { DataSource } from "typeorm";
import type { InboxScope } from "./inbox-scope.js";
import { FUNDING_EXCEPTION_SQL } from "../../services/funding/funding-operator-exceptions.service.js";
import { recruitmentTargetMatch } from "../neture-pharmacy/services/recruitment-target.js";

interface TaskSource {
  key: string;
  label: string;
  href: string;
  sql: string;
  params?: unknown[];
}
export function inboxTaskSources(scope: InboxScope): TaskSource[] {
  const result: TaskSource[] = [];
  const add = (
    key: string,
    label: string,
    href: string,
    table: string,
    where: string,
    created = "created_at",
    params: unknown[] = [],
  ) =>
    result.push({
      key,
      label,
      href,
      sql: `SELECT COUNT(*)::int AS count, MIN(${created}) AS oldest FROM ${table} WHERE ${where}`,
      params,
    });
  if (scope.businessId) {
    const href =
      scope.kind === "cooperative"
        ? `/${scope.key}/operator`
        : `/operator/semi-franchises?key=${scope.key}`;
    const params = [scope.businessId];
    add(
      "contents",
      "콘텐츠 등재 검토",
      `${href}${href.includes("?") ? "&" : "?"}tab=contents`,
      "semi_franchise_contents",
      "semi_franchise_id=$1 AND status='pending'",
      "created_at",
      params,
    );
    add(
      "proposals",
      "공급 제안 검토",
      `${href}${href.includes("?") ? "&" : "?"}tab=proposals`,
      "supply_proposals",
      "semi_franchise_id=$1 AND status='pending'",
      "created_at",
      params,
    );
    if (scope.kind === "business") {
      add(
        "events",
        "이벤트 상품 검토",
        `${href}${href.includes("?") ? "&" : "?"}tab=events`,
        "organization_product_listings",
        "organization_id=$1 AND service_key='neture-event-offer' AND source_type='event-offer' AND status='pending'",
        "created_at",
        [scope.organizationId],
      );

      add(
        "members",
        "사업 참여 신청",
        `${href}${href.includes("?") ? "&" : "?"}tab=memberships`,
        "semi_franchise_memberships",
        "semi_franchise_id=$1 AND status='pending'",
        "created_at",
        params,
      );
      add(
        "recruitments",
        "모집 조건 검토",
        `${href}${href.includes("?") ? "&" : "?"}tab=recruitments`,
        "seller_recruitments sr JOIN semi_franchises sf ON " +
          recruitmentTargetMatch(),
        "sf.id=$1 AND sr.exposure_status='pending'",
        "sr.created_at",
        params,
      );
    }
    if (scope.cooperativeId) {
      add(
        "cooperative-members",
        "조합 가입 검토",
        href,
        "cooperative_memberships",
        "cooperative_id=$1 AND status='pending'",
        "created_at",
        [scope.cooperativeId],
      );
      add(
        "withdrawals",
        "조합 탈퇴 요청",
        href,
        "cooperative_management_events e",
        `e.cooperative_id=$1 AND e.action='member_request_withdraw' AND EXISTS(SELECT 1 FROM cooperative_memberships m WHERE m.cooperative_id=e.cooperative_id AND m.user_id=e.subject_id AND m.status IN ('active','suspended')) AND NOT EXISTS(SELECT 1 FROM cooperative_management_events later WHERE later.cooperative_id=e.cooperative_id AND later.subject_id=e.subject_id AND later.created_at>e.created_at AND later.action IN ('member_withdraw','member_expel','member_request_withdraw'))`,
        "e.created_at",
        [scope.cooperativeId],
      );
    }
    return result;
  }
  if (scope.key === "supplier") {
    add(
      "supplier-review",
      "공급자 승인 대기",
      "/operator/suppliers",
      "neture_suppliers",
      "status='PENDING'",
    );
    add(
      "supplier-resubmitted",
      "공급자 보완 재제출",
      "/operator/suppliers",
      "neture_supplier_review_requests",
      "state='submitted'",
      "submitted_at",
    );
  }
  if (scope.key === "funding") {
    add(
      "funding-forum-failures",
      "펀딩 포럼 연계 실패",
      "/operator/market-trial?tab=forum-failures",
      "market_trial_forum_sync_failures",
      "resolved_at IS NULL",
      "occurred_at",
    );
    add(
      "funding-deadline",
      "모집 기한 경과 · 결과 기록 필요",
      "/operator/market-trial",
      "market_trials",
      `status='recruiting' AND "fundingEndAt" < CURRENT_TIMESTAMP`,
      '"fundingEndAt"',
    );

    add(
      "funding-review",
      "펀딩 심사 대기",
      "/operator/market-trial",
      "market_trials",
      "status='submitted'",
      '"createdAt"',
    );
    const labels: Record<string, string> = {
      payment_pending: "입금 확인 필요",
      payment_failed: "입금 확인 실패",
      amount_missing: "입금액 누락",
      amount_mismatch: "약정·입금액 불일치",
      fulfillment_pending: "이행 미완료",
      refund_pending: "환급 잔여",
      pledge_missing: "약정 기록 누락",
      fulfilled_without_payment: "입금 미확인 이행",
    };
    for (const [key, condition] of Object.entries(FUNDING_EXCEPTION_SQL))
      add(
        key,
        labels[key],
        `/operator/market-trial?tab=exceptions&type=${key}`,
        'market_trial_participants p JOIN market_trials t ON t.id=p."marketTrialId"',
        `t.status NOT IN ('draft','submitted') AND (${condition})`,
        'p."updatedAt"',
      );
  }
  if (scope.key === "community") {
    add(
      "community-members",
      "커뮤니티 가입 대기",
      "/operator/service-members/community",
      "service_memberships",
      "service_key='community' AND status='pending'",
    );
    add(
      "community-forums",
      "게시판 개설 요청",
      "/operator/communities",
      "forum_category_requests",
      "service_code='community' AND status='pending'",
    );
  }
  if (scope.key === "lecture") {
    add(
      "lecture-courses",
      "강의 심사 대기",
      "/operator",
      "lms_courses",
      "service_key='lecture' AND status='pending_review'",
      '"createdAt"',
    );
    add(
      "lecture-instructors",
      "강사 신청 대기",
      "/operator/instructors",
      "lms_instructor_applications",
      "status='pending'",
      '"createdAt"',
    );
    add(
      "lecture-contact",
      "강의 미처리 문의",
      "/operator/contact",
      "contact_inquiries",
      "service_key='lecture' AND organization_id IS NULL AND status IN ('received','in_review')",
    );
    add(
      "lecture-legacy-contact",
      "기존 강의 개설 문의",
      "/operator/contact",
      "contact_requests",
      "service_key='kpa-society' AND type='education' AND status IN ('pending','reviewing')",
    );
  }
  if (scope.key === "pharmcoop")
    add(
      "affiliations",
      "연합회 소속 신청",
      "/operator",
      "cooperatives",
      "status='pending'",
    );
  if (scope.key === "store")
    add(
      "store-applications",
      "내 매장 신청 심사",
      "/operator/pharmacy-memberships",
      "neture_pharmacy_memberships",
      "status='pending'",
    );
  if (scope.key === "neture")
    add(
      "legacy-contact",
      "기존 미처리 문의",
      "/operator/contact-messages",
      "neture_contact_messages",
      "status IN ('new','in_progress')",
      '"createdAt"',
    );
  if (scope.key === "neture") {
    add(
      "pharmacist-qualifications", "약사 자격 검토 대기",
      "https://admin.neture.co.kr/operations/neture/qualifications",
      "kpa_pharmacist_profiles", "qualification_status='pending'", "updated_at",
    );
    add(
      "pharmacy-applications", "약국·매장 신청 심사",
      "/operator/pharmacy-memberships", "neture_pharmacy_memberships", "status='pending'",
    );
    add(
      "product-review",
      "상품 승인 대기",
      "/operator/product-approvals",
      "supplier_product_offers",
      "approval_status='PENDING' AND deleted_at IS NULL",
    );
    add(
      "service-product-review",
      "서비스 상품 승인 대기",
      "/operator/product-service-approvals",
      "offer_service_approvals",
      "approval_status='pending' AND service_key='neture'",
    );
    add(
      "product-candidates",
      "상품 후보 검토 대기",
      "/operator/product-candidates?status=pending&queue=review",
      "product_candidates",
      `candidate_status='pending' AND deleted_at IS NULL AND (source_label IS NULL OR source_label <> $1) AND (service_key='neture' OR service_key IS NULL) AND NOT ${candidateIntakeSql('product_candidates')}`,
      "created_at",
      [DESCRIPTION_INTAKE_LABEL],
    );
    add('product-candidate-intake','공공 수집 자료 등록 준비','/operator/product-candidates?status=active&queue=intake','product_candidates',
      `candidate_status IN ('pending','reviewing') AND matched_product_master_id IS NULL AND deleted_at IS NULL AND (source_label IS NULL OR source_label <> $1) AND (service_key='neture' OR service_key IS NULL) AND ${candidateIntakeSql('product_candidates')}`,
      'created_at',[DESCRIPTION_INTAKE_LABEL]);
  }
  return result;
}

/** Query errors remain visible; never present a failed query as an empty queue. */
export async function readInboxTasks(
  ds: Pick<DataSource, "query">,
  scope: InboxScope,
) {
  return Promise.all(
    inboxTaskSources(scope).map(async (source) => {
      try {
        const [row] = await ds.query(source.sql, source.params ?? []);
        return {
          key: source.key,
          label: source.label,
          href: source.href,
          count: Number(row.count),
          oldest: row.oldest,
          available: true,
        };
      } catch {
        return {
          key: source.key,
          label: source.label,
          href: source.href,
          count: null,
          oldest: null,
          available: false,
        };
      }
    }),
  );
}
