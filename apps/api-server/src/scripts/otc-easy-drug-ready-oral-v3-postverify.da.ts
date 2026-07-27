/**
 * WO-O4O-OTC-EASY-DRUG-READY-ORAL-UNIT1-CONTENT-FP-V3-FINAL-PRODUCTION-V1 — LIVE apply 사후검증(da)
 *
 * apply 러너와 별개 커넥션·별개 코드경로에서 unit 의 LIVE 상태를 재확인한다. **read-only(SELECT) 전용.**
 *   KO: master별 canonical 정확히 1 · authored canonical=T · easy deprecated=T · easy canonical 잔존 0 · canonicalDup 0
 *       · sourceRef scope=T · sourceRef 범위밖 행 0 · audit canonical_replaced=T
 *   EN: master별 en canonical 정확히 1 · canonicalDup 0 · sourceRef scope=T · 범위밖 0
 *   공식 6섹션 보존: 저장된 canonical content 가 build 산출물 html 과 md5 일치(KO/EN)
 *   범위 격리: 이 unit 외(oral-unit-2) master 의 상태 무변경(easy canonical 유지) 확인
 *
 * Usage(apps/api-server): ../../node_modules/.bin/tsx src/scripts/otc-easy-drug-ready-oral-v3-postverify.da.ts --unit oral-unit-1 --lang ko|en|both [--port 5442]
 */
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const ENV_PATH = path.resolve(process.cwd(), '.env');
const readPw = (): string => readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim();
const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const READINESS_WO = 'WO-O4O-OTC-EASY-DRUG-READY-ORAL-540-CONTENT-FP-V3-FINAL-READINESS-V1';
const PRODUCTION_WO = 'WO-O4O-OTC-EASY-DRUG-READY-ORAL-UNIT1-CONTENT-FP-V3-FINAL-PRODUCTION-V1';
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const port = (): number => { const a = arg('--port'); return a ? parseInt(a, 10) : 5442; };
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const rd = (f: string): any => JSON.parse(readFileSync(path.join(DATA, f), 'utf8'));

async function main(): Promise<void> {
  const unit = arg('--unit') || 'oral-unit-1';
  const lang = (arg('--lang') || 'both') as 'ko' | 'en' | 'both';
  const ko = rd(`otc-easy-drug-ready-oral-v3-build-${unit}.json`);
  const en = rd(`otc-easy-drug-ready-oral-v3-en-build-${unit}.json`);
  const enByFp: Record<string, any> = Object.fromEntries(en.fingerprints.map((f: any) => [f.fp, f]));
  const otherUnit = unit === 'oral-unit-1' ? 'oral-unit-2' : 'oral-unit-1';
  const other = rd(`otc-easy-drug-ready-oral-v3-build-${otherUnit}.json`);

  const allIds: string[] = ko.fingerprints.flatMap((f: any) => f.masterIds);
  const allRefs: string[] = ko.fingerprints.map((f: any) => f.sourceRef);
  const otherIds: string[] = other.fingerprints.flatMap((f: any) => f.masterIds);
  const T = allIds.length;

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: port(), username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 900000 } });
  await ds.initialize();
  const fails: string[] = [];
  const notes: any = { wo: PRODUCTION_WO, unit, lang, fpCount: ko.fingerprints.length, masterCount: T };
  try {
    if (lang === 'ko' || lang === 'both') {
      const k = (await ds.query(`SELECT
        count(*) FILTER (WHERE canoncnt=1)::int canon1,
        count(*) FILTER (WHERE canoncnt>1)::int "canonicalDup",
        count(*) FILTER (WHERE authored_canon)::int authored,
        count(*) FILTER (WHERE dep_easy)::int "easyDeprecated",
        count(*) FILTER (WHERE easy_left)::int "easyCanonLeft"
        FROM (SELECT mid,
          (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) canoncnt,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.deleted_at IS NULL) authored_canon,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='deprecated' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL) dep_easy,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) easy_left
          FROM unnest($1::uuid[]) mid) t`, [allIds]))[0];
      const kScope = (await ds.query(`SELECT count(DISTINCT master_id)::int m FROM shared_product_descriptions WHERE source_ref_id=ANY($1::uuid[]) AND status='canonical' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL`, [allRefs]))[0];
      const kOutside = (await ds.query(`SELECT count(*)::int n FROM shared_product_descriptions WHERE source_ref_id=ANY($1::uuid[]) AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL AND NOT master_id=ANY($2::uuid[])`, [allRefs, allIds]))[0];
      const audit = (await ds.query(`SELECT count(*)::int n FROM shared_product_description_audit_logs WHERE master_id=ANY($1::uuid[]) AND event_type='canonical_replaced' AND (metadata->>'wo')=$2 AND (metadata->>'productionWo')=$3`, [allIds, READINESS_WO, PRODUCTION_WO]))[0];
      notes.ko = { ...k, sourceRefScope: kScope.m, sourceRefOutside: kOutside.n, audit: audit.n, expected: T };
      if (k.canon1 !== T) fails.push(`ko canon1=${k.canon1}!=${T}`);
      if (k.canonicalDup !== 0) fails.push(`ko canonicalDup=${k.canonicalDup}`);
      if (k.authored !== T) fails.push(`ko authoredCanonical=${k.authored}!=${T}`);
      if (k.easyDeprecated !== T) fails.push(`ko easyDeprecated=${k.easyDeprecated}!=${T}`);
      if (k.easyCanonLeft !== 0) fails.push(`ko easyCanonicalLeft=${k.easyCanonLeft}`);
      if (kScope.m !== T) fails.push(`ko sourceRefScope=${kScope.m}!=${T}`);
      if (kOutside.n !== 0) fails.push(`ko sourceRefOutside=${kOutside.n}`);
      if (audit.n !== T) fails.push(`ko audit=${audit.n}!=${T}`);

      // 공식 6섹션 보존: 저장 content == build koHtml (fp별 md5 대조)
      let contentMismatch = 0;
      for (const f of ko.fingerprints) {
        const rows = await ds.query(`SELECT md5(content) h, count(*)::int n FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND status='canonical' AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND source_type IN ('mfds_drug_otc','nutrition_combo') AND deleted_at IS NULL GROUP BY 1`, [f.masterIds]);
        if (rows.length !== 1 || rows[0].h !== md5(f.koHtml) || rows[0].n !== f.masterIds.length) contentMismatch++;
      }
      notes.ko.contentMismatchFps = contentMismatch;
      if (contentMismatch !== 0) fails.push(`ko contentMismatchFps=${contentMismatch}`);
    }

    if (lang === 'en' || lang === 'both') {
      const e = (await ds.query(`SELECT count(*) FILTER (WHERE encanon=1)::int canon1, count(*) FILTER (WHERE encanon>1)::int "canonicalDup",
        count(*) FILTER (WHERE authored_canon)::int authored
        FROM (SELECT mid,
          (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL) encanon,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND s.language='en' AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.deleted_at IS NULL) authored_canon
          FROM unnest($1::uuid[]) mid) t`, [allIds]))[0];
      const eScope = (await ds.query(`SELECT count(DISTINCT master_id)::int m FROM shared_product_descriptions WHERE source_ref_id=ANY($1::uuid[]) AND status='canonical' AND language='en' AND deleted_at IS NULL`, [allRefs]))[0];
      const eOutside = (await ds.query(`SELECT count(*)::int n FROM shared_product_descriptions WHERE source_ref_id=ANY($1::uuid[]) AND language='en' AND deleted_at IS NULL AND NOT master_id=ANY($2::uuid[])`, [allRefs, allIds]))[0];
      notes.en = { ...e, sourceRefScope: eScope.m, sourceRefOutside: eOutside.n, expected: T };
      if (e.canon1 !== T) fails.push(`en canon1=${e.canon1}!=${T}`);
      if (e.canonicalDup !== 0) fails.push(`en canonicalDup=${e.canonicalDup}`);
      if (e.authored !== T) fails.push(`en authoredCanonical=${e.authored}!=${T}`);
      if (eScope.m !== T) fails.push(`en sourceRefScope=${eScope.m}!=${T}`);
      if (eOutside.n !== 0) fails.push(`en sourceRefOutside=${eOutside.n}`);

      let enMismatch = 0, hangul = 0;
      for (const f of ko.fingerprints) {
        const eb = enByFp[f.fp];
        const rows = await ds.query(`SELECT md5(content) h, count(*)::int n FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND status='canonical' AND description_type='STORE' AND language='en' AND source_type IN ('mfds_drug_otc','nutrition_combo') AND deleted_at IS NULL GROUP BY 1`, [f.masterIds]);
        if (rows.length !== 1 || rows[0].h !== md5(eb.enHtml) || rows[0].n !== f.masterIds.length) enMismatch++;
        if (/[가-힣]/.test(eb.enHtml)) hangul++;
      }
      notes.en.contentMismatchFps = enMismatch; notes.en.hangulFps = hangul;
      if (enMismatch !== 0) fails.push(`en contentMismatchFps=${enMismatch}`);
      if (hangul !== 0) fails.push(`en hangulFps=${hangul}`);
    }

    // 공식 6섹션 보존(1차 소스 직접 대조): KO source dump 의 present 안전섹션이 DB 저장본에 헤딩으로 존재 ·
    // 효능·효과/용법·용량 수치 전량 잔존. build 산출물이 아니라 **공식 원문 dump ↔ DB** 를 직접 잇는다.
    if (lang === 'ko' || lang === 'both') {
      const SAFETY = ['경고', '사용상 주의사항', '이상반응', '상호작용'];
      const dump = rd('otc-easy-drug-ready-oral-v3-ko-source-dump.da.json');
      const dumpArr: any[] = Array.isArray(dump) ? dump : (dump.records || dump.fingerprints || dump.items || []);
      const byFp: Record<string, any> = {};
      for (const d of dumpArr) if (d && d.fp) byFp[d.fp] = d;
      const blank = (s: any): boolean => !s || !String(s).replace(/<[^>]*>/g, '').replace(/\s|&nbsp;/g, '').trim();
      const nums = (s: any): string[] => (String(s).replace(/<[^>]*>/g, ' ').match(/\d+(?:\.\d+)?/g) || []);
      let secExpected = 0, secFound = 0, numMissFps = 0, dumpMissing = 0, variantFps = 0;
      for (const f of ko.fingerprints) {
        const d = byFp[f.fp]; if (!d) { dumpMissing++; continue; }
        const sec = d.official || d.sections || d;
        const rows = await ds.query(`SELECT DISTINCT content FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND language='ko' AND status='canonical' AND source_type='mfds_drug_otc' AND description_type='STORE' AND deleted_at IS NULL`, [f.masterIds]);
        if (rows.length !== 1) { variantFps++; continue; }
        const html: string = rows[0].content;
        for (const s of SAFETY) {
          if (blank(sec[s])) continue;
          secExpected++;
          if (html.includes(`<h2>${s}</h2>`)) secFound++;
          else fails.push(`preserve fp ${f.fp} 안전섹션 '${s}' 저장본 누락`);
        }
        for (const s of ['효능·효과', '용법·용량']) {
          if (blank(sec[s])) continue;
          const miss = [...new Set(nums(sec[s]))].filter((n) => !html.includes(n));
          if (miss.length) { numMissFps++; fails.push(`preserve fp ${f.fp} '${s}' 수치 누락 ${miss.slice(0, 5).join(',')}`); }
        }
      }
      notes.sourcePreservation = { fpChecked: ko.fingerprints.length, dumpMissing, variantFps,
        safetySectionsExpected: secExpected, safetySectionsFound: secFound, numericMissingFps: numMissFps };
      if (dumpMissing !== 0) fails.push(`preserve dumpMissing=${dumpMissing}`);
      if (variantFps !== 0) fails.push(`preserve DB content variant fps=${variantFps}`);
      if (secFound !== secExpected) fails.push(`preserve safetySections ${secFound}!=${secExpected}`);
    }

    // 범위 격리: 다른 unit(oral-unit-2) 무변경 — easy canonical 유지 · authored/V3ref 0
    const iso = (await ds.query(`SELECT
      (SELECT count(*)::int FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)) "easyCanon",
      (SELECT count(*)::int FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND source_type IN ('mfds_drug_otc','nutrition_combo') AND description_type='STORE' AND deleted_at IS NULL) "authoredRows",
      (SELECT count(*)::int FROM shared_product_description_audit_logs WHERE master_id=ANY($1::uuid[]) AND (metadata->>'productionWo')=$2) "auditRows"
      `, [otherIds, PRODUCTION_WO]))[0];
    notes.isolation = { otherUnit, otherMasters: otherIds.length, ...iso };
    if (iso.easyCanon !== otherIds.length) fails.push(`isolation ${otherUnit} easyCanon=${iso.easyCanon}!=${otherIds.length}`);
    if (iso.authoredRows !== 0) fails.push(`isolation ${otherUnit} authoredRows=${iso.authoredRows}`);
    if (iso.auditRows !== 0) fails.push(`isolation ${otherUnit} auditRows=${iso.auditRows}`);
  } finally { await ds.destroy(); }

  const out = { ...notes, pass: fails.length === 0, failCount: fails.length, fails };
  console.log(JSON.stringify(out, null, 2));
  console.log(`\n=== POSTVERIFY ${unit} lang=${lang} · PASS=${out.pass} · fails=${out.failCount} ===`);
  if (!out.pass) process.exit(2);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
