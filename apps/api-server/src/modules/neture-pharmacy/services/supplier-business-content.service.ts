import type { DataSource } from 'typeorm';
import { NeturePharmacyError } from '../constants.js';

/** A business review copy, never a community post or a public CMS entry. */
export class SupplierBusinessContentService {
  constructor(private readonly ds: DataSource) {}

  async targets() {
    return this.ds.query(`SELECT key, name FROM semi_franchises WHERE status = 'active' ORDER BY name, key`);
  }

  async list(supplierId: string) {
    return this.ds.query(`SELECT c.id, c.title, c.status, c.source_item_id AS "sourceItemId",
      c.review_reason AS reason, c.created_at AS "createdAt", c.updated_at AS "updatedAt",
      sf.key AS "businessKey", sf.name AS "businessName"
      FROM semi_franchise_contents c JOIN semi_franchises sf ON sf.id = c.semi_franchise_id
      WHERE c.source_supplier_id = $1::uuid ORDER BY c.created_at DESC, c.id`, [supplierId]);
  }

  async request(supplierId: string, userId: string, itemId: string, businessKey: string) {
    return this.ds.transaction(async m => {
      const [source] = await m.query(`SELECT id, title, description, blocks, file_url, file_name, mime_type
        FROM neture_supplier_library_items WHERE id = $1::uuid AND supplier_id = $2::uuid FOR SHARE`, [itemId, supplierId]);
      if (!source) throw new NeturePharmacyError(404, 'ITEM_NOT_FOUND', '자료를 찾을 수 없습니다.');
      const [sf] = await m.query(`SELECT id FROM semi_franchises WHERE key = $1 AND status = 'active' FOR SHARE`, [businessKey]);
      if (!sf) throw new NeturePharmacyError(404, 'BUSINESS_NOT_FOUND', '등재 요청할 수 없는 협력사업입니다.');
      await m.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [`supplier-content:${supplierId}:${itemId}:${sf.id}`]);
      const [existing] = await m.query(`SELECT id, status FROM semi_franchise_contents
        WHERE semi_franchise_id = $1 AND source_supplier_id = $2 AND source_item_id = $3
          AND status IN ('pending','draft','published')`, [sf.id, supplierId, itemId]);
      if (existing) return { ...existing, reused: true };
      const attachments = source.file_url ? [{ name: source.file_name || source.title, url: source.file_url }] : [];
      const [created] = await m.query(`INSERT INTO semi_franchise_contents
        (semi_franchise_id, source_supplier_id, source_item_id, title, summary, body, thumbnail_url,
         attachments, status, created_by, updated_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,'pending',$9,$9) RETURNING id, status`,
      [sf.id, supplierId, itemId, source.title, source.description, libraryBlocksText(source.blocks),
        source.mime_type?.startsWith('image/') ? source.file_url : null, JSON.stringify(attachments), userId]);
      return { ...created, reused: false };
    });
  }
}

/** Preserve readable document text without introducing HTML into the plain-text business editor. */
export function libraryBlocksText(value: unknown): string {
  if (typeof value === 'string') return value.replace(/<[^>]*>/g, '');
  if (Array.isArray(value)) return value.map(libraryBlocksText).filter(Boolean).join('\n');
  if (!value || typeof value !== 'object') return '';
  const block = value as Record<string, unknown>;
  if (typeof block.text === 'string') return block.text;
  return libraryBlocksText(block.content ?? block.children ?? block.data);
}
