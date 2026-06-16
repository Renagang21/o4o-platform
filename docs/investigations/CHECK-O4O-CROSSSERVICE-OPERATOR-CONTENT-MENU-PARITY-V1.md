# CHECK-O4O-CROSSSERVICE-OPERATOR-CONTENT-MENU-PARITY-V1

> WO-O4O-CROSSSERVICE-OPERATOR-CONTENT-MENU-PARITY-V1
> KPA-Society / GlycoPharm / K-Cosmetics operator Content 하위 메뉴 정합화
> 작성일: 2026-06-16

---

## 0. 작업 성격

메뉴/route 연결 정합화 작업. backend/DB/API/migration/capability **무변경**. dead link 생성 금지.

---

## 1. 변경 전 3서비스 Content 메뉴 비교

| 순서 | KPA-Society | GlycoPharm (작업 시작 시 working tree) | K-Cosmetics |
|---|---|---|---|
| 1 | 공지사항/뉴스 → `/operator/content` | 공지사항/뉴스 → `/operator/content` | 공지/뉴스 관리 → `/operator/content-management` |
| 2 | Home 편집 → `/operator/community` | Home 편집 → `/operator/community` | 설문조사 관리 → `/operator/surveys` |
| 3 | 콘텐츠 허브 → `/operator/docs` | — | — |
| 4 | — | — | — |

> **중요:** GlycoPharm 의 `operatorMenuGroups.ts` 는 본 WO 착수 시점에 **다른 세션의 미커밋 WIP**(WO-O4O-GLYCOPHARM-OPERATOR-CONTENT-KPA-PARITY-P1-V1) 로 이미 수정되어 있었다. 해당 WIP 가 이미:
> - 사용자 결정 #1 (가이드라인 관리 legacy 제거) 완료 — `GuidelineManagementPage.tsx` 삭제(working tree `D`)
> - 사용자 결정 #2 (Home 편집 추가) 완료
> - 부수적으로 `공지/뉴스 관리`/`설문조사 관리` 제거, `콘텐츠 허브`는 후속 WO 로 보류
>
> → **세션 혼입 금지 원칙 + 중단 기준 #6 (다른 세션 WIP 충돌)** 에 따라 본 WO 는 GlycoPharm 파일을 건드리지 않았다.

---

## 2. route/page 존재 여부 (정적 검증)

| 항목 | KPA route | K-Cosmetics route | GlycoPharm route |
|---|---|---|---|
| 공지사항/뉴스 | `content` → `ContentManagementPage` ✅ | `content-management` → `OperatorContentPage` ✅ | `content` ✅ (`guidelines`·`content-management` → `/operator/content` redirect) |
| Home 편집 | `community` → `CommunityManagementPage` ✅ | **없음** ❌ | `community` ✅ |
| 콘텐츠 허브 | `docs` → `OperatorContentHubPage` ✅ | **없음** ❌ | **없음** ❌ |
| 설문조사 관리 | `surveys` → `OperatorSurveyListPage` ✅ | `surveys` → `OperatorSurveyListPage` ✅ | (WIP 에서 메뉴 제거) |

- KPA route: `services/web-kpa-society/src/routes/OperatorRoutes.tsx`
- K-Cosmetics route: `services/web-k-cosmetics/src/App.tsx` (operator block ~L704–L739)
- GlycoPharm route: `services/web-glycopharm/src/App.tsx`

---

## 3. 최종 Canonical Content 메뉴

목표 canonical 4항목:
1. 공지사항/뉴스
2. Home 편집
3. 콘텐츠 허브
4. 설문조사 관리

route 부재 항목은 dead link 방지를 위해 미추가 (중단 기준 #1/#3 적용).

---

## 4. 서비스별 변경 내용

### KPA-Society (본 WO 변경 ✅)
- **설문조사 관리 → `/operator/surveys` 추가** (route 기존 존재, line 179 `OperatorSurveyListPage`)
- 결과: 공지사항/뉴스 · Home 편집 · 콘텐츠 허브 · 설문조사 관리 = **canonical 4항목 완전 정합** ✅
- `UNIFIED_MENU` + deprecated `OPERATOR_MENU_ITEMS` 양쪽 content 블록 동기 갱신

### K-Cosmetics (본 WO 변경 ✅)
- **라벨 정합**: `공지/뉴스 관리` → `공지사항/뉴스` (path `/operator/content-management` 불변)
- 설문조사 관리 유지
- Home 편집 / 콘텐츠 허브: **route 부재 → 미추가** (dead link 방지). 후속 별도 WO 필요
- 결과: 공지사항/뉴스 · 설문조사 관리 (canonical 1·4 항목, 2·3 은 route 부재로 보류)

### GlycoPharm (본 WO 미변경 — 다른 세션 WIP 처리 중)
- 작업 시작 시점 working tree 가 이미 canonical P1 상태(공지사항/뉴스 · Home 편집)
- 사용자 결정 #1(가이드라인 제거)·#2(Home 편집 추가) 는 **WIP 에서 이미 충족**
- 콘텐츠 허브/설문조사 관리는 GlycoPharm route 부재 또는 WIP 정책상 보류
- **세션 혼입 금지 → 본 WO 는 파일 미터치**

---

## 5. GlycoPharm 가이드라인 관리 제거 근거
- `guidelines` route 는 `<Navigate to="/operator/content" replace />` redirect 만 존재 (실 페이지 없음, legacy)
- `GuidelineManagementPage.tsx` 는 다른 세션 WIP 에서 이미 삭제됨 (working tree `D`)
- 본 WO 범위 외(다른 세션 처리) — 중복 작업/충돌 회피

## 6. Home 편집 연결 결과
- KPA: 기존 존재 (변경 없음)
- GlycoPharm: WIP 에서 이미 추가됨 (본 WO 미터치)
- K-Cosmetics: route 부재 → 미연결 (보류, 후속 WO)

## 7. 설문조사 관리 연결 결과
- KPA: **본 WO 에서 추가** (route 존재) ✅
- K-Cosmetics: 기존 존재 (변경 없음)
- GlycoPharm: WIP 정책상 보류

## 8. K-Cosmetics 정합 결과
- 라벨 `공지사항/뉴스` 통일 완료
- 설문조사 관리 유지
- Home 편집·콘텐츠 허브는 route 부재로 보류 → 후속 WO

## 9. dead link 없음 확인
- KPA `설문조사 관리` → `/operator/surveys` route 정적 확인됨 (OperatorRoutes.tsx:179) — dead link 아님
- K-Cosmetics 라벨만 변경, path `/operator/content-management` route 정적 확인됨 (App.tsx:723) — dead link 아님
- route 부재 항목(K-Cos Home 편집/콘텐츠 허브)은 **미추가** — dead link 0

## 10. 무변경 확인 (route/menu 외)
- backend / API / DB / migration / capability: **무변경**
- route/path: 신설·삭제 없음 (KPA surveys·KCos content-management 기존 route 재사용)
- adminOnly/capability 플래그: 불변
- Neture: 미변경
- Content 외 메뉴(users/approvals/stores/lms/forum/signage 등): 미변경
- DomainIASidebar / OperatorAreaShell / operator dashboard: 미변경

## 11. TypeScript 결과
- `web-kpa-society` tsc --noEmit: **PASS (EXIT 0)**
- `web-k-cosmetics` tsc --noEmit: **PASS (EXIT 0)**

## 12. build 결과
- `web-kpa-society` build: **PASS** (✓ built in 13.90s)
- `web-k-cosmetics` build: **PASS** (✓ built in 12.29s)

## 13. browser smoke 결과 / 보류 사유
- **보류**. 변경은 순수 메뉴 config(라벨 1건 + 기존 route 메뉴 항목 1건 추가)이며, 연결 route 존재가 코드 레벨에서 정적 확인됨(설문조사 관리 → OperatorRoutes.tsx:179, 공지사항/뉴스 → App.tsx:723). 신규 route/page 신설이 없어 dead link 가 구조적으로 발생 불가. 배포 후 운영자 계정 smoke 는 후속 정기 검증에서 수행 권장.

## 14. 남은 차이와 사유
| 서비스 | canonical 대비 미달 항목 | 사유 | 후속 |
|---|---|---|---|
| K-Cosmetics | Home 편집 | `/operator/community` route 부재 | page/route 신설 WO |
| K-Cosmetics | 콘텐츠 허브 | `/operator/docs` route 부재 | page/route 신설 WO |
| GlycoPharm | 콘텐츠 허브 / 설문조사 관리 | route 부재 / 다른 세션 WIP 정책 | 별도 WO (이미 진행 중 WIP) |
| K-Cos 공지 path | `/operator/content-management` (KPA/GP 는 `/operator/content`) | route 가 서비스별로 다름 (메뉴 정합 범위 외, route 변경=dead link 위험) | 보류 |

## 15. 완료 판정
- **부분 완료 (Content 메뉴 정합 — route 존재 범위 내 최대 정합 달성)**
- KPA: canonical 4항목 완전 정합 ✅
- K-Cosmetics: 라벨 정합 + 존재 항목 연결 ✅ (2항목 route 부재로 보류)
- GlycoPharm: 다른 세션 WIP 가 이미 처리 — 세션 혼입 회피 위해 미터치
- dead link 0, backend/DB/API/capability 무변경, TypeScript/build PASS
