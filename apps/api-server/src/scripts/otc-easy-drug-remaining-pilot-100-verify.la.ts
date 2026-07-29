/**
 * WO-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-100-QUEUE-V1 — 독립검증 (READ-ONLY)
 *
 * ⚠️ READ-ONLY · DB write 0. 선정 스크립트와 **별개 코드경로**로 pilot 100 원장을 재검증한다.
 * 선정 로직을 재사용하지 않고, 산출 JSON 을 입력으로 받아 DB 실측과 직접 대조한다.
 *
 * Usage(apps/api-server): ../../node_modules/.bin/tsx src/scripts/otc-easy-drug-remaining-pilot-100-verify.la.ts [--port 5491]
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const retRows = <T>(r: unknown): T[] => (Array.isArray(r) && Array.isArray(r[0]) ? r[0] : (r as unknown[])) as T[];
const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const readPw = (): string => {
  const m = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8').match(/^DB_PASSWORD=(.*)$/m);
  if (!m) throw new Error('DB_PASSWORD not found in .env');
  return m[1].trim();
};
const argPort = (): number => {
  const i = process.argv.indexOf('--port');
  return i >= 0 && process.argv[i + 1] ? parseInt(process.argv[i + 1], 10) : 5491;
};

async function main(): Promise<void> {
  const ledger = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'otc-easy-drug-remaining-pilot-100-ledger-v1.json'), 'utf8'));
  const gaInput = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'otc-easy-drug-remaining-pilot-100-agent-ga-input-v1.json'), 'utf8'));
  const readyLedger = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'otc-easy-drug-ready-1134-unit-ledger-v1.json'), 'utf8'));
  const ready1134 = new Set<string>((readyLedger.units as any[]).flatMap((u) => u.masterIds));
  const rows: any[] = ledger.masters;
  const ids: string[] = rows.map((r) => r.masterId);

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: '127.0.0.1', port: argPort(), username: 'o4o_api', password: readPw(),
    database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 600000 },
  });
  await ds.initialize();
  await ds.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');

  // 1) master 실재 + OTC 여부
  const live = retRows<{ mid: string; name: string; otc: string }>(await ds.query(`
    SELECT pm.id::text mid, pm.name,
      (SELECT count(*) FROM product_drug_extensions e WHERE e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL)::text otc
    FROM product_masters pm WHERE pm.id = ANY($1::uuid[])`, [ids]));
  const liveBy = new Map(live.map((r) => [r.mid, r]));

  // 2) 공식 원문 hash 실측 재계산
  const src = retRows<{ mid: string; content: string }>(await ds.query(`
    SELECT DISTINCT ON (s.master_id) s.master_id::text mid, s.content
    FROM shared_product_descriptions s
    WHERE s.master_id = ANY($1::uuid[]) AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
      AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
    ORDER BY s.master_id, length(s.content) DESC`, [ids]));
  const hashBy = new Map(src.map((r) => [r.mid, md5(r.content)]));

  // 3) 기존 canonical 점유
  const canon = retRows<{ mid: string; ko: string; en: string }>(await ds.query(`
    SELECT m.mid::text mid,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE'
        AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.deleted_at IS NULL
        AND s.source_type=ANY(ARRAY['mfds_drug_otc','mfds_drug_otc_nutrition_combo','o4o_drug_otc_topical','nutrition_combo']))::text ko,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE'
        AND s.language='en' AND s.status='canonical' AND s.deleted_at IS NULL)::text en
    FROM unnest($1::uuid[]) m(mid)`, [ids]));
  const canonBy = new Map(canon.map((r) => [r.mid, r]));

  // 4) sourceRef LIVE 점유
  const refs = rows.map((r) => r.plannedSourceRef);
  const refHit = retRows<{ n: string }>(await ds.query(
    `SELECT count(*)::text n FROM shared_product_descriptions WHERE source_ref_id = ANY($1::uuid[]) AND deleted_at IS NULL`, [refs]));

  await ds.query('COMMIT');
  await ds.destroy();

  const fail: string[] = [];
  const push = (ok: boolean, msg: string) => { if (!ok) fail.push(msg); };

  push(rows.length === 100, `pilot != 100 (${rows.length})`);
  push(new Set(ids).size === 100, `masterId 중복 ${100 - new Set(ids).size}`);
  push(ids.every((id) => liveBy.has(id)), 'master 미실재 존재');
  push(ids.every((id) => Number(liveBy.get(id)?.otc || 0) > 0), 'OTC 아님 포함');
  push(ids.every((id) => liveBy.get(id)!.name === rows.find((r) => r.masterId === id)!.productName), '제품명 원장≠DB');
  push(ids.every((id) => !ready1134.has(id)), 'READY 1,134 교집합 존재');
  push(rows.every((r) => (r.officialSourceHash ?? null) === (hashBy.get(r.masterId) ?? null)), 'officialSourceHash 원장≠DB');
  push(rows.every((r) => Number(canonBy.get(r.masterId)!.ko) === r.existingAuthoredKoCanonical), 'existingAuthoredKoCanonical 불일치');
  push(rows.every((r) => Number(canonBy.get(r.masterId)!.en) === r.existingEnCanonical), 'existingEnCanonical 불일치');
  push(rows.filter((r) => r.stratum === 'A_NORMAL').every((r) => Number(canonBy.get(r.masterId)!.ko) === 0 && Number(canonBy.get(r.masterId)!.en) === 0), 'A 정상 대기열에 기존 canonical 점유');
  push(new Set(refs).size === 100, 'sourceRef 중복');
  push(Number(refHit[0].n) === 0, `sourceRef LIVE 점유 ${refHit[0].n}`);
  push(rows.every((r) => r.plannedSourceRef === (() => { const h = md5('otc-v4-master-leaflet:' + r.masterId); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`; })()), 'sourceRef 산식 불일치');
  push(gaInput.masters.length === 100 && gaInput.masters.every((g: any, i: number) => g.masterId === rows[i].masterId && g.expectedStatus === rows[i].expectedStatus), 'agent-ga 입력 ≠ pilot 원장');
  push(rows.filter((r) => r.stratum === 'A_NORMAL').every((r) => r.officialSectionPresence['효능·효과'] === 1 && r.officialSectionPresence['용법·용량'] === 1), 'A 정상에 필수 원문축 결손');
  push(rows.filter((r) => r.stratum === 'A_NORMAL').every((r) => !r.professionalSuspect), 'A 정상에 전문/수술 의심 포함');
  push(rows.every((r) => r.expectedStatus === 'PRODUCE_EXPECTED' || !!r.expectedExceptionCode), '사전예외에 예외코드 누락');

  console.log('=== PILOT 100 독립검증 (별개 코드경로 · READ-ONLY · dbWrite 0) ===');
  console.log(`rows ${rows.length} · masterUniq ${new Set(ids).size} · sourceRefUniq ${new Set(refs).size} · sourceRefLiveHit ${refHit[0].n}`);
  console.log(`byStratum ${JSON.stringify(ledger.summary.byStratum)}`);
  console.log(fail.length ? `FAIL(${fail.length}):\n - ${fail.join('\n - ')}` : 'VERIFY: ALL PASS');
  if (fail.length) process.exit(1);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
