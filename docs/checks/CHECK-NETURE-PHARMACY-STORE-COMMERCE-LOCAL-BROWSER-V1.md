# CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-05 · **최종 갱신**: 2026-10-07 (§10-9 가입 구조 수정 결과)
> **근거 WO/IR**: [`WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1`](../work-orders/WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1.md) TODO 6-1 · 설계 [`DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1`](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md)

로컬 브라우저 흐름 검증 기록이다. **운영 DB · 실제 PG 는 사용하지 않았다.** 운영 배포 · 운영 실결제 검증이 아니다.

## 1. 환경

| 항목 | 값 |
|---|---|
| DB | docker `postgres:15` 일회용 컨테이너의 새 DB — baseline + incremental 15개 적용(`migrate.ts` · `POST_MIGRATION_SCHEMA_ASSERTION = PASS`) |
| API | branch HEAD 의 api-server tsup 번들(`NODE_ENV=development`) · `:3002` · `NETURE_PHARMACY_PAYMENT_MODE=test` |
| 화면 | web-store dev `:4210` · web-neture dev `:3000` (`VITE_API_BASE_URL` = 로컬 API) · Playwright |
| 계정 | 제품 API(`/auth/email/signup`)로 가입한 로컬 계정 4개(약국 A · 약국 B · Neture 운영자 · 공급자). 이메일 인증 표시 · 운영자/공급자 role · 공급자 조직 · 제품 2개(공급처 미지정 · 등록 승인)는 SQL 시드. 로그인 화면(Google 전용)은 범위 밖이라 `/auth/email/login` 토큰을 브라우저 저장소에 넣어 대체 |

## 2. 결과

| # | 흐름 | 결과 |
|---|---|---|
| 1 | 약국 A 매장 없음 → "약국 기본 가입 · 신청 상태" → 신청(약국명 · 사업자번호 · 면허번호 · 주소) → 승인 대기 표시 | PASS |
| 2 | 대기 상태 매장 API(`store/context` · `supply-options` · `cart`) | PASS — 403 `STORE_OWNER_REQUIRED` |
| 3 | 운영자 `/operator/pharmacy-memberships` 승인 → role `neture:store_owner` · 업무 영역 enrollment active · 매장 slug 생성 | PASS |
| 4 | 약국 A 내 매장 진입 — 상단 "매장 HUB" 없음 · 약국 메뉴(상품 · 주문 / 가입) | PASS |
| 5 | 세미프랜차이즈 미가입 상태 공급 상품 0건 · 매장 기본 화면 이용 | PASS |
| 6 | pharmacy 가입 신청 → 운영자 `/operator/semi-franchises` 승인 | PASS |
| 7 | 공급자 `/supplier/supply-proposals` 제안(11,000원) → 담당 운영자 승인 | PASS |
| 8 | 공급 상품에 기본 공급(12,000원)과 공급 제안(11,000원)이 같은 제품에 공존 · 가격 비교/자동 선택 없음 | PASS |
| 9 | 제안 10개 + 기본 공급 1개 담기 → 주문 확정 → 주문 1건 140,000원(무료배송) · 라인 metadata `supplyKind` = proposal · default | PASS |
| 10 | 테스트 결제("실제 결제 아님" 확인창) → 주문 paid · `o4o_payments` PAID(mode test) · 공급자 주문 1건(`neture-pharmacy`, 구매 약국명 · testPayment) | PASS |
| 11 | 공급자 목록 · 상세(구매 약국 · 배송지 스냅샷 · "테스트 결제" 배지) → 처리 시작 → 송장 → 배송 완료 → 재고 50→40 | PASS |
| 12 | 세미프랜차이즈 가입 정지 → 공급 상품 0 · 제안 담기 404 `SUPPLY_OPTION_NOT_AVAILABLE` · 매장 기본 기능 유지 | PASS |
| 13 | 기본 가입 정지 → 매장 API 403 · role 회수 · enrollment inactive · 매장 목록에서 제외 → "연결된 매장 없음" · 기본 가입 화면에 "정지" + 사유 | PASS (수정 후) |
| 14 | 미가입 약국 B — 매장 · 세미프랜차이즈 API 403 · 매장 목록 0 · 운영자 API 403 | PASS |

## 3. 발견 · 수정 (`3445aee35`)

1. 대기 · 정지 약국에 빈 매장 화면이 열림 — 매장 목록(`accessible-stores`)이 조직 owner 관계만 보고 기본 가입 상태를 보지 않았다. 기본 가입 active 가 아닌 약국 조직을 목록에서 제외(데이터는 이미 403 으로 보호).
2. 약국 홈 "상품 선택" 링크가 옛 승인 카탈로그(`/work/kpa-society/commerce/products`)를 가리킴 → 공급 상품.

## 4. 확인하지 않은 것

- 이벤트 · 모집의 화면 흐름(통합 테스트로만 검증) · 결제 전 취소 화면 · 다른 수취 주체 2개의 결제 묶음 분리 화면(통합 테스트로만 검증).
- Google 로그인 화면 · 운영 환경 · 실제 PG.
- 매장 없음 화면 안내 문구가 아직 "KPA · K-Cosmetics · PharmacyHub" 를 나열한다(K-Cosmetics 퇴역 작업과 함께 정리).

## 5. 2차 검증 (2026-10-05 — 콘텐츠 자료함 · QR · Codex 반영 후 재확인)

같은 격리 환경(로컬 API dev bundle · 격리 PostgreSQL). 운영 DB · PG 미사용. QR 4행 조회만 운영 DB read-only(`default_transaction_read_only`).

| # | 흐름 | 결과 |
|---|---|---|
| 15 | 담당 운영자 web-neture `/operator/semi-franchises/pharmacy` "콘텐츠" 탭 → 작성(제목 · 요약 · 본문) → 초안 저장 → 게시 | PASS |
| 16 | 약국 A web-store `/store/pharmacy/contents` — 가입 세미프랜차이즈의 게시 콘텐츠 표시(초안은 미표시 — 통합 테스트) | PASS |
| 17 | "내 매장 사본 만들기" → 완료 안내 → 매장 자료함 `/store/library/contents` "세미프랜차이즈" 탭에 사본 1건(원본 유형 세미프랜차이즈 · pharmacy) · 편집 가능 | PASS |
| 18 | PH 매장 QR slug 를 `/api/v1/pharmacy-hub/qr/public` · `/api/v1/kpa/qr/public` 로 열기 — product · link 결과 동일 | PASS |
| 19 | KPA 앱(새 호스트 대응) `/qr/:slug` product QR — 상품명 · 요약 · 매장 설명서 화면 내 표시 / `/tablet/:slug` 렌더 | PASS (수정 후 — 아래 6-1) |
| 20 | Codex 반영 후 주문 재확인(장바구니 코드 변경): 공급 상품 담기 → 수량 2 변경(60,000원) → 주문 확정 → 테스트 결제 → 주문 내역 결제 완료 · 공급자 주문 목록에 표시 | PASS |

정지 화면 검증(#12 · #13)은 관련 코드 변경이 없어 다시 하지 않았다.

## 6. 2차 발견 · 수정

1. 새 호스트 QR 화면에서 product QR "제품 보기" 가 매장 상품 상세(B2C 공개 노출 필요)로 가 PH 상품은 404 — 옛 PH 화면은 상품 정보를 화면 안에 표시했다. 새 호스트 QR 화면이 상품 요약 · 설명서를 화면 안에 표시하도록 수정(`f6c4e0596`). 버튼 자체의 404 는 기존 KPA 공개 노출 규칙 그대로(보고 항목).
2. Codex 리뷰 3건(`fed5afe1e`) — 통합 · 단위 테스트로 재현 후 수정. #20 으로 화면 재확인.

## 7. 2차에서 확인하지 않은 것

- 운영 환경의 새 호스트 QR(배포 전) · pharmacyhub.co.kr 도메인 리다이렉트 · QR link 4행 착지 변경(운영 write — 미실행, DESIGN §16-3 dry-run 만).
- 여러 약국을 운영하는 사용자의 매장 전환 화면(조직 단위 장바구니는 통합 테스트로 검증).

## 8. 최신 변경분 코드 리뷰 (2026-10-05)

**Codex 리뷰: 미완료.** 마지막 완료 리뷰는 `0cfd0fb` 기준(지적 3건 → `fed5afe1e` 수정). 이후 HEAD(`d6d7f121f`)에 두 번 요청했으나 두 번 모두 Codex 쪽 "unknown error" — 리뷰 결과 없음. CI 통과를 코드 리뷰 완료로 보지 않는다.

**직접 리뷰** — 범위 `0cfd0fb..427a715d3` 코드 31파일(콘텐츠 자료함 · QR · PH 은퇴 · Codex 반영):

| 확인 항목 | 결과 |
|---|---|
| 콘텐츠 운영자 API 권한 | 모든 운영자 라우트가 `requireOperatorOf`(neture:operator ∧ 담당 배정)를 거침 — 이상 없음 |
| 약국 열람 · 사본 범위 | published ∧ 세미프랜차이즈 active ∧ 조직 가입 active, 아니면 404 — 이상 없음 |
| 운영자 작성 HTML 노출 | 약국 화면 `ContentRenderer`(sanitize) 경유 — 이상 없음 |
| 사본 형식 | `content_json` 의 title · summary · body 가 기존 커뮤니티 사본 형식과 같음 — 매장 편집 · 게시 경로 호환. 같은 원본 여러 번 복사는 기존 설계(독립 사본) |
| 장바구니 조직 범위 | 조회 · 병합 · 수량 · 삭제 · 확정 · 확정 후 삭제 모두 `organization_id` — 통합 테스트로 확인 |
| **QR 서비스 축** | **결함 1건 발견 · 수정 `427a715d3`**: 최신 slug 1행만 보고 축을 바꿔, 여러 서비스에 slug 를 가진 매장은 호출 호스트 서비스 slug 가 있어도 다른 서비스 축으로 해석될 수 있었다. → 호출 서비스 slug 가 하나도 없을 때만 매장 축. 단위 테스트 추가(24/24) |
| PH 은퇴 화면 이동 | `/work/pharmacy-hub` 상품 · 장바구니 · 주문 → Neture 약국 경로, PG 복귀 유지 — 이상 없음 |
| PH 가입 410 · 자가 가입 제외 | 다른 소비처(web-pharmacy-hub 의 `/store/enrollment` 호출) 없음 |

**남은 위험 (수정하지 않음, 보고)**
1. ~~매장 자료함의 "세미프랜차이즈" 출처 **라벨**이 사본 `content_json.semiFranchiseKey` 로 판정돼 편집 후 "커뮤니티" 로 바뀜~~ → **수정(2026-10-06)**: 자료함 피드가 변하지 않는 스냅샷 기준 `sourceGroup` · `sourceName`(`source_service`/`asset_type` · 스냅샷 `content_json.semiFranchiseName`)을 응답하고 web-store 가 이를 우선 사용. 편집 override 는 출처 판정에 쓰지 않는다. 서버 저장 로직은 변경 없음(최소 수정).
2. 새 호스트 QR 화면의 "제품 보기" 버튼은 B2C 비공개 상품이면 404(기존 KPA 동작). 상품 정보는 화면 안에서 이미 제공.
3. 운영 데이터 상호작용(실제 PH 매장 · 다중 서비스 매장의 QR)은 운영 검증 전 — §16-7 검증 항목.
4. 최신 HEAD 에 대한 외부(Codex) 리뷰 부재 — **미완료로 기록**. 반복 요청으로 다른 마무리 작업을 막지 않는다(2026-10-06 결정).

`427a715d3` 는 QR 서비스 축 판정만 바꿨고 단일 서비스 PH 매장의 결과는 같아 브라우저 QR 검증(#18 · #19)은 다시 하지 않았다(단위 테스트로 두 경우 확인).

## 9. 통합 · 운영 전환 체크리스트 (2026-10-06)

**PR #308 = MAIN_INTEGRATION_COMPLETE** (merge commit `24e5dd4ba`, 2026-10-06). **운영 배포 · 운영 검증은 미완료** — API · 프런트 모두 serving 그대로(§9-2 통합 후 실측). 남은 단계(결제 workflow PR #328 통합 · variable · promote · smoke)의 실행은 각각 사용자 승인 후다. 기존 PH 서버 · 도메인 · 인증서는 운영 검증 전까지 보존한다.

### 9-1. 통합 전 (기록 — 통합 완료)

| 항목 | 상태 |
|---|---|
| 최신 HEAD 필수 검사 | PASS — `259fe7939` 기준 SonarCloud · API Jest 3/3 · Web build · Guard · CodeQL · CI Gate. 이 체크리스트 커밋 후 HEAD 재확인 필요 |
| 최신 HEAD Codex 리뷰 | **미완료**(unknown error 2회). 직접 리뷰로 대체 기록(§8). 반복 요청하지 않음 |
| main 과의 차이 | main 이 5 커밋 앞섬(문서 · debug route 제거). 충돌 없음 · migration 변경 없음 → merge 직전 브랜치 갱신 후 CI 재실행 |

### 9-2. main 통합 시 자동 실행 범위 (현재 CI/CD 기준, 2026-10-06 확인)

| 항목 | 내용 |
|---|---|
| 트리거 | push to main → `ci-pipeline.yml` → 완료 시 `delivery.yml`(workflow_run, `DELIVERY_ENFORCE=true`) → `deploy-orchestrate.mjs` 분류. 옛 `deploy-auto.yml` 은 비활성, `deploy-api.yml` · `deploy-web-services.yml` 은 push 트리거 없음 |
| 위험 분류(`deploy-risk.mjs` 로컬 실행) | **api = LEVEL_3** — db-migration · payment · rbac · access-control 경로 포함. neture · kpa-society · pharmacy-hub · store = LEVEL_2 |
| 결과 | api 는 `AUTO_DEPLOY_BLOCKED`(LEVEL_3 HOLD) → **merge 만으로 API 배포 · migration 은 실행되지 않는다**. **프런트 4개도 보류(확정)** — 아래 행 |
| 프런트 보류 근거(코드 · 테스트로 확정) | `deploy-orchestrate.mjs` `applyApiDependency`: API 가 배포 대상인데 미배포면 `deps[k].dependent === false` 가 증명된 프런트만 진행, 나머지는 `HELD_API_NOT_DEPLOYED`. `computeApiDependency` 의 독립 증명 조건 = serving→target first-parent commit 집합에서 API 변경 commit(A) 과 프런트 변경 commit(B) 이 **서로소** · 모든 commit 에 WO 키 · A·B 키 비중복 — 하나라도 못 맞추면(키 없음 · git 실패 · serving 미상 포함) 의존(fail-closed). 이 PR 의 merge commit 1개가 API 와 프런트 4개를 함께 바꾸므로 A∩B≠∅ → 4개 모두 의존 → 보류. rebase merge 로 나뉘어도 같은 WO 키라 조건 미충족. dispatch 경로(`deploy-auto`)는 종전 규칙(API 미배포 → 프런트 전부 보류) 그대로. 테스트 `deploy-orchestrate.test.mjs` U2 "API 와 같은 commit 에서 바뀐 web → 의존" 포함 57/57 PASS(로컬, 2026-10-06). **API 보류 중 프런트만 먼저 배포되는 경로 없음** |
| 부수 영향 | API promote 전까지는 이후 다른 PR 의 프런트 전용 변경도 해당 프런트 serving→target 구간에 이 merge commit 이 포함돼 같이 보류된다 — promote 를 오래 미루면 다른 트랙 프런트 배포가 묶인다 |
| 배포 경로 | 수동 `promote.yml`(대상 sha = main HEAD) — 사용자 승인 필요 |
| 배포 HOLD 상태 | `DEPLOY_FREEZE=false`(2026-10-03 설정). 이 PR 을 막는 것은 LEVEL_3 분류뿐. 다른 트랙의 HOLD 는 해제 · 변경하지 않는다 |
| **통합 후 실측 (2026-10-06)** | main `24e5dd4ba` — CI Pipeline · CodeQL success → Delivery run `37415543306` = commit status **`HELD_LEVEL_3`**, deploy job 전부 skipped · migration Job 미실행. 서비스별: api `AUTO_DEPLOY_BLOCKED`(**`BLOCKED_BY_PENDING_LEVEL3 since 46a1f8f6a`** — #323 `service-login-eligibility.policy.ts`, #308 이전부터 보류 중) · pharmacy-hub `AUTO_DEPLOY_BLOCKED`(#323 `AuthContext.tsx` LEVEL_3) · neture · kpa-society · store `HELD_API_NOT_DEPLOYED`(24e5dd4ba 에서 API 와 함께 변경) · admin · k-cosmetics · lecture · kpa-branch · hospital-pharmacy `NO_DEPLOY`(런타임 변경 없음). serving: API `e0be29869`, 프런트 `4263d5fae` — 예측(위 행)과 일치 |

### 9-3. migration 적용 순서 · 배포 순서

1. migration `1791200000000-CreateNeturePharmacyCommerce` — main 최신 `AddLocalAgentDeviceCapabilities1791177033073` 다음(manifest · expected state 반영). 새 테이블 6(`neture_pharmacy_memberships` · `semi_franchises` · `semi_franchise_memberships` · `semi_franchise_operators` · `supply_proposals` · `semi_franchise_contents`), 기존 테이블 컬럼 · 제약 변경(`store_cart_items` · `seller_recruitments` · `seller_recruitment_applications` · `idx_org_listing_unique_v2`), 기준 행 2(세미프랜차이즈 조직 · `pharmacy`, `ON CONFLICT DO NOTHING`). `NULLS NOT DISTINCT` 사용 — 운영 DB PostgreSQL 15 확인.
   - **갱신 (2026-10-06, PR #332)**: 운영 promote 의 **선행 조건 = PR #332(WO-NETURE-PHARMACY-CUTOVER-COMPAT-V1) main 통합**. #332 는 아직 운영에 적용되지 않은 이 migration 을 고쳐 `idx_org_listing_unique_v2` 를 **바꾸지 않는다**(전체 UNIQUE 유지 — 1단계). 부분 UNIQUE 교체는 별도 2단계 migration WO. 상세 · 검증: [`CHECK-NETURE-PHARMACY-CUTOVER-COMPAT-V1`](CHECK-NETURE-PHARMACY-CUTOVER-COMPAT-V1.md) §3 · §5 · §6.
2. 실행 위치: `deploy-api.yml` 의 Cloud Run Job `o4o-api-migrations` — **API 배포 직전**에 실행, 실패하면 배포 중단 · 기존 revision 유지. 수동 적용 금지(PRODUCTION-MIGRATION-STANDARD).
3. 배포 순서: API(migration → 배포 → revision traffic 100% 확인) → 프런트(store · neture · kpa-society · pharmacy-hub). 배포 완료 판정 = job success + 새 revision + traffic 100%.
4. 배포 후 읽기 확인: `typeorm_migrations` 최신 행 · 새 테이블 존재 · 기준 행 2.

### 9-4. 결제 설정

| 항목 | 내용 |
|---|---|
| 기본(미설정) | `NETURE_PHARMACY_PAYMENT_MODE` 미설정 + `NODE_ENV=production` → `disabled` · 결제 시작 503 `PAYMENT_NOT_CONFIGURED`(fail-closed) |
| live | 항상 503 `PAYMENT_PROVIDER_NOT_SELECTED` — **live 결제 차단**(PG 미선정 D1) |
| test | 값 `test` 일 때만 테스트 결제(내부 테스트 결제 — PG 키 불필요). 현재 `deploy-api.yml` 은 이 변수를 주입 · 보존하지 않고 `gcloud run deploy --set-env-vars` 는 전체 교체라 **콘솔 수동 설정은 다음 API 배포에 지워진다** → 콘솔 설정은 쓰지 않는다 |
| 운영 test 결제 방침 | workflow 에서 명시 관리. 저장소 variable `NETURE_PHARMACY_PAYMENT_MODE` 만 출처로 쓰고 Cloud Run 현재 값 carry 는 하지 않는다(콘솔 값이 남지 않게). 허용값 `test` · 미설정만 — 미설정이면 주입하지 않아 코드 기본 `disabled`(503) 유지, 그 밖의 값(`live` 포함)은 배포 step 실패. 코드의 live 503 도 그대로 |
| 상태 | **workflow 변경 = PR #328(draft, `20ede9782`)에 적용 · main 미반영**. merge · variable 설정 · 배포 모두 사용자 승인 후. 적용 순서: ① PR #328 main 반영 ② variable `NETURE_PHARMACY_PAYMENT_MODE=test` 설정 ③ API promote. ①② 없이 promote 하면 `disabled`(503)로 안전하게 배포된다(① 없이 ② 만 설정해도 주입되지 않아 disabled). 검토: API 를 배포하는 `gcloud run deploy` 는 이 step 1곳뿐 · case 분기 로컬 실행(미설정 → 플래그 0 · `test` → 1 · `live`/기타 → `gcloud` 실행 전 exit 1) · deploy workflow 테스트 105/105 |

`deploy-api.yml` 변경안 (Deploy to Cloud Run step — `optional-env` 목록 바로 뒤):

```diff
     - name: Deploy to Cloud Run
       if: inputs.migrate_only != 'true'
+      env:
+        NETURE_PHARMACY_PAYMENT_MODE: ${{ vars.NETURE_PHARMACY_PAYMENT_MODE }}
       run: |
         ...
         if [ -s "$RUNNER_TEMP/optional-env" ]; then mapfile -d '' OPTIONAL_ENV < "$RUNNER_TEMP/optional-env"; fi
+
+        # Neture 약국 결제 모드 — 저장소 variable 로만 관리(carry 없음). 'test' 또는 미설정만 허용.
+        #   미설정 → 주입 안 함 → 코드 기본 disabled(503) · 'live' 등 그 밖의 값 → 배포 중단(코드도 live=503).
+        PAYMENT_ENV=()
+        case "${NETURE_PHARMACY_PAYMENT_MODE}" in
+          "") ;;
+          test) PAYMENT_ENV=(--set-env-vars=NETURE_PHARMACY_PAYMENT_MODE=test) ;;
+          *) echo "::error::NETURE_PHARMACY_PAYMENT_MODE 는 'test' 또는 미설정만 허용"; exit 1 ;;
+        esac
         ...
           "${OPTIONAL_ENV[@]}" \
+          "${PAYMENT_ENV[@]}" \
           "${ROLLOUT_ARGS[@]}" \
```

### 9-5. 운영 smoke (배포 후, 실브라우저)

#308 과 #323(서비스 로그인 membership gate, `46a1f8f6a`)은 **같은 promote 로 함께 배포된다**(§9-7). 아래 1~8 에 더해 결합 항목 9~13 을 같은 회차에서 확인한다.

> **갱신 (2026-10-06, PR #332)**: #332 가 선행 통합되면 11 · 12 의 기대값이 바뀐다 — pharmacy 호스트 이용 자격 = **Neture 기본 가입 active ∧ pharmacy 세미프랜차이즈 가입 active**(직접 로그인 · handoff · 화면 게이트 동일 판정). 11 은 403 대신 상태별 안내 + `store.neture.co.kr` 신청 링크, 12 는 세미프랜차이즈까지 승인된 계정이면 **통과**(기본 가입만 승인된 계정은 세미프랜차이즈 신청 안내). 운영 검증 흐름은 [`CHECK-NETURE-PHARMACY-CUTOVER-COMPAT-V1`](CHECK-NETURE-PHARMACY-CUTOVER-COMPAT-V1.md) §5-4 를 따른다. 이 자격만 가진 약국은 KPA membership 을 요구하는 backend 경로(Forum 등)를 쓸 수 없다 — 범위는 같은 CHECK §7.

| # | 항목 | 확인 |
|---|---|---|
| 1 | 가입 | 약국 기본 가입 신청 · 미가입 상태에서도 내 매장 진입 |
| 2 | 승인 | Neture 운영자 승인 → role · 매장 연결, 반려 · 재신청 |
| 3 | 내 매장 | 약국 매장 화면 · 세미프랜차이즈 가입 · 콘텐츠 자료함 열람 · 사본 |
| 4 | 주문 | 공급 상품 → 장바구니 → 주문(결제 설정에 따라 test 결제 또는 503 확인) |
| 5 | 공급자 처리 | 공급자 주문 목록 · 수락 · 발송, PH opt-in 신규 시작 410 · 단독 키 중지 409 안내 |
| 6 | 사본 출처 | 세미프랜차이즈 사본을 편집 · 저장한 뒤에도 자료함 **출처 탭(세미프랜차이즈)과 라벨 · 이름이 유지** |
| 7 | QR 네 경로 실제 실행 | 새 호스트에서 `/qr/:slug`(product · screen_set · link) · `/tablet/:slug?tabletId=` · `/multilingual-products/:publicKey?locale=` · `/foreign-visitor/affiliate/:shortCode` 각 1건 — 매장 · 상품 문맥 · 쿼리 유지, 제휴 화면에 은퇴 경로 링크 없음 |
| 8 | 리다이렉트(웹 서비스 정비 트랙) | DESIGN §16-7 1단계 302 적용 후 같은 4경로를 옛 호스트로 스캔 → 새 호스트 착지 · 스캔 기록 증가. 301 은 그 뒤 |
| 9 | 결합: 신규 가입 전체 흐름 | 새 Google 계정으로 `store.neture.co.kr` 로그인 → 미가입 안내 → `/start-pharmacy` 기본 가입 신청 → Neture 운영자 `/operator/pharmacy-memberships` 승인 → 재로그인 · 새로고침 후 **내 매장 접근**. 단계별 HTTP 상태 · 화면 기록 |
| 10 | 결합: gate 가 신청을 막지 않음 | 9 의 로그인 · `GET`/`POST /api/v1/neture/pharmacy/membership` 이 **`SERVICE_NOT_MEMBER`(403) 없이** 통과. 근거: gate 는 요청 origin 호스트가 catalog 의 `loginMembershipRequired` 서비스(kpa-society · k-cosmetics)일 때만 적용되고 `store.neture.co.kr` · `neture.co.kr` 은 대상 아님(코드 확인 — 운영 실측으로 확정) |
| 11 | 결합: 약국 서비스 호스트 미가입 로그인 | 미가입 계정으로 `pharmacy.neture.co.kr` 로그인 → 403 `SERVICE_NOT_MEMBER` 안내 표시. **현재 안내 문구에 가입 경로(`store.neture.co.kr/start-pharmacy`) 링크가 없다**(`web-kpa-society` `LoginModal`) — 기록만, 수정은 별도 WO |
| 12 | 결합: 승인된 Neture 약국 계정의 KPA 호스트 로그인 | 9 에서 승인된 계정으로 `pharmacy.neture.co.kr` 로그인 → **403 예상**(승인 provisioner 는 `neture:store_owner` + `service_memberships('neture')` 만 만들고 kpa-society 멤버십은 만들지 않는다). 내 매장 · 상품 설명서 안내(DESIGN §16)에 KPA 호스트로 보내는 링크가 있는지 함께 확인 — 있으면 위험으로 기록 |
| 13 | 결합: 회귀 | 기존 kpa-society · k-cosmetics 회원 로그인 정상 · super_admin 통과 · Google 신규 가입 · cross-service handoff 정상 · `pharmacyhub.co.kr` 로그인(#323 `AuthContext` 변경) 정상 |

### 9-6. 통합과 분리 (이번 통합에 포함하지 않음)

- 테스트 데이터 초기화(DESIGN §12, 비활성 E2E QR 4행 포함) — 별도 승인 · dry-run.
- PH opt-in 데이터 정리(`pharmacy-hub` 키 · `offer_service_prices`) — PH 주문 종료 후 별도 승인, 키 단순 제거 금지(DESIGN §16-5).
- 운영 DB 변경은 실행하지 않았다.
- 미가입 403 안내에 가입 경로 링크 추가 · 승인 계정의 KPA 호스트 접근 정책(§9-5 11 · 12) — 운영 smoke 결과를 보고 별도 WO.
  - **갱신 (2026-10-06)**: 이 항목은 PR #332(WO-NETURE-PHARMACY-CUTOVER-COMPAT-V1)가 처리한다 — 별도 WO 불필요.

### 9-7. promote 범위 · 순서 · 실패 대응 (2026-10-06 확정 — 실행은 사용자 승인 후)

**#308 과 #323 은 함께 배포된다.** API 는 #323(`46a1f8f6a`)부터 LEVEL_3 보류 중이라 다음 API promote 가 두 변경을 한 번에 싣는다. `promote.yml` 은 main HEAD 만 받으므로 한쪽만 배포하는 경로는 없다.

미배포 범위(main first-parent, 2026-10-06 기준 HEAD `1fc49cbc5`):

| commit | PR | 런타임 영향 |
|---|---|---|
| `e0be29869` | #322 | API — 프런트 serving `4263d5fae` 기준으로만 미배포 구간(API 는 이미 serving) |
| `0ce5db6c6` | #321 | 문서 |
| `46a1f8f6a` | #323 | API 로그인 membership gate · web-pharmacy-hub `AuthContext` |
| `24e5dd4ba` | #308 | API · web-store · web-neture · web-pharmacy-hub · web-kpa-society · migration 1건 |
| `666c6dc2f` · `05d547ac4` · `1fc49cbc5` | #326 · #327 · #329 | 문서 · 에이전트 규칙(런타임 없음) |
| (예정) PR #328 | — | `deploy-api.yml` 결제 모드 주입 — merge 되면 promote 대상 SHA 에 포함 |
| (선행 필수) PR #332 | — | migration `1791200000000` 의 인덱스 교체 제거(1단계) · pharmacy 호스트 세미프랜차이즈 이용 자격(API 로그인 · handoff · web-kpa-society · web-neture · auth-react). **#332 통합 전에는 promote 하지 않는다** |
| (선행 필수) PR #336 | — | #332 위에 쌓음 — 매장계약 승낙 deadlock 해소 · Neture 약국 내 매장 사이니지 · 옛 HUB 주문 진입 → store 호스트 새 commerce 안내 · 포럼 쓰기 안내. **#336 통합 전에도 promote 하지 않는다** — [`CHECK-NETURE-PHARMACY-PREDEPLOY-ACCESS-ALIGNMENT-V1`](CHECK-NETURE-PHARMACY-PREDEPLOY-ACCESS-ALIGNMENT-V1.md) §7 |

- migration: **`1791200000000-CreateNeturePharmacyCommerce` 1건뿐**(`e0be29869..main` 에서 추가 · 변경된 migration 은 이것 하나).
- promote 입력: `sha` = 실행 시점 main HEAD(40자, 다르면 거부) · `services` 비움(전체) · 먼저 `dry_run=true` 로 대상 확인 → 승인 후 `dry_run=false`.
- 예상 대상: api · store · neture · kpa-society · pharmacy-hub. admin · k-cosmetics · lecture · kpa-branch · hospital-pharmacy 는 런타임 변경 없음(NO_DEPLOY).

순서:

0. (선행 필수) PR #332 → PR #336 main 통합 — 인덱스 1단계 · pharmacy 호스트 이용 자격 · 계약 승낙 · 사이니지 · 옛 commerce 진입 정리. 상세 순서는 [`CHECK-NETURE-PHARMACY-CUTOVER-COMPAT-V1`](CHECK-NETURE-PHARMACY-CUTOVER-COMPAT-V1.md) §5 · [`CHECK-NETURE-PHARMACY-PREDEPLOY-ACCESS-ALIGNMENT-V1`](CHECK-NETURE-PHARMACY-PREDEPLOY-ACCESS-ALIGNMENT-V1.md) §7.
1. (선행) PR #328 merge → variable `NETURE_PHARMACY_PAYMENT_MODE=test` 설정(테스트 결제를 열 경우만).
2. Cloud Run Job `o4o-api-migrations` — `1791200000000` 적용.
3. API verified rollout → 새 revision · traffic 100% 확인 → 읽기 확인(§9-3 4) · 새 revision env 의 `NETURE_PHARMACY_PAYMENT_MODE` 값 확인.
4. 프런트 store · neture · kpa-society · pharmacy-hub(API 성공 후에만 진행).
5. §9-5 smoke 1~13.

실패 시 대응(임의 롤백 · 재배포 · 수동 migration 금지 — 상황 보고 후 승인):

| 지점 | 자동 동작 | 남는 상태 · 할 일 |
|---|---|---|
| migration Job 실패 | 배포 중단 · 기존 API revision 유지 | `transaction: 'each'` — 이 migration 은 통째로 롤백되어 스키마 불변. 로그 확인 후 수정 PR |
| API rollout 실패 | 이전 revision 으로 자동 롤백 | **migration 은 적용된 채 옛 API 가 돈다** — 아래 주의 |
| 프런트 실패 | 해당 서비스 rollback · 나머지 영향 없음 | 새 API + 옛 프런트 조합. 새 API 는 기존 화면 경로를 바꾸지 않아 호환, 재 promote 로 해소 |
| smoke 실패 | 없음 | 결제 문제면 variable 해제 후 재배포로 disabled 복귀 가능(승인 필요). 그 밖은 수정 PR |

**주의 — 옛 API × 새 스키마**: migration 은 `idx_org_listing_unique_v2` 를 부분 인덱스(`WHERE service_key <> 'neture-event-offer'`)로 다시 만든다. 옛 API(`e0be29869`)의 `ON CONFLICT (organization_id, service_key, offer_id)` 구문(`auto-listing.utils` · `product-approval-v2.service` · `event-offer.service` · `seller-recruitment.service` · `store-product-library.controller` · `PharmacyHubHandledProductController`)은 `WHERE` 가 없어 **부분 인덱스를 추론하지 못하고 오류**가 난다(새 API 는 같은 `WHERE` 를 붙였다). 따라서 ① migration 완료 ~ 새 revision traffic 100% 사이의 짧은 구간, ② API rollout 실패로 옛 revision 에 머무는 동안 매장 상품 진열 자동 생성 · 상품 승인 · 이벤트 오퍼 담기 등이 실패할 수 있다. ② 는 오래 두지 않는다 — 원인 수정 후 재 promote, 또는 migration down(인덱스 · 제약 원복 포함)을 승인받아 되돌린다. `seller_recruitments` unique 교체는 옛 코드가 이름 · `ON CONFLICT` 로 참조하지 않아 영향 없음.

> **갱신 (2026-10-06, PR #332)**: 위 주의는 #332 통합 **전** migration 기준이다. #332 통합 후 이 migration 은 `idx_org_listing_unique_v2` 를 바꾸지 않으므로, 운영 API `e0be29869`(rev `o4o-core-api-03834-fuh`)의 위 `ON CONFLICT` 9개 지점은 migration 적용 후에도 그대로 동작한다(쿼리 형태 단위 재현 검증 — [`CHECK-NETURE-PHARMACY-CUTOVER-COMPAT-V1`](CHECK-NETURE-PHARMACY-CUTOVER-COMPAT-V1.md) §6). 위 ① · ② 구간의 진열 · 승인 · 이벤트 담기 실패 위험은 1단계에서는 없어지고, **2단계 migration(부분 UNIQUE) 배포 시점으로 이동**한다.


## 10. 운영 업무 흐름 검증 중단 · 가입 구조 조사 (2026-10-07)

§9-5 운영 smoke 를 시작했다가 **구조 결함 발견으로 중단**했다. 이어서 사용자 지시로 화면 이동 · 권한 변경 구현을 **보류**하고, 현재 구현이 가입 구조를 잘못 해석했는지 읽기 전용으로 조사했다. 기준 = `origin/main` `a07861f57` 코드 + 운영 상태 조회(건수 · 상태만). **수정 · 배포 · 운영 데이터 변경 없음.**

### 10-1. 검증 준비 상태 (중단 시점)

| 항목 | 상태 |
|---|---|
| 운영 배포 | Promote `0e283ba10` 적용(§9-7 · WO 6-5) |
| 테스트 결제 | 활성(`NETURE_PHARMACY_PAYMENT_MODE=test`) |
| Google 약국 신청자 후보 | 1개(가입 · 신청 이력 없음) |
| Google 공급자 계정 | **없음** — 4단계(공급자) 이후 진행 불가 |
| `pharmacy` 담당 운영자 | **0명** — 지정하지 않았다(아래 10-2 결함으로 중단) |
| 게시된 매장 계약 | 없음 |
| 로컬 테스트 계정 문서 | 9/23 계정 정리 이전 상태 — 갱신 필요 |

§9-5 1~13 은 전부 **미검증**이다. 재개 시 1단계부터 다시 한다. DB 로 회원 자격 · 승인을 만들어 우회하지 않는다.

### 10-2. 결함 #1 — 세미프랜차이즈 운영 화면 배치 (FAIL)

- 재현: 운영자 로그인 → `https://neture.co.kr/admin/semi-franchises` · `/operator/semi-franchises` · `/operator/pharmacy-memberships`.
- 세미프랜차이즈 생성 · 담당 운영자 지정 · 가입 승인 · 콘텐츠 작성이 `neture.co.kr`(web-neture) 하위 경로에 모여 있고, 세미프랜차이즈 호스트 `pharmacy.neture.co.kr` 에는 운영 화면이 없다.
- 사용자 확정 방향(2026-10-07): 세미프랜차이즈 = 서브도메인 하나, **서브도메인마다 자기 운영자 · 자기 가입 화면**, 세미프랜차이즈 생성은 개발로 하고 admin 은 담당 운영자 지정만.
- 화면 이동은 아래 10-3 조사 결과를 본 뒤 결정한다(보류).

### 10-3. 가입 구조 조사

**판정 기준**: `neture.co.kr` 가입 승인은 메인 AI 자동화 이용 + 연결 서비스 **신청 자격**만 준다. 연결 서비스(내 매장 · 세미프랜차이즈 · 공급자)는 각각 따로 신청 · 승인한다. Neture 승인만으로 연결 서비스 권한을 주지 않는다.

**출처 구분**: "commerce" = 이번 Neture 약국 commerce 구현(`91155708c` · `ebbe5e910` · `3445aee35` · #323 · #332 · #336, 2026-10-05~06). "기존" = 그 이전 구현.

#### Q1. Neture 가입 원장 · 상태 · AI 자동화 판정

| 항목 | 판정 | 근거 | 출처 |
|---|---|---|---|
| 가입 원장 | 기준과 일치 | `service_memberships(service_key='neture')` pending/active/rejected/suspended/withdrawn. 신청 `POST /api/v1/auth/services/:serviceKey/join`(`HandoffController.joinService`) → role 없이 pending. 승인 `POST /api/v1/neture/operator/registrations/:userId/approve`(`OperatorRegistrationService.approveRegistration`) | 기존 |
| 회원가입 자체 | 기준과 일치 | `POST /auth/email/signup` · `/auth/google/signup` 은 role · membership · 조직을 만들지 않는다. 유형(매장 · 공급자) 입력 없음 | 기존 |
| AI 자동화 접근 | **기준과 불일치** | `/api/ai/*`(home-chat · work-agent/run 등) · `/api/local-agent/pairing-grants` 는 `requireAuth` 만 본다. `requireAuth` 는 `users.status` 만 판정(`resolveAccountAccess`)하고 가입 시 `users.status=active` 로 만든다 → **Neture 승인 없이 가입만 하면 AI 기능 사용 가능** | 기존(2026-09) |

#### Q2. 승인 시 생성 · 변경되는 것

| 승인 | 생성 · 변경 | 판정 | 출처 |
|---|---|---|---|
| Neture 가입 승인 | membership active · `users.status=active` · `sm.role`(없으면 `member`) role 1개 | 일치 | 기존 |
| 〃 (`sm.role='supplier'` 인 경우) | `neture_suppliers` **ACTIVE** · 공급자 조직 · owner 멤버 생성, 기존 PENDING 공급자도 ACTIVE 로 | **불일치** — Neture 승인이 공급자 승인을 겸함 | 기존(2026-03~05) |
| "Neture 약국 기본 가입" 신청 | 약국 조직 · owner 멤버 · `neture_pharmacy_memberships` pending | — | commerce |
| 〃 승인(`decide` → `createPharmacyStoreProvisioner`) | **`service_memberships('neture')` 가 없으면 active 로 생성**(`ensureServiceMembershipsForRoles`) · `neture:store_owner` role · `organization_service_enrollments('kpa-society')` active · 매장 slug | **불일치** — 매장 승인이 Neture 가입 승인을 겸함(역방향) | commerce |
| 공급자 승인(`approveSupplier`) | `service_memberships('neture')` 가 active 가 아니면 **active 로 변경**(pending · rejected · suspended 포함) · `supplier` role | **불일치** — 공급자 승인이 Neture 승인을 겸하고, Neture 정지 · 반려도 되돌림 | 기존(2026-03) |
| 세미프랜차이즈 가입 승인 | `semi_franchise_memberships` active 만 | 일치 | commerce |

#### Q3. 신청 · 승인의 독립성

| 서비스 | 판정 | 근거 | 출처 |
|---|---|---|---|
| 내 매장(약국) | **불일치** | 신청 `POST /neture/pharmacy/membership` 이 `requireAuth` 만 — Neture 승인 여부를 보지 않는다(신청 자격 기준 미적용). 승인은 별도 actor(`neture:operator`)이나 위 Q2 역방향 결합 | commerce |
| 세미프랜차이즈(pharmacy) | 일치(단, Neture 승인 미확인) | 신청은 기본 가입 active 필요(`createRequireStoreOwner(kpa)`), 승인은 지정 운영자(`semi_franchise_operators`) + 승인 시 기본 가입 재확인. 자동 생성 경로 없음 | commerce |
| 공급자 | 부분 불일치 | 신청 `POST /neture/supplier/register` · 승인 `supplier:operator` 는 독립. 그러나 Q2 두 결합(Neture 승인 → 공급자 ACTIVE, 공급자 승인 → Neture active) · Neture 재활성화 시 INACTIVE 공급자 복구 | 기존 |
| 내 매장(화장품) | 불일치(범위 밖) | `POST /store/enrollment`(cosmetics)가 승인 없이 즉시 `cosmetics:store_owner` | 기존 |

**명칭 혼동**: "Neture 약국 기본 가입"은 이름 · role(`neture:store_owner`)은 Neture 메인 가입처럼 보이지만, 실제 동작은 **내 매장(약국) 신청 · 승인 원장**이다(조직 생성 · 매장 게이트 · kpa-society 업무 영역 enrollment · 신청 화면이 store 호스트). 정본 [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) "약국 매장 기본 게이트 = Neture 기본 가입 원장" · DESIGN §3-1 도 같은 이름을 쓴다.

#### Q4. 직접 로그인 · 서비스 간 이동 · 화면 가드 · API 의 일관성

| 서비스 | 판정 | 근거 | 출처 |
|---|---|---|---|
| store.neture.co.kr | 일치 | catalog 밖이라 로그인 gate 없음. handoff · `StoreGate` · API 모두 `resolveAccessibleStores`/기본 가입 원장 active 로 같은 판정 | commerce |
| pharmacy.neture.co.kr 로그인 vs handoff | 경미한 차이 | 직접 로그인(`isServiceLoginAllowed`)은 kpa-society membership **상태 불문** 허용, handoff 는 active 요구. `MembershipGate` 가 상태 안내로 보완 | commerce(#323 · #332) |
| pharmacy.neture.co.kr 화면 vs API | **확인 불가(경계 정의 필요)** | 화면(`MembershipGate`)은 기본 가입 ∧ 세미프랜차이즈 active 를 요구하나, 같은 화면이 부르는 매장 API(`kpa.routes` store-hub · pharmacy/store · store-contents 등, `createRequireStoreOwner(kpa)`)는 기본 가입 원장만 본다. 이 API 들이 "내 매장 기능"(기본 가입으로 충분)인지 "세미프랜차이즈 업무"인지 경계가 정해져 있지 않다. 세미프랜차이즈 commerce 데이터(공급 · 콘텐츠 · 모집)는 SQL 에서 `semi_franchise_memberships.status='active'` 로 거른다(일치) | commerce |
| store 호스트 `/work/kpa-society` · `/hub` | 확인 불가(같은 경계) | 기본 가입 승인이 kpa-society enrollment 를 켜서 열린다. 세미프랜차이즈 확인 없음 | commerce |
| 공급자 | 일치 | `SupplierRoute` + `ServiceUsageGate` ↔ `createRequireActiveSupplier` 모두 ACTIVE. `createRequireLinkedSupplier`(상태 불문) 사용 route 는 미열거 | 기존 |

#### Q5. 미승인 사용자: 신청 화면 열림 · 업무 차단

| 서비스 | 판정 | 근거 |
|---|---|---|
| 내 매장 | 일치 | `/start-pharmacy` 는 `StoreGate` 밖 · API `requireAuth`. `/store/*` 는 화면 · API 모두 기본 가입 active |
| 세미프랜차이즈 | 화면 일치 · API 는 Q4 경계 미정 | 신청 화면 · API 는 기본 가입 active 만 요구. 단 신청 화면이 pharmacy 호스트가 아니라 store 호스트에 있다(10-2 · 서브도메인별 가입 화면 방향과 불일치) |
| 공급자 | 일치 | `/supplier` 공개 · `ServiceApplyPanel` 상태 안내, 업무 route 는 화면 · API 모두 ACTIVE |
| Neture 메인 AI | **불일치** | Q1 — 승인 대기 상태에서도 AI 기능이 열려 있다 |

### 10-4. 결론 — 개발 오류 vs 명칭 · 배치 혼동

**실제 개발 오류(기준과 불일치)**

| # | 내용 | 출처 | 최소 수정 범위 |
|---|---|---|---|
| E1 | 약국 매장 승인이 `service_memberships('neture')` active 를 자동 생성 | commerce | `pharmacy-store-provisioner.ts` 의 `ensureServiceMembershipsForRoles` 호출 제거 |
| E2 | 약국 매장 신청이 Neture 승인을 확인하지 않음 | commerce | `POST /neture/pharmacy/membership`(+ 승인 `decide`)에 Neture membership active 확인 추가. 신청 화면 안내 1개 |
| E3 | 공급자 승인이 Neture membership 을 active 로 변경(정지 · 반려 해제 포함) | 기존 | `approveSupplier` 의 membership 활성화 제거 → Neture active 를 승인 전제조건으로 |
| E4 | Neture 가입 승인(`role='supplier'`)이 공급자를 ACTIVE 로 생성 · 승격 | 기존 | `approveRegistration` 의 supplier ONE-STEP 분기 제거(공급자는 `POST /supplier/register` → 공급자 승인으로만) |
| E5 | AI 자동화가 Neture 승인 없이 열림 | 기존 | `/api/ai/*` 사용자 기능 · local-agent pairing 에 Neture membership active guard. 대상 route 목록 확정 필요 |

E1 · E2 를 고치면 이미 E1 경로로 생성된 운영 membership 이 있는지 확인이 필요하다(이번 조사에서 운영 건수는 조회하지 않았다 — 수정 WO 에서 읽기 전용으로 확인).

**명칭 · 배치 혼동(동작은 정해진 대로)**

- "Neture 약국 기본 가입" · `neture:store_owner` = 실제로는 내 매장(약국) 신청 원장 — 이름이 Neture 메인 가입과 혼동된다. 정정은 **E1~E5 수정 작업에 포함**한다(10-8).
- 결함 #1(10-2): 세미프랜차이즈 운영 · 가입 화면이 neture.co.kr · store.neture.co.kr 에 있음.

**사용자 판정 (2026-10-07)**: E1~E5 = 수정 대상 인정. "단순한 화면 배치 문제가 아니라 가입 · 승인의 독립성이 깨진 구현"이다. 상태는 **배포 완료 · 가입 구조 검증 FAIL** 로 유지하고, §9-5 운영 업무 검증은 수정 반영 후 다시 한다.

#### 10-4-1. D1~D3 결정 (2026-10-07 사용자 확정)

| # | 결정 |
|---|---|
| D1 | 매장 **자기** 상품 · 자료 · QR · 사이니지 = 내 매장 기능 → 세미프랜차이즈(pharmacy) 승인 불필요. **세미프랜차이즈가 제공하는** 상품 · 콘텐츠 · 업무만 세미프랜차이즈 승인 필요. URL · `kpa-society` 코드 이름으로 판정하지 않는다. **내 매장 API 에 pharmacy 승인을 일괄 추가하는 것은 잘못된 수정**이다. |
| D2 | 내 매장(약국) 승인자 = 기존 `neture:operator` 유지. 처리 화면은 매장 운영 화면. 새 운영자 지정 구조를 만들지 않는다. |
| D3 | 화장품 매장 즉시 등록에 새 승인 흐름을 만들지 않는다 → K-Cosmetics 은퇴 트랙 1차-B 로 이관([CHECK-O4O-KCOSMETICS-RETIREMENT-PHASE1A](CHECK-O4O-KCOSMETICS-RETIREMENT-PHASE1A-WEB-APP-AND-RUNTIME-V1.md): "API · DB · serviceKey · role 정리는 1차-B 이후"). |

### 10-5. 구현 전 확인 ① — 연결 서비스 신청 · 승인 전제조건

Neture membership active 를 확인하는 신청 · 승인 지점은 **하나도 없다.**

| 지점 | 현재 전제 | 판정 |
|---|---|---|
| 내 매장(약국) 신청 `POST /neture/pharmacy/membership` | `requireAuth` 만 | 불일치(E2) |
| 〃 승인 `decide` | 없음 — Neture 가 없으면 active 생성(E1), 있으면(pending 포함) 그대로 둠 | 불일치(E1 · E2) |
| 세미프랜차이즈 신청 · 승인 · 모집 지원(`apply` · `decideMembership` · recruitments `pharmacyApply`) | 기본 가입(내 매장) active · 세미프랜차이즈 active 만 — Neture 는 간접 | 내 매장 전제가 고쳐지면 간접 충족. 직접 확인 추가 불필요 |
| 공급자 신청 `POST /neture/supplier/register` | `requireAuth` 만 | 불일치 |
| 공급자 승인 `approveSupplier` | 없음 — 오히려 Neture 를 active 로 바꿈(E3). `rejectSupplier` 는 Neture 를 rejected 로, `reactivateSupplier` 도 결합 | 불일치(E3) |
| 서비스 가입 신청 `joinService` | 전제 없음(메인 가입 자체) | 일치 |
| seller-recruitment 지원 · service-products 신청 · market-trial 참여 | 상태 불문 / 임의 서비스 membership | Neture 기준과 별개인 기존 경로 — 다른 트랙 |
| 화면 | `PharmacyMembershipPage` · `ServiceApplyPanel` · 세미프랜차이즈 신청 화면 모두 "Neture 승인 필요" 상태가 없다. `resolveNetureServiceStates` 에 메인 상태가 없다 | 불일치(E2 와 함께) |

### 10-6. 구현 전 확인 ② — Neture 승인 시 연결 서비스 role 발급 경로

| # | 경로 | 동작 | 분류 |
|---|---|---|---|
| A1 | `OperatorRegistrationService.approveRegistration` L153-170 | `sm.role`(bare `supplier` · `store_owner` 등)을 그대로 role 로 부여 | 수정 — 메인 승인은 연결 서비스 role 을 주지 않는다 |
| A1' | 〃 L173-313 supplier ONE-STEP | 공급자 생성 · ACTIVE 승격(E4) | 수정 — 분기 제거. `operator-registration.roleContract.test.ts` 동시 변경 |
| A2 | `MembershipApprovalService.approveMembership` STEP3(L469-479, `resolveGrantedRole`) | neture `sm.role` → `neture:supplier` · `neture:store_owner` 로 정규화 부여 | 수정 — neture 는 연결 서비스 role 매핑 제외 |
| A3 | `reactivateMembershipCore` STEP3(L999-1018) · STEP3.5(L1044-1064) · STEP5(L1083-1092) | role 복구 · 원장 확인 없이 `neture:store_owner` 부활 · INACTIVE 공급자 ACTIVE 복구 | 수정 — 연결 서비스 상태는 각 원장으로만 복구 |
| A4 | `MembershipConsoleController.updateMemberStatus` | 서비스 공통 상태 변경(전 서비스 승인) | 다른 트랙 |
| A5 | suspend STEP2.5(L830-840) | Neture 정지 → 하위 정지 연쇄 | 다른 트랙(정지 연쇄 정책) |
| B1 | `pharmacy-store-provisioner.activate` → `ensureServiceMembershipsForRoles` | 역방향: 매장 승인 → Neture active(E1) | 수정 |
| B2 | `joinService` 재신청 | 이전 `sm.role` 유지 → 재승인 시 A1 로 재발급 | 수정 — 재신청 시 role 초기화 |
| B3 | 과거 backfill 데이터 · `EditUserModal` 의 bare `supplier` 선택지 | | 다른 트랙 |
| B4 | `store-enrollment.service.ts` 화장품 즉시 `cosmetics:store_owner` | | 다른 트랙(D3) |
| C | `approveSupplier` · `rejectSupplier` · `reactivateSupplier` | 공급자 상태 → Neture membership 역결합 | 수정(E3) — 세 지점 함께 |
| D | `neture-service-state.service.ts` L118-120 | 공급자 원장이 없으면 `sm.role==='supplier'` 로 공급자 상태 표시 → 화면은 공급자 활성, API 는 403 | 수정 |
| D' | 프런트 `role-constants` · `SupplierRoute` · `HubPage` 의 bare `supplier` · `store-owner.utils` back-compat · 미사용 `hasSignageSupplierPermission` | | 다른 트랙 |
| E | 로그인 · 회원가입 · handoff · me-context | role 발급 없음 | 유지 |

### 10-7. 구현 전 확인 ③ — Neture 메인 AI vs 공통 AI API

| 구분 | API | 사용처 | 분류 |
|---|---|---|---|
| Neture 메인 AI | `POST /api/ai/home-chat`(L2097) | `/` O4OHomePage composer | 수정 — Neture active guard |
| 〃 | `POST /api/ai/request`(L2212) | 메인 AI 요청. 단 `surface='hospital-drug'` 는 병원약국 서비스 → guard 제외 | 수정 — surface 분기 |
| 〃 | `POST /api/ai/work-agent/run`(L359) | 프런트 호출자 없음 | 수정(같이 막음) |
| 〃 | `POST /api/local-agent/pairing-grants`(L84) · `GET /devices`(L97, 선택) | 메인 AI 자동화 PC 연결 | 수정 |
| 공통 | `/generate` · `/content` · `/url-to-blocks` | 공용 `packages/content-editor`(KPA · web-store · pharmacy-hub · lecture · Neture 공급자 · admin) | 유지 |
| 공통 | `/content-to-store-use` · `/course-structure` · `/lesson-body` · `/file-understanding` · `/vision/analyze` · `/query` · `/usage` · `/history` | 서비스별 · 미사용 | 유지 |
| 공통 | admin AI · `/api/v1/ai` · `/api/hospital/*` · agent 측 `/pair` · `/connect` · `/heartbeat` · `/result` | | 유지 |

guard 안: 얇은 middleware = `platform:super_admin` 통과 + `hasActiveServiceMembership(…, 'neture')`. serviceKey 는 고정 `neture`(요청값 불사용), 기존 `requireActiveServiceMembership` 와 같은 fail-closed 403.
**보이는 변화**: Neture 승인이 없는 KPA · 매장 사용자는 `/` 홈 composer 를 쓸 수 없게 된다 — 기준과 일치하나 화면 안내가 필요하다.

### 10-8. 최소 수정 범위 — 수정 / 유지 / 다른 트랙

**수정할 코드 (한 수정 WO)**

1. E1 · B1 — provisioner 의 Neture membership 생성 제거.
2. E2 — 내 매장(약국) 신청 · 승인 · 공급자 신청에 Neture active 전제. 화면(`PharmacyMembershipPage` · `ServiceApplyPanel`)에 "Neture 승인 필요" 상태, `resolveNetureServiceStates` 에 메인 상태 추가.
3. E3 · C — `approveSupplier` · `rejectSupplier` · `reactivateSupplier` 의 Neture membership 변경 제거, 승인 전제조건으로 전환.
4. E4 · A1 · A2 · A3 · B2 — 메인 승인 · 재활성화 · 재신청에서 연결 서비스 role · 공급자 상태 발급 제거 + roleContract test.
5. D — `neture-service-state` 의 `sm.role` 공급자 fallback 제거.
6. E5 — AI 4 route guard(10-7).
7. D1 — 세미프랜차이즈가 **제공하는** 기능 중 확인이 빠진 곳에만 세미프랜차이즈 active 확인: `pharmacy-products.controller` `/catalog` · `/apply` · `/applications` · `/approved` · `/orderable`, `store-seller-recruitment-browse`(+ 해당 화면 진입). store 호스트 `/hub/event-offers` · `/hub/cart` 는 403 막다른 길 → `/store/pharmacy/supply` 로 연결. **내 매장 자기 기능 API 에는 추가하지 않는다.**
8. 명칭 정정(같은 작업) — "Neture 약국 기본 가입" → "내 매장(약국) 신청 · 승인"으로 화면 · 주석 · DESIGN §3-1 · ROLE-WORKSPACE 해당 문구. role 키 `neture:store_owner` rename 은 RBAC(F9) 변경이라 하지 않고 의미 주석만 정정.
9. 수정 WO 시작 시 운영 데이터 census(읽기 전용, 건수만): E1 경로로 생긴 Neture active · bare `supplier`/`store_owner` `sm.role` · Neture 미승인 공급자 · Neture 미승인 매장 · ONE-STEP 생성 공급자. 정리(write)는 별도 승인.

**유지할 코드**

- Neture `/pharmacy/store/*` 세미프랜차이즈 commerce 의 SQL `sfm.status='active'` 판정(공급 · 콘텐츠 · 모집 · cart). payments prepare/confirm 재확인 누락은 경미 — 필수 아님.
- KPA 내 매장 API(`createRequireStoreOwner(kpa)`, 기본 가입만) — D1 기준 내 매장 기능.
- pharmacy 호스트 진입 gate(기본 가입 ∧ 세미프랜차이즈) — 세미프랜차이즈 호스트이므로 일관.
- 공통 AI API(10-7).
- Neture 메인 승인의 membership · `users.status` 활성화 자체 · 세미프랜차이즈 승인(지정 운영자) · 내 매장 승인자 `neture:operator`(D2).

**다른 트랙으로 넘길 코드**

| 대상 | 이관 트랙 |
|---|---|
| 화장품 즉시 등록(B4) | K-Cosmetics 은퇴 1차-B (D3) |
| `updateMemberStatus` 전 서비스 상태 변경(A4) · suspend 연쇄(A5) | 운영자 membership 콘솔 정비 |
| legacy backfill · `EditUserModal` · 프런트 bare `supplier` · `store-owner` back-compat(B3 · D') | RBAC legacy role 정리 |
| pharmacy 호스트의 내 매장 화면 중복 배치 · 세미프랜차이즈 운영 · 가입 화면 위치 | 결함 #1 화면 배치(10-2) |
| HQ 콘텐츠 · 사이니지(`/kpa/contents` · `/kpa/signage` · `/api/v1/hub` contents)가 "세미프랜차이즈 제공"인지 | **사용자 확인 필요** — 확인 전에는 유지 |
| 세미프랜차이즈 커뮤니티(`pharmacy` 에 `community_key` 없음) | 세미프랜차이즈 기능 확장 |
| seller-recruitment 지원 · service-products 신청 · market-trial 참여의 전제(10-5) | 각 기능 트랙 |

**상태(조사 시점)**: 배포 완료 · **가입 구조 검증 FAIL**. §9-5 는 위 수정 반영 · 배포 후 1단계부터 재개.

### 10-9. 가입 구조 수정 결과 (2026-10-07, 같은 PR)

사용자 지시: 10-8 최소 범위로 구현 · 세미프랜차이즈 신청 · 승인도 Neture 가입 승인을 **직접** 확인(10-5 의 "간접 충족" 판단 대체) · 본부 콘텐츠 · 사이니지는 작성 주체 · 제공 범위로 판정 · 공통 API 전체에 pharmacy 조건 추가 금지 · AI 입력창 안내 + 서버 guard · 병원약국 예외는 서버 확인 자격으로만 · 원장 독립 회귀 테스트 · 운영 데이터는 읽기 전용 건수만.

| # | 수정 | 위치 |
|---|---|---|
| E1 · B1 | 내 매장(약국) 승인 표식에서 `service_memberships('neture')` ensure 제거 | `pharmacy-store-provisioner.ts` |
| E2 | 내 매장(약국) · 세미프랜차이즈 신청(본인 403) · 승인(신청자 409)에 **현재** Neture 가입 승인 확인. 공급자 신청도 같다 | `neture-main-membership.ts`(판정 SSOT, 읽기 전용) · `pharmacy-membership.service.ts` · `semi-franchise.service.ts` · `supplier.service.ts` |
| E2 화면 | `resolveNetureServiceStates` 에 `netureMain` 추가 · 공급자 상태의 `sm.role` fallback 제거(D). `ServiceApplyPanel` · web-store `PharmacyMembershipPage` · `SemiFranchisesPage` 에 "Neture 가입 승인 필요" 안내 | `neture-service-state.service.ts` · web-neture · web-store |
| E3 · C | `approveSupplier` · `rejectSupplier` · `reactivateSupplier` 의 Neture membership 변경 제거 → 승인 · 재활성화 전제조건(`APPLICANT_NETURE_MEMBERSHIP_NOT_ACTIVE` 409) | `supplier.service.ts` + 3 controller |
| E4 · A1 · A1' | Neture 가입 승인(`approveRegistration`)의 role 부여 · 공급자 ONE-STEP 생성 제거. 관리자 계열 role 거부 방어는 유지 | `operator-registration.service.ts` |
| A2 · A3 | `MembershipApprovalService` neture 승인 · 재활성화가 `supplier` · `neture:supplier` · `store_owner` · `neture:store_owner` 를 부여 · 복구하지 않음, STEP3.5 neture 제외, STEP5(공급자 ACTIVE 복구) 제거 | `MembershipApprovalService.ts` |
| B2 | Neture 재신청 시 `sm.role` 을 `member` 로 초기화 | `handoff.controller.ts`(joinService) |
| E5 | `requireNetureMainMembership` guard — `/api/ai/request` · `/home-chat` · `/work-agent/run` · `/api/local-agent/pairing-grants`. serviceKey 고정 `neture`, 예외 = 서버 확인 `platform:super_admin` 뿐, 조회 실패 503. **병원약국 `surface:'hospital-drug'` 도 body 값으로 Neture 자격 우회 불가** — 미승인 병원약국 첫 요청의 처리는 10-10 R2 (병원약국 서비스 자체는 별도 `/api/hospital/*`) | middleware · `ai-proxy.routes.ts` · `local-agent.routes.ts` |
| E5 화면 | `/` 홈 입력창 자리에 상태별 안내(none: "Neture 가입 승인이 필요합니다" + 가입 신청 · pending: "가입 승인 대기 중입니다" · rejected: 다시 신청 · suspended · withdrawn: 안내만). 403 수신 시 상태 재조회. PC 연결 실패 문구 | `NetureMembershipNotice.tsx` · `O4OHomePage.tsx` · `localAgent.ts` |
| D1 | 항목 단위 판정(KPA 마운트만, `semiFranchiseAccessKey`). ~~PUBLIC 공급 = 내 매장 기능~~ — **10-10 R1 에서 정정**: 공급처 미지정(PUBLIC) 공급도 세미프랜차이즈 제공 항목. 모집 browse 는 미가입 시 빈 목록. **API 자체를 막지 않는다** | `pharmacy-products.controller.ts` · `store-seller-recruitment-browse.controller.ts` |
| D1 화면 | store 호스트 `/hub/event-offers` → `/store/pharmacy/supply`, `/hub/cart` → 약국 장바구니로 연결(403 막다른 길 제거) | web-store `App.tsx` |
| 명칭 | "Neture 약국 기본 가입" → "내 매장(약국) 신청 · 승인" — 화면 · 주석 · 오류 문구(api-server 38 · web 3종) · DESIGN §3-1 · ROLE-WORKSPACE 해당 문구. migration 주석 · role 키 `neture:store_owner` 는 그대로 | |

**D1 판정 결과 — 변경 없음(근거)**

| 대상 | 판정 |
|---|---|
| `/kpa/contents*` · `/kpa/signage*` · `/api/v1/hub` contents | 매장 자기 작성 · 플랫폼 공개 콘텐츠 = 내 매장 기능 / 기존 정책 |
| `semi_franchise_contents`(세미프랜차이즈 제공 자료) | 이미 `sfm.status='active'` 로 판정 |
| `/kpa/store-library/contents` 피드 | 혼합이지만 세미프랜차이즈 출처 행은 매장이 가져온 **사본**(매장 소유) — 유지. 결정 항목으로 보고 |
| `pharmacy-products /applications` | 매장 자신의 신청 이력 — 유지 |

**검증**

| 항목 | 결과 |
|---|---|
| `pnpm run type-check`(api-server · web 8종 포함) | PASS |
| api-server jest 전체 | 7,204 passed / 1 failed → `supplier-domain-boundary` Phase F 계약을 공급자 승인 경로로 이전(E4 의 의도된 변경) 후 해당 spec PASS. 신규 `neture-membership-ledger-independence.spec.ts` 35 PASS, `MembershipApprovalService` 계약 4건 갱신(neture 연결 서비스 role 부여 · 복구 없음) |
| web-neture vitest | 352 PASS + 신규 `NetureMembershipNotice.test.tsx` 6 PASS |
| web-kpa-society vitest | 67 PASS |
| web-store | 테스트 설정 없음 — type-check 만 |
| 브라우저 · 운영 검증 | **미실시** — 배포 후 §9-5 1단계(가입)부터 재개 |

**운영 데이터 영향 census (읽기 전용 · 건수만 · 정리하지 않음)**

| 항목 | 건수 |
|---|---|
| Neture membership 전체 | active 5 (role: customer 2 · admin 1 · operator 1 · neture:operator 1) |
| E1 경로로 생긴 Neture active(약국 신청 이후 생성) | 0 (`neture_pharmacy_memberships` 0행) |
| bare `supplier` · `store_owner` `sm.role` | 0 |
| role_assignments `supplier` · `store_owner` · `neture:store_owner` / `neture:supplier` | 0 / active 1 |
| Neture 미승인(membership 없음) 공급자 | ACTIVE 3 · PENDING 1 — 이번 수정 후 PENDING 1 은 승인 시 409, ACTIVE 3 은 기존 상태 유지(재활성화 시에만 전제 확인) |
| Neture 미승인 매장 · 세미프랜차이즈 가입 | 0 · 0 |
| ONE-STEP 생성 공급자(±60s 추정) | 0 |

**남은 결정 · 다른 트랙**

- 정지 연쇄(A5): Neture 정지는 여전히 `neture:store_owner` 를 회수하지만 재활성화는 복구하지 않는다(비대칭) — **해결되지 않음**, 정지 후속 항목(10-10).
- Neture 미승인 ACTIVE 공급자 3 · `neture:supplier` 1 — **현 상태 유지**, 데이터 정리는 별도 승인(write).
- `/kpa/store-library/contents` 세미프랜차이즈 사본 행 · `/applications` — 리뷰에서 현재 판단 유지 확정(10-10).
- `POST /neture/seller-recruitment/applications` 참여 전제 — 10-10 R3 에서 처리.

**상태**: 10-10 로 갱신.

### 10-10. 리뷰 반영 — 통합 전 수정 (2026-10-07, 같은 PR)

리뷰 지시: PUBLIC 공급의 세미프랜차이즈 미가입 허용 수정(기존 commerce 공급 이용 판정 재사용) · `/api/ai/request` 는 Neture 메인 호출에 Neture 승인, 병원약국 정상 호출은 서버가 확인한 그 서비스 자격으로, body 만으로 우회 불가 · 모집 참여 POST 직접 호출 우회 확인 후 차단.

| # | 수정 | 위치 |
|---|---|---|
| R1 | **공급처 미지정(PUBLIC) 포함 모든 공급 상품 = 세미프랜차이즈 가입 승인 대상.** commerce 공급 SSOT(`supply-access.ts` `ACCESS_CTE` — 4 공급 경로 모두 `my_sf` JOIN, 기본 경로 = `service_keys` 빈 offer → pharmacy 가입 필요)와 같은 판정을 `hasServiceSemiFranchiseSupplyAccess(exec, serviceKey, organizationId)` 로 export 해 재사용. `/catalog` · `/approved` · `/orderable` 미가입 시 공급 항목 0(`NO_SUPPLY_SQL`) · `/apply` 는 distribution_type 무관 403 `SEMI_FRANCHISE_MEMBERSHIP_REQUIRED`. API 자체는 막지 않는다(빈 목록) | `supply-access.ts` · `pharmacy-products.controller.ts` |
| R1-b | **목록 숨김의 직접 확정 우회 차단** — 공용 B2B 장바구니 확정이 승인축(`offer_service_approvals`)만 봐서 미가입 약국이 직접 `checkout-confirm-b2b` 로 주문할 수 있었다. `B2BCheckoutConfirmCore` 에 선택 adapter hook `assertSupplyAccess` 추가(조직 확정 직후) → `StoreB2BCartCheckoutService` 만 구현(서버 확정 매장 조직 기준, 403). Neture · PharmacyHub adapter 는 구현하지 않음(동작 불변). 이벤트 장바구니 확정은 **(10-11 에서 구매 약국 조직 기준으로 대체)** `ctx.organizationId` 가 이벤트 운영 조직이라 **구매자 기준** `resolveSemiFranchiseServiceAccess`(로그인 자격과 같은 판정)로 전 항목 `failedItems` 처리. k-cosmetics 는 키 없음 → 판정 없음 | `b2b-checkout-confirm.core.ts` · `store-b2b-cart-checkout.service.ts` · `event-offer-cart-checkout.service.ts` |
| R2 | **(10-11 에서 대체 — 병원약국 기존 동작 보존)** `/api/ai/request` 만 `requireNetureMainMembership(..., { hospitalPublicScope: true })`. Neture 승인 회원 · super_admin → 기존 경로 그대로. **Neture 미승인 + `surface:'hospital-drug'` 첫 요청(runId 없음)** → 병원약국 서비스가 서버에서 정한 공개 capability(`runHospitalAiRequest` — 무로그인 `/api/hospital/ai/request` 와 같은 조사 전용 · `suppressLocal` · 화면 조작은 "실행 불가" 안내)로만 처리. runId 재개 · 다른 surface · 홈 대화 · 작업 에이전트 · 로컬 연결은 403. 조회 실패 503 유지 | `neture-main-membership.middleware.ts` · `ai-proxy.routes.ts` · `hospital.routes.ts`(export) |
| R3 | **우회 확인됨** — `POST /neture/seller-recruitment/applications` 는 모집 존재 · 모집중 · 노출 승인 · 중복만 검사해, browse 가 빈 목록이어도 모집 id 로 직접 신청할 수 있었다. `createApplication` 에서 모집 `service_id` 의 세미프랜차이즈 키(kpa-society → pharmacy)가 있으면 신청자 기준 `resolveSemiFranchiseServiceAccess` 로 판정, 미가입 403 `SEMI_FRANCHISE_MEMBERSHIP_REQUIRED`(저장 전). 키 없는 서비스 모집은 불변 | `seller-recruitment.service.ts` · `seller-recruitment.controller.ts` |

**R2 판단 근거 (10-11 에서 대체)** — 서비스 카탈로그에 로그인 기반 병원약국 membership · entitlement 가 없다(새 role · 자격을 만들지 않는다). 실제 병원약국 서비스(web-hospital-pharmacy)는 무로그인 `/api/hospital/ai/request` 를 쓰고 이 guard 와 무관하다. 그래서 "서버가 확인한 그 서비스 자격" = 병원약국 서비스가 누구에게나 여는 공개 capability 이고, body 로 얻을 수 있는 것은 그 범위를 넘지 않는다(Neture 의 화면 · 원내 · 작업 실행 · runId 재개 · Local Agent 연결은 Neture 승인 필요).

**유지 (리뷰 확정)**

| 항목 | 처리 |
|---|---|
| Neture 정지 · 재활성화 비대칭(A5) | **해결되지 않음** — 정지 후속 항목으로 분리 |
| Neture 미승인 ACTIVE 공급자 3 · `neture:supplier` role 1 | 현 상태 유지 · 데이터 정리는 별도 |
| 가져온 콘텐츠 사본 · 매장 자신의 신청 이력 | 현재 판단 유지 |

**검증**

| 항목 | 결과 |
|---|---|
| api-server `tsc --noEmit` | PASS |
| `neture-membership-ledger-independence.spec.ts` | PASS — L3 병원약국 공개 범위 옵션(미승인 첫 요청 통과 · runId 403 · 다른 surface 403 · 옵션 없는 진입점 403 · 조회 실패 503), L4 PUBLIC 포함 판정 · `hasServiceSemiFranchiseSupplyAccess` unit · 장바구니 확정 2경로 · 모집 신청 POST |
| `store-b2b-cart-checkout.test.ts` | PASS — 미가입 PUBLIC 공급 확정 403(offer 조회 · 주문 생성 전 중단) · 서버 확정 조직 기준 · k-cosmetics 판정 없음 |
| `unified-request-http.spec.ts` ⑭ | PASS — 미승인 hospital-drug → 조사 전용(suppressLocal) · 화면 요청 미실행 · runId 403 · 홈 대화 · 작업 에이전트 403 |
| `b2b-remaining-debt-final-closure.spec.ts` | PASS — harness 를 가입 상태로 둠(관심사 = offer 재조회 SQL) |
| api-server jest 전체 | PASS — 417 suites · 7,262 passed · 0 failed (skipped 50, 기존) |
| 브라우저 · 운영 검증 | **미실시** — 배포 후 §9-5 1단계(가입)부터 재개 |

**상태**: 리뷰 반영 구현 · 로컬 검증 완료 · **미통합 · 미배포**. main 통합은 사용자 승인 후 PR merge. → 10-11 로 갱신.

### 10-11. 마무리 정정 — 병원약국 범위 제외 · 구매 약국 기준 · 정본 정합 (2026-10-07, 같은 PR)

사용자 지시: 가입 구조(E1~E5) 유지 · 병원약국은 O4O 리팩토링 대상이 아니므로 기존 동작 보존(새 역할 · 자격 · 공개 조사 제한 없음) · 이벤트 주문 자격은 서버가 확인한 **구매 약국 조직** 기준 · 정본 문서와 구현 일치.

| # | 정정 | 위치 |
|---|---|---|
| H1 | **병원약국 기존 동작 보존 — R2 대체.** guard 옵션 `hospitalSurface`: 병원약국 화면 첫 요청(`surface:'hospital-drug'` · runId 없음)은 **가입 조회 없이** 통과하고 핸들러의 기존 병원약국 분기(`performHospitalDrugRequest` — 조사 · 원내 조회 · 화면 위임)로 간다. main 과 같은 처리이며 Neture 가입 상태 · 가입 조회 장애(503)로 달라지지 않는다. 축소된 공개 경로(`runHospitalAiRequest` 재사용)와 `hospital.routes.ts` export 는 되돌림(main 과 동일). guard 가 이 표시(`res.locals.hospitalSurfaceOnly`)로 통과시킨 요청은 병원약국 분기 밖(통합 라우터 · 홈 대화 · Task 작업)으로 내려가지 않는다(방어 403). runId 재개 · 다른 surface · 홈 대화 · 작업 에이전트 · 로컬 연결은 Neture 판정 그대로(미승인 403) | `neture-main-membership.middleware.ts` · `ai-proxy.routes.ts` · `hospital.routes.ts` |
| D1-b | **이벤트 주문 = 구매 약국 조직 기준 — R1-b 이벤트 부분 대체.** 사용자 단위 판정(`resolveSemiFranchiseServiceAccess` — 사용자가 가진 약국 중 하나라도 가입 active 면 통과)은 A 약국 가입으로 B 약국 주문을 통과시켰다. 이제 구매 약국은 B2B confirm 과 같은 계약(결함 O1, `resolveBuyerOrganization`)으로 서버가 확정한다 — 선택값 `organizationId`(요청) 또는 장바구니에 담긴 조직(한 곳일 때만)은 hint, 후보는 내 매장(약국) 신청 active 약국 조직. 선택 없음 + 후보 여럿 → 400 `AMBIGUOUS_STORE_ORGANIZATION`(임의 선택 안 함) · 타인 조직 403 · 후보 없음 403. 판정은 그 조직의 pharmacy 가입 active(`hasServiceSemiFranchiseSupplyAccess` — B2B 와 같은 공급 판정). 이벤트 운영 조직은 쓰지 않는다. k-cosmetics 는 판정 대상 아님(조직 확정도 하지 않음 — 동작 불변) | `event-offer-cart-checkout.service.ts` · `store-cart.routes.ts`(`checkout-confirm` 이 `organizationId` hint 수신) |
| DOC | **정본 정합 (Codex P1 r4203536418)** — DESIGN 에 남은 옛 계약 정정: §3-1 "로그인만 된 계정" → Neture 가입 승인 계정 · 신청 403 / 승인 409, 내 매장 처리 ↔ Neture 원장 상호 불변 · §3-3 공급자 승인의 Neture 결합 제거(전제조건 확인만) · Neture 승인이 연결 서비스 역할을 발급 · 복구하지 않음 · §13 이관 표의 `service_memberships('neture')` ensure 취소선. §5-1 매장 표식 ensure 는 10-10 시점에 이미 취소선 | `DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md` |
| D1-c | **다중 약국 사용자의 이벤트 확정 (Codex P1 r4206224410)** — 공용 장바구니 화면(`store-ui-core` `useStoreCart`)은 body 에 조직을 싣지 않아 다중 약국이면 항상 400 이었다. 공용 패키지는 바꾸지 않고, 통합 매장 공간(web-store)이 모든 요청에 싣는 선택 매장 헤더 `X-Store-Organization-Id`(CHECK-O4O-URL-FIRST-CENSUS-V1 §21-14, `readPreferredStoreOrganizationId`)를 `checkout-confirm` 라우트가 넘긴다. 순서: body `organizationId`(명시 — 타인 조직 403) → 헤더(후보 안일 때만, 밖이면 없는 것과 같다 — 기존 헤더 계약) → 장바구니 조직(한 곳) → 후보 1 서버 확정 / 여럿 400. KPA `/store-hub/cart` 는 `NetureCommerceRedirect` 로 web-store 로 간다 | `store-cart.routes.ts` · `event-offer-cart-checkout.service.ts` |
| SF-1 | **세미프랜차이즈 승인 전제 = 실제 신청자 (Codex P2 r4206224423)** — 승인 시 Neture 가입 재확인 대상이 약국을 만든 사람(`neture_pharmacy_memberships.applicant_user_id`)이었다. 그 가입을 신청한 사람(`semi_franchise_memberships.applied_by` — 약국 admin/manager 일 수 있다)으로 교정. 신청자가 없으면(계정 삭제 → NULL) 'none' 으로 승인하지 않는다 | `semi-franchise.service.ts` |
| DOC-2 | **색인 · 기준 문서 명칭 정합 (Codex P2 r4206018123)** — `CANONICAL-INDEX` DESIGN 행 · STORE-ACCESS 행의 "기본 가입 원장" → 내 매장(약국) 신청 · 승인 원장(Neture 가입과 별도, 상태 · 판정 불변) · `O4O-STORE-ACCESS-AND-MEMBERSHIP-V1` §약국 예외 · `O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1` 세미프랜차이즈 식별 문구. **미변경**: F8 Frozen `NETURE-DISTRIBUTION-ENGINE-FREEZE-V1` 의 같은 옛 명칭 1곳 — Frozen 본문이라 별도 WO 로 보고(§16-4) | `CANONICAL-INDEX.md` · `O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md` · `O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md` |

**병원약국 기존 동작 보존 근거**

- 호출부 2곳 — ① 독립 앱 `web-hospital-pharmacy` 는 무로그인 `/api/hospital/ai/request` 만 쓴다(이 PR 이 건드리지 않음, `hospital.routes.ts` main 과 동일). ② web-neture `/hospital-drug` 는 `/api/ai/request` 에 `surface:'hospital-drug'` 만 보내고 runId · 홈 대화 · 작업 에이전트 · pairing 을 부르지 않는다(작업 결과는 표시만, pairing 은 설치 시 관리자가 마이페이지에서 완료).
- 서버: ②의 요청은 가입 상태와 무관하게 main 과 같은 `performHospitalDrugRequest` 로 간다 — 원내 조회(`localSource` 없으면 서버 Local 조회 허용) · 화면 위임(screen → Work Agent) 그대로.
- body 로 얻을 수 있는 것: `surface:'hospital-drug'` 로 들어갈 수 있는 곳은 main 에도 있던 병원약국 분기뿐이다. Neture 메인 경로(통합 라우터 · 홈 대화 · Task 작업 · runId 재개 · 홈 대화/작업 에이전트 endpoint · 로컬 연결)는 Neture 판정을 그대로 받는다.
- 다른 AI 기능: guard 는 위 4개 endpoint 에만 있다. 공용 편집기(`/api/ai/generate` 등 편집 surface) · admin AI · `/api/v1/ai` · `/api/hospital/*` 불변. 이 4개 endpoint 를 부르는 프런트는 web-neture(홈 · 병원약국 · 마이페이지 PC 연결)뿐이다.
- 남는 점: 병원약국 분기 자체는 main 과 같이 로그인 사용자 누구에게나 열려 있다(병원약국용 역할 · 자격을 만들지 않는다는 지시에 따라 넓히지도 좁히지도 않음). 병동 PC 를 **다시** 연결(pairing)할 때는 마이페이지 PC 연결이 Neture 승인을 요구한다(E5) — 설치 계정이 Neture 승인 상태여야 한다.

**검증**

| 항목 | 결과 |
|---|---|
| `event-offer-cart-checkout-purchasing-org.test.ts` (신규 14) | PASS — 화면 선택 매장 헤더 A 허용 · B 차단 · 후보 밖 헤더 무시(400) · body 가 헤더보다 우선, A 약국 허용 · B 약국 차단(재고 차감 · 주문 생성 없음, A 가입으로 대신 인정 안 함) · 장바구니 조직 B 기준 판정 · 선택 없음+후보 2 → 400 · 장바구니 조직 혼재 → 400 · 후보 1 → 서버 확정 · 타인 조직 403 · 후보 없음 403 · 이벤트 운영 조직 미사용 · k-cosmetics 판정 없음 |
| `unified-request-http.spec.ts` ⑭ | PASS — hospital-drug 는 가입 none · pending · suspended 모두 main 과 같은 처리(원내 조회 · reason=research_and_local · 가입 조회 0) · 화면 요청 → work 위임 · localSource=client → suppressLocal · 가입 조회 장애에도 200 · runId 재개 403 · 홈 대화 · 작업 에이전트 403 · 일반 요청 403 · super_admin 통과 · fail-closed 503 |
| `neture-membership-ledger-independence.spec.ts` | PASS — L3 병원약국 화면 옵션(가입 무관 통과 · 조회 0 · 장애 무관 · runId/다른 surface/옵션 없는 진입점 403) · 축소 경로 미사용 · 병원약국 분기 → 방어 403 → 통합 라우터 순서 · 이벤트 확정은 구매 약국 조직 판정 |
| 기타 — 아래 PR 보고의 전체 jest · type-check | PR 보고 참조 |
| 브라우저 · 운영 검증 | **미실시** — 배포 후 §9-5 1단계(가입)부터 재개 |

**남은 항목**

- 다중 약국 사용자의 이벤트 확정은 web-store 선택 매장 헤더로 해결(D1-c). 매장을 고르지 않은 상태 · 헤더를 싣지 않는 다른 화면에서는 400(선택 요구)이다. B2B 확정(`checkout-confirm-b2b`)은 이번 범위가 아니며 기존과 같다(body 조직만 hint).
- 이벤트 주문 생성 · 한도 집계(`reserveEventOfferListing`) · 자동 진열(`tryLinkStoreProduct`)은 여전히 사용자 기준이고 주문에 구매 약국을 기록하지 않는다 — 이번 판정 범위 밖(기존 계약).
- 모집 신청(R3)은 신청자 기준 판정이다(같은 사용자 · 다른 약국 구분 없음) — 이번 지시 범위 밖, 같은 유형으로 보고만.
- Neture 정지 · 재활성화 비대칭(A5) · 기존 공급자 데이터 · 화면 이전 · 커뮤니티 — 범위 밖 유지.

**상태**: 정정 구현 · 로컬 검증 완료 · **미통합 · 미배포**. main 통합은 사용자 승인 후 PR merge.
