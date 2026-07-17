/**
 * OTC 공통 누락 보완 배치 13그룹 — 화이트리스트 기반 (ko/en 공개 canonical + draft + EN JSON)
 *
 * WO-O4O-OTC-COMMON-OMISSION-FIX-BATCH-13-V1
 * 근거: CHECK-O4O-OTC-AUTO-CANONICAL-SAFETY-OMISSION-AUDIT-V1 §2-2 + 그룹별 원문 전수 대조(CHECK 본 WO)
 *
 * ⚠️ 공개 중인 canonical 을 UPDATE 한다(11그룹, ko+en).
 *
 * 화이트리스트: docs/guides/products/drug/pilot-en-design/translations/otc-batch13-omission-whitelist.json
 *   각 edit = {field, lang, find(유일), repl}. 근거는 허가 원문 전 변형 공통(why 필드).
 *
 * 변경 증명(2겹):
 *   ① 필드 레벨 — 편집 후 필드에서 각 (repl→find) 역치환 결과가 원본 필드와 정확히 일치
 *      → 화이트리스트 편집 외 변경 0 (빌더 무관하게 소스에서 증명).
 *   ② BUILDER_DRIFT — 현재 draft/translation 로 재생성한 HTML === 저장 canonical (전 행)
 *      → 빌더가 현재 상태를 충실히 재현. 빌더는 순수함수이므로 build(new)=저장본+편집분 렌더.
 *   두 겹이 성립하면 신규 canonical = 저장본에 화이트리스트 편집만 반영된 것.
 *
 * 안전: INSERT·DELETE 없음. 그룹·ko/en 행수 화이트리스트 불일치 시 중단. 단일 트랜잭션.
 *   대상 외 그룹 canonical 지문 불변(사후). 파일 쓰기는 DB 커밋 후. 멱등(이미 반영이면 no-op).
 *
 * DB write 게이트: `--apply` AND `DRUG_OTC_BATCH13_CONFIRM=YES`
 */

import fs from 'node:fs';
import path from 'node:path';
import { buildDrugOtcConsumerHtml } from '../modules/neture/drug-import/drug-otc-description-consumer-html.js';
import {
  buildDrugOtcEnConsumerHtml,
  type DrugOtcEnTranslation,
} from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';
import type { SharedProductDescriptionSourceType } from '../modules/neture/entities/SharedProductDescription.entity.js';

const SOURCE_TYPE: SharedProductDescriptionSourceType = 'mfds_drug_otc';
const CHUNK = 200;

const WL_PATH = path.resolve(
  process.cwd(),
  '../../docs/guides/products/drug/pilot-en-design/translations/otc-batch13-omission-whitelist.json',
);
const EN_PATH = path.resolve(
  process.cwd(),
  '../../docs/guides/products/drug/pilot-en-design/translations/otc-en-translations-v1.json',
);

interface Edit { field: 'caution' | 'usage' | 'efficacy'; lang: 'ko' | 'en'; find: string; repl: string; why: string }
interface WLGroup { koRows: number; enRows: number; edits: Edit[] }

const cnt = (h: string, n: string): number => h.split(n).length - 1;

/** 필드에 edits(같은 lang) 적용 → 새 값. find 유일 검증 + 역치환 원상복구 검증. */
function applyFieldEdits(orig: string, edits: Edit[]): { next: string; ok: boolean; reason?: string } {
  let next = orig;
  for (const e of edits) {
    if (cnt(next, e.find) !== 1) return { next: orig, ok: false, reason: `FIND_NOT_UNIQUE:${e.find.slice(0, 20)}` };
    next = next.split(e.find).join(e.repl);
  }
  // 역치환(역순) — 화이트리스트 편집만 발생했는지
  let rev = next;
  for (let i = edits.length - 1; i >= 0; i--) rev = rev.split(edits[i].repl).join(edits[i].find);
  if (rev !== orig) return { next: orig, ok: false, reason: 'REVERSE_MISMATCH' };
  return { next, ok: true };
}

interface Row { id: string; language: string; content: string; candidate_id: string; title: string; group_key: string; content_json: Record<string, unknown> }

async function main(): Promise<void> {
  const apply = process.argv.slice(2).includes('--apply') && process.env.DRUG_OTC_BATCH13_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';

  const wl = JSON.parse(fs.readFileSync(WL_PATH, 'utf8')) as { groups: Record<string, WLGroup> };
  const enFile = JSON.parse(fs.readFileSync(EN_PATH, 'utf8')) as { translations: DrugOtcEnTranslation[] };
  const enByGk = new Map(enFile.translations.map((t) => [t.groupKey, t]));
  const groupKeys = Object.keys(wl.groups);

  const { DataSource } = await import('typeorm');
  const host = process.env.DB_HOST;
  if (!host) throw new Error('DB_HOST 미설정');
  const ds = new DataSource({
    type: 'postgres', host, port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'],
  });
  await ds.initialize();

  let updated = 0;
  try {
    // ── 1) 대상 로드 ──
    const rows: Row[] = await ds.query(
      `SELECT s.id::text, s.language, s.content, s.source_ref_id::text AS candidate_id,
              d.title, d.content_json->>'groupKey' AS group_key, d.content_json
         FROM shared_product_descriptions s
         JOIN product_candidate_description_drafts d ON d.candidate_id = s.source_ref_id
        WHERE s.source_type=$1 AND s.description_type='STORE' AND s.status='canonical'
          AND s.deleted_at IS NULL AND d.content_json->>'groupKey' = ANY($2::text[])
        ORDER BY s.language, d.content_json->>'groupKey', s.id`,
      [SOURCE_TYPE, groupKeys],
    );

    // 그룹별 draft(대표) + 편집 결과 준비
    const checks: { name: string; ok: boolean; got: string | number }[] = [];
    const newDraftByGk = new Map<string, Record<string, unknown>>();
    const newEnByGk = new Map<string, DrugOtcEnTranslation>();
    const changedKoFieldsByGk = new Map<string, Set<string>>();

    let alreadyAll = true;

    for (const gk of groupKeys) {
      const g = wl.groups[gk];
      const gkRows = rows.filter((r) => r.group_key === gk);
      const ko = gkRows.filter((r) => r.language === 'ko');
      const en = gkRows.filter((r) => r.language === 'en');
      checks.push({ name: `${gk.slice(0, 5)} ko/en`, ok: ko.length === g.koRows && en.length === g.enRows, got: `${ko.length}/${en.length}` });

      const draftJson = ko[0]?.content_json ?? {};
      const enT = enByGk.get(gk);
      if (!enT) { checks.push({ name: `${gk.slice(0, 5)} en번역`, ok: false, got: 'NO' }); continue; }

      // 필드별 편집 그룹핑
      const koFields = new Map<string, Edit[]>();
      const enFields = new Map<string, Edit[]>();
      for (const e of g.edits) (e.lang === 'ko' ? koFields : enFields).get(e.field)?.push(e) ?? (e.lang === 'ko' ? koFields : enFields).set(e.field, [e]);

      // 멱등: 이미 반영됐는지(첫 edit 의 repl 존재로 근사)
      const first = g.edits[0];
      const firstSrc = first.lang === 'ko' ? String(draftJson[first.field] ?? '') : String((enT as unknown as Record<string, string>)[first.field] ?? '');
      const done = firstSrc.includes(first.repl);
      if (!done) alreadyAll = false;

      const nextDraft = { ...draftJson };
      const changedKo = new Set<string>();
      let gOk = true;
      for (const [field, edits] of koFields) {
        const orig = String(draftJson[field] ?? '');
        if (orig.includes(edits[0].repl)) continue; // 이미 반영
        const r = applyFieldEdits(orig, edits);
        if (!r.ok) { gOk = false; checks.push({ name: `${gk.slice(0, 5)} ko ${field}`, ok: false, got: r.reason! }); break; }
        nextDraft[field] = r.next; changedKo.add(field);
      }
      const nextEn: DrugOtcEnTranslation = { ...enT };
      for (const [field, edits] of enFields) {
        const orig = String((enT as unknown as Record<string, string>)[field] ?? '');
        if (orig.includes(edits[0].repl)) continue;
        const r = applyFieldEdits(orig, edits);
        if (!r.ok) { gOk = false; checks.push({ name: `${gk.slice(0, 5)} en ${field}`, ok: false, got: r.reason! }); break; }
        (nextEn as unknown as Record<string, string>)[field] = r.next;
      }
      if (gOk && (changedKo.size || enFields.size)) {
        newDraftByGk.set(gk, nextDraft);
        newEnByGk.set(gk, nextEn);
        changedKoFieldsByGk.set(gk, changedKo);
      }
    }

    if (alreadyAll) {
      console.log(`배치13 공통 누락 보완 (${mode}) — **이미 전부 반영됨 (no-op)** · dbWrite 0`);
      return;
    }

    // ── 2) BUILDER_DRIFT + 신규 canonical ──
    const planned: { id: string; content: string }[] = [];
    const mismatches: { id: string; gk: string; lang: string; reason: string }[] = [];
    for (const r of rows) {
      const nd = newDraftByGk.get(r.group_key);
      const ne = newEnByGk.get(r.group_key);
      if (!nd || !ne) continue; // 이 그룹은 편집 없음(이미 반영 등)
      if (r.language === 'ko') {
        const oldB = buildDrugOtcConsumerHtml(r.content_json as never, { title: r.title });
        if (oldB.missing.length || oldB.html !== r.content) { mismatches.push({ id: r.id, gk: r.group_key, lang: 'ko', reason: 'BUILDER_DRIFT' }); continue; }
        const newB = buildDrugOtcConsumerHtml(nd as never, { title: r.title });
        if (newB.missing.length) { mismatches.push({ id: r.id, gk: r.group_key, lang: 'ko', reason: 'INCOMPLETE' }); continue; }
        planned.push({ id: r.id, content: newB.html });
      } else {
        const enT = enByGk.get(r.group_key)!;
        const oldB = buildDrugOtcEnConsumerHtml(enT);
        if (oldB.missing.length || oldB.html !== r.content) { mismatches.push({ id: r.id, gk: r.group_key, lang: 'en', reason: 'BUILDER_DRIFT' }); continue; }
        const newB = buildDrugOtcEnConsumerHtml(ne);
        if (newB.missing.length) { mismatches.push({ id: r.id, gk: r.group_key, lang: 'en', reason: 'INCOMPLETE' }); continue; }
        planned.push({ id: r.id, content: newB.html });
      }
    }
    const expectTotal = [...newDraftByGk.keys()].reduce((s, gk) => s + wl.groups[gk].koRows + wl.groups[gk].enRows, 0);
    checks.push({ name: '변경 그룹 수', ok: newDraftByGk.size > 0, got: newDraftByGk.size });
    checks.push({ name: 'BUILDER_DRIFT 0', ok: mismatches.length === 0, got: mismatches.length ? `${mismatches[0].gk.slice(0, 4)}/${mismatches[0].reason}` : 0 });
    checks.push({ name: `대상 행수 ${expectTotal}`, ok: planned.length === expectTotal, got: planned.length });

    // ── 3) apply ──
    if (apply) {
      const bad = checks.filter((c) => !c.ok);
      if (bad.length) throw new Error(`사전 검증 실패: ${bad.map((b) => `${b.name}(=${b.got})`).join(', ')}`);

      const qr = ds.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      try {
        // 3-1) draft content_json — 변경 필드만 jsonb_set (원본 값 가드)
        for (const [gk, nd] of newDraftByGk) {
          const changed = changedKoFieldsByGk.get(gk)!;
          const orig = rows.find((r) => r.group_key === gk && r.language === 'ko')!.content_json;
          for (const field of changed) {
            const res = await qr.query(
              `UPDATE product_candidate_description_drafts
                  SET content_json = jsonb_set(content_json, $2::text[], to_jsonb($3::text), false), updated_at = now()
                WHERE source_label='MFDS_DRUG_OTC' AND content_json->>'groupKey'=$1
                  AND content_json->>${field === 'caution' ? "'caution'" : field === 'usage' ? "'usage'" : "'efficacy'"} = $4
               RETURNING id`,
              [gk, `{${field}}`, String(nd[field]), String(orig[field])],
            );
            const rr: unknown[] = Array.isArray(res) && Array.isArray(res[0]) ? (res[0] as unknown[]) : (res as unknown[]);
            if (rr.length !== 1) throw new Error(`draft ${gk}/${field} 갱신 ${rr.length}≠1 — 롤백`);
          }
        }
        // 3-2) canonical
        for (let i = 0; i < planned.length; i += CHUNK) {
          const part = planned.slice(i, i + CHUNK);
          const res = await qr.query(
            `UPDATE shared_product_descriptions s SET content=v.content, updated_at=now()
               FROM (SELECT unnest($1::uuid[]) AS id, unnest($2::text[]) AS content) v
              WHERE s.id=v.id RETURNING s.id`,
            [part.map((p) => p.id), part.map((p) => p.content)],
          );
          const rr: unknown[] = Array.isArray(res) && Array.isArray(res[0]) ? (res[0] as unknown[]) : (res as unknown[]);
          updated += rr.length;
        }
        if (updated !== expectTotal) throw new Error(`UPDATE ${updated}≠${expectTotal} — 롤백`);

        // 3-3) 커밋 전 사후검증 — 각 그룹 첫 edit repl 이 전 행에 존재
        for (const gk of newDraftByGk.keys()) {
          const g = wl.groups[gk];
          const koEdit = g.edits.find((e) => e.lang === 'ko')!;
          const enEdit = g.edits.find((e) => e.lang === 'en')!;
          const [{ ko, en }]: { ko: string; en: string }[] = await qr.query(
            `SELECT count(*) FILTER (WHERE s.language='ko' AND s.content LIKE '%'||$3||'%')::text AS ko,
                    count(*) FILTER (WHERE s.language='en' AND s.content LIKE '%'||$4||'%')::text AS en
               FROM shared_product_descriptions s JOIN product_candidate_description_drafts d ON d.candidate_id=s.source_ref_id
              WHERE s.source_type=$1 AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL
                AND d.content_json->>'groupKey'=$2`,
            [SOURCE_TYPE, gk, koEdit.repl.slice(0, 40), enEdit.repl.slice(0, 40)],
          );
          if (Number(ko) !== g.koRows || Number(en) !== g.enRows)
            throw new Error(`${gk} 반영 ko=${ko}/${g.koRows} en=${en}/${g.enRows} — 롤백`);
        }
        await qr.commitTransaction();
      } catch (e) { await qr.rollbackTransaction(); throw e; } finally { await qr.release(); }

      // 3-4) EN JSON 파일 — DB 커밋 후
      for (const [gk, ne] of newEnByGk) {
        const t = enByGk.get(gk)!;
        Object.assign(t, ne);
      }
      fs.writeFileSync(EN_PATH, JSON.stringify(enFile, null, 2) + '\n', 'utf8');
      console.log(`EN JSON 갱신: ${path.basename(EN_PATH)} (${newEnByGk.size}그룹)`);
    }

    console.log('───────────────────────────────────────────────');
    console.log(`OTC 공통 누락 보완 배치 13 (${mode})`);
    console.log('───────────────────────────────────────────────');
    for (const c of checks) console.log(`  ${c.ok ? '✅' : '❌'} ${c.name.padEnd(20)} = ${c.got}`);
    console.log(`변경 그룹: ${newDraftByGk.size} | 대상 행: ${planned.length} | dbWrite: ${apply ? updated + ' rows + draft' : 0}`);
  } finally { await ds.destroy(); }
}

main().catch((e) => { console.error(e); process.exit(1); });
