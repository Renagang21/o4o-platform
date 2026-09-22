/**
 * Structured File Understanding Runner — 공통 GFU(Generic File Understanding)를 HTTP 표면이 소비하는 얇은 오케스트레이션
 *
 * WO-O4O-HOSPITAL-PHARMACY-SERVICE-FOUNDATION-V1 §3 (원내 Excel = GFU 전면 전환 · D1)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 모듈이 하는 일 / 하지 않는 일
 *
 *   공통 file-understanding Core(decode → profile → inferFileStructure → normalize → confidence)를
 *   **소비만** 한다. Core 를 수정하지 않는다. AI(Gemini) 에는 profile 표본만 가고, 전체 행 정규화는
 *   Core 가 결정론적으로 한다.
 *
 *   **도메인 필드를 몰라야 한다.** product_name·ingredient 같은 어휘를 이 모듈은 갖지 않는다 —
 *   호출자(surface)가 TargetSchema 를 주입한다(병원약국은 @o4o/hospital-pharmacy-core 의 스키마를
 *   클라이언트에서 넘긴다). 결과는 generic NormalizedRecord 이고, 도메인 타입 변환은 surface adapter 몫이다.
 *
 *   **파일을 저장하지 않는다.** bytes 는 in-memory 로만 다루고, 반환값·로그에 값 원문을 남기지 않는 것은
 *   호출측 책임이다(이 모듈은 records 를 그대로 돌려줄 뿐 로깅하지 않는다).
 *
 * inferFileStructure(Gemini) 는 주입 가능 — 결정론적 테스트는 가짜 infer 를 준다.
 */

import { decodeWorkbook } from './file-understanding/decode.js';
import { profileWorkbook } from './file-understanding/profile.js';
import {
  buildFileConfidenceQuestion,
  evaluateConfidence,
  normalizeRows,
  type ConfidenceVerdict,
  type NormalizedRecord,
} from './file-understanding/normalize.js';
import type { FileStructureInference, StructureProfile, TargetSchema } from './file-understanding/contract.js';

/** 주입 가능한 구조 추론(프로덕션 = inferFileStructure → Gemini). */
export type InferStructureFn = (
  profile: StructureProfile,
  targetSchema: TargetSchema,
) => Promise<{ inference: FileStructureInference; model: string }>;

export interface StructuredFileUnderstandingDeps {
  infer: InferStructureFn;
}

export interface StructuredFileUnderstandingResult {
  /** generic 정규화 레코드(도메인 타입 아님 — surface adapter 가 변환). */
  records: NormalizedRecord[];
  /** 2계층 confidence verdict. */
  verdict: ConfidenceVerdict;
  /** verdict.ok 가 아니면 사용자에게 물을 한국어 QUESTION, ok 면 null. */
  question: string | null;
  /** 시도한 데이터 행 총수 / required 비어 버린 수. */
  totalRows: number;
  skipped: number;
  /** 구조 추론에 쓰인 모델. */
  model: string;
}

/**
 * bytes + targetSchema → { records, verdict, question }.
 *
 * 파이프라인: decode(전체) → profile(상단 표본) → infer(표본만 AI) → normalize(전체·결정론) → confidence.
 * targetSchema 는 호출자(surface)가 준다 — 이 함수는 도메인 어휘를 갖지 않는다.
 */
export async function runStructuredFileUnderstanding(
  bytes: Uint8Array,
  targetSchema: TargetSchema,
  deps: StructuredFileUnderstandingDeps,
): Promise<StructuredFileUnderstandingResult> {
  const decoded = decodeWorkbook(bytes);
  const profile = profileWorkbook(decoded);
  const { inference, model } = await deps.infer(profile, targetSchema);
  const { records, totalRows, skipped } = normalizeRows(decoded, inference, targetSchema);
  const verdict = evaluateConfidence(inference, targetSchema);
  const question = buildFileConfidenceQuestion(verdict, targetSchema);
  return { records, verdict, question, totalRows, skipped, model };
}
