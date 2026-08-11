/**
 * WO-O4O-COSMETICS-MFDS-USAGE-CAUTION-ENRICHMENT-V1 — 보완 판정 core (SSOT).
 *
 * 원칙 (WO §4 · §5 · CLAUDE.md 콘텐츠 불변 원칙)
 *   - 식약처 원문을 **축자 그대로** 옮긴다. 요약·재구성·추론하지 않는다.
 *   - 용법은 **공식 원문이 실제로 더 구체적일 때만** 기존 안내를 대체한다.
 *     보고서 정형구("본품 적당량을 취해 피부에 골고루 펴 바른다")는 매장 안내보다 덜 구체적이므로 바꾸지 않는다.
 *   - 주의사항은 **없을 때만** 넣는다.
 */

/**
 * 공식 용법이 매장 일반 안내보다 더 구체적인가.
 *
 * 판정축은 **횟수·시간·용량 같은 수치 지시의 유무**다. 실측(1,282건 중 서로 다른 문장 112개)에서
 * 상위 3개 정형구가 983건(77%)을 차지했고 전부 수치가 없다. 수치가 있는 문장은
 * `10~20분 후 지지체를 제거` · `1일 1회 … 적당량(3~5 mL)` 처럼 매장 안내가 담지 못하는 지시를 담는다.
 */
const NUMERIC_INSTRUCTION_RE = /\d/;

/** 값이 사실상 비어 있는 표기. */
export function isVoid(v) {
  if (!v) return true;
  const s = String(v).replace(/\s+/g, '');
  if (s.length < 8) return true;
  return /^(-+|없음|해당없음|해당사항없음|별도표기|제품에따름|상세참조)$/.test(s);
}

/**
 * 용법 판정.
 * @returns {{verdict: 'REPLACE'|'KEEP_GENERIC'|'KEEP_SPECIFIC'|'NO_SOURCE'|'CONFLICT', text?: string, reason: string}}
 */
export function judgeUsage({ mfdsUsage, currentUsage, currentUsageState }) {
  const u = String(mfdsUsage ?? '').replace(/\s+/g, ' ').trim();
  if (isVoid(u)) return { verdict: 'NO_SOURCE', reason: '보고 용법·용량이 비어 있거나 너무 짧다' };
  if (currentUsageState === 'productSpecific') {
    // 이미 제품 고유 안내가 있다. 같은 문장이면 손댈 것이 없고, 다르면 사람이 볼 일이다(WO §5).
    if ((currentUsage ?? '').replace(/\s+/g, ' ').trim() === u) {
      return { verdict: 'KEEP_SPECIFIC', reason: '이미 같은 공식 용법이 실려 있다' };
    }
    return { verdict: 'CONFLICT', reason: '기존 안내가 이미 제품 고유 문장이고 공식 용법과 다르다 — 자동 대체하지 않는다' };
  }
  if (currentUsageState !== 'categoryGeneric') {
    return { verdict: 'CONFLICT', reason: `사용 방법 절 상태를 판정할 수 없다(${currentUsageState})` };
  }
  if (!NUMERIC_INSTRUCTION_RE.test(u)) {
    return {
      verdict: 'KEEP_GENERIC',
      reason: '보고 용법이 수치 지시 없는 정형구라 매장 일반 안내보다 구체적이지 않다',
    };
  }
  return { verdict: 'REPLACE', text: u, reason: '보고 용법에 횟수·시간·용량 지시가 있어 더 구체적이다' };
}

/**
 * 주의사항 판정. 원문 줄 구조를 그대로 보존한다.
 * @returns {{verdict: 'ADD'|'KEEP'|'NO_SOURCE', lines?: string[], reason: string}}
 */
export function judgeCautions({ mfdsCautions, currentCautionState }) {
  const c = String(mfdsCautions ?? '').trim();
  if (isVoid(c)) return { verdict: 'NO_SOURCE', reason: '보고 사용상의주의사항이 비어 있다' };
  if (currentCautionState === 'present') return { verdict: 'KEEP', reason: '이미 주의사항이 실려 있다 — 덮어쓰지 않는다' };
  const lines = c
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!lines.length) return { verdict: 'NO_SOURCE', reason: '줄 분해 결과가 비었다' };
  return { verdict: 'ADD', lines, reason: '설명서에 주의사항이 없다 — 공식 원문을 그대로 넣는다' };
}
