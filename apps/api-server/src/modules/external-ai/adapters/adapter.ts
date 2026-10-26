import type { DataSource, EntityManager } from "typeorm";
import type { Workspace } from "../contracts.js";
import { ExternalAiError } from "../contracts.js";
import { resolveAccountAccess } from "../../../common/auth/account-access.policy.js";
import { PolicyAcceptanceService } from "../../policy-acceptance/policy-acceptance.service.js";
import { sanitizeDescriptionHtml } from "../../neture/utils/sanitize-description-html.util.js";

export type Queryable = Pick<DataSource | EntityManager, "query">;
export interface DraftInput {
  destination: string;
  content: string;
  title?: string;
  language: string;
  productId?: string;
  productSource?: "local" | "listing";
  contentKey?: string;
  contentId?: string;
  expectedRevision?: string;
}
export interface ContentAdapter {
  workspaces(userId: string, db?: Queryable): Promise<Workspace[]>;
  authorize(
    userId: string,
    id: string,
    write: boolean,
    db?: Queryable,
  ): Promise<unknown>;
  products(
    db: Queryable,
    id: string,
    query: string,
    page: number,
    limit: number,
  ): Promise<unknown>;
  productContext(
    db: Queryable,
    id: string,
    productId: string,
  ): Promise<unknown>;
  materials(
    db: Queryable,
    id: string,
    query: string,
    page: number,
    limit: number,
    userId?: string,
  ): Promise<unknown>;
  material(
    db: Queryable,
    id: string,
    materialId: string,
    userId?: string,
  ): Promise<unknown>;
  content(
    db: Queryable,
    id: string,
    destination: string,
    contentId: string,
    lock?: boolean,
    userId?: string,
  ): Promise<{
    id: string;
    revision: string;
    editable: boolean;
    [key: string]: unknown;
  }>;
  save(
    db: EntityManager,
    userId: string,
    id: string,
    input: DraftInput,
  ): Promise<{ id: string; [key: string]: unknown }>;
}
/** Bind existing domain services to the caller's transaction, including repository writes. */
export function scopedSource(
  source: DataSource,
  manager: Queryable,
): DataSource {
  const m = manager as EntityManager;
  return Object.assign(Object.create(source) as DataSource, {
    query: manager.query.bind(manager),
    ...(m.getRepository
      ? {
          getRepository: m.getRepository.bind(m),
          transaction: m.transaction.bind(m),
        }
      : {}),
  });
}
export async function assertAccount(db: Queryable, userId: string) {
  const [account] = await db.query(
    'SELECT status,"isActive","isEmailVerified" FROM users WHERE id=$1',
    [userId],
  );
  if (
    !account?.isActive ||
    !account.isEmailVerified ||
    resolveAccountAccess(account.status) !== "normal"
  )
    throw new ExternalAiError("ACCOUNT_NOT_ACTIVE", 403);
}
export async function assertTerms(
  db: Queryable,
  userId: string,
  service: string,
  route: string,
) {
  const terms = new PolicyAcceptanceService(() => db);
  if (
    (await terms.getEnforcedPendingForUser(userId, service, route, "POST"))
      .length
  )
    throw new ExternalAiError("TERMS_ACCEPTANCE_REQUIRED", 428);
}
export function cleanBody(input: DraftInput) {
  const body = sanitizeDescriptionHtml(input.content);
  if (!body) throw new ExternalAiError("CONTENT_EMPTY_AFTER_SANITIZE");
  if (!input.contentId && !input.title)
    throw new ExternalAiError("TITLE_REQUIRED");
  if (input.productId) throw new ExternalAiError("PRODUCT_LINK_NOT_SUPPORTED");
  return body;
}
export function checkRevision(
  current: { editable: boolean; revision: string },
  input: DraftInput,
) {
  if (!current.editable) throw new ExternalAiError("CONTENT_NOT_EDITABLE", 409);
  if (current.revision !== input.expectedRevision)
    throw new ExternalAiError("CONTENT_CONFLICT", 409);
}
export function noProducts() {
  return {
    items: [],
    notice:
      "이 공간은 상품 원장을 관리하지 않습니다. 허용된 참고 자료를 조회하여 글이나 상품 설명 초안을 작성하세요.",
  };
}
export function noProduct(): never {
  throw new ExternalAiError("PRODUCT_NOT_FOUND", 404);
}
