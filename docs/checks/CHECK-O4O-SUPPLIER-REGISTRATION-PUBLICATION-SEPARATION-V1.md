# CHECK-O4O-SUPPLIER-REGISTRATION-PUBLICATION-SEPARATION-V1

> 상태: COMPLETED (로컬 검증·push 인계) · 작성일: 2026-10-16 · 최종 갱신: 2026-10-16
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

## 6. 통합 재개 — 2026-10-16

사용자 후속 지시로 최신 main·기존 PR·배포 상태 확인과 통합·배포·업무 흐름 검증을 재개했다.
실제 운영자 승인은 사용자 담당이다. 위 개발 종료 시점의 결과와 아래 후속 결과를 구분한다.

- 원격 인계 HEAD `a6ce6742918aa491843ef6b06fd03e61ff70d2be`를 확인했다.
- 최신 main `3613c235ec4838b854a8e07970e757a16cd1dacf`를 같은 작업 branch에 병합했다. 충돌 없이 local merge `fbca87d4eb6b551d668b05b2d74da2f8b2c833ac`를 만들었다. main 직접 변경·push는 없다.
- GitHub 공개 페이지에서 기존 [PR #652](https://github.com/Renagang21/o4o-platform/pull/652)의 Draft·Integration HOLD 기록을 확인했다. 같은 변경의 새 PR을 만들지 않는다.
- 최신 main의 [Delivery #401](https://github.com/Renagang21/o4o-platform/actions/runs/38868442627)은 공개 workflow 목록·run 화면에서 Success를 확인했다. 실제 serving SHA·서비스별 반영 상태는 인증 로그/API 및 운영 HTTP 접근이 없어 미확인이다. 이 결과에 공급자 분리 branch가 포함된 것으로 해석하지 않는다.
- 이전 CI run `38845950897`은 API Jest 1/3·3/3 및 CI Gate 실패다. 공개 화면에서는 세부 로그에 로그인을 요구하며, 현재 환경의 GitHub API 접속은 네트워크 정책으로 차단돼 있다. 로컬 검증으로 원격 CI PASS를 대체하지 않는다.

### 6-1. Codex 지적 수정

| 지적 | 후속 수정·검증 |
|---|---|
| `PRRT_kwDOOXrFm86tDmeN` — legacy PUBLIC 제품의 등록 승인 후 파생 유통 값 잔류 | 등록 승인 UPDATE에서 `deriveDistributionType(false, serviceKeys)` 값을 함께 저장한다. 기존 승인 제품의 멱등 분기는 유지한다. 빈 대상·KPA 대상 각각의 legacy PUBLIC 회귀와 실제 PostgreSQL catalog eligibility를 검증한다. |
| `PRRT_kwDOOXrFm86tDmeQ` — KPA 이벤트 기간 DTO 누락 | 공급자 POST 응답과 GET 목록 모두 `startAt`·`endAt`를 반환한다. 생성 직후·재조회·과거 기간 없는 행의 HTTP 응답 테스트를 추가했다. |

### 6-2. 후속 로컬 검증

- frozen lockfile 설치·공통 packages·API·Neture·KPA build PASS. 수정 후 API build도 재검증했다.
- 변경 소스는 루트 `eslint.config.js` 기준 focused ESLint 0 errors/0 warnings다. 레거시 `.eslintrc.cjs`는 현재 표준 검증 설정이 아니다.
- 병합본 API 관련 회귀: 68 suites/1,279 tests PASS, 별도 DB 조건부 8 suites/83 tests SKIP.
- Neture 웹 전체 111 files/1,077 tests PASS, KPA 웹 전체 23 files/166 tests PASS.
- Codex 수정 focused HTTP/write 회귀 2 suites/43 tests PASS.
- 이전 결합 구조를 기대하던 `supplier-product-registration-cutover-contract`·`supplier-existing-master-direct-offer-link-contract`의 3 FAIL을 로컬에서 재현했다. 등록의 미게시/심사 대기·Master write 금지·중복 계약을 유지하고, 약국 대상·DRUG·서비스 승인 gate가 게시 경로에 남는지 검사하도록 정렬했다. 두 파일과 service-key 잔여 계약 3 suites/53 tests PASS. 원격 실패 로그 자체는 API 정책 차단·공개 로그 로그인 요구로 열람하지 못했으므로 원격 실패 전체가 이 3건뿐이라고 단정하지 않는다.
- 수정 후 실제 PostgreSQL 전용 fixture 6/6 PASS. 기존 게시 보존·등록 승인/게시/이벤트 분리·checkout/payment/배송/정산 및 legacy PUBLIC 회귀를 포함한다. fixture DB 소유 표식 확인 후 삭제·잔존 DB 0을 확인했다. 운영 데이터는 생성하지 않았다.
- migration 계약 21 PASS/0 FAIL. 문서 민감정보 검사·diff 검사를 수행했다.
- API 전체 CI 대응 검증: 수집한 538개 파일의 실행 결과 집합이 정확히 일치하는지 대조했다. 먼저 완료한 24 suites 결과를 보존하고 나머지 514개를 3개 직렬 묶음(`--runInBand --runTestsByPath`)으로 완료했다. 최종 515 suites PASS/23 suites 전체 SKIP/미실행 파일 0. PASS 파일 안의 개별 조건부 SKIP도 PASS test로 합산하지 않는다.
- 전체 검증 중 `supplier-offer-update-private-gate`의 승인 상태 없는 과거 fixture 때문에 기존 활성화/공개 허용 기대 2 FAIL을 추가 재현했다. 신규 fixture에 PENDING 상태를 명시하고, 허용 예시는 APPROVED로 정렬했다. PENDING/REJECTED가 판매자 지정·활성화·공개로 등록 승인을 우회하지 못하는 부정 검증을 추가했으며 재실행 9/9 PASS다. 해당 파일만 재검증 결과로 교체해 최종 실패 파일 0을 확인했다. 최초 실패 및 원래 분할 실행의 non-zero 결과를 숨기지 않고 최종 결과와 구분한다.
- coverage 대조 산출물은 현재 세션의 `/tmp/supplier-api-final-coverage.json`이다. 원격 CI Gate·review thread 해결은 별개이며 아직 확정하지 않았다.

### 6-3. 운영 적용 경계·현재 차단 사항

Git 읽기와 작업 branch push에 사용하는 플랫폼 인증은 존재하며 GitHub token 재발급을 요구하지 않는다.
GitHub API 정책 차단으로 최신 checks·review thread 상태·ruleset·배포 상태를 확정할 수 없다.
환경 설정 초안에 GitHub API 및 API/Neture/KPA 공개 검증 도메인을 추가했다. 초안 저장은 runtime 적용·게시나 제품 배포를 뜻하지 않는다.

`DEPLOYMENT = REQUIRED`이며 운영 적용 완료는 미확인이다. main PR 병합·운영 migration·Promote를 실행하지 않았다.
재개 시 기존 PR의 최신 HEAD·CI Gate·Codex blocker·미해결 thread·main 위치를 확인한 뒤 진행한다.
운영 migration `SeparateSupplierRegistrationPublication1792110685889`는 두 컬럼 추가와 기존 기본 공급/반려 사유 보존을 수행하므로 해당 운영 DB 실행 승인 범위를 확인해야 한다.
API와 Neture/KPA 웹을 함께 적용하고 사용자 담당 운영자 승인을 포함한 실제 업무 검증을 별도로 완료해야 한다.
`docs/local/TEST-ACCOUNTS.local.md`는 이 클라우드에 없으며 과거/Demo 계정으로 대체하지 않는다.

문서 정합: 기존 개발 기록을 보존하고 이 절에 후속 통합·검증·차단 상태만 추가했다. 업무 정본의 추가 정책 변경은 없다.

## 7. 병합 후 독립 재검증·회귀 보강 — 2026-10-16

PR #652 는 `a53a92b04c8059a5cfa41bfc131a69890b09becd` 로 main `13f89df0e48477509cc21128ea73cb42eb364b78` 에 병합됐다(2026-10-16 11:10Z).
Codex P2 2건과 CI blocker 는 6-1·6-2 의 수정으로 해소됐고, 병합 head 의 CI Gate·API Jest 1~3/3·SonarCloud 는 SUCCESS 다.
이 절은 별도 PC에서 같은 head 를 독립 재검증하고 회귀를 한 단계 보강한 결과다. 운영 DB·운영 HTTP·배포는 사용하지 않았다.

### 7-1. 회귀 보강

- legacy PUBLIC/PENDING 등록 승인 회귀(`supplier-store-round-trip.integration.spec.ts`)에 실제 판매자 공급 catalog
  reader(`SellerService.getAvailableSupplyProducts`)를 추가로 실행한다.
  - 서비스 대상 없음 → 승인 후 `PRIVATE`, 판매자 catalog 비노출.
  - 기존 명시 서비스 대상(`kpa-society`) 보유 → 승인 후 `distribution_type=SERVICE`, 판매자 catalog 에 `PUBLIC` 으로 노출되지 않는다.
    명시 서비스 대상은 기존 게시 보존 원칙상 유지된다.
  - (Codex P2 반영, 2026-10-16) 최초 보강은 OSA 승인 행이 없는 SERVICE offer 의 판매자 catalog 노출을 기대값으로 고정했다.
    [`O4O-SUPPLIER-DOMAIN-BOUNDARY-V1`](../baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md) §4 는 공급 가능을 공급자 범위 + 서비스 운영자 OSA 승인으로 정하므로,
    현재 `SellerService.getAvailableSupplyProducts` 가 OSA 를 조회하지 않는 동작을 테스트로 고정하지 않도록 그 기대를 제거했다.
    runtime 은 이 PR 에서 바꾸지 않으며, catalog 의 OSA 미적용은 별도 WO(`WO-O4O-SELLER-CATALOG-OSA-GATE-V1`)로 다룬다.
- 음성 대조: 등록 승인 UPDATE 의 `distribution_type` 재계산을 일시 제거하면 두 케이스 모두 `distribution_type: "PUBLIC"` 잔류로 FAIL, 복원 시 PASS.
  (일시 제거는 검증 전용 사본에서만 수행하고 즉시 원복했다.)

### 7-2. 검증 결과

| 항목 | 결과 |
|---|---|
| PostgreSQL 전용 fixture (`scripts/dev/run-supplier-store-fixture.ts`, 일회용 loopback 클러스터) | baseline·전체 incremental prefix fingerprint 일치, 6/6 PASS, `Fixture cleanup PASS: database count 0` |
| 음성 대조 fixture | 2 FAIL(의도) / 4 PASS, cleanup database count 0 |
| 관련 API Jest (supplier·offer·seller·distribution·listing·registration·event-offer·neture-pharmacy 및 branch 변경 테스트 72 파일) | 64 suites/1,187 tests PASS, 8 suites/85 tests DB 조건부 SKIP, FAIL 0 |
| API `tsc --noEmit` | PASS |
| 변경 spec ESLint(루트 설정) | 0 errors/0 warnings |
| KPA synthetic browser (`/supplier/event-offers`, 1440px·390px, API 전부 intercept) | 수정 응답 형태: 제안 직후·재조회 모두 이벤트 기간 표시, 기간 없는 과거 제안은 미표시, page error 0. 수정 전 응답 형태(음성 대조): 제안 직후 기간 미표시 재현 |

- KPA POST 응답의 기간 값은 실제 `EventOfferService.createdListingResult` 가 저장값을 ISO 문자열로 반환함을 코드로 확인하고 같은 직렬화를 intercept 에 사용했다. 실제 로그인·권한 경로의 운영 smoke 는 아니다.
- 일회용 클러스터·fixture DB·dev server 는 종료 후 정리했다. 운영 데이터는 생성하지 않았다.
- 첫 관련 Jest 실행은 로컬 메모리 부족(V8 heap OOM, exit 134)으로 중단됐다. 테스트 실패가 아니며 worker 재활용 설정으로 재실행해 위 결과를 얻었다.

### 7-3. 범위 밖 발견 (수정하지 않음 · 별도 WO 제안)

`apps/api-server/src/utils/auto-listing.utils.ts` 의 `autoListPublicProductsForOrg`·`autoListServiceProductsForOrg` 는
`INSERT ... SELECT $2` 의 select list(text 추론)와 `sap.service_key = $2`(varchar 추론)에 같은 파라미터를 써서
실제 PostgreSQL 에서 항상 `inconsistent types deduced for parameter $2 (text versus character varying)` 로 실패한다.
canonical baseline fixture 와 최소 재현 SQL 모두에서 확인했다. 이 함수는 이번 branch 에서 변경되지 않은 main 기존 코드다.
신규 조직의 PUBLIC/SERVICE 자동 목록화 경로가 운영에서 실패하고 있을 가능성이 있으므로 호출 경로·운영 로그 확인과 `$2::varchar` 명시 등 수정은 별도 WO 로 다룬다.

문서 정합: 기존 기록을 보존하고 병합 후 재검증·보강·범위 밖 발견만 추가했다. 업무 정본 변경 없음.
