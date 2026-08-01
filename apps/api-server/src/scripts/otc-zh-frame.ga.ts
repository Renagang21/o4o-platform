/**
 * OTC zh — 프레임 사전 조회 (선정기·조립기 공용 SSOT)
 * 사전 자체는 `otc-zh-batch01-frame-glossary.ga.ts` 가 소유한다. 이 파일은 조회 규칙만 정의한다.
 * 언어 확장(에이전트 2): import 대상 용어집만 교체하면 같은 규칙이 그대로 적용된다.
 */
import { TAG, H2, CLASS_FORM, FOOT, TEMPLATE } from './otc-zh-batch01-frame-glossary.ga.js';

/** 분류·제형 표기: `일반의약품 · 정` 처럼 ` · ` 로 이어진 토큰을 각각 번역 */
function classForm(text: string): string | null {
  const parts = text.split(/\s*[·・]\s*/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;
  const out: string[] = [];
  for (const p of parts) { const z = CLASS_FORM[p]; if (!z) return null; out.push(z); }
  return out.join(' · ');
}

export function frameLookup(kind: string, text: string): string | null {
  if (kind === 'tag' || kind === 'th' || kind === 'strong') { const t = TAG[text]; if (t) return t; }
  if (kind === 'h2' || kind === 'h3' || kind === 'strong') { const h = H2[text]; if (h) return h; }
  if (kind === 'foot' || kind === 'para') { const f = FOOT[text]; if (f) return f; }
  for (const t of TEMPLATE) { const m = text.match(t.re); if (m) return t.zh(m); }
  if (kind === 'badge' || kind === 'meta' || kind === 'tile' || kind === 'td') { const cf = classForm(text); if (cf) return cf; }
  return null;
}
