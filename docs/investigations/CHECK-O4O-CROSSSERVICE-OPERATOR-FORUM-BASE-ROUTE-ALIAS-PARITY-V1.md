# CHECK — WO-O4O-CROSSSERVICE-OPERATOR-FORUM-BASE-ROUTE-ALIAS-PARITY-V1

> KPA / GlycoPharm / K-Cosmetics operator **Forum 기본 진입(`/operator/forum`)** 동작 통일 검증.
>
> 선행:
> - IR-O4O-CROSSSERVICE-OPERATOR-FORUM-MENU-UIUX-PARITY-AUDIT-V1
> - WO-O4O-CROSSSERVICE-OPERATOR-FORUM-MENU-LABEL-ORDER-PARITY-V1 (커밋 `80a869ec8`, 라벨·순서 정합 완료)
>
> - 일자: 2026-06-16
> - 범위: `/operator/forum` base route redirect/alias 동작 검증 only (신규 dashboard/page 생성·hub 이식 없음)
> - 대상: `web-kpa-society`, `web-glycopharm`, `web-k-cosmetics`
> - 제외: Neture, backend/API/DB, capability, menu label/order, forum-analytics 공통화, 포럼 운영/목록 관리 이식
>
> **결론: 코드 변경 불필요(no-op).** 세 서비스 모두 `/operator/forum` 가 안전하게 동작하며 redirect 기준을 이미 충족 — 404/dead route 없음. 본 CHECK 는 검증 기록.

---

## 1. 변경 전(=현재) `/operator/forum` 동작

| 서비스 | route 정의 | `/operator/forum` 동작 | 실 진입 화면 |
|---|---|---|---|
| KPA-Society | `src/routes/OperatorRoutes.tsx:139` — `<Route path="forum" element={<OperatorForumPage />} />` | 실 hub 페이지 렌더 | OperatorForumPage (포럼 운영 hub) |
| GlycoPharm | `src/App.tsx:828` — `<Route path="forum" element={<Navigate to="/operator/forum-requests" replace />} />` | 포럼 신청 관리로 redirect | ForumRequestsPage |
| K-Cosmetics | `src/App.tsx:722` — `<Route path="forum" element={<Navigate to="/operator/forum-requests" replace />} />` | 포럼 신청 관리로 redirect | ForumRequestsPage |

- 세 서비스 모두 `/operator/forum` 접근 시 404/dead route 없음.
- GP/K-Cos 는 분석(`forum-analytics`)이 아니라 **포럼 신청 관리(forum-requests)** = 첫 actionable 화면으로 redirect (WO 권장 기준 충족).
- redirect 는 `WO-...-FORUM-MENU-LABEL-ORDER-PARITY-V1` 작업과 함께 interim 으로 설정됨 (App.tsx 주석: "첫 actionable 화면(forum-requests)로 redirect. 운영 허브 이식은 후속 WO").

---

## 2. 서비스별 redirect/alias 결정

| 서비스 | 결정 | 사유 |
|---|---|---|
| KPA-Society | 변경 없음 — 기존 `OperatorForumPage` hub 유지 | reference, 실 hub 존재 |
| GlycoPharm | 변경 없음 — 기존 `Navigate → /operator/forum-requests` 유지 | 이미 안전 redirect, 대상 존재 |
| K-Cosmetics | 변경 없음 — 기존 `Navigate → /operator/forum-requests` 유지 | 이미 안전 redirect, 대상 존재 |

---

## 3. 변경 파일 목록

- **없음** (코드 변경 불필요).
- 본 CHECK 문서만 신규 생성.

---

## 4. redirect 대상 route 존재 확인

| redirect 대상 | GlycoPharm | K-Cosmetics |
|---|---|---|
| `/operator/forum-requests` | ✅ `App.tsx:829` — `<Route path="forum-requests" element={<ForumRequestsPage />} />` | ✅ `App.tsx:724` — `<Route path="forum-requests" element={<ForumRequestsPage />} />` |

redirect 대상이 두 서비스 모두 실 page 로 존재 → dead redirect 없음.

---

## 5. 기존 Forum 메뉴 라벨·순서 불변 확인

- 메뉴 config(`operatorMenuGroups.ts`) 미변경 — 본 작업은 route alias 검증이며 menu 미수정.
- 3서비스 공통 라벨 유지: 포럼 신청 관리 / 삭제 요청 / 포럼 분석 (이전 WO `80a869ec8` 정합 상태 그대로).
- KPA 전용 포럼 운영 / 포럼 목록 관리 유지.

---

## 6. backend / API / DB / capability 무변경 확인

- route 레벨 redirect 동작만 검증. backend/API/DB/migration 변경 없음.
- capability 신설 없음. forum 메뉴/route 는 capability/adminOnly 미사용.

---

## 7. TypeScript 결과

- 코드 변경이 없으므로 신규 타입 영향 없음.
- 현 origin/main 빌드 통과 상태(라우트·메뉴) 그대로 유지.

---

## 8. smoke 결과 / 보류 사유

- 코드 변경 없음 → 배포 변화 없음. 별도 smoke 불필요(보류).
- 현행 동작 권장 확인:
  - KPA `/operator/forum` → 포럼 운영 hub 렌더
  - GlycoPharm `/operator/forum` → `/operator/forum-requests`(포럼 신청 관리) 이동
  - K-Cosmetics `/operator/forum` → `/operator/forum-requests`(포럼 신청 관리) 이동
  - 404/pageerror 없음

---

## 9. 후속 WO 후보

1. `forum-analytics` 공통화 — ForumAnalyticsPage(GP/KCos) · ForumAnalyticsDashboard(KPA) 공통 컴포넌트 추출.
2. 포럼 운영(hub) / 포럼 목록 관리(forum-categories) GlycoPharm·K-Cosmetics 이식 — route/page 신설 동반, 사업 필요성 판단 선행. 이식 완료 시 GP/K-Cos 의 `/operator/forum` redirect 를 실 hub 로 승격.

---

## 10. 완료 판정

- ✅ `/operator/forum` 3서비스 안전 동작 (404/dead route 없음)
- ✅ GP/K-Cos redirect 대상 = 포럼 신청 관리(forum-requests), 분석 화면 미사용
- ✅ redirect 대상 route 존재
- ✅ menu label/order 불변 / backend·API·DB·capability 무변경 / 다른 세션 WIP 미포함
- ✅ 코드 변경 불필요(interim redirect 로 이미 충족) — **Forum 기본 진입 정렬 완료 고정 가능**

→ Forum 축은 이로써 "메뉴 라벨·순서 + 기본 진입" 까지 정렬 완료. 다음은 §9 후속 WO.
