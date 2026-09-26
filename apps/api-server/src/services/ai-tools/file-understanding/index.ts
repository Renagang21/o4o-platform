/**
 * Generic File / Spreadsheet Understanding — 공통 Core capability barrel
 *
 * WO-O4O-COMMON-AUTOMATION-CORE-GENERIC-FILE-UNDERSTANDING-V1
 *
 * 파이프라인:
 *   decodeWorkbook(bytes)            → 시트별 문자열 행렬 (decode)
 *   profileWorkbook(decoded)         → StructureProfile (A · AI 입력 최소 표본)
 *   computeStructureFingerprint(p)   → 캐시 키 (G · 같은 형식이면 AI 재호출 없음)
 *   inferFileStructure({profile,..}) → FileStructureInference (C · Gemini 구조 해석)
 *   evaluateConfidence(inf, schema)  → ConfidenceVerdict (E · 낮은 항목만 QUESTION)
 *   normalizeRows(decoded, inf, sc)  → NormalizedRecord[] (F · 결정론적 전체 행 정규화)
 *
 * 도메인 어휘 없음. surface(hospital-drug 등)가 TargetSchema 를 주입하고
 * NormalizedRecord → 자기 도메인 타입 변환은 surface adapter 가 담당한다.
 */

// 순수 계층(decode·profile·fingerprint·normalize·contract)은 공용 패키지가 소유한다(브라우저와 같은 구현).
export * from '@o4o/file-understanding-core';
export { inferFileStructure } from './structure-inference.service.js';
export type { InferFileStructureRequest, InferFileStructureResult } from './structure-inference.service.js';
