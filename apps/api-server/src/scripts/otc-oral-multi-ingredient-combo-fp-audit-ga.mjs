// READ-ONLY atc-combo fingerprint-group audit (agent GA). DB write 0.
// Finds oral multi-ingredient (atc-keyed) fingerprint groups where a LIVE authored KO+EN sibling
// exists within the SAME full-content fingerprint group and pending (easy-only) siblings can be
// extended verbatim (zero new medical judgment).
import { readFileSync, writeFileSync } from 'node:fs';
import crypto from 'node:crypto';
const md5 = s => crypto.createHash('md5').update(s).digest('hex');
const H = s => md5(s).slice(0, 16);
const ENV = 'C:/Users/sohae/o4o-platform/apps/api-server/.env';
const pw = readFileSync(ENV, 'utf8').match(/^DB_PASSWORD=(.*)$/m)[1].trim();
const PORT = parseInt(process.env.AUDIT_DB_PORT || '5434', 10);
const stripTags = s => s.replace(/<[^>]+>/g, ' ');
function normalize(s){return stripTags(s||'').normalize('NFKC').replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/[·・∙•▪▶►\-–—]/g,',').replace(/^\s*\d+\)\s*/gm,'').replace(/[，、]/g,',').replace(/[．。]/g,'.').replace(/\s+/g,' ').replace(/\s*,\s*/g,',').trim();}
function easySections(c){const o={};const re=/<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;let m;while((m=re.exec(c)))o[m[1].trim()]=m[2].trim();return o;}
function freeSections(c){const o={};const re=/<(h[1-4]|strong)[^>]*>\s*([^<]{2,40}?)\s*<\/\1>([\s\S]*?)(?=<(?:h[1-4]|strong)[^>]*>|$)/gi;let m;while((m=re.exec(c))){const t=m[2].replace(/[:：]\s*$/,'').trim();const b=m[3].trim();if(t)o[t]=(o[t]?o[t]+'\n':'')+b;}return o;}
function bucketSections(sec){let ind='',dos='',cau='';for(const[t,b]of Object.entries(sec)){if(/효능|효과|적응|용도/.test(t))ind+=(ind?'\n':'')+b;else if(/용법|용량|복용|투여\s*방법|사용\s*방법|사용법/.test(t))dos+=(dos?'\n':'')+b;else if(/주의|경고|금기|부작용|이상\s*반응|임부|임신|수유/.test(t))cau+=(cau?'\n':'')+b;}return{ind,dos,cau};}
const formOf=n=>/연질캡슐/.test(n)?'연질캡슐':/캡슐/.test(n)?'캡슐':/연고/.test(n)?'연고':/크림/.test(n)?'크림':/플라스타|첩부|패치|패취|카타플/.test(n)?'첩부제':/점안/.test(n)?'점안액':/시럽/.test(n)?'시럽':/과립|산\(/.test(n)?'과립/산':/정/.test(n)?'정':/액/.test(n)?'액':'기타';
function routeSig(n){if(/질정|질좌|질내정|질\s?삽입/.test(n))return'vaginal';if(/좌약|좌제/.test(n))return'rectal';if(/점안|안연고/.test(n))return'ophthalmic';if(/점이액|귀에/.test(n))return'otic';if(/점비|비강/.test(n))return'nasal';if(/크림|연고|로션|로숀|겔$|겔\(|겔제|젤$|젤\(|플라스타|플라스터|첩부|카타플|패취|패치|파스|파프|스왑|스틱|거즈|탈지면|솜|네일라카|라카|외용|도포|스프레이|에어로솔|에어졸|소독|폼$|폼\(|워시|카타플라스마/.test(n))return'topical';if(/정$|정\d|정\(|정밀리|정\[|캡슐|캅셀|캅셀|시럽|현탁|과립|산제|산\(|트로키|츄어|씹|저작|드링크|내복|환$|환\(|액$|액\(|액\[|물약|시럽제/.test(n))return'oral';return'unknown';}
const ingredientOf=n=>(n.match(/\(([^()]+)\)\s*$/)?.[1]||'').trim();
const strengthOf=s=>(s||'').split(' / ')[0].trim();
function safetySigOf(dos,cau){const num=[...new Set((normalize(dos).match(/[0-9][0-9,.]*\s*(mg|밀리그램|㎎|㎍|마이크로그램|g|정|캡슐|회|시간|일|주|개월|mL|㎖|IU|iu|%)/gi)||[]).map(x=>x.replace(/\s+/g,'').toLowerCase()))].sort().join('|');const age=[...new Set((normalize(dos+' '+cau).match(/(만\s?)?\d+\s*세\s*(이상|이하|미만|초과)?|성인|소아|어린이|영아|유아|고령자|노인/g)||[]).map(x=>x.replace(/\s+/g,'')))].sort().join('|');return H(num)+':'+H(age);}
function recOf(r){let sec=easySections(r.content||'');if(Object.keys(sec).length===0)sec=freeSections(r.content||'');const{ind,dos,cau}=bucketSections(sec);const ingredient=ingredientOf(r.name);const strength=strengthOf(r.spec);const form=formOf(r.name);const route=routeSig(r.name);const multi=/[·,]/.test(ingredient)||(r.name.match(/[·]/g)||[]).length>=2;const fp=H([H(normalize(ind)),H(normalize(dos)),H(normalize(cau)),H(`${ingredient}|${strength}`),H(form),route].join('|'));return{master_id:r.master_id,name:r.name,ingredient,strength,form,route,atc:(r.atc_code||'').trim(),multi,fp,safety:safetySigOf(dos,cau),srcHash:H(normalize(r.content||''))};}

const { DataSource } = await import('typeorm');
const ds = new DataSource({ type:'postgres', host:'127.0.0.1', port:PORT, username:'o4o_api', password:pw, database:'o4o_platform', entities:[], synchronize:false, logging:['error'], extra:{ statement_timeout:300000 } });
await ds.initialize();
try {
  console.error('loading grounded meta...');
  const meta = await ds.query(`
    SELECT DISTINCT pm.id::text master_id, pm.name, pm.specification spec, e.atc_code
    FROM product_masters pm
    JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL
    WHERE pm.regulatory_type='DRUG'
      AND EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL)
    ORDER BY 1`);
  console.error('grounded masters:', meta.length);
  const contentMap = new Map();
  const ids = meta.map(m => m.master_id);
  for (let i=0;i<ids.length;i+=500){
    const chunk = ids.slice(i,i+500);
    const rows = await ds.query(`SELECT ids.master_id::text master_id, es.content FROM unnest($1::uuid[]) AS ids(master_id) JOIN LATERAL (SELECT content FROM shared_product_descriptions s WHERE s.master_id=ids.master_id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL ORDER BY length(s.content) DESC LIMIT 1) es ON true`, [chunk]);
    for (const r of rows) contentMap.set(r.master_id, r.content);
    if(i%2500===0) console.error('  content',i);
  }
  // authored ko/en canonical presence per master
  const auth = await ds.query(`SELECT master_id::text master_id,
      count(*) FILTER (WHERE COALESCE(language,'ko')='ko' AND status='canonical') ko,
      count(*) FILTER (WHERE language='en' AND status='canonical') en
    FROM shared_product_descriptions
    WHERE source_type=ANY($1) AND description_type='STORE' AND deleted_at IS NULL GROUP BY 1`, [['mfds_drug_otc','mfds_drug_otc_nutrition_combo','nutrition_combo']]);
  const authMap = new Map(); for(const a of auth) authMap.set(a.master_id, { ko:+a.ko, en:+a.en });

  const recs = meta.map(m => recOf({ ...m, content: contentMap.get(m.master_id)||'' }));
  // group by full fingerprint
  const groups = new Map();
  for (const r of recs){ (groups.get(r.fp) ?? groups.set(r.fp,[]).get(r.fp)).push(r); }
  const out = [];
  for (const [fp, mem] of groups){
    const rep = mem[0];
    // atc-keyed combo: empty ingredient, not multi-flagged, oral, size>=2
    if (rep.route!=='oral') continue;
    if (mem.length<2) continue;
    const forms=[...new Set(mem.map(m=>m.form))];
    const routes=[...new Set(mem.map(m=>m.route))];
    const safeties=[...new Set(mem.map(m=>m.safety))];
    const srcHashes=[...new Set(mem.map(m=>m.srcHash))];
    let authKo=0, authEn=0, pending=0;
    for (const m of mem){ const a=authMap.get(m.master_id); if(a&&a.ko>0){authKo++; if(a.en>0)authEn++;} else pending++; }
    out.push({ fp, atc:rep.atc, strength:rep.strength, form:rep.form, size:mem.length,
      sample:rep.name, ingredient:rep.ingredient, forms, routes:routes.length, distinctSafety:safeties.length,
      distinctSrc:srcHashes.length, authKo, authEn, pending,
      target_ids: mem.filter(m=>{const a=authMap.get(m.master_id);return !(a&&a.ko>0);}).map(m=>m.master_id).sort() });
  }
  // classify
  for (const g of out){
    const reasons=[];
    if (g.authKo<1) reasons.push('no-authored-sibling');
    if (g.authKo>=1 && g.authEn<1) reasons.push('authored-sibling-ko-only(no-en)');
    if (g.pending<1) reasons.push('fully-authored(no-pending)');
    if (g.forms.length>1) reasons.push('form-nonuniform');
    if (g.routes>1) reasons.push('route-nonuniform');
    if (g.distinctSafety>1) reasons.push('safety-nonuniform');
    if (g.distinctSrc>1) reasons.push('source-nonuniform');
    g.cls = reasons.length===0 ? 'READY_SHARED_CANONICAL' : (g.authKo>=1 && g.pending>=1 && reasons.every(r=>r==='authored-sibling-ko-only(no-en)')) ? 'READY_KO_EXTEND_EN_PENDING' : 'HOLD';
    g.reasons = reasons;
  }
  const anyAuth = out.filter(g=>g.authKo>=1).sort((a,b)=>b.pending-a.pending);
  console.error('groups_with_authored_sibling:', anyAuth.length, 'pending_sum:', anyAuth.reduce((s,g)=>s+g.pending,0));
  for(const g of anyAuth.slice(0,30)) console.error(`AUTH fp=${g.fp} atc=${g.atc} ${g.strength}|${g.form} multi? size=${g.size} authKo=${g.authKo} authEn=${g.authEn} pending=${g.pending} distSafety=${g.distinctSafety} distSrc=${g.distinctSrc} | ${g.sample}`);
  const ready = out.filter(g=>g.cls==='READY_SHARED_CANONICAL').sort((a,b)=>b.pending-a.pending);
  const readyKoOnly = out.filter(g=>g.cls==='READY_KO_EXTEND_EN_PENDING').sort((a,b)=>b.pending-a.pending);
  const hold = out.filter(g=>g.cls==='HOLD');
  const holdReasonCount={}; for(const g of hold) for(const r of g.reasons) holdReasonCount[r]=(holdReasonCount[r]||0)+1;
  const summary = {
    atc_oral_combo_fp_groups: out.length,
    total_masters: out.reduce((s,g)=>s+g.size,0),
    READY_SHARED_CANONICAL: ready.length, ready_pending_masters: ready.reduce((s,g)=>s+g.pending,0),
    READY_KO_EXTEND_EN_PENDING: readyKoOnly.length, readyKoOnly_pending: readyKoOnly.reduce((s,g)=>s+g.pending,0),
    HOLD: hold.length, holdReasonCount,
  };
  // candidate pilot subgroups: clean, small, uniform — pending easy-only clusters ready for source-grounded fresh authoring
  // genuine atc-keyed oral tablet/capsule combos, uniform source/safety, all-pending — sorted by size DESC (large-target priority)
  const OKFORM = new Set(['정','캡슐','연질캡슐']);
  const candidates = out.filter(g => g.size>=3 && !g.ingredient && OKFORM.has(g.form) && g.distinctSafety===1 && g.distinctSrc===1 && g.forms.length===1 && g.routes===1 && g.pending===g.size)
    .sort((a,b)=>b.size-a.size || (a.fp<b.fp?-1:1))
    .map(g => ({ fp:g.fp, atc:g.atc, strength:g.strength, form:g.form, size:g.size, sample:g.sample, target_ids:g.target_ids }));
  writeFileSync('C:/Users/sohae/AppData/Local/Temp/claude/c--Users-sohae-o4o-platform/831fdb57-1dfa-46b3-b7a7-789d46db9f18/scratchpad/atc-combo-candidates-bysize.json', JSON.stringify({ summary, candidates_count: candidates.length, total_pending_masters: candidates.reduce((s,c)=>s+c.size,0), candidates: candidates.slice(0,200) }, null, 1), 'utf8');
  console.log('candidates(atc-keyed 정/캡슐/연질캡슐, uniform, all-pending):', candidates.length, 'top sizes:', candidates.slice(0,15).map(c=>c.size).join(','));
  console.log(JSON.stringify(summary, null, 2));
  console.log('--- READY_SHARED_CANONICAL (top 20) ---');
  for (const g of ready.slice(0,20)) console.log(`fp=${g.fp} atc=${g.atc} ${g.strength}|${g.form} size=${g.size} authKo=${g.authKo} authEn=${g.authEn} pending=${g.pending} | ${g.sample}`);
  console.log('--- READY_KO_EXTEND_EN_PENDING (top 20) ---');
  for (const g of readyKoOnly.slice(0,20)) console.log(`fp=${g.fp} atc=${g.atc} ${g.strength}|${g.form} size=${g.size} authKo=${g.authKo} pending=${g.pending} | ${g.sample}`);
} finally { await ds.destroy(); }
