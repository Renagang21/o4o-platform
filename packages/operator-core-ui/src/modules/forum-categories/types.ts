/**
 * Operator Forum Categories Module — Types
 *
 * WO-O4O-CROSSSERVICE-OPERATOR-FORUM-CATEGORIES-GP-KCOS-INTRODUCE-V1
 *
 * KPA 포럼 목록 관리(활성/비활성/태그/영구삭제)를 공통 모듈로 추출.
 * 서비스 차이는 client adapter(serviceCode 바인딩) + tableId 만 주입.
 * hardDelete 안전장치(delete-check 409 차단)는 backend 정책을 그대로 따른다.
 */

export interface ForumCategoryData {
  id: string;
  name: string;
  description?: string;
  slug: string;
  isActive: boolean;
  postCount: number;
  forumType: string;
  tags?: string[];
  createdBy?: string;
  creatorName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ForumCategoryDeleteCheck {
  postCount: number;
  memberCount: number;
  generalMemberCount: number;
  ownerCount: number;
  hardDeleteAllowed: boolean;
  blockedReasons: string[];
  warnings: string[];
  normalPostCount?: number;
  orphanPostCount?: number;
}

/**
 * 서비스별 categories operator API adapter.
 * KPA `forumOperatorApi` 가 그대로 충족하며, GP/KCos 는 동일 endpoint
 * (`/api/v1/forum/operator/categories*?serviceCode=...`)에 serviceCode 만 바꿔 호출하는 client.
 * 응답/에러 shape 는 axios(authClient.api) 기준 — 공통 콘솔이 그대로 사용.
 */
export interface ForumCategoriesClient {
  getCategories(): Promise<{ data?: ForumCategoryData[] } | any>;
  updateCategory(id: string, data: { name?: string; description?: string; tags?: string[] }): Promise<{ success?: boolean; error?: string } | any>;
  directDeactivate(id: string, data: { reason: string }): Promise<{ success?: boolean; error?: string } | any>;
  activate(id: string): Promise<{ success?: boolean; error?: string } | any>;
  getDeleteCheck(id: string): Promise<{ data?: ForumCategoryDeleteCheck } | any>;
  hardDelete(id: string, data: { reason: string }): Promise<{ success?: boolean; error?: string } | any>;
}

export interface OperatorForumCategoriesPageProps {
  client: ForumCategoriesClient;
  /** DataTable tableId (서비스별 고유, 기본 'operator-forum-categories') */
  tableId?: string;
  /**
   * true 시 완전 삭제(hardDelete) 관련 UI(행 액션·일괄 버튼·모달)를 노출하지 않는다.
   * WO-O4O-NETURE-FORUM-DELETE-OPERATOR-AND-ADMIN-SEPARATION-V1:
   *   Neture Operator 는 soft delete(비활성화)만 사용하고 완전 삭제는 Admin 전용.
   *   기본값 false — 기존 소비처(KPA/GP/KCos) 동작 불변.
   */
  disableHardDelete?: boolean;
  /**
   * true 이고 게시글이 있는 포럼을 비활성화할 때, 확인 모달에서 포럼명 재입력을 요구한다.
   * 기본값 false — 기존 소비처 동작 불변.
   */
  requireNameConfirmForNonEmpty?: boolean;
}
