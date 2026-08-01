/**
 * WO-…-FALSE-POSITIVE-FIX-RECURRENCE-GUARD-AND-RELEASE-V1 실행 G
 *   — **EN 절단 전파 전수검증 (READ-ONLY)**
 *
 * KO 절단 유닛의 영향을 받는 ProductMaster 1,148 건은 전부 EN canonical 을 보유한다.
 *   KO 가 잘린 채 EN 이 만들어졌다면 같은 절단이 EN 에 전파됐을 수 있다.
 *
 * 이 스크립트는 **EN canonical 을 UPDATE 하지 않는다.** 분류와 근거만 원장으로 남긴다.
 *   (`SET default_transaction_read_only = on`)
 *
 * 대응 방식: KO·EN 은 같은 조립 규약(텍스트 노드 슬롯)을 쓰므로 **슬롯 인덱스로 1:1 대응**한다.
 *   슬롯 수·태그 골격이 다르면 대응 자체가 성립하지 않으므로 EN-INTRO-DIVERGENT 로 분리한다.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import { slots, type Slot } from './otc-zh-slots.ga.js';
import { judgeDoc, roleOf } from './otc-ko-truncation-policy.ga.js';
import { assertSpec } from './otc-ko-truncation-policy.spec.ga.js';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const inc = (m: Record<string, number>, k: string): void => { m[k] = (m[k] || 0) + 1; };

const skeleton = (h: string): string => h.replace(/>[^<]*</g, '><').replace(/^[^<]*/, '').replace(/[^>]*$/, '');
const nums = (s: string): string[] => (s.replace(/\s+/g, '').match(/\d+(?:[.,]\d+)*/g) || []);

/* ── EN 절단 신호 ─────────────────────────────────────────────────────────────
   영어는 어미가 없으므로 한국어와 다른 축으로 본다. 종결부호 · 말줄임표 ·
   접속사/전치사/관사 종료 · 소문자 단어 중간 흔적. */
const EN_ELLIPSIS = /(…|\.\.\.)\s*$/;
const EN_TERMINATED = /[.!?:;)\]]\s*$/;
const EN_DANGLING = /\b(and|or|with|to|of|the|a|an|in|on|for|by|from|as|at|if|when|than|that|which|but|nor|per|via)\s*$/i;
const EN_TRAILING_COMMA = /[,;]\s*$/;
/** 부정·금기 강도 — KO 에 있으면 EN 에도 있어야 한다. */
const KO_NEGATION = /(마십시오|마세요|말고|말며|금지|금기|하지 않|삼가|피하십시오|안 됩니다|주의하십시오)/;
const EN_NEGATION = /\b(do not|don't|must not|should not|shall not|never|avoid|contraindicat|refrain|discontinue|stop using|caution|warning|not recommended|do NOT)\b/i;

type Cls = 'EN-CLEAN' | 'EN-SUMMARY-VALID' | 'EN-TRUNCATED' | 'EN-INTRO-DIVERGENT' | 'EN-OTHER';

async function main(): Promise<void> {
  assertSpec();

  const re = JSON.parse(fs.readFileSync(P('otc-ko-truncation-readjudication.ga.json'), 'utf8'));
  const man = JSON.parse(fs.readFileSync(P('otc-zh-batch01-manifest.ga.json'), 'utf8')).manifest as any[];

  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5682', 10), database: 'o4o_platform',
    max: 4, statement_timeout: 900000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  await pool.query('SET default_transaction_read_only = on');

  /* 영향 문서(=KO 절단 유닛을 하나라도 가진 문서)의 master 를 모집단으로 삼는다. */
  const koIds = man.map((m) => m.koId);
  const koRows = new Map<string, { content: string; master: string }>();
  for (let i = 0; i < koIds.length; i += 500)
    for (const r of (await pool.query(
      'SELECT id::text id, master_id::text master_id, content FROM shared_product_descriptions WHERE id = ANY($1::uuid[])',
      [koIds.slice(i, i + 500)])).rows) koRows.set(r.id, { content: r.content || '', master: r.master_id });

  const affected = new Map<string, string>();   // masterId → koId
  for (const m of man) {
    const row = koRows.get(m.koId);
    if (!row || !row.content) continue;
    const sl = slots(row.content);
    const vs = judgeDoc(row.content, sl);
    /* 구 판정 기준의 "형식적 절단" 모집단 = 이번 재판정에서 관심 대상이 된 유닛을 가진 문서 */
    const hit = sl.some((s, i) => vs[i].blocked || vs[i].reason === 'DISPLAY_SUMMARY_ELLIPSIS'
      || vs[i].reason === 'DISPLAY_SUMMARY_ALLOWED' || vs[i].reason === 'KOREAN_TERMINATOR_COMPLETE'
      || vs[i].reason === 'STRUCTURAL_SPLIT');
    if (hit) affected.set(row.master, m.koId);
  }

  const masters = [...affected.keys()];
  const enRows = new Map<string, { id: string; content: string }>();
  for (let i = 0; i < masters.length; i += 400)
    for (const r of (await pool.query(
      `SELECT master_id::text master_id, id::text id, content FROM shared_product_descriptions
        WHERE master_id = ANY($1::uuid[]) AND description_type = 'STORE' AND status = 'canonical'
          AND language = 'en' AND deleted_at IS NULL`, [masters.slice(i, i + 400)])).rows)
      enRows.set(r.master_id, { id: r.id, content: r.content || '' });
  await pool.end();

  const byClass: Record<string, number> = {}, evidence: Record<string, number> = {};
  const records: any[] = [];
  let noEn = 0;

  for (const [master, koId] of affected) {
    const ko = koRows.get(koId)!;
    const en = enRows.get(master);
    if (!en || !en.content) { noEn++; continue; }

    const kSl = slots(ko.content), eSl = slots(en.content);
    const kV = judgeDoc(ko.content, kSl);
    const findings: string[] = [];
    let cls: Cls = 'EN-CLEAN';

    /* ── 축 1: EN 자체 절단 검사 (KO 대응과 무관) ──────────────────────────
       EN 이 KO 슬롯 치환 산출물이 아니어도 이 검사는 항상 성립한다.
       "EN 본문 자체가 잘려 있는가" 가 실제로 답해야 할 질문이다. */
    let selfTrunc = 0, selfSummary = 0;
    for (let i = 0; i < eSl.length; i++) {
      const e = eSl[i], role = roleOf(e.kind), et = e.text.trim();
      if (role === 'label' || et.length <= 40) continue;
      const ell = EN_ELLIPSIS.test(et);
      if (role === 'display' && ell) { selfSummary++; continue; }
      if (ell) { selfFind(`SELF_ELLIPSIS_IN_BODY#${i}:${et.slice(-26)}`); continue; }
      if (role !== 'body') continue;
      if (EN_TERMINATED.test(et)) continue;
      if (EN_DANGLING.test(et)) { selfFind(`SELF_DANGLING_WORD#${i}:${et.slice(-26)}`); continue; }
      if (EN_TRAILING_COMMA.test(et)) { selfFind(`SELF_TRAILING_COMMA#${i}:${et.slice(-26)}`); continue; }
      selfFind(`SELF_NO_TERMINATOR#${i}:${et.slice(-26)}`, false);
    }
    function selfFind(f: string, hard = true): void { findings.push(f); if (hard) selfTrunc++; }
    if (selfTrunc > 0) cls = 'EN-TRUNCATED';
    else if (selfSummary > 0) cls = 'EN-SUMMARY-VALID';

    /* ── 축 2: KO ↔ EN 슬롯 대응 ─────────────────────────────────────────── */
    const aligned = kSl.length === eSl.length && skeleton(ko.content) === skeleton(en.content);
    if (!aligned) {
      if (cls === 'EN-CLEAN' || cls === 'EN-SUMMARY-VALID') cls = 'EN-INTRO-DIVERGENT';
      findings.push(`SLOT_OR_SKELETON_MISMATCH ko=${kSl.length} en=${eSl.length}`);
    } else {
      for (let i = 0; i < eSl.length; i++) {
        const k: Slot = kSl[i], e: Slot = eSl[i];
        const role = roleOf(e.kind);
        const et = e.text.trim();
        if (role === 'label' || et.length <= 40) continue;

        const enEll = EN_ELLIPSIS.test(et);
        const koEll = kV[i].reason === 'DISPLAY_SUMMARY_ELLIPSIS';

        if (role === 'display' && enEll) {
          /* 카드 요약의 말줄임은 설계된 표시 규칙이다 — 절단이 아니다. */
          if (cls === 'EN-CLEAN') cls = 'EN-SUMMARY-VALID';
          continue;
        }
        if (enEll && role === 'body') { findings.push(`ELLIPSIS_IN_BODY#${i}`); cls = 'EN-TRUNCATED'; continue; }
        if (koEll && !enEll && role === 'display') { findings.push(`KO_CARD_ELLIPSIS_EN_FULL#${i}`); if (cls === 'EN-CLEAN') cls = 'EN-OTHER'; }

        if (role === 'body' && !EN_TERMINATED.test(et)) {
          if (EN_DANGLING.test(et)) { findings.push(`DANGLING_WORD#${i}:${et.slice(-24)}`); cls = 'EN-TRUNCATED'; continue; }
          if (EN_TRAILING_COMMA.test(et)) { findings.push(`TRAILING_COMMA#${i}`); cls = 'EN-TRUNCATED'; continue; }
          if (kV[i].blocked) { findings.push(`KO_BLOCKED_EN_UNTERMINATED#${i}:${kV[i].reason}`); cls = 'EN-TRUNCATED'; continue; }
          findings.push(`EN_NO_TERMINATOR#${i}`); if (cls === 'EN-CLEAN' || cls === 'EN-SUMMARY-VALID') cls = 'EN-OTHER';
        }
        /* 수치·연령·횟수·기간 지문 */
        const kn = nums(k.text), en2 = nums(et);
        const missing = kn.filter((v) => !en2.includes(v));
        const invented = en2.filter((v) => !kn.includes(v));
        if (missing.length || invented.length) {
          findings.push(`NUMERIC#${i} missing=${missing.slice(0, 4).join(',')} invented=${invented.slice(0, 4).join(',')}`);
          if (cls === 'EN-CLEAN' || cls === 'EN-SUMMARY-VALID') cls = 'EN-OTHER';
        }
        /* 부정·금기 강도 */
        if (KO_NEGATION.test(k.text) && !EN_NEGATION.test(et)) {
          findings.push(`NEGATION_WEAKENED#${i}`);
          if (cls === 'EN-CLEAN' || cls === 'EN-SUMMARY-VALID') cls = 'EN-OTHER';
        }
      }
    }

    inc(byClass, cls);
    for (const f of findings) inc(evidence, f.split('#')[0]);
    if (cls !== 'EN-CLEAN')
      records.push({ master, koId, enId: en.id, cls, findings: findings.slice(0, 12), koSlots: kSl.length, enSlots: eSl.length });
  }

  const out = {
    note: 'EN canonical 은 변경하지 않았다. 분류·근거 원장만 산출한다.',
    mode: 'READ-ONLY / DB write 0',
    axes: {
      '축1 EN 자체 절단': 'EN 본문 슬롯을 KO 대응과 무관하게 단독 검사한다 — 항상 성립하는 판정',
      '축2 KO↔EN 슬롯 대응': 'EN 이 KO 슬롯 치환 산출물인지. 어긋나면 전파 여부를 슬롯 단위로 물을 수 없다',
    },
    affectedMasters: affected.size, mastersWithoutEn: noEn,
    byClass, evidence,
    selfCheck: {
      alignedMasters: records.filter((r) => !r.findings.some((f: string) => f.startsWith('SLOT_OR_SKELETON'))).length,
      divergentMasters: records.filter((r) => r.findings.some((f: string) => f.startsWith('SLOT_OR_SKELETON'))).length,
    },
    truncatedMasters: records.filter((r) => r.cls === 'EN-TRUNCATED').length,
    /* 실제 EN 손상 교정 큐 — 이번 작업에서는 UPDATE 하지 않는다. 후속 교정 작업의 입력이다. */
    correctionQueue: records.filter((r) => r.cls === 'EN-TRUNCATED')
      .map((r) => ({ master: r.master, enId: r.enId, koId: r.koId, findings: r.findings })),
    /* 자동 판단 불가 — 사람이 확인해야 하는 건. 절단은 아니지만 수치·금기 지문이 어긋난다. */
    needsReview: records.filter((r) => r.findings.some((f: string) =>
      (f.startsWith('NUMERIC') && !/missing=1(,1)*\b/.test(f.replace('missing=', 'missing='))) || f.startsWith('NEGATION_WEAKENED')))
      .map((r) => ({ master: r.master, enId: r.enId, koId: r.koId,
        findings: r.findings.filter((f: string) => f.startsWith('NUMERIC') || f.startsWith('NEGATION_WEAKENED')) })),
    records,   // 무절단(silent cap 없음) — 비-CLEAN 전건 수록
  };
  fs.writeFileSync(P('otc-en-truncation-propagation.ga.json'), JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify({ ...out, correctionQueue: out.correctionQueue.length, records: records.length }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
