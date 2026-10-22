import type { DataSource, EntityManager } from "typeorm";
import { findStoreOrganizationCandidates } from "../../../utils/store-organization.resolver.js";
import {
  findApprovedStoreMemberCandidates,
  resolveApprovedStoreMemberOrganization,
} from "../../../utils/store-member-access.js";
import { isStoreOwner } from "../../../utils/store-owner.utils.js";
import {
  assertNetureMainMembershipActive,
  NetureMainMembershipRequiredError,
} from "../../neture/services/neture-main-membership.js";
import {
  createLibraryAsset,
  updateLibraryAsset,
  type LibraryFailure,
} from "../../../services/store/store-library.service.js";
import { listHandledProducts } from "../../../services/store/store-handled-products.service.js";
import { ExternalAiError, type Workspace } from "../contracts.js";
import { tokenHash } from "../auth/oauth-provider.js";
import {
  assertAccount,
  assertTerms,
  scopedSource,
  cleanBody,
  checkRevision,
  type Queryable,
  type DraftInput,
} from "./adapter.js";

export class StoreAdapter {
  constructor(readonly db: DataSource) {}
  async workspaces(
    userId: string,
    db: Queryable = this.db,
  ): Promise<Workspace[]> {
    await assertAccount(db, userId);
    const source = scopedSource(this.db, db);
    const candidates = [
      ...(await findStoreOrganizationCandidates(source, userId, "kpa")),
      ...(await findApprovedStoreMemberCandidates(source, userId, "kpa")),
    ];
    const result: Workspace[] = [];
    for (const id of new Set(candidates.map((c) => c.organizationId))) {
      // Permission failure removes only this candidate; infrastructure failures propagate.
      try {
        await this.authorize(userId, id, false, db);
      } catch (e) {
        if (e instanceof ExternalAiError && e.status < 500) continue;
        throw e;
      }
      const [org] = await db.query(
        "SELECT name FROM organizations WHERE id=$1",
        [id],
      );
      result.push({
        id: `store:${id}`,
        name: org?.name ?? "내 약국",
        kind: "store",
        writable: true,
        destinations: ["store_document"],
        products: true,
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
    const source = scopedSource(this.db, db);
    // The same staff branch as createPharmacyStoreAccess: approved staff need no personal main membership.
    if (
      await resolveApprovedStoreMemberOrganization(source, userId, "kpa", id)
    ) {
      await assertTerms(
        db,
        userId,
        "kpa-society",
        "/api/v1/kpa/pharmacy/library",
      );
      return;
    }
    const access = await isStoreOwner(source, userId, "kpa", id);
    if (!access.isOwner || access.organizationId !== id)
      throw new ExternalAiError(
        access.pendingAgreement
          ? "STORE_OWNER_AGREEMENT_REQUIRED"
          : "WORKSPACE_FORBIDDEN",
        access.pendingAgreement ? 428 : 403,
      );
    try {
      await assertNetureMainMembershipActive(db, userId);
    } catch (e) {
      if (e instanceof NetureMainMembershipRequiredError)
        throw new ExternalAiError(e.code, 403);
      throw e;
    }
    await assertTerms(
      db,
      userId,
      "kpa-society",
      "/api/v1/kpa/pharmacy/library",
    );
  }
  async products(
    db: Queryable,
    id: string,
    query: string,
    page: number,
    limit: number,
  ) {
    // Existing unified local/listing search, including its supply identity deduplication.
    const result = await listHandledProducts(scopedSource(this.db, db), id, {
      page,
      limit,
      search: query,
    });
    return {
      items: result.items.map((p) => ({
        productId: p.sourceId,
        source: p.sourceType,
        name: p.name,
        masterId: p.masterId,
      })),
      page,
      limit,
      total: result.pagination.total,
    };
  }
  async productContext(db: Queryable, id: string, productId: string) {
    const [local] = await db.query(
      `SELECT id AS "productId",name,barcode,description,summary,detail_html AS content FROM store_local_products WHERE id=$1 AND organization_id=$2 AND is_active=true`,
      [productId, id],
    );
    if (local)
      return {
        product: local,
        source: "store_local",
        notice:
          "매장이 입력한 자료이며 표준 상품 사실로 검증된 정보가 아닙니다.",
      };
    const [listing] = await db.query(
      `SELECT l.id AS "productId",p.id AS "masterId",p.name,p.barcode,p.manufacturer_name AS manufacturer,p.specification
      FROM organization_product_listings l JOIN product_masters p ON p.id=l.master_id WHERE l.id=$1 AND l.organization_id=$2 AND l.is_active=true`,
      [productId, id],
    );
    if (!listing) throw new ExternalAiError("PRODUCT_NOT_FOUND", 404);
    const descriptions = await db.query(
      `SELECT id,description_type AS type,language,content,source_type AS source FROM shared_product_descriptions WHERE master_id=$1 AND status='canonical' AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 20`,
      [listing.masterId],
    );
    return {
      product: listing,
      descriptions,
      notice:
        "상품 정본과 매장 입력 내용은 출처가 다릅니다. 없는 사실을 만들지 마세요.",
    };
  }
  async materials(
    db: Queryable,
    id: string,
    query: string,
    page: number,
    limit: number,
  ) {
    const items = await db.query(
      `SELECT id,title,asset_type AS "contentType",updated_at AS "updatedAt" FROM store_execution_assets WHERE organization_id=$1 AND is_active=true AND ($2='' OR title ILIKE '%'||$2||'%') ORDER BY updated_at DESC,id LIMIT $3 OFFSET $4`,
      [id, query, limit, (page - 1) * limit],
    );
    return { items, page, limit };
  }
  async material(db: Queryable, id: string, materialId: string) {
    const [row] = await db.query(
      `SELECT id,title,description,asset_type AS "contentType",html_content AS content FROM store_execution_assets WHERE id=$1 AND organization_id=$2 AND is_active=true`,
      [materialId, id],
    );
    if (!row) throw new ExternalAiError("MATERIAL_NOT_FOUND", 404);
    return {
      ...row,
      notice:
        "참고 자료입니다. 파일/외부 URL은 자동으로 열거나 가져오지 않습니다.",
    };
  }
  async content(
    db: Queryable,
    id: string,
    destination: string,
    contentId: string,
    lock = false,
  ) {
    if (destination !== "store_document")
      throw new ExternalAiError("DESTINATION_FORBIDDEN", 403);
    const [row] = await db.query(
      `SELECT id,title,html_content AS content,source_type AS source,asset_type AS type,usage_type AS usage,is_active AS active,updated_at AS "updatedAt" FROM store_execution_assets WHERE id=$1 AND organization_id=$2${lock ? " FOR UPDATE" : ""}`,
      [contentId, id],
    );
    if (!row) throw new ExternalAiError("CONTENT_NOT_FOUND", 404);
    const [qr] = await db.query(
      "SELECT 1 FROM store_qr_codes WHERE library_item_id=$1 AND is_active=true LIMIT 1",
      [contentId],
    );
    const editable = row.active && row.type === "content" && !row.usage && !qr;
    return {
      ...row,
      editable,
      status: editable ? "private_material" : "in_use_or_uneditable",
      revision: tokenHash(JSON.stringify({ ...row, inUse: !!qr })),
      destination,
      openUrl: `https://store.neture.co.kr/external-ai/drafts/${contentId}?organizationId=${encodeURIComponent(id)}`,
    };
  }
  async save(db: EntityManager, userId: string, id: string, input: DraftInput) {
    if (input.destination !== "store_document")
      throw new ExternalAiError("DESTINATION_FORBIDDEN", 403);
    const content = cleanBody(input),
      source = scopedSource(this.db, db);
    if (input.contentId) {
      const current = await this.content(
        db,
        id,
        input.destination,
        input.contentId,
        true,
      );
      checkRevision(current, input);
      const result = await updateLibraryAsset(source, id, input.contentId, {
        title: input.title ?? current.title,
        htmlContent: content,
      });
      if (!result.ok)
        throw new ExternalAiError(
          (result as LibraryFailure).code,
          (result as LibraryFailure).status,
        );
      return this.content(db, id, input.destination, input.contentId);
    }
    const result = await createLibraryAsset(source, id, {
      title: input.title,
      htmlContent: content,
      assetType: "content",
      sourceType: "generated",
    });
    if (!result.ok)
      throw new ExternalAiError(
        (result as LibraryFailure).code,
        (result as LibraryFailure).status,
      );
    return this.content(
      db,
      id,
      input.destination,
      (result as { ok: true; data: { id: string } }).data.id,
    );
  }
}
