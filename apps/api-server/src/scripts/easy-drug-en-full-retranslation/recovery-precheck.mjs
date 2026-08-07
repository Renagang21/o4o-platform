/**
 * 수납 전 문장 게이트 예행 (write 0) — 오염된 문장이 TM 에 들어가기 전에 잡는다.
 * produce-ingest 의 1단계(checkSentence)와 동일 계약이며 아무것도 쓰지 않는다.
 * 사용: node recovery-precheck.mjs --batch 0039
 */
import fs from 'node:fs';
import path from 'node:path';
import { BATCHES, checkSentence } from './tm-lib.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const BATCH = arg('--batch', null);
if (!BATCH) { process.stderr.write('--batch NNNN 필요\n'); process.exit(2); }

const batch = JSON.parse(fs.readFileSync(path.join(BATCHES, `batch-${BATCH}.json`), 'utf8'));
const enFile = path.join(BATCHES, `batch-${BATCH}.en.json`);
const draft = fs.existsSync(enFile) ? JSON.parse(fs.readFileSync(enFile, 'utf8')) : {};

const fails = [];
let missing = 0, pass = 0;
const codeTally = {};
for (const s of batch.sentences) {
  const en = draft[s.hash];
  if (en === undefined) { missing++; fails.push({ hash: s.hash, code: 'MISSING', ko: s.ko.slice(0, 60) }); continue; }
  const r = checkSentence(s.ko, en);
  if (r.pass) { pass++; continue; }
  for (const c of new Set(r.violations.map((v) => v.code))) codeTally[c] = (codeTally[c] ?? 0) + 1;
  fails.push({ hash: s.hash, codes: r.violations.map((v) => v.code), details: r.violations, ko: s.ko.slice(0, 80), en: String(en).slice(0, 120) });
}

const extraKeys = Object.keys(draft).filter((k) => k !== '_note' && !batch.sentences.some((s) => s.hash === k));
console.log(JSON.stringify({
  batch: BATCH,
  offered: batch.sentences.length,
  translated: Object.keys(draft).filter((k) => k !== '_note').length,
  pass, missing, failed: fails.length - missing,
  codeTally,
  extraUnknownHashes: extraKeys,
  fails: fails.slice(0, 25),
  gate: fails.length === 0 && extraKeys.length === 0 ? 'READY_TO_INGEST' : 'FIX_REQUIRED',
  fileWrites: 0, dbWrites: 0,
}, null, 2));
