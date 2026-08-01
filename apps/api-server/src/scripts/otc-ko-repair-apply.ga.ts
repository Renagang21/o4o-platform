/**
 * WO-…-KO-CANONICAL-FULL-AUDIT-REPAIR-AND-POPULATION-LOCK-V1 — 실행 D (dry-run / apply)
 *
 * 근거가 확보된 절단 KO 슬롯만 **좁은 트랜잭션**으로 복원한다.
 *   · 새 문장을 만들지 않는다. 다른 문서에 실재하는 **검증된 완결본을 그대로** 옮긴다.
 *   · 대상은 유닛 전체가 아니라 안전지문을 통과한 **문서 단위**다.
 *   · 텍스트 노드만 치환하므로 태그 골격·슬롯 수가 변하지 않는다.
 *
 * 가드: id + description_type + status + language + master_id + **현재 content 원문 일치**.
 *   동시 변경이 있으면 rowCount 0 → 그 대상만 HOLD 하고 나머지는 계속 진행한다.
 *
 * 적용:  OTC_KO_REPAIR=CONFIRM tsx otc-ko-repair-apply.ga.ts --apply --port NNNN
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import { slots, substitute, uid, type Slot } from './otc-zh-slots.ga.js';
import { judgeDoc } from './otc-ko-truncation-policy.ga.js';
import { assertSpec } from './otc-ko-truncation-policy.spec.ga.js';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const APPLY = process.argv.includes('--apply') && process.env.OTC_KO_REPAIR === 'CONFIRM';

const skeleton = (h: string): string => h.replace(/>[^<]*</g, '><').replace(/^[^<]*/, '').replace(/[^>]*$/, '');
const nums = (s: string): string[] => (s.replace(/\s+/g, '').match(/\d+(?:[.,]\d+)*/g) || []);
/** 공백·구두점을 뺀 실질 내용 길이 — 완결본이 공백을 덜 쓰면 원문과 글자 수가 같을 수 있다. */
const alnum = (s: string): string => s.replace(/[^0-9A-Za-z가-힣]/g, '');
const KO_PROHIBIT = /(마십시오|마세요|말고|금지|금기|삼가|피하십시오|투여하지|복용하지)/;

async function main(): Promise<void> {
  assertSpec();
  const ev = JSON.parse(fs.readFileSync(P('otc-ko-repair-evidence.ga.json'), 'utf8'));
  const repairs = (ev.units as any[]).filter((u) => u.candidate && u.eligibleMasters?.length);
  const byUnit = new Map<string, any>(repairs.map((u) => [u.id, u]));
  const eligible = new Set<string>(repairs.flatMap((u) => u.eligibleMasters));

  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5690', 10), database: 'o4o_platform',
    max: 4, statement_timeout: 900000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  if (!APPLY) await pool.query('SET default_transaction_read_only = on');

  const mids = [...eligible];
  const rows: any[] = [];
  for (let i = 0; i < mids.length; i += 400)
    rows.push(...(await pool.query(`
      SELECT id::text id, master_id::text master_id, content FROM shared_product_descriptions
       WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND status='canonical'
         AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL`, [mids.slice(i, i + 400)])).rows);

  const plan: any[] = [], rejected: any[] = [];
  for (const r of rows) {
    const src = String(r.content || '');
    const sl: Slot[] = slots(src);
    /* 이 문서에서 복원 대상이 되는 슬롯 인덱스 수집 */
    const targets = new Map<number, string>();
    for (let i = 0; i < sl.length; i++) {
      const u = byUnit.get(uid(sl[i].kind, sl[i].text));
      if (u && u.eligibleMasters.includes(r.master_id)) targets.set(i, u.candidate);
    }
    if (!targets.size) continue;

    const out = substitute(src, (s) => {
      const i = sl.findIndex((x) => x.start === s.start && x.end === s.end);
      return targets.has(i) ? targets.get(i)! : s.text;   // 나머지는 원문 그대로 되돌려 놓는다
    }).out;

    /* ── 적용 전 검증 ─────────────────────────────────────────────────────── */
    const gates: string[] = [];
    if (skeleton(out) !== skeleton(src)) gates.push('G1_SKELETON');
    const outSl = slots(out);
    if (outSl.length !== sl.length) gates.push('G4_SLOT_COUNT');
    if (outSl.some((s) => !s.text.trim())) gates.push('G5_NONEMPTY');
    const outV = judgeDoc(out, outSl);
    for (const i of targets.keys()) {
      if (outV[i]?.blocked) gates.push(`STILL_BLOCKED@${i}:${outV[i].reason}`);
      const before = sl[i].text, after = outSl[i].text;
      if (!nums(before).every((v) => nums(after).includes(v))) gates.push(`NUMERIC_LOST@${i}`);
      if (KO_PROHIBIT.test(before) && !KO_PROHIBIT.test(after)) gates.push(`PROHIBITION_LOST@${i}`);
      if (alnum(after).length <= alnum(before).length) gates.push(`NOT_EXTENDED@${i}`);
    }
    /* 대상 슬롯 외의 텍스트가 하나라도 달라지면 적용하지 않는다. */
    for (let i = 0; i < sl.length; i++)
      if (!targets.has(i) && outSl[i]?.text !== sl[i].text) gates.push(`COLLATERAL_CHANGE@${i}`);

    const rec = { koId: r.id, masterId: r.master_id, slots: [...targets.keys()],
      beforeLen: src.length, afterLen: out.length,
      units: [...targets.keys()].map((i) => uid(sl[i].kind, sl[i].text)) };
    if (gates.length) rejected.push({ ...rec, gates: [...new Set(gates)] });
    else plan.push({ ...rec, src, out });
  }

  /* ── 적용 ──────────────────────────────────────────────────────────────── */
  let updated = 0, guardMiss = 0;
  const applied: any[] = [];
  if (APPLY) {
    for (const p of plan) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const r = await client.query(`
          UPDATE shared_product_descriptions SET content = $1, updated_at = now()
           WHERE id = $2::uuid AND master_id = $3::uuid AND description_type='STORE'
             AND status='canonical' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL
             AND content = $4`, [p.out, p.koId, p.masterId, p.src]);
        if (r.rowCount === 1) { await client.query('COMMIT'); updated++; applied.push({ koId: p.koId, masterId: p.masterId, slots: p.slots, beforeLen: p.beforeLen, afterLen: p.afterLen }); }
        else { await client.query('ROLLBACK'); guardMiss++; }
      } catch (e) { await client.query('ROLLBACK'); guardMiss++; }
      finally { client.release(); }
    }
  }
  await pool.end();

  const summary = {
    mode: APPLY ? 'apply' : 'dry-run (DB write 0)',
    repairUnits: repairs.length,
    eligibleMasters: eligible.size,
    docsPlanned: plan.length, docsRejected: rejected.length,
    rejectByGate: rejected.flatMap((r) => r.gates).reduce((a: Record<string, number>, g) => {
      const k = g.split('@')[0]; a[k] = (a[k] || 0) + 1; return a; }, {}),
    updated, guardMiss,
  };
  fs.writeFileSync(P(APPLY ? 'otc-ko-repair-applied.ga.json' : 'otc-ko-repair-dryrun.ga.json'),
    JSON.stringify({ summary, applied,
      plan: plan.map((p) => ({ koId: p.koId, masterId: p.masterId, slots: p.slots, beforeLen: p.beforeLen, afterLen: p.afterLen, units: p.units })),
      rejected }, null, 1), 'utf8');
  console.log(JSON.stringify(summary, null, 1));
}
main().catch((e) => { console.error(e); process.exit(1); });
