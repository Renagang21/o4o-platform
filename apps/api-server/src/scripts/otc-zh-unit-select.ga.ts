/**
 * OTC zh — 직접 번역 소배치 **유닛 선정** (READ-ONLY)
 *
 * 원칙: 문서는 **모든 슬롯이 번역돼야** 완성된다(부분 번역 금지). 따라서 유닛 빈도가 아니라
 *   "이 유닛들을 번역하면 **완성되는 문서 수**"가 선정 기준이다.
 *   → 미번역 유닛이 가장 적은 문서부터 채우면 유닛당 완성 문서 수가 최대가 된다.
 *
 * 슬롯 정의는 `otc-zh-slots.ga.ts`(텍스트 노드 전수) 를 단일 기준으로 쓴다.
 * 이미 확정된 대응(프레임 용어집 + 기존 unit-map)은 재사용하고 다시 번역하지 않는다.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import { slots, uid } from './otc-zh-slots.ga.js';
import { frameLookup } from './otc-zh-frame.ga.js';
import { judgeDoc } from './otc-ko-truncation-policy.ga.js';
import { assertSpec } from './otc-ko-truncation-policy.spec.ga.js';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };

async function main(): Promise<void> {
  /* 절단 판정 회귀시험을 통과하지 못하면 선정 자체를 진행하지 않는다.
     판정 규칙을 고치면서 시험을 갱신하지 않으면 여기서 멈춘다. */
  assertSpec();

  const man = JSON.parse(fs.readFileSync(P('otc-zh-batch01-manifest.ga.json'), 'utf8')).manifest as any[];
  const mapPath = P('otc-zh-unit-map.ga.json');
  const raw = fs.existsSync(mapPath) ? JSON.parse(fs.readFileSync(mapPath, 'utf8')) : { units: {}, hold: {} };
  const unitMap: Record<string, { ko: string; zh: string; kind: string }> = raw.units || {};
  const holdIds = new Set(Object.keys(raw.hold || {}));

  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5668', 10), database: 'o4o_platform', max: 4,
    statement_timeout: 900000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  await pool.query('SET default_transaction_read_only = on');
  const ids = man.map((m) => m.koId);
  const ko = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 500)
    for (const r of (await pool.query('SELECT id::text id, content FROM shared_product_descriptions WHERE id = ANY($1::uuid[])', [ids.slice(i, i + 500)])).rows) ko.set(r.id, String(r.content));
  await pool.end();

  /* 문서별 미번역 유닛 */
  const docs: Array<{ koId: string; masterId: string; product: string; held: boolean; missing: Array<{ id: string; kind: string; text: string }> }> = [];
  const need = new Map<string, { id: string; kind: string; text: string; docs: number }>();
  const truncated = new Set<string>();
  const blockReason: Record<string, number> = {};
  /** 표시용 말줄임 카드 → 같은 문서 완결본에서 번역을 파생한다(KO 무변경·카드 길이 유지). */
  const derived = new Map<string, { id: string; kind: string; fromKind: string; fromId: string; docs: number }>();
  /** 표시용 <br> 로만 갈린 한 문장 — 두 슬롯을 한 문장으로 묶어 번역한다(슬롯 수·태그 골격 불변). */
  const groups = new Map<string, { ids: string[]; joinedKo: string; docs: number }>();
  for (const m of man) {
    const html = ko.get(m.koId); if (!html) continue;
    const missing: Array<{ id: string; kind: string; text: string }> = [];
    let held = false;
    const sl = slots(html);
    const verdicts = judgeDoc(html, sl);
    for (let i = 0; i < sl.length; i++) {
      const u = sl[i], v = verdicts[i];
      if (frameLookup(u.kind, u.text)) continue;
      const id = uid(u.kind, u.text);
      if (unitMap[id]) continue;
      if (holdIds.has(id) || v.blocked) {
        held = true; truncated.add(id);
        blockReason[holdIds.has(id) ? 'LEDGER_HOLD' : v.reason] = (blockReason[holdIds.has(id) ? 'LEDGER_HOLD' : v.reason] || 0) + 1;
        continue;
      }
      if (v.reason === 'DISPLAY_SUMMARY_ELLIPSIS' && v.deriveFrom) {
        /* 카드 자체는 번역 유닛이 아니다. 완결본 유닛이 번역되면 자동으로 파생된다. */
        const fromId = uid(v.deriveFrom.kind, v.deriveFrom.text);
        const e = derived.get(id) || { id, kind: u.kind, fromKind: v.deriveFrom.kind, fromId, docs: 0 };
        e.docs++; derived.set(id, e);
        continue;
      }
      if (v.reason === 'STRUCTURAL_SPLIT' && v.groupWithNextIndex != null) {
        const nx = sl[v.groupWithNextIndex];
        const nxId = uid(nx.kind, nx.text);
        const g = groups.get(id) || { ids: [id, nxId], joinedKo: `${u.text} ${nx.text}`, docs: 0 };
        g.docs++; groups.set(id, g);
        /* 묶인 두 조각은 각각 슬롯으로 남으므로 번역 대상에는 그대로 들어간다. */
      }
      if (!missing.some((x) => x.id === id)) missing.push({ id, kind: u.kind, text: u.text });
    }
    docs.push({ koId: m.koId, masterId: m.masterId, product: m.productName, held, missing });
    if (held) continue; // HOLD 유닛을 포함한 문서는 이번 배치에서 완성 대상이 아니다
    for (const x of missing) {
      const e = need.get(x.id) || { ...x, docs: 0 }; e.docs++; need.set(x.id, e);
    }
  }
  const live = docs.filter((d) => !d.held).sort((a, b) => a.missing.length - b.missing.length);

  /* kind 지정 덤프 — 특정 레이아웃(예: 표+섹션 문단형)의 프레임 어휘를 한 번에 확보할 때 */
  const dumpKinds = (arg('--dump-kinds') || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (dumpKinds.length) {
    const picked = [...need.values()].filter((u) => dumpKinds.includes(u.kind)).sort((a, b) => b.docs - a.docs);
    fs.writeFileSync(P('otc-zh-unit-select.ga.json'),
      JSON.stringify({ batch: 'zh-batch-01', mode: 'dump-kinds', kinds: dumpKinds, units: picked }, null, 1) + '\n', 'utf8');
    console.log(JSON.stringify({ mode: 'dump-kinds', kinds: dumpKinds, units: picked.length,
      docsTouched: picked.reduce((a, u) => a + u.docs, 0) }, null, 1));
    return;
  }

  /* 소배치: 미번역 유닛이 적은 문서부터 채워 목표 유닛 수에 도달할 때까지 */
  const budget = parseInt(arg('--units') || '60', 10);
  const picked = new Map<string, { id: string; kind: string; text: string }>();
  const willComplete: any[] = [];
  for (const d of live) {
    if (d.missing.length === 0) { willComplete.push({ koId: d.koId, product: d.product, newUnits: 0 }); continue; }
    const add = d.missing.filter((x) => !picked.has(x.id));
    if (picked.size + add.length > budget) continue;
    for (const x of add) picked.set(x.id, x);
    willComplete.push({ koId: d.koId, product: d.product, newUnits: add.length });
  }
  const out = {
    batch: 'zh-batch-01', mappedUnits: Object.keys(unitMap).length, holdUnits: holdIds.size,
    docsTotal: docs.length, docsBlockedByHoldUnit: docs.filter((d) => d.held).length,
    truncatedKoUnits: truncated.size,
    blockReason,
    derivedCardUnits: derived.size,
    derivedCards: [...derived.values()].sort((a, b) => b.docs - a.docs),
    structuralGroups: [...groups.values()].sort((a, b) => b.docs - a.docs),
    docsAlreadyFull: live.filter((d) => d.missing.length === 0).length,
    missingUnitsTotal: need.size,
    missingByKind: [...need.values()].reduce((a: any, u) => { a[u.kind] = (a[u.kind] || 0) + 1; return a; }, {}),
    docMissingDistribution: {
      p10: live[Math.floor(live.length * 0.1)]?.missing.length,
      median: live[Math.floor(live.length * 0.5)]?.missing.length,
      p90: live[Math.floor(live.length * 0.9)]?.missing.length,
    },
    selection: { unitBudget: budget, unitsPicked: picked.size, docsCompleted: willComplete.length },
    units: [...picked.values()].map((u) => ({ ...u, docs: need.get(u.id)?.docs ?? 0 })).sort((a, b) => b.docs - a.docs),
    topUnresolved: [...need.values()].sort((a, b) => b.docs - a.docs).slice(0, 40).map((u) => ({ id: u.id, kind: u.kind, docs: u.docs, text: u.text.slice(0, 80) })),
  };
  fs.writeFileSync(P('otc-zh-unit-select.ga.json'), JSON.stringify(out, null, 1) + '\n', 'utf8');
  console.log(JSON.stringify({ ...out, units: out.units.length, topUnresolved: out.topUnresolved.length }, null, 1));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
