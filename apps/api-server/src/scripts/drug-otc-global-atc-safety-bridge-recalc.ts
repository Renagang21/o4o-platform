/**
 * WO-O4O-OTC-GLOBAL-ATC-SAFETY-BRIDGE-RECALC-V1
 *
 * 통합 결과(커밋 0aa64a0ef) 위에서, 무성분명 경구·단일 7,301 master 를 단일 규칙으로 전수 재판정한다.
 *   후보 연결 키 = atc_code | 함량 | 제형 | 경로.  안전지문 = 최종 분리 키(전 요소 일치 시에만 확장).
 *   ⚠️ shard-local 대조(가·나·다 방법론 상이)를 폐기하고, 후보 풀을 grounded 19,131 전역 + authored 전량으로 통일.
 *
 * read-only · DB write 0. 로컬 DB(localhost, api-server/.env) 에서 e약은요 원문을 재추출해 안전지문을 계산한다.
 *   (안전지문은 어느 shard 산출 파일에도 export 되지 않아 원문 재추출이 불가피 — 통합 파일만으론 재계산 불능.)
 *
 * 규칙 동일성: derive/normalize/routeSig/각 *Sig 는 shard 스크립트와 동일 로직 계승(bridgeKey/지문 일치 보장).
 *   추가: 최대량(maxDoseSig)·상호작용·단일복합 포함 9요소 안전지문(WO 명세).
 *
 * 산출: otc-global-atc-safety-bridge-{summary,groups,exceptions}-v1.json
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);

/** e약은요 content → 섹션 맵 (shard 동일) */
function sections(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim();
  return out;
}
const stripTags = (s: string): string => s.replace(/<[^>]+>/g, ' ');
function normalize(s: string): string {
  return stripTags(s)
    .normalize('NFKC')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/[·・∙•▪▶►\-–—]/g, ',')
    .replace(/^\s*\d+\)\s*/gm, '')
    .replace(/[，、]/g, ',').replace(/[．。]/g, '.')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .trim();
}
function numericSig(s: string): string {
  const t = normalize(s);
  const nums = (t.match(/[0-9][0-9,.]*\s*(mg|밀리그램|㎎|㎍|마이크로그램|g|정|캡슐|회|시간|일|주|개월|mL|㎖|IU|iu|%)/gi) || [])
    .map((x) => x.replace(/\s+/g, '').toLowerCase()).sort();
  return H([...new Set(nums)].join('|'));
}
function ageSig(s: string): string {
  const t = normalize(s);
  const a = (t.match(/(만\s?)?\d+\s*세\s*(이상|이하|미만|초과)?|성인|소아|어린이|영아|유아|고령자|노인/g) || [])
    .map((x) => x.replace(/\s+/g, '')).sort();
  return H([...new Set(a)].join('|'));
}
function durationSig(s: string): string {
  const t = normalize(s);
  const d = (t.match(/\d+\s*(주|일|개월|회)\s*(이상|이내|정도|간)?/g) || []).map((x) => x.replace(/\s+/g, '')).sort();
  return H([...new Set(d)].join('|'));
}
/** 최대량(1일 최대·최대 N회/정) — WO 명세 추가 요소 */
function maxDoseSig(s: string): string {
  const t = normalize(s);
  const mx = (t.match(/(1일\s?최대|하루\s?최대|최대)[^,.]{0,20}(\d+[0-9,.]*\s*(mg|밀리그램|정|캡슐|회|㎖|mL))/gi) || [])
    .map((x) => x.replace(/\s+/g, '').toLowerCase()).sort();
  return H([...new Set(mx)].join('|'));
}
function contraSig(caution: string): string {
  const t = normalize(caution);
  const m = t.match(/(.*?)(복용하지\s?(마|않)|투여하지\s?(마|말)|복용해서는\s?안)/);
  return H(normalize(m ? m[1] : t.slice(0, 200)));
}
function pregnancySig(caution: string): string {
  const t = normalize(caution);
  const preg = /임부|임신|수유부/.test(t);
  if (!preg) return 'none';
  const ban = /임부[^.]{0,20}(복용하지|투여하지|마)|임신[^.]{0,20}(복용하지|마)/.test(t);
  return ban ? 'ban' : 'consult';
}
function additiveSig(caution: string): string {
  const t = normalize(caution);
  const a: string[] = [];
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
function derive(name: string, spec: string): { ingredient: string; strength: string; form: string; route: string; multiIngredient: boolean; nonOral: boolean } {
  const ingredient = (name.match(/\(([^()]+)\)\s*$/)?.[1] || '').trim();
  const strength = (spec || '').split(' / ')[0].trim();
  const form = /연질캡슐/.test(name) ? '연질캡슐' : /캡슐/.test(name) ? '캡슐' : /연고/.test(name) ? '연고' : /크림/.test(name) ? '크림' : /플라스타|첩부|패치|패취|카타플/.test(name) ? '첩부제' : /점안/.test(name) ? '점안액' : /시럽/.test(name) ? '시럽' : /과립|산\(/.test(name) ? '과립/산' : /정/.test(name) ? '정' : /액/.test(name) ? '액' : '기타';
  const multiIngredient = /[·,]/.test(ingredient) || (name.match(/[·]/g) || []).length >= 2;
  const route = routeSig(name);
  return { ingredient, strength, form, route, multiIngredient, nonOral: route !== 'oral' };
}

/** 9요소 안전지문(WO): 용법수치·연령·기간·최대량·금기·임신수유·상호작용·첨가제·단일복합 */
function safetySignature9(dos: string, cau: string, interaction: string, multiIngredient: boolean): string {
  return [
    numericSig(dos),
    ageSig(dos + ' ' + cau),
    durationSig(dos + ' ' + cau),
    maxDoseSig(dos),
    contraSig(cau),
    pregnancySig(cau),
    H(normalize(interaction)),
    additiveSig(cau),
    multiIngredient ? 'multi' : 'single',
  ].join(':');
}

type Rec = {
  master_id: string; item_seq: string; name: string;
  ingredient: string; strength: string; form: string; route: string;
  atc_code: string; nonOral: boolean; multiIngredient: boolean;
  authored_here: number; safety: string; fingerprint: string;
};

async function main(): Promise<void> {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'],
  });
  await ds.initialize();

  // grounded OTC 전량(19,131) — shard 스크립트와 동일 모집단(샤딩 필터만 제거).
  const rows: Array<{ master_id: string; item_seq: string; name: string; spec: string; content: string; atc_code: string | null; authored_here: number }> = await ds.query(`
    WITH pop AS (
      SELECT DISTINCT pm.id::text master_id, pi.normalized_value item_seq, pm.name, pm.specification spec
      FROM product_masters pm
      JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL
      JOIN product_identifiers pi ON pi.product_master_id=pm.id AND pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL
      WHERE pm.regulatory_type='DRUG'
    )
    SELECT pop.*, es.content,
      (SELECT e2.atc_code FROM product_drug_extensions e2 WHERE e2.product_master_id=pop.master_id::uuid AND e2.deleted_at IS NULL AND e2.atc_code IS NOT NULL AND e2.atc_code<>'' LIMIT 1) atc_code,
      (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=pop.master_id::uuid AND s.status='canonical' AND s.description_type='STORE' AND s.deleted_at IS NULL AND s.source_type IN ('mfds_drug_otc','nutrition_combo')) authored_here
    FROM pop
    JOIN LATERAL (SELECT content FROM shared_product_descriptions s WHERE s.master_id=pop.master_id::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL ORDER BY length(s.content) DESC LIMIT 1) es ON true
    ORDER BY pop.master_id
  `);
  rows.sort((a, b) => a.master_id.localeCompare(b.master_id)); // 결정론 보장(SQL 순서 무관)

  // authored canonical(전량) — atc-key 색인(재사용 설명서 존재 판정).
  const authoredRows: Array<{ mid: string; ref: string | null; name: string; spec: string; atc: string | null }> = await ds.query(`
    SELECT s.master_id::text mid, s.source_ref_id::text ref, pm.name, pm.specification spec,
      (SELECT e.atc_code FROM product_drug_extensions e WHERE e.product_master_id=pm.id AND e.deleted_at IS NULL AND e.atc_code IS NOT NULL AND e.atc_code<>'' LIMIT 1) atc
    FROM shared_product_descriptions s
    JOIN product_masters pm ON pm.id=s.master_id
    WHERE s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.language='ko' AND s.status='canonical'
      AND s.description_type='STORE' AND s.deleted_at IS NULL
  `);
  authoredRows.sort((a, b) => a.mid.localeCompare(b.mid) || (a.ref || '').localeCompare(b.ref || '')); // 결정론 보장

  // === 지문 추출(grounded 전량) ===
  const recs: Rec[] = [];
  const exceptions: any[] = [];
  for (const r of rows) {
    const sec = sections(r.content);
    const ind = sec['효능·효과'] || '';
    const dos = sec['용법·용량'] || '';
    const cau = [sec['경고'], sec['사용상 주의사항'], sec['상호작용']].filter(Boolean).join('\n');
    const interaction = sec['상호작용'] || '';
    if (!ind && !dos && !cau) { exceptions.push({ master_id: r.master_id, item_seq: r.item_seq, name: r.name, reason: 'parse_fail_no_section' }); continue; }
    const d = derive(r.name, r.spec);
    // fingerprint(그룹 키) = shard 동일: 정규화 효능·용법·주의 + 성분함량·제형·경로 지문
    const fingerprint = H([H(normalize(ind)), H(normalize(dos)), H(normalize(cau)), H(`${d.ingredient}|${d.strength}`), H(d.form), d.route].join('|'));
    recs.push({
      master_id: r.master_id, item_seq: r.item_seq, name: r.name,
      ingredient: d.ingredient, strength: d.strength, form: d.form, route: d.route,
      atc_code: r.atc_code || '', nonOral: d.nonOral, multiIngredient: d.multiIngredient,
      authored_here: r.authored_here,
      safety: safetySignature9(dos, cau, interaction, d.multiIngredient), fingerprint,
    });
  }

  // === 전역 후보 풀 (atc-key = atc|함량|제형|경로) ===
  const atcKeyOf = (x: { atc_code: string; strength: string; form: string; route: string }): string => `${x.atc_code}|${x.strength}|${x.form}|${x.route}`;
  // grounded-named 후보: 성분명 있는 경구·단일제 → identity(안전지문) 제공.
  const namedByAtc = new Map<string, { safetySigs: Set<string>; masters: Set<string>; sample: string }>();
  for (const r of recs) {
    if (r.nonOral || r.multiIngredient || !r.ingredient || !r.atc_code) continue;
    const k = atcKeyOf(r);
    const e = namedByAtc.get(k) ?? namedByAtc.set(k, { safetySigs: new Set(), masters: new Set(), sample: r.name }).get(k)!;
    e.safetySigs.add(r.safety); e.masters.add(r.master_id);
  }
  // authored 후보: atc-key → 재사용 가능 설명서 ref (전량).
  const authoredByAtc = new Map<string, { refs: Set<string>; masters: Set<string> }>();
  for (const a of authoredRows) {
    if (!a.atc) continue;
    const d = derive(a.name, a.spec);
    const k = `${a.atc}|${d.strength}|${d.form}|${d.route}`;
    const e = authoredByAtc.get(k) ?? authoredByAtc.set(k, { refs: new Set(), masters: new Set() }).get(k)!;
    if (a.ref) e.refs.add(a.ref); e.masters.add(a.mid);
  }

  // === 무성분명 경구·단일 7,301 전수 판정 (5 버킷) ===
  const BUCKETS = ['ATC후보+안전지문일치', 'ATC후보있으나_안전지문불일치', 'ATC후보없음', 'authored후보없음', '별도수동검토'] as const;
  const bucketCount: Record<string, number> = Object.fromEntries(BUCKETS.map((b) => [b, 0]));
  let atcCodeNone = 0;
  const target = recs.filter((r) => !r.nonOral && !r.multiIngredient && !r.ingredient); // 무성분명 경구·단일
  const decided: any[] = [];
  for (const m of target) {
    let bucket: string;
    let refs: string[] = [];
    if (!m.atc_code) { atcCodeNone += 1; bucket = 'ATC후보없음'; }
    else {
      const k = atcKeyOf(m);
      const named = namedByAtc.get(k);
      const authored = authoredByAtc.get(k);
      const hasNamed = !!named && named.masters.size > 0;
      const hasAuthored = !!authored && authored.refs.size > 0;
      if (!hasNamed && !hasAuthored) bucket = 'ATC후보없음';
      else if (named && named.safetySigs.has(m.safety)) {
        // 안전지문 전 요소 일치(identity 안전 차용 가능)
        if (hasAuthored) { bucket = 'ATC후보+안전지문일치'; refs = [...authored!.refs]; }
        else bucket = 'authored후보없음'; // identity 확정이나 재사용 설명서 부재 → 신규 작성
      } else if (hasNamed) bucket = 'ATC후보있으나_안전지문불일치'; // 후보 있으나 안전 불일치 → 분리 유지
      else bucket = '별도수동검토'; // authored 후보만 있고 grounded-named 안전 대조 불가 → 수동
    }
    bucketCount[bucket] += 1;
    decided.push({ master_id: m.master_id, item_seq: m.item_seq, name: m.name, atc_code: m.atc_code, strength: m.strength, form: m.form, route: m.route, fingerprint: m.fingerprint, bucket, authoredRefs: refs });
  }

  // === 버킷별 fingerprint 그룹 수(신규 작성 그룹 수 확정용) ===
  const bucketGroups: Record<string, number> = Object.fromEntries(BUCKETS.map((b) => [b, 0]));
  for (const b of BUCKETS) bucketGroups[b] = new Set(decided.filter((d) => d.bucket === b).map((d) => d.fingerprint)).size;
  // 신규 작성 필요 무성분명 fingerprint 그룹 = 재사용(안전일치) 아닌 전 master 의 distinct fingerprint
  const newAuthorFps = new Set(decided.filter((d) => d.bucket !== 'ATC후보+안전지문일치').map((d) => d.fingerprint));
  const 무성분명_신규작성_그룹수 = newAuthorFps.size;

  // === 최종 재사용 / 신규 작성 확정 ===
  const 확장추가_무성분명 = bucketCount['ATC후보+안전지문일치'];       // 무성분명 중 재사용 가능
  const 기존확장_통합 = 2732;                                          // 통합(0aa64a0ef) 검토후확장후보 제품 수
  const 최종재사용가능 = 기존확장_통합 + 확장추가_무성분명;
  const 신규작성_무성분명 = bucketCount['authored후보없음'] + bucketCount['ATC후보없음'] + bucketCount['별도수동검토'];
  const 분리유지_무성분명 = bucketCount['ATC후보있으나_안전지문불일치'];

  // apply 후보(무성분명 안전일치 → 재사용): atc-key 별 커버리지 순.
  const applyByAtc = new Map<string, { masters: number; refs: Set<string>; sample: string }>();
  for (const d of decided) {
    if (d.bucket !== 'ATC후보+안전지문일치') continue;
    const k = `${d.atc_code}|${d.strength}|${d.form}|${d.route}`;
    const e = applyByAtc.get(k) ?? applyByAtc.set(k, { masters: 0, refs: new Set(), sample: d.name }).get(k)!;
    e.masters += 1; for (const r of d.authoredRefs) e.refs.add(r);
  }
  const applyTop = [...applyByAtc.entries()].map(([k, v]) => ({ atcKey: k, masters: v.masters, authoredRefs: [...v.refs].sort(), sample: v.sample })).sort((a, b) => b.masters - a.masters || a.atcKey.localeCompare(b.atcKey));

  const summary = {
    wo: 'WO-O4O-OTC-GLOBAL-ATC-SAFETY-BRIDGE-RECALC-V1', dbWrite: 0, readOnly: true,
    groundedExtractOk: recs.length, extractFail: exceptions.length,
    무성분명경구단일_대상: target.length,
    rule: { 후보키: 'atc_code|함량|제형|경로', 분리키: '9요소 안전지문(용법수치·연령·기간·최대량·금기·임신수유·상호작용·첨가제·단일복합)', 후보풀: 'grounded-named(전역) ∪ authored(전량) — shard 경계 없음' },
    buckets: bucketCount, bucketGroups, atcCodeNone,
    최종: {
      무성분명_확장추가_제품수: 확장추가_무성분명,
      무성분명_신규작성_그룹수: 무성분명_신규작성_그룹수,
      통합_새설명서필요_그룹수: 1071,          // 통합(0aa64a0ef) named·authored無 그룹
      통합_새설명서필요_제품수: 2879,
      기존확장_통합_제품수: 기존확장_통합,
      최종_재사용가능_제품수: 최종재사용가능,
      무성분명_분리유지_제품수: 분리유지_무성분명,
      무성분명_연결불가_제품수: bucketCount['ATC후보없음'],
      무성분명_신규작성_제품수: 신규작성_무성분명,
    },
    applyTop30: applyTop.slice(0, 30),
  };

  fs.writeFileSync(path.join(OUT_DIR, 'otc-global-atc-safety-bridge-summary-v1.json'), JSON.stringify(summary, null, 2), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'otc-global-atc-safety-bridge-groups-v1.json'), JSON.stringify({ wo: summary.wo, decided, applyByAtc: applyTop }, null, 1), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'otc-global-atc-safety-bridge-exceptions-v1.json'), JSON.stringify({ wo: summary.wo, extractFail: exceptions.length, exceptions }, null, 1), 'utf8');

  console.log(JSON.stringify(summary, null, 2));
  await ds.destroy();
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
