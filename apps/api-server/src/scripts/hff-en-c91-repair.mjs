/**
 * WO-O4O-HFF-EN-C91-FUNCTIONAL-CLAIM-LOSS-4802-FULL-REPAIR-V1 §4·§5·§6
 *
 * 누락된 공식 기능성을 **KO canonical 기준**으로 EN 에 복원한다. 오프라인.
 *
 * 복원 원칙(§4):
 *   - EN 자체를 원문 근거로 쓰지 않는다. KO 항목이 기준이다.
 *   - 다만 **표현은 코퍼스에서 수확한다** — 같은 KO 항목이 다른 문서에서 이미 올바르게 번역돼 있으므로,
 *     그 EN 표현을 재사용하면 문체 일관성이 유지되고 새 번역을 지어내지 않는다.
 *   - 기존 EN 문장의 자연스러운 표현은 유지하고, **빠진 항목만 추가**한다.
 *   - 기능성 삭제·병합·원료 간 이동·강도 강화·치료 의미 추가 금지.
 *
 * 산출: .cache/hff-en-c91-plan.json  (문서별 교체 계획)
 *       data/hff-en-c91-repair-plan-v1.json (요약·클러스터)
 */
import fs from 'node:fs';

const D = 'apps/api-server/src/scripts/data';
const CACHE = process.env.JA_CACHE ?? 'apps/api-server/src/scripts/.cache';
const WO = 'WO-O4O-HFF-EN-C91-FUNCTIONAL-CLAIM-LOSS-4802-FULL-REPAIR-V1';

const targets = JSON.parse(fs.readFileSync(`${CACHE}/hff-en-c91-targets.json`, 'utf8'));
const pairs = JSON.parse(fs.readFileSync(`${CACHE}/hff-en-pairs-distinct.json`, 'utf8'));

/* ── ① 코퍼스에서 KO 항목 → EN 절 수확 ────────────────────────────
   단일 기능성 문장(KO 항목 1개)이 올바르게 번역된 쌍에서 EN 절을 뽑는다.
   `May help …` / `Needed …` 앞머리는 문장 조립 때 한 번만 쓰므로 제거해 절만 남긴다. */
const CLAIM_END = /\s*(?:에\s*)?(?:도움을\s*줄\s*수\s*있음|도움이\s*됨|도움을\s*줌|에\s*필요|필요)\s*[.]?\s*$/;
const LEAD = /^(?:May\s+help\s+(?:with\s+)?|Needed\s+(?:for\s+|to\s+)?|Helps?\s+(?:to\s+)?)/i;
const harvest = new Map();          /* KO 항목(정규화) -> {en, docs} */
const norm = (s) => s.replace(/\s+/g, ' ').replace(/[.]\s*$/, '').trim();
const koKey = (s) => norm(s).replace(/[·․‧∙・ㆍ,]/g, '').replace(/\s/g, '');

for (const p of pairs) {
  if (/[가-힣]/.test(p.en)) continue;
  if (!CLAIM_END.test(p.ko)) continue;
  const body = p.ko.replace(CLAIM_END, '');
  if (/[·․‧∙・ㆍ]|,\s*[가-힣]/.test(body)) continue;      /* 나열이면 절 단위가 아니다 */
  const clause = norm(p.en).replace(LEAD, '');
  if (!clause || clause.length < 4) continue;
  const k = koKey(body);
  const cur = harvest.get(k);
  if (!cur || p.docs > cur.docs) harvest.set(k, { en: clause, docs: p.docs, ko: norm(body) });
}

/* ── ② 문서별 교체문 조립 ─────────────────────────────────────── */
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const plan = [], unresolved = new Map();
let repaired = 0, skipped = 0;

for (const t of targets) {
  const edits = [];
  let ok = true;
  for (const L of t.loss) {
    const add = [];
    for (const miss of L.missing) {
      /* 첫 항목에는 원료명이 붙어 있는 경우가 많다(`홍삼 면역력 증진`).
         왼쪽 토큰을 하나씩 떼며 조회한다 — 기능성 본체만 남으면 수확분에 걸린다. */
      let h = harvest.get(koKey(miss));
      if (!h) {
        const toks = miss.replace(/^[^:]*:\s*/, '').split(/\s+/);
        for (let s2 = 1; s2 < toks.length && !h; s2++) h = harvest.get(koKey(toks.slice(s2).join(' ')));
      }
      if (!h) { ok = false; unresolved.set(miss, (unresolved.get(miss) ?? 0) + 1); continue; }
      add.push(h.en);
    }
    if (!ok || !add.length) continue;
    /* 기존 EN 은 그대로 두고 빠진 절만 뒤에 잇는다 — 기존 표현을 다시 쓰지 않는다(§4). */
    const base = norm(L.en).replace(/[.]$/, '');
    const merged = `${base}; ${add.join('; ')}.`;
    edits.push({ slot: L.slot, from: L.en, to: merged, added: add.length, missing: L.missing });
  }
  if (!ok || !edits.length) { skipped++; continue; }
  repaired++;
  plan.push({ productMasterId: t.productMasterId, enId: t.enId, koCanonicalId: t.koCanonicalId,
    koHash: t.koHash, enHash: t.enHash, edits });
}

const unres = [...unresolved.entries()].map(([ko, n]) => ({ ko, docs: n })).sort((a, b) => b.docs - a.docs);
fs.writeFileSync(`${CACHE}/hff-en-c91-plan.json`, JSON.stringify(plan));
const out = {
  wo: WO, plannedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  targetDocuments: targets.length,
  harvestedClauses: harvest.size,
  repairableDocuments: repaired,
  skippedDocuments: skipped,
  totalEdits: plan.reduce((a, b) => a + b.edits.length, 0),
  totalAddedClauses: plan.reduce((a, b) => a + b.edits.reduce((x, y) => x + y.added, 0), 0),
  unresolvedKoItems: unres.length,
  topUnresolved: unres.slice(0, 20),
  sampleEdits: plan.slice(0, 5).flatMap((p) => p.edits.slice(0, 1).map((e) => ({ missing: e.missing, from: e.from.slice(0, 90), to: e.to.slice(0, 160) }))),
};
fs.writeFileSync(`${D}/hff-en-c91-repair-plan-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
