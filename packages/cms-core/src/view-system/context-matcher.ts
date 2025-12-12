/**
 * View Context Matcher
 *
 * ViewEntry가 주어진 Context에 매칭되는지 검증하는 전담 클래스
 * View Registry의 복잡도를 낮추기 위해 분리
 */

import type {
    ViewEntry,
    ViewQueryContext,
    ViewRegistrationOptions,
    ServiceGroup,
} from './types.js';

/**
 * ViewContextMatcher
 * 
 * Context 기반 필터링 로직을 담당
 * - ServiceGroup 매칭
 * - Tenant 제한 확인
 * - Permission 검증
 * - Custom Condition 실행
 */
export class ViewContextMatcher {
    /**
     * View가 주어진 Context에 맞는지 확인
     *
     * @param entry - View Entry
     * @param context - Query Context
     * @returns 매칭 여부
     */
    matchesContext(entry: ViewEntry, context: ViewQueryContext): boolean {
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
     * View 배열을 Context로 필터링
     *
     * @param views - View Entry 배열
     * @param context - Query Context
     * @returns 조건에 맞는 View 배열
     */
    filterByContext(views: ViewEntry[], context: ViewQueryContext): ViewEntry[] {
        return views
            .filter((entry) => this.matchesContext(entry, context))
            .sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));
    }

    /**
     * ServiceGroup으로 필터링
     *
     * @param views - View Entry 배열
     * @param serviceGroup - Service Group
     * @returns 해당 ServiceGroup에 속한 View 배열
     */
    filterByServiceGroup(views: ViewEntry[], serviceGroup: ServiceGroup): ViewEntry[] {
        return views.filter((entry) => {
            const viewServiceGroups = entry.options.serviceGroups;
            // global이거나 serviceGroups가 없으면 모든 서비스에서 사용 가능
            if (!viewServiceGroups || viewServiceGroups.length === 0) {
                return true;
            }
            return viewServiceGroups.includes(serviceGroup) || viewServiceGroups.includes('global');
        });
    }

    /**
     * Tenant로 필터링
     *
     * @param views - View Entry 배열
     * @param tenantId - Tenant ID
     * @returns 해당 Tenant에서 사용 가능한 View 배열
     */
    filterByTenant(views: ViewEntry[], tenantId: string): ViewEntry[] {
        return views.filter((entry) => {
            const allowedTenants = entry.options.allowedTenants;
            // allowedTenants가 없으면 모든 테넌트에서 사용 가능
            if (!allowedTenants || allowedTenants.length === 0) {
                return true;
            }
            return allowedTenants.includes(tenantId);
        });
    }

    /**
     * CPT와 타입으로 필터링
     *
     * @param views - View Entry 배열
     * @param cptName - CPT 이름
     * @param type - View 타입
     * @returns 조건에 맞는 View 배열
     */
    filterByCPTAndType(
        views: ViewEntry[],
        cptName: string,
        type: ViewRegistrationOptions['type']
    ): ViewEntry[] {
        return views.filter(
            (entry) =>
                entry.options.cptName === cptName &&
                entry.options.type === type
        );
    }
}

/**
 * 글로벌 싱글톤 Context Matcher 인스턴스
 */
export const viewContextMatcher = new ViewContextMatcher();

export default viewContextMatcher;
