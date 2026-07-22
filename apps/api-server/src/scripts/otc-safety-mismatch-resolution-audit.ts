/**
 * WO-O4O-OTC-SAFETY-MISMATCH-RESOLUTION-10H-PRODUCTION-NA-V1 — Agent 나. 분석부 READ-ONLY (DB write 0).
 * 안전지문불일치 잔여를 그룹별로 안전(caution)지문 분해하여 subgroup 구조·해소가능성을 결정론적으로 산출.
 * READY(무-의료판단): 안전지문 단일 collapse(format-only) 또는 exact subgroup 분리 + 기존 검증 canonical byte-identical 재사용.
 * proxy: DISCOVERY_DB_PORT(기본 5433, 장애시 5434).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const ENV_PATH = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\.env';
const readPw = (): string => readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim();
const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const BRIDGE = path.resolve(OUT_DIR, 'otc-full-corpus-authored-bridge-groups-v1.json');
const MM = '안전지문불일치';
const AUTH = ['mfds_drug_otc', 'nutrition_combo'];
const SENSITIVE_RE = /아스피린|아세틸살리실산|와파린|클로피도그렐|헤파린|덱사메타손|프레드니솔론|하이드로코르티손|모르핀|코데인|메칠페니데이트|인슐린|레보티록신/;

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);
const stripTags = (s: string): string => s.replace(/<[^>]+>/g, ' ');
function normalize(s: string): string { return stripTags(s || '').normalize('NFKC').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/[·・∙•▪▶►\-–—]/g, ',').replace(/^\s*\d+\)\s*/gm, '').replace(/[，、]/g, ',').replace(/[．。]/g, '.').replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',').trim(); }
function easySections(content: string): Record<string, string> { const out: Record<string, string> = {}; const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g; let m: RegExpExecArray | null; while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim(); return out; }
function freeSections(content: string): Record<string, string> { const out: Record<string, string> = {}; const re = /<(h[1-4]|strong)[^>]*>\s*([^<]{2,40}?)\s*<\/\1>([\s\S]*?)(?=<(?:h[1-4]|strong)[^>]*>|$)/gi; let m: RegExpExecArray | null; while ((m = re.exec(content))) { const t = m[2].replace(/[:：]\s*$/, '').trim(); const b = m[3].trim(); if (t) out[t] = (out[t] ? out[t] + '\n' : '') + b; } return out; }
function bucketSections(sec: Record<string, string>): { ind: string; dos: string; cau: string } { let ind = '', dos = '', cau = ''; for (const [t, b] of Object.entries(sec)) { if (/효능|효과|적응|용도/.test(t)) ind += (ind ? '\n' : '') + b; else if (/용법|용량|복용|투여\s*방법|사용\s*방법|사용법/.test(t)) dos += (dos ? '\n' : '') + b; else if (/주의|경고|금기|부작용|이상\s*반응|임부|임신|수유|병용|상호/.test(t)) cau += (cau ? '\n' : '') + b; } return { ind, dos, cau }; }
const formOf = (name: string): string => /연질캡슐/.test(name) ? '연질캡슐' : /캡슐/.test(name) ? '캡슐' : /정/.test(name) ? '정' : /과립|산\(/.test(name) ? '과립/산' : /액/.test(name) ? '액' : '기타';

async function main(): Promise<void> {
  const bridge = JSON.parse(readFileSync(BRIDGE, 'utf8'));
  const arr: any[] = bridge.groups || bridge;
  // in-scope safety-mismatch pharmKeys: ing: prefix, oral, real ingredient, non-sensitive, non-export
  const pmap = new Map<string, { mm: number }>();
  for (const g of arr) { const n = (g.counts || {})[MM] || 0; if (n <= 0) continue; const cur = pmap.get(g.pharmKey) || { mm: 0 }; cur.mm += n; pmap.set(g.pharmKey, cur); }
  const scope = [...pmap.entries()].map(([pk, v]) => { const m = pk.match(/^ing:([^|]+)\|([^|]+)\|([^|]+)\|(\w+)$/); return m ? { pk, ing: m[1], strength: m[2], form: m[3], route: m[4], mm: v.mm } : null; })
    .filter((x): x is NonNullable<typeof x> => !!x && x.route === 'oral' && !!x.ing && !/수출/.test(x.ing) && !SENSITIVE_RE.test(x.ing))
    .sort((a, b) => b.mm - a.mm);

  const { DataSource } = await import('typeorm');
  const mkds = () => new (DataSource as any)({ type: 'postgres', host: '127.0.0.1', port: parseInt(process.env.DISCOVERY_DB_PORT || '5433', 10), username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 300000 } });
  let ds = mkds(); await ds.initialize();

  const groups: any[] = [];
  let idx = 0;
  for (const s of scope) {
    idx++;
    try {
      // easy-canonical masters (안전지문불일치 후보는 easy-canonical 미생산분) + authored LIVE 유무 + LIVE easy source 유무
      const rows: Array<{ id: string; name: string; spec: string; ko_src: string | null; easy_content: string | null }> = await ds.query(`
        SELECT pm.id::text id, pm.name, pm.specification spec,
          (SELECT s.source_type FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.deleted_at IS NULL LIMIT 1) ko_src,
          (SELECT s.content FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.deleted_at IS NULL ORDER BY length(s.content) DESC LIMIT 1) easy_content
        FROM product_masters pm
        WHERE pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND pm.name LIKE '%'||$3||'%'`, [s.ing, s.strength, s.form]);
      const cauFn = (content: string): string => { let sec = easySections(content); if (Object.keys(sec).length === 0) sec = freeSections(content); const { cau } = bucketSections(sec); return H(normalize(cau)); };
      const easy = rows.filter((r) => r.ko_src === 'mfds_easy_drug' && r.easy_content); // 미생산 easy(mismatch 후보)
      const liveWithEasy = rows.filter((r) => r.ko_src && AUTH.includes(r.ko_src) && r.easy_content); // LIVE + easy source 잔존
      const authoredLive = rows.filter((r) => r.ko_src && AUTH.includes(r.ko_src)).length;
      const liveEasy = liveWithEasy.length;
      // safety(caution) fingerprint per easy master
      const cauHashes: Record<string, number> = {}; const fullHashes: Record<string, number> = {};
      for (const r of easy) { let sec = easySections(r.easy_content!); if (Object.keys(sec).length === 0) sec = freeSections(r.easy_content!); const { ind, dos, cau } = bucketSections(sec); const cauH = H(normalize(cau)); const fullH = H([H(normalize(ind)), H(normalize(dos)), cauH].join('|')); cauHashes[cauH] = (cauHashes[cauH] || 0) + 1; fullHashes[fullH] = (fullHashes[fullH] || 0) + 1; }
      const cauSub = Object.values(cauHashes).sort((a, b) => b - a);
      const distinctSafety = cauSub.length; const distinctFull = Object.keys(fullHashes).length;
      // 결정적 format-only 판정: mismatch easy 의 safety 해시가 LIVE 그룹의 easy safety 해시와 일치(overlap)?
      const misCau = Object.keys(cauHashes);
      const liveCau = [...new Set(liveWithEasy.map((r) => cauFn(r.easy_content!)))];
      const overlap = misCau.filter((h) => liveCau.includes(h)).length;
      const formatOnly = distinctSafety === 1 && liveCau.length >= 1 && overlap === misCau.length;
      // 분류
      let cls: string;
      if (easy.length === 0) cls = 'COMPLETED_OR_NO_EASY';
      else if (formatOnly) cls = 'READY_FORMAT_ONLY';                                 // mismatch safety == LIVE safety → 순수 형식차 → byte-identical 확장 안전
      else if (distinctSafety === 1) cls = 'HOLD_DIFFERENT_SUBGROUP';                 // 내부 균질이나 LIVE 와 safety 상이 → 제품별 신규 authoring(의료 scope)
      else cls = 'HOLD_TRUE_SAFETY_CONFLICT';                                         // 다중 안전지문 → 제품별 신규 authoring(의료 scope)
      groups.push({ pk: s.pk, groupKey: `${s.ing}|${s.strength}|${s.form}`, ing: s.ing, strength: s.strength, form: s.form, mm_bridge: s.mm, easyMasters: easy.length, authoredLive, liveEasySourcePresent: liveEasy, distinctSafetySubgroups: distinctSafety, distinctFullSubgroups: distinctFull, mismatch_vs_live_safety_overlap: overlap, formatOnly, safetySubgroupSizes: cauSub.slice(0, 12), cls });
    } catch (e) {
      groups.push({ pk: s.pk, groupKey: `${s.ing}|${s.strength}|${s.form}`, error: String(e instanceof Error ? e.message : e), cls: 'ERROR' });
      try { if (ds.isInitialized) await ds.destroy(); } catch { /* noop */ } await new Promise((r) => setTimeout(r, 1500)); ds = mkds(); await ds.initialize();
    }
    if (idx % 10 === 0) console.error(`  progress ${idx}/${scope.length}`);
  }
  if (ds.isInitialized) await ds.destroy();

  const by = (c: string) => groups.filter((g) => g.cls === c);
  const readyFormat = by('READY_FORMAT_ONLY');
  const holdDiff = by('HOLD_DIFFERENT_SUBGROUP');
  const holdConflict = by('HOLD_TRUE_SAFETY_CONFLICT');
  const out = {
    wo: 'WO-O4O-OTC-SAFETY-MISMATCH-RESOLUTION-10H-PRODUCTION-NA-V1', agent: '나', readOnly: true, dbWrite: 0,
    population: { mm_total_master_bridge: 1424, fp_entries: 411, pharmKeys_total: 87, in_scope_oral_realing_nonsensitive: scope.length },
    summary: {
      groups_audited: groups.length,
      READY_FORMAT_ONLY_safe: readyFormat.length,
      HOLD_DIFFERENT_SUBGROUP: holdDiff.length, HOLD_TRUE_SAFETY_CONFLICT: holdConflict.length,
      COMPLETED_OR_NO_EASY: by('COMPLETED_OR_NO_EASY').length, ERROR: by('ERROR').length,
      easyMasters_ready_format_safe: readyFormat.reduce((a, g) => a + g.easyMasters, 0),
      easyMasters_hold_diff_subgroup: holdDiff.reduce((a, g) => a + g.easyMasters, 0),
      easyMasters_hold_conflict: holdConflict.reduce((a, g) => a + g.easyMasters, 0),
      groups_with_live_easy_source: groups.filter((g) => g.liveEasySourcePresent > 0).length,
    },
    note: 'READY_FORMAT_ONLY = mismatch easy safety-hash == LIVE group easy safety-hash (순수 형식차, byte-identical 확장 안전). HOLD_* = 제품별 안전정보 상이 → 신규 grounded authoring + 의료검토 필요(자율 apply scope 밖).',
    groups,
  };
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, 'otc-safety-mismatch-resolution-audit-v1.json'), JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify({ population: out.population, summary: out.summary,
    readyFormat: readyFormat.map((g) => `${g.groupKey} easy${g.easyMasters} overlap${g.mismatch_vs_live_safety_overlap}`),
  }, null, 2));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
