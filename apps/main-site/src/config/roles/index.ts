/**
 * 역할별 설정 레지스트리 통합 export
 */

export * from './menus';
export * from './banners';
export * from './dashboards';

// 타입 재export
export type { MenuItem, RoleMenuConfig } from './menus';
export type { BannerConfig } from './banners';
export type { DashboardCard, DashboardConfig } from './dashboards';
