/**
 * @o4o/file-understanding-core — Generic File / Spreadsheet Understanding 순수 계층
 *
 * WO-O4O-COMMON-AUTOMATION-CORE-GENERIC-FILE-UNDERSTANDING-V1 (원본 계약)
 * WO-O4O-HOSPITAL-PHARMACY-V1-FIXED-LOCAL-FILE-AND-LOGINLESS-SIMPLIFICATION (공용 패키지 추출)
 *
 * 파이프라인:
 *   decodeWorkbook(bytes)            → 시트별 문자열 행렬 (decode)
 *   profileWorkbook(decoded)         → StructureProfile (A · AI 입력 최소 표본)
 *   computeStructureFingerprint(p)   → 캐시 키 (G · 같은 형식이면 AI 재호출 없음)
 *   validateInference(raw, schema)   → FileStructureInference (B · AI 출력 계약 강제)
 *   evaluateConfidence(inf, schema)  → ConfidenceVerdict (E · 낮은 항목만 QUESTION)
 *   normalizeRows(decoded, inf, sc)  → NormalizedRecord[] (F · 결정론적 전체 행 정규화)
 *
 * DB · 네트워크 · DOM 의존 없음 — 서버(api-server)와 브라우저(web-hospital-pharmacy)가 **같은 구현**을 소비한다.
 * AI 호출(inferFileStructure · Gemini)은 여기에 없다 — 서버(api-server)만 소유한다.
 * 도메인 어휘 없음. surface 가 TargetSchema 를 주입하고 NormalizedRecord → 도메인 타입 변환은 surface adapter 몫.
 */

export * from './contract.js';
export * from './decode.js';
export * from './profile.js';
export * from './fingerprint.js';
export * from './normalize.js';
