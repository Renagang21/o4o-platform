/**
 * StoreAssetDerivation Service
 *
 * WO-KPA-STORE-ASSET-DERIVATION-TABLE-V1 (IR Phase 2-B-2)
 *
 * 원본(source) ↔ 파생 결과물(derived) 관계 기록/조회.
 * 기존 결과물 저장소는 변경하지 않으며, 생성 성공 이후 best-effort 로 관계만 적재한다.
 */

import type { DataSource } from 'typeorm';
import { StoreAssetDerivation } from '../../platform/entities/store-asset-derivation.entity.js';

// ─── 어휘 카탈로그 (application-level validation; DB enum 미사용) ──────────────
export const STORE_ASSET_SOURCE_KINDS = [
  'content_snapshot',     // o4o_asset_snapshots
  'content_direct',       // kpa_store_contents (source_type=direct)
  'library_resource',     // store_execution_assets (source_type=uploaded)
  'production_material',  // store_execution_assets (source_type=generated, content)
  'store_execution_asset', // store_execution_assets (일반)
] as const;

export const STORE_ASSET_DERIVED_KINDS = [
  'pop_pdf',          // store_execution_assets (file/generated/pop)
  'qr_code',          // store_qr_codes
  'blog_post',        // store_blog_posts
  'signage_item',     // store_playlist_items (후속)
  'signage_playlist', // store_playlists (후속)
] as const;

export type StoreAssetSourceKind = (typeof STORE_ASSET_SOURCE_KINDS)[number];
export type StoreAssetDerivedKind = (typeof STORE_ASSET_DERIVED_KINDS)[number];

const SOURCE_SET = new Set<string>(STORE_ASSET_SOURCE_KINDS);
const DERIVED_SET = new Set<string>(STORE_ASSET_DERIVED_KINDS);

export interface DerivationSourceRef {
  kind: string;
  id: string;
  title?: string | null;
}

export interface RecordDerivationsInput {
  serviceKey: string;
  organizationId: string;
  createdBy?: string | null;
  derivedKind: string;
  derivedId: string;
  derivedTitle?: string | null;
  sources: DerivationSourceRef[];
  metadata?: Record<string, unknown> | null;
}

/**
 * 원본→파생 관계를 기록한다. 화이트리스트(kind) + boundary(service_key/org) 검증 후
 * 유효한 source 마다 1행 insert. UNIQUE 제약으로 중복은 무시(orIgnore).
 * @returns 시도한 유효 source 행 수 (실제 insert 수가 아닌, 검증 통과 수)
 */
export async function recordDerivations(
  dataSource: DataSource,
  input: RecordDerivationsInput,
): Promise<number> {
  const { serviceKey, organizationId, createdBy, derivedKind, derivedId, derivedTitle, sources, metadata } = input;

  if (!serviceKey || !organizationId || !derivedId) return 0;
  if (!DERIVED_SET.has(derivedKind)) return 0;

  const rows = (sources ?? [])
    .filter((s) => s && s.id && SOURCE_SET.has(s.kind))
    .map((s) => ({
      serviceKey,
      organizationId,
      sourceKind: s.kind,
      sourceId: s.id,
      sourceTitle: s.title ?? null,
      derivedKind,
      derivedId,
      derivedTitle: derivedTitle ?? null,
      createdBy: createdBy ?? null,
      metadata: metadata ?? null,
    }));

  if (rows.length === 0) return 0;

  await dataSource
    .createQueryBuilder()
    .insert()
    .into(StoreAssetDerivation)
    .values(rows)
    .orIgnore() // ON CONFLICT DO NOTHING (UNIQUE relation)
    .execute();

  return rows.length;
}

/** 결과물 기준 원본 역추적 (org 격리). */
export async function findByDerived(
  dataSource: DataSource,
  organizationId: string,
  derivedKind: string,
  derivedId: string,
): Promise<StoreAssetDerivation[]> {
  return dataSource.getRepository(StoreAssetDerivation).find({
    where: { organizationId, derivedKind, derivedId },
    order: { createdAt: 'DESC' },
    take: 100,
  });
}

/** 원본 기준 파생 결과 조회 (org 격리). */
export async function findBySource(
  dataSource: DataSource,
  organizationId: string,
  sourceKind: string,
  sourceId: string,
): Promise<StoreAssetDerivation[]> {
  return dataSource.getRepository(StoreAssetDerivation).find({
    where: { organizationId, sourceKind, sourceId },
    order: { createdAt: 'DESC' },
    take: 100,
  });
}
