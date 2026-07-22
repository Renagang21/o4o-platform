/**
 * WO-O4O-OTC-SAFETY-MISMATCH-STORE-LEAFLET-PRODUCTION-NA-V2 — Agent 나. 분석/인벤토리부 READ-ONLY (DB write 0).
 * 안전지문불일치 45 in-scope 그룹을 **정확 안전지문별 subgroup** 으로 분해하여 제품별 저작 대상 인벤토리 생성.
 * 각 subgroup: 고정 master_id 집합 · 공식 원문(효능/용법/주의) 완전성 · 내부 무모순(단일 지문) · subgroup 교집합 0.
 * 판정: READY_SAFETY_SUBGROUP(저작 준비완료 — 사람 저작 큐 입력) / HOLD_SOURCE_INCOMPLETE / HOLD_ROUTE_UNCLEAR.
 * ⚠️ 의약품 소비자 안전 본문은 사람 저작(offline CHECK, klass auto/review/manual)이 정본. 본 스크립트는 저작 대상만 확정, 본문 생성·apply 안 함.
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
const MIN_SUBGROUP = 1; // 제품별 생산 허용 → 최소 1

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);
const stripTags = (s: string): string => s.replace(/<[^>]+>/g, ' ');
function normalize(s: string): string { return stripTags(s || '').normalize('NFKC').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/[·・∙•▪▶►\-–—]/g, ',').replace(/^\s*\d+\)\s*/gm, '').replace(/[，、]/g, ',').replace(/[．。]/g, '.').replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',').trim(); }
function easySections(content: string): Record<string, string> { const out: Record<string, string> = {}; const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g; let m: RegExpExecArray | null; while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim(); return out; }
function freeSections(content: string): Record<string, string> { const out: Record<string, string> = {}; const re = /<(h[1-4]|strong)[^>]*>\s*([^<]{2,40}?)\s*<\/\1>([\s\S]*?)(?=<(?:h[1-4]|strong)[^>]*>|$)/gi; let m: RegExpExecArray | null; while ((m = re.exec(content))) { const t = m[2].replace(/[:：]\s*$/, '').trim(); const b = m[3].trim(); if (t) out[t] = (out[t] ? out[t] + '\n' : '') + b; } return out; }
function buckets(content: string): { ind: string; dos: string; cau: string } { let sec = easySections(content); if (Object.keys(sec).length === 0) sec = freeSections(content); let ind = '', dos = '', cau = ''; for (const [t, b] of Object.entries(sec)) { if (/효능|효과|적응|용도/.test(t)) ind += (ind ? '\n' : '') + b; else if (/용법|용량|복용|투여\s*방법|사용\s*방법|사용법/.test(t)) dos += (dos ? '\n' : '') + b; else if (/주의|경고|금기|부작용|이상\s*반응|임부|임신|수유|병용|상호/.test(t)) cau += (cau ? '\n' : '') + b; } return { ind, dos, cau }; }

async function main(): Promise<void> {
  const bridge = JSON.parse(readFileSync(BRIDGE, 'utf8'));
  const arr: any[] = bridge.groups || bridge;
  const pmap = new Map<string, number>();
  for (const g of arr) { const n = (g.counts || {})[MM] || 0; if (n > 0) pmap.set(g.pharmKey, (pmap.get(g.pharmKey) || 0) + n); }
  const scope = [...pmap.keys()].map((pk) => { const m = pk.match(/^ing:([^|]+)\|([^|]+)\|([^|]+)\|(\w+)$/); return m ? { pk, ing: m[1], strength: m[2], form: m[3], route: m[4], mm: pmap.get(pk)! } : null; })
    .filter((x): x is NonNullable<typeof x> => !!x && x.route === 'oral' && !!x.ing && !/수출/.test(x.ing) && !SENSITIVE_RE.test(x.ing))
    .sort((a, b) => b.mm - a.mm);

  const { DataSource } = await import('typeorm');
  const mkds = () => new (DataSource as any)({ type: 'postgres', host: '127.0.0.1', port: parseInt(process.env.DISCOVERY_DB_PORT || '5433', 10), username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 300000 } });
  let ds = mkds(); await ds.initialize();

  const groups: any[] = []; const allSubgroupMasterIds = new Set<string>(); let intersectionViolation = 0; let idx = 0;
  for (const s of scope) {
    idx++;
    try {
      const rows: Array<{ id: string; name: string; spec: string; ko_src: string | null; easy: string | null }> = await ds.query(`
        SELECT pm.id::text id, pm.name, pm.specification spec,
          (SELECT src.source_type FROM shared_product_descriptions src WHERE src.master_id=pm.id AND src.description_type='STORE' AND COALESCE(src.language,'ko')='ko' AND src.status='canonical' AND src.deleted_at IS NULL LIMIT 1) ko_src,
          (SELECT e.content FROM shared_product_descriptions e WHERE e.master_id=pm.id AND e.source_type='mfds_easy_drug' AND e.description_type='STORE' AND COALESCE(e.language,'ko')='ko' AND e.status='canonical' AND e.deleted_at IS NULL ORDER BY length(e.content) DESC LIMIT 1) easy
        FROM product_masters pm
        WHERE pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND pm.name LIKE '%'||$3||'%'`, [s.ing, s.strength, s.form]);
      const easyMasters = rows.filter((r) => r.ko_src === 'mfds_easy_drug' && r.easy);
      // 정확 안전지문별 subgroup: fullFp = H(ind|dos|cau)
      const sub: Record<string, { ids: string[]; ind: boolean; dos: boolean; cau: boolean }> = {};
      for (const r of easyMasters) { const { ind, dos, cau } = buckets(r.easy!); const fp = H([H(normalize(ind)), H(normalize(dos)), H(normalize(cau))].join('|')); const e = sub[fp] || (sub[fp] = { ids: [], ind: false, dos: false, cau: false }); e.ids.push(r.id); e.ind = e.ind || normalize(ind).length > 0; e.dos = e.dos || normalize(dos).length > 0; e.cau = e.cau || normalize(cau).length > 0; }
      const subgroups = Object.entries(sub).map(([fp, v]) => {
        const ids = v.ids.sort();
        for (const id of ids) { if (allSubgroupMasterIds.has(id)) intersectionViolation++; else allSubgroupMasterIds.add(id); }
        const sourceComplete = v.ind && v.dos && v.cau;
        const cls = ids.length < MIN_SUBGROUP ? 'HOLD_TOO_SMALL' : !sourceComplete ? 'HOLD_SOURCE_INCOMPLETE' : 'READY_SAFETY_SUBGROUP';
        return { safetyFp: fp, T: ids.length, sourceComplete, hasEfficacy: v.ind, hasUsage: v.dos, hasCaution: v.cau, cls, master_ids: ids };
      }).sort((a, b) => b.T - a.T);
      groups.push({ pk: s.pk, groupKey: `${s.ing}|${s.strength}|${s.form}`, ing: s.ing, strength: s.strength, form: s.form, easyMasters: easyMasters.length, subgroupCount: subgroups.length, subgroups });
    } catch (e) {
      groups.push({ pk: s.pk, groupKey: `${s.ing}|${s.strength}|${s.form}`, error: String(e instanceof Error ? e.message : e) });
      try { if (ds.isInitialized) await ds.destroy(); } catch { /* noop */ } await new Promise((r) => setTimeout(r, 1500)); ds = mkds(); await ds.initialize();
    }
    if (idx % 10 === 0) console.error(`  progress ${idx}/${scope.length}`);
  }
  if (ds.isInitialized) await ds.destroy();

  const allSubs = groups.flatMap((g) => (g.subgroups || []).map((x: any) => ({ groupKey: g.groupKey, ...x })));
  const ready = allSubs.filter((x) => x.cls === 'READY_SAFETY_SUBGROUP');
  const holdIncomplete = allSubs.filter((x) => x.cls === 'HOLD_SOURCE_INCOMPLETE');
  const out = {
    wo: 'WO-O4O-OTC-SAFETY-MISMATCH-STORE-LEAFLET-PRODUCTION-NA-V2', agent: '나', readOnly: true, dbWrite: 0,
    authoring_note: '의약품 소비자 안전 본문 = 사람 저작(offline CHECK, klass auto/review/manual)이 정본(CLAUDE.md: 외부 LLM 초안 자동생성 금지). 본 인벤토리는 **저작 대상 subgroup 을 고정**(master_id·원문 완전성)하여 사람 저작 큐에 투입하기 위한 것. 자동 본문생성·apply 없음.',
    scope: { in_scope_groups: scope.length },
    summary: {
      groups_decomposed: groups.filter((g) => !g.error).length,
      total_subgroups: allSubs.length,
      READY_SAFETY_SUBGROUP: ready.length, ready_master_total: ready.reduce((a, x) => a + x.T, 0),
      HOLD_SOURCE_INCOMPLETE: holdIncomplete.length, hold_incomplete_master_total: holdIncomplete.reduce((a, x) => a + x.T, 0),
      subgroup_master_intersection: intersectionViolation,
      distinct_masters_covered: allSubgroupMasterIds.size,
    },
    write_plan_if_authored: { note: 'KO=4T·EN=2T·총6T per subgroup (사람 저작 후)', ready_T: ready.reduce((a, x) => a + x.T, 0), ko_4T: 4 * ready.reduce((a, x) => a + x.T, 0), en_2T: 2 * ready.reduce((a, x) => a + x.T, 0) },
    groups,
  };
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, 'otc-safety-subgroup-authoring-inventory-v1.json'), JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify({ scope: out.scope, summary: out.summary,
    topReadyGroups: groups.filter((g) => !g.error).map((g) => ({ gk: g.groupKey, subs: g.subgroupCount, ready: (g.subgroups || []).filter((s: any) => s.cls === 'READY_SAFETY_SUBGROUP').length })).sort((a, b) => b.ready - a.ready).slice(0, 12),
  }, null, 2));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
