/**
 * WO-O4O-OTC-TRACK-A-3H-PRODUCTION-GA-V1 — 3H 생산용 외부 config 생성기 (에이전트 가, read-only, DB write 0)
 *
 * 공용 runner registry(.ts) 미수정. bridge full-content fingerprint 정본으로 미완료 READY_SINGLE 후보를
 * target 수 내림차순 선정하고, ko/en 을 검증한 뒤 **자기 전용 외부 config JSON**(bundle runner 소비용)을 산출한다.
 *
 * 제외: 완료 groupKey(ko/en runner registry .ts 동적 파생) · EXTRA_EXCLUDE(타 에이전트 active claim) ·
 *       비경구 · 민감 약효군 · ingredient 빈 복합제 · fp 재현 실패 · reviewed EN sibling 부재 ·
 *       otc-en-translations-v1.json 번역 build != live out en(byte-identical 실패).
 *
 * 선정 후보만 config 에 등재 = ko/en 각 alias 맵. translationFile 은 v1 공용 파일 참조(read-only). order = target desc.
 * Usage: DB_HOST=127.0.0.1 DB_PORT=5442 ... npx tsx src/scripts/drug-otc-track-a-3h-config-gen.ts [--max=N]
 * 산출: src/scripts/data/otc-ko-en-bundle-track-a-3h-ga.config.json  +  ...audit.json
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildDrugOtcEnConsumerHtml } from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const BRIDGE = path.resolve(OUT_DIR, 'otc-full-corpus-authored-bridge-groups-v1.json');
const TR_DIR = path.resolve(process.cwd(), '../../docs/guides/products/drug/pilot-en-design/translations');
const V1_FILE = 'otc-en-translations-v1.json';
const BUCKET = 'authored그대로확장';
const SENSITIVE_RE = /아스피린|아세틸살리실산|와파린|클로피도그렐|헤파린|덱사메타손|프레드니솔론|하이드로코르티손|모르핀|코데인|메칠페니데이트|인슐린|레보티록신/;
const AUTHORED_SOURCES = ['mfds_drug_otc', 'nutrition_combo'];
const EVAL_LIMIT = 40;
const MAX_PICK = parseInt((process.argv.find((a) => a.startsWith('--max=')) || '--max=10').split('=')[1], 10);

/** 타 에이전트 active claim(미완료·registry 미등재 가능) — 충돌 방지 제외. */
const EXTRA_EXCLUDE = new Set<string>([
  '이부프로펜아르기닌|368.9밀리그램|정',      // agent-da (ibuprofen-arginine-368mg)
  '알파칼시돌|1마이크로그램|연질캡슐',        // agent-da (alfacalcidol-1mcg)
]);
const EXTRA_EXCLUDE_INGREDIENT = [/다당체철|폴리사카라이드|다당류철|철다당/]; // agent-da polysaccharide-iron

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);

function loadDoneGroupKeys(): Set<string> {
  const files = ['src/scripts/drug-otc-grounded-upgrade-runner.ts', 'src/scripts/drug-otc-en-complete-runner.ts']
    .map((f) => path.resolve(process.cwd(), f));
  const done = new Set<string>();
  for (const f of files) { if (!fs.existsSync(f)) continue; for (const m of fs.readFileSync(f, 'utf8').matchAll(/key:\s*'([^']+)'/g)) done.add(m[1]); }
  return done;
}

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
    else if (/상호\s*작용|병용/.test(t)) { /* skip */ }
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
  if (/점비|비강/.test(name)) return 'nasal';
  if (/크림|연고|로션|로숀|겔$|겔\(|겔제|젤$|젤\(|플라스타|플라스터|첩부|카타플|패취|패치|파스|파프|스왑|스틱|거즈|탈지면|솜|네일라카|라카|외용|도포|스프레이|에어로솔|에어졸|소독|폼$|폼\(|워시|카타플라스마/.test(name)) return 'topical';
  if (/정$|정\d|정\(|정밀리|정\[|캡슐|캅셀|시럽|현탁|과립|산제|산\(|트로키|츄어|씹|저작|드링크|내복|환$|환\(|액$|액\(|액\[|물약|시럽제/.test(name)) return 'oral';
  return 'unknown';
}
const ingredientOf = (name: string): string => (name.match(/\(([^()]+)\)\s*$/)?.[1] || '').trim();
const strengthOf = (spec: string): string => (spec || '').split(' / ')[0].trim();
function fingerprintOf(name: string, spec: string, content: string): { fp: string; route: string; form: string } {
  let sec = easySections(content || '');
  if (Object.keys(sec).length === 0) sec = freeSections(content || '');
  const { ind, dos, cau } = bucketSections(sec);
  const fp = H([H(normalize(ind)), H(normalize(dos)), H(normalize(cau)), H(`${ingredientOf(name)}|${strengthOf(spec)}`), H(formOf(name)), routeSig(name)].join('|'));
  return { fp, route: routeSig(name), form: formOf(name) };
}

function slug(groupKey: string): string {
  return groupKey.replace(/\|/g, '-').replace(/[^0-9a-zA-Z가-힣.-]/g, '').replace(/밀리그램/g, 'mg').replace(/마이크로그램/g, 'ug');
}

async function main(): Promise<void> {
  const bridge = JSON.parse(fs.readFileSync(BRIDGE, 'utf8'));
  const arr: any[] = bridge.groups || bridge;
  const v1 = JSON.parse(fs.readFileSync(path.join(TR_DIR, V1_FILE), 'utf8'));
  const v1trs: any[] = v1.translations || v1;
  const DONE = loadDoneGroupKeys();

  const entries = arr.filter((x) => (x.counts || {})[BUCKET] > 0)
    .map((x) => ({ fp: x.fingerprint as string, pharmKey: x.pharmKey as string, groupKey: `${x.ingredient}|${x.strength}|${x.form}`, ingredient: x.ingredient as string, strength: x.strength as string, form: x.form as string, route: x.route as string, atc: x.atc_code as string, bridge_n: x.counts[BUCKET] as number, sample: x.sampleName as string }));
  const byGroup = new Map<string, typeof entries[number]>();
  for (const e of entries) { const cur = byGroup.get(e.groupKey); if (!cur || e.bridge_n > cur.bridge_n || (e.bridge_n === cur.bridge_n && e.fp < cur.fp)) byGroup.set(e.groupKey, e); }
  const reps = [...byGroup.values()]
    .filter((g) => !DONE.has(g.groupKey) && !EXTRA_EXCLUDE.has(g.groupKey))
    .filter((g) => !EXTRA_EXCLUDE_INGREDIENT.some((re) => re.test(g.ingredient)))
    .filter((g) => !!g.ingredient && g.ingredient.trim().length > 0)
    .filter((g) => g.route === 'oral')
    .filter((g) => !SENSITIVE_RE.test(g.ingredient))
    .sort((a, b) => b.bridge_n - a.bridge_n || (a.pharmKey < b.pharmKey ? -1 : a.pharmKey > b.pharmKey ? 1 : 0) || (a.fp < b.fp ? -1 : 1));

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: process.env.DB_HOST || '127.0.0.1', port: parseInt(process.env.DB_PORT || '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 300000 } });
  await ds.initialize();

  const evaluated: any[] = [];
  for (const g of reps.slice(0, EVAL_LIMIT)) {
    const coarse: Array<{ id: string; name: string; spec: string; content: string }> = await ds.query(
      `SELECT pm.id::text id, pm.name, pm.specification spec, es.content
       FROM product_masters pm
       JOIN LATERAL (SELECT content FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL ORDER BY (s.status='canonical') DESC, length(s.content) DESC LIMIT 1) es ON true
       WHERE pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND pm.name LIKE '%'||$3||'%'
       ORDER BY pm.id`, [g.ingredient, g.strength, g.form]);
    const withFp = coarse.map((r) => ({ ...r, ...fingerprintOf(r.name, r.spec, r.content) }));
    const target = withFp.filter((r) => r.fp === g.fp);
    const nonTarget = withFp.filter((r) => r.fp !== g.fp);
    const masterIds = target.map((r) => r.id).sort();
    const excludeFps = [...new Set(nonTarget.map((r) => r.fp))].sort();
    const T = masterIds.length;

    const groupKey = g.groupKey;
    const drafts: Array<{ cid: string }> = await ds.query(
      `SELECT candidate_id::text cid FROM product_candidate_description_drafts WHERE source_label='MFDS_DRUG_OTC' AND deleted_at IS NULL AND seed_json->>'groupKey'=$1 ORDER BY candidate_id`, [groupKey]);
    const candidate = drafts[0]?.cid ?? null;

    let easyExactly1 = 0, koConflict = 0, koNr = 0, enConflict = 0, enNr = 0, enSib: any = null;
    if (T && candidate) {
      const slot: any[] = await ds.query(`
        SELECT count(*) FILTER (WHERE lang='ko' AND src=ANY($2) AND st='canonical')::int ko_canon,
               count(*) FILTER (WHERE lang='ko' AND src=ANY($2) AND st='needs_review')::int ko_nr,
               count(*) FILTER (WHERE lang='en' AND st='canonical')::int en_canon,
               count(*) FILTER (WHERE lang='en' AND st='needs_review')::int en_nr
        FROM (SELECT COALESCE(s.language,'ko') lang, s.source_type src, s.status st FROM shared_product_descriptions s
              WHERE s.master_id=ANY($1::uuid[]) AND s.description_type='STORE' AND s.deleted_at IS NULL) t`, [masterIds, AUTHORED_SOURCES]);
      koConflict = slot[0].ko_canon; koNr = slot[0].ko_nr; enConflict = slot[0].en_canon; enNr = slot[0].en_nr;
      const per: any[] = await ds.query(
        `SELECT count(*)::int n FROM unnest($1::uuid[]) mid WHERE (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.source_type='mfds_easy_drug' AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)=1`, [masterIds]);
      easyExactly1 = per[0].n;
      const sib: any[] = await ds.query(
        `SELECT md5(content) h, summary, count(*)::int n FROM shared_product_descriptions WHERE source_ref_id=$1::uuid AND NOT master_id=ANY($2::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL GROUP BY 1,2`, [candidate, masterIds]);
      enSib = sib.length === 1 ? { md5: sib[0].h, summary: sib[0].summary, n: sib[0].n, uniform: true } : (sib.length ? { variants: sib.length, uniform: false } : null);
    }

    // 모든 번역 파일 스캔: build == live out en byte-identical 인 entry 를 가진 파일 탐색
    let enFileReady = false, enFile: string | null = null, v1summary: string | null = null;
    if (enSib?.uniform) {
      for (const f of fs.readdirSync(TR_DIR)) {
        if (!f.endsWith('.json')) continue;
        let trs: any[]; try { const j = JSON.parse(fs.readFileSync(path.join(TR_DIR, f), 'utf8')); trs = j.translations || j; } catch { continue; }
        if (!Array.isArray(trs)) continue;
        const tr = trs.find((t) => t && t.groupKey === groupKey);
        if (!tr) continue;
        const built = buildDrugOtcEnConsumerHtml(tr);
        if (md5(built.html) === enSib.md5 && built.missing.length === 0) { enFileReady = true; enFile = f; v1summary = enSib.summary; break; }
      }
    }
    void v1trs;

    const doses = [...new Set(target.map((r) => strengthOf(r.spec)))];
    const forms = [...new Set(target.map((r) => r.form))];
    const routes = [...new Set(target.map((r) => r.route))];
    const reasons: string[] = [];
    if (!candidate) reasons.push('authored draft 없음');
    if (drafts.length > 1) reasons.push(`draft 다중 ${drafts.length}`);
    if (T === 0) reasons.push('target 0');
    if (T !== g.bridge_n) reasons.push(`fp 재현 불일치 ${T}!=${g.bridge_n}`);
    if (easyExactly1 !== T) reasons.push(`easy1 ${easyExactly1}/${T}`);
    if (koConflict > 0) reasons.push(`ko충돌 ${koConflict}`);
    if (koNr > 0) reasons.push(`ko nr ${koNr}`);
    if (enConflict > 0) reasons.push(`en선존재 ${enConflict}`);
    if (enNr > 0) reasons.push(`en nr ${enNr}`);
    if (doses.length !== 1 || forms.length !== 1 || routes.length !== 1 || routes[0] !== 'oral') reasons.push('동질성 실패');
    if (!enSib?.uniform) reasons.push('EN sibling 부재/비균일');
    if (enSib?.uniform && !enFileReady) reasons.push('v1 번역 build!=out(역구성 필요)');
    const verdict = reasons.length ? 'EXCLUDED' : 'READY_FILE';

    evaluated.push({
      groupKey, alias: `ga-${slug(groupKey)}`, ingredient: g.ingredient, strength: g.strength, form: g.form,
      targetFp: g.fp, bridge_n: g.bridge_n, coarseTotal: coarse.length, target: T, exclude: nonTarget.length,
      excludeFps, candidate, easyCanonicalExactly1: easyExactly1, koConflict, koNr, enConflict, enNr,
      enSibling: enSib, enFileReady, enFile, v1summary,
      예상write: { ko_4T: T * 4, en_2T: T * 2, total_6T: T * 6 },
      verdict, excludeReasons: reasons,
    });
  }
  await ds.destroy();

  const ready = evaluated.filter((c) => c.verdict === 'READY_FILE').sort((a, b) => b.target - a.target || (a.groupKey < b.groupKey ? -1 : 1));
  const picked = ready.slice(0, MAX_PICK);

  // config JSON (bundle runner 소비)
  const ko: Record<string, any> = {}, en: Record<string, any> = {};
  for (const c of picked) {
    ko[c.alias] = {
      key: c.groupKey, ingredient: c.ingredient, dose: c.strength, formKeyword: c.form,
      candidate: c.candidate, targetFp: c.targetFp,
      excludeFp: c.excludeFps.length === 1 ? c.excludeFps[0] : c.excludeFps,
      expected: c.target, excludedExpected: c.exclude,
      authoredSource: 'mfds_drug_otc', outBase: `otc-grounded-upgrade-ga3h-${slug(c.groupKey)}`,
    };
    en[c.alias] = {
      key: c.groupKey, candidate: c.candidate, sourceType: 'mfds_drug_otc', expected: c.target,
      koRunBase: `otc-grounded-upgrade-ga3h-${slug(c.groupKey)}`,
      translationFile: c.enFile, outBase: `otc-en-complete-ga3h-${slug(c.groupKey)}`,
    };
  }
  const config = {
    _doc: 'WO-O4O-OTC-TRACK-A-3H-PRODUCTION-GA-V1 (에이전트 가) 외부 batch config. runner registry .ts 미수정. translationFile=v1 공용(read-only, build==live out en byte-identical 사전검증). bundle --config=<이 파일> --apply.',
    bundleKey: 'track-a-3h-ga', writeOwner: 'agent-ga',
    order: picked.map((c) => c.alias), ko, en,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'otc-ko-en-bundle-track-a-3h-ga.config.json'), JSON.stringify(config, null, 2), 'utf8');
  const audit = {
    wo: 'WO-O4O-OTC-TRACK-A-3H-PRODUCTION-GA-V1', readOnly: true, dbWrite: 0,
    doneCount: DONE.size, extraExcluded: [...EXTRA_EXCLUDE],
    evaluated: evaluated.length, readyFile: ready.length, picked: picked.length,
    pickedTotalWrite: picked.reduce((s, c) => s + c.예상write.total_6T, 0),
    candidates: evaluated.map((c) => ({ groupKey: c.groupKey, target: c.target, bridge_n: c.bridge_n, exclude: c.exclude, verdict: c.verdict, reasons: c.excludeReasons, enSib: c.enSibling?.uniform ? c.enSibling.n : null, enFileReady: c.enFileReady })),
    picked: picked.map((c) => ({ alias: c.alias, groupKey: c.groupKey, target: c.target, exclude: c.exclude, candidate: c.candidate, 예상write: c.예상write })),
  };
  fs.writeFileSync(path.join(OUT_DIR, 'otc-track-a-3h-ga.audit.json'), JSON.stringify(audit, null, 2), 'utf8');
  console.log(JSON.stringify({
    doneCount: DONE.size, evaluated: evaluated.length, readyFile: ready.length, picked: picked.length,
    pickedTotalWrite: audit.pickedTotalWrite,
    picked: picked.map((c) => `${c.groupKey} T=${c.target} (6T=${c.예상write.total_6T}) enSib=${c.enSibling.n}`),
    excludedTop: evaluated.filter((c) => c.verdict !== 'READY_FILE').slice(0, 12).map((c) => `${c.groupKey} T=${c.target}: ${c.excludeReasons.join(',')}`),
  }, null, 2));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
