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
  ViewQueryContext,
  ServiceGroup,
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
   * Service Group별 View 목록 조회 (Phase 6)
   *
   * @param serviceGroup - Service Group
   * @returns 해당 Service Group에 속한 View 배열
   */
  getViewsByServiceGroup(serviceGroup: ServiceGroup): ViewEntry[] {
    return Array.from(this.views.values()).filter((entry) => {
      const viewServiceGroups = entry.options.serviceGroups;
      // global이거나 serviceGroups가 없으면 모든 서비스에서 사용 가능
      if (!viewServiceGroups || viewServiceGroups.length === 0) {
        return true;
      }
      return viewServiceGroups.includes(serviceGroup) || viewServiceGroups.includes('global');
    });
  }

  /**
   * Tenant별 View 목록 조회 (Phase 6)
   *
   * @param tenantId - Tenant ID
   * @returns 해당 Tenant에서 사용 가능한 View 배열
   */
  getViewsByTenant(tenantId: string): ViewEntry[] {
    return Array.from(this.views.values()).filter((entry) => {
      const allowedTenants = entry.options.allowedTenants;
      // allowedTenants가 없으면 모든 테넌트에서 사용 가능
      if (!allowedTenants || allowedTenants.length === 0) {
        return true;
      }
      return allowedTenants.includes(tenantId);
    });
  }

  /**
   * Context 기반 View 조회 (Phase 6)
   * ServiceGroup, Tenant, Permission을 모두 고려하여 적합한 View를 찾음
   *
   * @param viewId - View ID (패턴 매칭 지원: 'forum.post.*')
   * @param context - Query Context
   * @returns 조건에 맞는 View 또는 undefined
   */
  getViewByContext(viewId: string, context: ViewQueryContext): ViewEntry | undefined {
    // 먼저 정확한 ID로 찾기
    const exactMatch = this.views.get(viewId);
    if (exactMatch && this.matchesContext(exactMatch, context)) {
      return exactMatch;
    }

    // 패턴 매칭 (viewId가 'forum.post.*' 형태인 경우)
    if (viewId.includes('*')) {
      const pattern = new RegExp('^' + viewId.replace(/\*/g, '.*') + '$');
      const candidates = Array.from(this.views.values())
        .filter((entry) => pattern.test(entry.viewId) && this.matchesContext(entry, context))
        .sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));
      return candidates[0];
    }

    return undefined;
  }

  /**
   * CPT와 Context 기반으로 가장 적합한 View 찾기 (Phase 6)
   *
   * @param cptName - CPT 이름
   * @param type - View 타입
   * @param context - Query Context
   * @returns 가장 적합한 View 또는 undefined
   */
  resolveView(
    cptName: string,
    type: ViewRegistrationOptions['type'],
    context: ViewQueryContext
  ): ViewEntry | undefined {
    const candidates = Array.from(this.views.values())
      .filter((entry) =>
        entry.options.cptName === cptName &&
        entry.options.type === type &&
        this.matchesContext(entry, context)
      )
      .sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));

    return candidates[0];
  }

  /**
   * View가 주어진 Context에 맞는지 확인 (Phase 6)
   *
   * @param entry - View Entry
   * @param context - Query Context
   * @returns 매칭 여부
   */
  private matchesContext(entry: ViewEntry, context: ViewQueryContext): boolean {
    const { options } = entry;

    // Service Group 체크
    if (context.serviceGroup && options.serviceGroups && options.serviceGroups.length > 0) {
      if (!options.serviceGroups.includes(context.serviceGroup) && !options.serviceGroups.includes('global')) {
        return false;
      }
    }

    // Tenant 체크
    if (context.tenantId && options.allowedTenants && options.allowedTenants.length > 0) {
      if (!options.allowedTenants.includes(context.tenantId)) {
        return false;
      }
    }

    // Permission 체크
    if (options.permissions && options.permissions.length > 0) {
      if (!context.permissions || !options.permissions.some(p => context.permissions!.includes(p))) {
        return false;
      }
    }

    // Custom condition 체크
    if (options.condition) {
      if (!options.condition(context)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Context에 맞는 모든 View 목록 조회 (Phase 6)
   *
   * @param context - Query Context
   * @returns 조건에 맞는 모든 View 배열
   */
  getViewsByContext(context: ViewQueryContext): ViewEntry[] {
    return Array.from(this.views.values())
      .filter((entry) => this.matchesContext(entry, context))
      .sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));
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
