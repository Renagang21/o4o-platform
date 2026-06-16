# CHECK-O4O-CROSSSERVICE-OPERATOR-DASHBOARD-UI-PARITY-V1

> WO-O4O-CROSSSERVICE-OPERATOR-DASHBOARD-UI-PARITY-V1
> GlycoPharm / KPA-Society / K-Cosmetics `/operator` 첫 화면 UI parity
> 작성일: 2026-06-16 · 판정: **PASS (코드/빌드 단계)** · Neture 제외

---

## 1. 변경 전 UI 차이 요약

조사 결과, 세 operator 첫 화면은 **이미 공통 아키텍처를 공유**하고 있었다. WO가 전제한
"새 공통 컴포넌트 신설 + thin wrapper 전환"은 대부분 선행 WO로 완료된 상태였다.

| 공통 요소 | 위치 | 비고 |
|---|---|---|
| `OperatorDashboardLayout` | `@o4o/operator-ux-core` | 5-Block 고정 순서 (KPI→AI→Action→Activity→QuickActions) |
| `AxisNavigationSection` | `@o4o/operator-core-ui` | 2축 네비게이션 (data-driven, metrics+links) |
| `aboveBlocks` slot 컨벤션 | layout | `[Alert/Notice] → [Axis] → [5-block]` |

선행 WO: `AXIS-NAVIGATION-COMMONIZATION-V1`, `ABOVE-BLOCK-SLOT-V1`, `AUX-SECTION-P1-ALIGNMENT-V1`.

### 남아있던 실제 차이

| 차이 | KPA | GlycoPharm | K-Cosmetics | 성격 |
|---|---|---|---|---|
| **운영 철학 안내 카드** | ✅ 인라인 `OperatorRoleGuideCard` | ❌ 없음 | ❌ 없음 | **구조 — 본 WO 통일 대상** |
| 축 metrics 타일 | ✅ 실시간 metrics | links-only | links-only | 별도 WO 보류 |
| 축 구성·순서 | [커뮤니티, 매장HUB] | [커뮤니티, 약국HUB] | [매장HUB, 콘텐츠] | 서비스 정체성 (유지) |
| 보조 알림 | 없음 | OperatorAlerts | 주문지표 notice | 데이터 — 서비스별 정당 |
| 5-Block 내용 | backend config | backend config | backend config | 데이터 — WO 범위 외 |

→ 사용자 합의(2026-06-16): **"안내 카드만 공통화"** 범위로 확정. 축 metrics/구성은 별도 WO.

---

## 2. 최종 공통 UI 구조

`aboveBlocks` 최상단에 **운영 철학 안내 카드를 세 서비스 동일 구조**로 배치.

```
[운영 철학 안내 카드 — 공통]   ← 본 WO 추가/통일
[Alert/Notice — 서비스별]
[Axis Navigation — 공통 컴포넌트, axes config 서비스별]
[5-Block — 공통 layout, backend config]
```

안내 카드 본문(제목/설명/철학)은 service-neutral static. 가이드 링크만 서비스별 route 주입.

---

## 3. 변경 파일 목록

| 파일 | 변경 | 내용 |
|---|---|---|
| `packages/operator-core-ui/src/dashboard/OperatorRoleGuideCard.tsx` | **신규** | KPA 인라인 카드 → 공통 컴포넌트 추출 (service-neutral, 링크 prop) |
| `packages/operator-core-ui/src/index.ts` | 수정 | `OperatorRoleGuideCard` + 타입 export |
| `services/web-kpa-society/src/pages/operator/KpaOperatorDashboard.tsx` | 수정 | 인라인 함수 제거 → 공통 import, `guideHref="/guide/for/operator"`, 미사용 `Link` import 제거 |
| `services/web-glycopharm/src/pages/operator/GlycoPharmOperatorDashboard.tsx` | 수정 | 공통 카드 추가 (aboveBlocks 최상단), `guideHref="/guide/usage"` |
| `services/web-k-cosmetics/src/pages/operator/KCosmeticsOperatorDashboard.tsx` | 수정 | 공통 카드 추가 (aboveBlocks 최상단), `guideHref="/guide/usage"` |

---

## 4. 공통 컴포넌트 위치 / 적용 방식

- 위치: `@o4o/operator-core-ui` → `dashboard/OperatorRoleGuideCard.tsx`
- 소비 방식: 패키지 `main`/`exports` 가 `src/index.ts` 직접 참조 (source) → 별도 dist 빌드 불요
- 세 서비스 모두 동일 컴포넌트 인스턴스 사용 → 카드 구조/문구/톤 완전 동일

---

## 5. 서비스별 wrapper/config 차이 (정당한 차이)

| 항목 | KPA | GlycoPharm | K-Cosmetics |
|---|---|---|---|
| `guideHref` | `/guide/for/operator` | `/guide/usage` | `/guide/usage` |
| 카드 본문 | 동일 (공통) | 동일 (공통) | 동일 (공통) |

가이드 링크 route 차이는 **데드링크 방지** 목적 (3 route 모두 존재 확인). 미존재 시 링크 생략하도록 prop optional 설계.

---

## 6. route/menu/capability/API/backend/DB 무변경 확인

| 항목 | 변경 여부 |
|---|---|
| route path | ❌ 무변경 (기존 route 링크만 참조) |
| operator menu / sidebar / shell | ❌ 무변경 |
| capability / RBAC / guard | ❌ 무변경 |
| API / backend / DB / migration | ❌ 무변경 |
| 5-Block 내용 · 상품/주문 현황 화면 | ❌ 무변경 |
| 승인 흐름 위치 | ❌ 무변경 |
| Neture | ❌ 대상 외 |

순수 frontend 추가 UI 컴포넌트(안내 카드) 1종 공통화. 데드링크 0 / 기능 은폐 0.

---

## 7. TypeScript 결과

| 대상 | 결과 |
|---|---|
| web-kpa-society (`tsc --noEmit`) | ✅ EXIT 0 |
| web-k-cosmetics (`tsc --noEmit`) | ✅ EXIT 0 |
| web-glycopharm (`tsc -b --noEmit`) | ✅ EXIT 0 |
| operator-core-ui (소비처 typecheck로 간접 검증) | ✅ 오류 없음 |

## 8. build 결과

| 서비스 | 결과 |
|---|---|
| web-kpa-society | ✅ `✓ built in 21.14s` (exit 0) |
| web-k-cosmetics | ✅ `✓ built in 22.11s` (exit 0) |
| web-glycopharm | ✅ `✓ built in 12.27s` (exit 0) |

## 9. browser smoke 결과

본 변경은 미배포 상태이므로 **배포 후 검증 대상**(CLAUDE.md §8 — 브라우저 검증 = 배포 후).
현재 production 브라우저 접속은 변경 전 코드를 반영하므로 pre-commit smoke는 생략.
정적 검증(typecheck + build + route 존재 확인)으로 대체. 배포 후 확인 권장 항목:

- 세 서비스 `/operator` 상단에 동일 안내 카드 렌더
- 가이드 링크 클릭 시 각 서비스 정상 route 이동 (데드링크 없음)
- Axis/5-Block/sidebar/notification 회귀 없음
- console error/pageerror/4xx 없음

---

## 10. 남은 차이와 사유

| 남은 차이 | 사유 | 후속 |
|---|---|---|
| 축 metrics (KPA만 실시간) | backend KPI key 매핑 서비스별 상이, 성숙도 차 | 별도 WO |
| 축 구성·순서 (서비스별 상이) | "메뉴 구성 = 서비스 정체성" (CLAUDE.md) | 유지 (통일 비대상) |
| 보조 알림 (Alerts/Notice) | 서비스별 데이터 정당 차이 | 유지 |
| 5-Block 내용 | backend config 데이터 | WO 범위 외 |
| 가이드 링크 target route | 서비스별 guide 페이지 구조 차이 | 데드링크 방지 위해 의도적 차이 |

---

## 11. 완료 판정

- 코드/타입/빌드 단계: **PASS**
- 범위: 운영 철학 안내 카드 공통화 (합의된 최소 범위)
- 데드링크 0 / route·menu·capability·API·backend·DB 무변경
- 배포 후 브라우저 smoke로 최종 고정 권장
