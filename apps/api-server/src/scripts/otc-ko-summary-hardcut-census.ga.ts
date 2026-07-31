/**
 * WO-O4O-OTC-KO-SUMMARY-HARDCUT-CENSUS-AND-CARD-REBUILD-V1 — 1~4단계 전수 조사 (READ-ONLY · DB write 0)
 *
 * 목적: 한국어 STORE canonical 설명서에서 **고정 길이 하드컷**으로 손상된 대상을
 *       LIVE DB 기준으로 전수 재현하고, 정상/결함을 상호배타로 분류한다.
 *       코드에 `slice(0,N)` 이 존재한다는 사실만으로 대상 수를 추정하지 않는다.
 *
 * 확인된 절단 경로(코드 실측):
 *   - otc-v3-content-leaflet-composer.na.ts:133   요약 `slice(0, 120)`
 *   - otc-v4-carryover72-author.ga.ts:87          요약 `slice(0, 200)`
 *   - otc-unproduced-oral-unit-approval.ts:210    주의사항 `slice(0, 260)`  ← 본문 6섹션(범위 밖·보고 전용)
 *
 * 판정은 코드가 아니라 **데이터**로 한다:
 *   요약이 sd-intro 첫 줄의 접두이면서 길이가 **고정 절단값(N ∈ CUTS)** 과 정확히 같으면 = 절단.
 *   접두이기만 한 것은 결함이 아니다 — 저작기가 요약을 구절로 만들고 sd-intro 가
 *   문장 프레임("…에 사용하는 일반의약품입니다.")을 덧붙이므로 정상 요약도 접두가 된다.
 *   (한국어는 종결이 `다.`/`요.` 형태라 종결부호만으로는 판정할 수 없다.)
 *
 * Usage(apps/api-server):
 *   ../../node_modules/.bin/tsx src/scripts/otc-ko-summary-hardcut-census.ga.ts [--port 5495]
 */
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';

const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const OUT = path.join(DATA_DIR, 'otc-ko-summary-hardcut-census.ga.json');
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };

const unesc = (s: string): string => s.replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
/** 한국어 문장 종결 — `다.` `요.` `.` `!` `?` 및 닫는 괄호 허용 */
const KO_TERMINATOR = /[.!?。！？][)\]"'”’）］」』]?$/;

const introFirstLine = (html: string): string | null => {
  const m = html.match(/<p class="sd-intro">([\s\S]*?)<\/p>/);
  return m ? unesc(m[1].split('<br>')[0].split('\n')[0]).trim() : null;
};
/**
 * 한눈에 보기 `작용` 타일 텍스트.
 * **trim 하지 않는다** — 120자 절단은 공백 위치에서도 일어나 요약 끝에 공백이 남는다.
 * trim 하면 그런 문서(실측 156)를 타일 불일치로 오판한다.
 */
const actionTile = (html: string): string | null => {
  const m = html.match(/<span class="sd-tag">작용<\/span>\s*<p>([\s\S]*?)<\/p>/);
  return m ? unesc(m[1]) : null;
};
/** 주의 대상 <li> 목록 — 본문 6섹션(범위 밖 관측용) */
const warnItems = (html: string): string[] => {
  const out: string[] = [];
  for (const ul of html.match(/<ul class="sd-warn">[\s\S]*?<\/ul>/g) || []) {
    for (const li of ul.match(/<li>([\s\S]*?)<\/li>/g) || []) out.push(unesc(li.replace(/<\/?li>/g, '')).trim());
  }
  return out;
};

type Row = { id: string; masterId: string; summary: string | null; content: string };

async function main(): Promise<void> {
  const port = parseInt(arg('--port') || process.env.PROXY_PORT || '5495', 10);
  const pool = new Pool({ host: '127.0.0.1', port, user: 'o4o_api', database: 'o4o_platform', max: 4 });
  await pool.query('SET default_transaction_read_only = on');

  const KO = `s.deleted_at IS NULL AND s.description_type='STORE' AND s.source_type='mfds_drug_otc'
              AND s.status='canonical' AND COALESCE(s.language,'ko')='ko'`;

  /* 1) KO canonical 모집단 재현 */
  const rows: Row[] = (await pool.query(
    `SELECT s.id::text AS id, s.master_id::text AS "masterId", s.summary, s.content
       FROM shared_product_descriptions s WHERE ${KO} ORDER BY s.master_id`)).rows;

  /* 2) 하드컷 코드가 적용된 배치 식별 — batchId 별 결함 분포로 역추적 */
  const batchOf = new Map<string, string>();
  for (const r of (await pool.query(
    `SELECT DISTINCT ON (master_id) master_id::text AS mid, metadata->>'batchId' AS batch
       FROM shared_product_description_audit_logs
      WHERE metadata->>'batchId' IS NOT NULL ORDER BY master_id, created_at DESC`)).rows as any[]) batchOf.set(r.mid, r.batch);

  /* 3~4) 결함/정상 상호배타 분류 */
  /**
   * 코드에서 확인된 고정 길이. 실측 결과 200 은 LIVE 에 존재하지 않는다
   * (carryover72-author 는 `summaryTable['작용'] || slice(0,200)` 이라 앞 항이 항상 채워졌다).
   * 코드가 아니라 데이터가 대상을 정한다.
   */
  const CUTS = [120, 200];
  const defects: any[] = [];
  const phrase: any[] = [];
  const cls = {
    total: rows.length,
    summaryNull: 0,               // 요약 없음 — 별도 부류(본 WO 대상 아님)
    noIntro: 0,                   // sd-intro 없음 — 판정 불가
    hardcutFixed: 0,              // **결함** — 첫 줄의 앞 N자와 정확 일치(N ∈ CUTS)
    phraseSummary: 0,             // 정상 — 요약이 완결된 효능 구절이고 첫 줄이 문장 프레임을 덧붙인 형태
    pass: 0,                      // 정상 — 요약이 첫 줄 전체이거나 접두가 아님
    midSentence: 0,               // 결함 중 문장 중간 절단
    midWord: 0,                   // 결함 중 어절 중간 절단
    tileAlsoCut: 0,               // 결함 중 `작용` 타일도 같은 값으로 잘린 것
    byCutLen: {} as Record<string, number>,
    byBatch: {} as Record<string, number>,
    phraseTails: {} as Record<string, number>,
  };

  /* 관측 전용(범위 밖): 본문 주의사항 260자 절단 */
  const warn = { docsWithWarn: 0, itemsTotal: 0, items260: 0, items260Unterminated: 0, docs260: 0 };

  for (const r of rows) {
    const sum = r.summary === null ? null : String(r.summary);
    const line = introFirstLine(r.content);
    const tile = actionTile(r.content);

    // 본문 주의사항 관측
    const items = warnItems(r.content);
    if (items.length) {
      warn.docsWithWarn++; warn.itemsTotal += items.length;
      let hit = false;
      for (const it of items) {
        if (it.length !== 260) continue;
        warn.items260++; hit = true;
        if (!KO_TERMINATOR.test(it)) warn.items260Unterminated++;
      }
      if (hit) warn.docs260++;
    }

    if (sum === null) { cls.summaryNull++; continue; }
    if (line === null) { cls.noIntro++; continue; }

    /**
     * 상호배타 분류.
     *
     * 접두 일치만으로는 결함이 아니다. 저작기는 요약을 **구절**로 만들고 sd-intro 는
     * 그 구절에 문장 프레임("…에 사용하는 일반의약품입니다.")을 덧붙이므로,
     * 정상 요약도 첫 줄의 접두가 된다. 실측상 그 꼬리는 5종뿐이고 최다가
     * "에 사용하는 일반의약품입니다."(926) 이다 — 절단이 아니라 설계다.
     *
     * 결함은 **고정 길이에서 정확히 끊긴 것**으로 한정한다.
     */
    const isPrefix = line.length > sum.length && line.slice(0, sum.length) === sum;
    if (!isPrefix) { cls.pass++; continue; }          // 요약 = 첫 줄 전체 또는 별도 문구
    if (!CUTS.includes(sum.length)) {                 // 구절형 요약 — 정상
      cls.phraseSummary++;
      const tail = line.slice(sum.length);
      cls.phraseTails[tail] = (cls.phraseTails[tail] || 0) + 1;
      if (phrase.length < 40) phrase.push({ masterId: r.masterId, summary: sum, introFirstLine: line });
      continue;
    }
    cls.hardcutFixed++;
    const fixed = true;
    cls.byCutLen[String(sum.length)] = (cls.byCutLen[String(sum.length)] || 0) + 1;
    const batch = batchOf.get(r.masterId) || '(none)';
    cls.byBatch[batch] = (cls.byBatch[batch] || 0) + 1;

    const nextCh = line[sum.length] || '';
    const lastCh = sum[sum.length - 1] || '';
    const midWord = /\S/.test(nextCh) && /\S/.test(lastCh);   // 공백 경계가 아니면 어절 중간
    const midSentence = !KO_TERMINATOR.test(sum);
    if (midWord) cls.midWord++;
    if (midSentence) cls.midSentence++;
    if (tile !== null && tile === sum) cls.tileAlsoCut++;

    defects.push({
      descId: r.id, masterId: r.masterId, batch, cutLen: sum.length,
      fixedCut: fixed, midWord, midSentence, tileMatches: tile === sum,
      lineLen: line.length, summary: sum, introFirstLine: line,
    });
  }

  await pool.end();

  const report = {
    wo: 'WO-O4O-OTC-KO-SUMMARY-HARDCUT-CENSUS-AND-CARD-REBUILD-V1',
    kind: 'ko-hardcut-census', generatedFrom: 'LIVE',
    classification: cls,
    warnSectionObservation: warn,            // 범위 밖 — 본문 6섹션 절단(보고 전용)
    mutuallyExclusiveCheck: cls.summaryNull + cls.noIntro + cls.hardcutFixed + cls.phraseSummary + cls.pass === cls.total,
    defectTotal: defects.length,
    phraseSamples: phrase,
    defects,
  };
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n', 'utf8');

  const { defects: _d, phraseSamples: _p, ...head } = report as any;
  console.log(JSON.stringify({ ...head, classification: { ...cls, phraseTails: Object.entries(cls.phraseTails).sort((a: any, b: any) => b[1] - a[1]).slice(0, 8) } }, null, 2));
  console.log(`\n=== KO census · 모집단 ${cls.total} · 결함(고정 120자) ${defects.length} · 구절형 정상 ${cls.phraseSummary} · 그 외 정상 ${cls.pass} · 요약없음 ${cls.summaryNull} ===`);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
