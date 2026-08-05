/**
 * WO-O4O-EASY-DRUG-KO-FULL-REBUILD-LIVE-PRODUCTION-V1 — 단계 2 생산 직전 공식 원문 동결
 *
 * LIVE 적용 직전에 e약은요 API 를 다시 전량 조회해 **하나의 동결 snapshot** 을 만든다.
 * 이 run 의 모든 후속 단계(생산·검증·dry-run·apply)는 이 파일만 본다 — 중간에 API 가 바뀌어도
 * 생산물이 흔들리지 않는다.
 *
 * 부분 실패 계약: 페이지가 재시도 후에도 실패하면 **이전 snapshot 으로 자동 대체하지 않는다.**
 * 그 결과 이번 조회에서 사라진 itemSeq 는 HOLD_NO_API_SOURCE 로 남고 원장에 기록된다.
 *
 * 산출 (results/):
 *   frozen-source.jsonl        원문 원형 + fetchedAt + sourceHash   (미추적 — 대용량)
 *   frozen-source-ledger.jsonl itemSeq · 섹션 hash · 길이           (추적)
 *   source-drift.json          파일럿 snapshot 대비 drift + 수집 집계 (추적)
 *
 * 사용: node freeze-source.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const PILOT_SNAPSHOT = path.resolve(HERE, '../easy-drug-ko-full-rebuild-pilot/results/source-snapshot.jsonl');
const ENV_FILE = path.resolve(HERE, '../../../.env');

const ENDPOINT = 'https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList';
const PAGE_SIZE = 500;          // API 강제 상한 (초과 시 resultCode 11)
const PAGE_RETRY = 3;

export const SOURCE_FIELDS = {
  efcyQesitm: '효능·효과',
  useMethodQesitm: '용법·용량',
  atpnWarnQesitm: '사용 전 경고',
  atpnQesitm: '사용상 주의사항',
  intrcQesitm: '상호작용',
  seQesitm: '이상반응',
  depositMethodQesitm: '보관 방법',
};
export const REQUIRED_FIELDS = ['efcyQesitm', 'useMethodQesitm'];
export const sha256 = (s) => crypto.createHash('sha256').update(s ?? '', 'utf8').digest('hex');

function readKey() {
  const m = fs.readFileSync(ENV_FILE, 'utf8').match(/^MFDS_API_KEY=(.*)$/m);
  if (!m) throw new Error('STOP: MFDS_API_KEY 미설정');
  return m[1].trim().replace(/^["']|["']$/g, '');
}

/** 요청 URL 은 절대 출력하지 않는다 — 인증키가 쿼리에 들어 있다. */
async function fetchPage(key, pageNo) {
  const u = new URL(ENDPOINT);
  u.searchParams.set('serviceKey', key);
  u.searchParams.set('type', 'json');
  u.searchParams.set('numOfRows', String(PAGE_SIZE));
  u.searchParams.set('pageNo', String(pageNo));
  const res = await fetch(u);
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  let json;
  try { json = JSON.parse(text); } catch { throw new Error('JSON 파싱 실패'); }
  const code = json?.header?.resultCode;
  if (code && code !== '00') throw new Error(`resultCode=${code}`);
  return json.body;
}

async function fetchPageWithRetry(key, pageNo) {
  let last;
  for (let i = 1; i <= PAGE_RETRY; i += 1) {
    try { return await fetchPage(key, pageNo); }
    catch (e) { last = e; await new Promise((r) => setTimeout(r, 1500 * i)); }
  }
  return { __failed: true, reason: String(last?.message ?? last) };
}

async function main() {
  const key = readKey();
  fs.mkdirSync(RESULTS, { recursive: true });
  const runStartedAt = new Date().toISOString();

  const first = await fetchPageWithRetry(key, 1);
  if (first.__failed) throw new Error(`STOP: 1페이지 조회 실패 — ${first.reason}`);
  const totalCount = first.totalCount;
  const pages = Math.ceil(totalCount / PAGE_SIZE);
  process.stderr.write(`totalCount=${totalCount} pages=${pages}\n`);

  const snapshot = [];
  const seen = new Set();
  const failedPages = [];
  let duplicateItemSeq = 0;

  const absorb = (items, pageNo) => {
    for (const it of items ?? []) {
      const rec = { itemSeq: String(it.itemSeq ?? ''), pageNo, fetchedAt: new Date().toISOString() };
      for (const k of ['entpName', 'itemName', 'openDe', 'updateDe', 'bizrno', 'itemImage']) rec[k] = it[k] ?? null;
      for (const k of Object.keys(SOURCE_FIELDS)) rec[k] = it[k] ?? null;
      rec.sourceHash = sha256(Object.keys(SOURCE_FIELDS).map((k) => `${k} ${rec[k] ?? ''}`).join(''));
      if (seen.has(rec.itemSeq)) { duplicateItemSeq += 1; continue; }
      seen.add(rec.itemSeq);
      snapshot.push(rec);
    }
  };

  absorb(first.items, 1);
  for (let p = 2; p <= pages; p += 1) {
    const body = await fetchPageWithRetry(key, p);
    if (body.__failed) { failedPages.push({ pageNo: p, reason: body.reason }); continue; }
    absorb(body.items, p);
  }

  snapshot.sort((a, b) => (a.itemSeq < b.itemSeq ? -1 : a.itemSeq > b.itemSeq ? 1 : 0));

  const ledger = snapshot.map((r) => {
    const sectionHash = {}; const sectionLen = {};
    for (const k of Object.keys(SOURCE_FIELDS)) {
      const v = r[k] ?? '';
      sectionHash[k] = v ? sha256(v) : null;
      sectionLen[k] = v.length;
    }
    return {
      itemSeq: r.itemSeq, itemName: r.itemName, entpName: r.entpName,
      updateDe: r.updateDe, openDe: r.openDe,
      sourceHash: r.sourceHash, sectionHash, sectionLen,
      missingRequired: REQUIRED_FIELDS.filter((k) => !(r[k] ?? '').trim()),
      fetchedAt: r.fetchedAt,
    };
  });

  // ── 파일럿 snapshot 대비 drift ───────────────────────────────────────────────
  // 이전 snapshot 의 **저장된 hash 를 믿지 않는다**. 산식이 버전 간에 달라졌으면
  // 내용이 같아도 전건 불일치로 보인다(실제로 파일럿 ledger 에서 그렇게 나왔다).
  // 이전 레코드의 원문 필드를 지금 산식으로 다시 hash 해서 비교한다.
  const rehash = (r) => sha256(Object.keys(SOURCE_FIELDS).map((k) => `${k} ${r[k] ?? ''}`).join(''));
  let drift = { comparable: false };
  if (fs.existsSync(PILOT_SNAPSHOT)) {
    const prev = new Map();
    for (const line of fs.readFileSync(PILOT_SNAPSHOT, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      const r = JSON.parse(line);
      prev.set(r.itemSeq, rehash(r));
    }
    const now = new Map(snapshot.map((r) => [r.itemSeq, r.sourceHash]));
    const changed = []; const added = []; const removed = [];
    for (const [k, v] of now) {
      if (!prev.has(k)) added.push(k);
      else if (prev.get(k) !== v) changed.push(k);
    }
    for (const k of prev.keys()) if (!now.has(k)) removed.push(k);
    drift = {
      comparable: true, previousItemSeq: prev.size, currentItemSeq: now.size,
      changedSourceHash: changed.length, addedItemSeq: added.length, removedItemSeq: removed.length,
      changedSample: changed.slice(0, 10), addedSample: added.slice(0, 10), removedSample: removed.slice(0, 10),
    };
  }

  const report = {
    wo: 'WO-O4O-EASY-DRUG-KO-FULL-REBUILD-LIVE-PRODUCTION-V1',
    step: '2-freeze-source',
    endpoint: ENDPOINT, pageSize: PAGE_SIZE, pages,
    runStartedAt, runFinishedAt: new Date().toISOString(),
    apiTotalCount: totalCount,
    fetchedItems: snapshot.length,
    duplicateItemSeqDropped: duplicateItemSeq,
    failedPages,
    partialFailure: failedPages.length > 0,
    fallbackToPreviousSnapshot: false,
    withAllRequired: ledger.filter((l) => !l.missingRequired.length).length,
    missingEfficacy: ledger.filter((l) => l.missingRequired.includes('efcyQesitm')).length,
    missingUsage: ledger.filter((l) => l.missingRequired.includes('useMethodQesitm')).length,
    sectionPresence: Object.fromEntries(Object.keys(SOURCE_FIELDS).map((k) =>
      [k, ledger.filter((l) => l.sectionLen[k] > 0).length])),
    distinctSourceHash: new Set(snapshot.map((r) => r.sourceHash)).size,
    // 이 run 전체를 식별하는 hash. 이후 단계는 이 값을 계약으로 들고 다닌다.
    frozenSnapshotDigest: sha256(snapshot.map((r) => `${r.itemSeq}:${r.sourceHash}`).join('\n')),
    driftVsPilotSnapshot: drift,
  };

  fs.writeFileSync(path.join(RESULTS, 'frozen-source.jsonl'), snapshot.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  fs.writeFileSync(path.join(RESULTS, 'frozen-source-ledger.jsonl'), ledger.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  fs.writeFileSync(path.join(RESULTS, 'source-drift.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  process.stdout.write(JSON.stringify({ ...report, driftVsPilotSnapshot: { ...drift, changedSample: undefined, addedSample: undefined, removedSample: undefined } }, null, 2) + '\n');
}

// 직접 실행할 때만 수집한다. 후속 스크립트가 SOURCE_FIELDS·산식을 import 해도 API 를 다시 때리지 않는다.
const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (invokedDirectly) main().catch((e) => { process.stderr.write(`${e?.stack || e}\n`); process.exit(1); });
