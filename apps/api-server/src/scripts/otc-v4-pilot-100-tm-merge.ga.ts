/**
 * WO-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-100-PRODUCTION-V1
 *   — V4 EN 번역메모리 배치 병합기 (에이전트 가)
 *
 * TM 은 {KO 문장 -> EN 문장} 1:1 사전이다. 저작은 배치 파일({번호: "English"})로 넣는다.
 * 번호 = TM 전체 키를 정렬한 배열의 0-based index (고정).
 *
 *   --dump [--from=0] [--count=40] [--all]   미충족 문장을 번호와 함께 출력
 *   --merge=<path.json>                       배치 병합(빈 값·기존 값 덮어쓰기 금지 옵션 --force)
 *   --stat                                    충족률
 *
 * DB 접근 0.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './otc-v4-master-leaflet-contract.ga.js';

const TM = path.join(DATA_DIR, 'otc-v4-pilot-100-tm.ga.json');
const arg = (k: string): string => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
const has = (k: string): boolean => process.argv.some((a) => a === `--${k}` || a.startsWith(`--${k}=`));

const j = JSON.parse(fs.readFileSync(TM, 'utf8'));
const entries: Record<string, string> = j.entries;
const keys = Object.keys(entries).sort();

function save(): void {
  j.entries = Object.fromEntries(keys.map((k) => [k, entries[k]]));
  j.filled = keys.filter((k) => entries[k]).length;
  fs.writeFileSync(TM, JSON.stringify(j, null, 2) + '\n', 'utf8');
}

if (has('stat')) {
  const filled = keys.filter((k) => entries[k]).length;
  console.log(JSON.stringify({ total: keys.length, filled, pending: keys.length - filled }, null, 2));
} else if (has('dump')) {
  const from = parseInt(arg('from') || '0', 10);
  const count = parseInt(arg('count') || '40', 10);
  const pend = keys.map((k, i) => [i, k] as const).filter(([, k]) => has('all') || !entries[k]);
  for (const [i, k] of pend.slice(from, from + count)) {
    const a = j.annotations?.[k];
    console.log(`${i}\t[${a ? `${a.routes.join('/')}|${a.section}` : '?'}]\t${k}`);
  }
  console.error(`-- dumped ${Math.min(count, Math.max(0, pend.length - from))} of ${pend.length} pending`);
} else if (has('merge')) {
  const file = arg('merge');
  const batch = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, string>;
  let applied = 0, skipped = 0;
  const bad: string[] = [];
  for (const [idxStr, en] of Object.entries(batch)) {
    const i = parseInt(idxStr, 10);
    const k = keys[i];
    if (!k) { bad.push(`index ${idxStr} 범위 밖`); continue; }
    if (!en || !en.trim()) { bad.push(`index ${idxStr} 빈 값`); continue; }
    if (/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(en)) { bad.push(`index ${idxStr} EN 에 한글 잔존`); continue; }
    if (entries[k] && !has('force')) { skipped++; continue; }
    entries[k] = en.trim(); applied++;
  }
  if (bad.length) { console.error(JSON.stringify({ rejected: bad }, null, 2)); process.exitCode = 2; }
  save();
  const filled = keys.filter((k) => entries[k]).length;
  console.log(JSON.stringify({ applied, skipped, rejected: bad.length, total: keys.length, filled, pending: keys.length - filled }, null, 2));
} else {
  console.error('mode 필요: --dump | --merge=<file> | --stat');
  process.exit(1);
}
