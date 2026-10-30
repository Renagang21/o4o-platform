/** Direct-operation work only. A menu grant never replaces service/organization/API authorization. */
export const CENTRAL_OPERATION_SERVICES = [
  'neture', 'supplier', 'funding', 'lecture', 'community', 'partner-support', 'pharmcoop',
] as const;
export type CentralOperationService = typeof CENTRAL_OPERATION_SERVICES[number];

export interface CentralOperationMenu {
  key: string;
  service: CentralOperationService;
  area: string;
  label: string;
  group: 'members' | 'service' | 'business' | 'settings';
  minimumRole: 'operator' | 'admin' | 'platform';
  sourcePaths: readonly string[];
}
const item = (
  service: CentralOperationService, area: string, label: string,
  group: CentralOperationMenu['group'], sourcePaths: readonly string[],
  minimumRole: CentralOperationMenu['minimumRole'] = 'operator',
): CentralOperationMenu => ({ key: `${service}.${area}`, service, area, label, group, minimumRole, sourcePaths });

/** Each entry is a real existing work surface, including its detail/tab workflows. */
export const CENTRAL_OPERATION_MENUS: readonly CentralOperationMenu[] = [
  item('neture', 'members', '공통 회원 관리', 'members', []),
  item('neture', 'service-members', 'O4O 서비스 회원·이용 상태', 'members', ['/operator/users','/operator/members']),
  item('neture', 'membership-cleanup', '서비스 가입 관계 정리', 'members', ['/admin/members'], 'admin'),
  item('neture', 'qualifications', '약사 자격 검토', 'members', []),
  item('neture', 'applications', '기존 서비스 가입 검토', 'members', ['/operator/applications']),
  item('neture', 'pharmacies', '약국·매장 신청 심사', 'members', ['/operator/pharmacy-memberships']),
  item('neture', 'inbox', '운영 알림·문의함', 'service', ['/operator/inbox/neture']),
  item('neture', 'legacy-contact', '기존 문의 관리', 'service', ['/operator/contact-messages']),
  item('neture', 'forums', '포럼 개설 신청', 'service', ['/operator/community']),
  item('neture', 'forum-delete', '포럼 삭제 요청', 'service', ['/operator/forum-delete', '/operator/forum-delete-requests']),
  item('neture', 'forum-deleted', '삭제된 포럼 관리', 'service', ['/admin/forum-deleted'], 'admin'),
  item('neture', 'forum-analytics', '포럼 분석', 'service', ['/operator/forum-analytics']),
  item('neture', 'guides', '안내 문구 관리', 'service', ['/operator/guide-contents']),
  item('neture', 'home', '홈·공지·광고 운영', 'service', ['/operator/home-presentation/neture']),
  item('neture', 'cms', '홈페이지 콘텐츠', 'service', ['/operator/homepage-cms'], 'admin'),
  item('neture', 'community-advertising', '커뮤니티 광고', 'service', ['/admin/community-admin'], 'admin'),
  item('neture', 'cleanup', '공통 상품 정비·휴지통', 'business', ['/admin/product-cleanup'], 'platform'),
  item('neture', 'category-mapping', '상품 분류 매핑', 'business', ['/operator/category-mapping-rules'], 'platform'),
  item('neture', 'products', '서비스 상품 현황', 'business', ['/operator/all-registered-products']),
  item('neture', 'product-approvals', '상품 취급 승인', 'business', ['/operator/product-approvals']),
  item('neture', 'service-product-approvals', '서비스별 상품 승인', 'business', ['/operator/product-service-approvals']),
  item('neture', 'service-approval-management', '서비스 상품 승인·철회 관리', 'business', ['/admin/service-approvals'], 'admin'),
  item('neture', 'candidates', '상품 후보 검토', 'business', ['/operator/product-candidates']),
  item('neture', 'stores', '매장 관리', 'business', ['/operator/stores']),
  item('neture', 'settlements', 'B2B 정산·알림 복구', 'business', ['/admin/settlements'], 'admin'),
  item('neture', 'orders', 'B2B 주문 현황', 'business', ['/operator/orders']),
  item('neture', 'actions', '운영 처리 대기', 'business', ['/operator/actions']),
  item('neture', 'analytics', '운영 분석', 'settings', ['/operator/analytics']),
  item('neture', 'ai-report', 'AI 운영 리포트', 'settings', ['/operator/ai-report']),
  item('neture', 'notifications', '알림 설정', 'settings', ['/operator/settings/notifications'], 'platform'),
  item('neture', 'legal', '법정정보·약관', 'settings', ['/admin/settings/legal-terms'], 'admin'),
  item('neture', 'contact-settings', '문의 설정', 'settings', ['/admin/settings/contact'], 'admin'),
  item('supplier', 'members', '공급 서비스 회원', 'members', ['/operator/service-members/supplier']),
  item('supplier', 'suppliers', '공급자 신청·증빙·보완 심사', 'business', ['/operator/suppliers']),
  item('supplier', 'governance', '공급자 상태 관리', 'business', ['/admin/supplier-governance'], 'admin'),
  item('supplier', 'inbox', '운영 알림·문의함', 'service', ['/operator/inbox/supplier', '/operator/service-contact/supplier']),
  item('supplier', 'contact-settings', '문의 설정', 'settings', ['/operator/service-contact/supplier/settings'], 'admin'),
  item('supplier', 'home', '홈·공지·광고 운영', 'service', ['/operator/home-presentation/supplier']),
  item('supplier', 'legal', '법정정보·약관', 'settings', ['/operator/legal/supplier'], 'admin'),
  item('funding', 'members', '펀딩 서비스 회원', 'members', ['/operator/service-members/funding']),
  item('funding', 'funding', '펀딩 개설·참여·이행 운영', 'business', ['/operator/market-trial']),
  item('funding', 'inbox', '운영 알림·문의함', 'service', ['/operator/inbox/funding', '/operator/service-contact/funding']),
  item('funding', 'contact-settings', '문의 설정', 'settings', ['/operator/service-contact/funding/settings'], 'admin'),
  item('funding', 'home', '홈·공지·광고 운영', 'service', ['/operator/home-presentation/funding']),
  item('funding', 'legal', '법정정보·약관', 'settings', ['/operator/legal/funding'], 'admin'),
  item('lecture', 'members', '강의 서비스 회원', 'members', ['/operator/members']),
  item('lecture', 'instructors', '강사 신청 검토', 'members', ['/operator/instructors']),
  item('lecture', 'courses', '강의 개설·자료·게시 운영', 'service', ['/operator', '/operator/courses']),
  item('lecture', 'certificates', '수료증 발급·갱신·복구', 'service', ['/operator/certificates']),
  item('lecture', 'contact', '문의·기존 강의 개설 문의', 'service', ['/operator/contact']),
  item('lecture', 'inbox', '운영 알림·문의함', 'service', ['/operator/inbox']),
  item('lecture', 'contact-settings', '문의 설정', 'settings', ['/operator/service-contact/lecture/settings'], 'admin'),
  item('lecture', 'legal', '법정정보·약관', 'settings', [], 'admin'),
  item('lecture', 'home', '홈·공지 운영', 'service', ['/operator/home-presentation']),
  item('community', 'members', '커뮤니티 회원', 'members', ['/operator/service-members/community']),
  item('community', 'inbox', '운영 알림·문의함', 'service', ['/operator/inbox/community', '/operator/service-contact/community']),
  item('community', 'boards', '게시판·게시글·회원 운영', 'service', ['/operator/communities/boards']),
  item('community', 'forums', '포럼 개설·공개 설정', 'service', ['/operator/communities']),
  item('community', 'editorial', '첫 화면·콘텐츠·자료', 'service', ['/operator/communities/home']),
  item('community', 'contact-settings', '문의 설정', 'settings', ['/operator/service-contact/community/settings'], 'admin'),
  item('community', 'home', '홈·공지·광고 운영', 'service', ['/operator/home-presentation/community']),
  item('community', 'legal', '법정정보·약관', 'settings', ['/operator/legal/community'], 'admin'),
  item('community', 'erase-members', '회원 데이터 완전 삭제', 'settings', ['/admin/communities/members'], 'admin'),
  item('community', 'erase-boards', '게시판 데이터 완전 삭제', 'settings', ['/admin/communities/boards'], 'admin'),
  item('partner-support', 'reports', '파트너 신고 처리', 'service', ['/operator']),
  item('partner-support', 'posts', '파트너 글·댓글 운영', 'service', ['/operator']),
  item('partner-support', 'members', '파트너 회원 관리', 'members', ['/operator']),
  item('partner-support', 'boards', '파트너 게시판 관리', 'service', ['/operator']),
  item('partner-support', 'events', '파트너 운영 이력', 'settings', ['/operator']),
  item('pharmcoop', 'federation', '연합회 가입·참여 운영', 'members', ['/operator']),
  item('pharmcoop', 'inbox', '연합회 알림·문의함', 'service', ['/operator/inbox']),
  item('pharmcoop', 'home', '연합회 홈·공지 운영', 'service', ['/operator/home-presentation']),
];

export function centralServiceForRole(role: string): CentralOperationService | null {
  if (['neture:pharmcoop_admin', 'neture:pharmcoop_operator'].includes(role)) return 'pharmcoop';
  const [service, level, extra] = role.split(':');
  if (extra || !['admin', 'operator'].includes(level)) return null;
  return CENTRAL_OPERATION_SERVICES.includes(service as CentralOperationService) && service !== 'pharmcoop'
    ? service as CentralOperationService : null;
}

export function centralMenusForRole(role: string): readonly CentralOperationMenu[] {
  if (role === 'platform:super_admin') return CENTRAL_OPERATION_MENUS;
  const service = centralServiceForRole(role);
  const admin = role.endsWith(':admin') || role === 'neture:pharmcoop_admin';
  return CENTRAL_OPERATION_MENUS.filter(menu => menu.service === service && menu.minimumRole !== 'platform' && (menu.minimumRole !== 'admin' || admin));
}
