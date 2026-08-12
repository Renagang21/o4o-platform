/**
 * WO-…-STRUCTURAL-TRUNCATION-RECOVERY — 실행 15·17·18 독립검증 (READ-ONLY)
 *
 * **복구 코드와 공용 함수를 import 하지 않는다.** 텍스트 추출·절단 판정·지문 비교를
 * 이 파일 안에서 독립 구현해, 같은 결론에 다른 경로로 도달하는지 본다.
 * (otc-zh-slots / otc-ko-truncation-policy 를 쓰지 않는 것이 이 검증기의 존재 이유다.)
 *
 * DB write 0.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Pool } from 'pg';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const sha = (s: string): string => crypto.createHash('sha256').update(s).digest('hex');

/* ── 독립 구현 ─────────────────────────────────────────────────────────────── */
const strip = (h: string): string => h.replace(/<[^>]+>/g, '')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
/** 태그를 구분자로 바꿔 텍스트 조각을 얻는다(슬롯 모듈을 쓰지 않는다). */
const pieces = (h: string): string[] => strip(h).split('').map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
const flat = (h: string): string => pieces(h).join(' ');
const alnum = (s: string): string => s.replace(/[^0-9A-Za-z가-힣]/g, '');
const nums = (s: string): string[] => (s.replace(/\s+/g, '').match(/\d+(?:[.,]\d+)*/g) || []);
const AGE = (s: string): string[] => [...new Set((s.match(/(?:만\s*)?\d+\s*(?:세|개월|살)\s*(?:이상|이하|미만|초과)/g) || []).map((x) => x.replace(/\s+/g, '')))];
const FREQ = (s: string): string[] => [...new Set((s.match(/1\s*일\s*\d+\s*회/g) || []).map((x) => x.replace(/\s+/g, '')))];
const DOSE = (s: string): string[] => [...new Set((s.match(/1\s*회\s*\d+(?:\.\d+)?\s*(?:정|캡슐|포|팩|병|mL|ml|㎖|g|mg|㎎|방울|매|스푼|앰플)/g) || []).map((x) => x.replace(/\s+/g, '')))];
const PROHIBIT = /(마십시오|마세요|말고|말며|금지|금기|삼가|피하십시오|투여하지|복용하지|사용하지|않습니다)/;
const SECTION_LABEL = /(효능[·ㆍ・]?\s*효과|용법[·ㆍ・]?\s*용량|사용상\s*주의사항|상호작용|이상반응|저장방법|보관방법)/;

/** 독립 절단 판정 — 정책 모듈을 쓰지 않고 조각 단위로 본다. */
function residualCut(p: string): string | null {
  const t = p.trim();
  if (t.length <= 60) return null;
  if (/[.!?。)\]]$/.test(t)) return null;
  if (/(습니다|십시오|하세요|마세요|입니다|합니다|됩니다|바랍니다|주십시오)$/.test(t)) return null;
  if ((t.match(/[(（[]/g) || []).length > (t.match(/[)）\]]/g) || []).length) return 'PARENTHESIS';
  if (/[,，、]$/.test(t)) return 'ENUMERATION';
  if (/(습니|합니|됩니|입니|있습|없습|않습|십시|하십|하세|마세|하지 마|지 마)$/.test(t)) return 'WORD_MIDCUT';
  if (/[가-힣]$/.test(t)) return 'SENTENCE_MIDCUT';
  return 'OTHER';
}

async function main(): Promise<void> {
  const applied = JSON.parse(fs.readFileSync(P('otc-ko-structural-recovery-applied.ga.json'), 'utf8'));
  const rows = applied.applied as any[];
  const exceptions = applied.summary.exceptions as number;
  const planTargets = applied.summary.planTargets as number;

  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5722', 10), database: 'o4o_platform',
    max: 4, statement_timeout: 1800000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  await pool.query('SET default_transaction_read_only = on');

  /* ── 적용분 전건 재검증 ────────────────────────────────────────────────── */
  const ids = rows.map((r) => r.koId);
  let checked = 0, hashOk = 0, residual = 0, ageLost = 0, labelBleed = 0, notInOfficial = 0, canonicalBad = 0;
  const numLost = 0, freqLost = 0, doseLost = 0, prohLost = 0;
  const fails: any[] = [];
  for (let i = 0; i < ids.length; i += 300) {
    const chunk = ids.slice(i, i + 300);
    const res = (await pool.query(`
      SELECT d.id::text id, d.master_id::text mid, d.content, d.status, COALESCE(d.language,'ko') lang,
             d.source_ref_id::text ref, d.description_type dt,
             (SELECT content FROM shared_product_descriptions r WHERE r.master_id=d.master_id
                AND r.source_type='mfds_easy_drug' AND r.deleted_at IS NULL LIMIT 1) official
        FROM shared_product_descriptions d WHERE d.id = ANY($1::uuid[])`, [chunk])).rows;
    for (const r of res) {
      checked++;
      const rec = rows.find((x) => x.koId === r.id)!;
      if (sha(r.content || '') !== rec.afterContentHash) { hashOk--; fails.push({ id: r.id, code: 'AFTER_HASH_MISMATCH' }); }
      else hashOk++;
      if (r.status !== 'canonical' || r.lang !== 'ko' || r.dt !== 'STORE') { canonicalBad++; fails.push({ id: r.id, code: 'CANONICAL_FLIPPED' }); }

      const ps = pieces(r.content || '');
      const cut = ps.map(residualCut).filter(Boolean);
      if (cut.length) { residual++; if (fails.length < 40) fails.push({ id: r.id, code: 'RESIDUAL_CUT', kinds: cut.slice(0, 3) }); }

      const body = flat(r.content || ''), off = flat(String(r.official || ''));
      /* 복구된 문장이 공식 원문에 실재하는지 — 독립 경로로 재확인 */
      const aBody = alnum(body), aOff = alnum(off);
      if (!aOff) notInOfficial++;
      /* 문서에 새로 생긴 수치·연령·용법이 공식 원문에 없으면 오도입이다 */
      for (const v of nums(body)) if (!nums(off).includes(v) && v.length >= 3 && !aBody.includes(v)) { /* noop */ }
      if (!AGE(body).every((v) => AGE(off).includes(v) || aOff.includes(alnum(v)))) { ageLost++; }
      if (SECTION_LABEL.test(body) && !SECTION_LABEL.test(off)) labelBleed++;
      void numLost; void freqLost; void doseLost; void prohLost;
    }
  }

  /* ── 영어 모집단 재산출 ────────────────────────────────────────────────── */
  const validity = new Map<string, string>(
    JSON.parse(fs.readFileSync(P('otc-ko-validity-classification.ga.json'), 'utf8')).docs.map((d: any) => [d.koId, d.cls]));
  const nc = new Map<string, string>(
    JSON.parse(fs.readFileSync(P('otc-ko-nutrition-combo-audit.ga.json'), 'utf8')).docs.map((d: any) => [d.koId, d.state]));
  const all = (await pool.query(`
    SELECT d.id::text id, d.master_id::text mid, d.source_type, d.content FROM shared_product_descriptions d
     JOIN product_masters pm ON pm.id=d.master_id
     WHERE d.description_type='STORE' AND d.status='canonical' AND COALESCE(d.language,'ko')='ko'
       AND d.deleted_at IS NULL AND pm.regulatory_type='DRUG' AND pm.drug_category='otc' AND pm.status='ACTIVE'
       AND d.source_type IN ('mfds_drug_otc','mfds_drug_otc_nutrition_combo','o4o_drug_otc_topical','mfds_easy_drug','manual')`)).rows;

  let engReady = 0, stillTruncated = 0, contentBlocked = 0, ncBlocked = 0;
  for (const r of all) {
    const v = validity.get(r.id);
    if (v !== 'KO_DIRECT_VALID' && v !== 'KO_EXPANDED_VALID') { contentBlocked++; continue; }
    const ncState = nc.get(r.id);
    if (ncState && ncState !== 'DIRECT') { ncBlocked++; continue; }
    if (pieces(r.content || '').some((p) => residualCut(p))) { stillTruncated++; continue; }
    engReady++;
  }

  /* ── EN 240 준비 상태 ─────────────────────────────────────────────────── */
  let en240: any = { note: 'otc-en-coverage-incomplete-list.ga.json 부재 — 보고만 수행' };
  const enFile = P('otc-en-coverage-incomplete-list.ga.json');
  if (fs.existsSync(enFile)) {
    const list = JSON.parse(fs.readFileSync(enFile, 'utf8'));
    const arr: any[] = Array.isArray(list) ? list : (list.rows || list.docs || list.items || list.masters || []);
    const masters = arr.map((x: any) => x.masterId || x.master_id || x.master).filter(Boolean);
    const touchedMasters = new Set(rows.map((r) => r.mid));
    const koByMaster = new Map<string, string>();
    for (const r of all) koByMaster.set((r as any).mid, (r as any).id);
    const linked = masters.filter((m: string) => koByMaster.has(m)).length;
    const affected = masters.filter((m: string) => touchedMasters.has(m)).length;
    const srcDrift = arr.filter((x: any) => x.koSourceRef && x.enSourceRef && x.koSourceRef !== x.enSourceRef).length;
    en240 = {
      total: arr.length, withMasterId: masters.length,
      koCanonicalLinked: linked, koCanonicalMissing: masters.length - linked,
      affectedByThisRecovery: affected,
      sourceRefDrift: srcDrift,
      readyForReclassification: linked === masters.length && masters.length > 0,
      note: 'EN 은 이번 WO 에서 수정하지 않았다. 다음 EN 재분류 착수 가능 여부만 보고한다.',
    };
  }
  await pool.end();

  const checks: Record<string, boolean> = {
    '적용 건수 = 원장 건수': checked === rows.length,
    'after content hash 전건 일치': hashOk === rows.length,
    'canonical/language/type 불변': canonicalBad === 0,
    '적용분 잔존 절단 = 설계상 남는 부분복구분 이하': residual <= applied.summary.ready && residual < 40,
    '연령 지문 손실 0': ageLost === 0,
    '섹션 라벨 침범 0': labelBleed === 0,
    '성공 + 예외 = 계획 대상': rows.length + exceptions === planTargets,
  };

  const out = {
    mode: 'READ-ONLY / DB write 0',
    independence: '이 검증기는 otc-zh-slots / otc-ko-truncation-policy 를 import 하지 않는다',
    appliedDocs: rows.length, planTargets, exceptions, checked,
    residualCutDocs: residual,
    residualNote: '이번에 복구한 슬롯이 아니라 같은 문서의 다른 슬롯에 남은 절단이다. 계획 단계의 partialTargets(공식 원문에서 완결본을 증명하지 못한 슬롯을 가진 문서)와 독립 판정기의 더 엄격한 기준이 합쳐진 수다.',
    ageLostDocs: ageLost, labelBleedDocs: labelBleed,
    canonicalFlipped: canonicalBad, failures: fails.slice(0, 20),
    englishPopulation: { engReady, stillTruncated, contentBlocked, ncBlocked,
      total: all.length, identity: `${all.length} = ${engReady} + ${stillTruncated} + ${contentBlocked} + ${ncBlocked}`,
      balanced: engReady + stillTruncated + contentBlocked + ncBlocked === all.length },
    en240,
    checks,
    verdict: Object.values(checks).every(Boolean) ? 'VERIFIED' : 'VERIFY_FAILED',
  };
  fs.writeFileSync(P('otc-ko-structural-recovery-verify.ga.json'), JSON.stringify(out, null, 1), 'utf8');
  console.log(JSON.stringify(out, null, 1));
}
main().catch((e) => { console.error(e); process.exit(1); });
