/**
 * WO-O4O-HFF-EN-C01-… §7 — 문제 큐
 *
 * 남은 미해소 슬롯 중 **번역으로 해결할 수 없는 것**을 분류해 따로 기록한다.
 * 추측 번역을 만들지 않기 위한 장치다. DB 접근 없음.
 *
 *   KO_SOURCE_DAMAGED       원문이 잘렸다 — `이미.` `… 식품공전 제10.` `[정제`
 *   CANONICAL_STRUCTURE_UNSAFE  구조가 깨져 슬롯 경계를 신뢰할 수 없다
 *   TRANSLATION_AMBIGUOUS   원문은 온전하나 뜻이 하나로 정해지지 않는다
 *   PENDING_AUTHORING       위 셋이 아니다 — 다음 사이클에서 저작하면 풀린다
 *
 * 산출: data/hff-en-c01-problem-queue-v1.json
 */
import fs from 'node:fs';
import { translateSlot } from './hff-en-c01-translate.mjs';
import { splitSlot, norm, HANGUL } from './hff-en-c01-lib.mjs';

const D = 'apps/api-server/src/scripts/data';
const CACHE = process.env.JA_CACHE ?? 'apps/api-server/src/scripts/.cache';
const targets = JSON.parse(fs.readFileSync(`${CACHE}/hff-en-c01-slots.json`, 'utf8'));

/** 원문이 잘렸다고 볼 근거들. 모두 실측에서 나온 형태다. */
function classify(inner) {
  const t = norm(inner);
  const p = splitSlot(t);
  const body = norm(p.body) || t;
  /* 여는 괄호·대괄호만 있고 닫히지 않았다 */
  const opens = (t.match(/[([]/g) ?? []).length, closes = (t.match(/[)\]]/g) ?? []).length;
  if (opens > closes) return 'KO_SOURCE_DAMAGED';
  /* 조사·접속으로 끝나 문장이 이어지다 끊겼다 */
  if (/(?:있고|이며|이고|하고|으로|로서|및|또는|과|와)\s*[.。]?$/.test(body) && body.length < 40) return 'KO_SOURCE_DAMAGED';
  /* 한 낱말 + 마침표로 끝나는 파편 — `이미.` */
  if (/^[가-힣]{1,4}[.。]$/.test(body)) return 'KO_SOURCE_DAMAGED';
  /* 항·조 번호에서 끊긴 참조 — `식품공전 제10.` `제 4.` */
  if (/제\s*\d+\s*[.。]$/.test(body)) return 'KO_SOURCE_DAMAGED';
  /* 수치 자리가 비었다 — `표시량(7mg/g)의 이상` */
  if (/의\s*(?:이상|이하)\s*[.。]?$/.test(body)) return 'TRANSLATION_AMBIGUOUS';
  /* 같은 한정어가 **같은 수치에** 두 번 걸려 어느 쪽이 기준인지 정해지지 않는다.
     `… 이상 (2,700억) 이상` / `… 이상의 80% 이상`.
     보관 문구의 `30℃이상, 상대습도 75%이상` 처럼 **서로 다른 값**에 붙은 것은 모호하지 않다. */
  if (/(이상|이하)\s*[(（][^)）]*[)）]\s*\1/.test(body)) return 'TRANSLATION_AMBIGUOUS';
  if (/이상의\s*[\d.]+\s*%\s*이상/.test(body)) return 'TRANSLATION_AMBIGUOUS';
  /* HTML 조각이 본문에 섞여 슬롯 경계를 믿을 수 없다 */
  if (/<[a-z/]|&lt;|&gt;/i.test(p.body)) return 'CANONICAL_STRUCTURE_UNSAFE';
  return 'PENDING_AUTHORING';
}

const byReason = new Map(), docsByReason = new Map(), samples = new Map();
const rows = [];
for (const t of targets) {
  const seen = new Set();
  for (const h of t.hits) {
    const r = translateSlot(h.inner);
    if (r.ok) continue;
    if (!HANGUL.test(h.inner)) continue;
    const why = classify(h.inner);
    byReason.set(why, (byReason.get(why) ?? 0) + 1);
    seen.add(why);
    if (why !== 'PENDING_AUTHORING') {
      rows.push({ productMasterId: t.productMasterId, reason: why, ko: norm(h.inner).slice(0, 200) });
      const a = samples.get(why) ?? []; if (a.length < 8) { a.push(norm(h.inner).slice(0, 120)); samples.set(why, a); }
    }
  }
  for (const why of seen) docsByReason.set(why, (docsByReason.get(why) ?? 0) + 1);
}

const out = {
  wo: 'WO-O4O-HFF-EN-C01-LABELLED-STANDARD-40896-FULL-TRANSLATION-REPAIR-V1',
  builtAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  slotsByReason: Object.fromEntries([...byReason.entries()].sort((a, b) => b[1] - a[1])),
  documentsByReason: Object.fromEntries([...docsByReason.entries()].sort((a, b) => b[1] - a[1])),
  finalQueueSlots: rows.length,
  finalQueueDocuments: new Set(rows.map((r) => r.productMasterId)).size,
  samples: Object.fromEntries(samples),
  rows,
};
fs.writeFileSync(`${D}/hff-en-c01-problem-queue-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ...out, rows: undefined }, null, 1));
