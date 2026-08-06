/**
 * WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-FROM-REBUILT-KO-V1 — 실행 계약 read-only 재현 (DB write 0)
 *
 * 번역을 시작하기 전에 **분류 분포를 LIVE 에서 먼저 잠근다.** dry-run 은 이 분포가 확정된 뒤에만 의미가 있다.
 *
 * 확정 대상 (사용자 지정 7분류):
 *   UPDATE_SINGLE_HIDDEN_EN      hidden EN 이 정확히 1행 → 그 행을 교체 후 canonical 승격
 *   CREATE_NEW_EN                EN 행이 하나도 없음 → 신규 INSERT
 *   ALREADY_CURRENT_EN           이미 신규 KO 기준으로 최신인 정상 EN (현재는 정의상 0 이어야 함)
 *   BLOCK_MULTIPLE_HIDDEN_EN     hidden EN 다중 → 자동 선택 금지, master 차단
 *   BLOCK_EXISTING_CANONICAL_EN  활성 canonical EN 잔존 → 차단 (기대 0, LIVE 재확인 대상)
 *   BLOCK_KO_HASH_DRIFT          KO canonical 이 apply 시점 md5 와 다름 → 기준본 흔들림, 차단
 *   BLOCK_TRANSLATION_VALIDATION 번역 독립검증 실패 (생산 단계에서 채워짐 — 여기서는 항상 0)
 *
 * 해시 잠금 주의: `shared_product_descriptions` 에는 generatedContentHash·officialSourceHash **컬럼이 없다.**
 * 그래서 잠금은 원장 기반이다 —
 *   generatedContentHash = apply-result-live.jsonl 의 `newMd5` (= md5(KO content))
 *   officialSourceHash   = frozen-source-ledger.jsonl 의 `sourceHash` (itemSeq 기준)
 *
 * 산출: results/contract-recon-{result.json,ledger.jsonl}
 * 사용: PGPASSWORD=... PGUSER=o4o_api node contract-recon.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const KO_TRACK = path.join(HERE, '..', 'easy-drug-ko-full-rebuild-live', 'results');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const PORT = parseInt(arg('--port', process.env.PROXY_PORT || '15441'), 10);
const CHUNK = parseInt(arg('--chunk', '1000'), 10);
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));

/** 모집단 19,363: HOLD 144 는 이 파일 생성 시점에 이미 빠져 있다. 여기서 다시 빼지 않는다. */
function loadPopulation() {
  const applied = readJsonl(path.join(KO_TRACK, 'apply-result-live.jsonl'));
  const bad = applied.filter((r) => r.status !== 'APPLIED');
  if (bad.length) throw new Error(`STOP: apply-result-live 에 APPLIED 아닌 행 ${bad.length}건`);
  const src = new Map(readJsonl(path.join(KO_TRACK, 'frozen-source-ledger.jsonl')).map((r) => [r.itemSeq, r.sourceHash]));
  return applied.map((r) => ({
    masterId: r.masterId,
    itemSeq: r.itemSeq,
    koDescId: r.newDescId,
    generatedContentHash: r.newMd5,
    officialSourceHash: src.get(r.itemSeq) ?? null,
  }));
}

/** KO 기준본이 지금도 그대로인지 + EN 행이 어떤 상태로 남아 있는지를 master 단위로 가져온다. */
const SQL = `
  SELECT master_id::text "masterId",
         id::text "descId",
         COALESCE(language,'ko') lang,
         status,
         md5(content) "md5",
         length(content) "len",
         updated_at "updatedAt"
  FROM shared_product_descriptions
  WHERE master_id = ANY($1::uuid[])
    AND description_type = 'STORE'
    AND deleted_at IS NULL
    AND COALESCE(language,'ko') IN ('ko','en')
  ORDER BY master_id, lang, updated_at`;

async function main() {
  const pop = loadPopulation();
  fs.mkdirSync(RESULTS, { recursive: true });

  const client = new pg.Client({
    host: '127.0.0.1', port: PORT, user: process.env.PGUSER, password: process.env.PGPASSWORD, database: 'o4o_platform',
  });
  await client.connect();
  await client.query('SET default_transaction_read_only = on');

  const rowsByMaster = new Map();
  for (let i = 0; i < pop.length; i += CHUNK) {
    const ids = pop.slice(i, i + CHUNK).map((p) => p.masterId);
    const r = await client.query(SQL, [ids]);
    for (const row of r.rows) {
      if (!rowsByMaster.has(row.masterId)) rowsByMaster.set(row.masterId, []);
      rowsByMaster.get(row.masterId).push(row);
    }
    process.stderr.write(`fetch ${Math.min(i + CHUNK, pop.length)}/${pop.length}\n`);
  }
  await client.end();

  const ledger = [];
  for (const p of pop) {
    const rows = rowsByMaster.get(p.masterId) ?? [];
    const ko = rows.filter((r) => r.lang === 'ko');
    const koCanonical = ko.filter((r) => r.status === 'canonical');
    const en = rows.filter((r) => r.lang === 'en');
    const enCanonical = en.filter((r) => r.status === 'canonical');
    const enHidden = en.filter((r) => r.status === 'hidden');
    const enOther = en.filter((r) => r.status !== 'canonical' && r.status !== 'hidden');

    // 분류는 **차단 우선**이다. 기준본이 흔들린 master 는 번역 자체를 시작하지 않는다.
    let cls;
    if (koCanonical.length !== 1 || koCanonical[0].md5 !== p.generatedContentHash) cls = 'BLOCK_KO_HASH_DRIFT';
    else if (enCanonical.length) cls = 'BLOCK_EXISTING_CANONICAL_EN';
    else if (enHidden.length > 1) cls = 'BLOCK_MULTIPLE_HIDDEN_EN';
    else if (enHidden.length === 1) cls = 'UPDATE_SINGLE_HIDDEN_EN';
    else if (en.length === 0) cls = 'CREATE_NEW_EN';
    // hidden 도 canonical 도 아닌 EN(예: deprecated) 만 남은 경우.
    // 이것을 MULTIPLE_HIDDEN 으로 묶으면 사실과 다르다 — 별도 차단 분류로 뺀다.
    else cls = 'BLOCK_UNEXPECTED_EN_STATUS';

    ledger.push({
      masterId: p.masterId, itemSeq: p.itemSeq, classification: cls,
      koCanonicalCount: koCanonical.length,
      koHashMatch: koCanonical.length === 1 && koCanonical[0].md5 === p.generatedContentHash,
      koDescIdMatch: koCanonical.length === 1 && koCanonical[0].descId === p.koDescId,
      officialSourceHash: p.officialSourceHash,
      generatedContentHash: p.generatedContentHash,
      enTotal: en.length, enCanonical: enCanonical.length, enHidden: enHidden.length,
      enOtherStatus: [...new Set(enOther.map((r) => r.status))],
      enHiddenDescIds: enHidden.map((r) => r.descId),
      enHiddenMd5: enHidden.map((r) => r.md5),
      koLen: koCanonical[0]?.len ?? null,
    });
  }

  const byClass = ledger.reduce((a, l) => ({ ...a, [l.classification]: (a[l.classification] ?? 0) + 1 }), {});
  const out = {
    wo: 'WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-FROM-REBUILT-KO-V1',
    step: 'contract-recon',
    population: pop.length,
    populationNote: 'HOLD 144 는 apply-result-live.jsonl 생성 시점에 이미 제외됨 — 재차감 금지',
    missingOfficialSourceHash: ledger.filter((l) => !l.officialSourceHash).length,
    koHashDrift: ledger.filter((l) => !l.koHashMatch).length,
    koDescIdMismatch: ledger.filter((l) => !l.koDescIdMatch).length,
    byClassification: {
      UPDATE_SINGLE_HIDDEN_EN: byClass.UPDATE_SINGLE_HIDDEN_EN ?? 0,
      CREATE_NEW_EN: byClass.CREATE_NEW_EN ?? 0,
      ALREADY_CURRENT_EN: 0,
      BLOCK_MULTIPLE_HIDDEN_EN: byClass.BLOCK_MULTIPLE_HIDDEN_EN ?? 0,
      BLOCK_EXISTING_CANONICAL_EN: byClass.BLOCK_EXISTING_CANONICAL_EN ?? 0,
      BLOCK_KO_HASH_DRIFT: byClass.BLOCK_KO_HASH_DRIFT ?? 0,
      BLOCK_UNEXPECTED_EN_STATUS: byClass.BLOCK_UNEXPECTED_EN_STATUS ?? 0,
      BLOCK_TRANSLATION_VALIDATION: 0,
    },
    // 기존 hidden EN 이 제품별로 고유했는지 — 공유돼 있었다면 그 자체가 "성분군 공유 금지" 원칙 위반의 증거다.
    hiddenEnContentSharing: (() => {
      const m = new Map();
      for (const l of ledger) if (l.enHidden === 1) m.set(l.enHiddenMd5[0], (m.get(l.enHiddenMd5[0]) ?? 0) + 1);
      const dup = [...m.values()].filter((c) => c > 1);
      return {
        mastersWithHiddenEn: [...m.values()].reduce((a, c) => a + c, 0),
        distinctContents: m.size,
        sharedGroups: dup.length,
        mastersOnSharedContent: dup.reduce((a, c) => a + c, 0),
        maxMastersPerContent: Math.max(0, ...m.values()),
      };
    })(),
    duplicateItemSeq: (() => {
      const m = new Map();
      for (const l of ledger) m.set(l.itemSeq, (m.get(l.itemSeq) ?? 0) + 1);
      const dup = [...m.entries()].filter(([, c]) => c > 1);
      return { groups: dup.length, masters: dup.reduce((a, [, c]) => a + c, 0) };
    })(),
    enStatusHistogram: ledger.reduce((a, l) => { for (const s of l.enOtherStatus) a[s] = (a[s] ?? 0) + 1; return a; }, {}),
    dbWrites: 0,
  };
  out.actionable = out.byClassification.UPDATE_SINGLE_HIDDEN_EN + out.byClassification.CREATE_NEW_EN;
  out.blocked = pop.length - out.actionable;

  fs.writeFileSync(path.join(RESULTS, 'contract-recon-result.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(RESULTS, 'contract-recon-ledger.jsonl'), ledger.map((l) => JSON.stringify(l)).join('\n') + '\n', 'utf8');
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

main().catch((e) => { process.stderr.write(`${e?.stack || e}\n`); process.exit(1); });
