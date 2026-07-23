/**
 * WO-O4O-HFF-CROSS-DOMAIN-COMBO-RESOLUTION-A-V1 — Agent A 전용 additive, READ-ONLY.
 * MIXED_NONA 244 전수 재분류: A(관절·피부) / B(장·배변·혈당·체지방·면역) / C(눈·인지·혈행·중성지질·항산화) / 모호.
 * 공용 parser/registry/classify/composer 무수정. 공용 mapFunctionEn(read-only) 로 비-A 기능성 렌더가능성 판정.
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSource } from 'typeorm';
import { normalizeSource } from '../modules/content-guard/source-grounding-parser.js';
import { A_INGREDIENTS, FN, NONA_FUNC } from './hff-combo-a-unregistered-registry.js';
import { mapFunctionEn } from './hff-nutrient-registry.js';
import { extractFunctionsKo } from './hff-sf-registry.js';
import { attributeFunctions } from './hff-combo-a-classify.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const OUTDIR = arg('out') || '.'; fs.mkdirSync(OUTDIR, { recursive: true });
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5436', 10);

// 비-A 기능성 원료 → 도메인(B/C) + 대표 KO 기능성 키워드(중심 판정용, 렌더는 mapFunctionEn 로).
const NONA_DOMAIN: Array<{ re: RegExp; domain: 'B' | 'C' | 'AMBIG'; label: string }> = [
  { re: /프로바이오틱|유산균|비피더스|락토바실/i, domain: 'B', label: '프로바이오틱스(장)' },
  { re: /난소화성|차전자|프락토올리고|difructose|이눌린/i, domain: 'B', label: '식이섬유(장·혈당)' },
  { re: /가르시니아|HCA|hydroxycitric/i, domain: 'B', label: '가르시니아(체지방)' },
  { re: /녹차추출|카테킨/i, domain: 'B', label: '녹차(체지방)' },
  { re: /키토산|키토올리고/i, domain: 'B', label: '키토산(체지방·콜레스테롤)' },
  { re: /가바|\bGABA\b/i, domain: 'B', label: 'GABA' },
  { re: /홍삼|인삼|엘더베리|아로니아|베타글루칸/i, domain: 'B', label: '홍삼/면역' },
  { re: /루테인|지아잔틴|빌베리/i, domain: 'C', label: '루테인(눈)' },
  { re: /은행잎|포스파티딜세린|테아닌/i, domain: 'C', label: '은행잎/인지' },
  { re: /오메가|EPA|DHA|정제어유|크릴/i, domain: 'C', label: '오메가3(혈행·중성지질)' },
  { re: /코엔자임|Q10|헤마토코쿠스|아스타잔틴/i, domain: 'C', label: '항산화(Q10/아스타잔틴)' },
  { re: /폴리코사놀|옥타코사놀/i, domain: 'C', label: '폴리코사놀(콜레스테롤)' },
  { re: /감마리놀렌|헤스페리딘|디오스민|나토키나|헤스페리/i, domain: 'C', label: '혈행/월경전' },
  { re: /밀크씨슬|실리마린|강황|커큐민|백수오|회화나무|매스틱|시트룰린|아르기닌|크레아틴|프로폴리스/i, domain: 'AMBIG', label: '간/기타' },
];

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 300000 } });
  await ds.initialize();
  try {
    const rows: Array<{ stmt: string; mid: string | null; name: string; fn: string; base: string }> = await ds.query(
      `SELECT coalesce(raw_payload->'source'->>'STTEMNT_NO','') stmt, matched_product_master_id mid,
         coalesce(raw_payload->'source'->>'PRDUCT','') name, coalesce(raw_payload->'source'->>'MAIN_FNCTN','') fn,
         coalesce(raw_payload->'source'->>'BASE_STANDARD','') base
       FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL
         AND coalesce(raw_payload->'source'->>'BASE_STANDARD','') ~ '뮤코다당|점액다당|글루코사민|MSM|엠에스엠|메틸설포닐|디메틸설폰|히알루[론룬]산|하이알루론|세라마이드|보스웰|유니베스틴|초록입홍합|리프리놀|콜라겐|엘라스틴'`);
    const cat = { A_LED: [] as unknown[], B_LED: [] as unknown[], C_LED: [] as unknown[], AMBIGUOUS: [] as unknown[] };
    const domainCount: Record<string, number> = {}; let mixed = 0;
    for (const r of rows) {
      const base = r.base || '', mf = r.fn || '';
      const present = A_INGREDIENTS.filter((a) => a.mark.test(base));
      if (!present.length) continue;
      if (!(NONA_FUNC.test(mf) || NONA_FUNC.test(base))) continue; // MIXED_NONA 만
      mixed++;
      // A 기능성 declared in MAIN_FNCTN?
      const aFuncsDeclared = new Set<string>();
      for (const a of present) for (const k of a.funcs) if (FN[k].re.test(mf)) aFuncsDeclared.add(k);
      const aAttr = attributeFunctions(present, mf); // A 귀속 성공 여부
      // 비-A 도메인 탐지(mf 우선, 없으면 base)
      const domains = new Set<string>(); const nonaLabels = new Set<string>();
      for (const d of NONA_DOMAIN) { if (d.re.test(mf) || d.re.test(base)) { domains.add(d.domain); nonaLabels.add(d.label); } }
      // 비-A 기능성 렌더 가능성: MAIN_FNCTN 기능성 문장 중 A 것 제외한 나머지가 mapFunctionEn 로 매핑되는가
      const allFns = extractFunctionsKo(mf);
      const nonAFns = allFns.filter((f) => !Object.values(FN).some((v) => v.re.test(f)));
      const nonAMappable = nonAFns.length > 0 && nonAFns.every((f) => mapFunctionEn(f) != null);
      // 중심 판정: A 기능성이 선언됐고 A 귀속 성공 + 관절/피부 원료 존재 → A 후보. 도메인 단일성으로 B/C-led.
      const rec = { stmt: r.stmt, name: r.name.trim(), aIngs: present.map((p) => p.key), aFuncsDeclared: [...aFuncsDeclared], aAttrOk: aAttr.ok, nonaDomains: [...domains], nonaLabels: [...nonaLabels], nonAFnCount: nonAFns.length, nonAMappable, produced: r.mid != null };
      const dkey = [...domains].sort().join('+') || 'none'; domainCount[dkey] = (domainCount[dkey] ?? 0) + 1;
      // 분류 규칙
      if (domains.has('AMBIG') || domains.size >= 2) cat.AMBIGUOUS.push(rec);
      else if (aFuncsDeclared.size && aAttr.ok && domains.has('B')) cat.B_LED.push(rec); // A 있으나 B 도메인 → B 이관(중심 불명 시 B)
      else if (aFuncsDeclared.size && aAttr.ok && domains.has('C')) cat.C_LED.push(rec);
      else cat.AMBIGUOUS.push(rec);
    }
    // A-LED 재판정: A 기능성 선언 + A 귀속 성공 + 비-A 전부 mapFunctionEn 렌더가능 → A 주도 생산 후보(병기 가능)
    const aLedRenderable: unknown[] = [];
    for (const list of [cat.B_LED, cat.C_LED]) for (const r of list as Array<Record<string, unknown>>) if (r.aAttrOk && r.nonAMappable && !r.produced) aLedRenderable.push(r);
    const w = (nm: string, d: unknown) => fs.writeFileSync(path.join(OUTDIR, `mixed-nona-${nm}.json`), JSON.stringify(d, null, 1));
    w('classified', cat); w('a-led-renderable', aLedRenderable);
    console.log('JSON_MIXED_BEGIN');
    console.log(JSON.stringify({ mixedTotal: mixed, byCategory: { A_LED: cat.A_LED.length, B_LED: cat.B_LED.length, C_LED: cat.C_LED.length, AMBIGUOUS: cat.AMBIGUOUS.length }, domainCount, aLedRenderableCandidates: aLedRenderable.length }, null, 2));
    console.log('JSON_MIXED_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
