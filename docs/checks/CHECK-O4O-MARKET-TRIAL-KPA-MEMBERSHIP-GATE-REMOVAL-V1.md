# CHECK-O4O-MARKET-TRIAL-KPA-MEMBERSHIP-GATE-REMOVAL-V1

> **WO**: WO-O4O-MARKET-TRIAL-KPA-MEMBERSHIP-GATE-REMOVAL-V1
> **선행 IR**: `IR-O4O-MARKET-TRIAL-BACKEND-NETURE-BOUNDARY-V1` (Phase 2 = B)
> **성격**: Market Trial backend 의 KPA membership gateway(고아) 제거.
> **무변경**: Market Trial 핵심 기능 / operator / SPO→OPL 전환 / DB / migration / UI.
> **작성일**: 2026-06-11

---

## 1. 목적
유통참여형 펀딩 = Neture 전용 정책에 따라, Market Trial 접근을 KPA 멤버십+약국 org 로 게이트하던 `gateway()` 엔드포인트(frontend 호출자 0, 고아)를 제거한다.

## 2. 선행 IR 기준
선행 IR Phase 2 판정 **B** — `gateway()` 는 과거 KPA Store 유입 배너의 backend. KPA `service_memberships` + 약국 `organization_members` 게이트가 Neture-only 와 충돌. 호출자 0 → 제거 안전.

## 3. 제거 대상
| 파일 | 대상 |
|------|------|
| `apps/api-server/src/routes/market-trial.routes.ts` | `GET /gateway` route 등록 |
| `apps/api-server/src/controllers/market-trial/marketTrialController.ts` | `gateway()` 메서드 · `toGatewayDTO()` 헬퍼 · 헤더 주석 |

## 4. Phase 1 — 호출자 재확인
- frontend 전수(`services/web-{kpa-society,glycopharm,k-cosmetics,neture}`, `*.ts/tsx`) grep `market-trial/gateway|/gateway|no_kpa_membership|not_pharmacy_member` → **0건**.
- backend `gateway` 참조: `marketTrialController.ts`(메서드/DTO/주석) + `market-trial.routes.ts:24`(등록) 만. (migration 의 "payment gateway" 는 무관.)
- 결론: **고아 엔드포인트 확정**.

## 5. Phase 2 — route 제거
`market-trial.routes.ts` 의 `router.get('/gateway', optionalAuth, MarketTrialController.gateway)` + 주석 제거. `optionalAuth` 는 `GET /`·`GET /:id` 에서 계속 사용 → import 유지.

## 6. Phase 3 — controller gateway 제거
- `gateway()` 메서드 전체 제거(KPA membership query · 약국 org query · emptyResponse · accessStatus 분기 포함).
- `toGatewayDTO()` 함수 제거(gateway 전용, 타 참조 없음).
- 클래스 헤더의 `WO-MARKET-TRIAL-SERVICE-ENTRY-BANNER-AND-GATEWAY-V1` 주석 제거.
- 기존 기능(createTrial/getTrials/getTrialById/joinTrial/getMyParticipations/settlement 등) 무변경.

## 7. Phase 4 — grep 검증
- `apps/api-server/src/controllers/market-trial` 대상 `gateway|toGatewayDTO|no_kpa_membership|not_pharmacy_member` → **0건**.
- frontend gateway 호출자 → **0건**(Phase 1 동일).

## 8. 제외/무변경 항목
- `marketTrialOperatorController.ts` 및 `createListingFromParticipant`(SPO→OPL 전환) — **무변경**(후속 `WO-O4O-MARKET-TRIAL-SPO-OPL-CONVERSION-BOUNDARY-FIX-V1`).
- operator/public/supplier/participation 라우트, trial-fulfillment, settlement, entities, DB/migration, Neture/Store frontend — **무변경**.

## 9. 검증 결과
- **정적**: gateway route/메서드/DTO 제거 확인. Market Trial 기본 기능 무변경.
- **TypeScript**: `apps/api-server` `tsc --noEmit` → PASS.
- **API smoke**: 운영 환경 직접 호출은 생략(배포 후 `GET /api/market-trial/gateway` → 404 기대). 정적+typecheck 로 대체.

## 10. 완료 판정
**PASS** — gateway route + controller 메서드 + DTO + KPA membership/약국 org 게이트 제거. 고아 확정(호출자 0). Market Trial Neture 내부 기능·operator·SPO→OPL 전환·DB·UI 무변경. typecheck 통과.

## 11. 후속 작업
1. `WO-O4O-MARKET-TRIAL-SPO-OPL-CONVERSION-BOUNDARY-FIX-V1` — 전환 정책 결정(A 보류 / B Neture org 한정 / C Store read 격리) **후** 코드 작업. 데이터 영향·승인 필요.
2. 선행 `IR-O4O-DISTRIBUTION-FUNDING-VS-MARKET-TRIAL-DEFINITION-V1` supersede note.
3. Neture 내부 외부명 정렬.

---

*Date: 2026-06-11 · WO-O4O-MARKET-TRIAL-KPA-MEMBERSHIP-GATE-REMOVAL-V1 · gateway 고아 KPA gate 제거 PASS. 핵심/operator/전환/DB/UI 무변경.*
