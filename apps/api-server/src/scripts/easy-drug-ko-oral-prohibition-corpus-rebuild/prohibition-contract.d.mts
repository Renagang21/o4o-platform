/**
 * `prohibition-contract.mjs` 타입 선언 — 판정기 본체는 mjs 로 두고(측정 스크립트가 node 로 직접 실행),
 * TS 계획·검증 스크립트에서도 같은 판정기를 쓰기 위한 선언만 여기에 둔다. 로직 중복 0.
 */
export const WO: string;
export const PRIOR_WO: string;
export const PRIOR_COMMIT: string;
export function md5(s: string): string;

export const ORAL_TERM_RE: RegExp;
export const PROHIBIT_RE: RegExp;
export const TAIL_WINDOW: number;
export const ROUTE_SPECIFIC_ORAL_RE: RegExp;
export const NON_ORAL_ROUTE_RE: RegExp;
export const SELF_CONTRADICTION_RE: RegExp;
export const REWRITE_ARTIFACT_RE: RegExp;
export const VERB_MASK_RE: RegExp;

export function isSafetyOralProhibition(s: string): boolean;
export function hasOralAndProhibition(s: string): boolean;
export function splitSentences(t: string): string[];
export function squash(s: string): string;
export function maskVerbs(sq: string): string;
export function htmlToText(html: string): string;
export function octFullText(oct: Record<string, unknown> | null): string;
export function oralTermsIn(s: string): string[];
export function selfContradictions(bodyHtml: string): string[];

export interface JudgeResult {
  damaged: boolean;
  detectedBy: Array<'SOURCE_DIFF' | 'SELF_CONTRADICTION'>;
  lostSentences: string[];
  benignSentences: string[];
  contradictionSentences: string[];
  nCandidate: number;
  nSafety: number;
  nSafetyLost: number;
  nSelfContradiction: number;
  nBenignRewrite: number;
  nKept: number;
  nAbsent: number;
}
export function judgeBody(officialText: string, bodyHtml: string): JudgeResult;
