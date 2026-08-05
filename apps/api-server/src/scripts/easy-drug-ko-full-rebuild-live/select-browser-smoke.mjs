/**
 * WO-O4O-EASY-DRUG-KO-FULL-REBUILD-BROWSER-SMOKE-V1 — 표본 60건 선정 (read-only, DB write 0)
 *
 * 무작위 추출이 아니라 **대표성 + 극단값**으로 뽑는다. 렌더링 결함은 평균값이 아니라
 * 가장 긴 본문·빈 섹션·특수문자·다중 포장에서 터진다.
 *
 * 계층 (WO 지정):
 *   경구 10 · 외용 8 · 점안 6 · 구강점막 6 · 비강 5 · 질 5 · 직장 5
 *   본문 최장 5 · 짧거나 빈 섹션 3 · 특수문자/다중 SKU 4   = 57
 *   + 커버리지 보강 3 (CREATE 신규 / 동일 itemSeq 다중 master / 과거 복구 이력)
 *
 * 경로(route) 판정은 **표본 선정 전용**이다. 설명서 판정 기준이 아니다 —
 * 제품명·용법 문장의 제형 키워드로 계층을 나누기 위한 도구일 뿐이다.
 *
 * 선정은 결정적이다: 같은 산출물이면 같은 60건이 나온다(정렬 키 = masterId hash).
 *
 * 산출: results/browser-smoke-sample.json (추적)
 * 사용: PGPASSWORD=... node select-browser-smoke.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const PORT = parseInt(arg('--port', process.env.PROXY_PORT || '15441'), 10);
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
const h = (s) => parseInt(crypto.createHash('sha256').update(s).digest('hex').slice(0, 8), 16);

/** 표본 계층용 경로 추정. 좁은 경로부터 본다 — 「구강붕해정」처럼 경구인데 키워드가 겹치는 것을 피한다. */
function guessRoute(name, useMethod) {
  const t = `${name} ${useMethod || ''}`;
  if (/점안|안연고|눈에\s*(넣|점)|결막/.test(t)) return 'ophthalmic';
  if (/질정|질좌제|질\s*내|질에\s*(넣|삽입)/.test(t)) return 'vaginal';
  if (/좌제|좌약|직장\s*내|항문에\s*(넣|삽입)/.test(t)) return 'rectal';
  if (/점비|비강|코\s*(안|속)에|콧속/.test(t)) return 'nasal';
  if (/가글|구내|구강용액|구강붕해(?!정)|잇몸|치은|트로키|설하|입안에\s*(머금|물)/.test(t)) return 'oromucosal';
  if (/연고|크림|로션|겔제|카타플라스마|플라스타|패취|파스|외용|바르|도포|붙인/.test(t)) return 'topical';
  if (/복용|먹|경구|삼키|정$|캡슐|시럽|산제|과립|현탁액/.test(t)) return 'oral';
  return 'other';
}

/** 렌더링에서 잘 깨지는 문자: 단위 조판문자·전각·HTML 엔티티·괄호 중첩 */
function specialCharProfile(rec) {
  const t = Object.values(rec).filter((v) => typeof v === 'string').join('\n');
  return {
    unitGlyph: /[㎎㎖㎍㎏㎝℃㎕]/.test(t),
    fullWidth: /[０-９Ａ-Ｚａ-ｚ％（）]/.test(t),
    entity: /&[a-z]{2,6};|&#\d+;/i.test(t),
    nestedParen: /\([^()]*\([^()]*\)/.test(t),
    longToken: /\S{40,}/.test(t),
  };
}

async function main() {
  const pop = readJsonl(path.join(RESULTS, 'population.jsonl'));
  const led = new Map(readJsonl(path.join(RESULTS, 'production-ledger.jsonl')).map((r) => [r.masterId, r]));
  const plan = new Map(readJsonl(path.join(RESULTS, 'plan-run2.jsonl')).map((r) => [r.masterId, r]));
  const src = new Map(readJsonl(path.join(RESULTS, 'frozen-source.jsonl')).map((r) => [r.itemSeq, r]));

  // 동일 itemSeq 를 공유하는 ProductMaster (다중 포장 SKU)
  const byItemSeq = new Map();
  for (const p of pop) byItemSeq.set(p.itemSeq, (byItemSeq.get(p.itemSeq) ?? 0) + 1);

  const cand = pop.filter((p) => plan.has(p.masterId) && led.has(p.masterId)).map((p) => {
    const l = led.get(p.masterId); const pl = plan.get(p.masterId); const s = src.get(p.itemSeq) ?? {};
    const emptyAreas = Object.entries(l.areaCounts).filter(([, n]) => n === 0).map(([k]) => k);
    return {
      masterId: p.masterId, itemSeq: p.itemSeq, productName: p.productName,
      route: guessRoute(p.productName, s.useMethodQesitm),
      action: pl.action,
      generatedLength: l.generatedLength, summaryLength: l.summaryLength,
      areaCounts: l.areaCounts, emptyAreas, emptyAreaCount: emptyAreas.length,
      mastersSharingItemSeq: byItemSeq.get(p.itemSeq),
      priorKoSourceType: p.koSourceType,
      special: specialCharProfile(s),
      order: h(p.masterId),
    };
  });
  const specialScore = (c) => Object.values(c.special).filter(Boolean).length;

  const picked = new Map();
  const usedItemSeq = new Set();
  /**
   * 기본은 **itemSeq 당 1건**이다. 이 모집단은 itemSeq 하나에 ProductMaster 가 여러 개 붙어 있어
   * (포장 SKU 분리) 그냥 길이순으로 뽑으면 같은 제품이 슬롯을 다 먹는다 — 실제로 `longest` 가
   * 동일 제품 5건을 물었다. 다중 master 축은 아래 전용 계층에서 의도적으로 1건만 추가한다.
   */
  const take = (stratum, list, n, { allowDupItemSeq = false } = {}) => {
    let taken = 0;
    for (const c of list) {
      if (taken >= n) break;
      if (picked.has(c.masterId)) continue;
      if (!allowDupItemSeq && usedItemSeq.has(c.itemSeq)) continue;
      picked.set(c.masterId, { ...c, stratum });
      usedItemSeq.add(c.itemSeq);
      taken += 1;
    }
    return taken;
  };

  // ── 경로별 대표: 극단값이 아니라 "보통 제품"을 본다 — 중앙 길이 근처에서 결정적으로 뽑는다 ──
  const routePlan = [['oral', 10], ['topical', 8], ['ophthalmic', 6], ['oromucosal', 6], ['nasal', 5], ['vaginal', 5], ['rectal', 5]];
  const routeAvail = {};
  for (const [route, n] of routePlan) {
    const list = cand.filter((c) => c.route === route).sort((a, b) => a.order - b.order);
    routeAvail[route] = list.length;
    take(`route:${route}`, list, n);
  }

  // ── 극단값 ─────────────────────────────────────────────────────────────────
  take('longest', [...cand].sort((a, b) => b.generatedLength - a.generatedLength), 5);
  take('short-or-empty-section', [...cand]
    .filter((c) => c.emptyAreaCount > 0)
    .sort((a, b) => (b.emptyAreaCount - a.emptyAreaCount) || (a.generatedLength - b.generatedLength)), 3);
  take('special-char-or-multi-sku', [...cand]
    .sort((a, b) => (specialScore(b) - specialScore(a)) || (a.order - b.order)), 4);

  // 과거 오귀속·모순 재조립으로 이미 한 번 고쳐진 제품(기존 KO 가 mfds_easy_drug 였던 것).
  take('recovery-history', cand.filter((c) => c.priorKoSourceType === 'mfds_easy_drug').sort((a, b) => a.order - b.order), 2);

  // ── 커버리지 보강 ──────────────────────────────────────────────────────────
  const have = (f) => [...picked.values()].some(f);
  if (!have((c) => c.action === 'CREATE_NEW_KO')) take('create-new', cand.filter((c) => c.action === 'CREATE_NEW_KO').sort((a, b) => a.order - b.order), 1);
  if (!have((c) => c.action === 'REPLACE_EXISTING_KO')) take('replace-existing', cand.filter((c) => c.action === 'REPLACE_EXISTING_KO').sort((a, b) => a.order - b.order), 1);
  // 60 을 못 채우면 경로 분포를 유지한 채 보충한다.
  for (const [route] of routePlan) { if (picked.size >= 59) break; take(`route-topup:${route}`, cand.filter((c) => c.route === route).sort((a, b) => a.order - b.order), 59 - picked.size); }
  take('topup', [...cand].sort((a, b) => a.order - b.order), Math.max(0, 59 - picked.size));

  // 마지막 1건은 **의도적으로** 이미 뽑은 itemSeq 의 다른 master 를 넣는다.
  // 같은 원문이 서로 다른 공개 URL 에서 동일하게 렌더되는지(포장 SKU 분리) 보기 위한 축이다.
  const pairFor = [...picked.values()].find((p) => cand.some((c) => c.itemSeq === p.itemSeq && c.masterId !== p.masterId));
  if (pairFor) take('multi-master-itemseq', cand.filter((c) => c.itemSeq === pairFor.itemSeq && !picked.has(c.masterId)), 1, { allowDupItemSeq: true });

  // ── 공개 URL 해석 (product_landings.public_key) ────────────────────────────
  const pool = new pg.Pool({
    host: '127.0.0.1', port: PORT, user: process.env.PGUSER || 'o4o_api',
    password: process.env.PGPASSWORD, database: process.env.PGDATABASE || 'o4o_platform', max: 2,
  });
  const c = await pool.connect();
  await c.query('SET default_transaction_read_only = on');
  const ids = [...picked.keys()];
  const landings = new Map((await c.query(`
    SELECT product_master_id::text m, public_key "publicKey", status, exposure_state "exposureState"
    FROM product_landings WHERE product_master_id = ANY($1::uuid[]) AND deleted_at IS NULL`, [ids]))
    .rows.map((r) => [r.m, r]));
  const langs = new Map((await c.query(`
    SELECT master_id::text m, string_agg(DISTINCT COALESCE(language,'ko'), ',' ORDER BY COALESCE(language,'ko')) langs
    FROM shared_product_descriptions
    WHERE master_id = ANY($1::uuid[]) AND deleted_at IS NULL AND status='canonical' AND description_type='STORE'
    GROUP BY 1`, [ids])).rows.map((r) => [r.m, r.langs]));
  c.release();

  const origin = process.env.NETURE_PUBLIC_ORIGIN || 'https://neture.co.kr';
  const sample = [...picked.values()].sort((a, b) => a.stratum.localeCompare(b.stratum) || a.order - b.order)
    .map((s, i) => ({
      no: i + 1, ...s,
      publicKey: landings.get(s.masterId)?.publicKey ?? null,
      landingStatus: landings.get(s.masterId)?.status ?? null,
      landingExposure: landings.get(s.masterId)?.exposureState ?? null,
      expectedLanguages: langs.get(s.masterId) ?? '',
      url: landings.get(s.masterId) ? `${origin}/p/${landings.get(s.masterId).publicKey}` : null,
    }));

  const out = {
    wo: 'WO-O4O-EASY-DRUG-KO-FULL-REBUILD-BROWSER-SMOKE-V1',
    step: 'select-sample',
    candidatePool: cand.length,
    sampleSize: sample.length,
    routeAvailability: routeAvail,
    byStratum: sample.reduce((a, s) => ({ ...a, [s.stratum]: (a[s.stratum] ?? 0) + 1 }), {}),
    byRoute: sample.reduce((a, s) => ({ ...a, [s.route]: (a[s.route] ?? 0) + 1 }), {}),
    byAction: sample.reduce((a, s) => ({ ...a, [s.action]: (a[s.action] ?? 0) + 1 }), {}),
    expectedLanguagesDistinct: [...new Set(sample.map((s) => s.expectedLanguages))],
    landingNotActive: sample.filter((s) => s.landingStatus !== 'active' || s.landingExposure !== 'ok').map((s) => s.masterId),
    missingPublicKey: sample.filter((s) => !s.publicKey).length,
    dbWrites: 0,
    sample,
  };
  fs.writeFileSync(path.join(RESULTS, 'browser-smoke-sample.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
  const { sample: _omit, ...head } = out;
  process.stdout.write(JSON.stringify(head, null, 2) + '\n');
  await pool.end();
}

main().catch((e) => { process.stderr.write(`${e?.stack || e}\n`); process.exit(1); });
