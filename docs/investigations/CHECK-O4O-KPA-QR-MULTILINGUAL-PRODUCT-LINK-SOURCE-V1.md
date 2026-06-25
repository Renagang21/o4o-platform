# CHECK-O4O-KPA-QR-MULTILINGUAL-PRODUCT-LINK-SOURCE-V1

> 기준 IR: [IR-O4O-KPA-QR-MULTILINGUAL-LANGUAGE-OPTION-AUDIT-V1](./IR-O4O-KPA-QR-MULTILINGUAL-LANGUAGE-OPTION-AUDIT-V1.md) (안 1)
> 작업: QR 생성에 "다국어 제품 콘텐츠" link 소스 추가
> URL: https://kpa-society.co.kr/store/marketing/qr
> 커밋: `0906ddbf1` / 일자: 2026-06-25

---

## 1. 작업 요약

다국어 언어 선택 정책(본문 있는 언어만/단일이면 바로/없는 lang fallback/하나의 QR)은 기존
다국어 공개 landing(`MultilingualProductPublicLandingPage` + publicKey 시스템)에 이미 구현됨.
→ QR 측에 다국어 UI 를 **새로 만들지 않고**, QR 생성 시 다국어 제품 콘텐츠를 골라 그 공개 링크로
**link 형 QR** 을 연결하는 진입만 추가(안 1). **백엔드/마이그레이션 변경 없음.**

### 변경 파일
- `services/web-kpa-society/src/components/store/StoreAssetSelectorModal.tsx`
- `services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx`

### 변경 내용
1. **모달 소스 탭 추가** — opt-in `enableMlcSource` → "다국어 제품 콘텐츠" 탭.
   - 목록: `listMyMlcGroups({includeArchived:false})` 중 본문(page, non-archived) 보유 그룹만.
   - 카드: 제목 + **본문 있는 locale 배지**(한국어/中文/English…) 표시.
   - 선택 시: `ensureMlcPublicKey(groupId)`(**idempotent**, draft→published 승격) → 공개 landing
     절대 URL 반환 → `onSelect({ source:'mlc', assetType:'mlc', url, ... })`.
   - 발급 중 "선택 완료" → "링크 발급 중…" 비활성.
2. **StoreQRPage 연결** — `enableMlcSource` 전달. `source='mlc'` 는 블로그와 동일하게
   `landingType='link'`, `landingTargetId=url`, **libraryItemId 미전송**(참조형). 배지 `mlc='다국어 제품'`.
3. **하나의 QR 정책 유지** — 언어별 QR 분리 없음. 스캔 시 언어 선택은 기존 공개 landing 이 처리.

### 비범위(미변경 확인)
- kpa_contents 다국어화 / QR 랜딩 내 언어 탭 직접 구현 / DB migration / 언어별 QR / video·기존 page·link·blog·content-hub 경로.

---

## 2. 사전 코드 확인 (구현 전 게이트)

| 확인 | 결과 |
|---|---|
| `landingType='link'` 가 내부 path/URL 수용 | ✅ `QrLandingPage` line 76-79 `window.open(landingTargetId)`. publicKey URL 은 절대 URL |
| publicKey 발급 idempotent | ✅ 기존 키 있으면 재사용(`multilingual-product-content.controller.ts:464-467`) |
| 공개 landing URL origin | ✅ kpa → `https://kpa-society.co.kr/multilingual-products/:publicKey` (`buildLandingUrl:175-177`) |
| 프론트 route 존재 | ✅ `App.tsx:1067` `/multilingual-products/:publicKey` → `MultilingualProductPublicLandingPage` |
| 목록/발급 API 클라이언트 존재 | ✅ `multilingualProductContentStore.ts` (`listMyMlcGroups`, `ensureMlcPublicKey`) |

---

## 3. 검증

### 정적
| 항목 | 결과 |
|---|---|
| 타입체크 (`tsc --noEmit`, web-kpa-society) | ✅ PASS (에러 0) |
| 배포 (Deploy Web Services, `0906ddbf1`) | ✅ success |
| 사이니지 회귀 (StoreSignagePage) | ✅ 무영향 (opt-in 미전달) |

### 브라우저 smoke (배포본 `0906ddbf1`, kpa-society.co.kr, Sohae 약국 매장, 2026-06-25)
| 항목 | 결과 |
|---|---|
| QR 모달에 4번째 탭 "다국어 제품 콘텐츠" 노출 | ✅ (스크린샷 qr-mlc-tab.png) |
| 탭 클릭 → 안내문 + 검색 + 목록 조회 | ✅ |
| 목록 API(`GET /pharmacy/multilingual-product-contents`) 정상 호출 | ✅ 200 (에러 없음) |
| 데이터 없을 때 "연결할 다국어 제품 콘텐츠가 없습니다" 빈 상태 | ✅ |
| 기존 탭(내 매장 자료/운영자 콘텐츠/블로그) 회귀 없음 | ✅ |

### 전체 e2e smoke (배포본 `0906ddbf1`, Sohae 약국 매장, 2026-06-25) — 테스트 데이터 직접 시드 후 검증 ✅
> 시드: 로컬 제품 1건 + 다국어 그룹 1건(ko published default + zh published, **영어 없음**) 인증 fetch 로 생성.
> publicKey = `a21fe382efd9d5709155343f`, QR slug = `/qr/e2e`.

| # | 시나리오 | 결과 |
|---|---|---|
| 1 | QR 모달 "다국어 제품 콘텐츠" 탭 → 그룹 카드에 **한국어·中文 배지만**(영어 없음) | ✅ |
| 2 | 선택 완료 → publicKey 발급(idempotent) → 연결 URL `…/multilingual-products/a21f…` prefill | ✅ |
| 3 | QR 저장 → 목록 추가(`/qr/e2e`, 외부 링크) | ✅ |
| 4 | `/qr/e2e` 공개 → "바로가기"(link) 카드 | ✅ |
| 5 | 다국어 landing → **언어 탭 한국어/中文만, 영어 미표시**, 기본 한국어 본문 | ✅ (핵심 정책) |
| 6 | 中文 탭 클릭 → `?locale=zh` + 중국어 본문 표시 | ✅ |
| 7 | `?locale=en`(영어 본문 없음) → **fallback 안내문 + 한국어 표시, 영어 탭 미표시** | ✅ |
| 8 | 단일 언어(zh 아카이브 → ko만) → **언어 탭 없이 본문 바로 표시** | ✅ |

→ IR §5 시나리오 1~5 전부 충족. 핵심 정책("영어 본문 없음 → 영어 선택지 미표시")·"단일 언어면 바로 표시"·fallback 모두 실화면 확인.

### 회귀 확인
- 기존 page/video/link/blog/content-hub QR 경로: 본 작업 미변경(코드 정적). 모달 4탭(내 매장 자료/운영자 콘텐츠/블로그/다국어) 정상.

### 테스트 데이터 정리 결과
| 데이터 | 정리 | 비고 |
|---|---|---|
| 테스트 QR(`/qr/e2e`) | ✅ 하드 삭제 | 목록 빈 상태 복귀 |
| 로컬 제품(`c53b36a4…`) | ✅ 하드 삭제 | `DELETE /store/local-products/:id` 200 |
| 다국어 그룹(`712aed4b…`) + ko/zh 페이지 | ⚠️ **아카이브만**(하드 삭제 API 없음) | 모든 picker/summary 에서 `status<>archived`/`includeArchived:false` 로 제외 |
| publicKey(`a21fe382…`) | ⚠️ row 잔존(inert) | 공개 landing `/multilingual-products/a21f…` → **NOT_FOUND**(아카이브 그룹 공개 제외)로 비활성 확인 |

> **잔여물 영향 평가**: 아카이브된 그룹/페이지 + publicKey row 는 Sohae 매장에 남지만, 모든 목록/요약/QR 피커에서
> 숨겨지고 공개 URL 은 404 → **운영 노출/기능 영향 없음**. MLC 는 하드 삭제 API 가 없어(설계상 아카이브 모델)
> 완전 제거 불가 — DB 직접 삭제가 필요하면 별도 승인 작업.

---

## 4. 남은 작업 / 후속
- (선택) MLC 하드 삭제 API 부재 → 테스트/오작성 데이터 완전 제거가 필요하면 admin/DB 경로 별도 검토.
- 향후 `?locale=` 고정 진입 링크(언어 고정 QR)는 IR 정책상 이번 범위 외(필요 시 별도 WO).
