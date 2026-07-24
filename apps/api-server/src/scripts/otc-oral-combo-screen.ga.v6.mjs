// READ-ONLY screening (GA-V6-2) — otc-oral-combo-screen.ga.mjs 의 this-machine 경로 사본 + WO 요구 4분류 판정.
// 원본 대비 변경: (1) 경로/포트 상수 파라미터화 (2) READY/SPLIT_REQUIRED/HOLD/EXCLUDE verdict 산출.
// 분류 신호는 전부 공식 원문·DB 실측(ATC 공식코드 / easy 원문 섹션)이며 신규 의료 사실 생성 0. DB write 0.
//
// [조성 판별 근거 — 2026-07-24 실측]
//  product_drug_extensions.active_ingredients / ingredient_summary 는 전체 177,413 master 중 **채워진 행 0**.
//  easy_drug 원문도 효능·용법·주의만 담고 성분을 열거하지 않음. → DB 내 유일한 공식 조성 신호 = ATC.
//  WHO ATC 규약: 7자리 완전코드의 5단계 숫자가 50 이상이면 복합제(combination), 50 미만이면 단일성분.
//  ATC 절단코드(3~5자리)는 조성 판별 불가이나 **단일성분이라는 근거도 아니다**.
//  실제 batch12(승인 파일럿, 95 master LIVE)는 A09A·A02AH·A09AA·A09AC·A05A 로 **전량 절단 ATC**였다.
//  ⇒ ATC 는 **적극적 배제 신호로만** 사용한다: 7자리 & <50 인 경우에만 단일성분 확정 EXCLUDE.
//    스코프 게이트 자체는 batch1~12 에서 검증된 pool-regen 필터를 그대로 유지한다(WO: 계약 무변경 재사용).
import { readFileSync, writeFileSync } from 'node:fs';
const ENV = process.env.ENV_PATH || 'C:/Users/home/coding/o4o-platform/apps/api-server/.env';
const POOL = process.env.POOL_IN;
const OUT = process.env.SCREEN_OUT;
if (!POOL || !OUT) throw new Error('POOL_IN / SCREEN_OUT env 필요');
const pw = readFileSync(ENV, 'utf8').match(/^DB_PASSWORD=(.*)$/m)[1].trim();
// 원본 RESERVED 유지(민감 계열 선점 제외)
const RESERVED = new Set(['A06AB52', 'A06AC51', 'M03BB53', 'M09AB52', 'A02BA53', 'M01AE51']);
// 4단계 자체가 단일 물질로 정의된 ATC 군(5단계 30/50번대만 복합). 절단코드로는 복합 여부 판별 불가 → HOLD.
const SINGLE_SUBSTANCE_ATC4 = new Set(['A03AD']); // Papaverine and derivatives
const OFF = parseInt(process.env.OFF || '0', 10), N = parseInt(process.env.N || '60', 10);
const pool = JSON.parse(readFileSync(POOL, 'utf8'));
const cand = pool.candidates.slice(OFF, OFF + N);
const { DataSource } = await import('typeorm');
const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: parseInt(process.env.AUDIT_DB_PORT || '5442', 10), username: 'o4o_api', password: pw, database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 180000 } });
await ds.initialize();
const rows = [];
try {
  for (const c of cand) {
    const src = await ds.query(`SELECT content FROM shared_product_descriptions s WHERE s.master_id=$1::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL ORDER BY length(s.content) DESC LIMIT 1`, [c.target_ids[0]]);
    const auth = await ds.query(`SELECT count(*)::int n FROM shared_product_descriptions s WHERE s.master_id=ANY($1::uuid[]) AND s.description_type='STORE' AND s.deleted_at IS NULL AND s.source_type<>'mfds_easy_drug'`, [c.target_ids]);
    // ATC: 그룹 전 구성원 실측(단일성분 확정 배제 + 그룹내 조성 단일성 확인)
    const ext = await ds.query(`SELECT DISTINCT COALESCE(atc_code,'') atc
      FROM product_drug_extensions WHERE product_master_id=ANY($1::uuid[]) AND deleted_at IS NULL`, [c.target_ids]);
    const atcs = [...new Set(ext.map(r => (r.atc || '').trim()).filter(Boolean))].sort();
    // WHO ATC 5단계: 7자리 완전코드의 마지막 두 자리 ≥50 = 복합제, <50 = 단일성분, 절단코드 = 판별불가
    const atcKind = a => {
      const m = /^[A-Z]\d{2}[A-Z]{2}(\d{2})$/.exec(a);
      if (!m) return 'TRUNC';
      return parseInt(m[1], 10) >= 50 ? 'COMBO' : 'SINGLE';
    };
    const kinds = [...new Set(atcs.map(atcKind))];
    // 단일성분 확정 = 그룹 내 7자리 ATC 가 존재하고 그 전부가 <50
    const confirmedSingle = atcs.length > 0 && kinds.length === 1 && kinds[0] === 'SINGLE';
    const confirmedCombo = kinds.includes('COMBO');
    // 명칭 기반 단일성분 표기 관행 검사 — pool 필터는 sample 1건만 봤으므로 그룹 전 구성원을 재확인한다.
    //  (1) 제품명 괄호 안 성분 표기: `바르젠정(클로닉신리시네이트)` → 성분명 명시 = 단일성분 제품
    //  (2) 제품명 말미 함량 표기: `오스틴엘시스틴연질캡슐500밀리그램` → 성분+함량 표기 = 단일성분 관행
    const nm = await ds.query(`SELECT name FROM product_masters WHERE id=ANY($1::uuid[])`, [c.target_ids]);
    const names = nm.map(r => r.name || '');
    const namedIngredient = names.filter(n => /\([^()]*\)/.test(n));
    const namedStrength = names.filter(n => /\d+\s*(밀리그램|마이크로그램|그램|mg|mcg|g)\s*$/i.test(n));
    const html = src[0]?.content || '';
    const has = re => re.test(html);
    const cold = /감기|비염|코감기|콧물|재채기/.test(html);
    const reserved = RESERVED.has(c.atc);
    const hasEff = has(/효능|효과/), hasUse = has(/용법|용량/), hasCau = has(/주의|경고|금기/);
    const grounded = hasEff && hasUse && hasCau && html.length >= 500;
    // verdict — 우선순위: 타 write 존재 > 단일성분 확정(스코프 밖) > 예약/감기 > grounding 부재 > 조성 불일치 > READY
    let verdict, reason;
    if (auth[0].n > 0) { verdict = 'EXCLUDE'; reason = 'authored SPD 존재(타 트랙 선점)'; }
    else if (confirmedSingle) { verdict = 'EXCLUDE'; reason = `단일성분 확정(ATC ${atcs.join('/')} 5단계<50) — 경구 복합성분 WO 스코프 밖`; }
    else if (!confirmedCombo && namedIngredient.length) { verdict = 'EXCLUDE'; reason = `제품명 성분 괄호표기(단일성분 관행): ${namedIngredient[0].slice(0, 40)}`; }
    else if (!confirmedCombo && namedStrength.length) { verdict = 'EXCLUDE'; reason = `제품명 성분+함량 표기(단일성분 관행): ${namedStrength[0].slice(0, 40)}`; }
    else if (reserved || atcs.some(a => RESERVED.has(a))) { verdict = 'EXCLUDE'; reason = `예약 계열 ATC ${atcs.filter(a => RESERVED.has(a)).join('/') || c.atc}`; }
    else if (!confirmedCombo && atcs.some(a => SINGLE_SUBSTANCE_ATC4.has(a.slice(0, 5)))) { verdict = 'HOLD'; reason = `ATC 4단계가 단일물질 정의군(${atcs.join('/')}) · 절단코드로 복합 여부 판별 불가`; }
    else if (cold) { verdict = 'EXCLUDE'; reason = '감기·비염 계열(민감 선점 제외)'; }
    else if (!grounded) { verdict = 'HOLD'; reason = `easy 원문 불충분(eff=${hasEff} use=${hasUse} cau=${hasCau} len=${html.length})`; }
    else if (kinds.length > 1) { verdict = 'SPLIT_REQUIRED'; reason = `그룹내 ATC 조성구분 불일치(${atcs.join('/')})`; }
    else { verdict = 'READY'; reason = confirmedCombo ? `복합제 확정(ATC ${atcs.join('/')}) · 원문 완전` : `절단 ATC ${atcs.join('/') || '(없음)'} · 단일성분 반증 없음 · batch12 동일 스코프 · 원문 완전`; }
    rows.push({
      fp: c.fp, atc: c.atc, strength: c.strength, form: c.form, size: c.size, sample: c.sample,
      srcLen: html.length, hasEff, hasUse, hasCau, cold, reserved, authored: auth[0].n,
      atcs, atcKinds: kinds, confirmedCombo, confirmedSingle,
      verdict, reason, target_ids: c.target_ids,
    });
    if (rows.length % 10 === 0) console.error('  screened', rows.length);
  }
} finally { await ds.destroy(); }
writeFileSync(OUT, JSON.stringify(rows, null, 1), 'utf8');
const tally = rows.reduce((a, r) => (a[r.verdict] = (a[r.verdict] || 0) + 1, a), {});
console.log(`SCREEN_DONE ${rows.length} → ${JSON.stringify(tally)}`);
const ready = rows.filter(r => r.verdict === 'READY');
console.log(`READY ${ready.length} groups / ${ready.reduce((s, r) => s + r.size, 0)} masters`);
