# CHECK-O4O-CROSSSERVICE-OPERATOR-FORUM-ROUTE-ALIAS-PARITY-V1

Date: 2026-06-16

## Scope

GlycoPharm / K-Cosmetics operator 영역의 `/operator/forum` **base 진입 통일** (redirect alias 추가). 운영 허브(OperatorForumPage) 화면 이식, forum-analytics 공통화는 범위 외 (후속 WO).

선행:
- IR-O4O-CROSSSERVICE-OPERATOR-FORUM-MENU-UIUX-PARITY-AUDIT-V1
- WO-O4O-CROSSSERVICE-OPERATOR-FORUM-MENU-LABEL-ORDER-PARITY-V1 (`80a869ec8`)

기준: KPA-Society = reference implementation (`/operator/forum` → OperatorForumPage 운영 허브 보유)

---

## 1. 문제

| 서비스 | `/operator/forum` base | 증상 |
|---|---|---|
| KPA | ✅ OperatorForumPage (운영 허브) | 정상 진입 |
| GlycoPharm | ❌ route 없음 | 직접 접근 시 catch-all → 404 |
| K-Cosmetics | ❌ route 없음 | 직접 접근 시 catch-all → 404 |

운영 허브 화면(OperatorForumPage)은 GP/KCos에 미이식 상태이므로, base 진입을 **첫 actionable 화면(`/operator/forum-requests`)으로 redirect** 하여 진입을 통일한다. 운영 허브 실제 이식은 후속 WO.

## 2. 충돌 안전성 확인

- GP `path="forum"`(App.tsx:578) / KCos `path="forum"`(App.tsx:456)는 `<MainLayout>` 하위 = **회원용 `/forum`** (ForumHubPage). operator 영역과 부모가 다름.
- operator 부모(`/operator/*`) 하위에는 `/operator/forum` route 부재 확인 → 신규 추가 충돌 없음.

---

## 3. 변경 내용

### KPA-Society
- 변경 없음 (이미 `/operator/forum` → OperatorForumPage 보유).

### GlycoPharm — `services/web-glycopharm/src/App.tsx`
- operator 부모 하위에 추가:
  ```tsx
  <Route path="forum" element={<Navigate to="/operator/forum-requests" replace />} />
  ```

### K-Cosmetics — `services/web-k-cosmetics/src/App.tsx`
- operator 부모 하위에 추가 (동일):
  ```tsx
  <Route path="forum" element={<Navigate to="/operator/forum-requests" replace />} />
  ```

`Navigate` 는 두 파일 모두 기존 import 존재. `replace` 적용(뒤로가기 히스토리 오염 방지).

---

## 4. 불변/미수행 확인

- 기존 forum 하위 route(`forum-requests` / `forum-delete-requests` / `forum-analytics`) path·component 불변.
- 운영 허브(OperatorForumPage) 화면 이식 안 함.
- forum-analytics 공통화 안 함.
- 메뉴 config(operatorMenuGroups.ts) 변경 안 함 — `/operator/forum`은 GP/KCos 메뉴에 노출하지 않음(운영 허브 미이식 상태이므로 메뉴 추가 보류, redirect는 직접 접근/대시보드 링크 대비 안전망).
- backend/API/DB/capability 변경 없음. Neture 미포함.

## 5. TypeScript 결과

- `glycopharm-web` (`tsc --noEmit -p services/web-glycopharm/tsconfig.json`): **PASS** (에러 0)
- `@o4o/web-k-cosmetics` (`tsc --noEmit -p services/web-k-cosmetics/tsconfig.json`): **PASS** (에러 0)

## 6. Smoke 결과 / 보류 사유

- 브라우저 smoke: **보류**. React Router `<Navigate replace>` 추가만으로 path/component 변경 없음. TS + 정적 라우트 구조 확인으로 검증. 실 redirect 동작은 후속 배포 검증 시 `/operator/forum` 접근 → `/operator/forum-requests` 이동 확인 권장.

---

## 7. 후속 WO 후보

- WO-O4O-CROSSSERVICE-OPERATOR-FORUM-ANALYTICS-UI-COMMONIZATION-V1 — forum-analytics 공통 컴포넌트 추출 (복제 3벌 → 1).
- WO-O4O-CROSSSERVICE-OPERATOR-FORUM-DASHBOARD-UI-PARITY-V1 — 운영 허브(OperatorForumPage) 공통화 + GP/KCos 이식. 이식 완료 시 본 redirect를 실제 허브 화면으로 교체하고 메뉴에 `포럼 운영` 추가.

---

## 최종 판정

PASS — GP/KCos `/operator/forum` base 진입을 `/operator/forum-requests` 로 통일(404 제거). KPA는 운영 허브 보유로 변경 없음. path/component 불변, 메뉴 미변경, TypeScript 2서비스 PASS. 운영 허브 실제 parity는 후속 DASHBOARD WO 필요.
