/**
 * WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-FROM-REBUILT-KO-V1 — 5단계 표본 번역을 TM 초기 시드로 등재
 *
 * 표본 13 master 는 정정된 검증기로 **13/13 문서 검증을 통과**했으므로 그 문장들은 재사용 가능하다.
 * 다만 TM 진입 게이트(checkSentence)는 예외 없이 다시 통과시킨다 — 문서 통과가 문장 통과를 함의하지 않는다.
 *
 * 같은 KO 문장이 표본 안에서 서로 다른 EN 으로 번역돼 있으면 **등재하지 않고 충돌로 보고한다.**
 * 조용히 하나를 고르면 어느 쪽이 맞는지 모르는 채 수백 master 로 번진다.
 *
 * 사용: node tm-seed-samples.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  RESULTS, tmKey, loadTM, appendTM, checkSentence, bodySentences, streamKoUnits,
} from './tm-lib.mjs';

const draft = JSON.parse(fs.readFileSync(path.join(RESULTS, 'sample-en-translations.json'), 'utf8'));
const targets = new Set(Object.keys(draft).filter((k) => !k.startsWith('_')));

const pairs = new Map(); // hash → {ko, en, masters:[]}
const conflicts = [];
let mismatched = 0;

for (const ko of streamKoUnits()) {
  if (!targets.has(ko.masterId)) continue;
  const bodies = draft[ko.masterId];
  const segs = bodySentences(ko);
  if (segs.length !== bodies.length) { mismatched++; continue; }
  for (let i = 0; i < segs.length; i++) {
    const h = tmKey(segs[i].text);
    const en = String(bodies[i]).trim();
    const prev = pairs.get(h);
    if (prev && prev.en !== en) { conflicts.push({ hash: h, ko: segs[i].text, a: prev.en, b: en }); continue; }
    if (prev) { prev.masters.push(ko.masterId); continue; }
    pairs.set(h, { ko: segs[i].text, en, masters: [ko.masterId] });
  }
}

const conflictHashes = new Set(conflicts.map((c) => c.hash));
const tm = loadTM();
const admitted = [], rejected = [];
for (const [hash, p] of pairs) {
  if (conflictHashes.has(hash) || tm.has(hash)) continue;
  const r = checkSentence(p.ko, p.en);
  if (r.pass) admitted.push({ hash, ko: p.ko, en: p.en, batch: 'seed-sample', source: 'agent' });
  else rejected.push({ hash, ko: p.ko, en: p.en, violations: r.violations });
}
appendTM(admitted);

const out = {
  wo: 'WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-FROM-REBUILT-KO-V1',
  step: 'tm-seed-samples',
  sampleMasters: targets.size,
  bodyCountMismatch: mismatched,
  distinctSentences: pairs.size,
  admitted: admitted.length,
  rejected: rejected.length,
  rejectedDetail: rejected.slice(0, 10),
  conflicts: conflicts.length,
  conflictDetail: conflicts.slice(0, 5),
  tmSizeAfter: tm.size + admitted.length,
  dbWrites: 0,
};
fs.writeFileSync(path.join(RESULTS, 'tm-seed-samples-result.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
process.stdout.write(JSON.stringify(out, null, 2) + '\n');
