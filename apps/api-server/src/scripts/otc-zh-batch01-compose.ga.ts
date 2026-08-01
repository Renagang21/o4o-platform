/**
 * OTC 중국어(zh) 배치 01 — 프레임 적용 커버리지 측정 + 소규모 표본 조립 (READ-ONLY)
 *
 * 생산 계약(에이전트 2 가 그대로 재사용할 공용 부분):
 *   1. 번역 기준 원문 = **KO canonical**. EN 은 참고 검증용이며 번역 입력으로 쓰지 않는다.
 *   2. 조립 방식 = KO canonical HTML 을 **템플릿으로 삼아 텍스트 슬롯만 치환**한다.
 *      구조(태그·class·순서)를 그대로 두므로 표준 디자인이 자동 계승된다(별도 디자인 적용 단계 없음).
 *   3. 근거 없는 슬롯이 하나라도 남으면 그 문서는 **생성하지 않고 HOLD** 한다(부분 번역 금지).
 *   4. 글자 수 제한·축약·요약·문장 절단 금지(2026-08 정책).
 *   5. 저장: language='zh', description_type='STORE', status='canonical', source_type=KO 와 동일.
 *      canonical 중복은 DB 부분 유니크 인덱스
 *      `uniq_shared_product_descriptions_canonical_per_master_type_lang`
 *      (master_id, description_type, COALESCE(language,'ko')) WHERE canonical AND deleted_at IS NULL
 *      가 구조적으로 차단한다 → INSERT 는 `WHERE NOT EXISTS` 와 함께 멱등이다.
 *   6. 대상 밖 write 금지: KO·EN·타 언어·ProductMaster 무변경.
 *
 * 언어 확장(에이전트 2): 이 파일을 ja 사본으로 복제하고 import 하는 용어집만 교체한다.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import { LANG, TAG, H2, CLASS_FORM, FOOT, TEMPLATE, FRAME_UNITS } from './otc-zh-batch01-frame-glossary.ga.js';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const unesc = (s: string): string => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const T = (h: string): string => unesc(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/** 분류·제형 표기: `일반의약품 · 정` 처럼 ` · ` 로 이어진 토큰을 각각 번역 */
function classForm(text: string): string | null {
  const parts = text.split(/\s*[·・]\s*/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;
  const out: string[] = [];
  for (const p of parts) { const z = CLASS_FORM[p]; if (!z) return null; out.push(z); }
  return out.join(' · ');
}
function frameLookup(kind: string, text: string): string | null {
  if (kind === 'tag') return TAG[text] ?? null;
  if (kind === 'h2') return H2[text] ?? null;
  if (kind === 'foot') return FOOT[text] ?? null;
  for (const t of TEMPLATE) { const m = text.match(t.re); if (m) return t.zh(m); }
  if (kind === 'badge' || kind === 'meta' || kind === 'tile') { const cf = classForm(text); if (cf) return cf; }
  return null;
}

async function main(): Promise<void> {
  const inv = JSON.parse(fs.readFileSync(P('otc-zh-batch01-translation-units.ga.json'), 'utf8')).units as any[];
  /* 프레임 커버리지 — 어떤 유닛이 사전으로 해결되는가 */
  let covered = 0, coveredOcc = 0, totalOcc = 0;
  const byKind: Record<string, { units: number; covered: number; occ: number; coveredOcc: number }> = {};
  for (const u of inv) {
    const b = (byKind[u.kind] ||= { units: 0, covered: 0, occ: 0, coveredOcc: 0 });
    b.units++; b.occ += u.occ; totalOcc += u.occ;
    if (frameLookup(u.kind, u.text)) { covered++; coveredOcc += u.occ; b.covered++; b.coveredOcc += u.occ; }
  }

  /* 표본 조립 — 프레임만으로 완성되는 문서가 있는지(=본문까지 사전 적용되는 문서) 확인 */
  const port = parseInt(arg('--port') || '5662', 10);
  const pool = new Pool({ host: '127.0.0.1', port, database: 'o4o_platform', max: 4, statement_timeout: 900000,
    user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  await pool.query('SET default_transaction_read_only = on');
  const man = JSON.parse(fs.readFileSync(P('otc-zh-batch01-manifest.ga.json'), 'utf8')).manifest as any[];
  const sample = man.slice(0, parseInt(arg('--sample') || '200', 10));
  const rows = (await pool.query('SELECT id::text id, content FROM shared_product_descriptions WHERE id = ANY($1::uuid[])',
    [sample.map((s) => s.koId)])).rows as any[];
  await pool.end();
  const koById = new Map(rows.map((r) => [r.id, String(r.content)]));

  let full = 0; const gaps: Record<string, number> = {};
  for (const s of sample) {
    const html = koById.get(s.koId); if (!html) continue;
    const missing: string[] = [];
    for (const [re, kind] of [[/<span class="sd-tag">([\s\S]*?)<\/span>/g, 'tag'], [/<h2>([^<]*)<\/h2>/g, 'h2'],
      [/<span class="sd-badge[^"]*">([\s\S]*?)<\/span>/g, 'badge'], [/<p class="sd-meta">([\s\S]*?)<\/p>/g, 'meta'],
      [/<small>([\s\S]*?)<\/small>/g, 'small'], [/<p class="sd-intro">([\s\S]*?)<\/p>/g, 'intro'],
      [/<div class="sd-item">[\s\S]*?<p>([\s\S]*?)<\/p>/g, 'tile'], [/<p class="sd-intake">([\s\S]*?)<\/p>/g, 'intake'],
      [/<li>([\s\S]*?)<\/li>/g, 'warn'], [/<p class="sd-foot">([\s\S]*?)<\/p>/g, 'foot']] as any) {
      for (const m of html.matchAll(re as RegExp)) {
        const t = T(m[1]); if (!t) continue;
        if (!frameLookup(kind as string, t)) { missing.push(kind as string); gaps[kind as string] = (gaps[kind as string] || 0) + 1; }
      }
    }
    if (!missing.length) full++;
  }

  const out = {
    lang: LANG, batch: 'zh-batch-01', frameGlossaryUnits: FRAME_UNITS,
    inventory: { distinctUnits: inv.length, totalOcc },
    frameCoverage: { units: covered, unitsPct: +(100 * covered / inv.length).toFixed(1), occ: coveredOcc, occPct: +(100 * coveredOcc / totalOcc).toFixed(1) },
    byKind, sampleDocs: sample.length, sampleFullyCovered: full, sampleGapsByKind: gaps,
    contract: {
      source: 'KO canonical (EN 은 참고 검증용, 번역 입력 아님)',
      method: 'KO HTML 템플릿 유지 + 텍스트 슬롯 치환 → 표준 디자인 자동 계승',
      holdRule: '근거 없는 슬롯 1개라도 있으면 문서 생성 금지(부분 번역 금지)',
      lengthPolicy: '글자 수 제한·축약·요약·절단 금지',
      store: { language: LANG, descriptionType: 'STORE', status: 'canonical', sourceTypeFollowsKo: true },
      canonicalDupGuard: 'uniq_shared_product_descriptions_canonical_per_master_type_lang (부분 유니크) + INSERT WHERE NOT EXISTS',
      outOfScopeWrite: 'KO·EN·타 언어·ProductMaster 무변경',
    },
  };
  fs.writeFileSync(P('otc-zh-batch01-frame-coverage.ga.json'), JSON.stringify(out, null, 1) + '\n', 'utf8');
  console.log(JSON.stringify(out, null, 1));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
