/**
 * 외용제 매장용 설명서 — 약물 단위 배치 생산(단일 연결·fp 루프). 검증본(a25796959) core 재사용.
 * WO-O4O-OTC-TOPICAL-STORE-LEAFLET-CONTINUOUS-PRODUCTION-DA-V4 · 에이전트 다.
 * per-fp 계약(compose per-master·apply TX·postVerify)은 검증본과 동일. efficacy-key 가드로 이질 fp HOLD.
 * dry-run 기본. apply: --apply + TOPICAL_APPLY_CONFIRM=YES.
 * Usage: PROXY_PORT=54xx npx tsx src/scripts/drug-otc-topical-store-leaflet-batch.ts \
 *   --ingredient 테르비나핀 --form 크림 --title "..." --en <en.json> --effkey "피부진균감염증|족부백선" --slugbase terbinafine-cream [--wo-id WO-...] [--apply] [--max N]
 *   WO ID 해석 우선순위: --wo-id > EN config(woId ?? wo) > env TOPICAL_WO_ID > 없으면 실행 중지 (하드코딩 금지)
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DataSource } from 'typeorm';
import { buildDrugOtcConsumerHtml } from '../modules/neture/drug-import/drug-otc-description-consumer-html.js';
import { buildDrugOtcEnConsumerHtml, type DrugOtcEnTranslation } from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const retRows = <T = { id: string }>(res: unknown): T[] => (Array.isArray(res) && Array.isArray(res[0]) ? res[0] : (res as unknown[])) as T[];
const H = (s: string): string => md5(s).slice(0, 16);
const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data/topical');
const SRC_TYPE = 'o4o_drug_otc_topical';
const EASY = 'mfds_easy_drug';
const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };

const stripTags = (s: string): string => s.replace(/<[^>]+>/g, ' ');
function normalize(s: string): string {
  return stripTags(s || '').normalize('NFKC').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/[·・∙•▪▶►\-–—]/g, ',').replace(/^\s*\d+\)\s*/gm, '').replace(/[，、]/g, ',').replace(/[．。]/g, '.').replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',').trim();
}
function easySections(content: string): Record<string, string> {
  const out: Record<string, string> = {}; const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g; let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim(); return out;
}
function freeSections(content: string): Record<string, string> {
  const out: Record<string, string> = {}; const re = /<(h[1-4]|strong)[^>]*>\s*([^<]{2,40}?)\s*<\/\1>([\s\S]*?)(?=<(?:h[1-4]|strong)[^>]*>|$)/gi; let m: RegExpExecArray | null;
  while ((m = re.exec(content))) { const title = m[2].replace(/[:：]\s*$/, '').trim(); const body = m[3].trim(); if (title) out[title] = (out[title] ? out[title] + '\n' : '') + body; }
  return out;
}
function bucketSections(sec: Record<string, string>): { ind: string; dos: string; cau: string } {
  let ind = '', dos = '', cau = '';
  for (const [t, b] of Object.entries(sec)) {
    if (/효능|효과|적응|용도/.test(t)) ind += (ind ? '\n' : '') + b;
    else if (/용법|용량|복용|투여\s*방법|사용\s*방법|사용법/.test(t)) dos += (dos ? '\n' : '') + b;
    else if (/주의|경고|금기|부작용|이상\s*반응|임부|임신|수유/.test(t)) cau += (cau ? '\n' : '') + b;
  }
  return { ind, dos, cau };
}
function formOf(name: string): string {
  return /연질캡슐/.test(name) ? '연질캡슐' : /캡슐/.test(name) ? '캡슐' : /연고/.test(name) ? '연고' : /크림/.test(name) ? '크림'
    : /플라스타|첩부|패치|패취|카타플/.test(name) ? '첩부제' : /점안/.test(name) ? '점안액' : /시럽/.test(name) ? '시럽'
    : /과립|산\(/.test(name) ? '과립/산' : /정/.test(name) ? '정' : /액/.test(name) ? '액' : '기타';
}
function routeSig(name: string): string {
  if (/질정|질좌|질내정|질\s?삽입/.test(name)) return 'vaginal';
  if (/좌약|좌제/.test(name)) return 'rectal';
  if (/주사|수액|펜주|프리필드/.test(name)) return 'injection';
  if (/투석|관류/.test(name)) return 'dialysis';
  if (/가글|양치/.test(name)) return 'gargle';
  if (/점안|안연고/.test(name)) return 'ophthalmic';
  if (/점이액|귀에/.test(name)) return 'otic';
  if (/점비|비강|나잘|나살/.test(name)) return 'nasal';
  if (/크림|연고|로션|로숀|겔$|겔\(|겔제|젤$|젤\(|플라스타|플라스터|첩부|카타플|패취|패치|파스|파프|스왑|스틱|거즈|탈지면|솜|네일라카|라카|외용|도포|스프레이|에어로솔|에어졸|소독|폼$|폼\(|워시|카타플라스마/.test(name)) return 'topical';
  if (/정$|정\d|정\(|정밀리|정\[|캡슐|캅셀|시럽|현탁|과립|산제|산\(|트로키|츄어|씹|저작|드링크|내복|환$|환\(|액$|액\(|액\[|물약|시럽제/.test(name)) return 'oral';
  return 'unknown';
}
const ingredientOf = (name: string): string => (name.match(/\(([^()]+)\)\s*$/)?.[1] || '').trim();
const strengthOf = (spec: string): string => (spec || '').split(' / ')[0].trim();
function fingerprintOf(name: string, spec: string, content: string): { fp: string; route: string; form: string; ingredient: string } {
  let sec = easySections(content || ''); if (Object.keys(sec).length === 0) sec = freeSections(content || '');
  const { ind, dos, cau } = bucketSections(sec);
  const ingredient = ingredientOf(name), strength = strengthOf(spec), form = formOf(name), route = routeSig(name);
  const fp = H([H(normalize(ind)), H(normalize(dos)), H(normalize(cau)), H(`${ingredient}|${strength}`), H(form), route].join('|'));
  return { fp, route, form, ingredient };
}

const STORE_FOOT_KO = '이 안내는 제품 이해를 돕기 위한 매장용 설명입니다. 사용 전·후 궁금한 점이나 이상이 있으면 매장 내 약사 등 전문가와 상담하세요.';
/** V5: 원문 전체 맥락이 피부 외용으로 명확('외용으로만/외용으로 사용' 명시)한 경우에 한해, 원문 데이터의 경구 오기(복용하지 마십시오/복용을 중지)를 외용 표현으로 정규화. 그 외 경구 표현은 기존 가드(HOLD_KO) 유지. */
function normalizeOralMisphrase(text: string, fullContent: string): string {
  if (!/외용으로만|외용으로 사용|도포|바르|바릅|발라/.test(stripTags(fullContent || ''))) return text; // '도포'·'바르-'(활용형 바릅/발라 포함)=외용 적용 명시(경구제 원문에는 등장하지 않음)
  return text.replace(/복용하지 마십시오/g, '사용하지 마십시오').replace(/복용을 (즉각 )?중지/g, '사용을 $1중지')
    .replace(/복용한 경우/g, '먹었을 경우').replace(/(잘못|실수로) 삼킨 경우/g, '$1 먹었을 경우').replace(/이 약을 삼킨 경우/g, '이 약을 먹었을 경우') // 우발적 경구섭취 안내(의미 보존 재표현)
    .replace(/삼키지 마십시오/g, '먹지 마십시오').replace(/삼키지 않도록/g, '먹지 않도록') // 외용전용 지시(의미 보존 재표현)
    .replace(/내복용/g, '먹는 용도') // '내복용으로 사용하지 마십시오' 등 외용전용 경고(의미 보존 재표현)
    .replace(/다른 약을 복용하고 있(을|는) 경우/g, '다른 약을 사용하고 있$1 경우') // 상호작용 병용 안내(복용→사용, 의미 보존: 먹는 약 포함 전체 약물로 확장)
    .replace(/함께 복용 시/g, '함께 사용 시'); // 상호작용 '…약물과 함께 복용 시 상의' 병용 안내(복용→사용, 의미 보존 확장 — 디클로페낙 스팅겔·디페낙겔형)
}
function cleanText(s: string): string { return (s || '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim(); }
function splitSentences(s: string): string[] { return cleanText(s).split(/(?<=[가-힣])\.(?=\S)/).map((x) => x.trim()).filter(Boolean).map((x) => /[.!?]$/.test(x) ? x : x + '.'); }
function usageLabelOf(u: string): string { if (/뿌리|분무|스프레이/.test(u)) return '뿌리는 방법'; if (/바르|도포|붙이|첩부/.test(u)) return '바르는 방법'; return '사용 방법'; }
function efficacyOf(content: string): string { let sec = easySections(content || ''); if (!Object.keys(sec).length) sec = freeSections(content || ''); for (const [t, b] of Object.entries(sec)) if (/효능|효과|적응/.test(t)) return cleanText(b); return ''; }
function composeTopicalKo(name: string, content: string, title: string): { html: string; missing: string[] } {
  let sec = easySections(content || ''); if (Object.keys(sec).length === 0) sec = freeSections(content || '');
  const get = (re: RegExp): string => { for (const [t, b] of Object.entries(sec)) if (re.test(t)) return b.trim(); return ''; };
  const efficacy = cleanText(get(/효능|효과|적응/));
  const usage = splitSentences(normalizeOralMisphrase(get(/용법|용량/), content)).join('\n\n');
  const warning = normalizeOralMisphrase(get(/^경고|(?<!주의)경고/), content); // V5: 경고 섹션 보존(누락=안전정보 약화 금지)
  const cautionRaw = normalizeOralMisphrase(get(/주의/), content); const adverse = normalizeOralMisphrase(get(/이상반응|부작용/), content);
  const ingredientKo = ingredientOf(name), form = formOf(name);
  const interact = normalizeOralMisphrase(get(/상호작용/), content); // V5: 상호작용 섹션 보존
  const cautionParts = [...splitSentences(warning), ...splitSentences(cautionRaw), ...splitSentences(interact)];
  if (adverse) cautionParts.push('이상반응이 나타나면 사용을 중지하고 의사 또는 약사와 상의하세요: ' + cleanText(adverse));
  const summaryTable: Record<string, string> = { 분류: '일반의약품' };
  if (ingredientKo) summaryTable['성분'] = ingredientKo;
  if (form) summaryTable['제형'] = form;
  const built = buildDrugOtcConsumerHtml({ summaryTable, efficacy, usage, usageLabel: usageLabelOf(usage), caution: cautionParts.join('\n\n'), ingredientSelection: STORE_FOOT_KO }, { title });
  return { html: built.html, missing: built.missing };
}

interface Row { id: string; name: string; spec: string; content: string; easyId: string; fp: string; route: string }

async function main(): Promise<void> {
  const INGREDIENT = arg('ingredient'), FORM = arg('form'), TITLE = arg('title'), EN_FILE = arg('en'), SLUGBASE = arg('slugbase');
  // --assume-route topical: routeSig가 'unknown'을 반환한 경우에만 지정 route로 간주한다.
  // 양성 분류(ophthalmic/oral/injection/dialysis/gargle/vaginal/rectal/otic/nasal)는 절대 override하지 않는다.
  const ASSUME_ROUTE = arg('assume-route', '');
  if (ASSUME_ROUTE && ASSUME_ROUTE !== 'topical') throw new Error('--assume-route는 topical만 허용');
  const EFFKEYS = arg('effkey').split(',').map((s) => s.trim()).filter(Boolean);
  const MAX = parseInt(arg('max', '9999'), 10);
  const APPLY = process.argv.includes('--apply') && process.env.TOPICAL_APPLY_CONFIRM === 'YES';
  if (!INGREDIENT || !FORM || !TITLE || !EN_FILE || !SLUGBASE || !EFFKEYS.length) throw new Error('--ingredient --form --title --en --slugbase --effkey 필요');
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const enConfig = JSON.parse(fs.readFileSync(EN_FILE, 'utf8')) as { wo?: string; woId?: string; translation: DrugOtcEnTranslation };
  const enBuilt = buildDrugOtcEnConsumerHtml(enConfig.translation);
  if (enBuilt.missing.length || /[가-힣]/.test(enBuilt.html)) throw new Error('EN invalid: ' + enBuilt.missing.join(','));
  // WO ID는 하드코딩하지 않는다. 우선순위: ① CLI --wo-id ② config(EN json woId ?? wo) ③ 환경변수 TOPICAL_WO_ID ④ 없으면 실행 중지
  const WO_ID = arg('wo-id') || enConfig.woId || enConfig.wo || process.env.TOPICAL_WO_ID || '';
  if (!WO_ID) throw new Error('WO ID 필요: --wo-id 또는 EN config의 woId/wo 또는 env TOPICAL_WO_ID 중 하나를 지정하십시오');
  const ds = new DataSource({ type: 'postgres', host: process.env.PROXY_HOST ?? '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5455', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { statement_timeout: 120000 } });
  await ds.initialize();
  const summary: any = { wo: WO_ID, ingredient: INGREDIENT, form: FORM, slugbase: SLUGBASE, assumeRoute: ASSUME_ROUTE || null, mode: APPLY ? 'APPLY' : 'dry-run', producedFps: [], heldFps: [], masters: 0, koWrite: 0, enWrite: 0 };
  try {
    const coarse: Row[] = await ds.query(`SELECT pm.id::text id, pm.name, pm.specification spec, es.content, es.id::text "easyId"
      FROM product_masters pm JOIN LATERAL (SELECT id, content FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.source_type=$3 AND s.description_type='STORE' AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL ORDER BY length(s.content) DESC LIMIT 1) es ON true
      WHERE pm.name LIKE '%('||$1||'%)' AND pm.name LIKE '%'||$2||'%' AND pm.name NOT LIKE '%수출%'
        AND NOT EXISTS (SELECT 1 FROM shared_product_descriptions a WHERE a.master_id=pm.id AND a.source_type IN ('mfds_drug_otc','nutrition_combo','o4o_drug_otc_topical') AND a.description_type='STORE' AND a.status='canonical' AND a.deleted_at IS NULL)
      ORDER BY pm.id`, [INGREDIENT, FORM, EASY]);
    const withFp = coarse.map((r) => ({ ...r, ...fingerprintOf(r.name, r.spec, r.content) }));
    const byFp = new Map<string, Row[]>();
    for (const r of withFp) {
      // 'oral' 판정이 오직 이름 말미 '액(...)' 패턴에서 온 약한 신호이고(강한 경구 신호 부재),
      // 원문이 '외용으로만/외용으로 적용'을 명시하는 경우에 한해 --assume-route 재분류를 허용한다.
      // 정·캡슐·시럽 등 강한 경구 신호가 있으면 절대 override하지 않는다.
      const strongOral = /정$|정\d|정\(|캡슐|캅셀|시럽|현탁|과립|산제|트로키|츄어|씹|저작|드링크|내복|환$|환\(/.test(r.name);
      const contentTopicalOnly = /외용으로만|외용으로 적용/.test(stripTags(r.content || ''));
      const reclassifiable = r.route === 'unknown' || (r.route === 'oral' && !strongOral && contentTopicalOnly);
      const effRoute = reclassifiable && ASSUME_ROUTE ? ASSUME_ROUTE : r.route;
      if (effRoute !== 'topical') continue;
      if (!byFp.has(r.fp)) byFp.set(r.fp, []); byFp.get(r.fp)!.push(r as Row);
    }
    const fps = [...byFp.entries()].sort((a, b) => b[1].length - a[1].length);
    let done = 0;
    for (const [fp, rows] of fps) {
      if (done >= MAX) break;
      const eff = efficacyOf(rows[0].content);
      if (!EFFKEYS.some((k) => eff.includes(k))) { summary.heldFps.push({ fp, n: rows.length, reason: 'HOLD_EFF_MISMATCH', effSample: eff.slice(0, 40) }); continue; }
      const koByMaster = new Map<string, { html: string; easyId: string }>(); const koMd5 = new Set<string>(); let miss = 0;
      for (const r of rows) { const k = composeTopicalKo(r.name, r.content, TITLE); if (k.missing.length) miss++; koByMaster.set(r.id, { html: k.html, easyId: r.easyId }); koMd5.add(md5(k.html)); }
      if (miss || koMd5.size !== 1 || /복용|삼키/.test([...koByMaster.values()][0].html)) { summary.heldFps.push({ fp, n: rows.length, reason: 'HOLD_KO', miss, md5: koMd5.size }); continue; }
      const masterIds = rows.map((r) => r.id).sort();
      const qr = ds.createQueryRunner(); await qr.connect(); await qr.startTransaction();
      try {
        for (const mid of masterIds) {
          const ko = koByMaster.get(mid)!;
          await qr.query(`INSERT INTO shared_product_descriptions (master_id,content,summary,source_type,source_ref_id,status,language,description_type,created_at,updated_at) SELECT $1::uuid,$2::text,NULL,$3::varchar,$4::uuid,'needs_review','ko','STORE',now(),now() WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=$1::uuid AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type=$3::varchar AND s.deleted_at IS NULL)`, [mid, ko.html, SRC_TYPE, ko.easyId]);
          await qr.query(`INSERT INTO shared_product_descriptions (master_id,content,summary,source_type,source_ref_id,status,language,description_type,created_at,updated_at) SELECT $1::uuid,$2::text,NULL,$3::varchar,$4::uuid,'needs_review','en','STORE',now(),now() WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=$1::uuid AND s.description_type='STORE' AND s.language='en' AND s.source_type=$3::varchar AND s.deleted_at IS NULL)`, [mid, enBuilt.html, SRC_TYPE, ko.easyId]);
          const cur = retRows<{ id: string; source_type: string }>(await qr.query(`SELECT id::text id, source_type FROM shared_product_descriptions WHERE master_id=$1::uuid AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL`, [mid]));
          if (cur.length !== 1 || cur[0].source_type !== EASY) throw new Error(`${mid} canonical ${cur.length}/${cur[0]?.source_type}`);
          const easyId = cur[0].id;
          if (retRows(await qr.query(`UPDATE shared_product_descriptions SET status='deprecated',updated_at=now() WHERE id=$1::uuid AND status='canonical' RETURNING id`, [easyId])).length !== 1) throw new Error(`${mid} demote`);
          const fk = retRows<{ id: string }>(await qr.query(`UPDATE shared_product_descriptions SET status='canonical',curated_at=now() WHERE master_id=$1::uuid AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND source_type=$2::varchar AND status='needs_review' AND deleted_at IS NULL RETURNING id`, [mid, SRC_TYPE]));
          if (fk.length !== 1) throw new Error(`${mid} koflip`);
          if (retRows(await qr.query(`UPDATE shared_product_descriptions SET status='canonical',curated_at=now() WHERE master_id=$1::uuid AND description_type='STORE' AND language='en' AND source_type=$2::varchar AND status='needs_review' AND deleted_at IS NULL RETURNING id`, [mid, SRC_TYPE])).length !== 1) throw new Error(`${mid} enflip`);
          await qr.query(`INSERT INTO shared_product_description_audit_logs (event_type,description_type,master_id,language,previous_description_id,new_description_id,previous_status,new_status,metadata,performed_at) VALUES ('canonical_replaced','STORE',$1::uuid,'ko',$2::uuid,$3::uuid,'canonical','canonical',$4::jsonb,now())`, [mid, easyId, fk[0].id, JSON.stringify({ previousSource: EASY, newSource: SRC_TYPE, route: 'topical', composedFromSource: true, slug: `${SLUGBASE}-${fp}`, targetFp: fp, wo: summary.wo })]);
        }
        const T = masterIds.length;
        const post = (await qr.query(`SELECT count(*) FILTER (WHERE koc=1)::int ko1,count(*) FILTER (WHERE enc=1)::int en1,count(*) FILTER (WHERE dep)::int dep,count(*) FILTER (WHERE koc>1 OR enc>1)::int dup FROM (SELECT mid,(SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) koc,(SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL) enc,EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='deprecated' AND s.source_type=$2 AND s.description_type='STORE' AND s.deleted_at IS NULL) dep FROM unnest($1::uuid[]) mid) t`, [masterIds, EASY]))[0];
        if (post.ko1 !== T || post.en1 !== T || post.dep !== T || post.dup !== 0) { await qr.rollbackTransaction(); summary.heldFps.push({ fp, n: T, reason: 'POSTVERIFY_FAIL', post }); continue; }
        if (APPLY) { await qr.commitTransaction(); summary.producedFps.push({ fp, n: T }); summary.masters += T; summary.koWrite += T * 4; summary.enWrite += T * 2; done++; }
        else { await qr.rollbackTransaction(); summary.producedFps.push({ fp, n: T, dryRun: true }); done++; }
      } catch (e) { try { await qr.rollbackTransaction(); } catch { /* noop */ } summary.heldFps.push({ fp, n: masterIds.length, reason: 'ERR', err: e instanceof Error ? e.message : String(e) }); }
      finally { await qr.release(); }
    }
  } finally { await ds.destroy(); }
  fs.writeFileSync(path.join(OUT_DIR, `otc-topical-batch-${SLUGBASE}.run.json`), JSON.stringify(summary, null, 1));
  console.log(JSON.stringify({ slugbase: SLUGBASE, mode: summary.mode, producedFps: summary.producedFps.length, masters: summary.masters, koWrite: summary.koWrite, enWrite: summary.enWrite, held: summary.heldFps.length }, null, 1));
}
main().catch((e) => { try { fs.writeFileSync(path.join(OUT_DIR, '_batch-error.txt'), (e instanceof Error ? (e.stack || e.message) : String(e)), 'utf8'); } catch { /* noop */ } console.error('FATAL'); process.exit(1); });
