# CHECK-O4O-NETURE-SUPPLIER-IMPORT-ASSISTANT-PRODUCT-TYPE-PASSTHROUGH-V1

> 등록 도우미(import-assistant) 제품 유형 = 상위 2분기(의약품/비의약품)만 + 앞 단계 유형 전달/사전선택
> WO: WO-O4O-NETURE-SUPPLIER-IMPORT-ASSISTANT-PRODUCT-TYPE-PASSTHROUGH-V1 · 검증일: 2026-06-27

## 결론: **PASS** (코드 수정 + 재배포 + 운영 브라우저 smoke 완료)

## 1. 조사 답변 (의약외품 분류 — 임의 분류 금지)
- 시스템은 5-type(non_drug/quasi_drug/otc_drug/rx_drug/unclassified)이나, 등록 진입 화면은 이미 **의약품/비의약품 2분기**.
- **의약외품(quasi_drug)은 "비의약품" 상위 흐름** — 비의약품 선택 후 등록 폼 "규제 구분"에서 확정. 공급 게이트도 `isDrug=false`(비의약품과 동일). 코드 기존 구현 기준이며 임의 분류 아님.

## 2. 변경 (web-neture, 2 파일)
- `SupplierProductCreatePage.tsx`: "⚡ 상세페이지 소스로 자동 입력" 버튼이 현재 `productType`(+regulatoryType)을 도우미로 전달.
- `SupplierProductImportPage.tsx`:
  - 유형 선택을 **상위 2분기(의약품/비의약품)만**. 비처방/처방 세부 카드·선택 가드 제거.
  - 앞 단계 전달 유형을 읽어 상위 분기 **사전선택**, 전달된 정밀 유형(otc/rx/의약외품)은 **보존**(재선택 요구 안 함).
  - 분석 차단은 **상위 유형만** 기준(세부 없이 분석 가능). 자동 기본값 미지정.
  - 세부 미지정 의약품은 `productType` 없이 `regulatoryType=DRUG`만 전달 → 정식 Wizard 가 세부 처리.

> 정정 경위: 1차 구현이 의약품→비처방/처방 계층 선택으로 남아 요구사항(상위 2개만) 위반 → 본 커밋에서 세부 UI 제거.

## 3. 정적 검증
| 항목 | 결과 |
|------|------|
| web-neture `tsc --noEmit` | ✅ EXIT 0 |

## 4. 배포
| 항목 | 결과 |
|------|------|
| Deploy run (재배포) | `28291432263` headSha `4825b4adc`, **`deploy-neture` success** |

## 5. 운영 아티팩트 검증 (neture.co.kr 번들)
청크 `SupplierProductImportPage-BEOdbiND.js`:
| 검사 | 결과 |
|------|------|
| "의약품 세부(비처방/처방)를 선택" | ✅ 0건 |
| "비처방/처방을 이어서 선택" / "비처방 의약품(OTC)" / "전문의약품(ETC)" | ✅ 0건 |
| UI 내 "비처방" / "처방의약품" 단어 | ✅ 각 0건 |
| "의약품 / 비의약품만 선택하세요" | ✅ 1 |
| "세부 분류는 분석 후 정식 등록 화면에서 확정" | ✅ 3 |
| 분석 가드 "먼저 제품 유형(의약품/비의약품)을 선택" | ✅ 1 |

## 6. 운영 브라우저 smoke (Playwright read-only, 데이터 생성 없음)
- 계정: Neture 공급자 (SSOT `docs/local/TEST-ACCOUNTS.local.md`, env 주입 — 문서 미기재).
- 경로: `https://neture.co.kr/supplier/products/import-assistant`

| 확인 | 결과 |
|------|------|
| 로그인 토큰 / 진입 URL | ✅ present / `/supplier/products/import-assistant`(redirect 없음) |
| 유형 선택지 = **비의약품·의약품 2개만** | ✅ (그 외 유형 카드 없음) |
| "의약품 세부(비처방/처방)를 선택" 노출 | ✅ 없음 |
| 의약품 클릭 → 비처방/처방 추가 UI | ✅ 미노출 |
| 의약품만 선택 + HTML 입력 → 분석하기 | ✅ 활성(disabled=false) |

> 데이터 생성/수정/삭제 없음(유형 클릭 + 분석 게이트 확인까지만). 정식 등록 제출 미실행.

## 7. 사용자 요구 수정사항 대비
1. 선택지 정확히 비의약품/의약품 2개 ✅
2. 의약품 후 비처방/처방 UI·가드 제거 ✅
3. 비처방/처방은 정식 Wizard 처리(regulatoryType=DRUG 전달) ✅
4. 전달된 세부 유형 보존, 재선택 미요구 ✅
5. 세부 미전달이라고 분석 차단 안 함 ✅
6. 임의 기본값 미지정(세부 미지정 의약품=DRUG만) ✅
- 금지 문자열 운영 번들 0건 ✅ / 운영 브라우저 확인 ✅

## 8. 메타
- 코드: 2 파일(web-neture). migration 0. 테스트 데이터 변경 없음.
- 기준 커밋 `4825b4adc`(+선행 `2f22e8a4d`) / 배포 run `28291432263` / 검증 2026-06-27.
