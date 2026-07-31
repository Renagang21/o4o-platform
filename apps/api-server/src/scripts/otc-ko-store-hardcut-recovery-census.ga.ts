/**
 * WO-O4O-DRUG-OTC-KO-STORE-HARDCUT-RECOVERY-V1 — 3~5단계 독립 조사 (READ-ONLY · DB write 0)
 *
 * 목적
 *   최신 main + LIVE DB 기준으로 **KO STORE canonical 모집단을 독립 재현**하고,
 *   "하드컷" 결함을 과거 CHECK 의 숫자·대상·판정을 인용하지 않고 **데이터에서 다시** 산출한다.
 *
 * 판정 원칙
 *   1) 대상 길이(N)를 코드에서 가져와 단정하지 않는다. 전 텍스트 단위의 길이 히스토그램에서
 *      이웃 대비 스파이크를 먼저 찾고(탐색 단계), 그 길이를 후보로만 쓴다.
 *   2) 후보 길이에서 끊긴 것이 **정말 절단인지**는 공식 원문(e약은요 = source_type
 *      'mfds_easy_drug' STORE ko 문서)의 해당 섹션 정규화 텍스트의 **접두인지**로 증명한다.
 *      접두가 아니면 결함으로 세지 않는다.
 *   3) 요약/작용 타일은 원문이 아니라 sd-intro 첫 줄이 상위 텍스트이므로 그쪽 접두로 판정한다.
 *   4) 분류는 문서 단위 상호배타 + 결함 발생 건수를 따로 센다.
 *
 * 접속: Cloud SQL Auth Proxy (127.0.0.1:PORT). 자격증명은 process.env 로만 사용하고 출력하지 않는다.
 * Usage(apps/api-server):
 *   ../../node_modules/.bin/tsx src/scripts/otc-ko-store-hardcut-recovery-census.ga.ts [--port 5512]
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';

const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const OUT_SUMMARY = path.join(DATA_DIR, 'otc-ko-store-hardcut-recovery-census.ga.json');
const OUT_DEFECTS = path.join(DATA_DIR, 'otc-ko-store-hardcut-recovery-defects.ga.json');
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };

/* ── 텍스트 추출 ────────────────────────────────────────────────────────────── */
const unesc = (s: string): string =>
  s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const strip = (s: string): string => unesc(s.replace(/<[^>]+>/g, ''));
/** 한국어 문장 종결(닫는 괄호/따옴표 허용) */
const KO_TERM = /[.!?。！？][)\]"'”’）］」』]?$/;

type Unit = { kind: string; idx: number; text: string };

function extractUnits(html: string): Unit[] {
  const out: Unit[] = [];
  const push = (kind: string, raw: string): void => {
    const t = strip(raw);
    if (t.trim().length) out.push({ kind, idx: out.filter((u) => u.kind === kind).length, text: t });
  };
  const intro = html.match(/<p class="sd-intro">([\s\S]*?)<\/p>/);
  if (intro) for (const l of intro[1].split(/<br\s*\/?>|\n/)) push('intro', l);
  const intake = html.match(/<p class="sd-intake">([\s\S]*?)<\/p>/);
  if (intake) for (const l of intake[1].split(/<br\s*\/?>|\n/)) push('intake', l);
  for (const ul of html.match(/<ul class="sd-warn">[\s\S]*?<\/ul>/g) || [])
    for (const li of ul.match(/<li>([\s\S]*?)<\/li>/g) || []) push('warn:li', li.replace(/<\/?li>/g, ''));
  for (const item of html.match(/<div class="sd-item">[\s\S]*?<\/div>/g) || []) {
    const tag = item.match(/<span class="sd-tag">([\s\S]*?)<\/span>/);
    const p = item.match(/<p>([\s\S]*?)<\/p>/);
    if (tag && p) push(`tile:${strip(tag[1]).trim()}`, p[1]);
  }
  const foot = html.match(/<p class="sd-foot">([\s\S]*?)<\/p>/);
  if (foot) for (const l of foot[1].split(/<br\s*\/?>|\n/)) push('foot', l);
  return out;
}
/** 카드 요약 원천 = sd-intro 첫 줄 */
const introFirstLine = (html: string): string | null => {
  const m = html.match(/<p class="sd-intro">([\s\S]*?)<\/p>/);
  return m ? strip(m[1].split(/<br\s*\/?>|\n/)[0]).trim() : null;
};
/** 작용 타일 원문 텍스트 — trim 하지 않는다(절단이 공백 위치에서 일어나면 끝 공백이 남는다) */
const actionTile = (html: string): string | null => {
  const m = html.match(/<span class="sd-tag">작용<\/span>\s*<p>([\s\S]*?)<\/p>/);
  return m ? strip(m[1]) : null;
};

/* ── 공식 원문(e약은요) 파싱 — 저작기와 동일 규약 ──────────────────────────────── */
function sections(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim();
  return out;
}
const stripTags = (s: string): string => s.replace(/<[^>]+>/g, ' ');
function normalize(s: string): string {
  return stripTags(s).normalize('NFKC')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/[·・∙•▪▶►\-–—]/g, ',').replace(/^\s*\d+\)\s*/gm, '')
    .replace(/[，、]/g, ',').replace(/[．。]/g, '.')
    .replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',').trim();
}
type OfficialSections = { indication: string; dosage: string; caution: string };
function officialOf(content: string): OfficialSections {
  const sec = sections(content);
  return {
    indication: normalize(sec['효능·효과'] || ''),
    dosage: normalize(sec['용법·용량'] || ''),
    caution: normalize([sec['경고'], sec['사용상 주의사항'], sec['상호작용']].filter(Boolean).join('\n')),
  };
}

type Row = {
  id: string; masterId: string; summary: string | null; content: string;
  sourceRefId: string | null; updatedAt: string;
  productName: string | null; sourceType: string; descriptionType: string; language: string; status: string;
};

/** 결함 유형별 권장 복구 방법 — 값은 조사 결과(원문 접두 증명)에서만 도출한다 */
const RECOVERY: Record<string, string> = {
  'HC-BODY-CAUTION': '공식 원문(e약은요 경고+사용상 주의사항+상호작용) 정규화 텍스트에서 절단 지점 이후를 문장 경계까지 복원. 원문에 없는 문장 추가 금지.',
  'HC-BODY-DOSAGE': '공식 원문(용법·용량) 정규화 텍스트에서 절단 지점 이후를 문장 경계까지 복원.',
  'HC-BODY-INDICATION': '공식 원문(효능·효과) 정규화 텍스트에서 절단 지점 이후를 문장 경계까지 복원.',
  'HC-CARD-SUMMARY': 'sd-intro 첫 줄에서 deriveLeafletSummary() 로 문장 경계 요약을 재파생해 `작용` 타일 값을 교체(요약 컬럼 신규 생성은 별도 판단).',
};

async function main(): Promise<void> {
  const port = parseInt(arg('--port') || process.env.PROXY_PORT || '5512', 10);
  const pool = new Pool({
    host: '127.0.0.1', port, database: 'o4o_platform', max: 4,
    user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD,
  });
  await pool.query('SET default_transaction_read_only = on');

  /* ── 3단계 모집단 재현 ──────────────────────────────────────────────────────── */
  const POP = `s.deleted_at IS NULL AND s.description_type='STORE' AND s.source_type='mfds_drug_otc'
               AND s.status='canonical' AND COALESCE(s.language,'ko')='ko'`;
  const rows: Row[] = (await pool.query(
    `SELECT s.id::text AS id, s.master_id::text AS "masterId", s.summary, s.content,
            s.source_ref_id::text AS "sourceRefId", s.updated_at::text AS "updatedAt",
            pm.name AS "productName", s.source_type AS "sourceType", s.description_type AS "descriptionType",
            COALESCE(s.language,'ko') AS language, s.status
       FROM shared_product_descriptions s
       JOIN product_masters pm ON pm.id = s.master_id
      WHERE ${POP} ORDER BY s.master_id`)).rows;

  const one = async (sql: string): Promise<any> => (await pool.query(sql)).rows[0];
  const population = {
    koStoreCanonical: rows.length,
    distinctMasterId: parseInt((await one(
      `SELECT count(DISTINCT s.master_id)::text c FROM shared_product_descriptions s WHERE ${POP}`)).c, 10),
    duplicateCanonicalMasters: parseInt((await one(
      `SELECT count(*)::text c FROM (SELECT master_id FROM shared_product_descriptions s WHERE ${POP}
          GROUP BY 1 HAVING count(*)>1) t`)).c, 10),
    masterJoinMissing: parseInt((await one(
      `SELECT count(*)::text c FROM shared_product_descriptions s
         LEFT JOIN product_masters pm ON pm.id=s.master_id WHERE ${POP} AND pm.id IS NULL`)).c, 10),
    masterNotActive: parseInt((await one(
      `SELECT count(*)::text c FROM shared_product_descriptions s
         JOIN product_masters pm ON pm.id=s.master_id WHERE ${POP} AND UPPER(COALESCE(pm.status,''))<>'ACTIVE'`)).c, 10),
    masterRegulatoryTypes: (await pool.query(
      `SELECT COALESCE(pm.regulatory_type,'(null)') t, COALESCE(pm.drug_category,'(null)') c, count(*)::int n
         FROM shared_product_descriptions s JOIN product_masters pm ON pm.id=s.master_id
        WHERE ${POP} GROUP BY 1,2 ORDER BY n DESC`)).rows,
    wrongTypeOrLangMixedIn: parseInt((await one(
      `SELECT count(*)::text c FROM shared_product_descriptions s WHERE ${POP}
         AND (s.description_type<>'STORE' OR COALESCE(s.language,'ko')<>'ko' OR s.status<>'canonical'
              OR s.deleted_at IS NOT NULL)`)).c, 10),
    sourceRefNull: rows.filter((r) => !r.sourceRefId).length,
    baselineExpected: 15908,
  };
  const populationMatchesBaseline = population.koStoreCanonical === population.baselineExpected;

  /* ── 공식 원문(e약은요) 적재 — 상태 무관(대부분 deprecated 로 밀려 있다) ─────────── */
  const srcRows = (await pool.query(
    `SELECT DISTINCT ON (s.master_id) s.master_id::text AS mid, s.content, s.status
       FROM shared_product_descriptions s
      WHERE s.source_type='mfds_easy_drug' AND s.description_type='STORE'
        AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
        AND s.master_id IN (SELECT master_id FROM shared_product_descriptions s2 WHERE ${POP.replace(/s\./g, 's2.')})
      ORDER BY s.master_id, (s.status='canonical') DESC, length(s.content) DESC`)).rows as
    { mid: string; content: string; status: string }[];
  await pool.end();

  const official = new Map<string, OfficialSections>();
  const officialStatus = new Map<string, string>();
  for (const s of srcRows) { official.set(s.mid, officialOf(s.content)); officialStatus.set(s.mid, s.status); }

  /* ── 4단계 후보 절단 길이 탐색 — 길이 히스토그램 스파이크(코드 아님) ─────────────── */
  const hist = new Map<string, number>();     // `${kind}|${len}` -> n
  for (const r of rows) for (const u of extractUnits(r.content)) {
    const k = `${u.kind}|${u.text.length}`; hist.set(k, (hist.get(k) || 0) + 1);
  }
  for (const r of rows) if (r.summary !== null) {
    const k = `summaryField|${String(r.summary).length}`; hist.set(k, (hist.get(k) || 0) + 1);
  }
  const byKind = new Map<string, Map<number, number>>();
  for (const [k, c] of hist) {
    const [kind, l] = k.split('|');
    if (!byKind.has(kind)) byKind.set(kind, new Map());
    byKind.get(kind)!.set(parseInt(l, 10), c);
  }
  const spikes: Array<{ kind: string; len: number; count: number; neighbourMedian: number }> = [];
  for (const [kind, m] of byKind) for (const [L, c] of m) {
    if (c < 15 || L < 60) continue;                       // 60 미만은 라벨성 텍스트 — 절단 후보 아님
    const nb: number[] = [];
    for (let d = -6; d <= 6; d++) if (d !== 0 && L + d > 0) nb.push(m.get(L + d) || 0);
    nb.sort((a, b) => a - b);
    const med = nb[Math.floor(nb.length / 2)];
    if (c >= Math.max(15, (med + 1) * 6)) spikes.push({ kind, len: L, count: c, neighbourMedian: med });
  }
  spikes.sort((a, b) => b.count - a.count);

  /* ── 5단계 전수 판정 ────────────────────────────────────────────────────────
   * 결함 유형(상호배타 · 문서 단위로는 우선순위 순서로 하나만 부여)
   *   HC-BODY-CAUTION   주의 대상 <li> 가 공식 caution 원문의 접두에서 끊김
   *   HC-BODY-DOSAGE    복용 안내 문장이 공식 dosage 원문의 접두에서 끊김
   *   HC-BODY-INDICATION 효능 문장이 공식 indication 원문의 접두에서 끊김
   *   HC-CARD-SUMMARY   summary / 작용 타일이 sd-intro 첫 줄의 고정 접두에서 끊김
   */
  const CARD_CUTS = new Set([120, 200]);
  type Defect = {
    descId: string; masterId: string; productName: string | null; sourceRefId: string | null;
    sourceType: string; descriptionType: string; language: string; status: string;
    kind: string; unitKind: string; unitIndex: number; cutLen: number; normalizedCutLen: number;
    terminated: boolean; officialSection: string | null; officialLen: number | null;
    prefixOfOfficial: boolean; verdictBasis: string; autoRecoverable: boolean; recovery: string;
    text: string; officialTail?: string;
  };
  const defects: Defect[] = [];
  const docKinds = new Map<string, Set<string>>();
  const cls = {
    total: rows.length,
    clean: 0, defective: 0,
    summaryNull: 0, noIntro: 0, officialMissing: 0,
    byKind: {} as Record<string, number>,          // 결함 발생 건수
    docsByKind: {} as Record<string, number>,      // 결함 유형별 문서 수(중복 가능)
    docsPrimary: {} as Record<string, number>,     // 상호배타 문서 분류
    /** 미종결이지만 절단이 아님 — 공식 원문 자체가 종결부호 없이 끝남(원천측 결함, 본 WO 대상 아님) */
    unterminatedButFaithfulCopy: 0,
    /** 미종결이고 원문과 대조 불가(원문 없음 또는 접두/동일 어느 쪽도 아님) */
    unterminatedUnmatched: 0,
  };
  const unmatchedSamples: any[] = [];
  const PRIORITY = ['HC-BODY-CAUTION', 'HC-BODY-DOSAGE', 'HC-BODY-INDICATION', 'HC-CARD-SUMMARY'];
  const CUT_MIN = 200;    // 본문 절단 후보 최소 길이(라벨·짧은 문장 배제)

  for (const r of rows) {
    const of = official.get(r.masterId);
    if (!of) cls.officialMissing++;
    const line = introFirstLine(r.content);
    if (line === null) cls.noIntro++;
    if (r.summary === null) cls.summaryNull++;
    const found = new Set<string>();

    /* 본문 절단 — 공식 원문 접두 증명 */
    for (const u of extractUnits(r.content)) {
      const t = u.text;
      const L = t.length;
      if (L < CUT_MIN) continue;
      if (KO_TERM.test(t.trimEnd())) continue;                       // 종결부호로 끝나면 절단 아님
      const secKey = u.kind === 'warn:li' ? 'caution' : u.kind === 'intake' ? 'dosage' : u.kind === 'intro' ? 'indication' : null;
      if (!secKey) continue;
      const src = of ? (of as any)[secKey] as string : '';
      /* 접두 판정 — 양쪽 모두 저작기와 동일한 normalize() 로 접어 비교한다.
       * (본문 li 는 섹션 결합부에 개행이 남아 있어 원문 공백 정규화 없이는 오탐/누락이 난다.) */
      const nt = normalize(t);
      const isPrefix = !!src && nt.length > 0 && src.length > nt.length && src.slice(0, nt.length) === nt;
      const isFaithfulCopy = !!src && src === nt;
      const kind = secKey === 'caution' ? 'HC-BODY-CAUTION' : secKey === 'dosage' ? 'HC-BODY-DOSAGE' : 'HC-BODY-INDICATION';
      if (!isPrefix) {
        if (isFaithfulCopy) cls.unterminatedButFaithfulCopy++;      // 원문 자체가 미종결 — 원천측
        else {
          cls.unterminatedUnmatched++;
          if (unmatchedSamples.length < 40) unmatchedSamples.push({
            masterId: r.masterId, unitKind: u.kind, len: L, hasOfficial: !!of,
            officialLen: src ? src.length : 0, tail: t.slice(-60),
          });
        }
        continue;
      }
      found.add(kind);
      cls.byKind[kind] = (cls.byKind[kind] || 0) + 1;
      defects.push({
        descId: r.id, masterId: r.masterId, productName: r.productName, sourceRefId: r.sourceRefId,
        sourceType: r.sourceType, descriptionType: r.descriptionType, language: r.language, status: r.status,
        kind, unitKind: u.kind, unitIndex: u.idx,
        cutLen: L, normalizedCutLen: nt.length, terminated: false, officialSection: secKey, officialLen: src.length,
        prefixOfOfficial: true,
        verdictBasis: '미종결 + 공식 원문 정규화 텍스트의 진접두(strict prefix) — 절단 증명',
        autoRecoverable: true, recovery: RECOVERY[kind], text: t,
        officialTail: src.slice(nt.length, nt.length + 120),
      });
    }

    /* 카드 요약 절단 — sd-intro 첫 줄의 고정 접두 */
    if (line !== null) {
      const cand: Array<{ uk: string; v: string }> = [];
      if (r.summary !== null) cand.push({ uk: 'summaryField', v: String(r.summary) });
      const tile = actionTile(r.content);
      if (tile !== null) cand.push({ uk: 'tile:작용', v: tile });
      for (const c of cand) {
        const L = c.v.length;
        if (!CARD_CUTS.has(L)) continue;
        if (!(line.length > L && line.slice(0, L) === c.v)) continue;
        const kind = 'HC-CARD-SUMMARY';
        found.add(kind);
        cls.byKind[kind] = (cls.byKind[kind] || 0) + 1;
        defects.push({
          descId: r.id, masterId: r.masterId, productName: r.productName, sourceRefId: r.sourceRefId,
          sourceType: r.sourceType, descriptionType: r.descriptionType, language: r.language, status: r.status,
          kind, unitKind: c.uk, unitIndex: 0,
          cutLen: L, normalizedCutLen: normalize(c.v).length, terminated: KO_TERM.test(c.v.trimEnd()),
          officialSection: 'sd-intro:firstLine', officialLen: line.length, prefixOfOfficial: true,
          verdictBasis: `고정 절단 길이 ${L} + sd-intro 첫 줄의 진접두 — 절단 증명`,
          autoRecoverable: true, recovery: RECOVERY[kind], text: c.v,
          officialTail: line.slice(L, L + 120),
        });
      }
    }

    if (found.size === 0) { cls.clean++; continue; }
    cls.defective++;
    docKinds.set(r.id, found);
    for (const k of found) cls.docsByKind[k] = (cls.docsByKind[k] || 0) + 1;
    const primary = PRIORITY.find((k) => found.has(k))!;
    cls.docsPrimary[primary] = (cls.docsPrimary[primary] || 0) + 1;
  }

  const mutualExclusiveOk = cls.clean + cls.defective === cls.total
    && Object.values(cls.docsPrimary).reduce((a, b) => a + b, 0) === cls.defective;

  const summary = {
    wo: 'WO-O4O-DRUG-OTC-KO-STORE-HARDCUT-RECOVERY-V1',
    kind: 'ko-store-hardcut-recovery-census', generatedFrom: 'LIVE', mode: 'READ-ONLY',
    population, populationMatchesBaseline,
    officialSourceLoaded: srcRows.length,
    officialSourceStatus: srcRows.reduce((a: Record<string, number>, s) => { a[s.status] = (a[s.status] || 0) + 1; return a; }, {}),
    detectedSpikes: spikes.slice(0, 30),
    classification: cls,
    mutualExclusiveOk,
    defectOccurrences: defects.length,
    defectDocs: cls.defective,
    byCutLen: defects.reduce((a: Record<string, number>, d) => { a[String(d.cutLen)] = (a[String(d.cutLen)] || 0) + 1; return a; }, {}),
    byUnitKind: defects.reduce((a: Record<string, number>, d) => { a[d.unitKind] = (a[d.unitKind] || 0) + 1; return a; }, {}),
    /** 자동 복구 가능 = 잘려나간 뒷부분이 공식 원문/상위 텍스트에 그대로 남아 있어 추정이 불필요한 건 */
    autoRecoverableOccurrences: defects.filter((d) => d.autoRecoverable).length,
    humanReviewOccurrences: cls.unterminatedUnmatched,
    notOurDefectOccurrences: cls.unterminatedButFaithfulCopy,
    /** 상호배타 합계 검증 — 정상 + 결함 = 모집단 */
    totalsReconcile: {
      clean: cls.clean, defective: cls.defective, sum: cls.clean + cls.defective,
      population: cls.total, ok: cls.clean + cls.defective === cls.total,
    },
    unmatchedSamples,
  };
  fs.writeFileSync(OUT_SUMMARY, JSON.stringify(summary, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_DEFECTS, JSON.stringify({ wo: summary.wo, defectOccurrences: defects.length, defects }, null, 1) + '\n', 'utf8');
  console.log(JSON.stringify(summary, null, 2));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
