/**
 * WO-O4O-OTC-SAFETY-MISMATCH-HYBRID-AUTHORING-AND-BATCH-APPLY-NA-V3 — 에이전트 나. READ-ONLY (DB write 0).
 * 남은 277 READY subgroup 의 공식 원문(mfds_easy_drug canonical) 을 subgroup 별로 추출하여 저작용 코퍼스 생성.
 * - 인벤토리(otc-safety-subgroup-authoring-inventory-v1.json) 의 고정 master_id 집합 기준.
 * - subgroup 내 easy 전문 md5 종류(runner 게이트 `easy md5 종류!=1` 대비) + md5 별 master 분할 기록.
 * - 현재 ko canonical source 재확인(drift 감지: mfds_easy_drug 아니면 DRIFT 플래그).
 * 출력: src/scripts/data/otc-safety-subgroup-source-corpus-na-v1.json (결정론: 정렬 고정, 타임스탬프 없음)
 * 실행: DB_PORT=5442 npx tsx src/scripts/otc-safety-subgroup-source-extract-na.ts
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function resolveApiServerDir(): string {
  let d = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (existsSync(path.join(d, 'apps', 'api-server', '.env'))) return path.join(d, 'apps', 'api-server');
    if (path.basename(d) === 'api-server' && existsSync(path.join(d, '.env'))) return d;
    d = path.dirname(d);
  }
  throw new Error('apps/api-server/.env 를 찾을 수 없음 (repo-relative)');
}
const API_DIR = resolveApiServerDir();
const readPw = (): string => readFileSync(path.join(API_DIR, '.env'), 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim();
const DATA_DIR = path.join(API_DIR, 'src', 'scripts', 'data');
const INVENTORY = path.join(DATA_DIR, 'otc-safety-subgroup-authoring-inventory-v1.json');
const OUT = path.join(DATA_DIR, 'otc-safety-subgroup-source-corpus-na-v1.json');
const DONE_FPS = new Set(['47b61841f0d337dc']); // magnesium500 완결(LIVE)

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);
const stripTags = (s: string): string => s.replace(/<[^>]+>/g, ' ');
function normalize(s: string): string { return stripTags(s || '').normalize('NFKC').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/[·・∙•▪▶►\-–—]/g, ',').replace(/^\s*\d+\)\s*/gm, '').replace(/[，、]/g, ',').replace(/[．。]/g, '.').replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',').trim(); }
function easySections(content: string): Record<string, string> { const out: Record<string, string> = {}; const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g; let m: RegExpExecArray | null; while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim(); return out; }
function freeSections(content: string): Record<string, string> { const out: Record<string, string> = {}; const re = /<(h[1-4]|strong)[^>]*>\s*([^<]{2,40}?)\s*<\/\1>([\s\S]*?)(?=<(?:h[1-4]|strong)[^>]*>|$)/gi; let m: RegExpExecArray | null; while ((m = re.exec(content))) { const t = m[2].replace(/[:：]\s*$/, '').trim(); const b = m[3].trim(); if (t) out[t] = (out[t] ? out[t] + '\n' : '') + b; } return out; }
function buckets(content: string): { ind: string; dos: string; cau: string } { let sec = easySections(content); if (Object.keys(sec).length === 0) sec = freeSections(content); let ind = '', dos = '', cau = ''; for (const [t, b] of Object.entries(sec)) { if (/효능|효과|적응|용도/.test(t)) ind += (ind ? '\n' : '') + b; else if (/용법|용량|복용|투여\s*방법|사용\s*방법|사용법/.test(t)) dos += (dos ? '\n' : '') + b; else if (/주의|경고|금기|부작용|이상\s*반응|임부|임신|수유|병용|상호/.test(t)) cau += (cau ? '\n' : '') + b; } return { ind, dos, cau }; }
const clean = (s: string): string => stripTags(s || '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();

async function main(): Promise<void> {
  const inv = JSON.parse(readFileSync(INVENTORY, 'utf8'));
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: parseInt(process.env.DB_PORT || '5442', 10), username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 300000 } });
  await ds.initialize();

  const groups: any[] = [];
  let subTotal = 0, drift = 0, multiMd5 = 0;
  try {
    for (const g of inv.groups) {
      const readySubs = (g.subgroups || []).filter((s: any) => s.cls === 'READY_SAFETY_SUBGROUP' && !DONE_FPS.has(s.safetyFp));
      if (readySubs.length === 0) continue;
      const outSubs: any[] = [];
      for (const s of readySubs) {
        const rows: Array<{ id: string; name: string; spec: string; ko_src: string | null; easy: string | null }> = await ds.query(`
          SELECT mid::text id, pm.name, pm.specification spec,
            (SELECT src.source_type FROM shared_product_descriptions src WHERE src.master_id=mid AND src.description_type='STORE' AND COALESCE(src.language,'ko')='ko' AND src.status='canonical' AND src.deleted_at IS NULL LIMIT 1) ko_src,
            (SELECT e.content FROM shared_product_descriptions e WHERE e.master_id=mid AND e.source_type='mfds_easy_drug' AND e.description_type='STORE' AND COALESCE(e.language,'ko')='ko' AND e.status='canonical' AND e.deleted_at IS NULL ORDER BY length(e.content) DESC LIMIT 1) easy
          FROM unnest($1::uuid[]) mid JOIN product_masters pm ON pm.id=mid`, [s.master_ids]);
        const driftIds = rows.filter((r) => r.ko_src !== 'mfds_easy_drug' || !r.easy).map((r) => r.id).sort();
        // md5 종류별 분할 (runner easy md5 단일 게이트 대비)
        const byMd5 = new Map<string, string[]>();
        for (const r of rows) if (r.easy) { const h = md5(r.easy); (byMd5.get(h) || byMd5.set(h, []).get(h)!).push(r.id); }
        const md5Kinds = [...byMd5.entries()].map(([h, ids]) => ({ md5: h.slice(0, 8), n: ids.length, ids: ids.sort() })).sort((a, b) => b.n - a.n || (a.md5 < b.md5 ? -1 : 1));
        // 대표 원문(최다 md5) 버킷 + fp 재검증
        const rep = rows.find((r) => r.easy && md5(r.easy!).slice(0, 8) === md5Kinds[0]?.md5);
        let bkt = { ind: '', dos: '', cau: '' }; let fpRecalc = '';
        if (rep?.easy) { bkt = buckets(rep.easy); fpRecalc = H([H(normalize(bkt.ind)), H(normalize(bkt.dos)), H(normalize(bkt.cau))].join('|')); }
        // fp 일치 검증: subgroup 전 md5 kind 의 버킷 fp 동일해야 함
        const fpKinds = new Set<string>();
        for (const [h] of byMd5) { const rr = rows.find((r) => r.easy && md5(r.easy!) === h)!; const b2 = buckets(rr.easy!); fpKinds.add(H([H(normalize(b2.ind)), H(normalize(b2.dos)), H(normalize(b2.cau))].join('|'))); }
        const names = [...new Set(rows.map((r) => r.name))].sort();
        if (driftIds.length) drift++;
        if (md5Kinds.length > 1) multiMd5++;
        subTotal++;
        outSubs.push({
          safetyFp: s.safetyFp, T: s.master_ids.length, master_ids: s.master_ids,
          names, spec: rows[0]?.spec || null,
          driftIds, md5Kinds,
          fpRecalcMatch: fpRecalc === s.safetyFp, fpKindsCount: fpKinds.size,
          source: { efficacy: clean(bkt.ind), usage: clean(bkt.dos), caution: clean(bkt.cau) },
        });
      }
      groups.push({ groupKey: g.groupKey, ing: g.ing, strength: g.strength, form: g.form, subgroups: outSubs });
      console.error(`  ${g.groupKey}: ${outSubs.length} subs`);
    }
  } finally { await ds.destroy(); }

  const out = {
    wo: 'WO-O4O-OTC-SAFETY-MISMATCH-HYBRID-AUTHORING-AND-BATCH-APPLY-NA-V3', agent: '나', readOnly: true, dbWrite: 0,
    note: '남은 277 READY subgroup 공식 원문 코퍼스(저작 grounding 용). source=대표(최다 md5) easy 원문 버킷 클린텍스트. md5Kinds>1 은 apply-unit 분할 필요(runner easy md5 단일 게이트).',
    summary: { groups: groups.length, subgroups: subTotal, driftSubgroups: drift, multiMd5Subgroups: multiMd5 },
    groups,
  };
  writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify(out.summary, null, 2));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
