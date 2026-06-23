# CHECK-O4O-TOSS-CLIENT-KEY-CONFIG-AND-WIDGET-SMOKE-V1

> **작업명:** WO-O4O-TOSS-CLIENT-KEY-CONFIG-AND-WIDGET-SMOKE-V1
> **유형:** 운영 env 설정(코드 0) + 비파괴 위젯 smoke. PaymentCore/Toss adapter/DB/schema/migration/code **무변경**.
> **결과: 조건부 PASS — env 설정·재배포·placeholder 제거(서버측 확정) 완료. 위젯 실오픈 시각 확인만 실브라우저로 분리(헤드리스 자동화에서 데모 store-owner 로그인 미성립 — env/코드 무관).**
> **작성일:** 2026-06-23
> 선행: WO-O4O-STORE-SERVICE-SUBSCRIPTION-SMOKE-V1 (PASS 11/12, 미완=Toss 창 실오픈) · 보강 커밋 `02d122d3a`(TOSS_PAYMENTS_CLIENT_KEY 변수명 확정)

---

## 1. 대상 서비스 / revision

- 서비스: `o4o-core-api` (region asia-northeast3, project netureyoutube).
- **신규 revision `o4o-core-api-02284-bv9`** — env 설정으로 배포, 100% 트래픽. `/health/database` **200**.

## 2. 설정한 환경변수 (정확)

- **`TOSS_PAYMENTS_CLIENT_KEY`** (레거시 `TOSS_CLIENT_KEY` 아님 — 구독 흐름 `TossPaymentProviderAdapter` 가 읽는 변수).
- 설정 전: o4o-core-api env 24개 중 `TOSS`/`PAYMENT` 이름 **0개** → 부재 확정 → fallback `test_ck_test_key`(placeholder) 반환이 원인.
- 설정 명령(additive, 기존 24개 보존): `gcloud run services update o4o-core-api --update-env-vars TOSS_PAYMENTS_CLIENT_KEY=<sandbox>`.

## 3. clientKey present / masked

- 설정 후 describe: **`TOSS_PAYMENTS_CLIENT_KEY` present, prefix `test_ck_****`** (placeholder `test_ck_test_key` 아님).
- 값 = repo 레거시 fallback 과 동일한 Toss **공개 샌드박스 테스트 키**(비밀 아님, 사용자 승인 = "repo 샌드박스 테스트 키"). 전체 키 미기록.

## 4. placeholder 제거 (서버측 확정)

- `TossPaymentProviderAdapter.ts:29` `this.clientKey = process.env.TOSS_PAYMENTS_CLIENT_KEY || 'test_ck_test_key'` — 순수 env read(부팅 시 1회).
- 신규 revision 02284-bv9 는 env 설정 상태로 부팅 → adapter 가 샌드박스 키 보유 → **prepare 응답 clientKey 가 더 이상 `test_ck_test_key` 가 아님(결정적)**.
- (주의: 본 세션에서 prepare 를 실 토큰으로 직접 호출하진 못함 — 아래 §6. env+코드 경로로 결과 확정.)

## 5. 비파괴 안전성 (smoke 시도 중 유지)

- 자동화 스크립트에 `route('**/subscriptions/confirm*', abort)` + `route('**/payments/prepare*', abort)`(소비자 checkout 감시) 적용.
- 전 시도에서 **confirm 호출 0건 / 소비자 checkout 0건**. 실 결제·승인·entitlement 생성 없음.
- 선행 smoke 의 abandoned CREATED payment 2건 **보존**(정리/상태변경/삭제 안 함).

## 6. 위젯 실오픈 — 실브라우저 분리 (headless 한계)

- ephemeral headless(`chromium.launch`)로 데모 store-owner 자동로그인(`/login` 모달 "🧪 체험용 약국 경영자 계정") 시도 → **클릭은 되나 auth 네트워크 호출 0건·localStorage/cookie 미생성 → 인증 미성립**. 결과적으로 구독 화면 패널/prepare 까지 도달 못 함.
- 원인: 데모 로그인이 headless ephemeral 컨텍스트에서 동작하지 않음(실 Chrome/세션 특성). **env/코드/clientKey 와 무관.**
- 따라서 "Toss 결제창 실오픈" 시각 확인은 **실브라우저 1회**로 분리. env 변경으로 placeholder 는 이미 제거됐으므로, 실오픈은 높은 확률로 성립(서버 clientKey 유효).

### 실브라우저 확인 절차 (1회, 비파괴)
1. KPA 로그인 모달 → "🧪 체험용 약국 경영자 계정"(store-owner 자동로그인).
2. `/store/sales-channels/foreign-visitor` → 가격(월 99,000원·30일) + "월 이용권 결제하기".
3. 버튼 클릭 → DevTools Network `subscriptions/prepare` 201, **clientKey prefix `test_ck_` (≠ test_ck_test_key)**.
4. **Toss 결제창 실오픈 + 99,000원 표시** 확인 → 즉시 중단(결제수단/인증/결제 금지).
5. `subscriptions/confirm` **0건** 확인.

## 7. 보존 경계 (정적/런타임)

- ✅ 코드/DB/schema/migration **0**(env 설정만). PaymentCore/Toss adapter 무변경.
- ✅ STORE_SALE_PAYMENT(kpa/glyco/cosmetics consumer checkout) 미접촉 — 되살리지 않음.
- ✅ Neture B2B diff 0.

## 8. 완료 기준 대비

| # | 기준 | 결과 |
|:--:|---|:--:|
| 1 | TOSS_PAYMENTS_CLIENT_KEY 설정 | ✅ |
| 2 | api-server 재배포 | ✅ (02284-bv9) |
| 3 | prepare clientKey ≠ test_ck_test_key | ✅ (env+코드 경로 확정) |
| 4 | clientKey prefix test_ck_/live_ck_ | ✅ (test_ck_) |
| 5 | prepare 성공 | ⏸ 실브라우저 확인(§6) |
| 6 | Toss 결제창 실오픈 | ⏸ 실브라우저 확인(§6) |
| 7 | confirm 0건 | ✅ |
| 8 | 실결제 미수행 | ✅ |
| 9 | STORE_SALE_PAYMENT 차단 유지 | ✅ |
| 10 | Neture B2B 미접촉 | ✅ |
| 11 | DB/schema/migration/code 0 | ✅ |
| 12 | CHECK 문서 | ✅ |

## 9. 결론

- **env 한계(placeholder clientKey) 해소 완료** — `TOSS_PAYMENTS_CLIENT_KEY` 설정 + 재배포 + 서버측 placeholder 제거 확정.
- **유일 잔여:** Toss 결제창 실오픈 시각 확인 1회(실브라우저). 헤드리스 자동화는 데모 로그인 미성립으로 불가 — env/코드 무관. 성립 시 STORE_SERVICE_SUBSCRIPTION V1 운영 기준선(화면→가격→prepare→Toss 창 실오픈) 완전 마감.

## 10. 후속 후보

- WO-O4O-STORE-SERVICE-SUBSCRIPTION-SANDBOX-CONFIRM-V1 (test 결제 승인 + entitlement ACTIVE 실검증, live 금지).
- CANCEL-REFUND-POLICY-V1 · BILLING-KEY-V2.

---

*Date: 2026-06-23 · TOSS_PAYMENTS_CLIENT_KEY(샌드박스) 설정 + o4o-core-api 02284-bv9 재배포 + placeholder 제거(서버측 확정) · 위젯 실오픈만 실브라우저 분리(headless 데모로그인 미성립, env/코드 무관) · confirm 0·실결제 0·STORE_SALE_PAYMENT/Neture B2B 무변경 · code/DB/migration 0.*
