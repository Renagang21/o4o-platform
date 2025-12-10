/**
 * Navigation Registry
 *
 * 앱 manifest의 navigation 정보를 기반으로 메뉴 구조를 자동 구성하는 Registry
 *
 * 주요 기능:
 * - Navigation 아이템 등록
 * - 계층적 메뉴 트리 구성
 * - 권한 기반 필터링
 */

import type { NavigationItem } from './types.js';

/**
 * Navigation Registry 클래스
 *
 * 모든 앱의 Navigation 정보를 중앙에서 관리
 */
export class NavigationRegistry {
  private items = new Map<string, NavigationItem>();

  /**
   * Navigation 아이템 등록
   *
   * @param item - Navigation 아이템
   */
  registerNav(item: NavigationItem): void {
    if (this.items.has(item.id)) {
      console.warn(`[NavigationRegistry] Nav item "${item.id}" already registered. Replacing.`);
    }

    this.items.set(item.id, item);
    console.log(`[NavigationRegistry] Registered nav: ${item.id} (app: ${item.appId})`);
  }

  /**
   * 여러 Navigation 아이템 일괄 등록
   *
   * @param items - Navigation 아이템 배열
   */
  registerMultiple(items: NavigationItem[]): void {
    for (const item of items) {
      this.registerNav(item);
    }
  }

  /**
   * Navigation 아이템 조회
   *
   * @param id - 아이템 ID
   * @returns NavigationItem 또는 undefined
   */
  getNav(id: string): NavigationItem | undefined {
    return this.items.get(id);
  }

  /**
   * 계층적 Navigation 트리 구성
   *
   * @returns 트리 구조로 변환된 Navigation 아이템 배열
   */
  getNavTree(): NavigationItem[] {
    const rootItems: NavigationItem[] = [];
    const childrenMap = new Map<string, NavigationItem[]>();

    // 1단계: 부모/자식 관계 분류
    for (const item of this.items.values()) {
      if (item.parentId) {
        // 자식 아이템
        const siblings = childrenMap.get(item.parentId) || [];
        siblings.push(item);
        childrenMap.set(item.parentId, siblings);
      } else {
        // 루트 아이템
        rootItems.push({ ...item });
      }
    }

    // 2단계: 자식 아이템을 부모에 연결
    const attachChildren = (items: NavigationItem[]): NavigationItem[] => {
      return items.map((item) => {
        const children = childrenMap.get(item.id);
        if (children && children.length > 0) {
          return {
            ...item,
            children: attachChildren(children).sort((a, b) => (a.order || 0) - (b.order || 0)),
          };
        }
        return item;
      });
    };

    // 3단계: 정렬 후 반환
    return attachChildren(rootItems).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  /**
   * 플랫 Navigation 목록 조회
   *
   * @returns 모든 NavigationItem 배열 (플랫 구조)
   */
  listNav(): NavigationItem[] {
    return Array.from(this.items.values());
  }

  /**
   * 앱별 Navigation 목록 조회
   *
   * @param appId - 앱 ID
   * @returns 해당 앱의 Navigation 배열
   */
  getNavByApp(appId: string): NavigationItem[] {
    return Array.from(this.items.values()).filter((item) => item.appId === appId);
  }

  /**
   * 권한 기반 Navigation 필터링
   *
   * @param userPermissions - 사용자 권한 배열
   * @returns 접근 가능한 Navigation 트리
   */
  getNavTreeFiltered(userPermissions: string[]): NavigationItem[] {
    const hasPermission = (item: NavigationItem): boolean => {
      if (!item.permissions || item.permissions.length === 0) {
        return true; // 권한 없으면 모든 사용자 접근 가능
      }
      return item.permissions.some((p) => userPermissions.includes(p));
    };

    const filterTree = (items: NavigationItem[]): NavigationItem[] => {
      return items
        .filter(hasPermission)
        .map((item) => ({
          ...item,
          children: item.children ? filterTree(item.children) : undefined,
        }))
        .filter((item) => !item.children || item.children.length > 0 || !item.parentId);
    };

    return filterTree(this.getNavTree());
  }

  /**
   * Navigation 아이템 존재 여부 확인
   *
   * @param id - 아이템 ID
   * @returns 존재 여부
   */
  hasNav(id: string): boolean {
    return this.items.has(id);
  }

  /**
   * 앱의 모든 Navigation 해제
   *
   * @param appId - 앱 ID
   * @returns 해제된 아이템 수
   */
  unregisterByApp(appId: string): number {
    let count = 0;

    for (const [id, item] of this.items.entries()) {
      if (item.appId === appId) {
        this.items.delete(id);
        count++;
      }
    }

    if (count > 0) {
      console.log(`[NavigationRegistry] Unregistered ${count} nav items from app: ${appId}`);
    }

    return count;
  }

  /**
   * 특정 Navigation 아이템 해제
   *
   * @param id - 아이템 ID
   * @returns 해제 성공 여부
   */
  unregisterNav(id: string): boolean {
    const deleted = this.items.delete(id);
    if (deleted) {
      console.log(`[NavigationRegistry] Unregistered nav: ${id}`);
    }
    return deleted;
  }

  /**
   * 모든 Navigation 초기화 (테스트용)
   */
  clear(): void {
    this.items.clear();
    console.log('[NavigationRegistry] Cleared all nav items');
  }

  /**
   * 등록된 Navigation 아이템 수
   */
  count(): number {
    return this.items.size;
  }

  /**
   * 통계 정보 조회
   */
  getStats(): { totalNavItems: number; navByApp: Record<string, number> } {
    const navByApp: Record<string, number> = {};

    for (const item of this.items.values()) {
      navByApp[item.appId] = (navByApp[item.appId] || 0) + 1;
    }

    return {
      totalNavItems: this.items.size,
      navByApp,
    };
  }
}

/**
 * 글로벌 싱글톤 Navigation Registry 인스턴스
 */
export const navigationRegistry = new NavigationRegistry();

export default navigationRegistry;
