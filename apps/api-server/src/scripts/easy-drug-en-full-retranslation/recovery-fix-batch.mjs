/**
 * BLOCKED master 정정용 배치를 만든다.
 *
 * - 새 master 를 선정하지 않는다. 지정된 BLOCKED master 와, 그 안에서 지정된 hash 의 문장만 담는다.
 * - 문장 KO 본문은 ko-units 에서 직접 읽는다(전사 오류 방지).
 * - 산출물은 produce-emit 이 만드는 배치와 동일한 스키마이므로 produce-ingest 가 그대로 수납한다.
 *   TM 은 append-only last-wins 이므로 기존 문장의 번역이 교체된다.
 *
 * 사용: node recovery-fix-batch.mjs <batch> <masterId,...> <hash,...>
 */
import fs from 'node:fs';
import path from 'node:path';
import { streamKoUnits, tmKey, RESULTS } from './tm-lib.mjs';

const [, , BATCH, MASTERS, HASHES] = process.argv;
if (!BATCH || !MASTERS || !HASHES) { process.stderr.write('사용: node recovery-fix-batch.mjs <batch> <masterId,...> <hash,...>\n'); process.exit(2); }

const masters = MASTERS.split(',');
const hashes = new Set(HASHES.split(','));
const wantMasters = new Set(masters);

const sentences = new Map();
for (const ko of streamKoUnits()) {
  if (!wantMasters.has(ko.masterId)) continue;
  for (const s of ko.segments) {
    if (s.kind !== 'BODY') continue;
    const h = tmKey(s.text);
    if (!hashes.has(h)) continue;
    if (sentences.has(h)) { sentences.get(h).masters++; continue; }
    sentences.set(h, { hash: h, ko: s.text, section: s.section, masters: 1 });
  }
}

const out = {
  batch: BATCH,
  kind: 'CORRECTION',
  note: 'BLOCKED master 정정 — 기존 TM 문장의 번역만 교체한다(last-wins). 신규 master 선정 없음.',
  masters,
  sentences: [...sentences.values()],
};
const file = path.join(RESULTS, 'batches', `batch-${BATCH}.json`);
fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({
  file, masters: masters.length, sentences: out.sentences.length,
  missing: [...hashes].filter((h) => !sentences.has(h)), dbWrites: 0,
}, null, 2));
