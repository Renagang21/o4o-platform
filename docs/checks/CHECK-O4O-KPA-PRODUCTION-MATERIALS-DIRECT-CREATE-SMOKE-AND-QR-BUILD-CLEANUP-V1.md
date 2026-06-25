# CHECK-O4O-KPA-PRODUCTION-MATERIALS-DIRECT-CREATE-SMOKE-AND-QR-BUILD-CLEANUP-V1

> WO-O4O-KPA-PRODUCTION-MATERIALS-DIRECT-CREATE-SMOKE-AND-QR-BUILD-CLEANUP-V1 실행 결과
> 실행일: 2026-06-25 · 대상: 프로덕션 `https://kpa-society.co.kr` (API `o4o-core-api`)
> 검증 방식: Playwright(chromium) 실제 브라우저 + 공개 랜딩 API 직접 호출(curl)
> 선행: WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-DIRECT-CREATE-V1 (커밋 `c9201c086`)

## 목적

매장 경영자가 **원본 콘텐츠 없이 빈 제작 자료를 직접 만들고**, 그 자료를 **그대로 QR로 연결해 공개 랜딩에서 본문이 보이는가**까지 실사용 흐름을 검증. 더불어 QR 선택 모달 잔여 빌드 에러를 정리.

## 결과 요약

| # | 단계 / 판정 기준 | 결과 | 근거 |
|---|------|:---:|------|
| 1 | `c9201c086` 배포 확인 | ✅ | 라이브 web 리비전 `kpa-society-web-01454-zvn`(09:36 KST 빌드, `aabe00e99`까지 포함). 페이지 안내 문구("처음부터 직접 작성하거나…") 라이브 반영 확인 |
| 2 | 변경 파일 타입체크 | ✅ | `web-kpa-society` `tsc --noEmit` 클린 / `api-server` `tsc --noEmit` 클린(경고만) |
| 3 | QR 선택 모달 unused import(TS6133) 정리 | ✅ | 동시 진행된 B안/SOURCE-LOAD-FIX 작업이 해당 import(`StaffBlogPost`/`getStoreSlug`/`enableBlogSource`/`PenLine`)를 실사용으로 확장 → `tsc` 재실행 시 에러 0. 별도 제거 불필요 |
| 4 | **빈 제작 자료 생성** (콘텐츠 0건에서도 가능) | ✅ PASS | "새 제작 자료 만들기" → 모달 상단 "빈 제작 자료 만들기" → 빈 편집기 진입. 콘텐츠 탭 0건 상태에서도 생성 동선 정상 |
| 5 | **저장 = 즉시 사용 가능** | ✅ PASS | 제목+QR유형+본문 입력 후 저장 → toast "제작 자료가 저장되었습니다." 상태 배지 **`완성`**(초안 아님) |
| 6 | **목록 표시** | ✅ PASS | `/store/library/production-materials` 목록에 "제작 자료 / QR 코드 / 완성 / AI 생성 / 2026.6.25" 행 표시 |
| 7 | **QR 생성 화면에서 선택 가능** | ✅ PASS | "활용하기 → QR-code 만들기" → 선택 모달 "내 매장 자료" 탭에 해당 자료 노출·선택 → QR 생성(`/qr/smoke-blank-0625`, 유형=콘텐츠) |
| 8 | **공개 QR 랜딩 본문 표시** | ✅ PASS (수정 후) | 최초 FAIL(제목만) → 백엔드 fix 배포 후 본문 inline 렌더 확인 (아래 §발견·수정) |
| 9 | 테스트 데이터 정리 | ✅ | smoke QR + 제작 자료 모두 삭제 |

## 발견 · 수정 — 공개 랜딩 본문 미렌더 (판정 8)

**현상**: 빈 제작 자료(content)로 만든 QR의 공개 랜딩(`/qr/smoke-blank-0625`)이 **제목 카드만 표시되고 본문이 렌더되지 않음**.

**원인**: 공개 랜딩(`store-qr-landing.controller.ts` `GET /qr/public/:slug`)의 `landingType='page'` 본문 렌더가 **`landing_target_id`(UUID) 기반 `kpa_contents` 조회만** 지원. 매장 제작 자료는 `store_execution_assets` 이며 QR 생성 시 `library_item_id` 만 세팅되고 `landing_target_id=null` → `pageContent=null`. JOIN 도 `file_url`/`title` 만 가져오고 `html_content` 미조회.

> 최초 API 응답: `landingType:"page", landingTargetId:null, pageContent:null`

**수정** (커밋 `a48d82153`, 백엔드 단독):
- SELECT JOIN 에 `li.html_content AS "libraryItemHtml"` 추가.
- `kpa_contents` 미매칭 + `landingType='page'` + `library_item.html_content` 보유 시, 그 htmlContent 를 `pageContent.body`(`source='store_asset'`)로 폴백 렌더.
- `html_content` 없는 file 자산은 기존 redirect 폴백 그대로 유지(회귀 없음).
- `library_item` 은 QR 과 동일 organization 소유(JOIN `library_item_id`) → 추가 경계 검사 불필요.
- 프론트 무변경 — 기존 `QrLandingPage` 의 `ContentRenderer html={pc.body}` 경로 재사용.

**수정 후 실측**:
- API: `pageContent:{available:true, body:"<p>이것은 빈 제작 자료 직접 작성 스모크 본문입니다. QR 랜딩 본문 표시 확인용.</p>", source:"store_asset"}`
- 브라우저: `/qr/smoke-blank-0625` 가 redirect 없이 제목 + 본문 inline 렌더 (스크린샷 `smoke-qr-landing-body-pass.png`).

## 판정 기준 대비

| 기준 | 결과 |
|------|:---:|
| 빈 제작 자료 생성 — 기존 콘텐츠 없어도 생성 가능 | ✅ |
| 저장 상태 — 저장 후 바로 사용 가능(`완성`) | ✅ |
| 목록 표시 — `/store/library/production-materials` | ✅ |
| QR 활용 — QR 생성 화면에서 선택 가능 | ✅ |
| 공개 랜딩 — QR 접속 시 본문 표시 | ✅ (백엔드 fix 후) |
| 빌드 — QR 잔여 unused import 제거 후 통과 | ✅ (동시 세션 확장으로 해소, tsc 클린) |

## 결론

**WO 전 판정 기준 PASS.** "빈 제작 자료 → 저장(즉시 사용 가능) → 목록 → QR 선택 → 공개 랜딩 본문" 실사용 축이 운영 가능 상태로 검증됨. smoke 중 발견된 공개 랜딩 본문 미렌더(store_execution_asset 경로)는 최소 백엔드 폴백(`a48d82153`)으로 수정·배포·재검증 완료.

### 커밋
- `c9201c086` — (선행) 빈 제작 자료 직접 생성 동선 (frontend)
- `a48d82153` — store_execution_assets QR 공개 랜딩 본문 렌더 (backend)

### 후속 후보
- GP/KCos 공통화 — KPA 안정화 후 별도 IR/WO (DIRECT-CREATE 진입점은 KPA 전용 페이지, GP/KCos 는 공통 `StoreProductionMaterialsView` 사용).
- 공개 랜딩 응답에서 `libraryItemHtml` 은 `pageContent.body` 와 중복 노출(매장 자체 공개 콘텐츠라 무해) — 정리 시 제거 가능.
