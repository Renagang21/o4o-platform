/**
 * WO-O4O-OTC-CANONICAL-APPLY-PILOT-B01AC06-V1 — §1~4 read-only dry-run
 *
 * 아스피린 100mg 장용정(ATC B01AC06) 무성분명·경구·단일 후보 60제품을 apply 직전 재고정·재검증한다.
 *   ⚠️ fingerprint 2종(1c2e3823:52 / 6e203005:8)을 분리 검증. authored 대표(0052dc6c…)와 원문·안전 완전 일치
 *   fingerprint 만 첫 write 대상으로 확정하고, 부정합 fingerprint 는 사유와 함께 자동 제외한다.
 *
 * ⚠️ read-only · DB write 0 · production write 없음. 승인용 dry-run 수치(INSERT/flip 예상)만 산출.
 * 규칙: derive/normalize/*Sig/fingerprint/9요소 안전지문 = 재계산 스크립트(92c265035)와 동일 로직 계승.
 *
 * 산출: otc-apply-pilot-b01ac06-target-frozen-v1.json / otc-apply-pilot-b01ac06-dryrun-v1.json
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);

const ATC = 'B01AC06';
const AUTHORED_REF = '0052dc6c-639a-400b-b7a3-144d84ae5c14';
const EXPECT: Record<string, number> = { '1c2e38232d471a9e': 52, '6e2030058d0db10e': 8 };

function sections(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim();
  return out;
}
const stripTags = (s: string): string => s.replace(/<[^>]+>/g, ' ');
function normalize(s: string): string {
  return stripTags(s).normalize('NFKC')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/[·・∙•▪▶►\-–—]/g, ',').replace(/^\s*\d+\)\s*/gm, '')
    .replace(/[，、]/g, ',').replace(/[．。]/g, '.').replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',').trim();
}
function numericSig(s: string): string { const t = normalize(s); const n = (t.match(/[0-9][0-9,.]*\s*(mg|밀리그램|㎎|㎍|마이크로그램|g|정|캡슐|회|시간|일|주|개월|mL|㎖|IU|iu|%)/gi) || []).map((x) => x.replace(/\s+/g, '').toLowerCase()).sort(); return H([...new Set(n)].join('|')); }
function ageSig(s: string): string { const t = normalize(s); const a = (t.match(/(만\s?)?\d+\s*세\s*(이상|이하|미만|초과)?|성인|소아|어린이|영아|유아|고령자|노인/g) || []).map((x) => x.replace(/\s+/g, '')).sort(); return H([...new Set(a)].join('|')); }
function durationSig(s: string): string { const t = normalize(s); const d = (t.match(/\d+\s*(주|일|개월|회)\s*(이상|이내|정도|간)?/g) || []).map((x) => x.replace(/\s+/g, '')).sort(); return H([...new Set(d)].join('|')); }
function maxDoseSig(s: string): string { const t = normalize(s); const mx = (t.match(/(1일\s?최대|하루\s?최대|최대)[^,.]{0,20}(\d+[0-9,.]*\s*(mg|밀리그램|정|캡슐|회|㎖|mL))/gi) || []).map((x) => x.replace(/\s+/g, '').toLowerCase()).sort(); return H([...new Set(mx)].join('|')); }
function contraSig(c: string): string { const t = normalize(c); const m = t.match(/(.*?)(복용하지\s?(마|않)|투여하지\s?(마|말)|복용해서는\s?안)/); return H(normalize(m ? m[1] : t.slice(0, 200))); }
function pregnancySig(c: string): string { const t = normalize(c); if (!/임부|임신|수유부/.test(t)) return 'none'; return /임부[^.]{0,20}(복용하지|투여하지|마)|임신[^.]{0,20}(복용하지|마)/.test(t) ? 'ban' : 'consult'; }
function additiveSig(c: string): string { const t = normalize(c); const a: string[] = []; if (/아스파탐|페닐케톤/.test(t)) a.push('aspartame'); if (/대두유|대두레시틴/.test(t)) a.push('soybean'); if (/유당|갈락토/.test(t)) a.push('lactose'); if (/황색\s?\d\s?호|타르색소|타르트라진|선셋옐로우/.test(t)) a.push('dye'); return a.sort().join('+') || 'none'; }
function routeSig(name: string): string {
  if (/질정|질좌|질내정|질\s?삽입/.test(name)) return 'vaginal';
  if (/좌약|좌제/.test(name)) return 'rectal';
  if (/점안|안연고/.test(name)) return 'ophthalmic';
  if (/점이액|귀에/.test(name)) return 'otic';
  if (/점비|비강/.test(name)) return 'nasal';
  if (/크림|연고|로션|로숀|겔$|겔\(|겔제|젤$|젤\(|플라스타|플라스터|첩부|카타플|패취|패치|파스|파프|스왑|스틱|거즈|탈지면|솜|네일라카|라카|외용|도포|스프레이|에어로솔|에어졸|소독|폼$|폼\(|워시|카타플라스마/.test(name)) return 'topical';
  if (/정$|정\d|정\(|정밀리|정\[|캡슐|캅셀|캅셀|시럽|현탁|과립|산제|산\(|트로키|츄어|씹|저작|드링크|내복|환$|환\(|액$|액\(|액\[|물약|시럽제/.test(name)) return 'oral';
  return 'unknown';
}
function derive(name: string, spec: string) {
  const ingredient = (name.match(/\(([^()]+)\)\s*$/)?.[1] || '').trim();
  const strength = (spec || '').split(' / ')[0].trim();
  const form = /연질캡슐/.test(name) ? '연질캡슐' : /캡슐/.test(name) ? '캡슐' : /연고/.test(name) ? '연고' : /크림/.test(name) ? '크림' : /플라스타|첩부|패치|패취|카타플/.test(name) ? '첩부제' : /점안/.test(name) ? '점안액' : /시럽/.test(name) ? '시럽' : /과립|산\(/.test(name) ? '과립/산' : /정/.test(name) ? '정' : /액/.test(name) ? '액' : '기타';
  const multiIngredient = /[·,]/.test(ingredient) || (name.match(/[·]/g) || []).length >= 2;
  const route = routeSig(name);
  return { ingredient, strength, form, route, multiIngredient, nonOral: route !== 'oral' };
}
function safety9(dos: string, cau: string, interaction: string, multi: boolean): string {
  return [numericSig(dos), ageSig(dos + ' ' + cau), durationSig(dos + ' ' + cau), maxDoseSig(dos), contraSig(cau), pregnancySig(cau), H(normalize(interaction)), additiveSig(cau), multi ? 'multi' : 'single'].join(':');
}
function fingerprintOf(content: string, d: { ingredient: string; strength: string; form: string; route: string }): { fp: string; safety: string } {
  const sec = sections(content);
  const ind = sec['효능·효과'] || '', dos = sec['용법·용량'] || '';
  const cau = [sec['경고'], sec['사용상 주의사항'], sec['상호작용']].filter(Boolean).join('\n');
  const interaction = sec['상호작용'] || '';
  const fp = H([H(normalize(ind)), H(normalize(dos)), H(normalize(cau)), H(`${d.ingredient}|${d.strength}`), H(d.form), d.route].join('|'));
  return { fp, safety: safety9(dos, cau, interaction, d.multiIngredient) };
}

type Row = { master_id: string; item_seq: string; name: string; spec: string; content: string; atc_code: string | null; ko_canon: number; en_canon: number; ko_review: number; en_review: number };

async function enumerate(ds: any): Promise<Row[]> {
  // grounded OTC 中 atc=B01AC06 전량(재열거). derive/필터/지문은 JS 에서.
  const rows: Row[] = await ds.query(`
    WITH pop AS (
      SELECT DISTINCT pm.id::text master_id, pi.normalized_value item_seq, pm.name, pm.specification spec
      FROM product_masters pm
      JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL AND e.atc_code=$1
      JOIN product_identifiers pi ON pi.product_master_id=pm.id AND pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL
      WHERE pm.regulatory_type='DRUG'
    )
    SELECT pop.*, es.content, $1 atc_code,
      (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=pop.master_id::uuid AND s.status='canonical' AND s.description_type='STORE' AND s.deleted_at IS NULL AND s.language='ko' AND s.source_type IN ('mfds_drug_otc','nutrition_combo')) ko_canon,
      (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=pop.master_id::uuid AND s.status='canonical' AND s.description_type='STORE' AND s.deleted_at IS NULL AND s.language='en' AND s.source_type IN ('mfds_drug_otc','nutrition_combo')) en_canon,
      (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=pop.master_id::uuid AND s.status='needs_review' AND s.description_type='STORE' AND s.deleted_at IS NULL AND s.language='ko' AND s.source_type IN ('mfds_drug_otc','nutrition_combo')) ko_review,
      (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=pop.master_id::uuid AND s.status='needs_review' AND s.description_type='STORE' AND s.deleted_at IS NULL AND s.language='en' AND s.source_type IN ('mfds_drug_otc','nutrition_combo')) en_review
    FROM pop
    JOIN LATERAL (SELECT content FROM shared_product_descriptions s WHERE s.master_id=pop.master_id::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL ORDER BY length(s.content) DESC LIMIT 1) es ON true
    ORDER BY pop.master_id
  `, [ATC]);
  rows.sort((a, b) => a.master_id.localeCompare(b.master_id));
  return rows;
}

async function main(): Promise<void> {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5432', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'] });
  await ds.initialize();

  // === §1 대상 재열거 (2회 — 결정론 확인) ===
  const run1 = await enumerate(ds);
  const run2 = await enumerate(ds);

  // 무성분명·경구·단일·100밀리그램·정 필터 + 지문
  const buildTargets = (rows: Row[]) => rows.map((r) => {
    const d = derive(r.name, r.spec);
    const { fp, safety } = fingerprintOf(r.content, d);
    return { ...r, ...d, fp, safety };
  }).filter((t) => !t.nonOral && !t.multiIngredient && !t.ingredient && t.strength === '100밀리그램' && t.form === '정' && t.route === 'oral');
  const t1 = buildTargets(run1), t2 = buildTargets(run2);

  // === grounded-named 기준(atc-key) — 원문 지문(fp) + 안전 지문, e약은요 보유 실 레퍼런스 ===
  const namedSafety = new Set<string>();
  const namedFps = new Set<string>();
  const namedDetail: Array<{ name: string; fp: string; safety: string }> = [];
  for (const r of run1) {
    const d = derive(r.name, r.spec);
    if (d.nonOral || d.multiIngredient || !d.ingredient || d.strength !== '100밀리그램' || d.form !== '정' || d.route !== 'oral') continue;
    const { fp, safety } = fingerprintOf(r.content, d);
    namedSafety.add(safety); namedFps.add(fp);
    namedDetail.push({ name: r.name, fp, safety });
  }
  // authored 대표(source_ref_id) → master → e약은요 원문 지문(있으면)
  const authoredRep: Array<{ master_id: string; name: string; spec: string; hasEasy: boolean; fp: string | null; safety: string | null }> = [];
  const repRows: Array<{ mid: string; name: string; spec: string; content: string | null }> = await ds.query(`
    SELECT s.master_id::text mid, pm.name, pm.specification spec,
      (SELECT es.content FROM shared_product_descriptions es WHERE es.master_id=s.master_id AND es.source_type='mfds_easy_drug' AND es.description_type='STORE' AND es.status='canonical' AND es.deleted_at IS NULL ORDER BY length(es.content) DESC LIMIT 1) content
    FROM shared_product_descriptions s JOIN product_masters pm ON pm.id=s.master_id
    WHERE s.source_ref_id=$1 AND s.description_type='STORE' AND s.deleted_at IS NULL
    GROUP BY s.master_id, pm.name, pm.specification, s.master_id
  `, [AUTHORED_REF]);
  for (const rr of repRows) {
    const d = derive(rr.name, rr.spec);
    const sig = rr.content ? fingerprintOf(rr.content, d) : null;
    authoredRep.push({ master_id: rr.mid, name: rr.name, spec: rr.spec, hasEasy: !!rr.content, fp: sig?.fp ?? null, safety: sig?.safety ?? null });
  }
  const repFps = new Set(authoredRep.map((a) => a.fp).filter(Boolean) as string[]);
  const repSafeties = new Set(authoredRep.map((a) => a.safety).filter(Boolean) as string[]);

  // === §2~3 fingerprint 별 분리 검증 + 판정 ===
  const byFp = new Map<string, typeof t1>();
  for (const t of t1) (byFp.get(t.fp) ?? byFp.set(t.fp, []).get(t.fp)!).push(t);
  const fpReport = [...byFp.entries()].map(([fp, members]) => {
    const safeties = new Set(members.map((m) => m.safety));
    const safetyMatchesNamed = [...safeties].every((s) => namedSafety.has(s));
    const 원문일치_named = namedFps.has(fp);                                  // grounded-named(원문보유) 과 fingerprint 동일?
    const 원문일치_authoredRep = repFps.size > 0 ? repFps.has(fp) : null;   // authored 대표 e약은요 지문과 동일?(대표 e약은요 부재 시 null)
    const 안전일치_authoredRep = repSafeties.size > 0 ? [...safeties].every((s) => repSafeties.has(s)) : null;
    const expected = EXPECT[fp] ?? null;
    const 결정론 = new Set(t2.filter((x) => x.fp === fp).map((x) => x.master_id)).size === members.length
      && members.every((m) => t2.some((x) => x.master_id === m.master_id && x.fp === fp));
    // 포함 판정. authored 대표는 e약은요 원문 부재(hasEasy=false) → 대표 자체론 원문 대조 불가.
    //   실 레퍼런스 = grounded-named 아스피린(원문 보유). '완전 일치' = 원문(fingerprint) + 안전 모두 named 와 동일.
    let include: boolean; let reason: string;
    if (repFps.size > 0) {
      include = !!원문일치_authoredRep && !!안전일치_authoredRep;
      reason = include ? 'authored 대표 원문·안전 완전 일치' : (!원문일치_authoredRep ? 'authored 대표와 원문(fingerprint) 부정합 → 제외' : 'authored 대표와 안전지문 부정합 → 제외');
    } else {
      // authored 대표 원문 부재 → grounded-named 원문+안전 완전 일치 여부로 판정.
      include = 원문일치_named && safetyMatchesNamed;
      reason = include ? 'grounded-named 아스피린과 원문(fingerprint)·안전 완전 일치 (authored 대표는 e약은요 부재라 대조 불가)'
        : (!safetyMatchesNamed ? 'grounded-named 안전지문 불일치 → 제외' : 'grounded-named 과 안전은 일치하나 원문(fingerprint) 부정합 → 별도 검토(제외)');
    }
    const existingKoCanon = members.filter((m) => m.ko_canon > 0).length;
    const existingEnCanon = members.filter((m) => m.en_canon > 0).length;
    const existingKoReview = members.filter((m) => m.ko_review > 0).length;
    const existingEnReview = members.filter((m) => m.en_review > 0).length;
    return {
      fingerprint: fp, masters: members.length, expected, expectedMatch: expected === members.length,
      distinctSafetySigs: safeties.size, safetyMatchesNamed, 원문일치_named, 원문일치_authoredRep, 안전일치_authoredRep,
      determinismStable: 결정론, include, reason,
      existingKoCanon, existingEnCanon, existingKoReview, existingEnReview,
      sampleNames: [...new Set(members.map((m) => m.name))].slice(0, 4),
      masterIds: members.map((m) => m.master_id).sort(),
    };
  }).sort((a, b) => b.masters - a.masters);

  // === §4 dry-run 집계 (포함 fingerprint 만 write 대상) ===
  const included = fpReport.filter((f) => f.include);
  const excluded = fpReport.filter((f) => !f.include);
  // 해석 2안 병기: Model A(대표/named 원문 완전 일치 재사용) vs Model B(각 대상 자체 e약은요 원문 grounding, 안전=임상일관 확인).
  const modelB_safetyMatched = fpReport.filter((f) => f.safetyMatchesNamed);
  const modelB = {
    설명: 'Model B = 각 대상의 자체 e약은요 원문으로 authoring(대표 content 복사 아님). 안전지문 named 일치는 임상 일관성 확인용. 원문은 대상별 자기 grounding.',
    포함_fingerprint: modelB_safetyMatched.map((f) => f.fingerprint),
    포함_master수: modelB_safetyMatched.reduce((a, f) => a + f.masters, 0),
    제외_안전불일치: fpReport.filter((f) => !f.safetyMatchesNamed).map((f) => ({ fingerprint: f.fingerprint, masters: f.masters })),
  };
  const includeMasterIds = included.flatMap((f) => f.masterIds).sort();
  const koInsert = included.reduce((a, f) => a + (f.masters - f.existingKoCanon - f.existingKoReview), 0);
  const enInsert = included.reduce((a, f) => a + (f.masters - f.existingEnCanon - f.existingEnReview), 0);
  const koFlip = koInsert, enFlip = enInsert;

  // 전체 대상 재열거 결정론(master ID 집합 동일)
  const setEqual = t1.length === t2.length && t1.map((x) => x.master_id).sort().join(',') === t2.map((x) => x.master_id).sort().join(',');

  const frozen = {
    wo: 'WO-O4O-OTC-CANONICAL-APPLY-PILOT-B01AC06-V1', stage: '§1~4 dry-run', dbWrite: 0, readOnly: true,
    atc: ATC, authoredRef: AUTHORED_REF,
    authoredRep, authoredRepHasEasy: authoredRep.some((a) => a.hasEasy), authoredRepMasters: authoredRep.length,
    namedReference: { distinctFps: [...namedFps], distinctSafeties: [...namedSafety], samples: namedDetail.slice(0, 6) },
    totalCandidates: t1.length,
    fpReport,
    frozen_include_masterIds: includeMasterIds,
  };
  const dryrun = {
    wo: frozen.wo, dbWrite: 0,
    'warn_authored대표_e약은요_부재': !authoredRep.some((a) => a.hasEasy),
    'warn_note': 'authored 대표(0052dc6c)는 e약은요 원문 미보유(authored-only 명명 아스피린 doc). 대표 자체와의 원문 대조 불가 → 판정은 grounded-named 아스피린(원문 보유) 원문+안전 완전 일치 기준. 각 대상은 자체 e약은요 원문 보유 → 자기 원문 grounding 으로 authoring 가능(대표 content 복사 아님).',
    reenumerationDeterministic: setEqual,
    expectedSplit: EXPECT,
    modelA_설명: 'Model A = 대표/named 원문(fingerprint)+안전 완전 일치분만 재사용. authored 대표 원문 부재 + 무성분명 aspirin 원문이 named aspirin 원문과 불일치 → 완전일치 0.',
    modelA_최종포함_master수: includeMasterIds.length,
    modelB,
    최종포함_fingerprint: included.map((f) => f.fingerprint),
    최종포함_master수: includeMasterIds.length,
    제외: excluded.map((f) => ({ fingerprint: f.fingerprint, masters: f.masters, reason: f.reason })),
    예상: { ko_needs_review_INSERT: koInsert, en_needs_review_INSERT: enInsert, en_canonical_flip: enFlip, ko_canonical_flip: koFlip },
    기존_canonical_변경: 0,
    dryRun_DB_write: 0,
    rollback_master_ids: includeMasterIds,
    재실행_동일: setEqual && fpReport.every((f) => f.determinismStable),
    stopConditions: {
      split_52_8_reproduced: fpReport.filter((f) => f.expectedMatch).length === Object.keys(EXPECT).length,
      authored_mismatch: excluded.length > 0,
      existing_canonical_conflict: fpReport.some((f) => f.existingKoCanon > 0 || f.existingEnCanon > 0),
      target_count_unstable: !setEqual,
    },
  };

  fs.writeFileSync(path.join(OUT_DIR, 'otc-apply-pilot-b01ac06-target-frozen-v1.json'), JSON.stringify(frozen, null, 2), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'otc-apply-pilot-b01ac06-dryrun-v1.json'), JSON.stringify(dryrun, null, 2), 'utf8');
  console.log(JSON.stringify({ authoredRep: authoredRep.map((a) => ({ name: a.name, hasEasy: a.hasEasy, fp: a.fp })), dryrun }, null, 2));
  await ds.destroy();
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
