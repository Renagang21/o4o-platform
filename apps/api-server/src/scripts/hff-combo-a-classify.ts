/**
 * WO-O4O-HFF-COMBO-UNREGISTERED-A-JOINT-SKIN-V1 — Agent A 전용 additive 기능성 귀속 엔진.
 *
 * MAIN_FNCTN 의 원료별 기능성을 **오귀속 0** 원칙으로 각 A 원료에 배분한다. 공용 parser/compose 무수정.
 *
 * 귀속 3계층(안전 우선순위):
 *   ① 단일(N==1): 원료의 canonical 기능성 중 MAIN 에 실제 선언된 것만.
 *   ② 이름-앵커 세그먼트(TIER-NAME): 각 A 원료명이 MAIN 에 등장하면, 원료명 위치~다음 원료명(또는 부원료명) 직전까지를
 *      그 원료의 세그먼트로 보고 **그 세그먼트 안에서만** 기능성을 파싱. `[라벨]`·`* 이름`·`- 이름 :`·`N) 이름 :`·
 *      `이름(...) 기능성` 등 구분자 무관(원료명 위치로 앵커). 세그먼트 밖 기능성은 절대 귀속하지 않음 → 정밀·무모호.
 *   ③ 이름-무표기 폴백(TIER-UNIQUE): 원료명이 세그먼트로 분리되지 않을 때. 관절(joint/jointOnly)은 present 중
 *      capable 원료 전체에 부여(관절 원료의 핵심·상시 기능성). 피부(skinMoist/skinUV)는 **유일 capable 원료**에만 부여.
 *      피부 기능성이 present 중 2개 이상 원료가 capable 이면 모호 → HOLD(임의 배분 금지).
 *
 * 부원료 비타민/미네랄 문구('…에 필요' 등)는 어느 FN 정규식과도 매칭되지 않아 세그먼트에 포함돼도 무해(미귀속·미렌더).
 */
import type { AIng, FnKey } from './hff-combo-a-unregistered-registry.js';
import { FN } from './hff-combo-a-unregistered-registry.js';

export interface Assigned { ing: AIng; funcs: FnKey[] }
export type AttrResult = { ok: true; assigned: Assigned[]; tier: string } | { ok: false; reason: string };

// 세그먼트 경계로 쓰는 부원료/비-기능 원료명(있으면 세그먼트 종료). A 원료명은 호출부에서 추가.
const NUTRIENT_ANCHOR = /비타민\s*[ABCDEK]|비타민\s*B\s*군|판토텐산|엽산|비오틴|나이아신|리보플라빈|티아민|아연|셀레늄|망간|구리|마그네슘|칼슘|철분?|인\b|크롬|몰리브덴|요오드|칼륨/g;

// mf 안에서 원료명(labelRe)의 첫 등장 인덱스. 못 찾으면 -1.
function firstIndex(mf: string, re: RegExp): number {
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  const m = g.exec(mf);
  return m ? m.index : -1;
}

// 모든 앵커(원료명·부원료명) 인덱스 수집 → 정렬. 각 A 원료 세그먼트 = [자기인덱스, 다음앵커인덱스).
function anchorPositions(mf: string, present: AIng[]): number[] {
  const idx = new Set<number>();
  for (const a of present) { const i = firstIndex(mf, a.labelRe); if (i >= 0) idx.add(i); }
  let m: RegExpExecArray | null; const g = new RegExp(NUTRIENT_ANCHOR.source, 'g');
  while ((m = g.exec(mf)) !== null) idx.add(m.index);
  return [...idx].sort((x, y) => x - y);
}

export function attributeFunctions(present: AIng[], mf: string): AttrResult {
  const n = present.length;
  if (n === 1) {
    const a = present[0];
    const fk = a.funcs.filter((k) => FN[k].re.test(mf));
    return fk.length ? { ok: true, assigned: [{ ing: a, funcs: fk }], tier: 'SINGLE' } : { ok: false, reason: 'NO_FUNC_MATCH' };
  }

  // ── TIER-NAME: 이름-앵커 세그먼트 ──
  const anchors = anchorPositions(mf, present);
  const nameHit = present.filter((a) => firstIndex(mf, a.labelRe) >= 0);
  if (nameHit.length === n && anchors.length) {
    const assigned: Assigned[] = [];
    let ok = true;
    for (const a of present) {
      const start = firstIndex(mf, a.labelRe);
      const next = anchors.find((p) => p > start);
      const seg = mf.slice(start, next === undefined ? mf.length : next);
      const fk = a.funcs.filter((k) => FN[k].re.test(seg));
      if (!fk.length) { ok = false; break; }
      assigned.push({ ing: a, funcs: fk });
    }
    if (ok) return { ok: true, assigned, tier: 'TIER-NAME' };
    // 이름은 있으나 세그먼트에서 기능성 미검출 → 아래 폴백으로 이관하지 않고 모호 처리.
    return { ok: false, reason: 'NAME_SEG_NO_FUNC' };
  }

  // ── TIER-UNIQUE: 이름-무표기 폴백 ──
  const jointKeys: FnKey[] = ['joint', 'jointOnly'];
  const skinKeys: FnKey[] = ['skinMoist', 'skinUV'];
  const capableOf = (k: FnKey): AIng[] => present.filter((a) => a.funcs.includes(k));
  const draft = new Map<AIng, Set<FnKey>>(present.map((a) => [a, new Set<FnKey>()]));

  // 관절: MAIN 에 등장하면 capable 전체에 부여(관절 원료 핵심·상시 기능성).
  for (const k of jointKeys) {
    if (!FN[k].re.test(mf)) continue;
    for (const a of capableOf(k)) draft.get(a)!.add(k);
  }
  // 피부: 유일 capable 원료에만. 2개 이상 capable + 등장 → 모호 HOLD.
  for (const k of skinKeys) {
    if (!FN[k].re.test(mf)) continue;
    const cap = capableOf(k);
    if (cap.length === 1) cap[0]!.funcs.includes(k) && draft.get(cap[0]!)!.add(k);
    else if (cap.length >= 2) return { ok: false, reason: `SKIN_AMBIGUOUS:${k}` };
  }
  // jointOnly 와 joint 동시 부여 방지: joint 있으면 jointOnly 제거(상위 문구).
  for (const [, set] of draft) { if (set.has('joint')) set.delete('jointOnly'); }

  const assigned: Assigned[] = present.map((a) => ({ ing: a, funcs: [...draft.get(a)!] })).filter((x) => x.funcs.length);
  if (assigned.length !== n) return { ok: false, reason: 'UNLABELED_MULTI' }; // 일부 원료 미귀속 → 모호
  return { ok: true, assigned, tier: 'TIER-UNIQUE' };
}
