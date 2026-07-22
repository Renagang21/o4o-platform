// Deterministic KO store-leaflet composer: official easy_drug source -> content_json (faithful restructure, no synthesis).
// Emits a runner-compatible config (groups map with content_json). EN authored separately.
import { readFileSync, writeFileSync } from 'node:fs';
const pw = readFileSync('C:/Users/sohae/o4o-platform/apps/api-server/.env','utf8').match(/^DB_PASSWORD=(.*)$/m)[1].trim();
const PROD = 'C:/Users/sohae/AppData/Local/Temp/claude/c--Users-sohae-o4o-platform/831fdb57-1dfa-46b3-b7a7-789d46db9f18/scratchpad/prodscreen.json';
const OUTCFG = process.env.OUTCFG || 'src/scripts/data/otc-oral-combo-leaflet-config-batch3.ga.json';
const FPS = (process.env.FPS||'').split(',').filter(Boolean);

function easySections(c){const o={};const re=/<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;let m;while((m=re.exec(c)))o[m[1].trim()]=m[2].trim();return o;}
const clean = s => s.replace(/&nbsp;/g,' ').replace(/\s*\n\s*/g,'\n').replace(/[ \t]+/g,' ').trim();
// soften formal endings to consumer-friendly, route 의사 또는 약사 -> 약사
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
  .replace(/중지하고/g,'중지하고').replace(/하십시오/g,'하세요');}
const getSec = (sec, re) => { for (const k of Object.keys(sec)) if (re.test(k)) return clean(sec[k]); return ''; };

function composeKo(source){
  const sec = easySections(source);
  const eff0 = getSec(sec,/효능|효과/), use0 = getSec(sec,/용법|용량/);
  const warn0 = getSec(sec,/^경고/), cau0 = getSec(sec,/주의사항|사용상/);
  const itx0 = getSec(sec,/상호작용|병용/), adr0 = getSec(sec,/이상반응|부작용/);
  if (!eff0 || !use0 || (!cau0 && !warn0)) return null;
  // efficacy: "이 약은 X에 사용합니다." -> "X에 사용하는 일반의약품입니다."
  let eff = eff0.replace(/\n+/g,' ').replace(/^이 약은\s*/,'').trim();
  eff = eff.replace(/에 사용합니다\.?\s*$/,'에 사용하는 일반의약품입니다.').replace(/사용합니다\.?\s*$/,'사용하는 일반의약품입니다.');
  if (!/일반의약품입니다\.$/.test(eff)) eff = eff.replace(/\.?\s*$/,'') + ' 증상에 사용하는 일반의약품입니다.';
  // usage
  let usage = soften(use0.replace(/\n+/g,'\n')).trim();
  if (!/정해진 용법/.test(usage)) usage += '\n정해진 용법·용량을 지키세요.';
  // caution items: 경고 / 사용상주의(문단별) / 상호작용 / 이상반응
  const items = [];
  if (warn0) items.push('경고: ' + soften(warn0.replace(/\n+/g,' ')).trim());
  // 사용상 주의사항: 문장 단위로 나눠 금기(마세요)/상담(상의)/기타로 그룹화
  if (cau0){
    const flat = soften(cau0.replace(/\n+/g,' ')).replace(/\s+/g,' ').trim();
    const sents = flat.split(/(?<=(?:세요|니다|습니다))\.\s*/).map(x=>x.trim()).filter(x=>x.length>4);
    const ban=[], consult=[], other=[];
    for (const s of sents){ const t=/[.]$/.test(s)?s:s+'.'; if(/(복용하지 마세요|투여하지 마세요|사용하지 마세요|복용하지 마십시오)/.test(t)) ban.push(t); else if(/상의하세요|상담하세요/.test(t)) consult.push(t); else other.push(t); }
    if (ban.length) items.push('다음 분은 복용하지 마세요. ' + ban.join(' '));
    if (consult.length) items.push('복용 전 약사와 상의하세요. ' + consult.join(' '));
    for (const o of other) if(/(정해진 용법|증상의 개선|어린이|보호자|요검사|폴산)/.test(o)) items.push(o);
  }
  if (itx0) items.push(soften(itx0.replace(/\n+/g,' ')).trim());
  if (adr0) items.push(soften(adr0.replace(/\n+/g,' ')).trim());
  const caution = items.join('\n\n');
  // summaryTable (derived, faithful): 분류 + 작용(효능 앞부분) + 주요 증상
  const effShort = eff.replace(/에 사용하는 일반의약품입니다\.$/,'').replace(/ 증상$/,'');
  const sym = effShort.split(/,|·/).map(s=>s.trim()).filter(Boolean).slice(0,6).join(', ');
  const summaryTable = { '분류':'일반의약품', '작용': effShort.length>60? effShort.slice(0,58)+'…' : effShort, '주요 증상': sym };
  const ingredientSelection = '제품에 따라 성분 구성과 함량이 다를 수 있으니, 지병이나 복용 중인 약이 있으면 매장의 약사에게 확인하세요.\n증상이 지속되거나 궁금한 점이 있으면 매장 내 약사 등 전문가와 상담하세요.';
  return { summaryTable, efficacy: eff, usage, usageLabel:'복용 안내', caution, ingredientSelection };
}

const LIMIT = parseInt(process.env.LIMIT||'999',10);
const OFFSET = parseInt(process.env.OFFSET||'0',10);
const picks = JSON.parse(readFileSync(PROD,'utf8')).filter(r=>r.pick && (FPS.length===0 || FPS.includes(r.fp))).slice(OFFSET, OFFSET+LIMIT);
const NUTR = /^(A11|A12|A13A|B03AE)/;
const { DataSource } = await import('typeorm');
const ds = new DataSource({ type:'postgres', host:'127.0.0.1', port:parseInt(process.env.AUDIT_DB_PORT||'5455',10), username:'o4o_api', password:pw, database:'o4o_platform', entities:[], synchronize:false, logging:['error'] });
await ds.initialize();
const groups={}; let ok=0, skip=0;
try { for (const r of picks) {
  const s = await ds.query(`SELECT content FROM shared_product_descriptions x WHERE x.master_id=$1::uuid AND x.source_type='mfds_easy_drug' AND x.description_type='STORE' AND x.status='canonical' AND x.deleted_at IS NULL ORDER BY length(x.content) DESC LIMIT 1`,[r.target_ids[0]]);
  const cj = composeKo(s[0]?.content||'');
  if (!cj) { skip++; continue; }
  const slug = (r.name.replace(/[^0-9A-Za-z가-힣]/g,'').slice(0,20)) + '-' + r.fp.slice(0,8);
  const key = slug.toLowerCase().replace(/[가-힣]+/g,x=>'g');
  groups[r.fp] = { key: `${r.name}|${r.atc}|${r.strength}|${r.form}`, sourceType: NUTR.test(r.atc)?'mfds_drug_otc_nutrition_combo':'mfds_drug_otc', targetFp:r.fp, target_master_ids:r.target_ids, title:r.name, content_json: cj };
  ok++;
}} finally { await ds.destroy(); }
writeFileSync(OUTCFG, JSON.stringify({ _doc:'batch3 deterministic KO compose (faithful source restructure). EN authored separately.', groups }, null, 1),'utf8');
console.log(`composed ${ok}, skipped ${skip} -> ${OUTCFG} (${Object.keys(groups).length} groups, ${Object.values(groups).reduce((s,g)=>s+g.target_master_ids.length,0)} masters)`);
