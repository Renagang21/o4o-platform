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

### 데이터 부재로 미검증 (Sohae 계정에 다국어 제품 콘텐츠 0건)
| 시나리오 | 상태 |
|---|---|
| 그룹 선택 → publicKey 발급 → link QR 생성 | ⚠️ 미검증 (코드 경로 = 기존 blog link 흐름과 동일, 이미 e2e 검증됨) |
| 한국어만 → 언어 선택 없이 바로 표시 | ⚠️ 미검증 (기존 공개 landing 이 처리 — 이미 구현·검증된 시스템) |
| 한국어+중국어 → 언어 선택 표시 / 없는 영어 미표시 | ⚠️ 미검증 (동일) |
| `?locale=zh` + 중국어 없음 → fallback | ⚠️ 미검증 (동일) |

> 언어 선택/없는 언어 숨김/fallback 은 본 작업에서 구현한 게 아니라 **기존 다국어 공개 landing**
> (WO-O4O-MULTILINGUAL-PRODUCT-QR-LANDING-V1)이 처리. 본 작업의 신규 코드는 "목록→발급→link 저장"
> 뿐이며, link QR e2e 는 직전 블로그 작업에서 동일 경로로 PASS 확인됨.
> 전체 e2e 재현은 다국어 제품 콘텐츠 보유 계정/시드 필요.

---

## 4. 남은 작업 / 후속
- 다국어 제품 콘텐츠를 보유한 계정(또는 시드)으로 IR §5 시나리오 1~5 전체 e2e 재검 권장.
- 향후 `?lang=` 고정 진입 링크는 IR 정책상 이번 범위 외(필요 시 별도 검토).
