/**
 * WO-O4O-EASY-DRUG-KO-FULL-REBUILD-LIVE-PRODUCTION-V1 — 단계 10 파생 EN·ZH·JA 현황
 *
 * **본문은 절대 건드리지 않는다.** 이 단계의 write 는 `status` 한 컬럼뿐이며, 그것도 `--live`
 * 를 줬을 때만 한다. 기본은 read-only 원장 산출이다.
 *
 * 분류 (WO §10):
 *   NO_TRANSLATION            해당 master 에 활성 비-ko 본문이 없다
 *   ALREADY_FROM_CURRENT_KO   이번에 만든 KO 를 원본으로 생성된 번역 (이번 run 이후 생성분)
 *   RETRANSLATE_REQUIRED      교체된 옛 KO 에서 파생된 번역 — 비노출 후 재번역 대기
 *   WITHDRAW_TRANSLATION      대응 KO 정상본이 없어(HOLD·검증실패) 재번역 기준 자체가 없는 번역
 *
 * 노출 계약 조사 결과(이 판단의 근거):
 *   공개 경로는 전부 `status='canonical'` 화이트리스트로만 노출한다
 *   (store-public-tablet-content-source.ts / store-public-utils.ts / product-landing.service.ts).
 *   즉 옛 KO 에서 파생된 번역은 **지금도 QR 랜딩의 언어 목록과 본문으로 노출되고 있다**.
 *   `hidden` 은 "관리자 숨김·노출 중단" 상태이며 공개 경로가 받지 않는다
 *   (SharedProductDescription.entity.ts). 따라서 WO §10 의 "비노출·재번역 대기 전환" 은
 *   `status='canonical' → 'hidden'` 이다. 본문·source_ref 는 그대로 둔다.
 *
 *   한계(보고 대상): `kpa_store_contents` 로 이미 **복사된 사본**은 원본 status 를 다시 보지
 *   않는다(store-content.controller.ts). 사본 회수는 이 WO 범위 밖이며 잔여로 기록한다.
 *
 * 산출 (results/):
 *   translation-status-ledger.jsonl  master×언어 원장 (미추적)
 *   translation-status-summary.json  집계 (추적)
 *
 * 사용: PGPASSWORD=... node translations-status.mjs [--live]
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const PORT = parseInt(arg('--port', process.env.PROXY_PORT || '15441'), 10);
const LIVE = process.argv.includes('--live');

const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
const bump = (o, k) => { o[k] = (o[k] ?? 0) + 1; };

async function main() {
  const pop = new Map(readJsonl(path.join(RESULTS, 'population.jsonl')).map((p) => [p.masterId, p]));
  const planRows = readJsonl(path.join(RESULTS, 'plan-run2.jsonl'));
  const applied = new Map(readJsonl(path.join(RESULTS, 'apply-result-live.jsonl'))
    .filter((r) => r.status === 'APPLIED').map((r) => [r.masterId, r]));
  const beforeMd5 = new Map(planRows.filter((r) => r.beforeMd5).map((r) => [r.masterId, r.beforeMd5]));
  const newMd5 = new Map(planRows.filter((r) => r.generatedMd5).map((r) => [r.masterId, r.generatedMd5]));
  const runStart = new Date(JSON.parse(fs.readFileSync(path.join(RESULTS, 'apply-summary-live.json'), 'utf8')).startedAt);

  const pool = new pg.Pool({
    host: '127.0.0.1', port: PORT,
    user: process.env.PGUSER || 'o4o_api',
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || 'o4o_platform',
    statement_timeout: 900000, max: 2,
  });
  const q = async (t, p, ro = true) => {
    const c = await pool.connect();
    try { if (ro) await c.query('SET default_transaction_read_only = on'); return (await c.query(t, p)).rows; }
    finally { c.release(); }
  };

  const ids = [...pop.keys()].sort();
  const rows = [];
  for (let i = 0; i < ids.length; i += 500) {
    rows.push(...await q(`
      SELECT master_id::text "masterId", id::text "descId", COALESCE(language,'ko') lang,
             source_type "sourceType", status, created_at "createdAt", updated_at "updatedAt",
             md5(content) "md5", length(content) len
      FROM shared_product_descriptions
      WHERE deleted_at IS NULL AND description_type='STORE'
        AND COALESCE(language,'ko') <> 'ko' AND status='canonical'
        AND master_id = ANY($1::uuid[])`, [ids.slice(i, i + 500)]));
  }

  const ledger = []; const classes = {}; const byLang = {};
  const toHide = [];
  for (const r of rows) {
    const p = pop.get(r.masterId);
    const replaced = applied.has(r.masterId);
    let cls;
    if (!replaced) cls = 'WITHDRAW_TRANSLATION';           // 정상 KO 가 없다(HOLD·검증실패)
    else if (new Date(r.createdAt) >= runStart) cls = 'ALREADY_FROM_CURRENT_KO';
    else cls = 'RETRANSLATE_REQUIRED';                      // 교체된 옛 KO 파생
    bump(classes, cls);
    bump(byLang, `${r.lang}:${cls}`);
    ledger.push({
      masterId: r.masterId, itemSeq: p.itemSeq, state: p.state, lang: r.lang,
      descId: r.descId, sourceType: r.sourceType, translationMd5: r.md5,
      previousKoMd5: beforeMd5.get(r.masterId) ?? null,
      currentKoMd5: newMd5.get(r.masterId) ?? null,
      classification: cls,
    });
    if (cls !== 'ALREADY_FROM_CURRENT_KO') toHide.push(r.descId);
  }
  const withTranslation = new Set(rows.map((r) => r.masterId));
  const noTranslation = ids.filter((id) => !withTranslation.has(id)).length;
  classes.NO_TRANSLATION = noTranslation;

  // ── 비노출 전환 (status 한 컬럼만) ────────────────────────────────────────
  let hidden = 0; let hideErrors = 0;
  if (LIVE) {
    for (let i = 0; i < toHide.length; i += 500) {
      const chunk = toHide.slice(i, i + 500);
      try {
        const r = await q(`
          UPDATE shared_product_descriptions
          SET status='hidden', updated_at=now()
          WHERE id = ANY($1::uuid[]) AND status='canonical' AND deleted_at IS NULL
            AND COALESCE(language,'ko') <> 'ko'
          RETURNING id`, [chunk], false);
        hidden += r.length;
      } catch (e) { hideErrors += 1; process.stderr.write(`${e?.message}\n`); }
    }
  }

  const summary = {
    wo: 'WO-O4O-EASY-DRUG-KO-FULL-REBUILD-LIVE-PRODUCTION-V1',
    step: '10-derived-translation-status',
    mode: LIVE ? 'live' : 'census',
    exposureContract: {
      publicPathsAcceptOnly: 'status=canonical',
      hiddenIsNonExposed: true,
      residualRisk: 'kpa_store_contents 로 이미 복사된 사본은 원본 status 를 재확인하지 않는다',
    },
    scopedMasters: ids.length,
    activeTranslationRows: rows.length,
    classes,
    byLangClass: byLang,
    bodyWrites: 0,
    statusWrites: hidden,
    hideBatchErrors: hideErrors,
    hideTargets: toHide.length,
  };
  fs.writeFileSync(path.join(RESULTS, 'translation-status-ledger.jsonl'), ledger.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  fs.writeFileSync(path.join(RESULTS, `translation-status-summary${LIVE ? '' : '-census'}.json`), JSON.stringify(summary, null, 2) + '\n', 'utf8');
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  await pool.end();
}

main().catch((e) => { process.stderr.write(`${e?.stack || e}\n`); process.exit(1); });
