# CHECK-O4O-GLYCOPHARM-OPERATOR-CONTENT-SUBMENU-ALIGNMENT-V1

> **작업명:** WO-O4O-GLYCOPHARM-OPERATOR-CONTENT-SUBMENU-ALIGNMENT-V1
> **유형:** GlycoPharm 운영자 Content 하위 메뉴 IA 정비 (KPA 정합) + 콘텐츠 허브 화면 포팅. frontend-only, additive.
> **결과: PASS (typecheck) — Content 그룹 = 공지사항/뉴스 · Home 편집 · 콘텐츠 허브 · 설문조사 관리. '문의 관리' 메뉴 노출 제거(route/page/backend 무변경). web-glycopharm `tsc -b` exit 0. browser smoke 는 배포 후 권장.**
> 선행: 콘텐츠 허브 backend 의존성 조사 → B안(라우트+페이지 포팅, 미지원 기능 숨김) — 2026-06-17

---

## 1. 결정 배경

- **설문조사 관리** `/operator/surveys` — GlycoPharm 라우트 **이미 존재**(App.tsx:912) → 메뉴 추가만으로 안전.
- **문의 관리** `/operator/contacts` — route/page/backend 존속, **메뉴 노출만** 제거.
- **콘텐츠 허브** `/operator/docs` — GlycoPharm 라우트 **부재**. KPA `OperatorContentHubPage` 는 `/api/v1/kpa/contents`(+ AI/copy-to-store) 하드코딩. 이전 WO(operatorMenuGroups.ts) 가 "backend/API/DB 포함 후속 WO 에서 추가" 로 보류했던 항목.
- GlycoPharm backend 현황: `glycopharm_contents` + `/api/v1/glycopharm/contents` (GET 목록·상세 / POST 등록 / PATCH 수정 / DELETE 삭제) **존재**. copy-to-store · AI(summarize/extract/tag) **부재**.
- **택안 B (사용자 승인):** KPA 페이지를 GlycoPharm 계약으로 포팅하되, backend 미구현 기능은 신규 구현하지 않고 노출하지 않음.

## 2. 변경 파일 (3 + CHECK)

| 파일 | 변경 |
|------|------|
| `services/web-glycopharm/src/pages/operator/OperatorContentHubPage.tsx` | **신규** — KPA 포팅. `/api/v1/glycopharm/contents` 연동(목록/등록/수정/삭제) |
| `services/web-glycopharm/src/App.tsx` | lazy import + `<Route path="docs">` 추가 |
| `services/web-glycopharm/src/config/operatorMenuGroups.ts` | content 그룹: 콘텐츠 허브·설문조사 관리 추가, 문의 관리 제거 (UNIFIED_MENU) |

## 3. 콘텐츠 허브 포팅 — GlycoPharm 계약 정합 & 미지원 기능 제거

- 엔드포인트: `/api/v1/kpa/contents` → `/api/v1/glycopharm/contents` (목록/등록/수정/삭제 4종 모두 실재).
- `status` enum: KPA `draft|ready` → GlycoPharm `draft|published|private`(초안/공개/비공개). 백엔드 `VALID_STATUSES` 와 일치.
- 본문: KPA `blocks`(JSON) → GlycoPharm `body`(text). 태그 최소 1개 필수(프론트·백엔드 공통 정책).
- **미노출(backend 부재):** 내 공간에 복사(copy-to-store) 버튼 제거 · AI 요약/추출/태그 미노출 · 상세(detail) 화면 미생성. 제목 클릭은 detail route 대신 **수정 모달**을 연다 → orphan route/404 0.
- **신규 backend/DB/endpoint 0** (CLAUDE.md Shared Module Change Rule 준수 — route 없는 메뉴 노출 0 / 기능 은폐 0).

## 4. 불변 / 미변경 확인

- contact: `/operator/contacts` route·`OperatorContactInquiriesPage`·contact API/DB/접수/알림/자동회신 **무변경** (메뉴 노출만 제거).
- KPA / K-Cosmetics / Neture 메뉴·페이지 **무변경**.
- backend / migration / package·lock **변경 0**.
- 설문조사 라우트(`/operator/surveys`) 기존 구현 그대로 연결(신규 0).
- deprecated `OPERATOR_MENU_ITEMS` 는 미소비 경로(active = `UNIFIED_MENU` via `OperatorLayoutWrapper`) — 미변경.

## 5. 검증

- **typecheck PASS:** `services/web-glycopharm` `tsc -b` exit 0.
- 정적: 사이드바 active 경로 = `OperatorLayoutWrapper` → `filterMenuByRole(UNIFIED_MENU)`; content 그룹 capability = `CONTENT_MANAGEMENT`(ENABLED) → 그룹 노출, 신규 2항목 반영. `/operator/docs`·`/operator/surveys` 라우트 실재 → 데드링크 0.
- **browser smoke 미수행** — 배포 후 권장(SMOKE-...-POST-DEPLOY):
  1. `/operator` 진입 → Content 펼침: 공지사항/뉴스 · Home 편집 · 콘텐츠 허브 · 설문조사 관리 노출
  2. '문의 관리' 사이드바 미노출
  3. 콘텐츠 허브/설문조사 클릭 시 404/blank 없음
  4. KPA operator 메뉴 무회귀

## 6. 완료 판정

**PASS (typecheck).** Content 그룹 KPA 4-항목 정합 + 콘텐츠 허브 실동작 페이지(GlycoPharm 계약, 미지원 기능 숨김) + 문의 관리 메뉴 제거(기능 보존). backend/DB/타서비스 변경 0. browser smoke 는 배포 후.

---

*Date: 2026-06-17 · GlycoPharm operator Content 하위 메뉴 KPA 정합 · 콘텐츠 허브 `/operator/docs` 포팅(`/api/v1/glycopharm/contents`, copy-to-store/AI/detail 미노출) · 설문조사 관리 기존 route 연결 · 문의 관리 메뉴 노출만 제거 · web-glycopharm tsc -b exit 0 · backend/DB/KPA/KCos/Neture 무변경.*
