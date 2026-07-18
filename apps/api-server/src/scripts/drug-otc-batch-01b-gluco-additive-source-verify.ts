/**
 * WO-O4O-OTC-BATCH-01B-GLUCOSAMINE-ADDITIVE-SOURCE-VERIFY-AGENT-GA-V1
 *
 * 결정글루코사민황산염 250mg 캡슐 — ungrounded 승격대상 8 master 의 첨가제(황색5호) 원문 검증.
 * **read-only. DB write 0 · draft/canonical/번역/ProductMaster 변경 0. SELECT only.**
 *
 * 조사 원천(제품별 실제 원문만, 성분·함량·제품명 유사 추정 금지):
 *   1) 식약처 e약은요 원문      = product_candidates(source_label='MFDS_EASY_DRUG_INFO').raw_payload.source
 *        └ 첨가제/색소 경고는 atpnWarnQesitm(경고)/atpnQesitm(주의) 에 등장(황색5호/타르색소/유당/아스파탐)
 *   2) 품목 표준코드 레지스트리 = product_candidates(source_label LIKE 'mfds-drug-master-standard-code%')
 *        └ 바코드/표준코드/제형/포장/제조사 메타만 보유(첨가제·주의·경고 텍스트 없음) — 첨가제 근거 아님
 *   3) 기존 shared_product_descriptions content(이미 반영된 경고 여부)
 *
 * 매핑: product_candidates.matched_product_master_id → master (직접 링크)
 *       + product_identifiers(MFDS_CODE=itemSeq) → MFDS_EASY_DRUG_INFO(identifier_value=itemSeq)
 * 대조군(추정 아님, 맥락): 같은 ATC(M01AX05)·250·캡슐 grounded(e약은요 보유) 의 황색5호 언급 + 제조사 대조.
 *
 * 접속: Cloud SQL Auth Proxy(localhost:5442 → netureyoutube:asia-northeast3:o4o-platform-db).
 * Usage: (apps/api-server) NODE_ENV= ../../node_modules/.bin/tsx src/scripts/drug-otc-batch-01b-gluco-additive-source-verify.ts
 *   (apps/api-server/.env = gitignored, DB_PORT=5442 / o4o_api creds)
 * 산출: docs/checks/data/batch-01b-gluco-additive-source-verification-v1.json
 */
import '../env-loader.js';
import { DataSource } from 'typeorm';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd().includes('api-server') ? path.resolve(process.cwd(), '../..') : process.cwd();
const TARGETS_PATH = path.resolve(REPO_ROOT, 'docs/checks/data/batch-01b-gluco-additive-verify-targets-v1.json');
const OUT_PATH = path.resolve(REPO_ROOT, 'docs/checks/data/batch-01b-gluco-additive-source-verification-v1.json');

const DYE_Y5 = /(황색\s*5호|Yellow\s*5|타르트라진|tartrazine|E102)/i;
const DYE_Y4 = /(황색\s*4호|Sunset|선셋|E110)/i;
const DYE_OTHER = /(적색\s*\d+호|청색\s*\d+호|녹색\s*\d+호|타르색소|타르\s*색소|색소)/;
const OTHER_ADDITIVE = /(유당|락토|갈락토|아스파탐|페닐케톤|아황산|벤조산|파라벤|안식향)/;

function scan(text: string) {
  const t = (text || '').normalize('NFKC');
  return { y5: DYE_Y5.test(t), y4: DYE_Y4.test(t), otherDye: DYE_OTHER.test(t), otherAdditive: OTHER_ADDITIVE.test(t) };
}
function snippet(text: string, re: RegExp, pad = 40): string | null {
  const t = (text || '').normalize('NFKC'); const m = t.match(re);
  if (!m || m.index === undefined) return null;
  return t.slice(Math.max(0, m.index - pad), m.index + m[0].length + pad).replace(/\s+/g, ' ').trim();
}

async function main() {
  const targets = JSON.parse(fs.readFileSync(TARGETS_PATH, 'utf8'));
  const ids: string[] = targets.ungroundedTargets.map((t: any) => t.master_id);
  if (ids.length !== 8) { console.error(`[ABORT] 대상 수 ${ids.length} !== 8`); process.exit(2); }

  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT || '5442', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'], ssl: false,
    extra: { max: 3, connectionTimeoutMillis: 15000, statement_timeout: 120000 },
  });
  await ds.initialize();
  console.error(`[db] connected: ${(await ds.query('SELECT current_database() db'))[0].db} (read-only)`);

  // 1) masters
  const masters: any[] = await ds.query(
    `SELECT id::text, name, coalesce(manufacturer_name,'') manufacturer, mfds_permit_number permit,
            coalesce(specification,'') spec, coalesce(barcode,'') barcode, coalesce(mfds_product_id,'') mfds_product_id
     FROM product_masters WHERE id = ANY($1::uuid[])`, [ids]);

  // 2) identifiers
  const idents: any[] = await ds.query(
    `SELECT product_master_id::text mid, identifier_type t, identifier_value v
     FROM product_identifiers WHERE product_master_id = ANY($1::uuid[])`, [ids]);
  const seqByMid = new Map<string, string>(); const atcByMid = new Map<string, string>();
  const kdcByMid = new Map<string, string>();
  for (const r of idents) {
    if (r.t === 'MFDS_CODE' && !seqByMid.has(r.mid)) seqByMid.set(r.mid, r.v);
    if (r.t === 'ATC_CODE' && !atcByMid.has(r.mid)) atcByMid.set(r.mid, r.v);
    if (r.t === 'KOREA_DRUG_CODE' && !kdcByMid.has(r.mid)) kdcByMid.set(r.mid, r.v);
  }
  const allSeqs = [...new Set([...seqByMid.values()])];

  // 3) matched candidates (직접 링크) — 첨가제 텍스트 스캔
  const matched: any[] = await ds.query(
    `SELECT matched_product_master_id::text mid, source_label,
            (raw_payload::text ~ '황색\\s*5호')::int y5,
            (raw_payload::text ~ '색소|타르색소')::int dye,
            left(raw_payload::text, 6000) raw_head
     FROM product_candidates WHERE matched_product_master_id = ANY($1::uuid[]) AND deleted_at IS NULL`, [ids]);
  const matchedByMid = new Map<string, any[]>();
  for (const r of matched) { const a = matchedByMid.get(r.mid) ?? []; a.push(r); matchedByMid.set(r.mid, a); }

  // 4) e약은요 원문 by itemSeq (있으면 첨가제 경고 근거)
  const easy: any[] = allSeqs.length ? await ds.query(
    `SELECT identifier_value seq,
            raw_payload->'source'->>'itemName' itemname,
            coalesce(raw_payload->'source'->>'atpnWarnQesitm','') warn,
            coalesce(raw_payload->'source'->>'atpnQesitm','') atpn
     FROM product_candidates WHERE source_label='MFDS_EASY_DRUG_INFO' AND identifier_value = ANY($1::text[])`, [allSeqs]) : [];
  const easyBySeq = new Map<string, any>(); for (const e of easy) easyBySeq.set(e.seq, e);

  // 5) existing SPD
  const spds: any[] = await ds.query(
    `SELECT master_id::text mid, language lang, status,
            (content LIKE '%황색5호%' OR content LIKE '%황색 5호%')::int has_y5
     FROM shared_product_descriptions WHERE master_id = ANY($1::uuid[]) AND deleted_at IS NULL`, [ids]);
  const spdByMid = new Map<string, any[]>();
  for (const s of spds) { const a = spdByMid.get(s.mid) ?? []; a.push(s); spdByMid.set(s.mid, a); }

  // 6) 대조군 grounded (같은 ATC·250·캡슐, e약은요 보유)
  const grounded: any[] = await ds.query(
    `SELECT pm.id::text mid, pm.name, coalesce(pm.manufacturer_name,'') manufacturer, pi.identifier_value seq,
            (pc.raw_payload->'source'->>'atpnWarnQesitm') warn, (pc.raw_payload->'source'->>'atpnQesitm') atpn
     FROM product_masters pm
     JOIN product_identifiers pi ON pi.product_master_id=pm.id AND pi.identifier_type='MFDS_CODE'
     JOIN product_candidates pc ON pc.source_label='MFDS_EASY_DRUG_INFO' AND pc.identifier_value=pi.identifier_value
     WHERE pm.drug_category ILIKE 'otc' AND pm.name ILIKE '%글루코사민%' AND pm.specification ILIKE '%250%'`);
  const gBySeq = new Map<string, any>();
  for (const g of grounded) if (!gBySeq.has(g.seq)) {
    const s = scan(`${g.warn ?? ''} ${g.atpn ?? ''}`);
    gBySeq.set(g.seq, { seq: g.seq, name: g.name, manufacturer: g.manufacturer, y5: s.y5, y5_snippet: snippet(`${g.warn ?? ''} ${g.atpn ?? ''}`, DYE_Y5, 20) });
  }
  const groundedSeqs = [...gBySeq.values()];
  const groundedMfrs = [...new Set(groundedSeqs.map((g) => g.manufacturer))];

  // ── per-target verdict ──
  const results = masters.map((m) => {
    const seq = seqByMid.get(m.id) ?? null;
    const mc = matchedByMid.get(m.id) ?? [];
    const e = seq ? easyBySeq.get(seq) : null;
    const easyText = e ? `${e.warn} ${e.atpn}` : '';
    const easyScan = scan(easyText);
    // 표준코드 레지스트리는 첨가제 근거 아님 — 텍스트 스캔만 참고
    const stdText = mc.map((c: any) => c.raw_head || '').join(' ');
    const stdScan = scan(stdText);
    const hasEasy = !!e;
    const hasAdditiveSource = hasEasy; // 첨가제/경고 텍스트를 담는 유일 소스 = e약은요. 표준코드는 제외.
    const anyY5 = easyScan.y5 || stdScan.y5;
    const anyOtherDye = easyScan.otherDye || easyScan.y4 || stdScan.otherDye || stdScan.y4;

    let verdict: string;
    if (!hasAdditiveSource) verdict = 'SOURCE_MISSING';
    else if (anyY5) verdict = 'YELLOW_5_CONFIRMED';
    else if (anyOtherDye) verdict = 'OTHER_DYE_PRESENT';
    else verdict = 'YELLOW_5_NOT_PRESENT';

    return {
      master_id: m.id, name: m.name, manufacturer: m.manufacturer || null,
      item_seq: seq, korea_drug_code: kdcByMid.get(m.id) ?? m.barcode ?? null,
      atc: atcByMid.get(m.id) ?? null, spec: m.spec,
      matched_source_labels: mc.map((c: any) => c.source_label),
      easydrug_present: hasEasy,
      additive_bearing_source_present: hasAdditiveSource,
      yellow5: anyY5, yellow5_snippet: snippet(easyText, DYE_Y5) || snippet(stdText, DYE_Y5),
      other_dye: anyOtherDye,
      existing_spd: (spdByMid.get(m.id) ?? []).map((s: any) => ({ lang: s.lang, status: s.status, has_y5: !!s.has_y5 })),
      source_evidence: hasAdditiveSource ? 'MFDS_EASY_DRUG_INFO' : 'NONE (only barcode/standard-code registry, no additive text)',
      verdict,
    };
  });

  const cnt = (v: string) => results.filter((r) => r.verdict === v).length;
  const y5 = cnt('YELLOW_5_CONFIRMED'), notPresent = cnt('YELLOW_5_NOT_PRESENT');
  const otherDye = cnt('OTHER_DYE_PRESENT'), missing = cnt('SOURCE_MISSING'), conflict = cnt('SOURCE_CONFLICT');
  const sourceSecured = results.filter((r) => r.additive_bearing_source_present).length;

  const out = {
    wo: 'WO-O4O-OTC-BATCH-01B-GLUCOSAMINE-ADDITIVE-SOURCE-VERIFY-AGENT-GA-V1',
    mode: 'read-only', db_write: 0,
    channel: 'Cloud SQL Auth Proxy :5442 → production o4o_platform (SELECT only)',
    target_count: ids.length,
    diagnostics: {
      masters_found: masters.length, with_item_seq: seqByMid.size, distinct_item_seq: allSeqs.length,
      target_item_seqs: allSeqs,
      note: '8 master → 2 distinct itemSeq (코스민/영풍제약=200003542, 오라테오/바이넥스=200000936). 두 itemSeq 전 소스 후보 0(표준코드 레지스트리만 master 매칭).',
    },
    conclusions: {
      '1_source_secured_of_8': sourceSecured,
      '2_yellow5_confirmed': y5,
      '3_yellow5_not_present': notPresent,
      '4_other_dye_present': otherDye,
      '5_source_missing_or_conflict': missing + conflict,
      '6_shared_draft_patchable': y5 === ids.length ? 'YES_ALL' : (y5 > 0 ? 'PARTIAL_SUBGROUP_ONLY' : 'NO'),
      '7_subgroup_split_needed': (y5 > 0 && y5 < ids.length) || otherDye > 0,
      '8_directly_promotable': notPresent,
    },
    verdict_counts: { YELLOW_5_CONFIRMED: y5, YELLOW_5_NOT_PRESENT: notPresent, OTHER_DYE_PRESENT: otherDye, SOURCE_MISSING: missing, SOURCE_CONFLICT: conflict },
    control_group_context: {
      note: '추정 근거 아님 — 같은 성분·함량·제형 grounded 의 황색5호 언급(맥락). ⚠️ 제조사 대조 필수: grounded 제조사와 target 제조사가 다르면 전이 불가.',
      grounded_distinct_products: groundedSeqs.length,
      grounded_yellow5_products: groundedSeqs.filter((g) => g.y5).length,
      grounded_manufacturers: groundedMfrs,
      target_manufacturers: [...new Set(masters.map((m) => m.manufacturer))],
      manufacturer_overlap: groundedMfrs.filter((gm) => masters.some((m) => m.manufacturer === gm)),
      products: groundedSeqs,
    },
    targets: results,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.error(`[out] ${OUT_PATH}`);
  console.log(JSON.stringify({ diagnostics: out.diagnostics, conclusions: out.conclusions, verdict_counts: out.verdict_counts, control: { grounded: out.control_group_context.grounded_distinct_products, grounded_y5: out.control_group_context.grounded_yellow5_products, mfr_overlap: out.control_group_context.manufacturer_overlap } }, null, 2));
  await ds.destroy();
}
main().catch((e) => { console.error('[gluco-additive-verify] FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
