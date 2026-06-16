# CHECK — O4O Cross-Service Operator Forum Axis · Live Smoke V1

> 배포 후 Forum 축 3서비스 라이브 smoke. destructive action 은 **실행하지 않고** 버튼/확인 UI 표시만 확인.
>
> - 일자: 2026-06-16
> - 대상: KPA-Society / GlycoPharm / K-Cosmetics operator 화면 (deployed)
> - 검증 커밋: `b7c41195`(forum-categories) 포함된 배포 — Web Services deploy run `27622907554`(sha `a4e93fc1e`, success) 기준
> - 도구: Playwright(chromium, headless), 운영자 통합 계정(SSOT `docs/local/TEST-ACCOUNTS.local.md`, env 주입 — 자격증명 비기재)
>
> ## 판정: **PASS** (3서비스)

---

## 1. 검증 범위

각 서비스 운영자 로그인 후 hard-nav:
- `/operator/forum` (read-only 운영 hub)
- `/operator/forum-analytics` (공통 분석)
- `/operator/forum-categories` (포럼 목록 관리)
- Forum 메뉴 canonical 5항목
- categories destructive(비활성/활성/영구삭제) 버튼·문구 **표시만** 확인 (클릭/실행 없음)
- console error / network 4xx·5xx 수집

---

## 2. 결과 요약

| 서비스 | 로그인 landing | `/operator/forum` | `/operator/forum-analytics` | `/operator/forum-categories` | 메뉴 5항목 | destructive 표시 | console/4xx |
|---|---|---|---|---|---|---|---|
| KPA-Society | `/admin/kpa-dashboard` | h1 "포럼 운영" ✅ | h1 "포럼 분석" ✅ | h1 "포럼 목록 관리" ✅ | 5/5 ✅ | 비활성·완전삭제·검색 ✅ | legal-docs 404 (무관) |
| GlycoPharm | `/admin` | ✅ | ✅ | ✅ | 5/5 ✅ | ✅ | 0 / 0 |
| K-Cosmetics | `/admin` | ✅ | ✅ | ✅ | 5/5 ✅ | ✅ | 0 / 0 |

- 운영자 계정(`sohae2100`)은 multi-role 로 로그인 시 `/admin` landing → operator route 는 hard-nav 로 진입(정상).
- 3 route 모두 `finalUrl == 요청 URL` (redirect-away 없음 — read-only hub 가 redirect 아닌 실제 page 로 렌더 확인).

---

## 3. 메뉴 canonical 5항목 (3서비스 공통 확인)

포럼 운영 / 포럼 신청 관리 / 포럼 목록 관리 / 삭제 요청 / 포럼 분석 — 3서비스 모두 5/5 present.

---

## 4. destructive action 안전 확인

- categories 화면에서 **비활성화 / 완전 삭제(영구 삭제) 어휘 + 검색/상태필터 UI 렌더 확인** (DOM/text + 스크린샷).
- **실제 비활성/활성/영구삭제 버튼을 클릭하거나 API 를 호출하지 않음** (smoke 스크립트에 destructive click 경로 없음).
- hardDelete 안전장치(delete-check·409 차단·확인 문구)는 코드/배포 기준 보존(이전 WO CHECK §7-8). 실행 미수행으로 차단 동작 자체는 본 smoke 범위 외(표시 확인만).

---

## 5. console / network 관찰

- GlycoPharm / K-Cosmetics: console error 0, 4xx·5xx 0.
- KPA: 404 4건 — 전부 `api.neture.co.kr/.../policies/terms|privacy`, `.../kpa/legal/documents/published/terms|privacy` (법정정보/약관 문서 미게시). **footer/policy 로딩 유래, Forum 과 무관**한 기존 이슈. Forum route/page 자체 에러 없음.

---

## 6. 스크린샷

`C:/tmp/smoke-{kpa,gp,kcos}-{forum,forum-analytics,forum-categories}.png` (로컬, 비커밋).

---

## 7. 완료 판정

- ✅ 3서비스 `/operator/forum` read-only hub 정상 렌더 (redirect 아닌 실 page)
- ✅ 3서비스 `/operator/forum-analytics` 정상
- ✅ 3서비스 `/operator/forum-categories` 정상 렌더, destructive 컨트롤 표시
- ✅ 3서비스 Forum 메뉴 canonical 5항목
- ✅ destructive action 미실행 (표시 확인만)
- ✅ Forum 관련 console/4xx 0 (KPA 의 legal-docs 404 는 무관)

**Forum 축 3서비스 parity — 배포 라이브 smoke PASS.**
