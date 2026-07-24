# CHECK — WO-O4O-KPA-OPERATOR-PHARMACY-SERVICE-REQUEST-LEGACY-REMOVE-V1

**WO 제목:** 약국 서비스 별도 신청(pharmacy-requests) 폐지 — 회원 승인·매장 운영 승인 단일화(경로 B)

**상태:** 구현 완료 · typecheck/build GREEN · 배포·운영 smoke 진행

---

## 1. 목적

두 갈래로 나뉘어 있던 매장 운영 권한 부여 경로를 **단일 정책(경로 B)** 으로 통합한다.

```
약국 경영자 회원 신청·승인
  → 약국 조직 생성/연결 (organizations, type='pharmacy')
  → 조직 owner 등록 (organization_members, role='owner')
  → kpa:store_owner 역할 부여 (role_assignments)
  → platform_store_slugs 예약
  → 별도 약국 서비스 신청 없이 매장 기능 자동 이용
```

폐지 대상: `/pharmacy/approval` self-service 신청 폼, `kpa_pharmacy_requests` 신규 생성/승인/반려,
운영자 재승인 흐름(`/operator/pharmacy-requests`), 관련 KPI·Action Queue·알림.

---

## 2. 실행 순서 준수

| 순서 | 항목 | 결과 |
|:---:|------|------|
| 1 | 신규 self-service 신청 진입 폐쇄 | ✅ 완료 (§A) |
| 2 | 기존 pending 잔량·연결 상태 read-only 조사 | ✅ 완료 — **`kpa_pharmacy_requests` 0행** |
| 3 | 안전 처리 가능한 pending 정리 | ✅ 불필요 (0행 — 정리·전환 대상 없음) |
| 4 | 신규 생성 차단 검증 | ✅ 완료 (프론트 `.create` 0 · 백엔드 route 제거) |
| 5 | 운영자 승인 route/page/API/KPI/알림 제거 | ✅ 완료 (§C) |
| 6 | 경로 B 자동 이용 흐름 검증 | ✅ 완료 (§B / member.controller) |
| 7 | typecheck·build·배포·smoke·CHECK·commit·push | 진행 (본 문서) |

---

## 3. 기존 pending 조사 결과 (Step B)

- 조사 채널: cloud-sql-proxy(port 5480) + Node `pg` + `o4o_api` 자격증명 (read-only SELECT, CLAUDE.md §0 허용 범위).
- `SELECT COUNT(*) FROM kpa_pharmacy_requests` → **총 0행 / pending 0행.**
- 결론: 분류·전환·정리 대상 없음. 고아(orphan) 위험 없음. **DB 변경(UPDATE/DELETE) 미수행.**
- 다만 신규 row 발생 자체를 막기 위해 self-service 생성 경로는 코드로 폐쇄함(아래 §A).

---

## 4. 변경 파일 (§A 사용자 진입 폐쇄 / §C 운영자 레거시 제거)

### Frontend (services/web-kpa-society)
| 파일 | 변경 |
|------|------|
| `pages/mypage/MyProfilePage.tsx` | `pharmacyRequestApi`/상태조회 제거, 능력 카드 = 정적 안내 + `/join/pharmacy` 링크 (신청 버튼 없음) |
| `pages/pharmacy/PharmacyApprovalGatePage.tsx` | 신청 폼 전체 제거 → `<Navigate to="/pharmacy" replace />` |
| `pages/pharmacy/PharmacyPage.tsx` | role 기반 분기만 (store_owner→/store, 그 외→회원 안내). 신청 생성 없음 |
| `components/auth/PharmacyGuard.tsx` | `getMyRequestsCached` staleRecovery 제거, role/`isStoreOwner` 판정만 |
| `pages/pharmacy/sections/{QuickActions,MyRequests}Section.tsx` | 삭제 (dead) |
| `api/pharmacyRequestApi.ts` | 삭제 |
| `pages/operator/PharmacyRequestManagementPage.tsx` | 삭제 |
| `pages/operator/index.ts` | export 제거 |
| `routes/OperatorRoutes.tsx` | `pharmacy-requests` route + barrel import 제거 |

### Backend (apps/api-server)
| 파일 | 변경 |
|------|------|
| `routes/kpa/controllers/pharmacy-request.controller.ts` | 삭제 (POST 생성 / GET my / GET pending / PATCH approve·reject + 알림 emitter 전량) |
| `routes/kpa/kpa.routes.ts` | `/pharmacy-requests` mount + import 제거 |
| `routes/kpa/services/operator-dashboard.service.ts` | KPI/AI/ActionQueue/QuickAction/recentActivity의 pharmacy 항목 제거 → **이벤트 오퍼 승인 대기** 로 대체. admin service-apps 링크 `/operator/organization-requests` 정렬 |
| `routes/kpa/controllers/operator-summary.controller.ts` | recentActivity의 `pharmacy_request` 쿼리·push 제거 |
| `entities/Notification.ts` | `pharmacy.request_*` 타입 3종 **deprecated** 주석 (과거 row 판독용 유지, 신규 emit 없음) |

### Shared (packages/shared-space-ui)
| 파일 | 변경 |
|------|------|
| `guide/copy/kpa.ts` | 운영자 가이드 dead-link(`/operator/pharmacy-requests`) 제거 → 회원 관리(약국 경영자 승인 시 매장 권한 자동 부여) 안내로 통합 |

---

## 5. 대체 지표 (신규 통계·API 없음)

운영자 대시보드의 `pharmacy-requests` KPI → 기존 실기능 **이벤트 오퍼 승인 대기** 로 대체.

- 쿼리: `SELECT COUNT(*) FROM organization_product_listings WHERE service_key='kpa-society' AND status='pending'`
  = `EventOfferService.countPendingListings` 와 동일. 신규 테이블/엔드포인트 신설 없음.
- KPI key `event-offers` (frontend `KpaOperatorDashboard` 이미 대응), link `/operator/event-offers`.
- AI Summary / Action Queue 항목도 동일 소스로 대체.

---

## 6. DB 처리 (Step D)

- `kpa_pharmacy_requests` 테이블/엔티티/마이그레이션 **drop 하지 않음** (이력 보존).
  - `database/entities.ts` 등록, `kpa-pharmacy-request.entity.ts`, `20260219000005-CreateKpaPharmacyRequests.ts` 유지.
- 신규 write 경로·운영 코드 참조 = 0 (WO 주석 제외).
- 잔여 데이터: 0행. 테이블·entity·migration 삭제는 **별도 cleanup WO 후보**.

---

## 7. 최종 검증 10항 (정적 분석)

| # | 항목 | 결과 |
|:-:|------|------|
| 1 | 일반 회원에게 별도 매장 운영 신청 버튼 미노출 | ✅ MyProfile/PharmacyPage 정적 안내만 |
| 2 | `/pharmacy/approval` 신규 신청 생성 불가 | ✅ `Navigate to /pharmacy` |
| 3 | `POST /pharmacy-requests` 경로 폐쇄 | ✅ route mount 제거 |
| 4 | 회원 승인 시 조직·owner·`kpa:store_owner` 자동 생성 | ✅ member.controller.ts:648-784 |
| 5 | 승인된 약국 경영자 별도 신청 없이 `/store` 진입 | ✅ PharmacyPage hasStoreRole→/store |
| 6 | 운영자 대시보드 약국 서비스 신청 KPI·큐 제거 | ✅ event-offers 로 대체 |
| 7 | 이벤트 오퍼 승인 대기 정상 연결 | ✅ KPI/AI/ActionQueue 배선 |
| 8 | 운영자 pharmacy-request route/page/API 제거 | ✅ |
| 9 | 관련 알림 신규 생성 없음 | ✅ 유일 emitter(controller) 삭제 |
| 10 | KPA 외 서비스 영향 없음 | ✅ 변경은 KPA route/service + web-kpa + shared kpa.ts + additive Notification 타입 주석 |

---

## 8. 빌드 검증

- `apps/api-server` `tsc -p tsconfig.build.json --noEmit` → **EXIT 0** (변경 파일 오류 0).
  - (참고: `scripts/` 내 사전 존재 TS 오류는 build tsconfig 범위 밖 · 본 WO 무관)
- `pnpm --filter @o4o/web-kpa-society build` → **✓ built** (shared-space-ui `kpa.ts` 의존 포함).

---

*Generated: 2026-07-24 · WO-O4O-KPA-OPERATOR-PHARMACY-SERVICE-REQUEST-LEGACY-REMOVE-V1*
