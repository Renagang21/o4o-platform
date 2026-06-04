/**
 * KPA Operator Dashboard Service
 *
 * WO-O4O-KPA-OPERATOR-DASHBOARD-API-5BLOCK-FOUNDATION-V1
 *   IR-O4O-KPA-OPERATOR-DASHBOARD-API-5BLOCK-UNIFICATION-V1 (Option B) 의 Foundation.
 *   backend `/api/v1/kpa/operator/dashboard` endpoint 의 데이터 fetch + 5-Block 조립 service.
 *
 * 책임:
 *   - 기존 /operator/summary 의 17 query 동일 재사용 (3 module service + 14 raw)
 *   - 추가 6 보조 query (members pending / pharmacy-requests pending / store stats /
 *     product-applications pending / [admin] total members / [admin] organization-join pending)
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
    membershipPending: number;
  };
  store: {
    forcedExpirySoon: number;
  };
  recentActivity: Array<{
    type: 'member_join' | 'pharmacy_request' | 'application' | 'org_join';
    label: string;
    timestamp: string;
    status: string;
  }>;
}

interface SecondaryCounts {
  pendingMembers: number;
  totalMembers: number;
  pharmacyRequestCount: number;
  productApplicationPendingCount: number;
  serviceApplicationCount: number;
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
    membershipPendingCount,
    forcedExpirySoonCount,
    recentMemberRows,
    recentPharmacyRows,
    recentApplicationRows,
    recentOrgJoinRows,
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
      SELECT COUNT(*) AS count FROM kpa_approval_requests
      WHERE entity_type = 'membership' AND status = 'pending'
    `),
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
    dataSource.query(`
      SELECT id, pharmacy_name, status, created_at
      FROM kpa_pharmacy_requests
      ORDER BY created_at DESC LIMIT 5
    `).catch(() => []),
    dataSource.query(`
      SELECT a.id, u.name as applicant_name, a.status, a.created_at
      FROM kpa_applications a
      LEFT JOIN users u ON u.id = a.user_id
      ORDER BY a.created_at DESC LIMIT 5
    `).catch(() => []),
    dataSource.query(`
      SELECT r.id, r.requester_name AS name,
             r.payload->>'request_type' AS request_type, r.status, r.created_at
      FROM kpa_approval_requests r
      WHERE r.entity_type = 'membership'
      ORDER BY r.created_at DESC LIMIT 5
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
  for (const r of (recentPharmacyRows as any[]) || []) {
    recentActivity.push({
      type: 'pharmacy_request',
      label: `${r.pharmacy_name || '약국'} 서비스 신청`,
      timestamp: r.created_at,
      status: r.status,
    });
  }
  for (const r of (recentApplicationRows as any[]) || []) {
    recentActivity.push({
      type: 'application',
      label: `${r.applicant_name || '(이름 없음)'} 입회 신청`,
      timestamp: r.created_at,
      status: r.status,
    });
  }
  for (const r of (recentOrgJoinRows as any[]) || []) {
    recentActivity.push({
      type: 'org_join',
      label: `${r.name || '(이름 없음)'} 조직 가입 요청`,
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
      membershipPending: parseInt(membershipPendingCount[0]?.count || '0', 10),
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
  // 약국 서비스 신청 pending = kpa_pharmacy_requests.status='pending'.
  // 상품 신청 pending = kpa_product_applications.status='pending' (operator-product-applications/stats endpoint 와 동일).
  // 매장 통계 = organization_service_enrollments service_code='kpa-society' active count (간단 통계).
  // (admin) 전체 회원 = kpa_members count.
  // (admin) 조직 가입 요청 pending = kpa_approval_requests entity_type='org_join' or domain-specific table.

  const [
    pendingMembersRows,
    pharmacyRequestRows,
    productAppPendingRows,
    storeCountRows,
    totalMembersRows,
    serviceAppRows,
  ] = await Promise.all([
    dataSource.query(`
      SELECT COUNT(*) AS count FROM kpa_members WHERE status = 'pending'
    `).catch(() => [{ count: '0' }]),
    dataSource.query(`
      SELECT COUNT(*) AS count FROM kpa_pharmacy_requests WHERE status = 'pending'
    `).catch(() => [{ count: '0' }]),
    dataSource.query(`
      SELECT COUNT(*) AS count FROM kpa_product_applications WHERE status = 'pending'
    `).catch(() => [{ count: '0' }]),
    dataSource.query(`
      SELECT
        COUNT(*) FILTER (WHERE ose.status = 'active') AS active_count,
        COUNT(*) AS total_count
      FROM organization_service_enrollments ose
      WHERE ose.service_code = 'kpa-society'
    `).catch(() => [{ active_count: '0', total_count: '0' }]),
    isAdmin
      ? dataSource.query(`SELECT COUNT(*) AS count FROM kpa_members`).catch(() => [{ count: '0' }])
      : Promise.resolve([{ count: '0' }]),
    isAdmin
      ? dataSource.query(`
          SELECT COUNT(*) AS count FROM kpa_approval_requests
          WHERE entity_type IN ('organization_join', 'org_join') AND status = 'pending'
        `).catch(() => [{ count: '0' }])
      : Promise.resolve([{ count: '0' }]),
  ]);

  return {
    pendingMembers: parseInt(pendingMembersRows[0]?.count || '0', 10),
    pharmacyRequestCount: parseInt(pharmacyRequestRows[0]?.count || '0', 10),
    productApplicationPendingCount: parseInt(productAppPendingRows[0]?.count || '0', 10),
    storeStats: {
      totalStores: parseInt(storeCountRows[0]?.total_count || '0', 10),
      activeStores: parseInt(storeCountRows[0]?.active_count || '0', 10),
    },
    totalMembers: parseInt(totalMembersRows[0]?.count || '0', 10),
    serviceApplicationCount: parseInt(serviceAppRows[0]?.count || '0', 10),
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
    serviceApplicationCount,
    pharmacyRequestCount,
    productApplicationPendingCount,
  } = secondary;

  const contentDraftCount = summary.content.pendingDraft;
  const forumPendingCount = summary.forum.pendingRequests;
  const signagePendingCount =
    summary.signage.pendingMedia + summary.signage.pendingPlaylists;

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
      link: '/operator/forum-management',
    },
    {
      key: 'content',
      label: '콘텐츠 발행 대기',
      value: contentDraftCount,
      status: contentDraftCount > 0 ? 'warning' : 'neutral',
      link: '/operator/content',
    },
    {
      key: 'signage',
      label: '사이니지 검수 대기',
      value: signagePendingCount,
      status: signagePendingCount > 0 ? 'warning' : 'neutral',
      link: '/operator/signage/hq-media',
    },
    {
      key: 'pharmacy-requests',
      label: '약국 서비스 신청',
      value: pharmacyRequestCount,
      status: pharmacyRequestCount > 0 ? 'warning' : 'neutral',
      link: '/operator/pharmacy-requests',
    },
    {
      key: 'product-applications',
      label: '상품 신청 대기',
      value: productApplicationPendingCount,
      status: productApplicationPendingCount > 0 ? 'warning' : 'neutral',
      link: '/operator/product-applications',
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
          {
            key: 'service-apps',
            label: '서비스 신청',
            value: serviceApplicationCount,
            status:
              serviceApplicationCount > 0
                ? ('warning' as const)
                : ('neutral' as const),
            link: '/operator/pharmacy-requests',
          },
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
      link: '/operator/forum-management',
    });
  }
  if (pharmacyRequestCount > 0) {
    const level: AiSummaryItem['level'] =
      pharmacyRequestCount > 5
        ? 'critical'
        : pharmacyRequestCount > 2
          ? 'warning'
          : 'info';
    aiSummary.push({
      id: 'ai-pharmacy-requests',
      message:
        pharmacyRequestCount > 3
          ? `약국 서비스 신청 ${pharmacyRequestCount}건 긴급 — 승인 처리가 필요합니다.`
          : `약국 서비스 신청 ${pharmacyRequestCount}건 대기 — 검토해 주세요.`,
      level,
      link: '/operator/pharmacy-requests',
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
  if (contentDraftCount > 0) {
    aiSummary.push({
      id: 'ai-content-draft',
      message: `콘텐츠 ${contentDraftCount}건 발행 대기 — 검토 후 발행해 주세요.`,
      level: contentDraftCount > 5 ? 'warning' : 'info',
      link: '/operator/content',
    });
  }
  if (signagePendingCount > 0) {
    aiSummary.push({
      id: 'ai-signage-pending',
      message: `사이니지 ${signagePendingCount}건 검수 대기 — 확인이 필요합니다.`,
      level: signagePendingCount > 3 ? 'warning' : 'info',
      link: '/operator/signage/hq-media',
    });
  }
  if (isAdmin && serviceApplicationCount > 0) {
    aiSummary.push({
      id: 'ai-service-apps',
      message:
        serviceApplicationCount > 3
          ? `서비스 신청 ${serviceApplicationCount}건 긴급 — 승인 처리가 필요합니다.`
          : `서비스 신청 ${serviceApplicationCount}건 대기 — 검토해 주세요.`,
      level: serviceApplicationCount > 3 ? 'warning' : 'info',
      link: '/operator/organization-requests',
    });
  }
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
      link: '/operator/forum-management',
    });
  }
  if (contentDraftCount > 0) {
    actionQueue.push({
      id: 'aq-content',
      label: '콘텐츠 발행 대기',
      count: contentDraftCount,
      link: '/operator/content',
    });
  }
  if (signagePendingCount > 0) {
    actionQueue.push({
      id: 'aq-signage',
      label: '사이니지 검수 대기',
      count: signagePendingCount,
      link: '/operator/signage/hq-media',
    });
  }
  if (pharmacyRequestCount > 0) {
    actionQueue.push({
      id: 'aq-pharmacy-requests',
      label: '약국 서비스 신청 검토',
      count: pharmacyRequestCount,
      link: '/operator/pharmacy-requests',
    });
  }
  if (productApplicationPendingCount > 0) {
    actionQueue.push({
      id: 'aq-product-applications',
      label: '상품 신청 검토',
      count: productApplicationPendingCount,
      link: '/operator/product-applications',
    });
  }
  if (isAdmin && serviceApplicationCount > 0) {
    actionQueue.push({
      id: 'aq-service-apps',
      label: '서비스 신청 검토',
      count: serviceApplicationCount,
      link: '/operator/pharmacy-requests',
    });
  }

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
    { id: 'qa-members', label: '회원 관리', link: '/operator/members', icon: 'users' },
    { id: 'qa-pharmacy-requests', label: '약국 서비스 신청', link: '/operator/pharmacy-requests', icon: 'clipboard-list' },
    { id: 'qa-product-apps', label: '상품 신청 관리', link: '/operator/product-applications', icon: 'shopping-cart' },
    { id: 'qa-content', label: '콘텐츠 관리', link: '/operator/content', icon: 'file-text' },
    { id: 'qa-news', label: '공지사항', link: '/operator/news', icon: 'megaphone' },
    { id: 'qa-forum', label: '포럼 관리', link: '/operator/forum-management', icon: 'message-square' },
    { id: 'qa-signage', label: '사이니지', link: '/operator/signage/hq-media', icon: 'monitor-play' },
    { id: 'qa-stores', label: '매장 관리', link: '/operator/stores', icon: 'store' },
    { id: 'qa-event-offers', label: '이벤트 오퍼', link: '/operator/event-offers', icon: 'badge-percent' },
    ...(isAdmin
      ? [
          { id: 'qa-community', label: 'Home 편집', link: '/operator/community', icon: 'home' },
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
 * - `/operator/summary` 와 동일한 17 query 재사용 (3 module service + 14 raw)
 * - 추가 6 보조 query (members pending / pharmacy-requests pending / store stats /
 *   product-applications pending / [admin] total members / [admin] organization-join)
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
