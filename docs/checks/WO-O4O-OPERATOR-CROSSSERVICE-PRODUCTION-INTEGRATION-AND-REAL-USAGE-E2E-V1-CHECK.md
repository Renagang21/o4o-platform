# WO-O4O-OPERATOR-CROSSSERVICE-PRODUCTION-INTEGRATION-AND-REAL-USAGE-E2E-V1 — CHECK

- **작성일**: 2026-08-14
- **대상**: KPA-Society / K-Cosmetics / Neture / PharmacyHub (공식 4서비스) · GlycoPharm(공유 모듈 회귀만)
- **검증 방식**: 프로덕션 도메인, 실제 계정 로그인부터 시작한 브라우저(Playwright chromium) 전수 순회
  - desktop 1440×900 · mobile 390×844 · 새로고침 · deep link 직접 진입 · 실 API 응답 수집
  - 자격증명은 `docs/local/TEST-ACCOUNTS.local.md`(git 추적 제외) 참조. 본 문서에 값 기록 없음.

---

## 1. main 통합 · 배포

| 항목 | 결과 |
|------|------|
| Operator 공통화 통합 | **선행 세션에서 완료** — merge `fa62c8052` (`work/operator-commonization-v1` → main), WO 문서 `b869dc64a` |
| 본 WO 수정 커밋 | `2afb5925a` — 프로덕션 실사용 E2E 에서 확인된 결함 4건 |
| Deploy Web Services | `2afb5925a` **success** |
| Deploy API Server | `2afb5925a` **success** |
| Deploy Admin Dashboard | `2afb5925a` **success** |
| CI Pipeline | `2afb5925a` 는 후속 커밋(`86d73c011`) 진입으로 concurrency **cancelled** — 동일 트리를 포함한 최신 main 런에서 수행 |
| 로컬 검증 | api-server `tsc --noEmit` 0 · operator-ux-core `tsc --noEmit` 0 · 변경 4파일 `eslint` 0 |

---

## 2. 서비스별 실사용 결과

| 서비스 | 로그인 | /operator | 메뉴 수 / 검증 route | 조회 E2E | write E2E | desktop·mobile | white·JS·dead link | 판정 |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **KPA-Society** | 200 | PASS | 37 / 38 | PASS | **PASS** (생성·수정·발행·보관·삭제) | PASS (모바일 결함 1건 수정) | 0 / 0 / 0 | **PASS** |
| **K-Cosmetics** | 200 | PASS | 30 / 31 | 결함 5건 → **수정 후 PASS** | **PASS** (수정 후) | PASS (모바일 결함 1건 수정) | 0 / 0 / 0 | **PASS** |
| **Neture** | 200 | PASS | 20 / 21 | PASS(정책성 403 3건 제외) | 미수행 — §5 참조 | PASS | 0 / 0 / 0 | **CONDITIONAL** |
| **PharmacyHub** | 200 | PASS | 2 / 4 | PASS | 미수행 — §5 참조 | PASS | 0 / 0 / 0 | **CONDITIONAL** |
| GlycoPharm(회귀만) | 200 | PASS | 36 / 37 | 공유 모듈 회귀 없음 | — | PASS (모바일 결함 동일 수정) | 0 / 0 / 0 | 회귀 없음 |

- `준비 중` / placeholder 화면: **0건**. (KPA·K-Cosmetics `/operator/lms` 의 "준비중" 은 강의 **상태 필터 라벨**, `/operator` 의 "운영자는 관리자가 아닙니다" 는 의도된 Operator UX 문구 — 오탐으로 판정)
- `429 /api/v1/notifications/unread-count` 다수는 스윕 속도로 인한 rate limit 산물이며 제품 결함이 아니다.

---

## 3. 수정한 실기능 결함 (커밋 `2afb5925a`)

### D1. K-Cosmetics `/operator/blog` 404 `STORE_NOT_FOUND` — backend 라우팅
`cosmetics.routes.ts` 가 store blog controller 를 `'/'` 에 mount 했다. 해당 controller 의 내부 경로는
`'/:slug/blog/*'` 이므로

1. 프론트가 호출하는 `/api/v1/cosmetics/stores/:slug/blog/staff` 가 **아예 라우팅되지 않았고**(Express 404),
2. 뒤에 등록되는 `/operator/blog` 요청이 `slug='operator'` 로 먼저 잡혀 404 `STORE_NOT_FOUND` 를 반환했다.

KPA(`kpa.routes.ts`) · GlycoPharm(`glycopharm.routes.ts`) 와 동일하게 `'/stores'` 로 정렬. 로직 변경 없음.
`/api/v1/cosmetics/:slug/blog` 를 소비하는 코드는 저장소 전체에 없고(공개 블로그는 통합 `/api/v1/stores/:slug/blog` 사용) 회귀 위험 없음.

### D2. K-Cosmetics 사이니지 HQ 4화면 400 `INVALID_SERVICE_KEY`
signage backend(`signage-role.middleware` `validServiceKeys`)의 표준 키는 `'cosmetics'` 인데 공통 콘솔 config 가
`'k-cosmetics'` 를 주입했다. HQ 미디어 / HQ 재생목록 / 템플릿 / 강제 콘텐츠 4화면이 전부 거부됐다.
`5728ec160` 에서 forced-content 만 고쳤던 것이 공통화(`1446396d3`) 때 원복된 **공통화 회귀**다.

### D3. 운영자 회원 콘솔 모바일 가로 스크롤 (KPA · K-Cosmetics · GlycoPharm 공통)
`MemberListLayout` 탭 줄이 390px 뷰포트에서 문서를 밀어냈다(`document.scrollWidth` 547 > 390).
탭 줄만 `overflow-x-auto` 로 스크롤시켜 페이지 가로 스크롤 제거. 수정 후 실측 `scrollWidth` 390.

### D4. PharmacyHub 공개 홈 역할별 진입점 "(준비 중)" 3건
세 영역 모두 실제 화면이 존재한다(매장 경영 셸 · 공급자 상품 제공 설정 · 운영자 대시보드/가입 승인).
낡은 표기를 실제 기능 설명으로 정정.

---

## 4. 배포 후 프로덕션 재검증

| 확인 | 결과 |
|------|------|
| `/api/v1/cosmetics/stores/:slug/blog/staff` | 404 → **401**(가드 도달 = 라우팅 정상) |
| `/api/v1/cosmetics/operator/blog/posts` | 404 → **401** |
| K-Cosmetics `/operator/blog` · 사이니지 HQ 4화면 | 5화면 모두 정상 렌더 · **API 오류 0** |
| KPA · K-Cosmetics `/operator/members` 390px | `scrollWidth` **390** (가로 스크롤 소멸) |
| PharmacyHub `/` · `/operator` · `/operator/memberships` | 정상 · "(준비 중)" 문구 소멸 |

---

## 5. write E2E

### 수행 (안전·복구 가능 범위)

운영자 HUB 블로그 상태 전이 전 구간을 **브라우저 실조작**으로 수행하고, 생성한 행을 전부 삭제했다.

| 서비스 | 생성 | 수정 | 발행 | 보관 | 삭제 | 잔여 |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|
| KPA-Society | POST 201 | PUT 200 | PATCH 200 | PATCH 200 | DELETE 200 | **0** |
| K-Cosmetics | POST 201 | — | PATCH 200 | PATCH 200 | DELETE 200 | **0** |

- 대상은 검증용으로 새로 만든 행뿐이며 기존 운영 데이터는 읽기만 했다.
- 발행 상태 노출 구간은 초 단위이고 즉시 보관·삭제했다. 검증 종료 후 목록 잔여 **0건** 재확인.

### 미수행 — 차단 요소 (완료 선언 보류 사유)

| 대상 | 필요한 것 | 사유 |
|------|-----------|------|
| PharmacyHub 가입 승인/반려 | **대기 상태의 테스트용 가입 신청 데이터** | 현재 대기 건은 실제 사용자 신청이라 승인/반려 시 운영 데이터를 훼손한다 |
| Neture AI 리포트 / AI 운영 / 운영자 알림 설정 | **`platform:super_admin` 자격증명** | 세 API 가 플랫폼 관리자 전용(정책). `TEST-ACCOUNTS` 에 해당 비밀번호가 없다 |

---

## 6. 정책성 403 / 데이터 갭 (수정하지 않음 · 보고)

| 항목 | 상태 | 판단 |
|------|------|------|
| Neture `/api/ai/card-report` · `/api/ai/operations` 403 | `requireAdmin` 게이트 | 권한 정책 변경은 CLAUDE.md 중지 조건 — 별도 WO |
| Neture `/api/operator/settings/notifications` 403 | 소스 주석에 **플랫폼 관리자 전용**임과 후속 WO 가 명시돼 있음 | 정책 결정 사항 — 별도 WO |
| GlycoPharm `/api/ai/admin/**` 403 6건 | 동일 성격 | GlycoPharm 은 본 WO 적용 대상 아님 |
| KPA 약관/개인정보 문서 404 2쌍 | `legal/documents/published/{terms,privacy}` 미게시 | 코드 결함 아닌 **콘텐츠 미등록** — 화면은 정상 폴백 |

---

## 7. 문서 정합

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건
(① Neture·GlycoPharm AI/알림 엔드포인트 서비스 운영자 스코프 정책 ② PharmacyHub 승인 E2E 용 테스트 가입 신청 데이터 시드)
