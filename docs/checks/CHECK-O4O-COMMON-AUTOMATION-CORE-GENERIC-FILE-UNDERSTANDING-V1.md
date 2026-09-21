# CHECK — WO-O4O-COMMON-AUTOMATION-CORE-GENERIC-FILE-UNDERSTANDING-V1

> 대상: O4O Main 공통 자동화 Core — 범용 "파일/스프레드시트 구조 이해 → schema mapping → 결정론적 정규화" capability
> 결과: **PASS** (계약 A~H 구현 + 12 테스트 통과 + tsc 0 에러)
> 일자: 2026-09-21

---

## 1. 무엇을 만들었나 (한 줄)

임의 형식의 표 파일을 **AI(Gemini)가 구조만 해석**하고 **코드가 전체 행을 결정론적으로 정규화**하는 도메인 무관 공통 capability. 같은 형식은 structure fingerprint 로 AI 재호출 없이 재사용. hospital-drug 는 첫 적용 사례일 뿐 이번 개발 대상이 아니다.

## 2. 산출물 (신규 파일 · 전부 신규, 기존 파일 0 수정)

`apps/api-server/src/services/ai-tools/file-understanding/`
- `contract.ts` — 계약 A~D 순수 타입 + `parseInferenceJson`/`validateInference` 런타임 검증
- `decode.ts` — bytes → 시트별 문자열 행렬(magic-byte: PK→xlsx / OLE→xls / else UTF-8 CSV)
- `profile.ts` — 계약 A: 행렬 → StructureProfile(상단 표본 + 열 통계, 최소 표본만)
- `fingerprint.ts` — 계약 G: StructureProfile → FNV-1a 구조 지문(값 미포함)
- `normalize.ts` — 계약 F: 결정론적 전체 행 정규화 + 계약 E: 2계층 confidence gate
- `structure-inference.service.ts` — 계약 C: Gemini 호출(web-research 골격 복제, grounding 제거·responseMode json)
- `index.ts` — barrel

테스트: `apps/api-server/src/__tests__/file-understanding.spec.ts` (12 케이스)
문서: `docs/work-orders/WO-...-GENERIC-FILE-UNDERSTANDING-V1-DESIGN.md`(as-built 계약으로 갱신)

## 3. 정제 계약 4개 반영 확인 (사용자 지시)

1. **dataStartRow 추가** — `DataRegion.dataStartRow`(필수). 구역 제목/헤더/데이터 시작 3자 분리. normalizer 가 직접 사용(재추측 없음). ✅
2. **TargetSchema ↔ domain result type 분리** — Core 는 `LocalDrugRow` 를 import/참조하지 않음. `TargetSchema{id, fields:[{key, description, required, examples?}]}` generic descriptor 만 주입받음. 경계: Core → NormalizedRecord → surface adapter → LocalDrugRow. ✅
3. **targetField 허용 key 강제** — `validateInference` 가 schema 밖 targetField(vendor_code 등)를 제거해 `unmappedColumns` 로 강등(보고만). ✅
4. **2계층 confidence** — `evaluateConfidence` 가 region + column 신뢰도 보존, 낮은 항목만 QUESTION 대상. ✅

## 4. 검증

| 항목 | 명령 | 결과 |
|---|---|---|
| 단위 테스트 | `cd apps/api-server && npx jest file-understanding` | 12 passed / 0 failed |
| 타입체크 | `npx tsc --noEmit -p tsconfig.json` | 신규 모듈 0 에러(전체 0) |
| 실 Gemini smoke | 사용자 키로 직접 실행 | **보류(사용자 몫)** — 보안 상수: Claude 키 미수령 |

테스트 커버: decode(한글 CSV·xlsx magic-byte), profile 열통계, fingerprint(구조 동일/열수 상이), normalize(dataStartRow·sectionLabel·빈행 skip), confidence(ok/낮은 열/ missingRequired), validateInference(강등·보정·clamp), parseInferenceJson(코드펜스).

## 5. 경계 준수 (WO §18)

- hospital-drug UI/파서 **미수정**(기존 커밋 917f92371·9815ccb9b 불가침). ✅
- 병원 Excel alias 추가·병원 특화 코드 **0** — 도메인 중립 fixture 만. ✅
- 실제 병원 파일 primary fixture **미사용**. ✅
- POS/판매/콘텐츠 파일·신규 Workflow·public API·WebMCP·Astra **미접촉**. ✅
- packages 승격·신규 저장소 **안 함**(중지 조건 회피, 기존 ai-tools 폴더 내 배치). ✅

## 6. 완료 값 (WO §21)

- `GENERIC_FILE_UNDERSTANDING = DONE`
- `HOSPITAL_DRUG_SPECIFIC_CODE_ADDED = NO`

## 7. 후속(이번 범위 아님)

- 브라우저(web-neture) UI 배선 + localStorage/IndexedDB 캐시 저장 — 순수 모듈 재사용.
- HTTP 배선(ai-proxy 얇은 분기) + 실 Gemini smoke(사용자 키).
- hospital-drug surface adapter(LocalDrugRow ↔ NormalizedRecord) — 별도 적용 WO.

---
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
