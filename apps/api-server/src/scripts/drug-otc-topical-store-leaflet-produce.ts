/**
 * 외용제 매장용 설명서 — 공식 원문 grounded 재구성 + KO/EN canonical 적재.
 * WO-O4O-OTC-NONORAL-TOPICAL-STORE-LEAFLET-PRODUCTION-DA-V2 · 에이전트 다.
 *
 * 매장용 설명서 = 공식 easy-drug 원문(효능·용법·주의·이상반응)을 소비자 이해 가능한 표현층으로
 *   재구성(제목/요약/카드/문장분리/도포표현). **의료사실 추가 0**(효능·부위·횟수·기간 원문에서만).
 *   질환명·증상명·허가 효능은 명확히 표시. 하단에 매장 약사 상담 안내.
 * fingerprint 블록은 grounded-upgrade-runner VERBATIM(재현·target 분류 동일 산식).
 * dry-run 기본(INSERT→postVerify→ROLLBACK). apply 이중게이트: --apply + TOPICAL_APPLY_CONFIRM=YES.
 *
 * Usage: PROXY_PORT=5444 npx tsx src/scripts/drug-otc-topical-store-leaflet-produce.ts \
 *   --ingredient 테르비나핀 --form 크림 --fp <targetFp> --title "..." --slug terbinafine-cream-1pct \
 *   --en src/scripts/data/topical/otc-topical-en-<slug>.json [--apply]
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DataSource } from 'typeorm';
import { buildDrugOtcConsumerHtml } from '../modules/neture/drug-import/drug-otc-description-consumer-html.js';
import { buildDrugOtcEnConsumerHtml, type DrugOtcEnTranslation } from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
// TypeORM query() RETURNING 정규화: [rows, affected] | rows.
const retRows = <T = { id: string }>(res: unknown): T[] => (Array.isArray(res) && Array.isArray(res[0]) ? res[0] : (res as unknown[])) as T[];
const H = (s: string): string => md5(s).slice(0, 16);
const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data/topical');
const SRC_TYPE = 'o4o_drug_otc_topical';
const EASY = 'mfds_easy_drug';
const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };

// ── fingerprint = grounded-upgrade-runner VERBATIM ──
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

// ── 매장용 외용제 composer (원문 grounded, 마케팅 필드 0, 의료사실 추가 0) ──
const STORE_FOOT_KO = '이 안내는 제품 이해를 돕기 위한 매장용 설명입니다. 사용 전·후 궁금한 점이나 이상이 있으면 매장 내 약사 등 전문가와 상담하세요.';
function cleanText(s: string): string { return (s || '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim(); }
function splitSentences(s: string): string[] { return cleanText(s).split(/(?<=[가-힣])\.(?=\S)/).map((x) => x.trim()).filter(Boolean).map((x) => /[.!?]$/.test(x) ? x : x + '.'); }
function usageLabelOf(u: string): string { if (/뿌리|분무|스프레이/.test(u)) return '뿌리는 방법'; if (/바르|도포|붙이|첩부/.test(u)) return '바르는 방법'; return '사용 방법'; }
function composeTopicalKo(name: string, content: string, title: string): { html: string; missing: string[]; axes: Record<string, boolean> } {
  let sec = easySections(content || ''); if (Object.keys(sec).length === 0) sec = freeSections(content || '');
  const get = (re: RegExp): string => { for (const [t, b] of Object.entries(sec)) if (re.test(t)) return b.trim(); return ''; };
  const efficacy = cleanText(get(/효능|효과|적응/));
  const usage = splitSentences(get(/용법|용량/)).join('\n\n');
  const cautionRaw = get(/주의/); const adverse = get(/이상반응|부작용/);
  const ingredientKo = ingredientOf(name), form = formOf(name);
  const cautionParts = [...splitSentences(cautionRaw)];
  if (adverse) cautionParts.push('이상반응이 나타나면 사용을 중지하고 의사 또는 약사와 상의하세요: ' + cleanText(adverse));
  const summaryTable: Record<string, string> = { 분류: '일반의약품' };
  if (ingredientKo) summaryTable['성분'] = ingredientKo;
  if (form) summaryTable['제형'] = form;
  const built = buildDrugOtcConsumerHtml({ summaryTable, efficacy, usage, usageLabel: usageLabelOf(usage), caution: cautionParts.join('\n\n'), ingredientSelection: STORE_FOOT_KO }, { title });
  return { html: built.html, missing: built.missing, axes: { efficacy: !!efficacy, usage: !!usage, caution: !!cautionRaw, adverse: !!adverse } };
}

interface Row { id: string; name: string; spec: string; content: string; easyId: string }

async function main(): Promise<void> {
  const INGREDIENT = arg('ingredient'), FORM = arg('form'), TARGET_FP = arg('fp'), TITLE = arg('title'), SLUG = arg('slug'), EN_FILE = arg('en');
  const EXPECTED = parseInt(arg('expected', '0'), 10);
  const APPLY = process.argv.includes('--apply') && process.env.TOPICAL_APPLY_CONFIRM === 'YES';
  if (!INGREDIENT || !FORM || !TARGET_FP || !TITLE || !SLUG || !EN_FILE) throw new Error('--ingredient --form --fp --title --slug --en 필요');
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const enTr = JSON.parse(fs.readFileSync(EN_FILE, 'utf8')) as { translation: DrugOtcEnTranslation };
  const enBuilt = buildDrugOtcEnConsumerHtml(enTr.translation);
  const report: any = { wo: 'WO-O4O-OTC-NONORAL-TOPICAL-STORE-LEAFLET-PRODUCTION-DA-V2', mode: APPLY ? 'APPLY' : 'dry-run', slug: SLUG, targetFp: TARGET_FP, status: 'INIT', anomalies: [] as string[] };
  const ds = new DataSource({ type: 'postgres', host: process.env.PROXY_HOST ?? '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5444', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { statement_timeout: 120000 } });
  await ds.initialize();
  try {
    const coarse: Row[] = await ds.query(
      `SELECT pm.id::text id, pm.name, pm.specification spec, es.content, es.id::text "easyId"
       FROM product_masters pm
       JOIN LATERAL (SELECT id, content FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.source_type=$3 AND s.description_type='STORE' AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL ORDER BY length(s.content) DESC LIMIT 1) es ON true
       WHERE pm.name LIKE '%('||$1||'%)' AND pm.name LIKE '%'||$2||'%'
         AND NOT EXISTS (SELECT 1 FROM shared_product_descriptions a WHERE a.master_id=pm.id AND a.source_type IN ('mfds_drug_otc','nutrition_combo','o4o_drug_otc_topical') AND a.description_type='STORE' AND a.status='canonical' AND a.deleted_at IS NULL)
       ORDER BY pm.id`, [INGREDIENT, FORM, EASY]);
    const withFp = coarse.map((r) => ({ ...r, ...fingerprintOf(r.name, r.spec, r.content) }));
    const target = withFp.filter((r) => r.fp === TARGET_FP);
    report.coarseTotal = coarse.length; report.target = target.length;
    report.routeSet = [...new Set(target.map((r) => r.route))]; report.formSet = [...new Set(target.map((r) => r.form))];
    if (EXPECTED && target.length !== EXPECTED) report.anomalies.push(`target ${target.length} !== expected ${EXPECTED}`);
    if (report.routeSet.length !== 1 || report.routeSet[0] !== 'topical') report.anomalies.push(`route 비단일/비topical: ${JSON.stringify(report.routeSet)}`);
    if (!target.length) report.anomalies.push('target 0');
    const masterIds = target.map((r) => r.id).sort();
    // KO per-master compose (원문 grounding), 그룹 내 md5 균일 확인
    const koByMaster = new Map<string, { html: string; easyId: string }>();
    const koMd5 = new Set<string>(); let missingAny = 0;
    for (const r of target) { const k = composeTopicalKo(r.name, r.content, TITLE); if (k.missing.length) missingAny++; koByMaster.set(r.id, { html: k.html, easyId: r.easyId }); koMd5.add(md5(k.html)); }
    report.koMissing = missingAny; report.koDistinctMd5 = koMd5.size;
    if (missingAny) report.anomalies.push(`KO 필수필드 누락 ${missingAny}`);
    if (koMd5.size !== 1) report.anomalies.push(`KO md5 비균일 ${koMd5.size} (안전지문 분리 필요)`);
    // EN 검증
    report.enMd5 = md5(enBuilt.html); report.enMissing = enBuilt.missing;
    if (enBuilt.missing.length) report.anomalies.push(`EN 누락 ${enBuilt.missing.join(',')}`);
    if (/[가-힣]/.test(enBuilt.html)) report.anomalies.push('EN 한글 포함');
    const koHtml = [...koByMaster.values()][0]?.html ?? '';
    if (/복용|삼키|드십니/.test(koHtml)) report.anomalies.push('KO 경구표현(복용)');
    report.writePlan = { ko: masterIds.length * 4, en: masterIds.length * 2, total: masterIds.length * 6 };

    if (report.anomalies.length) { report.status = 'ABORT'; throw new Error(`이상 ${report.anomalies.length} → ABORT\n  ${report.anomalies.join('\n  ')}`); }

    const qr = ds.createQueryRunner(); await qr.connect(); await qr.startTransaction();
    try {
      let koIns = 0, enIns = 0, demoted = 0, flippedKo = 0, flippedEn = 0, audited = 0;
      for (const mid of masterIds) {
        const ko = koByMaster.get(mid)!;
        // STEP A: KO+EN needs_review INSERT (멱등)
        const a1 = retRows(await qr.query(
          `INSERT INTO shared_product_descriptions (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
           SELECT $1::uuid,$2::text,NULL,$3::varchar,$4::uuid,'needs_review','ko','STORE',now(),now()
           WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=$1::uuid AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type=$3::varchar AND s.deleted_at IS NULL)
           RETURNING id`, [mid, ko.html, SRC_TYPE, ko.easyId]));
        koIns += a1.length;
        const a2 = retRows(await qr.query(
          `INSERT INTO shared_product_descriptions (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
           SELECT $1::uuid,$2::text,NULL,$3::varchar,$4::uuid,'needs_review','en','STORE',now(),now()
           WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=$1::uuid AND s.description_type='STORE' AND s.language='en' AND s.source_type=$3::varchar AND s.deleted_at IS NULL)
           RETURNING id`, [mid, enBuilt.html, SRC_TYPE, ko.easyId]));
        enIns += a2.length;
        // STEP B: demote easy ko canonical → deprecated; flip ko+en needs_review → canonical
        const cur = retRows<{ id: string; source_type: string }>(await qr.query(`SELECT id::text id, source_type FROM shared_product_descriptions WHERE master_id=$1::uuid AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL`, [mid]));
        if (cur.length !== 1) throw new Error(`master ${mid} ko canonical ${cur.length} → ABORT`);
        if (cur[0].source_type !== EASY) throw new Error(`master ${mid} canonical source ${cur[0].source_type} 예상밖 → ABORT`);
        const easyId = cur[0].id;
        const dm = retRows(await qr.query(`UPDATE shared_product_descriptions SET status='deprecated', updated_at=now() WHERE id=$1::uuid AND status='canonical' RETURNING id`, [easyId]));
        if (dm.length !== 1) throw new Error(`master ${mid} easy demote ${dm.length} → ABORT`);
        demoted++;
        const fk = retRows<{ id: string }>(await qr.query(`UPDATE shared_product_descriptions SET status='canonical', curated_at=now() WHERE master_id=$1::uuid AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND source_type=$2 AND status='needs_review' AND deleted_at IS NULL RETURNING id`, [mid, SRC_TYPE]));
        if (fk.length !== 1) throw new Error(`master ${mid} ko flip ${fk.length} → ABORT`);
        flippedKo++;
        const fe = retRows(await qr.query(`UPDATE shared_product_descriptions SET status='canonical', curated_at=now() WHERE master_id=$1::uuid AND description_type='STORE' AND language='en' AND source_type=$2 AND status='needs_review' AND deleted_at IS NULL RETURNING id`, [mid, SRC_TYPE]));
        if (fe.length !== 1) throw new Error(`master ${mid} en flip ${fe.length} → ABORT`);
        flippedEn++;
        await qr.query(
          `INSERT INTO shared_product_description_audit_logs (event_type, description_type, master_id, language, previous_description_id, new_description_id, previous_status, new_status, metadata, performed_at)
           VALUES ('canonical_replaced','STORE',$1::uuid,'ko',$2::uuid,$3::uuid,'canonical','canonical',$4::jsonb, now())`,
          [mid, easyId, fk[0].id, JSON.stringify({ previousSource: EASY, newSource: SRC_TYPE, route: 'topical', composedFromSource: true, slug: SLUG, groupKey: `${INGREDIENT}|${FORM}|topical`, targetFp: TARGET_FP, wo: report.wo })]);
        audited++;
      }
      report.writeActual = { koIns, enIns, demoted, flippedKo, flippedEn, audited, total: koIns + enIns + demoted + flippedKo + flippedEn };
      // post-verify
      const post = (await qr.query(`
        SELECT count(*) FILTER (WHERE koc=1)::int ko1, count(*) FILTER (WHERE enc=1)::int en1, count(*) FILTER (WHERE dep)::int dep,
               count(*) FILTER (WHERE koc>1 OR enc>1)::int dup, count(*) FILTER (WHERE koauth)::int koauth
        FROM (SELECT mid,
          (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) koc,
          (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL) enc,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type=$2 AND s.deleted_at IS NULL) koauth,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='deprecated' AND s.source_type=$3 AND s.description_type='STORE' AND s.deleted_at IS NULL) dep
          FROM unnest($1::uuid[]) mid) t`, [masterIds, SRC_TYPE, EASY]))[0];
      report.post = { koCanonical1: post.ko1, enCanonical1: post.en1, deprecatedEasy: post.dep, dup: post.dup, koAuthored: post.koauth };
      const T = masterIds.length;
      if (post.ko1 !== T || post.en1 !== T || post.dep !== T || post.dup !== 0 || post.koauth !== T) { report.postVerifyPass = false; throw new Error(`postVerify 실패 ${JSON.stringify(report.post)} (T=${T}) → ROLLBACK`); }
      report.postVerifyPass = true;
      if (APPLY) { await qr.commitTransaction(); report.status = 'APPLIED'; }
      else { await qr.rollbackTransaction(); report.status = 'DRY_RUN_OK'; }
    } catch (e) { await qr.rollbackTransaction(); throw e; } finally { await qr.release(); }
    // manifest
    if (report.status === 'APPLIED') fs.writeFileSync(path.join(OUT_DIR, `otc-topical-${SLUG}.manifest.json`), JSON.stringify({ slug: SLUG, targetFp: TARGET_FP, masterIds, koMd5: [...koMd5][0], enMd5: report.enMd5 }, null, 1));
  } catch (e) { report.error = e instanceof Error ? e.message : String(e); if (report.status === 'INIT') report.status = 'FAIL'; }
  finally { await ds.destroy(); }
  fs.writeFileSync(path.join(OUT_DIR, `otc-topical-${SLUG}.run.json`), JSON.stringify(report, null, 1));
  console.log(JSON.stringify({ slug: report.slug, status: report.status, coarse: report.coarseTotal, target: report.target, route: report.routeSet, koDistinctMd5: report.koDistinctMd5, writePlan: report.writePlan, writeActual: report.writeActual, post: report.post, anomalies: report.anomalies, error: report.error }, null, 1));
  if (report.error && report.status !== 'DRY_RUN_OK' && report.status !== 'APPLIED') process.exit(1);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
