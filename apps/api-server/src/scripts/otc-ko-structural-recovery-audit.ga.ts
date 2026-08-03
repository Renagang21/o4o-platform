/**
 * WO-O4O-OTC-KO-STRUCTURAL-TRUNCATION-RECOVERY-AND-1891-VALID-DOC-RESTORE-V1
 *   — 실행 4·6·7 모집단 독립 재현 + 복구 가능성 실측 (READ-ONLY)
 *
 * 기억된 1,891 을 그대로 적용하지 않는다. LIVE DB 와 공식 e약은요 원문에서 **다시 산출**한다.
 * DB write 0 (`SET default_transaction_read_only = on`).
 *
 * ── 복구 근거는 하나뿐이다 ────────────────────────────────────────────────────
 *   같은 master 의 e약은요 공식 원문에서, 현재 잘린 텍스트가 그 원문 문장의
 *   **구조적 절단(접두)** 임이 증명될 때만 복구 후보로 삼는다.
 *   다른 제품 원문·성분군·ATC·제품명은 근거가 아니다. 없는 문장은 만들지 않는다.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Pool } from 'pg';
import { slots, T, uid, type Slot } from './otc-zh-slots.ga.js';
import { judgeDoc } from './otc-ko-truncation-policy.ga.js';
import { assertSpec } from './otc-ko-truncation-policy.spec.ga.js';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const inc = (m: Record<string, number>, k: string): void => { m[k] = (m[k] || 0) + 1; };
const sha = (s: string): string => crypto.createHash('sha256').update(s).digest('hex');
const alnum = (s: string): string => s.replace(/[^0-9A-Za-z가-힣]/g, '');
const nums = (s: string): string[] => (s.replace(/\s+/g, '').match(/\d+(?:[.,]\d+)*/g) || []);
const PROHIBIT = /(마십시오|마세요|말고|말며|금지|금기|삼가|피하십시오|투여하지|복용하지|사용하지|않습니다)/;

/** 절단 유형 — 잘린 자리의 성격으로 결정한다. */
function cutType(text: string, len: number): string {
  const t = text.trim();
  if (/(…|\.\.\.)$/.test(t)) return 'FIXED_LENGTH_TRUNCATION';
  if (len >= 250 && len <= 262) return 'FIXED_LENGTH_TRUNCATION';
  const open = (t.match(/[(（[]/g) || []).length, close = (t.match(/[)）\]]/g) || []).length;
  if (open > close) return 'PARENTHESIS_MIDCUT';
  if (/[,，、]$/.test(t)) return 'ENUMERATION_MIDCUT';
  if (/(이나|거나|또는|및|하거나|경우|때|시|면)$/.test(t)) return 'CONDITION_CLAUSE_MIDCUT';
  if (/(습니|합니|됩니|입니|있습|없습|않습|십시|하십|하세|마세|하지 마|지 마)$/.test(t)) return 'WORD_MIDCUT';
  if (/[가-힣]$/.test(t)) return 'SENTENCE_MIDCUT';
  return 'STRUCTURE_EXTRACTION_TRUNCATION';
}

/**
 * 공식 원문의 **섹션 라벨** — 확장이 이 경계를 넘으면 다른 항목의 문장이 섞여 들어온다.
 * 실측 사고: 이상반응 절단본에 `저장방법 습기와 빛을 피해…` 가, 용법 절단본에
 * `사용상 주의사항 이 약 또는 소고기…` 가 붙었다. 섹션을 넘는 확장은 금지한다.
 */
const SECTION_LABEL = /(효능[·ㆍ・]?\s*효과|용법[·ㆍ・]?\s*용량|사용상\s*주의사항|주의사항|상호작용|이상반응|저장방법|보관방법|성상|첨가제)/;

/** 공식 원문 HTML 을 섹션별 평문으로 분해한다. 라벨은 본문에서 제외한다. */
function officialSections(html: string): string[] {
  const out: string[] = [];
  const re = /<strong>\s*([^<]+?)\s*<\/strong>([\s\S]*?)(?=<strong>|$)/g;
  let m: RegExpExecArray | null, any = false;
  while ((m = re.exec(html))) { any = true; const body = T(m[2]); if (body) out.push(body); }
  if (!any) { const t = T(html); if (t) out.push(t); }
  return out;
}

/**
 * 공식 원문에서 이 잘린 텍스트의 완결본을 찾는다.
 * **섹션 안에서만** 찾고, **그 섹션의 문장 경계까지만** 확장한다.
 * 원문에 없는 문장은 만들지 않으며, 확장분에 섹션 라벨이 섞이면 후보로 삼지 않는다.
 */
function findInOfficial(cut: string, sections: string[]): { full: string; section: number } | null {
  const a = alnum(cut);
  if (a.length < 25) return null;
  for (let si = 0; si < sections.length; si++) {
    const official = sections[si];
    const map: number[] = []; let flat = '';
    for (let i = 0; i < official.length; i++)
      if (/[0-9A-Za-z가-힣]/.test(official[i])) { flat += official[i]; map.push(i); }
    const at = flat.indexOf(a);
    if (at < 0) continue;
    const endFlat = at + a.length;
    if (endFlat >= map.length) continue;                        // 이 섹션도 여기서 끝 → 확장분 없음
    const tail = official.slice(map[endFlat - 1] + 1);
    const stop = tail.search(/[.!?。]/);
    if (stop < 0) continue;                                      // 섹션 안에 문장 경계 없음 → 포기
    const ext = tail.slice(0, stop + 1);
    if (SECTION_LABEL.test(ext)) continue;                       // 라벨이 섞였다 → 다른 항목 침범
    const full = official.slice(map[at], map[endFlat - 1] + 1 + stop + 1).trim();
    return { full, section: si };
  }
  return null;
}

async function main(): Promise<void> {
  assertSpec();
  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5722', 10), database: 'o4o_platform',
    max: 4, statement_timeout: 1800000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  await pool.query('SET default_transaction_read_only = on');

  const docs = (await pool.query(`
    SELECT d.id::text ko_id, d.master_id::text mid, d.source_type, d.source_ref_id::text ref, d.content,
           pm.name, pm.regulatory_type reg, pm.drug_category cat, pm.status pm_status
      FROM shared_product_descriptions d JOIN product_masters pm ON pm.id=d.master_id
     WHERE d.description_type='STORE' AND d.status='canonical' AND COALESCE(d.language,'ko')='ko'
       AND d.deleted_at IS NULL AND d.source_type IN
       ('mfds_drug_otc','mfds_drug_otc_nutrition_combo','o4o_drug_otc_topical','mfds_easy_drug','manual')`)).rows;

  const mids = [...new Set(docs.map((d: any) => d.mid))];
  const raw = new Map<string, { id: string; content: string }>();
  for (let i = 0; i < mids.length; i += 500)
    for (const r of (await pool.query(`SELECT id::text id, master_id::text mid, content
       FROM shared_product_descriptions WHERE master_id = ANY($1::uuid[]) AND source_type='mfds_easy_drug'
         AND description_type='STORE' AND deleted_at IS NULL`, [mids.slice(i, i + 500)])).rows)
      if (!raw.has(r.mid)) raw.set(r.mid, { id: r.id, content: r.content || '' });
  await pool.end();

  /* 선행 판정 원장 — 내용 유효성·계보 */
  const validity = new Map<string, any>(
    JSON.parse(fs.readFileSync(P('otc-ko-validity-classification.ga.json'), 'utf8')).docs.map((d: any) => [d.koId, d]));
  const lineage = new Map<string, any>(
    JSON.parse(fs.readFileSync(P('otc-ko-lineage-classification.ga.json'), 'utf8')).docs.map((d: any) => [d.koId, d]));
  const nc = new Map<string, string>(
    JSON.parse(fs.readFileSync(P('otc-ko-nutrition-combo-audit.ga.json'), 'utf8')).docs.map((d: any) => [d.koId, d.state]));

  /* ── 6분류 (상호배타) + 복구 후보 산출 ────────────────────────────────── */
  const cls: Record<string, number> = {}, cutTypes: Record<string, number> = {}, blockReason: Record<string, number> = {};
  const targets: any[] = [], blocked: any[] = [];
  let structOk = 0;

  for (const d of docs) {
    const html = String(d.content || '');
    const sl: Slot[] = slots(html);
    const vs = judgeDoc(html, sl);
    const cutIdx = vs.map((v, i) => (v.blocked ? i : -1)).filter((i) => i >= 0);
    const v = validity.get(d.ko_id), lg = lineage.get(d.ko_id);
    const contentValid = v && (v.cls === 'KO_DIRECT_VALID' || v.cls === 'KO_EXPANDED_VALID');
    const ncState = nc.get(d.ko_id);

    /* 1) 구조 정상 */
    if (!cutIdx.length) {
      structOk++;
      inc(cls, contentValid ? 'KO_CONTENT_VALID_AND_STRUCTURE_READY'
        : v?.cls === 'KO_INVALID' ? 'KO_CONTENT_INVALID' : 'KO_CONTENT_HOLD');
      continue;
    }
    /* 2) 구조 절단 — 내용 판정에 따라 분기 */
    if (!v) { inc(cls, 'KO_SOURCE_UNRESOLVED'); continue; }
    if (v.cls === 'KO_INVALID') { inc(cls, 'KO_CONTENT_INVALID'); continue; }
    if (!contentValid) { inc(cls, 'KO_CONTENT_HOLD'); continue; }

    inc(cls, 'KO_CONTENT_VALID_BUT_TRUNCATED');

    /* ── 복구 조건 게이트 ───────────────────────────────────────────────── */
    const reasons: string[] = [];
    if (!(d.reg === 'DRUG' && d.cat === 'otc' && d.pm_status === 'ACTIVE')) reasons.push('EXCLUDE');
    if (ncState && ncState !== 'DIRECT') reasons.push(`NUTRITION_COMBO_${ncState}`);
    if (lg?.lineage !== 'DIRECT_RAW_ON_MASTER') reasons.push('LINEAGE_NOT_DIRECT');
    const rw = raw.get(d.mid);
    if (!rw || !rw.content.trim()) reasons.push('OFFICIAL_SOURCE_NOT_FOUND');

    if (reasons.length) {
      for (const r of reasons) inc(blockReason, r);
      blocked.push({ koId: d.ko_id, mid: d.mid, sourceType: d.source_type, blockReason: reasons });
      continue;
    }

    const officialSecs = officialSections(rw!.content);
    const fixes: any[] = [];
    for (const i of cutIdx) {
      const s = sl[i];
      const ct = cutType(s.text, s.text.length);
      inc(cutTypes, ct);
      const hit = findInOfficial(s.text, officialSecs);
      if (!hit) { fixes.push({ slot: i, kind: s.kind, cutType: ct, ok: false, why: 'NOT_FOUND_IN_OFFICIAL' }); continue; }
      /* 안전 게이트 — 수치 보존 · 금기 강도 · 확장분 완결성 · 구조 유일성 */
      const numOk = nums(s.text).every((x) => nums(hit.full).includes(x));
      const prohOk = !PROHIBIT.test(s.text) || PROHIBIT.test(hit.full);
      const complete = /[.!?。]$/.test(hit.full.trim());
      const longer = alnum(hit.full).length > alnum(s.text).length;
      const unique = sl.filter((x) => x.text === s.text).length === 1;
      const ok = numOk && prohOk && complete && longer && unique;
      fixes.push({ slot: i, kind: s.kind, cutType: ct, ok,
        why: ok ? null : !numOk ? 'NUMERIC_CONFLICT' : !prohOk ? 'NEGATION_CONFLICT'
          : !complete ? 'OFFICIAL_TAIL_INCOMPLETE' : !longer ? 'NOT_EXTENDED' : 'STRUCTURE_MARKER_NOT_UNIQUE',
        unitId: uid(s.kind, s.text), before: s.text, after: ok ? hit.full : null });
    }
    const good = fixes.filter((f) => f.ok);
    if (!good.length) {
      const why = fixes[0]?.why || 'NOT_FOUND_IN_OFFICIAL';
      inc(blockReason, why);
      blocked.push({ koId: d.ko_id, mid: d.mid, sourceType: d.source_type, blockReason: [why],
        cutTypes: fixes.map((f) => f.cutType) });
      continue;
    }
    targets.push({ koId: d.ko_id, mid: d.mid, name: d.name, sourceType: d.source_type, sourceRef: d.ref,
      officialId: rw!.id, officialSourceHash: sha(rw!.content), beforeContentHash: sha(html),
      contentValidity: v.cls, lineage: lg.lineage,
      fixes: good.map((f) => ({ slot: f.slot, kind: f.kind, cutType: f.cutType, unitId: f.unitId,
        before: f.before, after: f.after })),
      partial: good.length !== fixes.length,
      unresolved: fixes.filter((f) => !f.ok).map((f) => ({ slot: f.slot, why: f.why, cutType: f.cutType })) });
  }

  const summary = {
    mode: 'READ-ONLY / DB write 0',
    startHead: process.env.GIT_HEAD || null,
    koCanonicalDocs: docs.length,
    structureReadyDocs: structOk,
    classification: cls,
    classificationTotal: Object.values(cls).reduce((a, b) => a + b, 0),
    balanced: Object.values(cls).reduce((a, b) => a + b, 0) === docs.length,
    recoveryTargets: targets.length,
    recoveryTargetMasters: new Set(targets.map((t) => t.mid)).size,
    recoveryFixes: targets.reduce((a, t) => a + t.fixes.length, 0),
    partialTargets: targets.filter((t) => t.partial).length,
    blockedDocs: blocked.length,
    blockReason, cutTypes,
  };
  fs.writeFileSync(P('otc-ko-structural-recovery-plan.ga.json'),
    JSON.stringify({ summary, targets, blocked: blocked.slice(0, 3000) }, null, 1), 'utf8');
  console.log(JSON.stringify(summary, null, 1));
}
main().catch((e) => { console.error(e); process.exit(1); });
