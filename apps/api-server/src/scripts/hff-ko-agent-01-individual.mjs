/**
 * WO-O4O-HFF-KO-INDIVIDUAL-PRODUCTION-AGENT-1-TEST-100-V1
 *
 * Agent 1 (생산자) — 건강기능식품 STORE/ko 설명서 개별 생산 테스트 (100건).
 *
 * 성격: 기존 registry-gated composeCombo 는 첫 100건(홍삼·단일기능 다수)의 미등재 원료를
 *   렌더할 수 없다(meta(key) undefined). WO 는 "미등재 원료라는 이유만으로 자동 보류 금지 +
 *   공식 데이터로 작성 가능한 범위 완성 + 기존 표준 디자인 적용" 을 요구한다.
 *   → 본 러너는 기존 sd-card 디자인 마크업을 **그대로 재사용**하고, 각 제품의 공식
 *     MAIN_FNCTN / SRV_USE / BASE_STANDARD / 주의사항 을 **결정적(deterministic)** 으로 배치한다.
 *
 * 반(反)날조 불변식(GROUNDING FIDELITY):
 *   렌더되는 모든 기능성 문장은 정규화된 공식 MAIN_FNCTN 의 **부분문자열**이어야 한다.
 *   위반 시 그 제품은 HOLD(원문 손상/구조 판단 필요). → 외부 LLM 의료사실 생성 0.
 *
 * 저장 계약(선례 hff-store-description-canonical-apply.ts 준수):
 *   product_masters(신규, regulatory_type='건강기능식품', mfds_permit_number=STTEMNT_NO, barcode NULL)
 *   + product_candidates.matched_product_master_id 링크(candidate_status='approved_new_master')
 *   + shared_product_descriptions(status='canonical', description_type='STORE', language='ko',
 *       source_type='o4o_hff_generated', source_ref_id=candidate.id)
 *   canonical 유일키 = (master_id, description_type, coalesce(language,'ko')) where canonical.
 *   제품별 단일 트랜잭션 + 사후검증 + 실패 시 롤백.
 *
 * 금지 준수: 공용 parser/registry/composer/디자인 **수정 안 함**(신규 파일). 영문 미생성(ko 전용).
 *
 * Usage:
 *   dry-run: PGPW=... node apps/api-server/src/scripts/hff-ko-agent-01-individual.mjs
 *   apply  : HFF_AGENT1_APPLY_CONFIRM=YES PGPW=... node ... --apply
 */
import pg from 'pg';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

const APPLY = process.argv.includes('--apply');
const CONFIRM = process.env.HFF_AGENT1_APPLY_CONFIRM === 'YES';
const PORT = parseInt(process.env.PROXY_PORT ?? '5463', 10);
const DATA_DIR = 'apps/api-server/src/scripts/data';
// BATCH: 산출물 basename 선택자. 기본 'test-100'(하위호환). 500 구간 = '00001-00500'.
//   생성 로직/계약은 불변 — 경로·기대수량만 파라미터화(additive).
const BATCH = process.env.HFF_BATCH ?? 'test-100';
const EXPECT = process.env.HFF_EXPECT ? parseInt(process.env.HFF_EXPECT, 10) : null;
const BASE = `${DATA_DIR}/hff-ko-agent-01-${BATCH}`;
const MANIFEST = `${BASE}.json`;
const HOLDS = `${BASE}-holds.jsonl`;
const RESULTS = `${BASE}-results.json`;
const ROLLBACK = `${BASE}-rollback-manifest.json`;
const FAILED = `${BASE}-failed-system.jsonl`;
const SOURCE_LABEL = 'MFDS_HEALTH_FUNCTIONAL_FOOD';
const SPD_SOURCE_TYPE = 'o4o_hff_generated';
const REGULATORY_TYPE = '건강기능식품';

const esc = (s) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const norm = (s) => (s ?? '').replace(/\r/g, '').replace(/ /g, ' ').replace(/[\t ]+/g, ' ').replace(/\n{2,}/g, '\n').trim();
const flat = (s) => norm(s).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
// NOTE(정제계약): 과장/최상급 표현 기반 PROMO HOLD 제거.
//   사유 — 정제된 Agent 9 보류 목록에 없음. 공식 MAIN_FNCTN/SRV_USE 원문을 verbatim 사용하므로
//   원문에 포함된 표현이 false HOLD 를 유발해서는 안 됨(원문 밖 문구 추가는 별도로 금지되어 이미 방지됨).

/** 공식 MAIN_FNCTN → 기능성 문장 배열(원문 부분문자열 보장). group 헤더([원료]/원료명) 인지. */
function extractFunctions(rawFn) {
  const text = norm(rawFn);
  if (!text) return { groups: [], flat: [] };
  const flatText = flat(rawFn);
  // 1) [원료] 그룹 헤더 기준 분할 우선
  const groups = [];
  const bracketRe = /\[([^\]]{1,40})\]/g;
  let hasBracket = bracketRe.test(text);
  bracketRe.lastIndex = 0;
  const splitItems = (chunk) => {
    // ①②③ 또는 1) 2) 또는 줄바꿈 기준
    let parts = chunk.split(/(?=[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮])/);
    if (parts.length <= 1) parts = chunk.split(/(?:(?<=[.。])\s+)|(?:\s*\n\s*)|(?=\b\d+\)\s)/);
    return parts
      .map((p) => p.replace(/^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮\-·•\s]*/, '').replace(/^\d+\)\s*/, '').replace(/\s+/g, ' ').trim())
      .filter((p) => p.length >= 4);
  };
  if (hasBracket) {
    const segs = text.split(/(?=\[[^\]]{1,40}\])/);
    for (const seg of segs) {
      const m = seg.match(/^\[([^\]]{1,40})\]/);
      if (!m) continue;
      const header = m[1].trim();
      const body = seg.slice(m[0].length);
      const items = splitItems(body);
      if (items.length) groups.push({ header, items });
    }
  }
  const flatItems = splitItems(text.replace(/\[[^\]]{1,40}\]/g, ' '));
  return { groups, flat: flatItems, flatText };
}

/** SRV_USE → 섭취 칩. 칩은 반드시 flat(SRV_USE) 의 부분문자열만 채택(fidelity ⊆ SRV_USE). */
function intakeChips(rawSrv) {
  const s = flat(rawSrv);
  const chips = [];
  // 빈도 칩만 추출(1일 N회). 용량 조각 칩은 12자 컷으로 원문 표기가 잘려 왜곡되므로 제외.
  //   완전한 공식 SRV_USE 원문은 하단 sd-meta 에 verbatim 노출되어 정보 손실 없음.
  for (const m of s.matchAll(/1일\s*[0-9~〜\-]+\s*회/g)) chips.push(m[0].replace(/\s+/g, ' ').trim());
  // 부분문자열 검증(정규화 표기 차이로 미포함이면 폐기) → 렌더 섭취칩 ⊆ SRV_USE 보장
  const verified = [...new Set(chips)].filter((c) => s.includes(c)).slice(0, 2);
  return { chips: verified, raw: s };
}

/** BASE_STANDARD → 성상/규격 요약 라인(원문 인용, 최대 6줄) */
function specLines(rawBase) {
  const s = norm(rawBase);
  if (!s) return [];
  return s.split(/\n|(?<=[.。])\s+/).map((x) => x.replace(/\s+/g, ' ').trim()).filter((x) => x.length >= 3).slice(0, 6);
}

/* ── 공식 주의사항(INTAKE_HINT1) 파서 ───────────────────────────────────────────
   WO-O4O-HFF-KO-FIRST-10000-INTAKE-HINT-AND-DESIGN-TARGETED-BACKFILL-V1 (보정 A)
   기존에는 `IFTKN_ATNT_MATR_CN` 을 읽었으나 이 키는 HFF 후보 전량 공란이라
   generic fallback 만 노출됐다. 실제 공식 주의사항은 `INTAKE_HINT1` 에 있다.
   원문을 **의미 보존**한 채 가독 단위로만 분리한다(문구 추가·강화·삭제 0).
   ※ 본 파서는 backfill 러너(hff-ko-first-10000-targeted-backfill.mjs)와 동일 로직이다. */
const MARKER_LEAD = /^(?:[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽]\s*|\([가-힣]\)\s*|\d+\s*[).]\s*|[-·•‐‑–—]\s*)+/;

function splitHintLine(line) {
  const marks = [
    /(?=[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳])/,
    /(?=[⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽])/,
    /(?=\([가-힣]\)\s)/,
    /(?=(?:^|\s)\d+\s*[).]\s)/,
  ];
  for (const re of marks) {
    const parts = line.split(re).map((x) => x.trim()).filter(Boolean);
    if (parts.length >= 2) return parts;
  }
  return [line];
}

/** INTAKE_HINT1 → {status:'NONE'|'OK'|'HOLD', blocks:[{header|null, items[]}]} */
function parseIntakeHint(raw) {
  const text = norm(raw);
  const meaningful = text.replace(/[\s\-·•‐‑–—.,:;()　]/g, '');
  if (!text || meaningful.length < 4 || /^(?:없음|해당\s*없음|해당사항\s*없음)$/.test(text.trim())) return { status: 'NONE', blocks: [] };
  const flatText = flat(raw);
  const rawAll = [];
  const bodyToItems = (body) => {
    const out = [];
    for (const line of body.split(/\n+/)) {
      const t = line.trim();
      if (!t) continue;
      for (const piece of splitHintLine(t)) {
        const cl = piece.replace(MARKER_LEAD, '').replace(/\s+/g, ' ').trim();
        if (cl.replace(/[\s.,:;()]/g, '').length >= 1) out.push(cl);
      }
    }
    rawAll.push(...out);
    return [...new Set(out)];
  };
  const blocks = [];
  if (/\[[^\]]{1,40}\]/.test(text)) {
    for (const seg of text.split(/(?=\[[^\]]{1,40}\])/)) {
      const m = seg.match(/^\[([^\]]{1,40})\]/);
      const items = bodyToItems(m ? seg.slice(m[0].length) : seg);
      if (items.length) blocks.push({ header: m ? m[1].trim() : null, items });
    }
  } else {
    const items = bodyToItems(text);
    if (items.length) blocks.push({ header: null, items });
  }
  if (!blocks.length) return { status: 'NONE', blocks: [] };
  const bad = blocks.flatMap((b) => b.items).filter((i) => !flatText.includes(i));
  if (bad.length) {
    const lines = text.split(/\n+/).map((x) => x.trim()).filter((x) => x.replace(/[\s.,:;()]/g, '').length >= 2);
    const safe = [...new Set(lines)].filter((l) => flatText.includes(l));
    if (!safe.length || safe.length !== new Set(lines).size) return { status: 'HOLD', blocks: [], reason: 'HINT_GROUNDING_FAIL' };
    return { status: 'OK', blocks: [{ header: null, items: safe }] };
  }
  const strip = (s) => s.replace(/[\s\[\]()①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽.,:;·•\-]/g, '');
  const covered = strip(blocks.map((b) => b.header ?? '').join('') + rawAll.join('')).length;
  const total = strip(flatText).length;
  if (total > 0 && covered / total < 0.9) return { status: 'HOLD', blocks: [], reason: 'HINT_UNDER_EXTRACTION' };
  return { status: 'OK', blocks };
}

/** blocks → 계약(CR-020) 내 보조 정보 카드. 1개면 그리드 빈 칸을 피해 단독 카드. */
function blocksToCards(blocks, liFn, escFn) {
  const card = (b) => `<div class="sd-item">${b.header ? `<span class="sd-tag">${escFn(b.header)}</span>` : ''}<ul>${liFn(b.items)}</ul></div>`;
  return blocks.length >= 2 ? `<div class="sd-core">${blocks.map(card).join('')}</div>` : card(blocks[0]);
}

/** 결정적 ko 설명서 렌더 + 검증. 반환: {status, ko, fidelityFail, reason, detail} */
function composeKo(row) {
  const name = flat(row.name);
  const fnRaw = row.mainfnctn;
  const srvRaw = row.srvuse;
  const baseRaw = row.basestandard;

  if (!name) return { status: 'HOLD', reason: 'PRODUCT_NAME_MISSING', detail: '제품명 없음' };
  if (!flat(fnRaw)) return { status: 'HOLD', reason: 'NO_FUNCTIONAL_DATA', detail: 'MAIN_FNCTN 공식 기능성 없음' };
  if (!flat(srvRaw)) return { status: 'HOLD', reason: 'NO_INTAKE_DATA', detail: 'SRV_USE 공식 섭취방법 없음' };

  const { groups, flat: flatFns, flatText } = extractFunctions(fnRaw);
  let allFns = groups.length ? groups.flatMap((g) => g.items) : flatFns;
  // 분할 실패 시 보류하지 않고 공식 MAIN_FNCTN 원문 전체를 단일 문장으로 fallback.
  //   (flatText 는 자기 자신의 부분문자열이므로 반날조 불변식 유지 · verbatim ⊆ MAIN_FNCTN 성립)
  if (!allFns.length && flatText) allFns = [flatText];
  if (!allFns.length) return { status: 'HOLD', reason: 'NO_FUNCTIONAL_DATA', detail: 'MAIN_FNCTN 정규화 후 공란' };

  // 반(反)날조 불변식: 모든 기능성 문장이 flatText 부분문자열
  const fidelityFail = allFns.filter((f) => !flatText.includes(f));
  if (fidelityFail.length) return { status: 'HOLD', reason: 'GROUNDING_FIDELITY_FAIL', detail: `비원문 문장 ${fidelityFail.length}: ${fidelityFail[0].slice(0, 40)}` };

  const intake = intakeChips(srvRaw);
  const specs = specLines(baseRaw);
  const hint = parseIntakeHint(row.intakehint1);
  if (hint.status === 'HOLD') return { status: 'HOLD', reason: hint.reason, detail: 'INTAKE_HINT1 파싱이 원문을 충실히 담지 못함' };

  const li = (arr) => arr.map((x) => `<li>${esc(x)}</li>`).join('');
  const badges = `<span class="sd-badge">건강기능식품</span>` +
    (intake.chips.filter((c) => /1일/.test(c)).map((c) => `<span class="sd-badge">${esc(c)}</span>`).join(''));

  // 다기능성 상위 목록은 계약 어휘 밖(sd-func)이라 무스타일이었다 → sd-core > sd-item 으로 정비.
  const funcSection = groups.length
    ? blocksToCards(groups.map((g) => ({ header: g.header, items: g.items })), li, esc)
    : `<ul class="sd-why">${li(allFns)}</ul>`;

  const specHtml = specs.length
    ? specs.map((x) => `<div class="sd-item">${esc(x)}</div>`).join('')
    : `<div class="sd-item">공식 기준·규격은 제품 표시사항을 확인하십시오.</div>`;

  const chipsHtml = (intake.chips.length ? intake.chips : ['제품 표시사항 참고']).map((c) => `<span class="sd-tag">${esc(c)}</span>`).join('');
  // 공식 원문이 없으면 섹션 자체를 렌더하지 않는다 — 빈 카드·일괄 경고 삽입 0.
  const hintSection = hint.status === 'OK' ? `\n  <h2>섭취 시 참고사항</h2>${blocksToCards(hint.blocks, li, esc)}` : '';

  const ko = `<div class="sd-card sd-theme-green"><div class="sd-hero">
  <div class="sd-badges">${badges}</div>
  <h1>${esc(name)}</h1><p class="sd-meta">건강기능식품 · 공식 인정 기능성 기반 매장 설명서</p></div>
  <div class="sd-body"><p class="sd-intro">이 제품은 식약처에 신고된 건강기능식품입니다. 공식적으로 인정된 기능성은 아래와 같습니다.</p>
  <h2>주요 기능성</h2>${funcSection}
  <h2>섭취량 및 섭취방법 (공식 표기 그대로)</h2><div class="sd-intake"><span class="sd-chips">${chipsHtml}</span><p class="sd-meta">${esc(intake.raw)}</p></div>${hintSection}
  <h2>확인 가능한 기준·규격 정보</h2><div class="sd-spec">${specHtml}</div>
  <h2>매장 전문가 문의 안내</h2><div class="sd-cta"><p>섭취 방법이나 본인 상태에 맞는지 궁금하시면 매장 내 약사 등 전문가에게 문의하십시오.</p></div></div>
  <div class="sd-foot">제품 표시사항을 함께 확인하십시오.</div></div>`;

  // 구조 검증
  const plain = ko.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (plain.length < 60) return { status: 'HOLD', reason: 'BODY_TOO_SHORT', detail: `본문 ${plain.length}자` };
  const need = ['주요 기능성', '섭취량 및 섭취방법', '확인 가능한 기준', '매장 전문가 문의'];
  const missing = need.filter((h) => !ko.includes(h));
  if (missing.length) return { status: 'HOLD', reason: 'SECTION_MISSING', detail: missing.join(',') };

  return { status: 'CREATE', ko, funcCount: allFns.length };
}

async function main() {
  if (APPLY && !CONFIRM) throw new Error('APPLY_BLOCKED: --apply 는 HFF_AGENT1_APPLY_CONFIRM=YES 필요');
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  if (!Array.isArray(manifest) || manifest.length === 0) throw new Error(`manifest 비정상: ${manifest?.length}`);
  if (EXPECT != null && manifest.length !== EXPECT) throw new Error(`manifest 기대수량 불일치: ${manifest.length} != ${EXPECT}`);

  const client = new pg.Client({ host: '127.0.0.1', port: PORT, user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false });
  await client.connect();

  // 원문 로드(고정 정렬 재확인 — manifest 순서와 candidateId 로 매칭)
  const ids = manifest.map((m) => m.candidateId);
  const src = await client.query(`
    SELECT id, candidate_status, matched_product_master_id,
      raw_payload::jsonb->'source'->>'STTEMNT_NO' stmt,
      raw_payload::jsonb->'source'->>'PRDUCT' name,
      raw_payload::jsonb->'source'->>'MAIN_FNCTN' mainFnctn,
      raw_payload::jsonb->'source'->>'SRV_USE' srvUse,
      raw_payload::jsonb->'source'->>'BASE_STANDARD' baseStandard,
      raw_payload::jsonb->'source'->>'INTAKE_HINT1' intakeHint1,
      raw_payload::jsonb->'source'->>'ENTRPS' maker
    FROM product_candidates WHERE id = ANY($1) AND deleted_at IS NULL`, [ids]);
  const byId = new Map(src.rows.map((r) => [r.id, r]));

  const results = [];
  const samples = [];
  const DUMP = process.env.HFF_DUMP_SAMPLES === 'YES';
  const holdLines = [];
  const failedLines = [];
  const rollback = { createdMasters: [], createdSpd: [], candidateLinks: [], outcomes: [] };
  const t0 = Date.now();
  const startedAt = new Date().toISOString();
  let created = 0, skipped = 0, held = 0, failed = 0, dbWrites = 0;

  for (const m of manifest) {
    const row = byId.get(m.candidateId);
    const pStart = Date.now();
    let status, reason = null, detail = null, masterId = m.productMasterId;
    try {
      if (!row) { status = 'FAILED_SYSTEM'; reason = 'CANDIDATE_ROW_MISSING'; failed++; }
      else {
        // 1) canonical 존재 확인(제품별 실시간)
        let hasCanon = false;
        const master = row.matched_product_master_id
          || (await client.query(`SELECT id FROM product_masters WHERE mfds_permit_number=$1 LIMIT 1`, [row.stmt])).rows[0]?.id
          || null;
        masterId = master;
        if (master) {
          const c = await client.query(`SELECT 1 FROM shared_product_descriptions WHERE master_id=$1 AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL LIMIT 1`, [master]);
          hasCanon = c.rowCount > 0;
        }
        if (hasCanon) { status = 'SKIPPED_EXISTING'; skipped++; }
        else {
          const comp = composeKo(row);
          if (comp.status === 'HOLD') {
            status = 'HOLD_FOR_AGENT_9'; reason = comp.reason; detail = comp.detail; held++;
            holdLines.push(JSON.stringify({
              index: m.index, candidateId: m.candidateId, statementNo: row.stmt, productName: row.name, productMasterId: master,
              holdReason: comp.reason, holdDetail: comp.detail,
              mainFnctn: flat(row.mainfnctn).slice(0, 300), srvUse: flat(row.srvuse).slice(0, 200),
              baseStandard: flat(row.basestandard).slice(0, 200), intakeHint1: flat(row.intakehint1).slice(0, 200),
            }));
          } else {
            // CREATE
            if (DUMP && samples.length < 4) samples.push({ index: m.index, productName: row.name, statementNo: row.stmt, mainFnctn: flat(row.mainfnctn), srvUse: flat(row.srvuse), ko: comp.ko });
            if (!APPLY) { status = 'CREATED'; created++; }
            else {
              const qr = client;
              await qr.query('BEGIN');
              try {
                let mid = master;
                if (!mid) {
                  mid = randomUUID();
                  await qr.query(
                    `INSERT INTO product_masters (id, barcode, regulatory_type, regulatory_name, name, manufacturer_name, mfds_permit_number, is_mfds_verified, status, tags, created_at, updated_at)
                     VALUES ($1,NULL,$2,$3,$3,$4,$5,true,'ACTIVE',$6::jsonb,now(),now())`,
                    [mid, REGULATORY_TYPE, flat(row.name), flat(row.maker), row.stmt, JSON.stringify(['import:mfds-hff', `wo:hff-ko-agent-01-${BATCH}`])]);
                  rollback.createdMasters.push(mid);
                  dbWrites++;
                }
                await qr.query(
                  `UPDATE product_candidates SET matched_product_master_id=$2, candidate_status='approved_new_master', reviewed_at=now(), updated_at=now() WHERE id=$1`,
                  [row.id, mid]);
                rollback.candidateLinks.push(row.id);
                dbWrites++;
                const spdId = randomUUID();
                await qr.query(
                  `INSERT INTO shared_product_descriptions (id, master_id, content, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
                   VALUES ($1,$2,$3,$4,$5,'canonical','ko','STORE',now(),now())`,
                  [spdId, mid, comp.ko, SPD_SOURCE_TYPE, row.id]);
                rollback.createdSpd.push(spdId);
                dbWrites++;
                // 사후검증(트랜잭션 내)
                const v = await qr.query(`SELECT count(*)::int c FROM shared_product_descriptions WHERE master_id=$1 AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL`, [mid]);
                if (v.rows[0].c !== 1) { await qr.query('ROLLBACK'); throw new Error(`POST_VERIFY_DUP c=${v.rows[0].c}`); }
                await qr.query('COMMIT');
                masterId = mid; status = 'CREATED'; created++;
                rollback.outcomes.push({ index: m.index, candidateId: row.id, statementNo: row.stmt, masterId: mid, spdId });
              } catch (e) {
                try { await qr.query('ROLLBACK'); } catch {}
                status = 'FAILED_SYSTEM'; reason = 'WRITE_FAILED'; detail = String(e.message || e); failed++;
              }
            }
          }
        }
      }
    } catch (e) {
      status = 'FAILED_SYSTEM'; reason = 'UNEXPECTED'; detail = String(e.message || e); failed++;
    }
    results.push({ index: m.index, candidateId: m.candidateId, statementNo: m.statementNo, productName: m.productName, productMasterId: masterId, status, reason, detail, ms: Date.now() - pStart });
    if (status === 'FAILED_SYSTEM') {
      failedLines.push(JSON.stringify({
        index: m.index, candidateId: m.candidateId, statementNo: m.statementNo, productName: m.productName,
        productMasterId: masterId, failReason: reason, failDetail: detail,
      }));
    }
  }

  const elapsed = Date.now() - t0;
  fs.writeFileSync(RESULTS, JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), mode: APPLY ? 'apply' : 'dry-run', elapsedMs: elapsed, counts: { created, skipped, held, failed }, dbWrites, results }, null, 1));
  fs.writeFileSync(HOLDS, holdLines.join('\n') + (holdLines.length ? '\n' : ''));
  fs.writeFileSync(FAILED, failedLines.join('\n') + (failedLines.length ? '\n' : ''));
  if (APPLY) fs.writeFileSync(ROLLBACK, JSON.stringify(rollback, null, 1));
  if (DUMP) fs.writeFileSync(`${BASE}-samples.json`, JSON.stringify(samples, null, 1));

  const holdByReason = {};
  for (const l of holdLines) { const r = JSON.parse(l).holdReason; holdByReason[r] = (holdByReason[r] || 0) + 1; }
  console.log('JSON_REPORT_BEGIN');
  console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', counts: { created, skipped, held, failed }, dbWrites, holdByReason, elapsedMs: elapsed, avgMs: Math.round(elapsed / manifest.length) }, null, 2));
  console.log('JSON_REPORT_END');
  await client.end();
}
main().catch((e) => { console.error('[hff-ko-agent-01] FAILED:', e?.message || e); process.exit(1); });
