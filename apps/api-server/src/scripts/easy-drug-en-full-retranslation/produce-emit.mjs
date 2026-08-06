/**
 * WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-FROM-REBUILT-KO-V1 — 생산 배치 발행 (DB 미접속)
 *
 * 다음에 번역할 **master 묶음**과, 그 master 들이 필요로 하는 **아직 TM 에 없는 KO 문장**만 뽑아
 * `results/batches/batch-NNNN.json` 으로 낸다. 번역자(현재 세션)는 그 파일의 문장만 옮기면 된다.
 *
 * master 선정 규칙 — **미번역 문장 수가 적은 master 부터**(동률은 masterId 사전순).
 *   TM 이 이미 덮은 master 가 먼저 완성되므로, 번역 문장 1개당 완성 master 수가 최대가 된다.
 *   무작위·해시순으로 돌면 같은 문장을 여러 배치에서 다시 만나 재사용 이득이 사라진다.
 *
 * 이미 en-units.jsonl 에 있는 master 와 problem-queue 의 BLOCKED master 는 건너뛴다.
 *
 * 사용: node produce-emit.mjs [--sentences 80] [--max-masters 400]
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  RESULTS, BATCHES, loadTM, readJsonl, streamKoUnits,
  bodySentences, missingHashes, numbers, strengths, blockedMasters,
  EN_UNITS_PATH,
} from './tm-lib.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const SENT_BUDGET = parseInt(arg('--sentences', '80'), 10);
const MAX_MASTERS = parseInt(arg('--max-masters', '400'), 10);

const tm = loadTM();
const done = new Set(readJsonl(EN_UNITS_PATH).map((u) => u.masterId));
const blocked = blockedMasters();

/* 1. 전 master 를 훑어 미번역 문장 수를 센다. 본문은 들고 있지 않는다(메모리). */
const cand = [];
let total = 0;
for (const ko of streamKoUnits()) {
  total++;
  if (done.has(ko.masterId) || blocked.has(ko.masterId)) continue;
  const miss = missingHashes(ko, tm);
  cand.push({ masterId: ko.masterId, cost: miss.size, sentences: bodySentences(ko).length });
}
cand.sort((a, b) => a.cost - b.cost || (a.masterId < b.masterId ? -1 : 1));

/* 2. 예산이 찰 때까지 담는다. cost 0 인 master(=TM 만으로 조립 가능)는 예산을 쓰지 않으므로 전부 담는다. */
const pick = [];
let spent = 0;
for (const c of cand) {
  if (c.cost === 0) { pick.push(c); if (pick.length >= MAX_MASTERS) break; continue; }
  if (pick.length >= MAX_MASTERS) break;
  if (spent && spent + c.cost > SENT_BUDGET) break;
  pick.push(c); spent += c.cost;
  if (spent >= SENT_BUDGET) break;
}
const pickSet = new Set(pick.map((p) => p.masterId));

/* 3. 뽑힌 master 들의 미번역 문장을 실제로 수집한다(2차 스트림 — 본문을 이때만 들고 온다). */
const sentences = new Map();
for (const ko of streamKoUnits()) {
  if (!pickSet.has(ko.masterId)) continue;
  for (const [h, seg] of missingHashes(ko, tm)) {
    if (sentences.has(h)) { sentences.get(h).masters++; continue; }
    sentences.set(h, {
      hash: h,
      section: seg.section,
      masters: 1,
      ko: seg.text,
      koNumbers: numbers(seg.text),
      koStrengths: strengths(seg.text),
    });
  }
}

fs.mkdirSync(BATCHES, { recursive: true });
const seq = fs.readdirSync(BATCHES).filter((f) => /^batch-\d+\.json$/.test(f)).length + 1;
const id = String(seq).padStart(4, '0');
const batch = {
  wo: 'WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-FROM-REBUILT-KO-V1',
  batch: id,
  instruction: [
    '이 파일의 sentences[].ko 를 영어로 옮겨 batch-' + id + '.en.json 에 { "<hash>": "<English>" } 로 저장한다.',
    'koStrengths 배열은 순서까지 그대로 EN 에 나타나야 한다. koNumbers 에 없는 숫자를 만들지 않는다.',
    'KO 에 없는 의료 내용을 추가하지 않는다. 금기·부정어·경고 강도를 낮추지 않는다.',
    '제품명·제조사·품목기준코드는 이 배치의 번역 대상이 아니다(고정 프레임이 처리한다).',
  ],
  masters: pick.map((p) => p.masterId),
  masterCount: pick.length,
  zeroCostMasters: pick.filter((p) => p.cost === 0).length,
  sentenceCount: sentences.size,
  koChars: [...sentences.values()].reduce((a, s) => a + s.ko.length, 0),
  sentences: [...sentences.values()].sort((a, b) => b.masters - a.masters || (a.hash < b.hash ? -1 : 1)),
};
fs.writeFileSync(path.join(BATCHES, `batch-${id}.json`), JSON.stringify(batch, null, 2) + '\n', 'utf8');

process.stdout.write(JSON.stringify({
  batch: id,
  file: `results/batches/batch-${id}.json`,
  masters: batch.masterCount,
  zeroCostMasters: batch.zeroCostMasters,
  sentencesToTranslate: batch.sentenceCount,
  koChars: batch.koChars,
  progress: { totalMasters: total, produced: done.size, blocked: blocked.size, remaining: cand.length },
  tmSize: tm.size,
  dbWrites: 0,
}, null, 2) + '\n');
