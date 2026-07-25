// WO-O4O-OTC-REMAINING-READY-SHARD-GA-V2 — 결정론 KO composer (V2 shard 전용, 에이전트 가).
//
// 공식 e약은요 원문 → content_json 충실 재구성(신규 의료 사실 0). composeKo 로직은
// 검증된 `otc-combo-ko-compose.ga.mjs` VERBATIM 이며, 대상 선정만 V2 SSOT/census 기준으로 교체했다.
//
// - 대상: otc-remaining-shard-assignment-ssot-v2.json 의 shards.ga fingerprint 만.
// - 축(성분·함량·제형·경로)은 census-v2 의 일반명코드(gencode) 를 그대로 승계 — 제품명 미개입.
//   제품명은 문서 title(표시용 대표명) 에만 쓰며 어떤 축 판정에도 개입하지 않는다.
// - DB 자격증명은 process.env(DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_NAME) 로만 받는다.
//   파일에서 비밀번호를 읽거나 출력하지 않는다.
// - EN 은 본 스크립트가 생성하지 않는다(기계번역 금지). 그룹별 손저작 후 config 에 병합한다.
//
// Usage(apps/api-server):
//   BATCH=1 npx tsx src/scripts/otc-v2-ko-compose.ga.mjs
//   FPS=fp1,fp2 OUTCFG=src/scripts/data/otc-v2-leaflet-config-batchN.ga.json npx tsx src/scripts/otc-v2-ko-compose.ga.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import 'dotenv/config';

const DATA = 'src/scripts/data';
const SSOT = `${DATA}/otc-remaining-shard-assignment-ssot-v2.json`;
const CENSUS = `${DATA}/otc-remaining-full-corpus-census-v2.json`;

// ── composeKo: 검증된 정본 VERBATIM ────────────────────────────────────────────────
function easySections(c){const o={};const re=/<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;let m;while((m=re.exec(c)))o[m[1].trim()]=m[2].trim();return o;}
const clean = s => s.replace(/&nbsp;/g,' ').replace(/\s*\n\s*/g,'\n').replace(/[ \t]+/g,' ').trim();
function soften(s){return s
  .replace(/의사 또는 약사와 상의하십시오/g,'약사와 상의하세요')
  .replace(/의사나 약사와 상의하십시오/g,'약사와 상의하세요')
  .replace(/상의하십시오/g,'상의하세요')
  .replace(/복용하지 마십시오/g,'복용하지 마세요')
  .replace(/투여하지 마십시오/g,'투여하지 마세요')
  .replace(/사용하지 마십시오/g,'사용하지 마세요')
  .replace(/복용하십시오/g,'복용하세요').replace(/사용하십시오/g,'사용하세요')
  .replace(/투여하십시오/g,'투여하세요').replace(/보관하십시오/g,'보관하세요')
  .replace(/피하십시오/g,'피하세요').replace(/지키십시오/g,'지키세요')
  .replace(/하십시오/g,'하세요');}
const getSec = (sec, re) => { for (const k of Object.keys(sec)) if (re.test(k)) return clean(sec[k]); return ''; };

// route 별 동사/라벨 — 경구 어휘를 외용·점안에 쓰지 않는다(다 세션 D5 지적 반영).
const ROUTE_VERB = {
  oral:        { label: '복용 안내', verb: '복용', useWord: '복용하세요' },
  oromucosal:  { label: '사용 안내', verb: '사용', useWord: '사용하세요' },
  ophthalmic:  { label: '점안 안내', verb: '점안', useWord: '점안하세요' },
  topical:     { label: '사용 안내', verb: '사용', useWord: '바르세요' },
  vaginal:     { label: '사용 안내', verb: '사용', useWord: '사용하세요' },
};

function composeKo(source, route){
  const rv = ROUTE_VERB[route] || ROUTE_VERB.oral;
  const sec = easySections(source);
  const eff0 = getSec(sec,/효능|효과/), use0 = getSec(sec,/용법|용량/);
  const warn0 = getSec(sec,/^경고/), cau0 = getSec(sec,/주의사항|사용상/);
  const itx0 = getSec(sec,/상호작용|병용/), adr0 = getSec(sec,/이상반응|부작용/);
  if (!eff0 || !use0 || (!cau0 && !warn0)) return null;   // 효능·용법 2축 + 주의 1축 필수
  let eff = eff0.replace(/\n+/g,' ').replace(/^이 약은\s*/,'').trim();
  eff = eff.replace(/에 사용합니다\.?\s*$/,'에 사용하는 일반의약품입니다.').replace(/사용합니다\.?\s*$/,'사용하는 일반의약품입니다.');
  if (!/일반의약품입니다\.$/.test(eff)) eff = eff.replace(/\.?\s*$/,'') + ' 증상에 사용하는 일반의약품입니다.';
  let usage = soften(use0.replace(/\n+/g,'\n')).trim();
  if (!/정해진 용법/.test(usage)) usage += '\n정해진 용법·용량을 지키세요.';
  const items = [];
  if (warn0) items.push('경고: ' + soften(warn0.replace(/\n+/g,' ')).trim());
  if (cau0){
    const flat = soften(cau0.replace(/\n+/g,' ')).replace(/\s+/g,' ').trim();
    const sents = flat.split(/(?<=(?:세요|니다|습니다))\.\s*/).map(x=>x.trim()).filter(x=>x.length>4);
    const ban=[], consult=[], other=[];
    for (const s of sents){ const t=/[.]$/.test(s)?s:s+'.'; if(/(복용하지 마세요|투여하지 마세요|사용하지 마세요)/.test(t)) ban.push(t); else if(/상의하세요|상담하세요/.test(t)) consult.push(t); else other.push(t); }
    if (ban.length) items.push(`다음 분은 ${rv.verb}하지 마세요. ` + ban.join(' '));
    if (consult.length) items.push(`${rv.verb} 전 약사와 상의하세요. ` + consult.join(' '));
    for (const o of other) if(/(정해진 용법|증상의 개선|어린이|보호자|요검사|폴산|눈|점안|피부|도포)/.test(o)) items.push(o);
  }
  if (itx0) items.push(soften(itx0.replace(/\n+/g,' ')).trim());
  if (adr0) items.push(soften(adr0.replace(/\n+/g,' ')).trim());
  const caution = items.join('\n\n');
  const effShort = eff.replace(/에 사용하는 일반의약품입니다\.$/,'').replace(/ 증상$/,'');
  const sym = effShort.split(/,|·/).map(s=>s.trim()).filter(Boolean).slice(0,6).join(', ');
  const summaryTable = { '분류':'일반의약품', '작용': effShort.length>60? effShort.slice(0,58)+'…' : effShort, '주요 증상': sym };
  const ingredientSelection = '제품에 따라 성분 구성과 함량이 다를 수 있으니, 지병이나 복용 중인 약이 있으면 매장의 약사에게 확인하세요.\n증상이 지속되거나 궁금한 점이 있으면 매장 내 약사 등 전문가와 상담하세요.';
  return { summaryTable, efficacy: eff, usage, usageLabel: rv.label, caution, ingredientSelection };
}

// ── 대상 선정: V2 SSOT(ga) + census readyGroups ───────────────────────────────────
const ssot = JSON.parse(readFileSync(SSOT,'utf8'));
const census = JSON.parse(readFileSync(CENSUS,'utf8'));
const ga = ssot.shards.ga;
const gaFp = new Set(ga.fingerprintList);
const groupsMeta = census.readyGroups.filter(g => gaFp.has(g.fp));
if (groupsMeta.length !== ga.fingerprints) throw new Error(`ga fp 불일치 ${groupsMeta.length} !== ${ga.fingerprints}`);

const ROUTE_ORDER = ['oral','topical','ophthalmic','oromucosal','nasal','vaginal','rectal'];
const sorted = [...groupsMeta].sort((a,b) =>
  (ROUTE_ORDER.indexOf(a.route) - ROUTE_ORDER.indexOf(b.route)) || (b.size - a.size) || (a.fp < b.fp ? -1 : 1));

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '20', 10);
const FPS = (process.env.FPS || '').split(',').filter(Boolean);
const BATCH = parseInt(process.env.BATCH || '0', 10);
// 배치는 route-pure 로 자른다(경로 혼합 저작 방지). route 순서 → size desc → fp asc.
const batches = [];
for (const rt of ROUTE_ORDER) {
  const arr = sorted.filter(g => g.route === rt);
  for (let i = 0; i < arr.length; i += BATCH_SIZE) batches.push(arr.slice(i, i + BATCH_SIZE));
}
const picks = FPS.length ? sorted.filter(g => FPS.includes(g.fp)) : (batches[BATCH - 1] || []);
if (!picks.length) throw new Error('대상 0 — BATCH 또는 FPS 확인');
const OUTCFG = process.env.OUTCFG || `${DATA}/otc-v2-leaflet-config-batch${BATCH}.ga.json`;

const { DataSource } = await import('typeorm');
const ds = new DataSource({
  type:'postgres', host: process.env.DB_HOST || '127.0.0.1', port: parseInt(process.env.DB_PORT || '5442', 10),
  username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'o4o_platform',
  entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 300000 },
});
await ds.initialize();
const groups = {}; let ok = 0; const skipped = [];
try {
  for (const g of picks) {
    // 원문은 그룹 내 전 master 가 동일 fp(= 동일 원문 3축)이므로 대표 1건으로 충분하다.
    const s = await ds.query(
      `SELECT content FROM shared_product_descriptions x
       WHERE x.master_id=$1::uuid AND x.source_type='mfds_easy_drug' AND x.description_type='STORE'
         AND x.status='canonical' AND COALESCE(x.language,'ko')='ko' AND x.deleted_at IS NULL
       ORDER BY length(x.content) DESC LIMIT 1`, [g.masterIds[0]]);
    const cj = composeKo(s[0]?.content || '', g.route);
    if (!cj) { skipped.push({ fp: g.fp, reason: 'source_axis_missing' }); continue; }
    // title = 표시용 대표 제품명(축 아님). 그룹 내 최빈 이름.
    const nm = await ds.query(
      `SELECT name, count(*)::int n FROM product_masters WHERE id = ANY($1::uuid[]) GROUP BY name ORDER BY n DESC, name ASC LIMIT 1`,
      [g.masterIds]);
    const title = nm[0]?.name || g.gencode;
    groups[g.fp] = {
      key: `${g.gencode}|${g.route}|${g.form}`,
      sourceType: 'mfds_drug_otc',
      targetFp: g.fp, gencode: g.gencode, route: g.route, form: g.form,
      target_master_ids: [...g.masterIds].sort(),
      title, content_json: cj,
    };
    ok++;
  }
} finally { await ds.destroy(); }

writeFileSync(OUTCFG, JSON.stringify({
  _doc: 'WO-O4O-OTC-REMAINING-READY-SHARD-GA-V2 · 결정론 KO compose(공식 e약은요 원문 충실 재구성). EN 은 그룹별 손저작 후 병합.',
  wo: 'WO-O4O-OTC-REMAINING-READY-SHARD-GA-V2', shard: 'ga', batch: BATCH || null, groups,
}, null, 1), 'utf8');
console.log(`composed ${ok}, skipped ${skipped.length} -> ${OUTCFG} (${Object.keys(groups).length} groups, ${Object.values(groups).reduce((s,g)=>s+g.target_master_ids.length,0)} masters)`);
if (skipped.length) console.log('skipped:', JSON.stringify(skipped));
