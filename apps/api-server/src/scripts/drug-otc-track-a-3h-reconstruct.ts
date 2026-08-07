/**
 * WO-O4O-OTC-TRACK-A-3H-PRODUCTION-GA-V1 — EN 역구성 배치 config 생성기 (에이전트 가, DB write 0)
 *
 * "역구성 필요" 후보(uniform reviewed EN sibling 존재하나 표준 번역파일 build != live out en)를
 * live out en HTML 을 buildDrugOtcEnConsumerHtml 의 **역함수로 파싱** → DrugOtcEnTranslation 복원 →
 * 재빌드가 live out en 과 byte-identical 임을 검증하고, 배치 전용 번역파일 + 외부 config 를 산출한다.
 *
 * 역구성 = 형식 변환의 재현(검토완료 EN 재사용). 새 medical fact 0(build==live out en byte-identical 게이트).
 * runner registry .ts 미수정. Usage: DB_HOST=.. npx tsx src/scripts/drug-otc-track-a-3h-reconstruct.ts [--max=N]
 * 산출: data/otc-ko-en-bundle-track-a-3h-ga-r.config.json + translations/otc-en-translations-ga3h-<slug>.json
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildDrugOtcEnConsumerHtml, type DrugOtcEnTranslation } from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const BRIDGE = path.resolve(OUT_DIR, 'otc-full-corpus-authored-bridge-groups-v1.json');
const TR_DIR = path.resolve(process.cwd(), '../../docs/guides/products/drug/pilot-en-design/translations');
const BUCKET = 'authored그대로확장';
const SENSITIVE_RE = /아스피린|아세틸살리실산|와파린|클로피도그렐|헤파린|덱사메타손|프레드니솔론|하이드로코르티손|모르핀|코데인|메칠페니데이트|인슐린|레보티록신/;
const AUTHORED_SOURCES = ['mfds_drug_otc', 'nutrition_combo'];
const EVAL_LIMIT = 40;
const MAX_PICK = parseInt((process.argv.find((a) => a.startsWith('--max=')) || '--max=8').split('=')[1], 10);
const EXTRA_EXCLUDE = new Set<string>(['이부프로펜아르기닌|368.9밀리그램|정', '알파칼시돌|1마이크로그램|연질캡슐']);
const EXTRA_EXCLUDE_INGREDIENT = [/다당체철|폴리사카라이드|다당류철|철다당/];

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);
const us_ = (s: string): string => s.replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');

function loadDoneGroupKeys(): Set<string> {
  const files = ['src/scripts/drug-otc-grounded-upgrade-runner.ts', 'src/scripts/drug-otc-en-complete-runner.ts'].map((f) => path.resolve(process.cwd(), f));
  const done = new Set<string>();
  for (const f of files) { if (!fs.existsSync(f)) continue; for (const m of fs.readFileSync(f, 'utf8').matchAll(/key:\s*'([^']+)'/g)) done.add(m[1]); }
  return done;
}

// fingerprintOf 정본
const stripTags = (s: string): string => s.replace(/<[^>]+>/g, ' ');
function normalize(s: string): string {
  return stripTags(s || '').normalize('NFKC').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/[·・∙•▪▶►\-–—]/g, ',').replace(/^\s*\d+\)\s*/gm, '').replace(/[，、]/g, ',').replace(/[．。]/g, '.').replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',').trim();
}
function easySections(content: string): Record<string, string> { const out: Record<string, string> = {}; const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g; let m: RegExpExecArray | null; while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim(); return out; }
function freeSections(content: string): Record<string, string> { const out: Record<string, string> = {}; const re = /<(h[1-4]|strong)[^>]*>\s*([^<]{2,40}?)\s*<\/\1>([\s\S]*?)(?=<(?:h[1-4]|strong)[^>]*>|$)/gi; let m: RegExpExecArray | null; while ((m = re.exec(content))) { const title = m[2].replace(/[:：]\s*$/, '').trim(); const body = m[3].trim(); if (title) out[title] = (out[title] ? out[title] + '\n' : '') + body; } return out; }
function bucketSections(sec: Record<string, string>): { ind: string; dos: string; cau: string } { let ind = '', dos = '', cau = ''; for (const [t, b] of Object.entries(sec)) { if (/효능|효과|적응|용도/.test(t)) ind += (ind ? '\n' : '') + b; else if (/용법|용량|복용|투여\s*방법|사용\s*방법|사용법/.test(t)) dos += (dos ? '\n' : '') + b; else if (/상호\s*작용|병용/.test(t)) { /* 상호작용 절은 수집 대상 아님 */ } else if (/주의|경고|금기|부작용|이상\s*반응|임부|임신|수유/.test(t)) cau += (cau ? '\n' : '') + b; } return { ind, dos, cau }; }
function formOf(name: string): string { return /연질캡슐/.test(name) ? '연질캡슐' : /캡슐/.test(name) ? '캡슐' : /연고/.test(name) ? '연고' : /크림/.test(name) ? '크림' : /플라스타|첩부|패치|패취|카타플/.test(name) ? '첩부제' : /점안/.test(name) ? '점안액' : /시럽/.test(name) ? '시럽' : /과립|산\(/.test(name) ? '과립/산' : /정/.test(name) ? '정' : /액/.test(name) ? '액' : '기타'; }
function routeSig(name: string): string { if (/질정|질좌|질내정|질\s?삽입/.test(name)) return 'vaginal'; if (/좌약|좌제/.test(name)) return 'rectal'; if (/점안|안연고/.test(name)) return 'ophthalmic'; if (/점이액|귀에/.test(name)) return 'otic'; if (/점비|비강/.test(name)) return 'nasal'; if (/크림|연고|로션|로숀|겔$|겔\(|겔제|젤$|젤\(|플라스타|플라스터|첩부|카타플|패취|패치|파스|파프|스왑|스틱|거즈|탈지면|솜|네일라카|라카|외용|도포|스프레이|에어로솔|에어졸|소독|폼$|폼\(|워시|카타플라스마/.test(name)) return 'topical'; if (/정$|정\d|정\(|정밀리|정\[|캡슐|캅셀|시럽|현탁|과립|산제|산\(|트로키|츄어|씹|저작|드링크|내복|환$|환\(|액$|액\(|액\[|물약|시럽제/.test(name)) return 'oral'; return 'unknown'; }
const ingredientOf = (name: string): string => (name.match(/\(([^()]+)\)\s*$/)?.[1] || '').trim();
const strengthOf = (spec: string): string => (spec || '').split(' / ')[0].trim();
function fingerprintOf(name: string, spec: string, content: string): { fp: string; route: string; form: string } { let sec = easySections(content || ''); if (Object.keys(sec).length === 0) sec = freeSections(content || ''); const { ind, dos, cau } = bucketSections(sec); const fp = H([H(normalize(ind)), H(normalize(dos)), H(normalize(cau)), H(`${ingredientOf(name)}|${strengthOf(spec)}`), H(formOf(name)), routeSig(name)].join('|')); return { fp, route: routeSig(name), form: formOf(name) }; }

/** buildDrugOtcEnConsumerHtml 역함수 — sd-* HTML → DrugOtcEnTranslation. */
function parseEnHtml(groupKey: string, html: string): DrugOtcEnTranslation | null {
  const h1 = html.match(/<h1>([\s\S]*?)<\/h1>/); if (!h1) return null;
  const title = us_(h1[1].replace(/<small>[\s\S]*?<\/small>/, '').trim());
  const intro = html.match(/<p class="sd-intro">([\s\S]*?)<\/p>/); if (!intro) return null;
  const efficacy = us_(intro[1]);
  const ulabel = html.match(/<h2>([^<]*)<\/h2>\s*<p class="sd-intake">/); if (!ulabel) return null;
  const usageLabel = us_(ulabel[1]);
  const intake = html.match(/<p class="sd-intake">([\s\S]*?)<\/p>/); if (!intake) return null;
  const usage = us_(intake[1]);
  const lis = [...html.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => us_(m[1]));
  const caution = lis.join(' ');
  const st: Record<string, string> = {};
  for (const m of html.matchAll(/<div class="sd-item">\s*<span class="sd-tag">([\s\S]*?)<\/span>\s*<p>([\s\S]*?)<\/p>\s*<\/div>/g)) st[us_(m[1])] = us_(m[2]);
  if (!title || !efficacy || !usage || !caution || Object.keys(st).length === 0) return null;
  return { groupKey, title, usageLabel, efficacy, usage, caution, summaryTable: st };
}

const slug = (gk: string): string => gk.replace(/\|/g, '-').replace(/[^0-9a-zA-Z가-힣.-]/g, '').replace(/밀리그램/g, 'mg').replace(/마이크로그램/g, 'ug');

async function main(): Promise<void> {
  const bridge = JSON.parse(fs.readFileSync(BRIDGE, 'utf8'));
  const arr: any[] = bridge.groups || bridge;
  const DONE = loadDoneGroupKeys();
  const entries = arr.filter((x) => (x.counts || {})[BUCKET] > 0)
    .map((x) => ({ fp: x.fingerprint as string, pharmKey: x.pharmKey as string, groupKey: `${x.ingredient}|${x.strength}|${x.form}`, ingredient: x.ingredient as string, strength: x.strength as string, form: x.form as string, route: x.route as string, bridge_n: x.counts[BUCKET] as number }));
  const byGroup = new Map<string, typeof entries[number]>();
  for (const e of entries) { const cur = byGroup.get(e.groupKey); if (!cur || e.bridge_n > cur.bridge_n || (e.bridge_n === cur.bridge_n && e.fp < cur.fp)) byGroup.set(e.groupKey, e); }
  const reps = [...byGroup.values()]
    .filter((g) => !DONE.has(g.groupKey) && !EXTRA_EXCLUDE.has(g.groupKey))
    .filter((g) => !EXTRA_EXCLUDE_INGREDIENT.some((re) => re.test(g.ingredient)))
    .filter((g) => !!g.ingredient && g.ingredient.trim() && g.route === 'oral' && !SENSITIVE_RE.test(g.ingredient))
    .sort((a, b) => b.bridge_n - a.bridge_n || (a.pharmKey < b.pharmKey ? -1 : 1) || (a.fp < b.fp ? -1 : 1));

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: process.env.DB_HOST || '127.0.0.1', port: parseInt(process.env.DB_PORT || '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 300000 } });
  await ds.initialize();

  const picked: any[] = []; const report: any[] = [];
  for (const g of reps.slice(0, EVAL_LIMIT)) {
    if (picked.length >= MAX_PICK) break;
    const coarse: Array<{ id: string; name: string; spec: string; content: string }> = await ds.query(
      `SELECT pm.id::text id, pm.name, pm.specification spec, es.content FROM product_masters pm JOIN LATERAL (SELECT content FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL ORDER BY (s.status='canonical') DESC, length(s.content) DESC LIMIT 1) es ON true WHERE pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND pm.name LIKE '%'||$3||'%' ORDER BY pm.id`, [g.ingredient, g.strength, g.form]);
    const withFp = coarse.map((r) => ({ ...r, ...fingerprintOf(r.name, r.spec, r.content) }));
    const target = withFp.filter((r) => r.fp === g.fp);
    const nonTarget = withFp.filter((r) => r.fp !== g.fp);
    const masterIds = target.map((r) => r.id).sort();
    const excludeFps = [...new Set(nonTarget.map((r) => r.fp))].sort();
    const T = masterIds.length;
    if (T === 0 || T !== g.bridge_n) { report.push({ groupKey: g.groupKey, skip: `fp재현 ${T}!=${g.bridge_n}` }); continue; }
    const drafts: Array<{ cid: string }> = await ds.query(`SELECT candidate_id::text cid FROM product_candidate_description_drafts WHERE source_label='MFDS_DRUG_OTC' AND deleted_at IS NULL AND seed_json->>'groupKey'=$1 ORDER BY candidate_id`, [g.groupKey]);
    const candidate = drafts[0]?.cid ?? null;
    if (!candidate || drafts.length > 1) { report.push({ groupKey: g.groupKey, skip: 'draft 없음/다중' }); continue; }
    const slot: any[] = await ds.query(`SELECT count(*) FILTER (WHERE lang='ko' AND src=ANY($2) AND st='canonical')::int koc, count(*) FILTER (WHERE lang='ko' AND src=ANY($2) AND st='needs_review')::int konr, count(*) FILTER (WHERE lang='en')::int enany FROM (SELECT COALESCE(s.language,'ko') lang, s.source_type src, s.status st FROM shared_product_descriptions s WHERE s.master_id=ANY($1::uuid[]) AND s.description_type='STORE' AND s.deleted_at IS NULL) t`, [masterIds, AUTHORED_SOURCES]);
    const per: any[] = await ds.query(`SELECT count(*)::int n FROM unnest($1::uuid[]) mid WHERE (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.source_type='mfds_easy_drug' AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)=1`, [masterIds]);
    if (slot[0].koc > 0 || slot[0].konr > 0 || slot[0].enany > 0 || per[0].n !== T) { report.push({ groupKey: g.groupKey, skip: `충돌/선점 koc${slot[0].koc} enany${slot[0].enany} easy1 ${per[0].n}/${T}` }); continue; }
    const sib: any[] = await ds.query(`SELECT content, md5(content) h, summary, count(*)::int n FROM shared_product_descriptions WHERE source_ref_id=$1::uuid AND NOT master_id=ANY($2::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL GROUP BY 1,2,3`, [candidate, masterIds]);
    if (sib.length !== 1) { report.push({ groupKey: g.groupKey, skip: `EN sibling ${sib.length}종` }); continue; }
    // 역구성
    const tr = parseEnHtml(g.groupKey, sib[0].content);
    if (!tr) { report.push({ groupKey: g.groupKey, skip: '역파싱 실패' }); continue; }
    const built = buildDrugOtcEnConsumerHtml(tr);
    if (built.missing.length || md5(built.html) !== sib[0].h) { report.push({ groupKey: g.groupKey, skip: `역구성 build!=out (missing ${built.missing.join(',')})` }); continue; }
    if (/[가-힣]/.test(built.html)) { report.push({ groupKey: g.groupKey, skip: '역구성 한글 잔존' }); continue; }
    // 번역 파일 작성
    const trFile = `otc-en-translations-ga3h-${slug(g.groupKey)}.json`;
    fs.writeFileSync(path.join(TR_DIR, trFile), JSON.stringify({
      wo: 'WO-O4O-OTC-TRACK-A-3H-PRODUCTION-GA-V1', guide: 'OTC-EN-TRANSLATION-GUIDE V0.5 · OTC-KO-EN-GLOSSARY V0.2',
      note: `${g.groupKey} EN 역구성 — live out en(md5 ${sib[0].h}, ${sib[0].n}건) 을 buildDrugOtcEnConsumerHtml 역함수로 복원, 재빌드 byte-identical(diff 0) 검증. 검토완료 EN 재사용·새 fact 0.`,
      translations: [tr], summary: sib[0].summary,
    }, null, 2), 'utf8');
    picked.push({ groupKey: g.groupKey, alias: `gar-${slug(g.groupKey)}`, ingredient: g.ingredient, strength: g.strength, form: g.form, targetFp: g.fp, candidate, T, exclude: nonTarget.length, excludeFps, trFile, enMd5: sib[0].h, enN: sib[0].n });
    report.push({ groupKey: g.groupKey, ok: `T=${T} 역구성 OK md5 ${sib[0].h}` });
  }
  await ds.destroy();

  const ko: Record<string, any> = {}, en: Record<string, any> = {};
  for (const c of picked) {
    ko[c.alias] = { key: c.groupKey, ingredient: c.ingredient, dose: c.strength, formKeyword: c.form, candidate: c.candidate, targetFp: c.targetFp, excludeFp: c.excludeFps.length === 1 ? c.excludeFps[0] : c.excludeFps, expected: c.T, excludedExpected: c.exclude, authoredSource: 'mfds_drug_otc', outBase: `otc-grounded-upgrade-gar-${slug(c.groupKey)}` };
    en[c.alias] = { key: c.groupKey, candidate: c.candidate, sourceType: 'mfds_drug_otc', expected: c.T, koRunBase: `otc-grounded-upgrade-gar-${slug(c.groupKey)}`, translationFile: c.trFile, outBase: `otc-en-complete-gar-${slug(c.groupKey)}` };
  }
  const config = { _doc: 'WO-O4O-OTC-TRACK-A-3H-PRODUCTION-GA-V1 (에이전트 가) EN 역구성 배치 config. runner .ts 미수정. translationFile=역구성 배치파일(build==live out en byte-identical).', bundleKey: 'track-a-3h-ga-r', writeOwner: 'agent-ga', order: picked.map((c) => c.alias), ko, en };
  fs.writeFileSync(path.join(OUT_DIR, 'otc-ko-en-bundle-track-a-3h-ga-r.config.json'), JSON.stringify(config, null, 2), 'utf8');
  console.log(JSON.stringify({ picked: picked.length, totalT: picked.reduce((s, c) => s + c.T, 0), totalWrite: picked.reduce((s, c) => s + c.T * 6, 0), groups: picked.map((c) => `${c.groupKey} T=${c.T} md5=${c.enMd5}`), skipped: report.filter((r) => r.skip).slice(0, 14) }, null, 2));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
