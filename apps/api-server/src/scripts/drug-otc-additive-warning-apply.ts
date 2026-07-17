/**
 * WO-O4O-OTC-ADDITIVE-WARNING-APPLY-234-V2
 *
 * 첨가제 경고(유당·색소·아스파탐)를 공개 OTC ko/en canonical 에 반영.
 * 방식: caution 필드에 경고를 삽입한 복사본으로 buildDrugOtc(En)ConsumerHtml 재생성
 *       (공유 draft 미수정 · master별 canonical 만 갱신 · 완전 reversible).
 *   - ko: caution 단일 문단의 금기 경계("복용하지 않습니다." 등) 뒤에 경고 삽입 → sd-warn li 내 인라인.
 *   - en: en caution 첫 문장(주 금기) 뒤에 경고 삽입 → sd-warn 새 li(문장 분리).
 *
 * dry-run 기본 / apply 는 이중 게이트(`--apply` + DRUG_OTC_ADDITIVE_WARNING_CONFIRM=YES).
 * 화이트리스트: additive-warning-whitelist-v2.json (117 master / 234 canonical).
 *
 * 안전:
 *   - 예상 117 master / 234 row 불일치 ABORT.
 *   - robust dedup 재검사(LIKE): 대상이 이미 첨가제 경고 보유 시 **전체 ABORT**(자동제외 안 함).
 *   - BUILDER_DRIFT 0: build(원 caution) === stored (ko·en 각각). 실패 ABORT.
 *   - 역제거: newCaution 에서 경고 제거 === 원 caution (문자열) → 재생성 시 stored 복원.
 *   - INSERT/DELETE 없음. 대상 외 불변. 단일 TX.
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { buildDrugOtcConsumerHtml } from '../modules/neture/drug-import/drug-otc-description-consumer-html.js';
import { buildDrugOtcEnConsumerHtml, type DrugOtcEnTranslation } from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';

const WL_PATH = path.resolve(process.cwd(), '../../docs/investigations/samples/nb-doc-bulk-v1/additive-warning-whitelist-v2.json');
const EN_PATH = path.resolve(process.cwd(), '../../docs/guides/products/drug/pilot-en-design/translations/otc-en-translations-v1.json');
const EXPECTED_MASTERS = 117;
const EXPECTED_ROWS = 234;
const KO_BOUNDARY = /(복용하지\s*(않습니다|마십시오|마세요)|복용을\s*피하십시오|복용해서는\s*안\s*됩니다)\.?/;
const EN_BOUNDARY = /(?<=\.)\s+(?=[A-Z(])/;

interface WLEntry { master_id: string; groupKey: string; additives: string[]; ko_warning: string; en_warning: string; en_exists: boolean }

/** ko caution 에 경고 삽입 (금기 경계 뒤) */
function insertKo(caution: string, warn: string): string | null {
  const m = caution.match(KO_BOUNDARY);
  if (!m || m.index === undefined) return null;
  const end = m.index + m[0].length;
  return caution.slice(0, end) + ' ' + warn + caution.slice(end);
}
/** en caution 에 경고 삽입 (첫 문장 뒤) */
function insertEn(caution: string, warn: string): string | null {
  const m = caution.match(EN_BOUNDARY);
  if (!m || m.index === undefined) return caution + ' ' + warn; // 문장 1개뿐이면 뒤에
  return caution.slice(0, m.index) + ' ' + warn + caution.slice(m.index);
}

async function main(): Promise<void> {
  const apply = process.argv.slice(2).includes('--apply') && process.env.DRUG_OTC_ADDITIVE_WARNING_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';

  const wl = JSON.parse(fs.readFileSync(WL_PATH, 'utf8')) as { entries: WLEntry[]; koUpdateMasters: number; enUpdateMasters: number };
  if (wl.entries.length !== EXPECTED_MASTERS) throw new Error(`whitelist ${wl.entries.length} !== ${EXPECTED_MASTERS}`);
  const enFile = JSON.parse(fs.readFileSync(EN_PATH, 'utf8')) as { translations: DrugOtcEnTranslation[] };
  const enByGk = new Map(enFile.translations.map((t) => [t.groupKey, t]));
  const bySeq = new Map(wl.entries.map((e) => [e.master_id, e]));
  const ids = wl.entries.map((e) => e.master_id);

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'],
  });
  await ds.initialize();

  const report = { mode, masters: 0, koRows: 0, enRows: 0, staged: 0, dedupConflicts: [] as string[], anomalies: [] as string[], updated: 0, verified: 0 };
  try {
    // robust dedup 재검사
    const dd: Array<{ master_id: string; asp: number; lac: number; dye: number }> = await ds.query(
      `SELECT s.master_id::text,
         (s.content LIKE '%아스파탐%' OR s.content LIKE '%페닐케톤%')::int asp,
         (s.content LIKE '%유당%' OR s.content LIKE '%갈락토%' OR s.content LIKE '%락토오스%')::int lac,
         (s.content LIKE '%황색%' OR s.content LIKE '%타르색소%' OR s.content LIKE '%적색%' OR s.content LIKE '%청색%' OR s.content LIKE '%색소%')::int dye
       FROM shared_product_descriptions s
       WHERE s.source_type='mfds_drug_otc' AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND s.language='ko'
         AND s.master_id=ANY($1::uuid[])`, [ids]);
    const has: Record<string, keyof (typeof dd)[0]> = { 아스파탐: 'asp', 유당: 'lac', 색소: 'dye' };
    for (const row of dd) {
      const e = bySeq.get(row.master_id); if (!e) continue;
      for (const a of e.additives) if (Number(row[has[a]]) === 1) report.dedupConflicts.push(`${row.master_id.slice(0, 8)}:${a}`);
    }
    if (report.dedupConflicts.length > 0) {
      throw new Error(`robust dedup 충돌 ${report.dedupConflicts.length}건 → 전체 ABORT (자동제외 안 함): ${report.dedupConflicts.slice(0, 10).join(', ')}`);
    }

    // ko rows
    const koRows: Array<{ id: string; master_id: string; content: string; title: string; content_json: Record<string, unknown> }> = await ds.query(
      `SELECT s.id::text, s.master_id::text, s.content, d.title, d.content_json
         FROM shared_product_descriptions s JOIN product_candidate_description_drafts d ON d.candidate_id=s.source_ref_id
        WHERE s.source_type='mfds_drug_otc' AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL
          AND s.language='ko' AND s.master_id=ANY($1::uuid[])`, [ids]);
    const enRows: Array<{ id: string; master_id: string; content: string }> = await ds.query(
      `SELECT s.id::text, s.master_id::text, s.content
         FROM shared_product_descriptions s
        WHERE s.source_type='mfds_drug_otc' AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL
          AND s.language='en' AND s.master_id=ANY($1::uuid[])`, [ids]);
    report.koRows = koRows.length; report.enRows = enRows.length;
    report.masters = new Set([...koRows, ...enRows].map((r) => r.master_id)).size;
    const enById = new Map(enRows.map((r) => [r.master_id, r]));

    const staged: Array<{ id: string; content: string }> = [];
    for (const r of koRows) {
      const e = bySeq.get(r.master_id); if (!e) { report.anomalies.push(`${r.master_id.slice(0, 8)}: wl 없음`); continue; }
      // ── ko ──
      const cj = r.content_json; const caution = String(cj.caution || '');
      const drift = buildDrugOtcConsumerHtml({ ...cj } as never, { title: r.title });
      if (drift.html !== r.content) { report.anomalies.push(`${r.master_id.slice(0, 8)} ko: BUILDER_DRIFT≠0`); continue; }
      const newCaution = insertKo(caution, e.ko_warning);
      if (newCaution === null) { report.anomalies.push(`${r.master_id.slice(0, 8)} ko: 금기 경계 없음`); continue; }
      // 역제거 검증
      if (newCaution.replace(' ' + e.ko_warning, '') !== caution) { report.anomalies.push(`${r.master_id.slice(0, 8)} ko: 역제거 불일치`); continue; }
      const koNew = buildDrugOtcConsumerHtml({ ...cj, caution: newCaution } as never, { title: r.title });
      if (!koNew.html || koNew.html === r.content) { report.anomalies.push(`${r.master_id.slice(0, 8)} ko: 재생성 실패/무변화`); continue; }
      if (!koNew.html.includes(e.ko_warning.split('(')[0].slice(0, 12))) { report.anomalies.push(`${r.master_id.slice(0, 8)} ko: 경고 미포함`); continue; }
      // ── en ──
      const enR = enById.get(r.master_id); const tr = enByGk.get(e.groupKey);
      if (!enR || !tr) { report.anomalies.push(`${r.master_id.slice(0, 8)} en: row/translation 없음`); continue; }
      const enDrift = buildDrugOtcEnConsumerHtml(tr);
      if (enDrift.html !== enR.content) { report.anomalies.push(`${r.master_id.slice(0, 8)} en: BUILDER_DRIFT≠0`); continue; }
      const newEnCaution = insertEn(String(tr.caution), e.en_warning);
      if (newEnCaution === null || newEnCaution.replace(' ' + e.en_warning, '') !== String(tr.caution)) { report.anomalies.push(`${r.master_id.slice(0, 8)} en: 역제거 불일치`); continue; }
      const enNew = buildDrugOtcEnConsumerHtml({ ...tr, caution: newEnCaution });
      if (!enNew.html || enNew.html === enR.content) { report.anomalies.push(`${r.master_id.slice(0, 8)} en: 재생성 실패/무변화`); continue; }

      staged.push({ id: r.id, content: koNew.html });
      staged.push({ id: enR.id, content: enNew.html });
    }
    report.staged = staged.length;

    if (report.masters !== EXPECTED_MASTERS || report.koRows + report.enRows !== EXPECTED_ROWS) {
      throw new Error(`예상 불일치 — master ${report.masters}/${EXPECTED_MASTERS}, rows ${report.koRows + report.enRows}/${EXPECTED_ROWS} → ABORT`);
    }
    if (report.anomalies.length > 0) throw new Error(`이상 ${report.anomalies.length}건 → ABORT\n  ${report.anomalies.slice(0, 12).join('\n  ')}`);
    if (staged.length !== EXPECTED_ROWS) throw new Error(`staged ${staged.length} !== ${EXPECTED_ROWS} → ABORT`);

    if (apply) {
      const qr = ds.createQueryRunner();
      await qr.connect(); await qr.startTransaction();
      try {
        for (const s of staged) {
          await qr.query(
            `UPDATE shared_product_descriptions SET content=$2, updated_at=NOW()
              WHERE id=$1 AND source_type='mfds_drug_otc' AND status='canonical' AND deleted_at IS NULL`, [s.id, s.content]);
          report.updated += 1;
        }
        for (const s of staged) {
          const rr: Array<{ content: string }> = await qr.query(`SELECT content FROM shared_product_descriptions WHERE id=$1`, [s.id]);
          if (rr[0]?.content === s.content) report.verified += 1;
        }
        if (report.verified !== staged.length) throw new Error(`사후검증 ${report.verified}/${staged.length} → ROLLBACK`);
        await qr.commitTransaction();
      } catch (err) { await qr.rollbackTransaction(); throw err; } finally { await qr.release(); }
    }
  } finally { await ds.destroy(); }

  console.log(JSON.stringify(report, null, 2));
  console.log(`\n[${mode}] master ${report.masters} · ko ${report.koRows} · en ${report.enRows} · staged ${report.staged} · dedup충돌 ${report.dedupConflicts.length} · 이상 ${report.anomalies.length}`);
  if (apply) console.log(`  UPDATE ${report.updated} · 사후검증 ${report.verified}/${report.staged}`);
  else console.log('  (dry-run — write 없음. apply: --apply + DRUG_OTC_ADDITIVE_WARNING_CONFIRM=YES)');
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
