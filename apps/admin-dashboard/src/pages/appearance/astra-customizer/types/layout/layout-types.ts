/**
 * Layout Type Definitions
 * 레이아웃 관련 타입을 정의합니다.
 */

import type { ResponsiveValue } from '../common/base-types';

/**
 * 컨테이너 레이아웃 설정
 */
export interface ContainerSettings {
  layout: 'boxed' | 'full-width' | 'fluid';
  width: ResponsiveValue<number>;
  padding: ResponsiveValue<{
    top: number;
    right: number;
    bottom: number;
    left: number;
  }>;
  margin: ResponsiveValue<{
    top: number;
    bottom: number;
  }>;
}

/**
 * 사이드바 설정
 */
export interface SidebarSettings {
  layout: 'no-sidebar' | 'left-sidebar' | 'right-sidebar' | 'both-sidebars';
  width: ResponsiveValue<number>;
  gap: ResponsiveValue<number>;
}
