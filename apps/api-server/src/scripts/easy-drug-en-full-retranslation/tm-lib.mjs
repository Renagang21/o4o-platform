/**
 * WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-FROM-REBUILT-KO-V1 — 문장 TM 공용 라이브러리
 *
 * 확정 기준 (2026-08-06):
 *   외부 번역 API 를 붙이지 않는다. 번역은 **현재 세션/에이전트가 master 별로** 수행하고,
 *   그 결과를 문장 단위로 누적해 재사용한다. TM 은 **비용 절감 수단일 뿐**이며
 *   복합제 설명서를 여러 제품에 공유하는 근거가 아니다(계약 4).
 *
 * TM 키 = `md5(공백 정규화된 KO 문장)` — normalizeKo 주석 참조.
 * 같은 KO 문장은 같은 EN 문장을 받는다. 다만 **적용·검증 단위는 언제나 master** 이며(계약 3·6),
 * TM 에서 조립한 뒤에도 master 별 독립검증을 반드시 통과해야 DB 에 간다(계약 8).
 *
 * 문장 단위 검사는 **문서 단위 검사의 부분집합**이다. 투여 경로(ROUTE_LOST)처럼 섹션 범위가
 * 필요한 검사는 여기서 하지 않고 조립 후 en-validator.mjs 가 판정한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { StringDecoder } from 'node:string_decoder';
import { STRENGTH_RE, STRENGTH_UNIT_CANON, NEGATION_KO, NEGATION_EN, FOOTER } from './en-frame.mjs';

export const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
export const RESULTS = path.join(HERE, 'results');
export const BATCHES = path.join(RESULTS, 'batches');

export const TM_PATH = path.join(RESULTS, 'tm-store.jsonl');
export const EN_UNITS_PATH = path.join(RESULTS, 'en-units.jsonl');
export const QUEUE_PATH = path.join(RESULTS, 'problem-queue.jsonl');
export const KO_UNITS_PATH = path.join(RESULTS, 'ko-units.jsonl');

export const md5 = (s) => crypto.createHash('md5').update(s, 'utf8').digest('hex');

/**
 * TM 조회 키의 정규화 — **공백 표기 차이만** 없앤다.
 *
 * e약은요 원문에는 일반 공백과 NBSP(U+00A0)가 섞여 있어, 눈으로 완전히 같은 문장이
 * 서로 다른 해시로 갈라진다(실측: 4,577 문장이 영향, distinct 17,075 → 16,029).
 * 공백 표기는 의학적 차이가 아니므로 같은 EN 을 준다.
 *
 * KO canonical 자체는 **건드리지 않는다.** 여기서 바꾸는 것은 조회 키뿐이고,
 * 저장·조립·검증은 언제나 KO 원문 그대로를 대상으로 한다.
 * 공백 외의 어떤 문자도 정규화하지 않는다 — 숫자·단위·부호를 건드리는 순간 보존 검증이 무너진다.
 */
export const normalizeKo = (s) => String(s)
  .replace(/[  -   　]/g, ' ')
  .replace(/[​-‍﻿]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

export const tmKey = (s) => md5(normalizeKo(s));

const NUM_RE = /\d+(?:[.,]\d+)?/g;
const HANGUL_RE = /[가-힣]/;
const norm = (n) => n.replace(',', '.').replace(/\.0+$/, '');

export const numbers = (s) => [...String(s).matchAll(NUM_RE)].map((m) => norm(m[0]));
export const strengths = (s) =>
  [...String(s).matchAll(new RegExp(STRENGTH_RE.source, 'g'))]
    .map((m) => `${norm(m[1])}${(STRENGTH_UNIT_CANON[m[2]] ?? m[2]).toLowerCase()}`);

const lower = (s) => String(s).toLowerCase();
const hasAny = (s, list) => list.some((t) => lower(s).includes(lower(t)));

/* ── TM 입출력 ────────────────────────────────────────────────────── */

/** @returns {Map<string,{hash,ko,en,batch,source}>} */
export function loadTM() {
  const tm = new Map();
  if (!fs.existsSync(TM_PATH)) return tm;
  for (const line of fs.readFileSync(TM_PATH, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const e = JSON.parse(line);
    tm.set(e.hash, e); // 같은 해시가 다시 오면 나중 것이 이긴다(정정 반영).
  }
  return tm;
}

/** append-only. 정정도 append 로 남긴다 — 이력이 지워지면 무엇을 왜 고쳤는지 추적이 끊긴다. */
export function appendTM(entries) {
  if (!entries.length) return;
  fs.mkdirSync(RESULTS, { recursive: true });
  fs.appendFileSync(TM_PATH, entries.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf8');
}

export function appendJsonl(file, rows) {
  if (!rows.length) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, rows.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
}

export function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
}

/**
 * ko-units.jsonl 은 100MB 대다. 전량을 메모리에 올리지 않고 한 줄씩 흘려보낸다.
 *
 * **StringDecoder 를 반드시 쓴다.** `buf.toString('utf8')` 을 청크마다 부르면 청크 경계에서
 * 한글 3바이트가 잘려 U+FFFD 로 바뀐다. 실측으로 32건의 가짜 손상 문자를 만들어 냈고,
 * 고정 푸터 문장까지 손상된 것으로 보여 KO canonical 결함으로 오진할 뻔했다.
 */
export function* streamKoUnits() {
  const fd = fs.openSync(KO_UNITS_PATH, 'r');
  const decoder = new StringDecoder('utf8');
  try {
    const buf = Buffer.alloc(1 << 20);
    let tail = '';
    for (;;) {
      const n = fs.readSync(fd, buf, 0, buf.length, null);
      if (n === 0) break;
      const chunk = tail + decoder.write(buf.subarray(0, n));
      const lines = chunk.split('\n');
      tail = lines.pop();
      for (const l of lines) if (l.trim()) yield JSON.parse(l);
    }
    tail += decoder.end();
    if (tail.trim()) yield JSON.parse(tail);
  } finally {
    fs.closeSync(fd);
  }
}

/* ── 문장 단위 검사 ───────────────────────────────────────────────── */

/**
 * TM 등재 전 게이트. 실패하면 TM 에 넣지 않는다 — 오염된 문장 하나가 수백 master 로 번진다.
 * @returns {{pass:boolean, violations:{code:string,detail:string}[]}}
 */
export function checkSentence(ko, en) {
  const v = [];
  const add = (code, detail) => v.push({ code, detail });
  const t = String(en ?? '').trim();

  if (!t) { add('EMPTY', 'EN 문장이 비었다'); return { pass: false, violations: v }; }
  if (HANGUL_RE.test(t)) add('HANGUL_LEFTOVER', `"${t.slice(0, 40)}…"`);
  if (!/[.!?:)\]]$/.test(t)) add('TRUNCATED', `"…${t.slice(-40)}"`);

  const koStr = strengths(ko), enStr = strengths(t);
  if (JSON.stringify(koStr) !== JSON.stringify(enStr)) {
    add('STRENGTH_SEQUENCE', `ko=[${koStr.join(',')}] en=[${enStr.join(',')}]`);
  }
  const koPool = new Set(numbers(ko));
  const added = [...new Set(numbers(t).filter((n) => !koPool.has(n)))];
  if (added.length) add('NUMBER_ADDED', `EN 전용 수치: ${added.slice(0, 8).join(', ')}`);

  if (hasAny(ko, NEGATION_KO) && !hasAny(t, NEGATION_EN)) {
    add('NEGATION_WEAKENED', `KO 부정·금기 문장인데 EN 에 부정 표지 없음: "${ko.slice(0, 40)}…"`);
  }
  return { pass: v.length === 0, violations: v };
}

/* ── master 단위 조립 ─────────────────────────────────────────────── */

/** 그 master 가 번역을 필요로 하는 KO 문장 목록 (고정 프레임·식별값 제외). */
export function bodySentences(ko) {
  return ko.segments.filter((s) => s.kind === 'BODY' && !FOOTER[s.text]);
}

/**
 * 지금 막혀 있는 master 집합.
 *
 * 문제 큐는 append-only 이므로 한 master 에 BLOCKED 행이 여러 번 쌓일 수 있고,
 * 번역을 고쳐 다시 통과시키면 RESOLVED 행이 뒤에 붙는다. **마지막 행만 유효**하다.
 * 첫 BLOCKED 를 영구 낙인으로 쓰면 고친 master 가 영원히 재시도되지 않는다.
 */
export function blockedMasters(rows = readJsonl(QUEUE_PATH)) {
  const last = new Map();
  for (const r of rows) if (r.kind === 'MASTER' && r.masterId) last.set(r.masterId, r.state);
  return new Set([...last].filter(([, s]) => s === 'BLOCKED').map(([m]) => m));
}

/** 아직 TM 에 없는 문장 (키는 공백 정규화 기준). */
export function missingHashes(ko, tm) {
  const out = new Map();
  for (const s of bodySentences(ko)) {
    const h = tmKey(s.text);
    if (!tm.has(h) && !out.has(h)) out.set(h, s);
  }
  return out;
}
