/**
 * Agent B 소유 — sweep PASS combo target 일괄 적재 드라이버 (공용 hff-sf-apply 미편집 재사용).
 *   각 target: dry-run(exec+rollback) → 게이트 통과 시 --apply(HFF_SF_APPLY_CONFIRM=YES).
 *   tag = batch:combo-b-<slug> (B 전용 네임스페이스). rollback manifest = HFF_SCRATCH_DIR.
 *
 * 게이트(배치별): postVerifyPass · canonicalDup 0 · expectedWrites.total == PASS*4 · dry-run/apply write 일치.
 * 실행: dry-run  : WD=<dir> PROXY_PORT=5442 DB_* npx tsx src/scripts/hff-combo-b-apply.ts
 *       apply   : 위 + --apply  (HFF_SF_APPLY_CONFIRM=YES 는 드라이버가 자식에 주입)
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const WD = process.env.WD;
if (!WD) throw new Error('WD env 필요');
const APPLY = process.argv.includes('--apply');
const NODE = process.execPath;
const APPLY_SCRIPT = 'src/scripts/hff-sf-apply.ts';

type Row = { i: number; sig: string; slug: string; PASS: number; err: string };
const summary: Row[] = JSON.parse(fs.readFileSync(path.join(WD, 'sweep-summary.json'), 'utf8'));
// 도메인 경계: A 전용 기능성(관절 MSM·글루코사민)이 섞인 combo 는 B 가 생산하지 않는다(타 에이전트 영역 침범 방지).
const A_ONLY = /(^|\+)(MSM|글루코사민)(\+|$)/;
const excludedByDomain = summary.filter((r) => r.PASS > 0 && A_ONLY.test(r.sig));
if (excludedByDomain.length) fs.writeFileSync(path.join(WD, 'excluded-a-domain.json'), JSON.stringify(excludedByDomain, null, 1));
const todo = summary.filter((r) => r.PASS > 0 && !A_ONLY.test(r.sig));

const parseReport = (out: string): Record<string, unknown> | null => {
  const b = out.indexOf('JSON_REPORT_BEGIN'); const e = out.indexOf('JSON_REPORT_END');
  if (b < 0 || e < 0) return null;
  return JSON.parse(out.slice(b + 'JSON_REPORT_BEGIN'.length, e).trim());
};

const results: Array<Record<string, unknown>> = [];
let totApplied = 0, totWrite = 0, gateFail = 0;
for (const r of todo) {
  const target = path.join(WD, 'sweep', r.slug, 'target.json');
  // 게이트 기준 수량은 target 파일 실측(재생성 대비) — sweep-summary PASS 대신 사용.
  const units = fs.existsSync(target) ? (JSON.parse(fs.readFileSync(target, 'utf8')) as unknown[]).length : 0;
  if (units === 0) { results.push({ i: r.i, sig: r.sig, stage: 'skip', ok: false, reason: 'target 0' }); continue; }
  r.PASS = units;
  // TAG_PREFIX: 라운드별 provenance 분리(기본 combo-b, 미등록 재검토 라운드=combo-b-unreg). verify 는 batch:<prefix>-% 로 델타 식별.
  const TAG_PREFIX = process.env.HFF_COMBO_B_TAG_PREFIX || 'combo-b';
  const tag = `batch:${TAG_PREFIX}-${r.slug.replace(/^cb-\d+-/, '').replace(/[^0-9A-Za-z가-힣_]/g, '').slice(0, 60)}`;
  const rollback = `hff-${TAG_PREFIX}-${r.i}`;
  const env = { ...process.env, HFF_SF_APPLY_CONFIRM: 'YES' };
  const args = ['--import', 'tsx', APPLY_SCRIPT, '--target', target, '--tag', tag, '--rollback', rollback];
  // dry-run first
  let dryOut = '';
  try { dryOut = execFileSync(NODE, args, { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }); }
  catch (e) { const eo = e as { stdout?: string; message?: string }; results.push({ i: r.i, sig: r.sig, stage: 'dry-run', ok: false, err: (eo.stdout ? parseReport(eo.stdout) : null) || eo.message?.split('\n')[0] }); gateFail++; continue; }
  const dry = parseReport(dryOut);
  const ew = (dry?.expectedWrites as { total: number } | undefined)?.total ?? -1;
  const gateOk = dry?.postVerifyPass === true && (dry?.postVerify as { canonicalDup: number })?.canonicalDup === 0 && ew === r.PASS * 4;
  if (!gateOk) { results.push({ i: r.i, sig: r.sig, stage: 'dry-run', ok: false, gate: 'FAIL', report: dry }); gateFail++; continue; }
  if (!APPLY) { results.push({ i: r.i, sig: r.sig, stage: 'dry-run', ok: true, expectedWrites: ew, tag }); continue; }
  // apply
  let apOut = '';
  try { apOut = execFileSync(NODE, [...args, '--apply'], { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }); }
  catch (e) { const eo = e as { stdout?: string; message?: string }; results.push({ i: r.i, sig: r.sig, stage: 'apply', ok: false, err: (eo.stdout ? parseReport(eo.stdout) : null) || eo.message?.split('\n')[0] }); gateFail++; continue; }
  const ap = parseReport(apOut);
  const applied = ap?.result === 'COMMIT 완료' && ap?.postVerifyPass === true;
  if (applied) { totApplied += r.PASS; totWrite += ew; }
  else gateFail++;
  results.push({ i: r.i, sig: r.sig, stage: 'apply', ok: applied, applied: r.PASS, expectedWrites: ew, tag, result: ap?.result });
  console.log(`[${r.i}] ${r.sig} → ${applied ? 'COMMIT ' + r.PASS : 'FAIL'}`);
}
fs.writeFileSync(path.join(WD, `apply-report${APPLY ? '' : '-dryrun'}.json`), JSON.stringify(results, null, 1));
console.log(`\n=== ${APPLY ? 'APPLY' : 'DRY-RUN'} DONE: sigs ${todo.length} · applied ${totApplied} · DB write ${totWrite} · gateFail ${gateFail} ===`);
