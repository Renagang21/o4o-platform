/**
 * KPA Operator Dashboard Service
 *
 * WO-O4O-KPA-OPERATOR-DASHBOARD-API-5BLOCK-FOUNDATION-V1
 *   IR-O4O-KPA-OPERATOR-DASHBOARD-API-5BLOCK-UNIFICATION-V1 (Option B) 의 Foundation.
 *   backend `/api/v1/kpa/operator/dashboard` endpoint 의 데이터 fetch + 5-Block 조립 service.
 *
 * 책임:
 *   - 기존 /operator/summary 의 17 query 동일 재사용 (3 module service + 14 raw)
 *   - 추가 보조 query (members pending(kpa_members.status='pending') / event-offer(organization_product_listings) pending /
 *     store stats / product-applications pending / [admin] total members)
 *   - frontend `buildKpaOperatorConfig` (services/web-kpa-society/src/pages/operator/operatorConfig.ts) 의
 *     5-Block 조립 logic 을 backend 로 그대로 포트 — Adapter WO 단계에서 frontend 가
 *     pass-through 로 전환 가능하도록 정합.
 *   - isAdmin role-aware (KPI 2 / AI summary 1 / Action Queue 1 / Quick Actions 3 추가)
 *
 * 포함하지 않는 것 (I3 정책 + I1 권고):
 *   - AxisNavigationSection axes — frontend 유지 (buildKpaAxes)
 *   - OperatorRoleGuideCard content — frontend 유지 (KPA only static)
 *
 * 기존 코드 회귀 0:
 *   - /operator/summary controller / response shape 변경 없음
 *   - frontend KpaOperatorDashboard / operatorConfig 변경 없음 (Adapter WO 단계에서 전환)
 */

import type { DataSource } from 'typeorm';
import type { ContentQueryService } from '../../../modules/content/index.js';
import type { SignageQueryService } from '../../../modules/signage/index.js';
import type { ForumQueryService } from '../../../modules/forum/index.js';
import type {
  OperatorDashboardConfig,
  KpiItem,
  AiSummaryItem,
  ActionItem,
  ActivityItem,
  QuickActionItem,
} from '../../../types/operator-dashboard.types.js';

export interface KpaDashboardServices {
  contentService: ContentQueryService;
  signageService: SignageQueryService;
  forumService: ForumQueryService;
}

// ─── Raw data shape (operator-summary controller 의 응답과 동일) ──────────────

interface SummaryShape {
  content: {
    totalPublished: number;
    pendingDraft: number;
    pendingApproval: number;
    recentItems: Array<{
      id: string;
      title: string;
      publishedAt: string | null;
      createdAt: string;
    }>;
  };
  signage: {
    totalMedia: number;
    totalPlaylists: number;
    pendingMedia: number;
    pendingPlaylists: number;
    recentMedia: Array<{ id: string; name: string }>;
    recentPlaylists: Array<{ id: string; name: string }>;
  };
  forum: {
    totalPosts: number;
    pendingRequests: number;
    recentPosts: Array<{
      id: string;
      title: string;
      authorName: string | null;
      createdAt: string;
    }>;
  };
  approval: {
    instructorPending: number;
    coursePending: number;
    // WO-O4O-KPA-ORGANIZATION-JOIN-DEAD-FLOW-RETIREMENT-V1:
    //   membershipPending 제거 — dead 조직 가입 승인 채널(kpa_approval_requests entity_type='membership',
    //   프로덕션 0건·INSERT 경로 부재). canonical pending 회원 = kpa_members.status='pending'
    //   (fetchSecondaryCounts.pendingMembers) 로 이미 노출됨.
  };
  store: {
    forcedExpirySoon: number;
  };
  recentActivity: Array<{
    type: 'member_join';
    label: string;
    timestamp: string;
    status: string;
  }>;
}

interface SecondaryCounts {
  pendingMembers: number;
  totalMembers: number;
  // WO-O4O-KPA-OPERATOR-PHARMACY-SERVICE-REQUEST-LEGACY-REMOVE-V1:
  //   약국 서비스 신청 pending 폐지 → 이벤트 오퍼(organization_product_listings) 승인 대기로 대체.
  eventOfferPendingCount: number;
  productApplicationPendingCount: number;
  // WO-O4O-KPA-OPERATOR-SELLER-RECRUITMENT-PENDING-KPI-ACTION-QUEUE-V1:
  //   판매자 모집 노출 승인 대기 = neture_partner_recruitments.exposure_status='pending'
  //   (service_id='kpa-society' scope). 운영자 승인 큐(proxy GET ?exposureStatus=pending) 와 동일 조건.
  recruitmentExposurePendingCount: number;
  storeStats: { totalStores: number; activeStores: number } | null;
}

// ─── Summary fetch (same query set as /operator/summary) ─────────────────────

async function fetchSummaryShape(
  dataSource: DataSource,
  services: KpaDashboardServices,
): Promise<SummaryShape> {
  const { contentService, signageService, forumService } = services;

  const [
    recentContent,
    signageHome,
    recentPosts,
    contentTotalCount,
    signageMediaTotalCount,
    signagePlaylistTotalCount,
    forumPostTotalCount,
    contentDraftCount,
    contentPendingCount,
    signagePendingMediaCount,
    signagePendingPlaylistCount,
    forumPendingRequestCount,
    instructorPendingCount,
    coursePendingCount,
    forcedExpirySoonCount,
    recentMemberRows,
    // WO-O4O-KPA-APPLICATION-DEAD-FLOW-RETIREMENT-V1: kpa_applications recentActivity 제거(dead flow).
    // WO-O4O-KPA-ORGANIZATION-JOIN-DEAD-FLOW-RETIREMENT-V1: org_join recentActivity 제거(dead flow).
    //   recentActivity 는 kpa_members(가입) 만으로 조립.
  ] = await Promise.all([
    contentService.listForHome(['notice', 'news'], 5),
    signageService.listForHome(3, 3),
    forumService.listRecentPosts(5),
    dataSource.query(`
      SELECT COUNT(*) as count FROM cms_contents
      WHERE "serviceKey" IN ('kpa-society', 'kpa') AND status = 'published'
    `),
    dataSource.query(`
      SELECT COUNT(*) as count FROM signage_media
      WHERE "serviceKey" = 'kpa-society' AND status = 'active' AND "deletedAt" IS NULL
    `),
    dataSource.query(`
      SELECT COUNT(*) as count FROM signage_playlists
      WHERE "serviceKey" = 'kpa-society' AND status = 'active' AND "deletedAt" IS NULL
    `),
    dataSource.query(`
      SELECT COUNT(*) as count FROM forum_post
      WHERE status = 'publish' AND organization_id IS NULL
    `),
    dataSource.query(`
      SELECT COUNT(*) as count FROM cms_contents
      WHERE "serviceKey" IN ('kpa-society', 'kpa') AND status = 'draft'
    `),
    dataSource.query(`
      SELECT COUNT(*) as count FROM cms_contents
      WHERE "serviceKey" IN ('kpa-society', 'kpa') AND status = 'pending'
    `),
    dataSource.query(`
      SELECT COUNT(*) as count FROM signage_media
      WHERE "serviceKey" = 'kpa-society' AND status = 'pending' AND "deletedAt" IS NULL
    `),
    dataSource.query(`
      SELECT COUNT(*) as count FROM signage_playlists
      WHERE "serviceKey" = 'kpa-society' AND status = 'pending' AND "deletedAt" IS NULL
    `),
    dataSource.query(`
      SELECT COUNT(*) AS count FROM forum_category_requests
      WHERE status = 'pending' AND service_code = 'kpa-society'
    `),
    dataSource.query(`
      SELECT COUNT(*) AS count FROM kpa_approval_requests
      WHERE entity_type = 'instructor_qualification' AND status = 'pending'
    `).catch(() => [{ count: '0' }]),
    dataSource.query(`
      SELECT COUNT(*) AS count FROM kpa_approval_requests
      WHERE entity_type = 'course' AND status = 'pending'
    `).catch(() => [{ count: '0' }]),
    dataSource.query(`
      SELECT COUNT(*) as count FROM kpa_store_asset_controls
      WHERE is_forced = true
        AND forced_end_at IS NOT NULL
        AND forced_end_at > NOW()
        AND forced_end_at <= NOW() + INTERVAL '7 days'
    `).catch(() => [{ count: 0 }]),
    dataSource.query(`
      SELECT m.id, u.name, m.membership_type, m.status, m.created_at
      FROM kpa_members m
      LEFT JOIN users u ON u.id = m.user_id
      ORDER BY m.created_at DESC LIMIT 10
    `).catch(() => []),
  ]);

  const recentActivity: SummaryShape['recentActivity'] = [];
  for (const r of (recentMemberRows as any[]) || []) {
    const typeLabel = r.membership_type === 'student' ? '학생' : '약사';
    recentActivity.push({
      type: 'member_join',
      label: `${r.name || '(이름 없음)'} ${typeLabel} 가입`,
      timestamp: r.created_at,
      status: r.status,
    });
  }
  recentActivity.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  recentActivity.splice(15);

  return {
    content: {
      totalPublished: parseInt(contentTotalCount[0]?.count || '0', 10),
      pendingDraft: parseInt(contentDraftCount[0]?.count || '0', 10),
      pendingApproval: parseInt(contentPendingCount[0]?.count || '0', 10),
      recentItems: recentContent as SummaryShape['content']['recentItems'],
    },
    signage: {
      totalMedia: parseInt(signageMediaTotalCount[0]?.count || '0', 10),
      totalPlaylists: parseInt(signagePlaylistTotalCount[0]?.count || '0', 10),
      pendingMedia: parseInt(signagePendingMediaCount[0]?.count || '0', 10),
      pendingPlaylists: parseInt(signagePendingPlaylistCount[0]?.count || '0', 10),
      recentMedia: signageHome.media as SummaryShape['signage']['recentMedia'],
      recentPlaylists: signageHome.playlists as SummaryShape['signage']['recentPlaylists'],
    },
    forum: {
      totalPosts: parseInt(forumPostTotalCount[0]?.count || '0', 10),
      pendingRequests: parseInt(forumPendingRequestCount[0]?.count || '0', 10),
      recentPosts: recentPosts as SummaryShape['forum']['recentPosts'],
    },
    approval: {
      instructorPending: parseInt(instructorPendingCount[0]?.count || '0', 10),
      coursePending: parseInt(coursePendingCount[0]?.count || '0', 10),
    },
    store: {
      forcedExpirySoon: parseInt(forcedExpirySoonCount[0]?.count || '0', 10),
    },
    recentActivity,
  };
}

// ─── Secondary counts (frontend 의 6 보조 fetch 동일 source) ──────────────────

async function fetchSecondaryCounts(
  dataSource: DataSource,
  isAdmin: boolean,
): Promise<SecondaryCounts> {
  // KPA Member pending = kpa_members.status='pending' (어드민 API 와 같은 source).
  // 이벤트 오퍼 승인 대기 = organization_product_listings.status='pending' (service_key='kpa-groupbuy').
  //   WO-O4O-STORE-SERVICE-KEY-RESIDUAL-INTEGRITY-CLEANUP-V1: 종전 'kpa-society' 는 일반 진열 pending 까지
  //   세어 운영자 큐(listPendingListings(KPA_GROUPBUY)) 와 어긋났다 → 큐와 동일 key 로 정렬.
  //   WO-O4O-KPA-OPERATOR-PHARMACY-SERVICE-REQUEST-LEGACY-REMOVE-V1: 약국 서비스 신청 pending 대체.
  //   EventOfferService.countPendingListings 와 동일 쿼리(신규 통계 없음).
  // 상품 신청 pending = kpa_product_applications.status='pending' (operator-product-applications/stats endpoint 와 동일).
  // 매장 통계 = organization_service_enrollments service_code='kpa-society' active count (간단 통계).
  // (admin) 전체 회원 = service_memberships count.
  // (admin) pending 회원 = kpa_members.status='pending' (canonical 회원 승인 대기).

  const [
    pendingMembersRows,
    eventOfferPendingRows,
    productAppPendingRows,
    recruitmentExposurePendingRows,
    storeCountRows,
    totalMembersRows,
  ] = await Promise.all([
    dataSource.query(`
      SELECT COUNT(*) AS count FROM kpa_members WHERE status = 'pending'
    `).catch(() => [{ count: '0' }]),
    dataSource.query(`
      SELECT COUNT(*) AS count FROM organization_product_listings
      WHERE service_key = 'kpa-groupbuy' AND status = 'pending'
    `).catch(() => [{ count: '0' }]),
    dataSource.query(`
      SELECT COUNT(*) AS count FROM kpa_product_applications WHERE status = 'pending'
    `).catch(() => [{ count: '0' }]),
    // WO-O4O-KPA-OPERATOR-SELLER-RECRUITMENT-PENDING-KPI-ACTION-QUEUE-V1:
    //   read-only count. service_id='kpa-society' AND exposure_status='pending' — 운영자 승인 큐 목록과
    //   동일 조건(getRecruitmentsForExposureReview: serviceId + exposureStatus, status/삭제 조건 없음).
    dataSource.query(`
      SELECT COUNT(*) AS count FROM neture_partner_recruitments
      WHERE service_id = 'kpa-society' AND exposure_status = 'pending'
    `).catch(() => [{ count: '0' }]),
    dataSource.query(`
      SELECT
        COUNT(*) FILTER (WHERE ose.status = 'active') AS active_count,
        COUNT(*) AS total_count
      FROM organization_service_enrollments ose
      WHERE ose.service_code = 'kpa-society'
    `).catch(() => [{ active_count: '0', total_count: '0' }]),
    // WO-O4O-OPERATOR-CONSOLE-MEMBER-FLOW-AND-STANDARD-LIST-CONSOLIDATION-V1:
    //   '전체 회원' KPI 는 클릭 시 /operator/members 로 이동하므로, 그 목록 API
    //   (GET /api/v1/kpa/members) 의 **기본 모집단과 동일**해야 한다.
    //   기존에는 `COUNT(*) FROM kpa_members` 로 다른 테이블을 세어 KPI 6 / 목록 5 로 어긋났다
    //   (kpa_members 행은 있으나 service_membership 이 없는 사용자 존재).
    //   목록의 base 조건은 `service_memberships.service_key IN ('kpa-society','kpa')` 이며
    //   status 필터는 쿼리 파라미터가 있을 때만 적용되는 선택 조건이므로 여기서도 걸지 않는다.
    isAdmin
      ? dataSource.query(`
          SELECT COUNT(*) AS count
          FROM service_memberships sm
          WHERE sm.service_key IN ('kpa-society', 'kpa')
        `).catch(() => [{ count: '0' }])
      : Promise.resolve([{ count: '0' }]),
    // WO-O4O-KPA-OPERATOR-ORGANIZATION-REQUESTS-ROLE-BOUNDARY-RESOLVE-V1:
    //   '서비스 신청'(organization_join/org_join) KPI 제거 — 해당 entity_type 은 어디서도 INSERT 되지 않아
    //   항상 0이었고, link /operator/organization-requests 는 실재 화면 없는 dead route 였다.
    //   WO-O4O-KPA-ORGANIZATION-JOIN-DEAD-FLOW-RETIREMENT-V1: 조직 가입 승인 채널(구 organization-join-request.controller,
    //   entity_type='membership') 자체를 은퇴 — canonical 회원 승인 = PATCH /kpa/members/:id/status.
  ]);

  return {
    pendingMembers: parseInt(pendingMembersRows[0]?.count || '0', 10),
    eventOfferPendingCount: parseInt(eventOfferPendingRows[0]?.count || '0', 10),
    productApplicationPendingCount: parseInt(productAppPendingRows[0]?.count || '0', 10),
    recruitmentExposurePendingCount: parseInt(recruitmentExposurePendingRows[0]?.count || '0', 10),
    storeStats: {
      totalStores: parseInt(storeCountRows[0]?.total_count || '0', 10),
      activeStores: parseInt(storeCountRows[0]?.active_count || '0', 10),
    },
    totalMembers: parseInt(totalMembersRows[0]?.count || '0', 10),
  };
}

// ─── Builder (frontend operatorConfig.ts 의 buildKpaOperatorConfig 와 동일 logic) ──

function buildConfig(
  summary: SummaryShape,
  secondary: SecondaryCounts,
  isAdmin: boolean,
): OperatorDashboardConfig {
  const {
    pendingMembers,
    totalMembers,
    eventOfferPendingCount,
    productApplicationPendingCount,
    recruitmentExposurePendingCount,
  } = secondary;

  const contentDraftCount = summary.content.pendingDraft;
  const forumPendingCount = summary.forum.pendingRequests;
  const signageMediaPendingCount = summary.signage.pendingMedia;
  const signagePlaylistPendingCount = summary.signage.pendingPlaylists;

  // Block 1: KPI Grid — Action Required Only
  const kpis: KpiItem[] = [
    {
      key: 'pending',
      label: '회원 승인 대기',
      value: pendingMembers,
      status: pendingMembers > 0 ? 'warning' : 'neutral',
      link: '/operator/members',
    },
    {
      key: 'forum',
      label: '포럼 요청 대기',
      value: forumPendingCount,
      status: forumPendingCount > 0 ? 'warning' : 'neutral',
      link: '/operator/forum-requests',
    },
    {
      // WO-O4O-KPA-OPERATOR-P2-P3-USABILITY-AND-ERROR-CLEANUP-CONSOLIDATED-V1:
      //   KPI 용어를 도착 화면 H1 + 사이드바('공지사항/뉴스') 와 정합. route 불변.
      key: 'content',
      label: '공지사항/뉴스 발행 대기',
      value: contentDraftCount,
      status: contentDraftCount > 0 ? 'warning' : 'neutral',
      link: '/operator/content',
    },
    {
      // 사이드바 'HQ 미디어' + 화면 'HQ 미디어 관리' 와 정합 (route hq-media).
      key: 'signage-media',
      label: 'HQ 미디어 검수 대기',
      value: signageMediaPendingCount,
      status: signageMediaPendingCount > 0 ? 'warning' : 'neutral',
      link: '/operator/signage/hq-media',
    },
    {
      key: 'signage-playlists',
      label: 'HQ 플레이리스트 검수 대기',
      value: signagePlaylistPendingCount,
      status: signagePlaylistPendingCount > 0 ? 'warning' : 'neutral',
      link: '/operator/signage/hq-playlists',
    },
    {
      // WO-O4O-KPA-OPERATOR-PHARMACY-SERVICE-REQUEST-LEGACY-REMOVE-V1:
      //   약국 서비스 신청 KPI 폐지 → 이벤트 오퍼 승인 대기로 대체 (frontend key='event-offers').
      key: 'event-offers',
      label: '이벤트 오퍼 승인 대기',
      value: eventOfferPendingCount,
      status: eventOfferPendingCount > 0 ? 'warning' : 'neutral',
      link: '/operator/event-offers',
    },
    {
      key: 'product-applications',
      label: '공급 상품 신청 대기',
      value: productApplicationPendingCount,
      status: productApplicationPendingCount > 0 ? 'warning' : 'neutral',
      link: '/operator/product-applications',
    },
    {
      // WO-O4O-KPA-OPERATOR-SELLER-RECRUITMENT-PENDING-KPI-ACTION-QUEUE-V1:
      //   판매자 모집 노출 승인 대기(유통 기능). RecruitmentExposureApprovalPage 기본 탭=pending 이므로
      //   canonical route 만으로 노출 대기 목록 진입.
      key: 'recruitment-exposure',
      label: '판매자 모집 승인 대기',
      value: recruitmentExposurePendingCount,
      status: recruitmentExposurePendingCount > 0 ? 'warning' : 'neutral',
      link: '/operator/recruitment-exposure',
    },
    ...(isAdmin
      ? [
          {
            key: 'total-members',
            label: '전체 회원',
            value: totalMembers,
            status: 'neutral' as const,
            link: '/operator/members',
          },
          // WO-O4O-KPA-OPERATOR-ORGANIZATION-REQUESTS-ROLE-BOUNDARY-RESOLVE-V1:
          //   'service-apps'(서비스 신청) KPI 제거 — dead route /operator/organization-requests +
          //   잘못된 entity_type 카운트(항상 0). 조직 가입 승인 관리 UI 부재로 재배선 불가.
        ]
      : []),
  ];

  // Block 2: AI Summary — severity sort + splice(3)
  const levelOrder = { critical: 0, warning: 1, info: 2 } as const;
  const aiSummary: AiSummaryItem[] = [];
  if (pendingMembers > 0) {
    const level: AiSummaryItem['level'] =
      pendingMembers > 10 ? 'critical' : pendingMembers > 3 ? 'warning' : 'info';
    aiSummary.push({
      id: 'ai-pending-members',
      message:
        pendingMembers > 5
          ? `회원 승인 ${pendingMembers}건 긴급 — 즉시 처리가 필요합니다.`
          : `회원 승인 ${pendingMembers}건 대기 — 검토해 주세요.`,
      level,
      link: '/operator/members',
    });
  }
  if (forumPendingCount > 0) {
    aiSummary.push({
      id: 'ai-forum-requests',
      message: `포럼 개설 요청 ${forumPendingCount}건 대기 — 검토가 필요합니다.`,
      level: forumPendingCount > 5 ? 'warning' : 'info',
      link: '/operator/forum-requests',
    });
  }
  if (eventOfferPendingCount > 0) {
    const level: AiSummaryItem['level'] =
      eventOfferPendingCount > 5
        ? 'critical'
        : eventOfferPendingCount > 2
          ? 'warning'
          : 'info';
    aiSummary.push({
      id: 'ai-event-offers',
      message:
        eventOfferPendingCount > 3
          ? `이벤트 오퍼 ${eventOfferPendingCount}건 긴급 — 승인 처리가 필요합니다.`
          : `이벤트 오퍼 ${eventOfferPendingCount}건 승인 대기 — 검토해 주세요.`,
      level,
      link: '/operator/event-offers',
    });
  }
  if (productApplicationPendingCount > 0) {
    aiSummary.push({
      id: 'ai-product-applications',
      message:
        productApplicationPendingCount > 3
          ? `상품 신청 ${productApplicationPendingCount}건 긴급 — 승인 처리가 필요합니다.`
          : `상품 신청 ${productApplicationPendingCount}건 대기 — 검토해 주세요.`,
      level: productApplicationPendingCount > 3 ? 'warning' : 'info',
      link: '/operator/product-applications',
    });
  }
  if (recruitmentExposurePendingCount > 0) {
    aiSummary.push({
      id: 'ai-recruitment-exposure',
      message:
        recruitmentExposurePendingCount > 3
          ? `판매자 모집 노출 승인 ${recruitmentExposurePendingCount}건 긴급 — 검토가 필요합니다.`
          : `판매자 모집 노출 승인 ${recruitmentExposurePendingCount}건 대기 — 검토해 주세요.`,
      level: recruitmentExposurePendingCount > 3 ? 'warning' : 'info',
      link: '/operator/recruitment-exposure',
    });
  }
  if (contentDraftCount > 0) {
    aiSummary.push({
      id: 'ai-content-draft',
      message: `콘텐츠 ${contentDraftCount}건 발행 대기 — 검토 후 발행해 주세요.`,
      level: contentDraftCount > 5 ? 'warning' : 'info',
      link: '/operator/content',
    });
  }
  if (signageMediaPendingCount > 0) {
    aiSummary.push({
      id: 'ai-signage-media-pending',
      message: `사이니지 미디어 ${signageMediaPendingCount}건 대기 — 확인이 필요합니다.`,
      level: signageMediaPendingCount > 3 ? 'warning' : 'info',
      link: '/operator/signage/hq-media',
    });
  }
  if (signagePlaylistPendingCount > 0) {
    aiSummary.push({
      id: 'ai-signage-playlists-pending',
      message: `사이니지 플레이리스트 ${signagePlaylistPendingCount}건 대기 — 확인이 필요합니다.`,
      level: signagePlaylistPendingCount > 3 ? 'warning' : 'info',
      link: '/operator/signage/hq-playlists',
    });
  }
  // WO-O4O-KPA-OPERATOR-ORGANIZATION-REQUESTS-ROLE-BOUNDARY-RESOLVE-V1:
  //   'ai-service-apps' 제거 — dead route + 항상 0 카운트(위 KPI 제거와 동일 사유).
  aiSummary.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);
  aiSummary.splice(3);

  // Block 3: Action Queue — Action Required Only
  const actionQueue: ActionItem[] = [];
  if (pendingMembers > 0) {
    actionQueue.push({
      id: 'aq-members',
      label: '회원 승인 검토',
      count: pendingMembers,
      link: '/operator/members',
    });
  }
  if (forumPendingCount > 0) {
    actionQueue.push({
      id: 'aq-forum',
      label: '포럼 요청 검토',
      count: forumPendingCount,
      link: '/operator/forum-requests',
    });
  }
  if (contentDraftCount > 0) {
    actionQueue.push({
      id: 'aq-content',
      label: '공지사항/뉴스 발행 대기',
      count: contentDraftCount,
      link: '/operator/content',
    });
  }
  if (signageMediaPendingCount > 0) {
    actionQueue.push({
      id: 'aq-signage-media',
      label: 'HQ 미디어 검수',
      count: signageMediaPendingCount,
      link: '/operator/signage/hq-media',
    });
  }
  if (signagePlaylistPendingCount > 0) {
    actionQueue.push({
      id: 'aq-signage-playlists',
      label: 'HQ 플레이리스트 검수',
      count: signagePlaylistPendingCount,
      link: '/operator/signage/hq-playlists',
    });
  }
  if (eventOfferPendingCount > 0) {
    actionQueue.push({
      id: 'aq-event-offers',
      label: '이벤트 오퍼 승인 검토',
      count: eventOfferPendingCount,
      link: '/operator/event-offers',
    });
  }
  if (productApplicationPendingCount > 0) {
    actionQueue.push({
      id: 'aq-product-applications',
      label: '공급 상품 신청 검토',
      count: productApplicationPendingCount,
      link: '/operator/product-applications',
    });
  }
  if (recruitmentExposurePendingCount > 0) {
    // WO-O4O-KPA-OPERATOR-SELLER-RECRUITMENT-PENDING-KPI-ACTION-QUEUE-V1:
    //   0건이면 Queue 미노출(조건부 push). 클릭 시 실제 승인 콘솔(기본 pending 탭)로 이동.
    actionQueue.push({
      id: 'aq-recruitment-exposure',
      label: '판매자 모집 노출 승인 검토',
      count: recruitmentExposurePendingCount,
      link: '/operator/recruitment-exposure',
    });
  }
  // WO-O4O-KPA-OPERATOR-ORGANIZATION-REQUESTS-ROLE-BOUNDARY-RESOLVE-V1:
  //   'aq-service-apps' 제거 — dead route + 항상 0 카운트(위 KPI/AI 제거와 동일 사유).

  // Block 4: Activity Log — content/forum/signage/recentActivity merge + sort + splice(15)
  const activityLog: ActivityItem[] = [];
  for (const c of summary.content.recentItems) {
    activityLog.push({
      id: `c-${c.id}`,
      message: `콘텐츠: ${c.title}`,
      timestamp: c.publishedAt || c.createdAt,
    });
  }
  for (const p of summary.forum.recentPosts) {
    activityLog.push({
      id: `f-${p.id}`,
      message: `포럼: ${p.title}${p.authorName ? ` (${p.authorName})` : ''}`,
      timestamp: p.createdAt,
    });
  }
  for (const m of summary.signage.recentMedia) {
    activityLog.push({
      id: `m-${m.id}`,
      message: `사이니지: ${m.name}`,
      timestamp: '',
    });
  }
  for (const evt of summary.recentActivity) {
    activityLog.push({
      id: `ra-${evt.type}-${evt.timestamp}`,
      message: evt.label,
      timestamp: evt.timestamp,
    });
  }
  const validLog = activityLog.filter((a) => a.timestamp);
  validLog.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  validLog.splice(15);

  // Block 5: Quick Actions
  // WO-O4O-DASHBOARD-ACTION-ICON-VOCAB-STANDARDIZE-V1 (Phase B):
  //   emoji icon → lucide-name 정렬. ActionIcon vocabulary 16종 안에서 매핑.
  //   ActionIcon 의 Phase A fallback 은 유지되므로 GlycoPharm/K-Cos/Neture 의
  //   기존 emoji 또는 미매핑 lucide-name 은 회귀 0.
  const quickActions: QuickActionItem[] = [
    { id: 'qa-content', label: '콘텐츠 관리', link: '/operator/content', icon: 'file-text' },
    { id: 'qa-community', label: 'Home 편집', link: '/operator/community', icon: 'home' },
    { id: 'qa-content-hub', label: '콘텐츠 허브 관리', link: '/operator/docs', icon: 'package' },
    { id: 'qa-lms', label: '강의 관리', link: '/operator/lms', icon: 'clipboard-list' },
    { id: 'qa-signage', label: '사이니지', link: '/operator/signage/hq-media', icon: 'monitor-play' },
    { id: 'qa-stores', label: '매장 관리', link: '/operator/stores', icon: 'store' },
    ...(isAdmin
      ? [
          { id: 'qa-roles', label: '역할 관리', link: '/operator/roles', icon: 'key' },
          { id: 'qa-audit', label: '감사 로그', link: '/operator/audit-logs', icon: 'scroll-text' },
        ]
      : []),
  ];

  return { kpis, aiSummary, actionQueue, activityLog: validLog, quickActions };
}

// ─── Public entry ────────────────────────────────────────────────────────────

/**
 * Fetch all KPA operator dashboard data and assemble 5-Block config.
 *
 * - `/operator/summary` 와 동일한 query 재사용 (3 module service + raw)
 * - 추가 보조 query (members pending / event-offer pending / store stats /
 *   product-applications pending / [admin] total members)
 * - frontend `buildKpaOperatorConfig` 의 5-Block 조립 logic 동일 적용
 *
 * AxisNavigation axes / OperatorRoleGuideCard content 미포함 — frontend 유지 (I1/I3 정합).
 */
export async function buildKpaOperatorDashboardConfig(
  dataSource: DataSource,
  services: KpaDashboardServices,
  _userId: string,
  isAdmin: boolean,
): Promise<OperatorDashboardConfig> {
  const [summary, secondary] = await Promise.all([
    fetchSummaryShape(dataSource, services),
    fetchSecondaryCounts(dataSource, isAdmin),
  ]);
  return buildConfig(summary, secondary, isAdmin);
}
