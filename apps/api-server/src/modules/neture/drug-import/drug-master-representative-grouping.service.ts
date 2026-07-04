/**
 * Drug Master → RepresentativeProduct Grouping Service (raw batch, DataSource-backed)
 *
 * WO-O4O-DRUG-REPRESENTATIVE-PRODUCT-GROUPING-V1 / Gate A·B
 * 설계: CHECK-O4O-DRUG-REPRESENTATIVE-PRODUCT-GROUPING-DRYRUN-V1
 *
 * 목적:
 *   품목기준코드(MFDS_CODE) 기준으로 ProductMaster(SKU) 들을 묶는 representative_products 를 생성하고,
 *   product_masters.representative_product_id 로 연결한다. (1 품목 → N master)
 *
 * 경계 (WO):
 *   - 생성/변경 대상 = representative_products (INSERT) + product_masters.representative_product_id (UPDATE) 뿐.
 *   - ProductMaster 재생성/ProductIdentifier/Description/Image/Offer/Listing/StoreLocalProduct 미생성.
 *
 * 정책 (확정 — CHECK §7):
 *   - 생성 범위 = 전 품목(64,672, single-master 포함).
 *   - display_name = min(name). 그룹간 충돌분에만 `{name} (mfdsCode)` 접미.
 *   - manufacturer_name = 단일 제조사 그룹만 채움, 다제조사(≥2)는 NULL.
 *   - metadata: groupKey / sourceIdentifiers.mfdsCode / memberMasterCount / reviewFlags(multiManufacturer/multiName/duplicateDisplayName).
 *   - 멱등: metadata->sourceIdentifiers->>'mfdsCode' 기존 존재 → 재생성 skip. link UPDATE 는 NULL 만 채움.
 *   - dry-run 기본. apply 는 호출자(Job)가 이중 가드로 결정.
 *   - raw ds.query 만 사용(엔티티 메타 불필요).
 */

import type { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';

export const REP_SOURCE = 'WO-O4O-DRUG-REPRESENTATIVE-PRODUCT-GROUPING-V1';

interface GroupRow {
  mfds: string;
  display_name: string;
  master_count: string;
  manuf_count: string;
  name_count: string;
  min_manuf: string | null;
}

export interface GroupingOptions {
  apply: boolean;
  limit?: number | null;
}

export interface GroupingReport {
  mode: 'dry-run' | 'apply';
  totalGroups: number;
  existingGroups: number; // 이미 존재(멱등 skip)
  newGroups: number; // 생성 대상/생성됨
  singleMasterGroups: number;
  multiMasterGroups: number;
  multiManufacturerGroups: number;
  multiNameGroups: number;
  duplicateDisplayNameGroups: number;
  manufacturerFilledGroups: number;
  masterLinksExpected: number; // 신규 그룹이 커버하는 master 수
  createdRepresentatives: number;
  linkedMasters: number; // apply 시 실제 link 된 master 수
  errored: number;
  errors: string[];
}

interface BufferedRep {
  id: string;
  mfds: string;
  displayName: string;
  manufacturerName: string | null;
  metadata: Record<string, unknown>;
}

export class DrugMasterRepresentativeGroupingService {
  constructor(private readonly dataSource: DataSource) {}

  /** MFDS_CODE 그룹 집계 (품목당 1행) */
  private async aggregateGroups(limit?: number | null): Promise<GroupRow[]> {
    const limitClause = limit != null ? `LIMIT ${limit}` : '';
    return this.dataSource.query(
      `SELECT pi.normalized_value AS mfds,
              min(pm.name)                       AS display_name,
              count(DISTINCT pm.id)::text        AS master_count,
              count(DISTINCT pm.manufacturer_name)::text AS manuf_count,
              count(DISTINCT pm.name)::text      AS name_count,
              min(pm.manufacturer_name)          AS min_manuf
         FROM product_identifiers pi
         JOIN product_masters pm ON pm.id = pi.product_master_id
        WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL
        GROUP BY pi.normalized_value
        ORDER BY pi.normalized_value
        ${limitClause}`,
    );
  }

  /** 기존 representative 의 mfdsCode 집합 (멱등 skip 용) */
  private async preloadExistingMfds(): Promise<Set<string>> {
    const rows: Array<{ mfds: string | null }> = await this.dataSource.query(
      `SELECT metadata->'sourceIdentifiers'->>'mfdsCode' AS mfds
         FROM representative_products
        WHERE metadata->'sourceIdentifiers'->>'mfdsCode' IS NOT NULL`,
    );
    const set = new Set<string>();
    for (const r of rows) if (r.mfds) set.add(r.mfds);
    return set;
  }

  /** 청크 multi-row INSERT (5 param/row, chunk 500) */
  private async flushReps(buf: BufferedRep[]): Promise<void> {
    const size = 500;
    for (let i = 0; i < buf.length; i += size) {
      const chunk = buf.slice(i, i + size);
      if (chunk.length === 0) continue;
      const vals: string[] = [];
      const params: unknown[] = [];
      let p = 1;
      for (const b of chunk) {
        vals.push(`($${p++}, $${p++}, $${p++}, $${p++}::jsonb, NOW(), NOW())`);
        params.push(b.id, b.displayName, b.manufacturerName, JSON.stringify(b.metadata));
      }
      await this.dataSource.query(
        `INSERT INTO representative_products
           (id, display_name, manufacturer_name, metadata, created_at, updated_at)
         VALUES ${vals.join(', ')}`,
        params,
      );
    }
  }

  /**
   * link: representative(신규+기존) 를 기준으로 product_masters.representative_product_id 를 채운다.
   * set-based UPDATE — metadata mfdsCode == identifier(MFDS_CODE).normalized_value.
   * representative_product_id IS NULL 만 채움(멱등).
   */
  private async linkMasters(): Promise<number> {
    const res: Array<{ linked: string }> = await this.dataSource.query(
      `WITH upd AS (
         UPDATE product_masters pm
            SET representative_product_id = rp.id, updated_at = NOW()
           FROM product_identifiers pi
           JOIN representative_products rp
             ON rp.metadata->'sourceIdentifiers'->>'mfdsCode' = pi.normalized_value
          WHERE pi.product_master_id = pm.id
            AND pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL
            AND pm.representative_product_id IS NULL
          RETURNING pm.id
       )
       SELECT count(*)::text AS linked FROM upd`,
    );
    return parseInt(res[0]?.linked ?? '0', 10);
  }

  async run(opts: GroupingOptions): Promise<GroupingReport> {
    const report: GroupingReport = {
      mode: opts.apply ? 'apply' : 'dry-run',
      totalGroups: 0,
      existingGroups: 0,
      newGroups: 0,
      singleMasterGroups: 0,
      multiMasterGroups: 0,
      multiManufacturerGroups: 0,
      multiNameGroups: 0,
      duplicateDisplayNameGroups: 0,
      manufacturerFilledGroups: 0,
      masterLinksExpected: 0,
      createdRepresentatives: 0,
      linkedMasters: 0,
      errored: 0,
      errors: [],
    };

    const groups = await this.aggregateGroups(opts.limit);
    report.totalGroups = groups.length;

    // 1) display_name 전역 충돌 판정 (min(name) 기준)
    const nameCount = new Map<string, number>();
    for (const g of groups) nameCount.set(g.display_name, (nameCount.get(g.display_name) ?? 0) + 1);

    const existingMfds = await this.preloadExistingMfds();
    const buf: BufferedRep[] = [];

    for (const g of groups) {
      const masterCount = parseInt(g.master_count, 10);
      const manufCount = parseInt(g.manuf_count, 10);
      const nameCnt = parseInt(g.name_count, 10);
      const isDuplicate = (nameCount.get(g.display_name) ?? 0) > 1;
      const isMultiManuf = manufCount > 1;
      const isMultiName = nameCnt > 1;

      if (masterCount === 1) report.singleMasterGroups += 1;
      else report.multiMasterGroups += 1;
      if (isMultiManuf) report.multiManufacturerGroups += 1;
      if (isMultiName) report.multiNameGroups += 1;
      if (isDuplicate) report.duplicateDisplayNameGroups += 1;

      if (existingMfds.has(g.mfds)) {
        report.existingGroups += 1;
        continue;
      }
      report.newGroups += 1;
      report.masterLinksExpected += masterCount;

      // display_name: 충돌분만 mfdsCode 접미
      const displayName = isDuplicate ? `${g.display_name} (${g.mfds})` : g.display_name;
      // manufacturer_name: 단일 제조사만 채움
      const manufacturerName = !isMultiManuf ? g.min_manuf : null;
      if (manufacturerName) report.manufacturerFilledGroups += 1;

      const metadata: Record<string, unknown> = {
        groupKey: `MFDS_CODE:${g.mfds}`,
        sourceIdentifiers: { mfdsCode: g.mfds },
        memberMasterCount: masterCount,
        reviewFlags: {
          multiManufacturer: isMultiManuf,
          multiName: isMultiName,
          duplicateDisplayName: isDuplicate,
        },
        source: REP_SOURCE,
      };

      if (opts.apply) {
        buf.push({ id: randomUUID(), mfds: g.mfds, displayName, manufacturerName, metadata });
        if (buf.length >= 1000) {
          await this.flushReps(buf);
          report.createdRepresentatives += buf.length;
          buf.length = 0;
        }
      } else {
        report.createdRepresentatives += 1; // would-create
      }
    }

    if (opts.apply) {
      if (buf.length > 0) {
        await this.flushReps(buf);
        report.createdRepresentatives += buf.length;
        buf.length = 0;
      }
      report.linkedMasters = await this.linkMasters();
    }

    return report;
  }
}
