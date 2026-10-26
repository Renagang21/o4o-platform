import type { EntityManager } from "typeorm";
import { ExternalAiError } from "../contracts.js";
import { tokenHash } from "../auth/oauth-provider.js";
import {
  assertTerms,
  checkRevision,
  type DraftInput,
  type Queryable,
} from "./adapter.js";
import { sanitizeDescriptionHtml } from "../../neture/utils/sanitize-description-html.util.js";
import { NeturePharmacyError } from "../../neture-pharmacy/constants.js";
import { createPharmacyFeatureService } from "../../neture-pharmacy/services/member-paid-features.js";
import { recordOperation } from "../../../services/operations/operation-audit.js";
import {
  STORE_PRODUCT_CONTENT_LOCALES,
  storeProductContentTargetExists,
  upsertStoreProductContentPage,
  type StoreProductTargetKind,
} from "../../../services/store/store-product-content.service.js";

interface ProductPage {
  id: string;
  groupId: string;
  productId: string;
  productSource: StoreProductTargetKind;
  contentKey: string;
  groupStatus: string;
  publicKey: string | null;
  hasPublishedPage: boolean;
  groupUpdatedAt: Date;
  language: string;
  title: string;
  summary: string | null;
  contentFormat: string;
  content: Record<string, unknown>;
  assets: Array<Record<string, unknown>>;
  buttons: Array<Record<string, unknown>>;
  status: string;
  isDefault: boolean;
  sortOrder: number;
  metadata: Record<string, unknown>;
  updatedAt: Date;
}

/** StoreAdapter supplies current workspace authorization; this boundary adds existing product/feature policy. */
export class StoreProductContentAdapter {
  async context(
    db: Queryable,
    organizationId: string,
    productSource: StoreProductTargetKind,
    productId: string,
  ) {
    const pages = await db.query(
      `SELECT p.id,g.id AS "groupId",p.locale AS language,p.title,p.status,g.content_key AS "contentKey"
       FROM store_multilingual_product_content_groups g JOIN store_multilingual_product_content_pages p ON p.group_id=g.id
       WHERE g.organization_id=$1 AND g.target_kind=$2 AND g.target_id=$3
       ORDER BY g.updated_at DESC,p.locale LIMIT 50`,
      [organizationId, productSource, productId],
    );
    return {
      productContents: pages,
      authoring: {
        purpose: "consumer_product_content",
        languages: STORE_PRODUCT_CONTENT_LOCALES,
        tools: [
          "save_product_content_draft",
          "get_product_content",
          "update_product_content_draft",
        ],
        notice:
          "상품 사실·전문 참고자료·소비자 안내는 목적이 다릅니다. 상품 식별자와 근거를 대조하고 확인되지 않은 MFDS 연결·효능·용량을 추정하지 마세요. 비공개 초안 저장 후 기존 편집기에서 검토합니다.",
      },
    };
  }

  private async requireWrite(
    db: Queryable,
    organizationId: string,
    userId: string,
  ) {
    await assertTerms(
      db,
      userId,
      "kpa-society",
      "/api/v1/kpa/pharmacy/multilingual-product-contents",
    );
    try {
      // Match checkPharmacyFeature: other store domains keep their existing rules.
      const [membership] = await db.query(
        "SELECT status FROM neture_pharmacy_memberships WHERE organization_id=$1",
        [organizationId],
      );
      if (!membership) return;
      if (membership.status !== "active")
        throw new ExternalAiError("PHARMACY_ACCESS_REQUIRED", 403);
      await createPharmacyFeatureService(db).require(
        userId,
        organizationId,
        "multilingual-content",
      );
    } catch (error) {
      if (error instanceof NeturePharmacyError)
        throw new ExternalAiError(error.code, error.httpStatus);
      throw error;
    }
  }

  private async target(
    db: Queryable,
    organizationId: string,
    source: StoreProductTargetKind,
    productId: string,
    lock = false,
  ) {
    if (
      !["local", "listing"].includes(source) ||
      !(await storeProductContentTargetExists(
        db,
        organizationId,
        source,
        productId,
        lock,
      ))
    )
      throw new ExternalAiError("PRODUCT_NOT_FOUND", 404);
  }

  private async load(
    db: Queryable,
    organizationId: string,
    contentId: string,
    lock = false,
  ): Promise<ProductPage> {
    if (lock) {
      // Lock the group first, then the page. Never change group metadata or publication state.
      await db.query(
        `SELECT g.id FROM store_multilingual_product_content_groups g
        JOIN store_multilingual_product_content_pages p ON p.group_id=g.id
        WHERE p.id=$1 AND g.organization_id=$2 FOR UPDATE OF g`,
        [contentId, organizationId],
      );
    }
    const [page]: ProductPage[] = await db.query(
      `SELECT p.id,p.group_id AS "groupId",g.target_id AS "productId",g.target_kind AS "productSource",
        g.content_key AS "contentKey",g.status AS "groupStatus",g.public_key AS "publicKey",g.updated_at AS "groupUpdatedAt",
        EXISTS(SELECT 1 FROM store_multilingual_product_content_pages other WHERE other.group_id=g.id AND other.status='published') AS "hasPublishedPage",
        p.locale AS language,p.title,p.summary,p.content_format AS "contentFormat",p.content,p.assets,p.buttons,
        p.status,p.is_default AS "isDefault",p.sort_order AS "sortOrder",p.metadata,p.updated_at AS "updatedAt"
       FROM store_multilingual_product_content_pages p JOIN store_multilingual_product_content_groups g ON g.id=p.group_id
       WHERE p.id=$1 AND g.organization_id=$2${lock ? " FOR UPDATE OF p" : ""}`,
      [contentId, organizationId],
    );
    if (!page) throw new ExternalAiError("CONTENT_NOT_FOUND", 404);
    await this.target(
      db,
      organizationId,
      page.productSource,
      page.productId,
      lock,
    );
    return page;
  }

  private result(page: ProductPage, organizationId: string) {
    const { publicKey, ...data } = page;
    return {
      ...data,
      destination: "store_product_content",
      editable:
        page.groupStatus === "draft" &&
        !publicKey &&
        !page.hasPublishedPage &&
        page.status === "draft" &&
        page.contentFormat === "html",
      revision: tokenHash(JSON.stringify(page)),
      openUrl: `https://store.neture.co.kr/external-ai/product-contents/${page.productSource}/${page.productId}/${page.groupId}?organizationId=${encodeURIComponent(organizationId)}&locale=${encodeURIComponent(page.language)}`,
    };
  }

  async content(
    db: Queryable,
    organizationId: string,
    contentId: string,
    lock = false,
  ) {
    return this.result(
      await this.load(db, organizationId, contentId, lock),
      organizationId,
    );
  }

  async save(
    db: EntityManager,
    userId: string,
    organizationId: string,
    input: DraftInput,
  ) {
    await this.requireWrite(db, organizationId, userId);
    const html = sanitizeDescriptionHtml(input.content);
    if (!html) throw new ExternalAiError("CONTENT_EMPTY_AFTER_SANITIZE");
    if (!input.title) throw new ExternalAiError("TITLE_REQUIRED");
    if (input.contentId)
      return this.update(db, userId, organizationId, input, html);
    return this.create(db, userId, organizationId, input, html);
  }

  private async create(
    db: EntityManager,
    userId: string,
    organizationId: string,
    input: DraftInput,
    html: string,
  ) {
    if (!input.productId || !input.productSource || !input.contentKey)
      throw new ExternalAiError("PRODUCT_REQUIRED");
    await this.target(
      db,
      organizationId,
      input.productSource,
      input.productId,
      true,
    );
    await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `store-product-content:${organizationId}:${input.productSource}:${input.productId}:${input.contentKey}`,
    ]);
    await db.query(
      `INSERT INTO store_multilingual_product_content_groups
      (organization_id,service_key,target_kind,target_id,content_key,title,default_locale,source_type,status,created_by_user_id)
      VALUES($1,'kpa',$2,$3,$4,$5,$6,'store_created','draft',$7)
      ON CONFLICT(organization_id,target_kind,target_id,content_key) DO NOTHING`,
      [
        organizationId,
        input.productSource,
        input.productId,
        input.contentKey,
        input.title,
        input.language,
        userId,
      ],
    );
    const [group] = await db.query(
      `SELECT id,status,public_key FROM store_multilingual_product_content_groups
      WHERE organization_id=$1 AND target_kind=$2 AND target_id=$3 AND content_key=$4 FOR UPDATE`,
      [organizationId, input.productSource, input.productId, input.contentKey],
    );
    const pages = await db.query(
      `SELECT id,locale,status FROM store_multilingual_product_content_pages WHERE group_id=$1`,
      [group.id],
    );
    if (
      group.status !== "draft" ||
      group.public_key ||
      pages.some((p: { status: string }) => p.status === "published")
    )
      throw new ExternalAiError("CONTENT_NOT_EDITABLE", 409);
    if (pages.some((p: { locale: string }) => p.locale === input.language))
      throw new ExternalAiError("PRODUCT_CONTENT_ALREADY_EXISTS", 409);
    await upsertStoreProductContentPage(
      db,
      group.id,
      input.language,
      {
        title: input.title!,
        summary: null,
        contentFormat: "html",
        content: { html },
        assets: [],
        buttons: [],
        status: "draft",
        isDefault: pages.length === 0,
        sortOrder: 0,
        metadata: {},
      },
      userId,
    );
    const [page] = await db.query(
      `SELECT id FROM store_multilingual_product_content_pages WHERE group_id=$1 AND locale=$2`,
      [group.id, input.language],
    );
    await this.audit(
      db,
      userId,
      organizationId,
      {
        id: page.id,
        groupId: group.id,
        productId: input.productId,
        language: input.language,
      },
      "created",
    );
    return this.content(db, organizationId, page.id);
  }

  private async update(
    db: EntityManager,
    userId: string,
    organizationId: string,
    input: DraftInput,
    html: string,
  ) {
    const page = await this.load(db, organizationId, input.contentId!, true);
    checkRevision(this.result(page, organizationId), input);
    await upsertStoreProductContentPage(
      db,
      page.groupId,
      page.language,
      {
        title: input.title!,
        summary: page.summary,
        contentFormat: "html",
        content: { ...page.content, html },
        assets: page.assets,
        buttons: page.buttons,
        status: "draft",
        isDefault: page.isDefault,
        sortOrder: page.sortOrder,
        metadata: page.metadata,
      },
      userId,
    );
    await this.audit(db, userId, organizationId, page, "updated");
    return this.content(db, organizationId, page.id);
  }

  private audit(
    db: EntityManager,
    userId: string,
    organizationId: string,
    identity: Readonly<
      Pick<ProductPage, "id" | "groupId" | "productId" | "language">
    >,
    operation: "created" | "updated",
  ) {
    return recordOperation(
      db,
      "kpa-society",
      userId,
      `store.product_content.external_ai.${operation}`,
      {
        channel: "external_ai",
        organizationId,
        contentId: identity.id,
        groupId: identity.groupId,
        productId: identity.productId,
        language: identity.language,
      },
    );
  }
}
