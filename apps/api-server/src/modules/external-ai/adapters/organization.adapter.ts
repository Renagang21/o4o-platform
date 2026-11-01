import type { DataSource, EntityManager } from "typeorm";
import { SemiFranchiseService } from "../../neture-pharmacy/services/semi-franchise.service.js";
import { SemiFranchiseContentService } from "../../neture-pharmacy/services/semi-franchise-content.service.js";
import { resolveSemiFranchiseBusinessAccess } from "../../neture-pharmacy/services/semi-franchise-community-access.js";
import { ExternalAiError, type Workspace } from "../contracts.js";
import { tokenHash } from "../auth/oauth-provider.js";
import {
  assertAccount,
  assertTerms,
  scopedSource,
  cleanBody,
  checkRevision,
  noProducts,
  noProduct,
  type Queryable,
  type DraftInput,
} from "./adapter.js";

/** Delegates a business operator's own content work, never enrollment/review authority. */
export class OrganizationAdapter {
  constructor(
    readonly db: DataSource,
    readonly webOrigin: URL,
  ) {}
  async workspaces(
    userId: string,
    db: Queryable = this.db,
  ): Promise<Workspace[]> {
    await assertAccount(db, userId);
    const rows = await new SemiFranchiseService(
      scopedSource(this.db, db),
    ).listAssigned(userId);
    const result: Workspace[] = [];
    for (const row of rows) {
      if (row.status !== "active") continue;
      try {
        await this.authorize(userId, row.id, false, db);
      } catch (e) {
        if (e instanceof ExternalAiError && e.status < 500) continue;
        throw e;
      }
      result.push({
        id: `organization:${row.id}`,
        name: row.name,
        kind: "organization",
        writable: true,
        destinations: ["business_content"],
        products: false,
      });
    }
    return result;
  }
  async authorize(
    userId: string,
    id: string,
    _write: boolean,
    db: Queryable = this.db,
  ) {
    await assertAccount(db, userId);
    const [row] = await db.query(
      "SELECT key FROM semi_franchises WHERE id=$1 AND status='active'",
      [id],
    );
    if (!row) throw new ExternalAiError("WORKSPACE_FORBIDDEN", 403);
    const access = await resolveSemiFranchiseBusinessAccess(
      db,
      userId,
      row.key,
    );
    if (!access.allowed || !access.operator)
      throw new ExternalAiError("WORKSPACE_FORBIDDEN", 403);
    await assertTerms(
      db,
      userId,
      "neture",
      `/api/v1/neture/operator/semi-franchises/${row.key}/contents`,
    );
  }
  async products() {
    return noProducts();
  }
  async productContext() {
    return noProduct();
  }
  async materials(
    db: Queryable,
    id: string,
    query: string,
    page: number,
    limit: number,
  ) {
    const items = await db.query(
      `SELECT id,title,status,updated_at AS "updatedAt" FROM semi_franchise_contents WHERE semi_franchise_id=$1 AND ($2='' OR title ILIKE '%'||$2||'%') ORDER BY updated_at DESC,id LIMIT $3 OFFSET $4`,
      [id, query, limit, (page - 1) * limit],
    );
    return { items, page, limit };
  }
  async material(db: Queryable, id: string, materialId: string) {
    const [row] = await db.query(
      `SELECT id,title,summary,body AS content,status FROM semi_franchise_contents WHERE id=$1 AND semi_franchise_id=$2`,
      [materialId, id],
    );
    if (!row) throw new ExternalAiError("MATERIAL_NOT_FOUND", 404);
    return {
      ...row,
      notice:
        "사업 자료입니다. 공급자 제출 자료의 검수·승인은 기존 운영 화면에서 처리합니다.",
    };
  }
  async content(
    db: Queryable,
    id: string,
    destination: string,
    contentId: string,
    lock = false,
  ) {
    if (destination !== "business_content")
      throw new ExternalAiError("DESTINATION_FORBIDDEN", 403);
    const [row] = await db.query(
      `SELECT id,title,body AS content,status,source_supplier_id AS "supplierId",source_item_id AS "sourceItemId",updated_at AS "updatedAt" FROM semi_franchise_contents WHERE id=$1 AND semi_franchise_id=$2${lock ? " FOR UPDATE" : ""}`,
      [contentId, id],
    );
    if (!row) throw new ExternalAiError("CONTENT_NOT_FOUND", 404);
    const [business] = await db.query(
      `SELECT sf.key,c.slug FROM semi_franchises sf LEFT JOIN cooperatives c ON c.semi_franchise_id=sf.id WHERE sf.id=$1`,
      [id],
    );
    const path = business.slug
      ? `/${encodeURIComponent(business.slug)}/operator/contents/${contentId}/edit`
      : `/operator/semi-franchises/${encodeURIComponent(business.key)}/contents/${contentId}/edit`;
    return {
      ...row,
      editable: row.status === "draft" && !row.supplierId && !row.sourceItemId,
      revision: tokenHash(JSON.stringify(row)),
      destination,
      openUrl: new URL(
        path,
        business.slug
          ? "https://pharmcoop.neture.co.kr"
          : business.key === "carepharm"
            ? "https://carepharm.neture.co.kr"
            : business.key === "drugstore"
              ? "https://drugstore.neture.co.kr"
              : "https://pharmacy.neture.co.kr",
      ).href,
    };
  }
  async save(db: EntityManager, userId: string, id: string, input: DraftInput) {
    if (input.destination !== "business_content")
      throw new ExternalAiError("DESTINATION_FORBIDDEN", 403);
    const content = cleanBody(input),
      source = scopedSource(this.db, db);
    const [business] = await db.query(
      "SELECT * FROM semi_franchises WHERE id=$1",
      [id],
    );
    const service = new SemiFranchiseContentService(source, async () => {
      throw new ExternalAiError("COPY_NOT_SUPPORTED");
    });
    if (input.contentId) {
      const current = await this.content(
        db,
        id,
        input.destination,
        input.contentId,
        true,
      );
      checkRevision(current, input);
      await service.operatorUpdate(business, userId, input.contentId, {
        title: input.title,
        body: content,
      });
      return this.content(db, id, input.destination, input.contentId);
    }
    const result = await service.operatorCreate(business, userId, {
      title: input.title,
      body: content,
    });
    return this.content(db, id, input.destination, result.id);
  }
}
