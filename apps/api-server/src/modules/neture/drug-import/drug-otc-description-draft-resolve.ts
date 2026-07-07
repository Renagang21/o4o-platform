/**
 * Drug OTC Store Description Draft — 그룹 해상도(프로덕션 DB, read-only SELECT)
 *
 * WO-O4O-DRUG-OTC-DESCRIPTION-DRAFT-DB-APPLY-DESIGN-V1 / -APPLY-V1 공유.
 * fixture(성분·함량·제형) 를 VALUES 로 바인딩해 product_masters 파싱 CTE 와 조인, 그룹별
 * master/OTC/RX/e약은요/anchor 를 산출한다. **SELECT only** — 이 모듈은 write 하지 않는다.
 */

import type { DataSource } from 'typeorm';
import { DRUG_OTC_DESCRIPTION_GROUPS, type DrugOtcGroupResolution } from './drug-otc-description-draft-plan.js';

export async function resolveDrugOtcGroups(ds: DataSource): Promise<Map<number, DrugOtcGroupResolution>> {
  const params: (number | string)[] = [];
  const rowsSql = DRUG_OTC_DESCRIPTION_GROUPS.map((g, i) => {
    const b = i * 4;
    params.push(g.seq, g.ingredient, g.strengthToken, g.doseForm);
    return `($${b + 1}::int,$${b + 2}::text,$${b + 3}::text,$${b + 4}::text)`;
  }).join(',');

  const sql = `
    WITH fixture(seq, ing, str, form) AS ( VALUES ${rowsSql} ),
    parsed AS (
      SELECT pm.id, pm.manufacturer_name AS mfr, pm.drug_category AS cat,
        substring(pm.name from '\\(([^()]+)\\)\\s*$') AS ing,
        split_part(pm.specification, ' / ', 1) AS str,
        CASE WHEN pm.name LIKE '%연질캡슐%' THEN '연질캡슐'
             WHEN pm.name LIKE '%캡슐%' THEN '캡슐'
             WHEN pm.name LIKE '%정%' THEN '정' ELSE NULL END AS form
      FROM product_masters pm WHERE pm.regulatory_type='DRUG'
    ),
    matched AS (
      SELECT f.seq, p.id, p.mfr, p.cat
      FROM fixture f JOIN parsed p ON p.ing=f.ing AND p.str=f.str AND p.form=f.form
    ),
    agg AS (
      SELECT seq, count(*) AS master_total,
        count(*) FILTER (WHERE cat='otc') AS otc,
        count(*) FILTER (WHERE cat='rx') AS rx,
        count(*) FILTER (WHERE cat NOT IN ('otc','rx') OR cat IS NULL) AS other_cat,
        count(DISTINCT mfr) AS mfrs
      FROM matched GROUP BY seq
    ),
    spd AS (
      SELECT m.seq, count(DISTINCT s.master_id) AS spd_masters
      FROM matched m
      JOIN shared_product_descriptions s ON s.master_id=m.id AND s.deleted_at IS NULL AND s.source_type='mfds_easy_drug'
      WHERE m.cat='otc' GROUP BY m.seq
    ),
    anchor AS (
      SELECT m.seq, count(DISTINCT c.matched_product_master_id) AS anchor_masters, min(c.id::text) AS anchor_candidate
      FROM matched m
      JOIN product_candidates c ON c.matched_product_master_id=m.id AND c.source_type='csv_import' AND c.deleted_at IS NULL
      WHERE m.cat='otc' GROUP BY m.seq
    )
    SELECT f.seq,
      COALESCE(a.master_total,0) AS master_total, COALESCE(a.otc,0) AS otc, COALESCE(a.rx,0) AS rx,
      COALESCE(a.other_cat,0) AS other_cat, COALESCE(a.mfrs,0) AS mfrs,
      COALESCE(sp.spd_masters,0) AS spd_masters, COALESCE(an.anchor_masters,0) AS anchor_masters,
      an.anchor_candidate
    FROM fixture f
    LEFT JOIN agg a ON a.seq=f.seq
    LEFT JOIN spd sp ON sp.seq=f.seq
    LEFT JOIN anchor an ON an.seq=f.seq
    ORDER BY f.seq`;

  type Raw = {
    seq: number; master_total: string; otc: string; rx: string; other_cat: string;
    mfrs: string; spd_masters: string; anchor_masters: string; anchor_candidate: string | null;
  };
  const raw: Raw[] = await ds.query(sql, params);
  const map = new Map<number, DrugOtcGroupResolution>();
  for (const r of raw) {
    map.set(Number(r.seq), {
      masterTotal: Number(r.master_total), otc: Number(r.otc), rx: Number(r.rx),
      otherCat: Number(r.other_cat), manufacturers: Number(r.mfrs),
      spdMasters: Number(r.spd_masters), anchorMasters: Number(r.anchor_masters),
      anchorCandidateId: r.anchor_candidate,
    });
  }
  return map;
}
