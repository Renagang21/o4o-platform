/**
 * WO §3 — 확보된 유일한 외부 원천(식약처 기능성화장품 보고 **상세**) 수집.
 *
 * 상업 소매 상세는 전부 차단·부재로 확인됐다(`source-availability.json`).
 * 여기서는 MATCH 된 보고번호의 상세만 연다. 목록 18만건 전량 순회는 하지 않는다.
 *
 * 산출: mfds-detail.json
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { MFDS_DETAIL_URL, parseMfdsDetail } from './mfds-detail-core.mjs';
import { OUT_DIR, fetchText, mapPool, rateStats, readOut, writeOut } from './lib.mjs';

const match = readOut('mfds-match.json');
const seqs = [
  ...new Set(
    match.results
      .filter((r) => r.decision === 'MATCH')
      .flatMap((r) => r.reports.map((x) => x.reportSeq)),
  ),
];
process.stderr.write(`보고 상세 대상 ${seqs.length}건\n`);

const prev = existsSync(join(OUT_DIR, 'mfds-detail.json')) ? readOut('mfds-detail.json').details : {};
const details = { ...prev };
const todo = seqs.filter((s) => !details[s]);
process.stderr.write(`이미 확보 ${seqs.length - todo.length} · 이번 수집 ${todo.length}\n`);

const t0 = Date.now();
let done = 0;
let failed = 0;
await mapPool(
  todo,
  3,
  async (seq) => {
    try {
      const html = await fetchText(MFDS_DETAIL_URL(seq), {});
      const d = html == null ? null : parseMfdsDetail(html);
      details[seq] = d ?? { _missing: true };
    } catch {
      failed += 1;
      details[seq] = { _failed: true };
    }
    done += 1;
    if (done % 200 === 0) {
      process.stderr.write(`  ${done}/${todo.length} (${((Date.now() - t0) / 1000).toFixed(0)}s, throttled=${rateStats.throttled})\n`);
    }
  },
  250,
);

const stat = { target: seqs.length, fetched: todo.length, failed, requests: rateStats.requests, throttled: rateStats.throttled, elapsedSec: Math.round((Date.now() - t0) / 1000) };
const withEfficacy = Object.values(details).filter((d) => d?.efficacy).length;
const withUsage = Object.values(details).filter((d) => d?.usage).length;
writeOut('mfds-detail.json', { meta: { ...stat, withEfficacy, withUsage }, details });
process.stderr.write(`${JSON.stringify({ ...stat, withEfficacy, withUsage })}\n`);
