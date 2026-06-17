# IR-O4O-SERVICE-AUDIENCE-POLICY-OWNERSHIP-DECISION-V1

> **유형:** read-only 조사 — 코드/route/guard/backend/DB/정책값 변경 0.
> **대상:** 서비스 대상 정책(`/admin/settings/service-audience`)의 소유권/guard 결정.
> **판정: B(platform-admin 이동 + guard 정합) 권장.** 정책이 **여러 서비스의 drug-service connection 을 gate** 하는 platform 거버넌스(offer.service·partner-contract.service 소비)이며, 현재 frontend↔backend guard 불일치도 함께 해소됨. 단 "drug 연결 게이트 소유 = platform admin" 확정은 사용자 결정.
> 선행: IR-O4O-PLATFORM-TIER1-MENU-MIGRATION-DECISION-V1 · WO-...-ROLES-MENU-MIGRATION(+smoke) — 2026-06-17

---

## 0. 결론 요약 (TL;DR)

- **서비스 대상 정책 = platform 거버넌스 성격이 강하다(역할 관리보다 더).** `isPharmacyTargetService` 가 단순 표시가 아니라 **offer 생성/리스팅·partner-contract 에서 drug-service 연결 가능 여부를 gate**(WO-O4O-DRUG-SERVICE-CONNECTION-GATE) → **여러 서비스의 실제 비즈니스 동작에 영향**.
- serviceKey 범위 = O4O 전 카탈로그(neture/glycopharm/glucoseview/kpa-society/k-cosmetics), pharmacy 기본=`['glycopharm','kpa-society']`. **명백한 cross-service.**
- **guard 불일치 현존**: backend `requireNetureScope('neture:admin')`(neture:admin 만) vs frontend `AdminRoute`(neture:admin + platform:super_admin) → **platform:super_admin 단독은 현재 backend 저장 403**.
- **권장 B**: `/admin/platform/service-audience` 이동 + backend guard platform 정합(역할 관리 이동과 동일 패턴) → cross-service 게이트 소유권을 platform-admin 으로 정리 + 기존 불일치 해소.
- 단 **소유권 확정(누가 drug 연결 게이트를 바꾸는가)** 은 정책 결정 → 본 IR 은 권장, 실행은 후속 WO.

---

## 1. 현황 (조사 결과)

| 항목 | 값 |
|------|------|
| frontend route | `/admin/settings/service-audience` (`ServiceAudiencePolicyPage`, AdminRoute) |
| frontend guard | `AdminRoute` = `['neture:admin','platform:super_admin']` + requireMembership='neture' |
| backend route | `GET /` · `PUT /:serviceKey` (`/api/v1/neture/admin/service-audience-policies`) |
| backend guard | **`requireAuth` + `requireNetureScope('neture:admin')`** (neture:admin 만) |
| 데이터 | `service_audience_policies`(serviceKey, isPharmacyTargetService, note) |
| serviceKey 범위 | O4O 전 카탈로그 + DB row(`ServiceAudienceService.list`) — pharmacy 기본 `['glycopharm','kpa-society']` |
| mutation | `PUT` upsert(isPharmacyTargetService/note) |

## 2. 실사용처 (핵심 — platform 성격 근거)

`ServiceAudienceService.getPharmacyAudienceResolver()` 소비:
- `offer.service.ts:451, 830` — offer 생성/리스팅 시 **drug-service 연결 audience gate**.
- `partner-contract.service.ts:576, 811` — partner-contract 흐름의 동일 gate.

→ 정책 값이 **여러 서비스의 drug 상품 연결 가능 여부를 실제로 제어**. 단순 Neture 운영 설정이 아니라 **O4O 전역 거버넌스 게이트**. (admin 화면도 "O4O 내 여러 서비스 대상 정책" 명시.)

## 3. guard 불일치 (역할 관리와 동형 문제)

| 계층 | 허용 | 결과 |
|------|------|------|
| frontend AdminRoute | neture:admin + platform:super_admin | 화면 진입 가능 |
| backend requireNetureScope | **neture:admin 만** | **platform:super_admin 단독 → PUT 403** |

→ 이동(B) 시 backend 를 platform guard 로 정렬하면 **이 불일치도 동시 해소**(platform:super_admin 이 저장 가능해짐). 현재는 통합 계정(neture:admin+platform:super_admin)만 저장 가능.

## 4. 선택지 비교

| 선택지 | 내용 | 적합성 |
|------|------|------|
| A 유지 | Neture admin 유지 | **부적합** — cross-service 거버넌스 게이트가 service admin 안에 잔존. platform 일원화 미완 |
| **B 이동** ✅ | `/admin/platform/service-audience` + backend platform guard 정합 | **권장** — 소유권을 platform-admin 으로, 불일치 해소. 역할 관리 이동 검증된 패턴 재사용 |
| C 하이브리드 | crosslink/read-only mirror 선행 | 차선 — guard/소유권 결정을 미루나, 본 게이트는 platform 성격이 명확해 미룰 실익 적음 |

## 5. guard 전환 영향 (§7 Q8)

- backend `neture:admin` → `platform:admin/super_admin` 전환 시: **pure neture:admin 사용자가 저장 권한 상실**. 단 현 환경엔 pure-role 계정 부재(통합 계정만) → **실질 운영 단절 위험 낮음**. drug 연결 게이트는 platform 거버넌스라 platform 소유가 정합.
- 조회(GET)도 platform 으로 좁힐지/유지할지는 WO 에서 결정(권장: PUT·GET 모두 platform 정합, mirror 불요).

## 6. 핵심 질문 답변 (§7 Q1~Q10)

1. 다루는 serviceKey → **O4O 전 카탈로그**(neture/glycopharm/glucoseview/kpa-society/k-cosmetics), pharmacy 기본 glycopharm/kpa-society.
2. 사용처 → `offer.service`·`partner-contract.service` 의 **drug-service 연결 audience gate**.
3. 사용자-facing 영향 → **있음**(offer/partner-contract 의 drug 연결 가능 여부 제어).
4. backend guard → `requireAuth + requireNetureScope('neture:admin')`.
5. frontend↔backend 일치? → **불일치**(frontend platform:super_admin 허용, backend neture:admin 만).
6. platform:super_admin 현재 저장 가능? → **불가(403)** — backend neture-scope.
7. pure neture:admin 유지 필요? → 운영상 강한 이유 없음(게이트는 platform 거버넌스). 통합 계정으로 운영 중.
8. platform 전환 시 상실 → pure neture:admin 저장권(현 환경 부재 → 실질 영향 낮음).
9. read-only mirror 필요? → **불요**(B 직접 이동이 더 명확. 게이트 성격이 platform).
10. 권장 → **B**(이동 + guard 정합).

## 7. 권장 & 후속

```
권장: B — /admin/platform/service-audience 이동 + backend guard platform 정합.
근거: cross-service drug-connection 게이트 = platform 거버넌스. frontend↔backend 불일치 동시 해소.
실행 전 사용자 확정: "drug 연결 audience 게이트 소유 = platform admin" (pure neture:admin 저장권 회수 수용).
```

후속 WO:
1. **(권장) `WO-O4O-PLATFORM-SERVICE-AUDIENCE-POLICY-MIGRATION-V1`** — `/admin/platform/service-audience`(PlatformRoute) 추가 + 공통 ServiceAudiencePolicyPage 재사용(platform 안내) + **backend guard neture-scope→platform requireRole** + 기존 `/admin/settings/service-audience` deprecated 배너(역할 관리 이동 패턴 동형). 배포 후 smoke(정책 저장 미실행, 조회/이동만).
2. (대안 C) `WO-O4O-PLATFORM-SERVICE-AUDIENCE-READONLY-MIRROR-V1` — guard 전환 보류 시 platform read-only mirror.
3. (독립) `IR-O4O-ADMIN-GUARD-FRONTEND-BACKEND-RECONCILE-V1` — operators 등 잔여 불일치 전수(서비스 대상 정책 불일치는 B 로 해소).

> backend guard 변경은 **frozen core 가 아닌 neture admin route** 이나, drug 게이트 영향이 있으므로 WO 에서 offer/partner-contract gate 동작 무영향(정책 값 자체 미변경, 권한 주체만 변경) 확인 필수.

## 8. 준수 확인

```
✅ read-only — 코드/route/guard/backend/DB/정책값 변경 0
✅ 정책값(service_audience_policies) 미저장·미변경
✅ 역할 관리/운영자 관리/platform Phase 1 미접촉
✅ 산출물 = 본 문서 1개 (path-specific)
```

---

*read-only · 서비스 대상 정책 = cross-service drug-connection 게이트(offer/partner-contract 소비) = platform 거버넌스 → 권장 B(/admin/platform/service-audience 이동 + backend guard platform 정합, 기존 불일치 해소) · pure neture:admin 저장권 회수는 현 환경 실질 영향 낮음 · 소유권 확정은 사용자 결정 · 후속 WO-O4O-PLATFORM-SERVICE-AUDIENCE-POLICY-MIGRATION-V1.*
