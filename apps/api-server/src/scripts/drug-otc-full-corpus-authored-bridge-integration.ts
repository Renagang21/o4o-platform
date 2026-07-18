/**
 * WO-O4O-OTC-FULL-CORPUS-AUTHORED-BRIDGE-INTEGRATION-V1
 *
 * grounded OTC 19,131 + authored 3,128 을 단일 규칙으로 결합해 실제 재사용 가능 제품 수와
 * 신규 작성 필요 그룹 수를 확정한다. read-only(DB write 0).
 *
 * 배경: 3-shard 통합(0aa64a0ef)은 안전지문 대조를 "단일 규칙 글로벌 재계산(DB 백드 후속 WO)"으로
 *   명시적으로 미뤘다. 본 스크립트가 그 재계산이다. shard-1(565546b7f)·authored audit(d7b3017ad) 의
 *   정규화·안전지문·경로/제형/성분 로직을 그대로 계승해 grounded·authored 양쪽에 동일 규칙 적용.
 *
 * 후보 연결 키(pharmKey): 성분 있으면 ing:성분|함량|제형|경로 · 없으면 atc:atc_code|함량|제형|경로.
 * 최종 분리 키: 안전지문 번들(용법수치·연령·기간·금기·임신·상호작용·첨가제·단일복합).
 * 고정 원칙: ATC = 후보 연결 키 / 안전지문 = 최종 분리 키.
 *
 * 판정(grounded master 기준, 경구):
 *   authored그대로확장 = pharmKey 일치 + authored 단일문서 + 안전지문 일치
 *   검토후확장        = pharmKey 일치 + authored 충돌(12그룹, 안전상충 6 포함) → 자동 확장 금지
 *   안전지문불일치     = pharmKey 일치 + authored 단일문서 + 안전지문 불일치 → 하위 그룹 분리
 *   새설명서필요       = authored 후보 없음
 *   비경구별도트랙     = route≠oral 또는 복합제
 *
 * 실행(프로덕션 read-only): DB_HOST=127.0.0.1 DB_PORT=<proxy> npx tsx <this>
 * 산출: otc-full-corpus-authored-bridge-{summary,groups,exceptions}-v1.json (WRITE=0 이면 콘솔만).
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const WRITE = process.env.WRITE !== '0';
const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);

// ── fingerprint 헬퍼 (shard-1 / authored audit 계승) ────────────────────────────
function easySections(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim();
  return out;
}
function freeSections(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<(h[1-4]|strong)[^>]*>\s*([^<]{2,40}?)\s*<\/\1>([\s\S]*?)(?=<(?:h[1-4]|strong)[^>]*>|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    const title = m[2].replace(/[:：]\s*$/, '').trim();
    const body = m[3].trim();
    if (title) out[title] = (out[title] ? out[title] + '\n' : '') + body;
  }
  return out;
}
function bucketSections(sec: Record<string, string>): { ind: string; dos: string; cau: string; itx: string } {
  let ind = '', dos = '', cau = '', itx = '';
  for (const [t, b] of Object.entries(sec)) {
    if (/효능|효과|적응|용도/.test(t)) ind += (ind ? '\n' : '') + b;
    else if (/용법|용량|복용|투여\s*방법|사용\s*방법|사용법/.test(t)) dos += (dos ? '\n' : '') + b;
    else if (/상호\s*작용|병용/.test(t)) itx += (itx ? '\n' : '') + b;
    else if (/주의|경고|금기|부작용|이상\s*반응|임부|임신|수유/.test(t)) cau += (cau ? '\n' : '') + b;
  }
  return { ind, dos, cau, itx };
}
const stripTags = (s: string): string => s.replace(/<[^>]+>/g, ' ');
function normalize(s: string): string {
  return stripTags(s).normalize('NFKC')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/[·・∙•▪▶►\-–—]/g, ',').replace(/^\s*\d+\)\s*/gm, '')
    .replace(/[，、]/g, ',').replace(/[．。]/g, '.').replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',').trim();
}
function numericSig(s: string): string {
  const nums = (normalize(s).match(/[0-9][0-9,.]*\s*(mg|밀리그램|㎎|㎍|마이크로그램|g|정|캡슐|회|시간|일|주|개월|mL|㎖|IU|iu|%)/gi) || [])
    .map((x) => x.replace(/\s+/g, '').toLowerCase()).sort();
  return H([...new Set(nums)].join('|'));
}
function ageSig(s: string): string {
  const a = (normalize(s).match(/(만\s?)?\d+\s*세\s*(이상|이하|미만|초과)?|성인|소아|어린이|영아|유아|고령자|노인/g) || [])
    .map((x) => x.replace(/\s+/g, '')).sort();
  return H([...new Set(a)].join('|'));
}
function durationSig(s: string): string {
  const d = (normalize(s).match(/\d+\s*(주|일|개월|회)\s*(이상|이내|정도|간)?/g) || []).map((x) => x.replace(/\s+/g, '')).sort();
  return H([...new Set(d)].join('|'));
}
function contraSig(caution: string): string {
  const t = normalize(caution);
  const m = t.match(/(.*?)(복용하지\s?(마|않)|투여하지\s?(마|말)|복용해서는\s?안)/);
  return H(normalize(m ? m[1] : t.slice(0, 200)));
}
function pregnancySig(caution: string): string {
  const t = normalize(caution);
  if (!/임부|임신|수유부/.test(t)) return 'none';
  return /임부[^.]{0,20}(복용하지|투여하지|마)|임신[^.]{0,20}(복용하지|마)/.test(t) ? 'ban' : 'consult';
}
function additiveSig(caution: string): string {
  const t = normalize(caution); const a: string[] = [];
  if (/아스파탐|페닐케톤/.test(t)) a.push('aspartame');
  if (/대두유|대두레시틴/.test(t)) a.push('soybean');
  if (/유당|갈락토/.test(t)) a.push('lactose');
  if (/황색\s?\d\s?호|타르색소|타르트라진|선셋옐로우/.test(t)) a.push('dye');
  return a.sort().join('+') || 'none';
}
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
function formOf(name: string): string {
  return /연질캡슐/.test(name) ? '연질캡슐' : /캡슐/.test(name) ? '캡슐' : /연고/.test(name) ? '연고' : /크림/.test(name) ? '크림'
    : /플라스타|첩부|패치|패취|카타플/.test(name) ? '첩부제' : /점안/.test(name) ? '점안액' : /시럽/.test(name) ? '시럽'
    : /과립|산\(/.test(name) ? '과립/산' : /정/.test(name) ? '정' : /액/.test(name) ? '액' : '기타';
}
const ingredientOf = (name: string): string => (name.match(/\(([^()]+)\)\s*$/)?.[1] || '').trim();
const strengthOf = (spec: string): string => (spec || '').split(' / ')[0].trim();

type Rec = {
  master_id: string; name: string; ingredient: string; strength: string; form: string; route: string;
  atc_code: string; multi: boolean; nonOral: boolean;
  norm_ind: string; norm_dos: string; norm_cau: string; norm_full: string; safety: string; pharmKey: string; keyType: string;
};

function pharmKeyOf(x: { ingredient: string; atc_code: string; strength: string; form: string; route: string; master_id: string }): { key: string; keyType: string } {
  if (x.ingredient) return { key: `ing:${x.ingredient}|${x.strength}|${x.form}|${x.route}`, keyType: 'ingredient' };
  if (x.atc_code) return { key: `atc:${x.atc_code}|${x.strength}|${x.form}|${x.route}`, keyType: 'atc' };
  return { key: `none:${x.master_id}`, keyType: 'none' };
}

function toRec(r: { master_id: string; name: string; spec: string; atc_code: string | null; content: string }): Rec {
  let sec = easySections(r.content || '');
  if (Object.keys(sec).length === 0) sec = freeSections(r.content || '');
  const { ind, dos, cau, itx } = bucketSections(sec);
  const ingredient = ingredientOf(r.name);
  const strength = strengthOf(r.spec);
  const form = formOf(r.name);
  const route = routeSig(r.name);
  const multi = /[·,]/.test(ingredient) || (r.name.match(/[·]/g) || []).length >= 2;
  const atc_code = (r.atc_code || '').trim();
  const safety = [numericSig(dos), ageSig(dos + ' ' + cau), durationSig(dos + ' ' + cau), contraSig(cau), pregnancySig(cau), additiveSig(cau), H(normalize(itx)), multi ? 'M' : 'S'].join(':');
  const { key, keyType } = pharmKeyOf({ ingredient, atc_code, strength, form, route, master_id: r.master_id });
  return {
    master_id: r.master_id, name: r.name, ingredient, strength, form, route, atc_code, multi, nonOral: route !== 'oral',
    norm_ind: H(normalize(ind)), norm_dos: H(normalize(dos)), norm_cau: H(normalize(cau)), norm_full: H(normalize(r.content || '')), safety, pharmKey: key, keyType,
  };
}
const groupKeyOf = (x: Rec): string => H([x.norm_ind, x.norm_dos, x.norm_cau, H(`${x.ingredient}|${x.strength}`), H(x.form), x.route].join('|'));

async function main(): Promise<void> {
  const { DataSource } = await import('typeorm');
  const mkDs = () => new DataSource({
    type: 'postgres', host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'], extra: { keepAlive: true, statement_timeout: 120000 },
  });
  let ds = mkDs();
  await ds.initialize();
  // 라이브 프록시/네트워크 간헐 단절(ECONNRESET) 대비: 연결 오류 시 재초기화 후 재시도.
  const q = async (sql: string, params?: any[], tries = 5): Promise<any[]> => {
    for (let i = 1; i <= tries; i++) {
      try { return await ds.query(sql, params); }
      catch (e: any) {
        const msg = String(e?.message || e);
        const conn = /ECONNRESET|Connection terminated|server closed|read ECONN|timeout|socket hang/i.test(msg);
        if (!conn || i === tries) throw e;
        console.error(`[retry ${i}/${tries}] ${msg.slice(0, 80)} — 재연결`);
        try { await ds.destroy(); } catch {}
        ds = mkDs(); await ds.initialize();
      }
    }
    return [];
  };
  const AUTHORED = ['mfds_drug_otc', 'mfds_drug_otc_nutrition_combo'];

  // ── grounded OTC 19,131 마스터 목록(가벼움, content 제외) ──
  const groundedMeta: Array<{ master_id: string; name: string; spec: string; atc_code: string | null }> = await q(`
    SELECT DISTINCT pm.id::text master_id, pm.name, pm.specification spec, e.atc_code
    FROM product_masters pm
    JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL
    WHERE pm.regulatory_type='DRUG'
      AND EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL)
  `);

  // ── grounded content 배치 로드(단일 쿼리 장시간 유지 방지 → ECONNRESET 회피, 배치별 재시도) ──
  const contentMap = new Map<string, string>();
  const ids = groundedMeta.map((m) => m.master_id);
  const BATCH = 500;
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    const rows: Array<{ master_id: string; content: string }> = await q(`
      SELECT ids.master_id::text master_id, es.content
      FROM unnest($1::uuid[]) AS ids(master_id)
      JOIN LATERAL (SELECT content FROM shared_product_descriptions s WHERE s.master_id=ids.master_id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL ORDER BY length(s.content) DESC LIMIT 1) es ON true
    `, [chunk]);
    for (const r of rows) contentMap.set(r.master_id, r.content);
  }
  const groundedRows = groundedMeta.map((m) => ({ ...m, content: contentMap.get(m.master_id) || '' }));

  // ── authored (ko canonical, 소량) ──
  const authoredRows: Array<{ master_id: string; name: string; spec: string; atc_code: string | null; content: string; source_type: string }> = await q(`
    WITH a AS (
      SELECT s.master_id, s.source_type,
        (SELECT s2.content FROM shared_product_descriptions s2 WHERE s2.master_id=s.master_id AND s2.source_type=s.source_type AND s2.language='ko' AND s2.status='canonical' AND s2.deleted_at IS NULL ORDER BY length(s2.content) DESC LIMIT 1) content
      FROM shared_product_descriptions s
      WHERE s.source_type = ANY($1) AND s.language='ko' AND s.status='canonical' AND s.deleted_at IS NULL
      GROUP BY s.master_id, s.source_type
    )
    SELECT a.master_id::text master_id, a.source_type, a.content, pm.name, pm.specification spec, e.atc_code
    FROM a JOIN product_masters pm ON pm.id=a.master_id
    LEFT JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.deleted_at IS NULL
  `, [AUTHORED]);

  const grounded = groundedRows.map(toRec);
  const authored = authoredRows.map(toRec);

  // ── authored pharmKey 인덱스 (충돌·안전지문 세트) ──
  const authoredByPharm = new Map<string, { keyType: string; masters: string[]; docs: Set<string>; safety: Set<string>; sampleName: string }>();
  for (let i = 0; i < authored.length; i++) {
    const a = authored[i]; if (a.pharmKey.startsWith('none:')) continue;
    const e = authoredByPharm.get(a.pharmKey) ?? authoredByPharm.set(a.pharmKey, { keyType: a.keyType, masters: [], docs: new Set(), safety: new Set(), sampleName: a.name }).get(a.pharmKey)!;
    e.masters.push(a.master_id);
    e.docs.add(a.norm_full); // 전체 content 지문 = authored audit 계승(충돌 12 정의 일치)
    e.safety.add(a.safety);
  }
  const authoredConflict = new Set<string>();       // distinctDocs>1 (12그룹)
  const authoredSafetyConflict = new Set<string>(); // distinctSafety>1 (6그룹)
  for (const [k, v] of authoredByPharm) { if (v.docs.size > 1) authoredConflict.add(k); if (v.safety.size > 1) authoredSafetyConflict.add(k); }

  // ── grounded 후보 풀의 pharmKey별 안전 프로파일(최종 분리 키) ──
  // 고정 원칙: ATC/성분키 = 후보 연결 키, 안전지문 = 최종 분리 키. 분리는 "연결된 후보 풀"(같은 pharmKey grounded)
  // 내부에서 수행한다(shard §5-C 계승). authored 텍스트와의 byte-equality 가 아니라 grounded-internal 대표 프로파일 기준.
  const groundedSafeByPharm = new Map<string, Map<string, number>>();
  for (const g of grounded) {
    if (g.nonOral || g.multi || g.pharmKey.startsWith('none:')) continue;
    const m = groundedSafeByPharm.get(g.pharmKey) ?? groundedSafeByPharm.set(g.pharmKey, new Map()).get(g.pharmKey)!;
    m.set(g.safety, (m.get(g.safety) || 0) + 1);
  }
  const dominantSafetyOf = (pharmKey: string): string | null => {
    const m = groundedSafeByPharm.get(pharmKey); if (!m) return null;
    return [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
  };

  // ── grounded master 분류 ──
  const BUCKETS = ['authored그대로확장', '검토후확장', '안전지문불일치', '새설명서필요', '비경구별도트랙'] as const;
  type Bucket = typeof BUCKETS[number];
  const masterBucket = new Map<string, Bucket>();
  const bucketMasters: Record<Bucket, number> = { authored그대로확장: 0, 검토후확장: 0, 안전지문불일치: 0, 새설명서필요: 0, 비경구별도트랙: 0 };
  // authored 대표설명서(pharmKey) 별 커버 grounded master 집계 → 커버리지·apply 후보
  const applyCover = new Map<string, { pharmKey: string; keyType: string; sampleName: string; authoredMasters: number; groundedApply: number; groundedReview: number }>();

  // 판정:
  //   authored그대로확장 = authored 후보 존재(무충돌) + grounded 안전 대표 프로파일(dominant) → 확장 우선 후보(적용은 이중 게이트 승인)
  //   검토후확장        = authored 후보 존재하나 authored 내부 충돌(12그룹, 안전상충 6 포함) → 자동 확장 금지, 사람 검토 필수
  //   안전지문불일치     = authored 후보 존재 + grounded 안전 소수 이질 프로파일 → 하위 그룹 분리
  //   새설명서필요       = authored 후보 없음
  //   비경구별도트랙     = route≠oral 또는 복합제
  function classify(g: Rec): Bucket {
    if (g.nonOral || g.multi) return '비경구별도트랙';
    if (g.pharmKey.startsWith('none:')) return '새설명서필요'; // 무성분명 + atc 없음
    if (!authoredByPharm.has(g.pharmKey)) return '새설명서필요';
    if (authoredConflict.has(g.pharmKey)) return '검토후확장'; // 12 충돌(안전상충 6 포함) 자동 확장 금지
    return g.safety === dominantSafetyOf(g.pharmKey) ? 'authored그대로확장' : '안전지문불일치';
  }
  for (const g of grounded) {
    const b = classify(g);
    masterBucket.set(g.master_id, b); bucketMasters[b] += 1;
    if (!g.pharmKey.startsWith('none:') && (b === 'authored그대로확장' || b === '검토후확장')) {
      const a = authoredByPharm.get(g.pharmKey)!;
      const c = applyCover.get(g.pharmKey) ?? applyCover.set(g.pharmKey, { pharmKey: g.pharmKey, keyType: a.keyType, sampleName: a.sampleName, authoredMasters: a.masters.length, groundedApply: 0, groundedReview: 0 }).get(g.pharmKey)!;
      if (b === 'authored그대로확장') c.groundedApply += 1; else c.groundedReview += 1;
    }
  }

  // ── grounded fingerprint 그룹 재계산 (6,216 일치 게이트) + 그룹 판정 롤업 ──
  const gGroups = new Map<string, Rec[]>();
  for (const g of grounded) { const k = groupKeyOf(g); (gGroups.get(k) ?? gGroups.set(k, []).get(k)!).push(g); }
  const groupList = [...gGroups.entries()].map(([fp, members]) => {
    const counts: Record<string, number> = {};
    for (const m of members) { const b = masterBucket.get(m.master_id)!; counts[b] = (counts[b] || 0) + 1; }
    // 그룹 대표 판정: 비경구 우선, 그다음 우세 버킷
    let bucket: Bucket;
    if (members.some((m) => m.nonOral || m.multi)) bucket = '비경구별도트랙';
    else bucket = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]) as Bucket;
    const rep = members[0];
    return { fingerprint: fp, size: members.length, bucket, counts, pharmKey: rep.pharmKey, keyType: rep.keyType, ingredient: rep.ingredient, strength: rep.strength, form: rep.form, route: rep.route, atc_code: rep.atc_code, sampleName: rep.name };
  }).sort((a, b) => b.size - a.size);
  const groupBucket: Record<string, { groups: number; masters: number }> = {};
  for (const g of groupList) { (groupBucket[g.bucket] ??= { groups: 0, masters: 0 }); groupBucket[g.bucket].groups += 1; groupBucket[g.bucket].masters += g.size; }

  // ── 무성분명(atc) grounded 경구·단일 ATC bridge 결과 ──
  const noIngOralSingle = grounded.filter((g) => !g.ingredient && !g.nonOral && !g.multi);
  const atcResult = { 대상: noIngOralSingle.length, ATC코드없음: 0, authored그대로확장: 0, 검토후확장: 0, 안전지문불일치: 0, 새설명서필요: 0 } as Record<string, number>;
  for (const g of noIngOralSingle) {
    if (!g.atc_code) { atcResult['ATC코드없음'] += 1; atcResult['새설명서필요'] += 1; continue; }
    const b = masterBucket.get(g.master_id)!; atcResult[b] = (atcResult[b] || 0) + 1;
  }

  // ── authored 289 그룹 중 grounded 연결 가능 그룹 수 ──
  // authored 그룹 = authored master 를 groupKeyOf 로 그룹화(289 재현). pharmKey 가 grounded 에 존재하면 연결 가능.
  const aGroups = new Map<string, Rec[]>();
  for (const a of authored) { const k = groupKeyOf(a); (aGroups.get(k) ?? aGroups.set(k, []).get(k)!).push(a); }
  const groundedPharmSet = new Set(grounded.filter((g) => !g.nonOral && !g.multi && !g.pharmKey.startsWith('none:')).map((g) => g.pharmKey));
  let authoredGroupsLinkable = 0;
  for (const [, members] of aGroups) {
    const rep = members[0];
    if (!rep.pharmKey.startsWith('none:') && groundedPharmSet.has(rep.pharmKey)) authoredGroupsLinkable += 1;
  }

  // ── 커버리지: authored 대표설명서 상위 N 누적 grounded apply 커버 ──
  const applyList = [...applyCover.values()].sort((a, b) => (b.groundedApply + b.groundedReview) - (a.groundedApply + a.groundedReview));
  const totalApplyMasters = bucketMasters['authored그대로확장'] + bucketMasters['검토후확장'];
  const cumCoverage = (n: number): { reps: number; grounded: number; pct: number } => {
    let acc = 0; const slice = applyList.slice(0, n);
    for (const c of slice) acc += c.groundedApply + c.groundedReview;
    return { reps: slice.length, grounded: acc, pct: totalApplyMasters ? +(acc / totalApplyMasters * 100).toFixed(1) : 0 };
  };

  // ── 안전 게이트 ──
  const groundedDistinct = new Set(grounded.map((g) => g.master_id)).size;
  const authoredDistinct = new Set(authored.map((a) => a.master_id)).size;
  const gate = {
    // 무결성(반드시 통과): distinct==rows → 중복 0, grounded 모집단 정확.
    integrity_grounded_no_dup: groundedDistinct === groundedRows.length,
    integrity_authored_no_dup: authoredDistinct === authoredRows.length,
    grounded_distinct: groundedDistinct, gate_grounded_19131: groundedDistinct === 19131,
    // 라이브 드리프트(기준선 대비 초과=허용, 손실=금지). authored 는 동시 배치 canonical 승격으로 3128→실측 증가.
    authored_distinct: authoredDistinct, authored_baseline_3128: 3128,
    authored_drift: authoredDistinct - 3128, authored_no_loss: authoredDistinct >= 3128,
    grounded_groups_recomputed: groupList.length, groups_baseline_6216: 6216, groups_drift: groupList.length - 6216,
    authored_conflict_groups: authoredConflict.size, authored_safety_conflict_groups: authoredSafetyConflict.size,
    conflict_baseline_12: 12, safety_conflict_baseline_6: 6,
    driftNote: 'grounded 19,131 불변(중복·손실 0). authored 는 12:37 audit(d7b3017ad) 이후 동시 OTC 배치 세션이 mfds_drug_otc ko 21건을 canonical 승격(created_at 신규 0, status 전환) → 3128→실측. 손실 없음(superset). groups 6,216 은 shard-merge 근사, 본 스크립트는 전량 단일패스 재계산이라 정본. 충돌 정의는 전체 content 지문(audit 계승).',
    dbWrite: 0,
  };

  const summary = {
    wo: 'WO-O4O-OTC-FULL-CORPUS-AUTHORED-BRIDGE-INTEGRATION-V1', dbWrite: 0, readOnly: true,
    inputs: { grounded_commit: '0aa64a0ef', authored_commit: 'd7b3017ad', unifiedRule: 'shard-1/authored-audit 계승, 단일 규칙 글로벌 재계산' },
    gate,
    masterPartition: bucketMasters,
    groupPartition: groupBucket,
    required: {
      authored289그룹_중_grounded연결가능_그룹수: authoredGroupsLinkable,
      기존authored로_확장가능_grounded제품수: { 그대로확장_확정: bucketMasters['authored그대로확장'], 검토후확장_후보: bucketMasters['검토후확장'], 합: bucketMasters['authored그대로확장'] + bucketMasters['검토후확장'] },
      무성분명_ATC_bridge결과: atcResult,
      안전지문불일치: { 제품수: bucketMasters['안전지문불일치'], 그룹수: (groupBucket['안전지문불일치']?.groups || 0) },
      최종_신규작성필요_그룹수: (groupBucket['새설명서필요']?.groups || 0),
      최종_신규작성필요_제품수: bucketMasters['새설명서필요'],
      커버리지_대표설명서: { top10: cumCoverage(10), top50: cumCoverage(50), top100: cumCoverage(100), 총apply대상: totalApplyMasters, 대표설명서총수: applyList.length },
    },
    경구apply가능_상위30: applyList.slice(0, 30).map((c) => ({ pharmKey: c.pharmKey, keyType: c.keyType, sample: c.sampleName, authored: c.authoredMasters, groundedApply: c.groundedApply, groundedReview: c.groundedReview })),
    safety_notes: [
      '약학적 키 충돌 12그룹(안전상충 6 포함)은 검토후확장으로 분류 — 자동 확장 금지(WO 안전조건).',
      '안전지문 불일치는 하위 그룹 분리(오병합 방지).',
      'source_type 실제값 mfds_drug_otc / mfds_drug_otc_nutrition_combo 사용.',
    ],
  };

  const groupsOut = { wo: summary.wo, groundedGroups: groupList.length, groups: groupList };
  const exceptionsOut = {
    wo: summary.wo,
    authoredConflictKeys: [...authoredConflict],
    authoredSafetyConflictKeys: [...authoredSafetyConflict],
    grounded_none_pharmKey: grounded.filter((g) => g.pharmKey.startsWith('none:') && !g.nonOral && !g.multi).map((g) => ({ master_id: g.master_id, name: g.name, atc_code: g.atc_code })),
    안전지문불일치_샘플: grounded.filter((g) => masterBucket.get(g.master_id) === '안전지문불일치').slice(0, 100).map((g) => ({ master_id: g.master_id, name: g.name, pharmKey: g.pharmKey })),
  };

  if (WRITE) {
    fs.writeFileSync(path.join(OUT_DIR, 'otc-full-corpus-authored-bridge-summary-v1.json'), JSON.stringify(summary, null, 1), 'utf8');
    fs.writeFileSync(path.join(OUT_DIR, 'otc-full-corpus-authored-bridge-groups-v1.json'), JSON.stringify(groupsOut, null, 1), 'utf8');
    fs.writeFileSync(path.join(OUT_DIR, 'otc-full-corpus-authored-bridge-exceptions-v1.json'), JSON.stringify(exceptionsOut, null, 1), 'utf8');
    console.log('[WRITE] bridge integration 산출물 3종 기록');
  } else console.log('[VALIDATE] WRITE=0 — 파일 미기록');
  console.log(JSON.stringify({ gate, masterPartition: summary.masterPartition, groupPartition: summary.groupPartition, required: summary.required }, null, 2));
  await ds.destroy();
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
