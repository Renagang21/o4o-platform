/**
 * QR content_hub → 매장 사본 가드 (WO-O4O-KPA-QR-TARGET-COPY-GUARD-V1)
 *
 * 정책(IR-O4O-COPY-ON-IMPORT-INVARIANT-AUDIT-V1, P1=A안):
 *   매장 영역에서 생성·사용되는 QR 은 반드시 매장 소유 사본을 참조한다.
 *   운영자 content_hub 원본(kpa_contents)을 매장 QR 이 직접 참조하는 구조는 허용하지 않는다.
 *
 * 동작:
 *   page QR 의 landing_target_id 가 content_hub 원본(kpa_contents.id)을 가리키면,
 *   그 본문을 매장 소유 사본(store_execution_assets, asset_type='content')으로 생성/재사용하고
 *   QR 이 사본을 library_item_id 로 참조하도록 치환한다(landing_target_id=null).
 *   원본 id 는 store_asset_derivations(content_hub → store_execution_asset) 추적용으로만 남긴다.
 *
 * content_hub 원본이 아닌 target(매장 직접 콘텐츠 kpa_store_contents / slug / 비-UUID)은 그대로 통과한다.
 */

import type { DataSource } from 'typeorm';
import { StoreExecutionAsset } from '../../platform/entities/store-execution-asset.entity.js';
import { recordDerivations, findBySource } from './store-asset-derivation.service.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PageTargetCopyInput {
  organizationId: string;
  serviceKey?: string | null;
  landingTargetId?: string | null;
  libraryItemId?: string | null;
  createdBy?: string | null;
}

export interface PageTargetCopyResult {
  libraryItemId: string | null;
  landingTargetId: string | null;
  /** content_hub 원본 → 사본 치환이 일어났으면 원본 kpa_contents.id */
  copiedFromContentHubId?: string | null;
}

/** blocks(JSON) → 간단 HTML (body 가 비어 있을 때 폴백). 텍스트 손실 최소화용. */
function blocksToHtml(blocks: unknown): string {
  if (!Array.isArray(blocks)) return '';
  const parts: string[] = [];
  for (const b of blocks as any[]) {
    if (!b || typeof b !== 'object') continue;
    const text =
      typeof b.content === 'string' ? b.content
      : typeof b.text === 'string' ? b.text
      : typeof b.value === 'string' ? b.value
      : '';
    const url = typeof b.url === 'string' ? b.url : (b.attributes?.url ?? '');
    if (b.type === 'image' || b.type === 'o4o/image') {
      if (url) parts.push(`<p><img src="${url}" alt="" /></p>`);
    } else if (b.type === 'list' || b.type === 'o4o/list') {
      const items: string[] = Array.isArray(b.items) ? b.items : (Array.isArray(b.content?.items) ? b.content.items : []);
      if (items.length) parts.push(`<ul>${items.map((i) => `<li>${String(i)}</li>`).join('')}</ul>`);
    } else if (text) {
      parts.push(`<p>${text}</p>`);
    }
  }
  return parts.join('\n');
}

/**
 * page QR target 을 매장 사본 기준으로 정규화한다.
 * - libraryItemId 가 이미 있으면(내 매장 자료 직접 선택) 그대로 통과.
 * - landingTargetId 가 content_hub 원본이면 사본 생성/재사용 후 libraryItemId 로 치환.
 * - 그 외(매장 직접 콘텐츠/slug/비-UUID)는 그대로 통과.
 */
export async function ensureStoreCopyForPageTarget(
  dataSource: DataSource,
  input: PageTargetCopyInput,
): Promise<PageTargetCopyResult> {
  const { organizationId, serviceKey, landingTargetId, libraryItemId, createdBy } = input;

  if (libraryItemId) {
    return { libraryItemId, landingTargetId: null };
  }
  if (!landingTargetId || !UUID_RE.test(landingTargetId)) {
    return { libraryItemId: null, landingTargetId: landingTargetId ?? null };
  }

  // content_hub 원본(kpa_contents)인지 확인 — 아니면 그대로 통과(매장 직접 콘텐츠 등).
  const rows = await dataSource.query(
    `SELECT id, title, summary, body, blocks
       FROM kpa_contents
      WHERE id = $1 AND is_deleted = false
      LIMIT 1`,
    [landingTargetId],
  );
  const c = rows?.[0];
  if (!c) {
    return { libraryItemId: null, landingTargetId };
  }

  const assetsRepo = dataSource.getRepository(StoreExecutionAsset);

  // dedup: 이미 같은 content_hub 원본에서 만든 매장 사본이 있으면 재사용.
  const existingDerivs = await findBySource(dataSource, organizationId, 'content_hub', String(c.id)).catch(() => []);
  for (const d of existingDerivs) {
    if (d.derivedKind === 'store_execution_asset') {
      const existing = await assetsRepo.findOne({ where: { id: d.derivedId, organizationId, isActive: true } });
      if (existing) {
        return { libraryItemId: existing.id, landingTargetId: null, copiedFromContentHubId: String(c.id) };
      }
    }
  }

  // 매장 사본 생성 (store_execution_assets content)
  const html = typeof c.body === 'string' && c.body.trim() ? c.body : blocksToHtml(c.blocks);
  const asset = assetsRepo.create({
    organizationId,
    title: typeof c.title === 'string' && c.title.trim() ? c.title : '(제목 없음)',
    description: typeof c.summary === 'string' ? c.summary : null,
    assetType: 'content',
    sourceType: 'generated',
    htmlContent: html,
    isActive: true,
  });
  const saved = await assetsRepo.save(asset);

  // 원본 추적(content_hub → store_execution_asset). best-effort.
  await recordDerivations(dataSource, {
    serviceKey: serviceKey ?? 'kpa',
    organizationId,
    createdBy: createdBy ?? null,
    derivedKind: 'store_execution_asset',
    derivedId: saved.id,
    derivedTitle: saved.title,
    sources: [{ kind: 'content_hub', id: String(c.id), title: typeof c.title === 'string' ? c.title : null }],
  }).catch(() => undefined);

  return { libraryItemId: saved.id, landingTargetId: null, copiedFromContentHubId: String(c.id) };
}
