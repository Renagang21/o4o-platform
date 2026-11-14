import { validateGtin } from "../../utils/gtin.js";
import { normalizeIdentifier } from "../../modules/neture/utils/product-identifier.util.js";
import { createHash, randomUUID } from "node:crypto";
import type { DataSource, EntityManager } from "typeorm";
import { StoreAdapter } from "../../modules/external-ai/adapters/store.adapter.js";
import {
  inspectPhotoInvoice,
  invoiceDuplicateHints,
  preparePhotoInvoiceConfirmation,
} from "./photo-invoice.js";
import {
  confirmInvoiceInput,
  imageSchema,
  LedgerError,
  prepareInvoiceInput,
} from "./contracts.js";

type Db = Pick<DataSource | EntityManager, "query">;
const sha = (v: string | Buffer) =>
  createHash("sha256").update(v).digest("hex");
export const LEDGER_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
/** 거래장 사진 검사. 채팅은 모델 판독 전에 같은 검사를 먼저 실행해 저장할 수 없는 사진에 판독 비용을 쓰지 않는다. */
export function validateLedgerImages(images: readonly unknown[]) {
  if (images.length > 8) throw new LedgerError("LEDGER_IMAGE_LIMIT");
  return images.map((value) => {
    const base64 = (value as { base64?: unknown } | null)?.base64;
    if (
      typeof base64 === "string" &&
      Math.floor((base64.length * 3) / 4) > LEDGER_IMAGE_MAX_BYTES + 2
    )
      throw new LedgerError("LEDGER_IMAGE_TOO_LARGE", 413);
    const image = imageSchema.parse(value);
    const bytes = Buffer.from(image.base64, "base64");
    if (bytes.length > LEDGER_IMAGE_MAX_BYTES)
      throw new LedgerError("LEDGER_IMAGE_TOO_LARGE", 413);
    if (bytes.length === 0 || bytes.toString("base64") !== image.base64)
      throw new LedgerError("LEDGER_IMAGE_INVALID");
    const valid =
      image.mimeType === "image/png"
        ? bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : image.mimeType === "image/jpeg"
          ? bytes[0] === 255 && bytes[1] === 216
          : bytes.toString("ascii", 0, 4) === "RIFF" &&
            bytes.toString("ascii", 8, 12) === "WEBP";
    if (!valid) throw new LedgerError("LEDGER_IMAGE_INVALID");
    return { ...image, bytes, sha256: sha(bytes) };
  });
}
export class PhotoLedgerService {
  constructor(
    readonly db: DataSource,
    readonly webOrigin = new URL("https://neture.co.kr"),
  ) {}
  async authorize(
    userId: string,
    organizationId: string,
    write: boolean,
    manager: Db = this.db,
  ) {
    await new StoreAdapter(this.db).authorize(
      userId,
      organizationId,
      write,
      manager,
    );
    const [consent] = await manager.query(
      `SELECT enabled,storage_mode FROM assistant_work_data_consents WHERE owner_key=$1 FOR SHARE`,
      ["organization:" + organizationId],
    );
    if (!consent?.enabled || consent.storage_mode !== "server")
      throw new LedgerError("LEDGER_SERVER_STORAGE_CONSENT_REQUIRED", 409);
  }
  async get(
    userId: string,
    organizationId: string,
    id: string,
    manager: Db = this.db,
  ) {
    await this.authorize(userId, organizationId, false, manager);
    const [row] = await manager.query(
      `SELECT id,organization_id,origin,state,invoice,sources,version,revision,confirmed_at,missing_original_ack,program_status FROM photo_transaction_invoices WHERE organization_id=$1 AND id=$2`,
      [organizationId, id],
    );
    if (!row) throw new LedgerError("LEDGER_NOT_FOUND", 404);
    const inspected = inspectPhotoInvoice(row.invoice, row.sources);
    return {
      ...row,
      issues: inspected.issues,
      warnings: inspected.warnings,
      lineTotal: inspected.lineTotal,
      knownLineSubtotal: inspected.knownLineSubtotal,
      openUrl: new URL(
        `/work/ledger/${id}?organizationId=${organizationId}`,
        this.webOrigin,
      ).href,
    };
  }
  async list(
    userId: string,
    organizationId: string,
    after?: string,
    limit = 20,
  ) {
    await this.authorize(userId, organizationId, false);
    const pageSize = Math.max(1, Math.min(50, limit));
    const items = await this.db.query(
      `SELECT id,state,invoice->>'sellerName' AS "sellerName",invoice->>'issuedOn' AS "issuedOn",version FROM photo_transaction_invoices WHERE organization_id=$1 AND ($2::uuid IS NULL OR (created_at,id)<(SELECT created_at,id FROM photo_transaction_invoices WHERE organization_id=$1 AND id=$2)) ORDER BY created_at DESC,id DESC LIMIT $3`,
      [organizationId, after ?? null, pageSize + 1],
    );
    const more = items.length > pageSize;
    return {
      items: items.slice(0, pageSize),
      next: more ? items[pageSize - 1].id : null,
    };
  }

  async prepare(
    userId: string,
    raw: unknown,
    origin: "o4o_chat" | "chatgpt",
    images: unknown[] = [],
  ) {
    const input = prepareInvoiceInput.parse(raw),
      org = input.workspaceId.slice(6);
    const photos = validateLedgerImages(images);
    return this.db.transaction(async (manager) => {
      await this.authorize(userId, org, true, manager);
      await manager.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
        ["photo-ledger:" + org],
      );
      const fingerprint = sha(
        JSON.stringify({ input, origin, photos: photos.map((p) => p.sha256) }),
      );
      const [previous] = await manager.query(
        "SELECT fingerprint,invoice_id FROM photo_transaction_requests WHERE organization_id=$1 AND request_id=$2",
        [org, input.requestId],
      );
      if (previous) {
        if (previous.fingerprint !== fingerprint)
          throw new LedgerError("LEDGER_REQUEST_ID_REUSED", 409);
        return this.get(userId, org, previous.invoice_id, manager);
      }
      let old: any;
      if (input.invoiceId) {
        [old] = await manager.query(
          "SELECT * FROM photo_transaction_invoices WHERE organization_id=$1 AND id=$2 FOR UPDATE",
          [org, input.invoiceId],
        );
        if (!old) throw new LedgerError("LEDGER_NOT_FOUND", 404);
        if (old.state !== "draft" || old.version !== input.expectedVersion)
          throw new LedgerError("LEDGER_CONFLICT", 409);
      }
      const id = old?.id ?? randomUUID(),
        sources = photos.length
          ? photos.map((p, index) => ({ page: index + 1, sha256: p.sha256 }))
          : (old?.sources ?? []);
      const checked = inspectPhotoInvoice(input.invoice, sources),
        version = (old?.version ?? 0) + 1;
      if (old)
        await manager.query(
          "UPDATE photo_transaction_invoices SET invoice=$3,sources=$4,revision=$5,version=$6,updated_at=now() WHERE organization_id=$1 AND id=$2",
          [
            org,
            id,
            checked.invoice,
            JSON.stringify(sources),
            checked.revision,
            version,
          ],
        );
      else
        await manager.query(
          "INSERT INTO photo_transaction_invoices(id,organization_id,created_by,origin,invoice,sources,revision) VALUES($1,$2,$3,$4,$5,$6,$7)",
          [
            id,
            org,
            userId,
            origin,
            checked.invoice,
            JSON.stringify(sources),
            checked.revision,
          ],
        );
      if (photos.length) {
        for (const [index, photo] of photos.entries())
          await manager.query(
            "INSERT INTO photo_transaction_images(invoice_id,page,sha256,mime_type,image_bytes) VALUES($1,$2,$3,$4,$5) ON CONFLICT(invoice_id,page,sha256) DO NOTHING",
            [id, index + 1, photo.sha256, photo.mimeType, photo.bytes],
          );
      }
      await manager.query(
        "INSERT INTO photo_transaction_revisions(invoice_id,version,actor_id,invoice,sources,revision) VALUES($1,$2,$3,$4,$5,$6)",
        [
          id,
          version,
          userId,
          checked.invoice,
          JSON.stringify(sources),
          checked.revision,
        ],
      );
      await manager.query(
        "INSERT INTO photo_transaction_requests(organization_id,request_id,fingerprint,invoice_id) VALUES($1,$2,$3,$4)",
        [org, input.requestId, fingerprint, id],
      );
      return this.get(userId, org, id, manager);
    });
  }
  async confirm(userId: string, org: string, id: string, raw: unknown) {
    const input = confirmInvoiceInput.parse(raw);
    return this.db.transaction(async (manager) => {
      await this.authorize(userId, org, true, manager);
      await manager.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
        ["photo-ledger:" + org],
      );
      const [row] = await manager.query(
        "SELECT * FROM photo_transaction_invoices WHERE organization_id=$1 AND id=$2 FOR UPDATE",
        [org, id],
      );
      if (!row) throw new LedgerError("LEDGER_NOT_FOUND", 404);
      if (row.state !== "draft") {
        if (row.confirmation_request === input.requestId) {
          if (row.confirmation_fingerprint !== sha(JSON.stringify(input)))
            throw new LedgerError("LEDGER_REQUEST_ID_REUSED", 409);
          return this.get(userId, org, id, manager);
        }
        throw new LedgerError("LEDGER_ALREADY_CONFIRMED", 409);
      }
      if (
        row.version !== input.expectedVersion ||
        row.revision !== input.expectedRevision
      )
        throw new LedgerError("LEDGER_CONFLICT", 409);
      let checked: ReturnType<typeof preparePhotoInvoiceConfirmation>;
      try {
        checked = preparePhotoInvoiceConfirmation(
          row.invoice,
          row.sources,
          input.expectedRevision,
        );
      } catch {
        throw new LedgerError("LEDGER_REVIEW_REQUIRED");
      }
      if (!row.sources.length && !input.acknowledgeMissingOriginal)
        throw new LedgerError("LEDGER_ORIGINAL_ACK_REQUIRED");
      const hints = invoiceDuplicateHints(
        "organization:" + org,
        row.invoice,
        row.sources,
      );
      const duplicates = await manager.query(
        `SELECT id FROM photo_transaction_invoices WHERE organization_id=$1 AND id<>$2 AND state='confirmed' AND (($3::text IS NOT NULL AND photo_fingerprint=$3) OR ($4::text IS NOT NULL AND document_fingerprint=$4) OR content_fingerprint=$5)`,
        [
          org,
          id,
          hints.photoFingerprint,
          hints.documentFingerprint,
          hints.contentFingerprint,
        ],
      );
      if (
        duplicates.length &&
        (!input.duplicateResolution || !input.duplicateReason)
      )
        throw new LedgerError("LEDGER_DUPLICATE_REVIEW_REQUIRED", 409);
      const duplicate =
        duplicates.length > 0 &&
        input.duplicateResolution === "same_transaction";
      await manager.query(
        `UPDATE photo_transaction_invoices SET state=$3,confirmed_by=$4,confirmed_at=now(),confirmation_request=$5,missing_original_ack=$6,duplicate_reason=$7,photo_fingerprint=$8,document_fingerprint=$9,confirmation_fingerprint=$10,program_status=$11,content_fingerprint=$12,updated_at=now() WHERE organization_id=$1 AND id=$2`,
        [
          org,
          id,
          duplicate ? "duplicate" : "confirmed",
          userId,
          input.requestId,
          input.acknowledgeMissingOriginal,
          input.duplicateReason ?? null,
          hints.photoFingerprint,
          hints.documentFingerprint,
          sha(JSON.stringify(input)),
          input.programStatus,
          hints.contentFingerprint,
        ],
      );
      if (!duplicate)
        for (const candidate of checked.productReviewCandidates) {
          const barcode = candidate.rawBarcode?.trim();
          const usableBarcode =
            barcode &&
            !candidate.unresolvedFields.includes("barcode") &&
            validateGtin(barcode) === null
              ? barcode
              : null;
          await manager.query(
            `INSERT INTO product_candidates(service_key,organization_id,source_type,source_id,source_label,submitted_by,candidate_status,candidate_name,candidate_manufacturer,candidate_spec,raw_payload,identifier_type,identifier_value,normalized_identifier_value) VALUES('neture',$1,'external_api',$2,'거래장 사진',$3,'pending',$4,$5,$6,$7,$8,$9,$10)`,
            [
              org,
              id,
              userId,
              candidate.rawProductName.slice(0, 255),
              candidate.rawManufacturer?.slice(0, 255) ?? null,
              candidate.rawPackageText?.slice(0, 255) ?? null,
              candidate,
              usableBarcode ? "GTIN" : null,
              usableBarcode,
              usableBarcode ? normalizeIdentifier("GTIN", usableBarcode) : null,
            ],
          );
        }
      return this.get(userId, org, id, manager);
    });
  }
  async image(
    userId: string,
    org: string,
    id: string,
    page: number,
    expectedVersion?: number,
  ) {
    const current = await this.get(userId, org, id);
    if (expectedVersion !== undefined && current.version !== expectedVersion)
      throw new LedgerError("LEDGER_CONFLICT", 409);
    const source = current.sources.find((s) => s.page === page);
    if (!source) throw new LedgerError("LEDGER_NOT_FOUND", 404);
    const [image] = await this.db.query(
      "SELECT mime_type,image_bytes FROM photo_transaction_images WHERE invoice_id=$1 AND page=$2 AND sha256=$3",
      [id, page, source.sha256],
    );
    if (!image) throw new LedgerError("LEDGER_NOT_FOUND", 404);
    return image;
  }
}
