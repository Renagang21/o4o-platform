# CHECK-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1

- **WO**: WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1
- **작성일**: 2026-08-25
- **목적**: KPA ↔ PharmacyHub Community / My Store parity 트랙의 **종료**
- **census SSOT**: `docs/investigations/CHECK-O4O-KPA-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-CAPABILITY-PARITY-AUDIT-V1.md` (97 항목)

---

## 1. 최종 census (모집단 N = 97)

| 판정 | 건수 |
|---|---:|
| ADOPTED | 91 |
| PARTIAL_ADOPTION | 0 |
| MISSING_ADOPTION | 0 |
| INTENTIONAL_DIFFERENCE | 5 |
| OUT_OF_SCOPE | 1 |
| 미조사 | 0 |
| **합계** | **97** |

| 잔여 심각도 | 건수 |
|---|---:|
| P0 | 0 |
| P1 | 0 |
| P2 | 0 |

### INTENTIONAL_DIFFERENCE 5건 (근거)

| # | 항목 | 근거 |
|---|---|---|
| 41 | 강사 공개 프로필 | 강사 신청·승인 endpoint 가 `requireKpaAdmin` 이며 `/kpa/lms/*` 에만 mount 된다. PH 에 노출하면 dead navigation 이 된다 |
| 52 | 커뮤니티 사이니지 허브 | KPA 전용 회원 대면 축. GP/KCos 도 `/operator/signage/content` 아래에만 둔다. PH `signage_media` 는 org-scoped 라 서비스 전역 허브는 매장 자산 leakage 가 된다 |
| 78 | 온라인 판매 | `O4O-STORE-COMMERCE-BOUNDARY-V1` — 매장 경영자는 O4O 로 소비자에게 판매하지 않는다 |
| 85 | 운영자 HUB 게시·큐레이션 | `O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1` — PH baseline 에 공급자 역할이 없다 |
| 86 | 운영자 매장 승인·지원·검수 | 동일 baseline — 매장지원 operator capability 없음 |

### OUT_OF_SCOPE 1건

| # | 항목 | 근거 |
|---|---|---|
| 49 | 약사 자격·분회 | 약사회 단체 자격 도메인. PH 서비스 모델에 해당 도메인 없음 |

---

## 2. 영역별 결과

### 2-1. 공통 Operator Content/Resources console generic 확장
- `packages/operator-core-ui/src/modules/resources/` 를 config/capability 기반으로 확장 (`lifecycle.ts`, `ResourcesFormModal.tsx`, `types.ts`).
- `if (serviceKey === 'pharmacy-hub')` 분기 **0건** (packages 전역 grep 확인).
- 존재하지 않는 delete CTA / 불가능한 상태 전이 노출 없음 — `resources-lifecycle-contract.test.ts` 로 계약 고정.

### 2-2. PH operator Content/Resources 채택
- 원장은 `cms_contents` + `serviceKey='pharmacy-hub'`. **신규 table 생성 0건** (`pharmacy_hub_contents` 는 주석에만 등장 — 금지 사실의 기록).
- `/operator/content`, `/operator/community-contents`, `/operator/resources`, `/operator/lms`, `/operator/guide-contents`, `/operator/surveys` route + sidebar 진입점 모두 존재.

### 2-3. 기존 3서비스 회귀
- KPA / GlycoPharm / K-Cosmetics `npx tsc -b --force` 전부 EXIT=0.
- status / action / delete behavior 기본값 변경 없음 (공통 모듈은 capability 기본값을 기존 동작으로 유지).

### 2-4. 회원 Content write 최종 판정
- **ADOPTED.** `cms-content-member-authoring.ts` 로 공통 `cms_contents` 위에 회원 작성 경로를 연다.
- `/content/documents/new`, `/content/:id/edit`, `/resources/new`, `/resources/:id/edit` 라우트 존재.
- "현재 API 가 막혀 있음" 을 근거로 한 INTENTIONAL_DIFFERENCE 판정은 사용하지 않았다.

### 2-5. My Store 잔여 (9축)
- 자료 등록·관리(#64) · 사이니지 미디어/편성/플레이어(#69–71) · 다국어 상품 콘텐츠(#76) · 마케팅 분석(#77) · 외국인 여행객 판매 채널(#79) · 판매자 모집·신청(#80) — route + `PHARMACY_HUB_STORE_CONFIG` sidebar 진입점 모두 확보.
- 온라인 판매(#78)는 commerce boundary 근거로 INTENTIONAL_DIFFERENCE.

### 2-6. Signage partial 해소
- `signage/media`, `signage/schedules`, `signage/player`, `/store-owner/signage/play/:playlistId` 전부 구현·연결.
- 최종 census 에 `PARTIAL_ADOPTION` **0건**.

### 2-7. LMS 강사 축 (#39 퀴즈 / #40 과제·채점)
- 신규: `InstructorQuizBuilder.tsx`, `InstructorAssignmentEditor.tsx`, `InstructorSubmissionsPage.tsx`.
- 계약은 서비스 중립 `/lms/{quizzes,assignments}` · `/lms/instructor/{lessons/:id/submissions, submissions/:id/grade}` (`requireInstructor`). PH 전용 endpoint 신설 0건.
- `InstructorCourseEditPage` 의 "별도 작업선" placeholder 를 실제 편집기 mount 로 교체 — 동작하지 않는 UI 0건.

### 2-8. Home / Menu
- 회귀 확인만 수행. 재설계 없음. `operatorMenuGroups.ts` 의 `signage: 'common'` 은 group-mapping 표에만 존재하고 `UNIFIED_MENU` 에는 없어 dead navigation 을 만들지 않는다.

---

## 3. 검증 결과

| 검증 | 결과 |
|---|---|
| `apps/api-server` jest 전체 (origin/main rebase 후) | **193 suites / 3214 tests passed, exit 0** |
| PH 관련 spec 재확인 (13 suites) | **258 tests passed** |
| `packages/store-ui-core` vitest | 1 file / 18 tests passed |
| `packages/operator-core-ui` vitest | 4 files / 53 tests passed |
| `services/web-pharmacy-hub` `tsc -b --force` | EXIT=0 |
| `services/web-kpa-society` `tsc -b --force` | EXIT=0 |
| `services/web-glycopharm` `tsc -b --force` | EXIT=0 |
| `services/web-k-cosmetics` `tsc -b --force` | EXIT=0 |
| dead navigation 스캔 (nav config href → route) | **0건** |
| cross-service leakage (`serviceKey === 'pharmacy-hub'` in `packages/`) | **0건** |
| 신규 table | **0건** |

`packages/shared-space-ui` 에는 테스트 파일이 없다(vitest include 0). 해당 패키지의 회귀는 4개 서비스 typecheck 로 대체 검증했다.

origin/main rebase 시 `cms-content-mutation.handler.ts` 3-hunk 충돌을 해소했다.
upstream 의 serviceKey canonicalization(`resolveCmsRolePrefix` · `isSameCmsService`)을 살리고,
권한 판정은 공통 helper 한 벌(`hasCmsServiceOperatorRole`)로 유지했다. 양쪽 의도 모두 보존.

전체 monorepo build 는 수행하지 않았다 — 영향 범위별 검증(위 표)으로 대체했다 (WO §15 허용).

---

## 4. production verification

**NOT_PERFORMED.** 이 트랙의 코드 변경은 아직 배포되지 않았다. desktop 1440×900 / mobile 390×844 production smoke 는 배포 후 별도로 수행해야 한다.

---

## 5. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
