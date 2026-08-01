/**
 * OTC zh — 번역 소배치 결과를 결정적 대응표에 병합한다 (로컬 파일 전용 · DB 무접근)
 *
 * 입력: `otc-zh-unit-map-add-NN.ga.json` = { zh: { unitId: 중국어 }, hold: { unitId: 사유 } }
 *   KO 원문은 재입력하지 않고 `otc-zh-unit-select.ga.json` 에서 가져온다(오기 방지).
 * 가드: 알 수 없는 unitId · 이미 다른 값으로 매핑된 unitId · 한글 잔존 · 빈 값 → 병합 중단.
 */
import fs from 'node:fs';
import path from 'node:path';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };

const addFile = arg('--add');
if (!addFile) { console.error('FATAL --add <file> 필요'); process.exit(1); }
const add = JSON.parse(fs.readFileSync(P(addFile), 'utf8'));
const sel = JSON.parse(fs.readFileSync(P('otc-zh-unit-select.ga.json'), 'utf8'));
const byId = new Map<string, any>((sel.units as any[]).map((u) => [u.id, u]));
const map = JSON.parse(fs.readFileSync(P('otc-zh-unit-map.ga.json'), 'utf8'));

const errs: string[] = [];
let added = 0, heldNew = 0;
for (const [id, zh] of Object.entries(add.zh as Record<string, string>)) {
  const u = byId.get(id);
  if (!u) { errs.push(`UNKNOWN_UNIT:${id}`); continue; }
  if (!zh || !zh.trim()) { errs.push(`EMPTY:${id}`); continue; }
  if (/[가-힣]/.test(zh)) { errs.push(`HANGUL_IN_ZH:${id}`); continue; }
  const prev = map.units[id];
  if (prev && prev.zh !== zh) { errs.push(`CONFLICT:${id}`); continue; }
  if (prev) continue;
  map.units[id] = { kind: u.kind, ko: u.text, zh };
  added++;
}
for (const [id, why] of Object.entries((add.hold || {}) as Record<string, string>)) {
  if (map.units[id]) { errs.push(`HOLD_ALREADY_MAPPED:${id}`); continue; }
  if (!map.hold[id]) { map.hold[id] = why; heldNew++; }
}

/* 동일 KO 문장 → 동일 중국어 (결정성) 검증 */
const byKo = new Map<string, string>();
for (const [id, u] of Object.entries(map.units as Record<string, any>)) {
  const prev = byKo.get(u.ko);
  if (prev && prev !== u.zh) errs.push(`NONDETERMINISTIC_KO:${id}`);
  byKo.set(u.ko, u.zh);
}

if (errs.length) { console.error('FATAL ' + JSON.stringify(errs.slice(0, 20), null, 1)); process.exit(1); }
fs.writeFileSync(P('otc-zh-unit-map.ga.json'), JSON.stringify(map, null, 1) + '\n', 'utf8');
console.log(JSON.stringify({ addFile, added, heldNew, totalUnits: Object.keys(map.units).length,
  totalHold: Object.keys(map.hold).length, distinctKo: byKo.size }, null, 1));
