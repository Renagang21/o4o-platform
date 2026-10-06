# CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-05 · **최종 갱신**: 2026-10-06
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

