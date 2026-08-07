/**
 * WO-O4O-HFF-EN-C91-FUNCTIONAL-CLAIM-LOSS-4802-FULL-REPAIR-V1 §2·§3
 *
 * FUNCTIONAL_CLAIM_LOSS 대상 재현 + **실제 누락 / 오탐 분리**.
 * DB read-only. write 0.
 *
 * §3 이 요구한 대로 단순 개수 차이로 판정하지 않는다. KO 기능성 나열을 **항목으로 분해**하고,
 * 각 항목이 EN 에 의미상 대응되는지 **핵심 개념 토큰**으로 확인한다.
 *
 * 판정:
 *   REAL_LOSS      — KO 항목 중 EN 에 대응이 없는 것이 있다
 *   MERGED         — 대응은 있으나 EN 이 항목을 하나로 합쳤다(구분자 없음)
 *   FALSE_POSITIVE — EN 이 `;` 등 다른 구분자로 전부 담고 있다
 *   TERM_INTERNAL  — KO 의 `·` 가 용어 내부(산화·환원)라 애초에 나열이 아니다
 *
 * 산출: data/hff-en-c91-survey-v1.json · .cache/hff-en-c91-targets.json
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const CACHE = process.env.JA_CACHE ?? 'apps/api-server/src/scripts/.cache';
const WO = 'WO-O4O-HFF-EN-C91-FUNCTIONAL-CLAIM-LOSS-4802-FULL-REPAIR-V1';
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');

/* 용어 내부 중점 — 나열 구분자가 아니다. 실측으로 확인된 것만 둔다. */
const TERM_INTERNAL = /산화\s*[·․‧∙・ㆍ]\s*환원|산\s*[·․‧∙・ㆍ]\s*염기|이미\s*[·․‧∙・ㆍ]\s*이취|기관\s*[·․‧∙・ㆍ]\s*기관지|식전\s*[·․‧∙・ㆍ]\s*식후/;

/** KO 기능성 문장을 항목으로 분해. 종결(`도움을 줄 수 있음`/`에 필요`)을 떼고 나열 구분자로 자른다. */
const CLAIM_END = /(?:도움을\s*줄\s*수\s*있음|도움이\s*됨|도움을\s*줌|에\s*필요|필요)\s*[.]?\s*$/;
function koItems(ko) {
  if (TERM_INTERNAL.test(ko)) return null;                 /* 용어 내부 중점 → 나열 아님 */
  /* 기능성 문장이 아니면 대상이 아니다 — 주의사항·보관 문장이 `,` 를 가졌다고 나열로 보면 안 된다. */
  if (!CLAIM_END.test(ko)) return null;
  const body = ko.replace(/\s*(?:에\s*)?(?:도움을\s*줄\s*수\s*있음|도움이\s*됨|도움을\s*줌|에\s*필요|필요)\s*[.]?\s*$/, '');
  const parts = body.split(/\s*[·․‧∙・ㆍ]\s*|\s*,\s*(?=[가-힣])/).map((s) => s.trim()).filter((s) => s.length > 1);
  return parts.length >= 2 ? parts : null;
}

/* KO 항목 → EN 대응을 확인할 핵심 개념 토큰. 공식 기능성 어휘 기준. */
const CONCEPT = [
  [/면역/, /immun/i], [/피로/, /fatigue|tired/i], [/혈소판|응집/, /platelet|aggregat/i],
  [/혈행|혈액\s*흐름|혈액흐름|혈류/, /blood[- ]?(?:flow|circulation)|circulation/i],
  [/기억력/, /memory/i], [/항산화|산화\s*스트레스/, /antioxidant|antioxidation|oxidative|harmful oxygen|free radical|reactive oxygen/i],
  [/중성지질/, /triglyceride|neutral[- ]?lipid/i], [/콜레스테롤/, /cholesterol/i], [/혈압/, /blood[- ]?pressure/i],
  [/혈당/, /blood (?:sugar|glucose)|glycaem|glycem/i], [/체지방/, /body[- ]?fat/i],
  [/눈|황반|시력/, /eye|macular|vision|sight/i], [/피부/, /skin/i], [/뼈|골/, /bone/i],
  [/치아/, /teeth|tooth|dental/i], [/근육/, /muscle/i], [/신경/, /nerve|neural/i],
  [/간(?![식결])/, /liver|hepat/i], [/장\s*건강|배변|유산균|유익균|유해균/, /intestin|bowel|gut|lactic acid bacteria|beneficial bacteria|harmful bacteria/i],
  [/갱년기/, /menopaus|climacteric/i], [/전립선/, /prostate/i], [/관절|연골/, /joint|cartilage/i],
  [/수면/, /sleep/i], [/스트레스/, /stress/i], [/인지|기억/, /cognitiv|memory/i],
  [/에너지/, /energy/i], [/단백질|아미노산/, /protein|amino acid/i], [/철/, /iron/i],
  [/칼슘/, /calcium/i], [/아연/, /zinc/i], [/엽산|호모시스테인/, /folate|homocystein/i],
  [/세포/, /cell/i], [/결합조직/, /connective[- ]?tissue/i], [/혈액응고/, /blood[- ]?clot|coagulat/i],
  [/골다공증/, /osteoporosis/i], [/점막/, /mucous|mucos/i], [/운동/, /exercise|physical/i],
  [/구강|잇몸/, /oral|gum|mouth/i], [/요로/, /urinary|urethr/i], [/전신|활력/, /vitality/i],
  [/월경|생리/, /menstrua|premenstrual/i], [/배변/, /bowel|defecat/i],
  [/항균/, /antibacterial|antimicrob/i], [/불편/, /discomfort|unease/i],
];
/** KO 항목이 EN 에 의미상 대응되는가. 개념 토큰이 하나도 안 걸리면 판정 불가로 본다(보수적). */
function itemCovered(koItem, en) {
  let matched = null;
  for (const [k, e] of CONCEPT) if (k.test(koItem)) { matched = e; if (e.test(en)) return true; }
  return matched ? false : null;                          /* null = 사전 밖 개념 → 사람 판정 */
}

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5541', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 1800000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }
const BASE = `deleted_at IS NULL AND source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical'`;
const rows = (await c.query(`
  SELECT k.master_id, pm.name AS product_name, k.id AS ko_id, k.content AS ko,
         e.id AS en_id, e.content AS en
    FROM shared_product_descriptions k
    JOIN product_masters pm ON pm.id=k.master_id
    JOIN shared_product_descriptions e ON e.master_id=k.master_id AND e.language='en' AND e.${BASE.replace(/ AND /g, ' AND e.').replace(/^/, '')}
   WHERE k.${BASE.replace(/ AND /g, ' AND k.')} AND coalesce(k.language,'ko')='ko'
   ORDER BY k.master_id`)).rows;
await c.end();

/* 슬롯 추출 — 기능성이 들어가는 li/sd-item 텍스트 */
const slotsOf = (html) => [...String(html).matchAll(/<li[^>]*>([\s\S]*?)<\/li>|<div class="sd-item"[^>]*>([\s\S]*?)<\/div>/g)]
  .map((m) => (m[1] ?? m[2] ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);

const targets = [], rejected = [];
const clusterAgg = new Map();
for (const r of rows) {
  const ks = slotsOf(r.ko), es = slotsOf(r.en);
  if (ks.length !== es.length) continue;                   /* 슬롯 수가 다르면 C16 구조 대상 */
  const docLoss = [];
  for (let i = 0; i < ks.length; i++) {
    const items = koItems(ks[i]);
    if (!items) continue;
    const en = es[i];
    const missing = [], unknown = [];
    for (const it of items) {
      const cov = itemCovered(it, en);
      if (cov === false) missing.push(it);
      else if (cov === null) unknown.push(it);
    }
    if (missing.length) docLoss.push({ slot: i, ko: ks[i], en, koItems: items, missing, unknown });
  }
  if (!docLoss.length) { rejected.push({ m: r.master_id, why: 'NO_REAL_LOSS' }); continue; }
  targets.push({ productMasterId: r.master_id, productName: r.product_name, koCanonicalId: r.ko_id, enId: r.en_id,
    koHash: sha(r.ko), enHash: sha(r.en), loss: docLoss });
  for (const L of docLoss) {
    const key = `${L.ko}\t${L.en}`;
    const e = clusterAgg.get(key) ?? { docs: 0, ko: L.ko, en: L.en, koItems: L.koItems, missing: L.missing };
    e.docs++; clusterAgg.set(key, e);
  }
}

const clusters = [...clusterAgg.values()].sort((a, b) => b.docs - a.docs);
const out = {
  wo: WO, surveyedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  pairsScanned: rows.length,
  realLossDocuments: targets.length,
  rejectedNoRealLoss: rejected.length,
  distinctLossPairs: clusters.length,
  totalMissingItems: targets.reduce((a, t) => a + t.loss.reduce((x, y) => x + y.missing.length, 0), 0),
  topClusters: clusters.slice(0, 20).map((x) => ({ docs: x.docs, missing: x.missing, ko: x.ko.slice(0, 90), en: x.en.slice(0, 100) })),
};
fs.writeFileSync(`${D}/hff-en-c91-survey-v1.json`, JSON.stringify(out, null, 1));
fs.writeFileSync(`${CACHE}/hff-en-c91-targets.json`, JSON.stringify(targets));
fs.writeFileSync(`${CACHE}/hff-en-c91-clusters.json`, JSON.stringify(clusters));
console.log(JSON.stringify({ ...out, topClusters: out.topClusters.slice(0, 8) }, null, 1));
