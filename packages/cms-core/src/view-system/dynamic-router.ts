/**
 * Dynamic Router
 *
 * View Registry를 기반으로 Dynamic Routing을 자동 생성하는 시스템
 *
 * 주요 기능:
 * - manifest.viewTemplates → dynamic route 자동 생성
 * - 라우트 패턴 관리
 * - View-Route 매핑
 */

import type { DynamicRouteConfig, ViewEntry } from './types.js';
import { viewRegistry } from './view-registry.js';

/**
 * Dynamic Router 클래스
 *
 * View Registry 기반으로 라우트를 자동 생성하고 관리
 */
export class DynamicRouter {
  private routes = new Map<string, DynamicRouteConfig>();

  /**
   * 라우트 등록
   *
   * @param pattern - 라우트 패턴 (예: '/forum/posts/:id')
   * @param viewId - 연결할 View ID
   * @param meta - 라우트 메타데이터
   */
  registerRoute(
    pattern: string,
    viewId: string,
    meta?: DynamicRouteConfig['meta']
  ): void {
    if (this.routes.has(pattern)) {
      console.warn(`[DynamicRouter] Route "${pattern}" already registered. Replacing.`);
    }

    const config: DynamicRouteConfig = {
      pattern,
      viewId,
      meta,
    };

    this.routes.set(pattern, config);
    console.log(`[DynamicRouter] Registered route: ${pattern} → ${viewId}`);
  }

  /**
   * View의 viewTemplates에서 라우트 자동 생성
   *
   * @param appId - 앱 ID
   * @param viewTemplates - manifest의 viewTemplates 배열
   */
  registerFromManifest(
    appId: string,
    viewTemplates: Array<{
      viewId: string;
      route: string;
      title?: string;
      layout?: string;
      auth?: boolean;
    }>
  ): void {
    for (const template of viewTemplates) {
      this.registerRoute(template.route, `${appId}.${template.viewId}`, {
        title: template.title,
        layout: template.layout,
        auth: template.auth,
      });
    }
  }

  /**
   * 라우트 조회
   *
   * @param pattern - 라우트 패턴
   * @returns DynamicRouteConfig 또는 undefined
   */
  getRoute(pattern: string): DynamicRouteConfig | undefined {
    return this.routes.get(pattern);
  }

  /**
   * 경로에 매칭되는 라우트 찾기
   *
   * @param path - 실제 경로 (예: '/forum/posts/123')
   * @returns 매칭된 라우트와 파라미터
   */
  matchRoute(path: string): { config: DynamicRouteConfig; params: Record<string, string> } | null {
    for (const [pattern, config] of this.routes.entries()) {
      const params = this.matchPattern(pattern, path);
      if (params !== null) {
        return { config, params };
      }
    }
    return null;
  }

  /**
   * 패턴과 경로 매칭
   *
   * @param pattern - 라우트 패턴 (예: '/forum/posts/:id')
   * @param path - 실제 경로 (예: '/forum/posts/123')
   * @returns 매칭된 파라미터 또는 null
   */
  private matchPattern(pattern: string, path: string): Record<string, string> | null {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) {
      return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      if (patternPart.startsWith(':')) {
        // 파라미터 매칭
        const paramName = patternPart.slice(1);
        params[paramName] = pathPart;
      } else if (patternPart !== pathPart) {
        // 정확한 매칭 실패
        return null;
      }
    }

    return params;
  }

  /**
   * 라우트에 연결된 View 조회
   *
   * @param pattern - 라우트 패턴
   * @returns ViewEntry 또는 undefined
   */
  getRouteView(pattern: string): ViewEntry | undefined {
    const config = this.routes.get(pattern);
    if (!config) return undefined;

    return viewRegistry.getView(config.viewId);
  }

  /**
   * 경로에 해당하는 View 조회
   *
   * @param path - 실제 경로
   * @returns View와 파라미터
   */
  resolveView(path: string): { view: ViewEntry; params: Record<string, string> } | null {
    const match = this.matchRoute(path);
    if (!match) return null;

    const view = viewRegistry.getView(match.config.viewId);
    if (!view) return null;

    return { view, params: match.params };
  }

  /**
   * 모든 라우트 목록 조회
   *
   * @returns DynamicRouteConfig 배열
   */
  listRoutes(): DynamicRouteConfig[] {
    return Array.from(this.routes.values());
  }

  /**
   * 특정 View에 연결된 라우트 조회
   *
   * @param viewId - View ID
   * @returns 해당 View의 라우트 배열
   */
  getRoutesByView(viewId: string): DynamicRouteConfig[] {
    return Array.from(this.routes.values()).filter(
      (config) => config.viewId === viewId
    );
  }

  /**
   * 라우트 해제
   *
   * @param pattern - 라우트 패턴
   * @returns 해제 성공 여부
   */
  unregisterRoute(pattern: string): boolean {
    const deleted = this.routes.delete(pattern);
    if (deleted) {
      console.log(`[DynamicRouter] Unregistered route: ${pattern}`);
    }
    return deleted;
  }

  /**
   * View ID로 라우트 해제
   *
   * @param viewId - View ID
   * @returns 해제된 라우트 수
   */
  unregisterByView(viewId: string): number {
    let count = 0;

    for (const [pattern, config] of this.routes.entries()) {
      if (config.viewId === viewId) {
        this.routes.delete(pattern);
        count++;
      }
    }

    return count;
  }

  /**
   * 모든 라우트 초기화 (테스트용)
   */
  clear(): void {
    this.routes.clear();
    console.log('[DynamicRouter] Cleared all routes');
  }

  /**
   * 등록된 라우트 수
   */
  count(): number {
    return this.routes.size;
  }

  /**
   * 라우트 테이블 출력 (디버깅용)
   */
  printRouteTable(): void {
    console.log('\n=== Dynamic Router - Route Table ===');
    console.log('Pattern                      | View ID');
    console.log('-'.repeat(60));

    for (const [pattern, config] of this.routes.entries()) {
      console.log(`${pattern.padEnd(28)} | ${config.viewId}`);
    }

    console.log('='.repeat(60) + '\n');
  }
}

/**
 * 글로벌 싱글톤 Dynamic Router 인스턴스
 */
export const dynamicRouter = new DynamicRouter();

export default dynamicRouter;
