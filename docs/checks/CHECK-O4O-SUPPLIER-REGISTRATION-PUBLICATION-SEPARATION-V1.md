# CHECK-O4O-SUPPLIER-REGISTRATION-PUBLICATION-SEPARATION-V1

> 상태: ACTIVE · 작성일: 2026-10-16 · 최종 갱신: 2026-10-16
> 작업: [WO-O4O-SUPPLIER-REGISTRATION-PUBLICATION-SEPARATION-V1](../work-orders/WO-O4O-SUPPLIER-REGISTRATION-PUBLICATION-SEPARATION-V1.md)
> 기준: `04ff6b829cc087c676c663ef688153497895889c` · branch: `wo/supplier-registration-publication-separation`
> 범위: 개발·로컬 검증·commit·push. 사용자 지시에 따라 PR·병합·운영 적용은 제외.

## 1. 확인한 동작

| 업무 | 결과 |
|---|---|
| 신규 제품 검토 요청 | 제품 정보 → 이미지·설명의 2단계. 가격·게시 대상 필수 입력 제거. 접수 완료와 제품 등록·게시 완료를 구분 |
| 기존 표준 제품 연결 | masterId만 전송. Master 기준정보는 읽기 전용이고 중복/휴지통·규제 허가 검증 유지 |
| 제품 등록 승인 | OSA 유무와 독립. 승인 자체의 서비스 승인·listing 생성 없음. 반려 사유는 별도 저장하고 재심사 후 승인 시 해제 |
| 일반 공급 게시 | 승인·활성 제품에 양수 정수 일반가와 대상을 명시. 대상·가격을 동일 transaction으로 저장하며 타인/미승인·부적절한 규제 대상 거부 |
| 게시 중단·서비스 반려 | 해당 일반 공급만 중단. 서비스 가격·제품 등록 승인·다른 공급·이벤트 유지. 철회된 과거 요청을 승인해 복구할 수 없음 |
| 기간형 이벤트 | 일반 공급 미게시·일반가 미설정 제품도 등록 승인 후 신청 가능. 가격 양수·유효 기간 필수. 설정된 양수 일반가가 있으면 대상 서비스 가격 우선 상한 적용 |
| 만료·주문 | 이벤트 만료·취소로 일반가/등록 승인 변경 없음. 기존 주문 시 재판정 및 payment-first·재고·배송·정산 범위 유지 |
| 기존 KPA 생성 소비처 | 공급자 제안·운영자 직접 등록 모두 가격·기간 전달. 실패 시 입력 보존. 모바일 선택란/등록 버튼 넘침 수정 |

## 2. 실행 결과

Node 22.18.0 / pnpm 10.25.0을 저장소 기준으로 사용했다. frozen lockfile 설치·공통 package 빌드를 수행했으며 dependency/lockfile 변경은 없다.

| 검증 | 실행·결과 |
|---|---|
| API build | `pnpm --filter @o4o/api-server run build` PASS |
| Neture build | `pnpm --filter @o4o/web-neture run build` PASS |
| KPA build | `pnpm --filter @o4o/web-kpa-society run build` PASS |
| API 관련 회귀 | API 디렉터리에서 `pnpm exec jest --runInBand --no-coverage --testPathPattern='modules/neture/\|modules/neture-pharmacy/\|supplier-boundary'` — 65 suites, 1,195 PASS. 별도 DB 조건부 8 suites/83 tests SKIP |
| 주문·경계 회귀 | supplier-domain-boundary, neture-b2b-cart-checkout, event-offer-cart-checkout-purchasing-org 3 suites/84 PASS |
| Neture 전체 웹 | 루트에서 `pnpm exec vitest run --config services/web-neture/vitest.config.mjs` — 109 files/1,053 PASS |
| KPA 전체 웹 | 루트에서 `pnpm exec vitest run --config services/web-kpa-society/vitest.config.mjs` — 23 files/166 PASS. 마지막 폼 배치 수정 후 관련 2 tests 재검증 PASS |
| 실제 PostgreSQL | `scripts/dev/run-supplier-store-fixture.ts` 전용 격리 DB, 4/4 PASS. migration 보존·승인/반려/재심사·게시/철회·서비스 재승인·이벤트-only/만료·실제 checkout/payment/배송·정산 포함 |
| migration 계약 | `node scripts/db/check-migration-contract.mjs` — 21 PASS/0 FAIL, incremental 28개 |
| 변경 소스 ESLint | 0 errors. 기존 KPA 운영자 페이지 5 warnings, SupplierSpaceLayout 1 warning. 기준 HEAD에도 동일 6 warnings 존재 |
| 로컬 복잡도 비교 | sonarjs 3.0.5 규칙 기준 새 함수 15 이하. EventOffer createListing 50→15 이하, from-master 화면 32→15 이하, Candidate submit 26→15 이하. 변경 함수의 복잡도 증가 없음. 원격 Sonar 분석은 미실행 |
| 문서·diff | `node scripts/check-doc-sensitive.mjs` 민감정보 패턴 0건, `git diff --check` PASS |

전체 API 회귀의 DB 조건부 SKIP을 PASS로 합산하지 않았다. 이번 업무의 실제 DB 경로는 별도의 전용 fixture 4건으로 실행했다.
웹 build의 기존 큰 chunk/Browserslist 안내와 Jest의 강제 종료 안내는 남아 있다. 이번 범위의 실패는 없다.

## 3. 스키마 검증·데이터 정리

추가 컬럼은 `default_supply_enabled` boolean과 `registration_rejection_reason` nullable text다.
기존 승인·대상 미지정 제품의 기본 공급 선택과 기존 제품 반려 사유를 보존한다. 기존 가격·서비스 선택·주문은 변경하지 않는다.

별도 무작위 이름의 로컬 DB에서 baseline부터 기존 incremental prefix들을 대조하고 새 migration up/down을 검증했다.

- 최종 fingerprint: `d5f952811de72bc7a10cb6517a4f966a05cda1b9c23f351c6f6e9b7da5f1406f`, 6,654 lines.
- down 후 직전 fingerprint `e432641d0e05b803a6ac9c08822248e5f693b761f80664808c8214187a568b23`, 6,652 lines 복원 확인.
- schema 검증용 DB 삭제 완료. 업무 흐름 fixture도 소유 표식 확인 후 DB 삭제 완료(`database count 0`).
- 운영 업무 데이터 생성·운영 DB 접근·migration 적용 없음. 테스트 상품·주문·결제·배송을 남기지 않았다.

## 4. 실제 Chromium 화면 확인

1440px/390px 각각 별도 브라우저 context로 실제 페이지 컴포넌트와 CSS를 실행했다.
API는 synthetic fixture로 intercept하여 실제 업무 데이터를 쓰지 않았다. 전체 로그인·권한 경로를 실행한 운영 smoke가 아니다.

| 대상 | 확인 |
|---|---|
| Neture | 게시 저장 실패/재시도, 대상 변경 시 이전 편집기 제거, masterId-only 등록, Candidate 가격 없는 2단계, 이벤트 가격·기간, 서비스/약국 협력사업 탭 간 대상·복귀 문맥 |
| KPA | 운영자 가격·기간 필수/날짜 역전 차단/요청 payload, 공급자 조건 없는 제안 차단·실패 입력 보존·재시도 |
| 공통 | pageerror 0, 미처리 API fixture 요청 0, 페이지 가로 넘침 없음 |

실행 요약·화면은 세션의 `/tmp/supplier-publication-browser.json`, `/tmp/supplier-publication-kpa-browser.json` 및 대응 PNG로 확인했다.
검증용 임시 진입 파일은 삭제했으며 제품 bundle/commit에 포함하지 않는다. 인증·미디어·AI 패널은 Neture fixture에서 대체했고, 새 AI 기능은 구현하지 않았다.

## 5. 인계와 미실행 범위

- commit/push 결과는 WO 종료 기록에서 확인한다. 병합 전 수정에 필요하므로 자기 branch/worktree를 보존한다.
- `DEPLOYMENT = REQUIRED`, 이번 실행 상태는 `NOT_PERFORMED`다. migration 선행 후 API·Neture/KPA 웹을 함께 적용해야 한다. KPA 구형 생성 화면은 필수 가격·기간을 보내지 못하므로 혼용 기간을 최소화한다.
- 운영 migration down은 과거 암묵적 기본 공급 정책을 복원하므로 자동 rollback 대상으로 취급하지 않는다.
- 운영자 실제 계정 승인 및 운영 전체 로그인 smoke는 미실행이다. 사용자가 운영자 검증을 담당한다는 기존 지시를 유지했다.
- PR·원격 CI Gate·원격 Sonar·main 통합·운영 배포는 실행하지 않았다. 현재 CI Pipeline은 main/develop push 또는 main 대상 PR에서 실행되므로 이 작업 branch push만으로 CI PASS를 주장하지 않는다.

문서 정합: Supplier Domain·Distribution Freeze·Event Offer·Neture 약국 commerce의 현행 규칙을 수정했고 과거 WO/CHECK는 보존했다.
