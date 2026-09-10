/**
 * KPA Branch Routes
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1
 *
 *   GET    /api/v1/kpa-branch/service-info                                   (public)
 *   GET    /api/v1/kpa-branch/branches                                       (public)  분회 목록
 *   GET    /api/v1/kpa-branch/resolve                                        (public)  Host → 분회
 *   GET    /api/v1/kpa-branch/branches/:branchSlug                           (public)  분회 단건
 *   GET    /api/v1/kpa-branch/branches/:branchSlug/site                      (public)  게시된 홈페이지
 *   GET    /api/v1/kpa-branch/branches/:branchSlug/posts                     (public)  공지/자료실
 *   GET    /api/v1/kpa-branch/branches/:branchSlug/me/posts                  (member)  공지/자료실 + 회의
 *   POST   /api/v1/kpa-branch/join                                           (public)  서비스 가입 신청
 *   GET    /api/v1/kpa-branch/join/status                                    (auth)    내 가입 상태
 *   GET    /api/v1/kpa-branch/me/access                                      (auth)
 *   GET    /api/v1/kpa-branch/me/branch                                      (auth)    내 현재 분회
 *   GET    /api/v1/kpa-branch/me/branch/history                              (auth)    전입·전출 이력
 *   *      /api/v1/kpa-branch/branches/:branchSlug/operator/**               (operator scope + 분회 경계)
 *   GET    /api/v1/kpa-branch/branches/:branchSlug/operator/annual-report-templates       신상신고 양식 목록
 *   GET    /api/v1/kpa-branch/branches/:branchSlug/operator/annual-report-templates/:year 연도별 양식 (schema 전문)
 *   GET    /api/v1/kpa-branch/branches/:branchSlug/operator/annual-reports                  검수 목록 (year/status 필터)
 *   GET    /api/v1/kpa-branch/branches/:branchSlug/operator/annual-reports/:reportId        검수 상세 (제출 스냅샷)
 *   POST   /api/v1/kpa-branch/branches/:branchSlug/operator/annual-reports/:reportId/approve            승인
 *   POST   /api/v1/kpa-branch/branches/:branchSlug/operator/annual-reports/:reportId/request-revision   보완요청
 *   POST   /api/v1/kpa-branch/branches/:branchSlug/operator/annual-reports/:reportId/sync   승인본 → 회원 원장 반영
 *   GET    /api/v1/kpa-branch/branches/:branchSlug/me/fees                                     내 회비 원장 (회원)
 *   GET    /api/v1/kpa-branch/branches/:branchSlug/operator/fee-policies?year=                 연도 회비 정책
 *   PUT    /api/v1/kpa-branch/branches/:branchSlug/operator/fee-policies/:year                 연도 정책 일괄 저장
 *   GET    /api/v1/kpa-branch/branches/:branchSlug/operator/fee-ledgers?year=&status=          회비 원장 목록
 *   POST   /api/v1/kpa-branch/branches/:branchSlug/operator/fee-ledgers/assess                 연도 일괄 부과 (멱등)
 *   PATCH  /api/v1/kpa-branch/branches/:branchSlug/operator/fee-ledgers/:ledgerId              부과·납부 개별 수정
 *   GET    /api/v1/kpa-branch/branches/:branchSlug/me/education-credits                        내 연수교육 (회원)
 *   GET    /api/v1/kpa-branch/branches/:branchSlug/operator/education-credits?year=&status=    연수교육 평점 목록
 *   POST   /api/v1/kpa-branch/branches/:branchSlug/operator/education-credits/open             연도 개설 (멱등)
 *   PATCH  /api/v1/kpa-branch/branches/:branchSlug/operator/education-credits/:ledgerId        평점·면제 개별 수정
 *   GET    /api/v1/kpa-branch/branches/:branchSlug/operator/members?year=&status=&attention=&q=  회원 업무 콘솔 목록
 *   GET    /api/v1/kpa-branch/branches/:branchSlug/operator/members/:userId?year=               회원 통합 상세 (4영역)
 *   GET    /api/v1/kpa-branch/branches/:branchSlug/events                       (public)  공개 행사 목록
 *   GET    /api/v1/kpa-branch/branches/:branchSlug/events/:eventId              (public)  공개 행사 상세
 *   GET    /api/v1/kpa-branch/branches/:branchSlug/me/events                              내 행사 목록 + 내 응답
 *   POST   /api/v1/kpa-branch/branches/:branchSlug/me/events/:eventId/rsvp                참가/불참 응답
 *   GET    /api/v1/kpa-branch/branches/:branchSlug/operator/events?status=                행사 목록 (draft 포함)
 *   POST   /api/v1/kpa-branch/branches/:branchSlug/operator/events                        행사 생성
 *   GET    /api/v1/kpa-branch/branches/:branchSlug/operator/events/:eventId               행사 상세
 *   PATCH  /api/v1/kpa-branch/branches/:branchSlug/operator/events/:eventId               수정·게시·취소
 *   GET    /api/v1/kpa-branch/branches/:branchSlug/operator/events/:eventId/rsvps         참가 명단
 *   GET    /api/v1/kpa-branch/branches/:branchSlug/officers                     (public)  공개 임원 명부
 *   GET    /api/v1/kpa-branch/branches/:branchSlug/me/officers                            회원 임원 명부
 *   GET    /api/v1/kpa-branch/branches/:branchSlug/operator/officers?status=              임원 명부 (종료 포함)
 *   POST   /api/v1/kpa-branch/branches/:branchSlug/operator/officers                      임원 등록
 *   PUT    /api/v1/kpa-branch/branches/:branchSlug/operator/officers/order                표시순서 일괄 변경
 *   PATCH  /api/v1/kpa-branch/branches/:branchSlug/operator/officers/:officerId           수정·임기종료·공개범위
 *   GET    /api/v1/kpa-branch/branches/:branchSlug/operator/members/:userId/history             소속 이력 (전입·전출 append-only)
 *   POST   /api/v1/kpa-branch/branches/:branchSlug/operator/members                             신규 소속 / 전입 (userId | email)
 *   POST   /api/v1/kpa-branch/branches/:branchSlug/operator/members/:userId/leave               전출
 *   *      /api/v1/kpa-branch/admin/domains/**                               (admin scope)
 *   *      /api/v1/kpa-branch/admin/service-members/**                        (admin scope)  가입 승인
 *
 * 가드 2겹 (합치지 않는다):
 *   requireAuth → requireKpaBranchScope(서비스 축) → resolveBranch → requireBranchScope(분회 축)
 *
 * 분회별 별도 백엔드를 만들지 않는다. 모든 분회가 이 라우터 하나를 공유하고
 * tenant 는 :branchSlug 또는 Host 헤더로만 결정된다.
 */

import { Router } from 'express';
import { getService } from '../../config/service-catalog.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import {
  requireKpaBranchScope,
  resolveBranch,
  requireBranchScope,
  findBranchByHostname,
} from '../../middleware/kpa-branch-scope.middleware.js';
import { BranchDirectoryController } from '../../controllers/kpa-branch/BranchDirectoryController.js';
import { BranchMemberController } from '../../controllers/kpa-branch/BranchMemberController.js';
import { BranchSiteController } from '../../controllers/kpa-branch/BranchSiteController.js';
import { BranchDomainController } from '../../controllers/kpa-branch/BranchDomainController.js';
import { BranchJoinController } from '../../controllers/kpa-branch/BranchJoinController.js';
import { BranchServiceMembershipController } from '../../controllers/kpa-branch/BranchServiceMembershipController.js';
import { AnnualReportTemplateController } from '../../controllers/kpa-branch/AnnualReportTemplateController.js';
import { OperatorAnnualReportController } from '../../controllers/kpa-branch/OperatorAnnualReportController.js';
import { MemberAnnualReportController } from '../../controllers/kpa-branch/MemberAnnualReportController.js';
import { BranchFeeController } from '../../controllers/kpa-branch/BranchFeeController.js';
import { BranchEducationCreditController } from '../../controllers/kpa-branch/BranchEducationCreditController.js';
import { BranchEventController } from '../../controllers/kpa-branch/BranchEventController.js';
import { BranchOfficerController } from '../../controllers/kpa-branch/BranchOfficerController.js';

const SERVICE_KEY = SERVICE_KEYS.KPA_BRANCH;

/** async 핸들러 오류를 express 에 위임 */
const wrap =
  (fn: (req: any, res: any) => Promise<unknown>) =>
  (req: any, res: any, next: any) =>
    fn(req, res).catch(next);

export function createKpaBranchRoutes(): Router {
  const router = Router();

  // ── public ────────────────────────────────────────────────────────────────

  router.get('/service-info', (_req, res) => {
    const svc = getService(SERVICE_KEY);
    if (!svc) {
      return res.status(500).json({
        success: false,
        error: 'KPA Branch service is not registered in the service catalog',
        code: 'SERVICE_NOT_REGISTERED',
      });
    }
    return res.json({
      success: true,
      data: {
        serviceKey: svc.key,
        name: svc.name,
        nameKo: svc.nameKo ?? svc.name,
        domain: svc.domain,
        // WO-O4O-KPA-BRANCH-PUBLIC-PATH-ROUTING-AND-CUSTOM-DOMAIN-BASELINE-V1:
        //   공용 공개 URL = https://{domain}{basePath}/{branchSlug}
        basePath: svc.basePath ?? '',
        description: svc.description,
        joinEnabled: svc.joinEnabled,
      },
    });
  });

  router.get('/branches', wrap(BranchDirectoryController.list));

  /** Host 헤더 → 분회 해석 (자체 도메인 진입 시 프론트가 tenant 를 확정하는 경로) */
  router.get(
    '/resolve',
    wrap(async (req, res) => {
      const host = (req.query.host as string) || (req.headers['x-forwarded-host'] as string) || req.headers.host || '';
      const branch = host ? await findBranchByHostname(host) : null;
      if (!branch) {
        return res.status(404).json({ success: false, error: '연결된 분회가 없습니다.', code: 'BRANCH_NOT_FOUND' });
      }
      return res.json({ success: true, data: branch });
    }),
  );

  router.get('/branches/:branchSlug', resolveBranch, wrap(BranchDirectoryController.detail));
  router.get('/branches/:branchSlug/site', resolveBranch, wrap(BranchSiteController.publicSite));
  router.get('/branches/:branchSlug/posts', resolveBranch, wrap(BranchSiteController.publicPosts));

  // 공개 행사 (WO-O4O-KPA-BRANCH-EVENTS-AND-RSVP-V1)
  //
  // `visibility='public'` 이고 게시된 행사만 나온다. 기본값은 members_only 이므로
  // 운영자가 명시적으로 공개를 고른 행사만 비로그인에게 보인다.
  // 공개 임원 명부 (WO-O4O-KPA-BRANCH-OFFICER-ROSTER-V1)
  //
  // visibility='public' 이고 **현직인** 임원만 나온다. 상태와 임기 날짜를 함께 본다 —
  // 상태만 믿으면 종료일이 지난 임원이 홈페이지에 남는다.
  router.get('/branches/:branchSlug/officers', resolveBranch, wrap(BranchOfficerController.publicList));
  router.get('/branches/:branchSlug/events', resolveBranch, wrap(BranchEventController.publicList));
  router.get(
    '/branches/:branchSlug/events/:eventId',
    resolveBranch,
    wrap(BranchEventController.publicDetail),
  );

  // ── 서비스 가입 (Identity V2 canonical write-path 위임) ───────────────────
  //
  // 가입 신청은 공통 register 경로로 위임되어 service_memberships(pending) 와
  // service_credentials(kpa-branch 전용 비밀번호)를 한 트랜잭션에서 만든다.
  // 분회 소속(branch_memberships)은 여기서 만들지 않는다 — 축을 합치지 않는다.
  //
  // service-catalog 의 joinEnabled 는 false 로 유지한다. 공통 handoff join 은
  // credential 없이 membership 만 만들기 때문에 이 서비스에서는 사용하지 않는다.
  router.post('/join', wrap(BranchJoinController.apply));
  router.get('/join/status', requireAuth as any, wrap(BranchJoinController.myStatus));

  // ── auth (본인 축) ────────────────────────────────────────────────────────

  /** 서비스 접근 상태 + 내 분회. 서비스 축(memberships)과 분회 축을 각각 별도 필드로 낸다. */
  router.get(
    '/me/access',
    requireAuth as any,
    wrap(async (req, res) => {
      const user = req.user ?? {};
      const memberships: { serviceKey: string; status: string }[] = user.memberships || [];
      const membershipStatus = memberships.find((m) => m.serviceKey === SERVICE_KEY)?.status ?? 'none';
      const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
      const serviceRoles = roles.filter((r) => r.startsWith(`${SERVICE_KEY}:`));
      const { branchMembershipService } = await import('../../services/kpa-branch/BranchMembershipService.js');
      const current = await branchMembershipService.getCurrent(user.id);

      return res.json({
        success: true,
        data: {
          serviceKey: SERVICE_KEY,
          membershipStatus,
          roles: serviceRoles,
          currentBranch: current
            ? { organizationId: current.organization_id, joinedAt: current.joined_at }
            : null,
          entryPoints: {
            member: serviceRoles.includes(`${SERVICE_KEY}:member`),
            operator: serviceRoles.includes(`${SERVICE_KEY}:operator`),
            admin: serviceRoles.includes(`${SERVICE_KEY}:admin`),
          },
        },
      });
    }),
  );

  router.get('/me/branch', requireAuth as any, wrap(BranchMemberController.myCurrent));
  router.get('/me/branch/history', requireAuth as any, wrap(BranchMemberController.myHistory));

  // ── 회원 신상신고 (본인 축 + 분회 축) ────────────────────────────────────
  //
  // WO-O4O-KPA-BRANCH-ANNUAL-REPORT-SUBMISSION-V1
  // member 스코프이지만 operator/admin 도 계층상 통과한다(scopeRoleMapping).
  // requireBranchScope 가 "요청 분회 == 내 active 분회" 를 강제하므로
  // 다른 분회 경로로 자기 신고서를 만들 수 없다.
  const memberReportGuards = [
    requireAuth as any,
    requireKpaBranchScope(`${SERVICE_KEY}:member`),
    resolveBranch,
    requireBranchScope,
  ];

  router.get(
    '/branches/:branchSlug/me/annual-report',
    ...memberReportGuards,
    wrap(MemberAnnualReportController.get),
  );
  router.post(
    '/branches/:branchSlug/me/annual-report/draft',
    ...memberReportGuards,
    wrap(MemberAnnualReportController.saveDraft),
  );
  router.post(
    '/branches/:branchSlug/me/annual-report/submit',
    ...memberReportGuards,
    wrap(MemberAnnualReportController.submit),
  );

  // 내 회비 (WO-O4O-KPA-BRANCH-ANNUAL-FEE-LEDGER-V1)
  //
  // 조회 전용이다. 회원이 자기 납부 상태를 바꿀 수 있는 경로는 만들지 않는다 —
  // 납부 기록은 운영자가 확인한 사실이지 회원의 신고가 아니다.
  router.get(
    '/branches/:branchSlug/me/fees',
    ...memberReportGuards,
    wrap(BranchFeeController.myLedgers),
  );

  // 내 연수교육 (WO-O4O-KPA-BRANCH-CONTINUING-EDUCATION-CREDIT-LEDGER-V1)
  //
  // 조회 전용이다. 평점은 분회가 확인해 기록하는 사실이므로 회원이 자기
  // 인정평점을 올리는 경로를 만들지 않는다.
  router.get(
    '/branches/:branchSlug/me/education-credits',
    ...memberReportGuards,
    wrap(BranchEducationCreditController.mine),
  );

  // 회원 행사 · 참가 응답 (WO-O4O-KPA-BRANCH-EVENTS-AND-RSVP-V1)
  //
  // 응답 주체는 언제나 로그인한 본인이다 — 대리 응답 경로를 만들지 않는다.
  // 응답 가능 여부(게시·신청사용·마감)는 서버가 판정한다.
  router.get(
    '/branches/:branchSlug/me/events',
    ...memberReportGuards,
    wrap(BranchEventController.memberList),
  );

  // 회원 글 목록 — 공지/자료실 + **회의록·회의자료**
  //
  // `branch_posts` 에는 visibility 컬럼이 없다. 공개 목록은 notice/resource 만 내보내고
  // meeting 은 이 라우트에서만 나온다 (WO-O4O-KPA-BRANCH-MEETING-POSTS-ADOPTION-V1 §5).
  router.get(
    '/branches/:branchSlug/me/posts',
    ...memberReportGuards,
    wrap(BranchSiteController.memberPosts),
  );

  // 회원 임원 명부 — public + members_only, 현직만
  router.get(
    '/branches/:branchSlug/me/officers',
    ...memberReportGuards,
    wrap(BranchOfficerController.memberList),
  );
  router.post(
    '/branches/:branchSlug/me/events/:eventId/rsvp',
    ...memberReportGuards,
    wrap(BranchEventController.respond),
  );

  // ── operator (서비스 축 + 분회 축 이중 가드) ──────────────────────────────

  const operatorGuards = [
    requireAuth as any,
    requireKpaBranchScope(`${SERVICE_KEY}:operator`),
    resolveBranch,
    requireBranchScope,
  ];

  // 회원 업무 콘솔 (WO-O4O-KPA-BRANCH-MEMBER-OPERATIONS-CONSOLE-V1)
  //
  // 목록·상세 모두 **서버가 4개 원장을 합쳐서** 낸다. 프런트가 신상신고/회비/연수교육
  // API 를 회원마다 각각 부르는 구조를 만들지 않는다 (WO §1·§2).
  // 상세 라우트는 `/:userId/leave`(POST) 보다 먼저 선언해도 method 가 달라 충돌하지 않는다.
  router.get('/branches/:branchSlug/operator/members', ...operatorGuards, wrap(BranchMemberController.list));
  router.get(
    '/branches/:branchSlug/operator/members/:userId',
    ...operatorGuards,
    wrap(BranchMemberController.detail),
  );
  router.get(
    '/branches/:branchSlug/operator/members/:userId/history',
    ...operatorGuards,
    wrap(BranchMemberController.history),
  );
  router.post('/branches/:branchSlug/operator/members', ...operatorGuards, wrap(BranchMemberController.join));
  router.post(
    '/branches/:branchSlug/operator/members/:userId/leave',
    ...operatorGuards,
    wrap(BranchMemberController.leave),
  );

  router.get('/branches/:branchSlug/operator/site', ...operatorGuards, wrap(BranchSiteController.operatorSite));
  router.put('/branches/:branchSlug/operator/site', ...operatorGuards, wrap(BranchSiteController.upsertSite));

  router.get('/branches/:branchSlug/operator/posts', ...operatorGuards, wrap(BranchSiteController.operatorPosts));
  router.post('/branches/:branchSlug/operator/posts', ...operatorGuards, wrap(BranchSiteController.createPost));
  router.patch(
    '/branches/:branchSlug/operator/posts/:postId',
    ...operatorGuards,
    wrap(BranchSiteController.updatePost),
  );
  router.delete(
    '/branches/:branchSlug/operator/posts/:postId',
    ...operatorGuards,
    wrap(BranchSiteController.deletePost),
  );

  // 신상신고 양식 조회 (WO-O4O-KPA-BRANCH-ANNUAL-REPORT-TEMPLATE-SCHEMA-V1)
  //
  // 양식 자체는 service_key 축의 서비스 공통 자원이라 분회마다 다르지 않다.
  // 그래도 :branchSlug 아래에 둔다 — WO 요구대로 기존 operator guard 2겹
  // (서비스 축 + 분회 축)을 그대로 재사용하기 위해서다. 분회 축 가드를 빼면
  // 이 모듈에서 유일하게 tenant 경계 없는 operator 경로가 생긴다.
  router.get(
    '/branches/:branchSlug/operator/annual-report-templates',
    ...operatorGuards,
    wrap(AnnualReportTemplateController.list),
  );
  router.get(
    '/branches/:branchSlug/operator/annual-report-templates/:year',
    ...operatorGuards,
    wrap(AnnualReportTemplateController.byYear),
  );

  // 신상신고 검수 (WO-O4O-KPA-BRANCH-ANNUAL-REPORT-REVIEW-V1)
  //
  // 목록·상세·승인·보완요청 모두 operatorGuards 2겹을 그대로 쓴다.
  // 상세/승인/보완요청은 (reportId, organization_id) 복합 조건으로만 조회하므로
  // reportId 를 알아도 다른 분회 신고서에는 닿을 수 없다 (§7 Guard Rule 1).
  router.get(
    '/branches/:branchSlug/operator/annual-reports',
    ...operatorGuards,
    wrap(OperatorAnnualReportController.list),
  );
  router.get(
    '/branches/:branchSlug/operator/annual-reports/:reportId',
    ...operatorGuards,
    wrap(OperatorAnnualReportController.detail),
  );
  router.post(
    '/branches/:branchSlug/operator/annual-reports/:reportId/approve',
    ...operatorGuards,
    wrap(OperatorAnnualReportController.approve),
  );
  router.post(
    '/branches/:branchSlug/operator/annual-reports/:reportId/request-revision',
    ...operatorGuards,
    wrap(OperatorAnnualReportController.requestRevision),
  );

  // 승인본 → 회원 원장(kpa_members) 반영 (WO-O4O-KPA-BRANCH-ANNUAL-REPORT-MEMBERSHIP-SYNC-V1)
  //
  // 회원 제출 시 자동 반영하지 않는다. 운영자가 명시적으로 실행하며,
  // W4 부터는 **승인된 신고서만** 대상이다 (승인과 반영을 합치지 않는다).
  router.post(
    '/branches/:branchSlug/operator/annual-reports/:reportId/sync',
    ...operatorGuards,
    wrap(OperatorAnnualReportController.sync),
  );

  // 연회비 정책 · 원장 (WO-O4O-KPA-BRANCH-ANNUAL-FEE-LEDGER-V1)
  //
  // 정책은 연도 단위 일괄 저장(PUT)이다. 항목 PATCH 를 만들지 않는다 — 정책은 표 한 장이고
  // 부분 수정하면 화면과 DB 가 조용히 어긋난다.
  // 원장 수정은 개별 PATCH 이며 status 를 받지 않는다 (금액에서 서버가 파생).
  router.get(
    '/branches/:branchSlug/operator/fee-policies',
    ...operatorGuards,
    wrap(BranchFeeController.listPolicies),
  );
  router.put(
    '/branches/:branchSlug/operator/fee-policies/:year',
    ...operatorGuards,
    wrap(BranchFeeController.replacePolicies),
  );
  router.get(
    '/branches/:branchSlug/operator/fee-ledgers',
    ...operatorGuards,
    wrap(BranchFeeController.listLedgers),
  );
  router.post(
    '/branches/:branchSlug/operator/fee-ledgers/assess',
    ...operatorGuards,
    wrap(BranchFeeController.assess),
  );
  router.patch(
    '/branches/:branchSlug/operator/fee-ledgers/:ledgerId',
    ...operatorGuards,
    wrap(BranchFeeController.updateLedger),
  );

  // 연수교육 평점 원장 (WO-O4O-KPA-BRANCH-CONTINUING-EDUCATION-CREDIT-LEDGER-V1)
  //
  // LMS 가 아니다 — 강좌·수강신청·출결 경로를 만들지 않는다.
  // 개설(open)은 연도 단위 멱등 작업이고, 개별 조정은 PATCH 다.
  // PATCH 는 status 를 받지 않는다 (DB generated column 이 정한다).
  router.get(
    '/branches/:branchSlug/operator/education-credits',
    ...operatorGuards,
    wrap(BranchEducationCreditController.list),
  );
  router.post(
    '/branches/:branchSlug/operator/education-credits/open',
    ...operatorGuards,
    wrap(BranchEducationCreditController.openYear),
  );
  router.patch(
    '/branches/:branchSlug/operator/education-credits/:ledgerId',
    ...operatorGuards,
    wrap(BranchEducationCreditController.update),
  );

  // 행사 (WO-O4O-KPA-BRANCH-EVENTS-AND-RSVP-V1)
  //
  // 게시·취소도 PATCH 로 한다 — 상태 전용 endpoint 를 따로 만들지 않는다.
  // 삭제 경로가 없다: 취소는 상태이지 삭제가 아니고, 참가 응답이 딸려 있다.
  router.get('/branches/:branchSlug/operator/events', ...operatorGuards, wrap(BranchEventController.list));
  router.post('/branches/:branchSlug/operator/events', ...operatorGuards, wrap(BranchEventController.create));
  router.get(
    '/branches/:branchSlug/operator/events/:eventId',
    ...operatorGuards,
    wrap(BranchEventController.detail),
  );
  router.patch(
    '/branches/:branchSlug/operator/events/:eventId',
    ...operatorGuards,
    wrap(BranchEventController.update),
  );
  router.get(
    '/branches/:branchSlug/operator/events/:eventId/rsvps',
    ...operatorGuards,
    wrap(BranchEventController.rsvps),
  );

  // 임원 명부 (WO-O4O-KPA-BRANCH-OFFICER-ROSTER-V1)
  //
  // 직책은 RBAC 이 아니다 — 이 경로들은 role_assignments 를 읽지도 쓰지도 않는다.
  // 임기 종료·공개범위도 PATCH 로 한다. 삭제 경로가 없다: 종료는 상태이고 이력은 남는다.
  // 정렬은 PUT .../order 로 한 트랜잭션에 끝낸다 (행마다 PATCH 하면 중간 상태가 보인다).
  router.get('/branches/:branchSlug/operator/officers', ...operatorGuards, wrap(BranchOfficerController.list));
  router.post('/branches/:branchSlug/operator/officers', ...operatorGuards, wrap(BranchOfficerController.create));
  router.put(
    '/branches/:branchSlug/operator/officers/order',
    ...operatorGuards,
    wrap(BranchOfficerController.reorder),
  );
  router.patch(
    '/branches/:branchSlug/operator/officers/:officerId',
    ...operatorGuards,
    wrap(BranchOfficerController.update),
  );

  router.get('/branches/:branchSlug/operator/domains', ...operatorGuards, wrap(BranchDomainController.list));
  router.post('/branches/:branchSlug/operator/domains', ...operatorGuards, wrap(BranchDomainController.create));
  router.post(
    '/branches/:branchSlug/operator/domains/:domainId/verify-request',
    ...operatorGuards,
    wrap(BranchDomainController.requestVerification),
  );
  router.delete(
    '/branches/:branchSlug/operator/domains/:domainId',
    ...operatorGuards,
    wrap(BranchDomainController.remove),
  );

  // ── admin (서비스 전체 축) ────────────────────────────────────────────────

  const adminGuards = [requireAuth as any, requireKpaBranchScope(`${SERVICE_KEY}:admin`)];

  // 신상신고 양식 — 연도 개설 · 접수기간 (WO-O4O-KPA-BRANCH-TENANT-ONBOARDING-AND-MVP-PRODUCTION-E2E-V1 §9)
  //
  // 양식은 service_key 축 공통 자원이라 분회 경계 가드를 붙이지 않는다. 조회는 운영자도 하지만
  // **개설·기간 변경은 서비스 관리자 몫이다** — 한 분회가 바꾸면 209개 분회에 모두 적용된다.
  // 이 경로가 없던 동안에는 migration 이 유일한 write 경로였고, 해가 바뀌면 배포 전까지
  // 신상신고와 (회비구분이 신고서에서 오므로) 회비 부과가 함께 멈췄다.
  router.get('/admin/annual-report-templates', ...adminGuards, wrap(AnnualReportTemplateController.list));
  router.post('/admin/annual-report-templates', ...adminGuards, wrap(AnnualReportTemplateController.openYear));
  router.patch(
    '/admin/annual-report-templates/:id',
    ...adminGuards,
    wrap(AnnualReportTemplateController.updateTemplate),
  );

  router.get('/admin/domains', ...adminGuards, wrap(BranchDomainController.adminList));
  router.patch('/admin/domains/:domainId/status', ...adminGuards, wrap(BranchDomainController.adminSetStatus));

  // 서비스 가입 승인 — 서비스 축(service_memberships)이므로 분회 경계 가드를 붙이지 않는다.
  // 분회 운영자는 분회 소속(branch_memberships)만 다루고 서비스 접근 승인은 서비스 관리자 몫이다.
  router.get('/admin/service-members', ...adminGuards, wrap(BranchServiceMembershipController.list));
  router.patch(
    '/admin/service-members/:membershipId/approve',
    ...adminGuards,
    wrap(BranchServiceMembershipController.approve),
  );
  router.patch(
    '/admin/service-members/:membershipId/reject',
    ...adminGuards,
    wrap(BranchServiceMembershipController.reject),
  );

  return router;
}
