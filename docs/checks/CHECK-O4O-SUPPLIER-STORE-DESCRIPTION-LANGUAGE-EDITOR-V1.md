# CHECK-O4O-SUPPLIER-STORE-DESCRIPTION-LANGUAGE-EDITOR-V1

> WO: `WO-O4O-SUPPLIER-STORE-DESCRIPTION-LANGUAGE-EDITOR-V1`
> 선행: `IR-O4O-STORE-DESCRIPTION-MULTILINGUAL-REGISTRATION-AUDIT-V1`(b0324b298 — 공급자 화면 ko 고정 갭)
> 성격: web-neture 공급자 매장용 설명서 편집기 언어 선택(ko/en/zh/ja). 기존 API 재사용. 백엔드·DB·스키마 0.
> Date: 2026-07-22 · commit 5d3edb9d7 · 배포 deploy-neture success

---

## 0. 결론

`SupplierStoreDescriptionEditorDrawer` 의 `LANGUAGE='ko'` 하드코딩을 제거하고 **언어 탭(ko/en/zh/ja)** 을 추가했다. `listMine(masterId)` 이 master 의 전체 언어 행을 반환하므로 **1회 조회·캐시·언어별 필터**(백엔드 API 변경 0)로 언어별 조회를 지원하고, 저장·검수요청도 `save({language})` 로 **언어별 독립** 처리한다. 언어 전환 시 **미저장 변경 보호**, 없는 언어는 **빈 편집기**(자동 복사 없음). tsc·vite build PASS, 배포 완료. **신규 백엔드·DB·migration·지원언어 변경 0.**

## 1. 언어 선택 UI

- 편집기 상단 언어 탭 `SUPPORTED_LANGS = ['ko','en','zh','ja']`(= 백엔드 `ALLOWED_LANG` 동일). 각 탭에 작성 여부 dot(canonical=emerald / needs_review·revision=amber / draft=slate). 헤더 라벨 "매장용(STORE) 설명서 · {선택 언어}" 동적.
- 안내: "언어별로 독립된 설명서입니다. 한 언어를 저장해도 다른 언어에는 영향이 없으며, 언어마다 따로 검수받습니다."

## 2. 언어별 조회·저장 방식

- 열릴 때 `listMine(masterId)` 1회 → `rows`(전체 언어) 캐시 → 기본 언어(ko) 로드. 언어 전환은 **재조회 없이 캐시에서** `normLang` 매칭 행을 편집기에 로드.
- 저장 `save({ offerId, content, language, submit })` — 선택 언어로 upsert. 백엔드 `upsertSupplierStoreDraft` 가 (master, STORE, language) 단일 작업행을 유지(선행 IR 검증). 저장 후 `rows` 캐시에서 **해당 언어 행만** 교체/추가(다른 언어 무변경).

## 3. 언어 전환 및 미저장 변경 보호

- `dirty` 플래그: RichTextEditor `onChange` 시 true, 로드·저장 시 false.
- `selectLanguage(lang)`: `dirty` 이면 `window.confirm("저장하지 않은 변경사항이 있습니다. '{언어}' 로 전환하면 현재 편집 내용이 사라집니다. 계속하시겠습니까?")` 확인 후 전환. 저장 중(saving)엔 전환 차단.

## 4. 언어별 검수 상태

- 선택 언어의 작업행 status → 상태 배지(임시저장/검수 대기/수정 요청/검수 완료/숨김) + canonical·revision 안내 배너가 **선택 언어 기준**으로 표시. 탭 dot 으로 언어별 작성·상태 요약.

## 5. 독립 저장 / 자동 복사 없음

- 없는 언어로 전환 시 편집기는 **빈 상태**로 시작(한국어 내용 자동 복사 없음). 저장은 선택 언어에만 반영. 코드상 다른 언어 행을 건드리는 경로 없음.

## 6. 검증 상태 — ⚠️ 부분(브라우저 save smoke 제약 · 정직 기록)

- **정적**: web-neture tsc `--noEmit` **0** · `vite build` **0**. 코드 리뷰상 언어별 조회·저장·미저장 보호·자동복사 없음 충족.
- **배포**: deploy-neture success(5d3edb9d7). 프로덕션 `/supplier/store-descriptions` 페이지 정상 렌더(본 변경으로 인한 크래시·콘솔 오류 0) 확인.
- **브라우저 save/재조회 smoke 미수행(제약)**: 편집기 드로어는 **공급자의 등록 상품에서만 진입**한다. 가용 공급자 테스트 계정 2개 모두 등록 상품 0(**renagang21 = 활성 공급자·상품 0**, **sohae21 = 미활성화·상품 0**)이라 드로어를 열 수 없었다. 제품/오퍼 생성은 본 WO 완료 기준 "테스트 데이터 순증 0" 에 위배되고 sohae21 은 미활성화라 상품 등록 자체 불가 → **테스트 데이터 미생성**. 따라서 ko/en 저장·재조회·운영자 검수 언어 구분의 실브라우저 검증은 보류.
- **대체 근거**: 언어별 독립 저장의 핵심은 백엔드 `upsertSupplierStoreDraft`(master, STORE, language) 계약이며 **본 WO 는 이를 그대로 재사용**(선행 IR-…-MULTILINGUAL-AUDIT b0324b298 에서 계약 확인). 프론트 신규 로직(fetch-all→언어 필터→미저장 보호→자동복사 없음)은 tsc + 코드 리뷰로 검증. **활성 공급자+등록 상품 계정 확보 시 실브라우저 smoke 로 마감 가능**(사용자 제공 또는 승인 시).

## 7. 기존 한국어 흐름 회귀 — ✅(구조)

- 기본 언어 = ko, 기존 로드/저장 경로 동일(초기 로드 시 ko 행 로드). 언어 탭 미조작 시 기존 한국어 작성 흐름과 동일하게 동작(임시저장/검수요청/재검수요청). 회귀 위험 없음(추가는 언어 탭 + 언어 파라미터화뿐).

## 8. 코드·DB·배포 결과

- 변경 파일 1: `services/web-neture/src/pages/supplier/SupplierStoreDescriptionEditorDrawer.tsx`(+101/-29).
- **백엔드·DB·스키마·지원언어 변경 0**(기존 `supplierStoreDescriptionApi.listMine/save` 재사용, `save` 는 이미 language 파라미터 지원).
- 배포: deploy-neture success. **테스트 데이터 순증 0**(제품·설명서 미생성, 로그인/조회만).

## 9. CHECK·commit·push

- 구현 커밋 `5d3edb9d7`(1 file). 본 CHECK 별도 커밋.
- **잔여/후속**: ① 실브라우저 save/재조회·운영자 검수 언어 구분 smoke — 활성 공급자+등록 상품 계정 확보 시 마감. ② (범위 밖) web-neture 사이드바 '매장용 타블렛 콘텐츠'(타블렛) 표기·기타 화면의 다국어 활용(태블렛/Screen Set/QR 이용자 언어 전환)은 후속 별도 WO.
