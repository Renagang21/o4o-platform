# CHECK-O4O-CROSSSERVICE-OPERATOR-FORUM-MENU-LABEL-ORDER-PARITY-V1

Date: 2026-06-16

## Scope

Operator Forum 하위 메뉴 **라벨/순서 1차 정합** (config only). route/page 신규 생성, 공통 컴포넌트 추출, base route alias, analytics 공통화는 범위 외 (후속 WO).

선행: IR-O4O-CROSSSERVICE-OPERATOR-FORUM-MENU-UIUX-PARITY-AUDIT-V1
기준: KPA-Society = reference implementation

---

## 1. 변경 전 Forum 메뉴 비교

| 순서 | KPA-Society | GlycoPharm | K-Cosmetics |
|:---:|---|---|---|
| 1 | 포럼 운영 (`/operator/forum`) | 포럼 신청 (`/operator/forum-requests`) | 포럼 신청 (`/operator/forum-requests`) |
| 2 | 포럼 신청 관리 (`/operator/forum-requests`) | 포럼 삭제 요청 (`/operator/forum-delete-requests`) | 삭제 요청 (`/operator/forum-delete-requests`) |
| 3 | 포럼 목록 관리 (`/operator/forum-categories`) | 포럼 분석 (`/operator/forum-analytics`) | 포럼 분석 (`/operator/forum-analytics`) |
| 4 | 삭제 요청 (`/operator/forum-delete-requests`) | — | — |
| 5 | 포럼 분석 (`/operator/forum-analytics`) | — | — |

drift: `포럼 신청` vs `포럼 신청 관리`, `포럼 삭제 요청` vs `삭제 요청`.

---

## 2. 최종 Forum 메뉴 라벨/순서 (변경 후)

| 순서 | KPA-Society (불변) | GlycoPharm | K-Cosmetics |
|:---:|---|---|---|
| 1 | 포럼 운영 | **포럼 신청 관리** | **포럼 신청 관리** |
| 2 | 포럼 신청 관리 | **삭제 요청** | 삭제 요청 |
| 3 | 포럼 목록 관리 | 포럼 분석 | 포럼 분석 |
| 4 | 삭제 요청 | — | — |
| 5 | 포럼 분석 | — | — |

공통 라벨 3종이 3서비스 동일: `포럼 신청 관리` / `삭제 요청` / `포럼 분석`.
GP/KCos는 canonical 상대 순서(신청 관리 → 삭제 요청 → 분석) 유지. KPA 전용 `포럼 운영`/`포럼 목록 관리`는 해당 route/page가 KPA에만 존재하므로 그대로 유지(GP/KCos 미추가).

---

## 3. 서비스별 변경 내용

### KPA-Society
- 변경 없음. 이미 canonical (reference implementation).

### GlycoPharm — `services/web-glycopharm/src/config/operatorMenuGroups.ts`
- `포럼 신청` → `포럼 신청 관리`
- `포럼 삭제 요청` → `삭제 요청`
- `포럼 분석` 유지
- **UNIFIED_MENU + OPERATOR_MENU_ITEMS 두 구조 모두** 적용 (동일 블록 2곳).

### K-Cosmetics — `services/web-k-cosmetics/src/config/operatorMenuGroups.ts`
- `포럼 신청` → `포럼 신청 관리`
- `삭제 요청` 유지 (이미 canonical)
- `포럼 분석` 유지
- forum 그룹 1개 구조만 존재.

---

## 4. route/page 없는 항목 미추가 확인

- GP/KCos에 `포럼 운영`(`/operator/forum`)·`포럼 목록 관리`(`/operator/forum-categories`) 메뉴 **추가하지 않음** (해당 route/page 부재).
- 기존 3개 항목(신청/삭제요청/분석)의 라벨만 정합. ✅

## 5. path/capability/adminOnly 불변 확인

- 모든 항목 `path` 불변 (`/operator/forum-requests`, `/operator/forum-delete-requests`, `/operator/forum-analytics`).
- capability/adminOnly: 3서비스 forum 메뉴 항목 모두 menu config 레벨에 미정의 → 변경 없음.
- route alias/redirect 추가 없음. ✅

## 6. 다른 세션 WIP 미포함 확인

- 작업 전 GlycoPharm Content/Home parity WIP(WO-O4O-GLYCOPHARM-OPERATOR-CONTENT-KPA-PARITY-P1-V1)를 먼저 커밋 분리(`5945029fa`).
- 본 WO 커밋은 forum 라벨 변경 2개 파일만 path-specific staging. Content/LMS/자료실/매장 메뉴, Neture 미포함. ✅

---

## 7. TypeScript 결과

- `glycopharm-web` (`tsc --noEmit -p services/web-glycopharm/tsconfig.json`): **PASS** (에러 0)
- `@o4o/web-k-cosmetics` (`tsc --noEmit -p services/web-k-cosmetics/tsconfig.json`): **PASS** (에러 0)

## 8. Smoke 결과 / 보류 사유

- 브라우저 smoke: **보류**. 본 변경은 menu config 라벨 문자열만 수정(path/구조/route 불변)이며 TypeScript + 정적 라벨 확인으로 검증됨. 실 DOM smoke는 배포/실행 환경 필요로 후속 배포 검증 시 함께 확인 권장.

---

## 9. 후속 WO 후보

- WO-O4O-CROSSSERVICE-OPERATOR-FORUM-ROUTE-ALIAS-PARITY-V1 — GP/KCos `/operator/forum` base redirect alias, 진입 통일.
- WO-O4O-CROSSSERVICE-OPERATOR-FORUM-ANALYTICS-UI-COMMONIZATION-V1 — forum-analytics 공통 컴포넌트 추출 (복제 3벌 → 1).
- WO-O4O-CROSSSERVICE-OPERATOR-FORUM-DASHBOARD-UI-PARITY-V1 / -CATEGORIES-PARITY-V1 — 운영 허브·목록 관리 GP/KCos 이식 (사업 필요성 판단 선행).

---

## 최종 판정

PASS — 3서비스 Forum 공통 메뉴(신청 관리/삭제 요청/분석) 라벨·상대 순서 정합 완료. route/page 없는 항목 미추가, path/capability 불변, 다른 세션 WIP 미포함, TypeScript 2서비스 PASS. 진정한 parity(기본 진입 통일·analytics 공통화)는 후속 WO 필요.
