import type { CentralOperationMenu } from '@o4o/types';

export const CENTRAL_OPERATION_SERVICES = [
  ['neture', '약국·공통 운영'], ['supplier', '공급자'], ['funding', '펀딩'],
  ['lecture', '강의'], ['community', '커뮤니티'], ['partner-support', '파트너'],
  ['pharmcoop', '협동조합 연합회'],
] as const;
// WO-O4O-ADMIN-OPERATOR-MENU-REALIGNMENT-V1 (2026-11-07): 업무 성격 기준 그룹.
//   업무함(처리 대기 · 문의 · 알림)을 한 그룹에, admin 등급 완전 삭제를 '최종 삭제' 그룹에 모은다.
const labels = {
  members: '회원·자격', communication: '업무함·문의·알림', products: '상품',
  stores: '매장·거래', business: '서비스 운영', content: '콘텐츠·홈', settings: '운영·설정',
  final: '최종 삭제(관리자)',
} as const;
export type CentralGroupKey = keyof typeof labels;
const netureAreas: Record<CentralGroupKey, readonly string[]> = {
  members: ['members','service-members','qualifications','applications','pharmacies'],
  communication: ['actions','inbox','legacy-contact','notifications'],
  products: ['cleanup','category-mapping','products','product-approvals','service-product-approvals','service-approval-management','candidates'],
  stores: ['stores','settlements','orders'],
  content: ['forums','forum-delete','forum-analytics','guides','home','cms','community-advertising'],
  settings: ['analytics','ai-report','legal','contact-settings'], business: [],
  final: ['forum-deleted'],
};
const finalAreas = ['forum-deleted','erase-members','erase-boards'];
export function centralMenuGroup(menu: CentralOperationMenu): CentralGroupKey {
  if (menu.service === 'neture') {
    const key = (Object.keys(netureAreas) as CentralGroupKey[]).find(key => netureAreas[key].includes(menu.area));
    if (key) return key;
  }
  if (finalAreas.includes(menu.area)) return 'final';
  if (['inbox','legacy-contact','contact'].includes(menu.area)) return 'communication';
  if (menu.service === 'lecture' && ['courses','certificates'].includes(menu.area)) return 'business';
  return ({members:'members', service:'content', business:'business', settings:'settings'} as const)[menu.group];
}
export function centralGroups(menus: readonly CentralOperationMenu[]) {
  return (Object.keys(labels) as CentralGroupKey[]).map(key => ({
    key, label: labels[key], menus: menus.filter(menu => centralMenuGroup(menu) === key),
  })).filter(group => group.menus.length > 0);
}
export const centralMenuHref = (menu: CentralOperationMenu) => `/operations/${menu.service}/${menu.area}`;
export const centralMenuIsActive = (menu: CentralOperationMenu, pathname: string) =>
  pathname === centralMenuHref(menu) || pathname.startsWith(`${centralMenuHref(menu)}/`);
