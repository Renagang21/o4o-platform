import type { DataSource } from "typeorm";
import { NeturePharmacyError, rowsOf } from "../constants.js";
import type { SemiFranchiseRow } from "./semi-franchise.service.js";

interface LibrarySnapshot {
  title: string;
  summary: string | null;
  body: string | null;
  attachments: Array<{ name: string; url: string }>;
}

/** The submitted version is independent of future supplier edits/deletion. No public CMS copy. */
export function librarySnapshot(item: {
  title: string;
  description?: string | null;
  content_type: string;
  blocks?: unknown;
  file_url?: string;
  file_name?: string;
}): LibrarySnapshot {
  const title = item.title?.trim();
  if (!title || title.length > 300)
    throw new NeturePharmacyError(
      400,
      "INVALID_TITLE",
      "자료 제목을 확인해 주세요.",
    );
  if (item.content_type === "document") {
    const blocks = Array.isArray(item.blocks) ? item.blocks : [];
    if (
      !blocks.every(
        (b) => b && b.type === "html" && typeof b.content === "string",
      )
    ) {
      throw new NeturePharmacyError(
        400,
        "UNSUPPORTED_DOCUMENT",
        "HTML 문서 자료를 선택해 주세요.",
      );
    }
    const body = blocks.map((b) => b.content).join("\n");
    if (!body.trim())
      throw new NeturePharmacyError(
        400,
        "EMPTY_DOCUMENT",
        "자료 본문을 확인해 주세요.",
      );
    return { title, summary: item.description ?? null, body, attachments: [] };
  }
  let url: URL;
  try {
    url = new URL(item.file_url || "");
  } catch {
    throw new NeturePharmacyError(
      400,
      "INVALID_FILE_URL",
      "자료 파일 주소를 확인해 주세요.",
    );
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new NeturePharmacyError(
      400,
      "INVALID_FILE_URL",
      "HTTP(S) 파일 주소를 사용해 주세요.",
    );
  return {
    title,
    summary: item.description ?? null,
    body: null,
    attachments: [{ name: item.file_name || title, url: url.href }],
  };
}

const VIEW = `SELECT sub.id, sub.status, sub.reason, sub.content_snapshot AS content,
  sub.created_at AS "createdAt", sub.reviewed_at AS "reviewedAt", sub.published_content_id AS "publishedContentId",
  sf.key AS "semiFranchiseKey", sf.name AS "semiFranchiseName", ns.slug AS "supplierName"
  FROM semi_franchise_content_submissions sub
  JOIN semi_franchises sf ON sf.id = sub.semi_franchise_id
  JOIN neture_suppliers ns ON ns.id = sub.supplier_id`;

export class BusinessContentSubmissionService {
  constructor(private readonly ds: DataSource) {}

  async submit(
    supplierId: string,
    userId: string,
    sourceId: string,
    businessKey: string,
  ) {
    return this.ds.transaction(async (m) => {
      const [item] = await m.query(
        `SELECT title, description, content_type, blocks, file_url, file_name
        FROM neture_supplier_library_items WHERE id = $1::uuid AND supplier_id = $2::uuid FOR SHARE`,
        [sourceId, supplierId],
      );
      if (!item)
        throw new NeturePharmacyError(
          404,
          "ITEM_NOT_FOUND",
          "자료를 찾을 수 없습니다.",
        );
      const [sf] = await m.query(
        `SELECT id FROM semi_franchises WHERE key = $1 AND status = 'active' FOR SHARE`,
        [businessKey],
      );
      if (!sf)
        throw new NeturePharmacyError(
          404,
          "BUSINESS_NOT_FOUND",
          "약국 협력사업을 찾을 수 없습니다.",
        );
      const content = librarySnapshot(item);
      await m.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [
        `business-content:${supplierId}:${sourceId}:${sf.id}`,
      ]);
      const [existing] = await m.query(
        `SELECT id, status FROM semi_franchise_content_submissions
        WHERE semi_franchise_id = $1 AND supplier_id = $2 AND source_library_item_id = $3 AND status IN ('pending','approved')`,
        [sf.id, supplierId, sourceId],
      );
      if (existing) return { ...existing, reused: true };
      const [row] = await m.query(
        `INSERT INTO semi_franchise_content_submissions
        (semi_franchise_id, supplier_id, source_library_item_id, content_snapshot, requested_by)
        VALUES ($1,$2,$3,$4::jsonb,$5) RETURNING id, status`,
        [sf.id, supplierId, sourceId, JSON.stringify(content), userId],
      );
      return { ...row, reused: false };
    });
  }

  async supplierList(supplierId: string) {
    return this.ds.query(
      `${VIEW} WHERE sub.supplier_id = $1 ORDER BY sub.created_at DESC`,
      [supplierId],
    );
  }

  async operatorList(sf: SemiFranchiseRow, status?: string) {
    if (status && !["all", "pending", "approved", "rejected"].includes(status))
      throw new NeturePharmacyError(
        400,
        "INVALID_STATUS",
        "상태를 확인해 주세요.",
      );
    return this.ds.query(
      `${VIEW} WHERE sub.semi_franchise_id = $1 AND ($2::text IS NULL OR sub.status = $2)
      ORDER BY sub.created_at DESC`,
      [sf.id, status && status !== "all" ? status : null],
    );
  }

  /** Approval and publication are one transaction. Only the previously submitted version is published. */
  async decide(
    sf: SemiFranchiseRow,
    operatorId: string,
    id: string,
    action: "approve" | "reject",
    reason?: string,
  ) {
    if (!["approve", "reject"].includes(action))
      throw new NeturePharmacyError(
        400,
        "INVALID_ACTION",
        "처리 방법을 확인해 주세요.",
      );
    if (reason !== undefined && typeof reason !== "string")
      throw new NeturePharmacyError(
        400,
        "INVALID_REASON",
        "심사 사유는 문자열이어야 합니다.",
      );
    return this.ds.transaction(async (m) => {
      const [row] = await m.query(
        `SELECT * FROM semi_franchise_content_submissions
        WHERE id = $1::uuid AND semi_franchise_id = $2 FOR UPDATE`,
        [id, sf.id],
      );
      if (!row)
        throw new NeturePharmacyError(
          404,
          "SUBMISSION_NOT_FOUND",
          "제출 자료를 찾을 수 없습니다.",
        );
      if (row.status !== "pending")
        throw new NeturePharmacyError(
          409,
          "INVALID_TRANSITION",
          "이미 심사가 완료된 자료입니다.",
        );
      let contentId: string | null = null;
      if (action === "approve") {
        const [active] = await m.query(
          `SELECT 1 FROM semi_franchises sf JOIN neture_suppliers ns ON ns.id = $2 AND ns.status = 'ACTIVE'
          WHERE sf.id = $1 AND sf.status = 'active' FOR SHARE OF sf, ns`,
          [sf.id, row.supplier_id],
        );
        if (!active)
          throw new NeturePharmacyError(
            409,
            "CONTENT_SOURCE_UNAVAILABLE",
            "사업 또는 공급자의 현재 이용 상태에서는 게시할 수 없습니다.",
          );
        const c = row.content_snapshot as LibrarySnapshot;
        const [published] = await m.query(
          `INSERT INTO semi_franchise_contents
          (semi_franchise_id, title, summary, body, attachments, status, created_by, updated_by, published_at)
          VALUES ($1,$2,$3,$4,$5::jsonb,'published',$6,$6,NOW()) RETURNING id`,
          [
            sf.id,
            c.title,
            c.summary,
            c.body,
            JSON.stringify(c.attachments),
            operatorId,
          ],
        );
        contentId = published.id;
      }
      const [result] = rowsOf(
        await m.query(
          `UPDATE semi_franchise_content_submissions
        SET status = $2, reason = $3, reviewed_by = $4, reviewed_at = NOW(), published_content_id = $5
        WHERE id = $1 RETURNING id, status, published_content_id AS "publishedContentId"`,
          [
            id,
            action === "approve" ? "approved" : "rejected",
            reason?.trim().slice(0, 1000) || null,
            operatorId,
            contentId,
          ],
        ),
      );
      return result;
    });
  }
}
