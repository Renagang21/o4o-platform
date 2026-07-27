/** READ-ONLY — 1,134 READY easy_drug 원문의 공식 섹션 제목 분포 조사. DB write 0. */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const retRows = <T>(r: unknown): T[] => (Array.isArray(r) && Array.isArray(r[0]) ? r[0] : (r as unknown[])) as T[];
const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const LEDGER = path.join(DATA_DIR, 'otc-easy-drug-ready-1134-unit-ledger-v1.json');
const readPw = (): string => (fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8').match(/^DB_PASSWORD=(.*)$/m) || [])[1]!.trim();

function sectionTitles(content: string): string[] {
  const out: string[] = [];
  const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out.push(m[1].trim());
  return out;
}

async function main(): Promise<void> {
  const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
  const allIds: string[] = [...new Set((ledger.units as any[]).flatMap((u) => u.masterIds))] as string[];
  const byRoute: Record<string, string[]> = {};
  for (const u of ledger.units as any[]) (byRoute[u.route] ||= []).push(...u.masterIds);
  console.log(`total masters=${allIds.length}  routes=${Object.entries(byRoute).map(([r, a]) => `${r}:${new Set(a).size}`).join(' ')}`);

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: 5442, username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'] });
  await ds.initialize();
  const rows = retRows<{ id: string; content: string }>(await ds.query(`
    SELECT pop.id, es.content FROM (SELECT unnest($1::uuid[])::text id) pop
    JOIN LATERAL (SELECT content FROM shared_product_descriptions s
      WHERE s.master_id=pop.id::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
        AND s.status IN ('canonical','deprecated') AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
      ORDER BY (s.status='canonical') DESC, length(s.content) DESC LIMIT 1) es ON true`, [allIds]));
  await ds.destroy();

  const routeOf = new Map<string, string>();
  for (const u of ledger.units as any[]) for (const mid of u.masterIds) routeOf.set(mid, u.route);

  const globalFreq = new Map<string, number>();
  const perRouteFreq: Record<string, Map<string, number>> = {};
  let missing = 0;
  const foundIds = new Set(rows.map((r) => r.id));
  for (const id of allIds) if (!foundIds.has(id)) missing++;
  for (const r of rows) {
    const titles = [...new Set(sectionTitles(r.content))];
    const route = routeOf.get(r.id) || '?';
    (perRouteFreq[route] ||= new Map());
    for (const t of titles) {
      globalFreq.set(t, (globalFreq.get(t) || 0) + 1);
      perRouteFreq[route].set(t, (perRouteFreq[route].get(t) || 0) + 1);
    }
  }
  console.log(`\ncontent rows fetched=${rows.length}  missing content=${missing}`);
  console.log('\n=== GLOBAL section title frequency (of', rows.length, 'masters) ===');
  for (const [t, c] of [...globalFreq.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(c).padStart(5)}  ${t}`);
  for (const route of Object.keys(perRouteFreq)) {
    const total = new Set((byRoute[route] || [])).size;
    console.log(`\n=== ${route} (n=${total}) ===`);
    for (const [t, c] of [...perRouteFreq[route].entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(c).padStart(5)}  ${t}`);
  }
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
