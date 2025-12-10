/**
 * View Registry
 *
 * 앱 manifest에서 viewTemplates를 수집하여 등록하는 중앙 Registry
 *
 * 주요 기능:
 * - View 컴포넌트 등록/조회
 * - CPT별 View 매핑
 * - 앱별 View 관리
 */

import type {
  ViewComponent,
  ViewEntry,
  ViewRegistrationOptions,
  ViewSystemStats,
} from './types.js';

/**
 * View Registry 클래스
 *
 * 모든 앱의 View 컴포넌트를 중앙에서 관리
 */
export class ViewRegistry {
  private views = new Map<string, ViewEntry>();

  /**
   * View 등록
   *
   * @param viewId - View 고유 ID (예: 'forum.post.list')
   * @param component - React 컴포넌트
   * @param options - 등록 옵션
   * @param appId - 소유 앱 ID
   */
  registerView(
    viewId: string,
    component: ViewComponent,
    options: ViewRegistrationOptions,
    appId: string
  ): void {
    if (this.views.has(viewId)) {
      console.warn(`[ViewRegistry] View "${viewId}" already registered. Replacing.`);
    }

    const entry: ViewEntry = {
      viewId,
      component,
      options,
      appId,
      registeredAt: new Date(),
    };

    this.views.set(viewId, entry);
    console.log(`[ViewRegistry] Registered view: ${viewId} (app: ${appId})`);
  }

  /**
   * View 조회
   *
   * @param viewId - View ID
   * @returns ViewEntry 또는 undefined
   */
  getView(viewId: string): ViewEntry | undefined {
    return this.views.get(viewId);
  }

  /**
   * 모든 View 목록 조회
   *
   * @returns 모든 ViewEntry 배열
   */
  listViews(): ViewEntry[] {
    return Array.from(this.views.values());
  }

  /**
   * CPT에 연결된 View 목록 조회
   *
   * @param cptName - CPT 이름 (예: 'forum_post')
   * @returns 해당 CPT에 연결된 View 배열
   */
  getViewsByCPT(cptName: string): ViewEntry[] {
    return Array.from(this.views.values()).filter(
      (entry) => entry.options.cptName === cptName
    );
  }

  /**
   * 앱별 View 목록 조회
   *
   * @param appId - 앱 ID
   * @returns 해당 앱의 View 배열
   */
  getViewsByApp(appId: string): ViewEntry[] {
    return Array.from(this.views.values()).filter(
      (entry) => entry.appId === appId
    );
  }

  /**
   * View 타입별 목록 조회
   *
   * @param type - View 타입 ('list' | 'detail' | 'edit' | 'create' | 'custom')
   * @returns 해당 타입의 View 배열
   */
  getViewsByType(type: ViewRegistrationOptions['type']): ViewEntry[] {
    return Array.from(this.views.values()).filter(
      (entry) => entry.options.type === type
    );
  }

  /**
   * View 존재 여부 확인
   *
   * @param viewId - View ID
   * @returns 존재 여부
   */
  hasView(viewId: string): boolean {
    return this.views.has(viewId);
  }

  /**
   * 앱의 모든 View 해제
   *
   * @param appId - 앱 ID
   * @returns 해제된 View 수
   */
  unregisterByApp(appId: string): number {
    let count = 0;

    for (const [viewId, entry] of this.views.entries()) {
      if (entry.appId === appId) {
        this.views.delete(viewId);
        count++;
      }
    }

    if (count > 0) {
      console.log(`[ViewRegistry] Unregistered ${count} views from app: ${appId}`);
    }

    return count;
  }

  /**
   * 특정 View 해제
   *
   * @param viewId - View ID
   * @returns 해제 성공 여부
   */
  unregisterView(viewId: string): boolean {
    const deleted = this.views.delete(viewId);
    if (deleted) {
      console.log(`[ViewRegistry] Unregistered view: ${viewId}`);
    }
    return deleted;
  }

  /**
   * 모든 View 초기화 (테스트용)
   */
  clear(): void {
    this.views.clear();
    console.log('[ViewRegistry] Cleared all views');
  }

  /**
   * 등록된 View 수
   */
  count(): number {
    return this.views.size;
  }

  /**
   * 통계 정보 조회
   */
  getStats(): Pick<ViewSystemStats, 'totalViews' | 'viewsByApp' | 'viewsByType'> {
    const viewsByApp: Record<string, number> = {};
    const viewsByType: Record<string, number> = {};

    for (const entry of this.views.values()) {
      // Count by app
      viewsByApp[entry.appId] = (viewsByApp[entry.appId] || 0) + 1;

      // Count by type
      const type = entry.options.type;
      viewsByType[type] = (viewsByType[type] || 0) + 1;
    }

    return {
      totalViews: this.views.size,
      viewsByApp,
      viewsByType,
    };
  }
}

/**
 * 글로벌 싱글톤 View Registry 인스턴스
 */
export const viewRegistry = new ViewRegistry();

export default viewRegistry;
