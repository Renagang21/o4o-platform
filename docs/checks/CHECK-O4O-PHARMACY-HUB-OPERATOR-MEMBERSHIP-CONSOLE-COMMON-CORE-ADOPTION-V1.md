# CHECK-O4O-PHARMACY-HUB-OPERATOR-MEMBERSHIP-CONSOLE-COMMON-CORE-ADOPTION-V1

- **WO**: WO-O4O-PHARMACY-HUB-OPERATOR-MEMBERSHIP-CONSOLE-COMMON-CORE-ADOPTION-V1
- **일자**: 2026-08-13
- **작업공간**: worktree `C:/tmp/o4o-agent-e-operator-common` · branch `work/operator-commonization-v1`
- **선행**: WO-...-OPERATOR-SHELL-...-V1(`9ad2867b2`) · WO-...-SUPPLIER-SHELL-...-V1(`556429826`)

---

## 1. 계약 비교 (조사)

| 축 | 현행 PharmacyHub | 공통 `OperatorMembersConsolePage` |
|---|---|---|
| 행 단위 | `service_memberships` 1건 (가입 신청) | `users` 1건 (회원) |
| API | 4개뿐 — list / detail / approve / reject | list + `stats` + `listAll` + batch + password + edit + delete |
| 업무 의미 | 가입 승인·반려 | 회원 관리 |
| 반려 사유 | **필수** (reject body) | 채널 없음 |
| 상세 링크 | `/operator/memberships/:membershipId` | `/operator/users/:userId` 하드코딩 |

백엔드 `PharmacyHubMembershipConsoleController` 헤더가 근거다 — PharmacyHub 는 공통
`/api/v1/operator/members` 라우터에 `pharmacy-hub:operator` 를 **의도적으로 추가하지 않았고**,
범위를 "목록 / 상세 / 승인 / 반려" 로 못박고 있다. 따라서 공통 콘솔의 회원관리 기능
(통계·일괄·비밀번호·수정·삭제)은 PharmacyHub 에서 호출할 대상 자체가 없다.

WO §7 에 따라 **PharmacyHub 전용 복제 대신 공통 Core 를 최소 확장**했다.

## 2. 공통 Core 확장 (`@o4o/operator-core-ui`)

`modules/members/types.ts` · `OperatorMembersConsolePage.tsx` 2개 파일.

| 확장 | 내용 | 기본값 |
|---|---|---|
| `consoleMode?: 'members' \| 'approval'` | approval = 승인/반려만. 수정·비밀번호·삭제·일괄·통계 카드 전부 비노출 | `'members'` (기존 동작) |
| client 메서드 optional 화 | `stats` `listAll` `batchUpdateStatus` `updatePassword` `renderEditModal` | 있으면 종전대로 노출 |
| `updateStatus(..., options?: { reason?: string })` | 반려 사유 전달 채널 | 미전달 시 종전과 동일 |
| `rejectReason?: {required,label,placeholder}` | pending 행 Drawer 에 사유 textarea. required 면 미입력 시 반려 버튼 disabled | 미지정 = 렌더 안 함 |
| `fullDetailHref?: (user) => string \| null` | Drawer 의 "전체 상세 페이지" 링크. `null` 이면 링크 자체를 렌더하지 않음 | `/operator/users/{id}` (기존 하드코딩과 동일) |
| tab count / emptyMessage | `stats` 미제공 서비스는 count 생략(“전체 0” 모순 표시 제거), approval 모드 전용 빈 메시지 | 기존 소비처 영향 없음 |

**모든 기본값이 기존 동작을 그대로 보존**하므로 기존 소비처 6곳(GlycoPharm admin/operator,
K-Cosmetics admin/operator, KPA `MemberManagementPage`, Neture `UsersManagementPage`)은 무수정이다.

## 3. PharmacyHub 측 변경

- **신규** `src/lib/membershipConsoleClient.ts` — 유일한 어댑터. `MembersConsoleClient` 구현 +
  상세 페이지가 공유하는 `fetchMembership` / `approveMembership` / `rejectMembership`.
  식별자 계약을 파일 헤더에 명시: approval 모드에서 `UserData.id` 는 **membership id** 다
  (user id 를 요구하는 액션이 전부 비노출이므로 안전).
- `MembershipsPage.tsx` **268 → 62 라인** — 공통 콘솔 wrapper 로 대체.
- `MembershipDetailPage.tsx` 196 → 185 라인 — 로컬 타입·raw `api.get/patch` 제거하고 어댑터 공유.
  **별도 페이지로 남긴 정책 근거**(파일 헤더에 기록): ① deep link 유지 ②
  사업자 프로필(사업자번호·사업장 주소·담당자)은 **상세 endpoint 만** 반환 → Drawer 만으로는 승인 판단 근거 부족.
- `package.json` `@o4o/operator-core-ui` 추가 · `Dockerfile` 선별 COPY 2블록에
  `packages/operator-core-ui/` + `packages/shared-space-ui/`(전이 의존) 추가 · `tailwind.config.js` content glob 2줄 추가.

## 4. 검증

| 항목 | 결과 |
|---|---|
| web-pharmacy-hub `type-check` | **PASS** |
| web-pharmacy-hub `build` | **PASS** |
| 회귀 build — glycopharm / k-cosmetics / neture / kpa-society | **PASS** (4/4) |
| 브라우저 smoke — 로그인 → `/operator` Shell·Sidebar | **PASS** |
| 목록 · 검색(`renagang21`) · 상태 탭(전체/승인 완료/반려/가입 신청) | **PASS** (서버 필터 동작) |
| 행 클릭 Drawer · 회원관리 액션 비노출 | **PASS** (수정/비밀번호/삭제/일괄/통계 전부 없음) |
| Drawer → `/operator/memberships/:membershipId` deep link | **PASS** |
| 승인 · 반려 write | **미검증** — 아래 참조 |

smoke 는 로컬 `vite preview`(localhost:5176, CORS devOrigins 허용) → 프로덕션 API `api.neture.co.kr`.

### 승인·반려 write 미검증 사유

프로덕션 PharmacyHub 에 **`pending` 멤버십이 0건**이다(전체 3건 모두 `active`).
승인·반려를 실제로 실행하려면 신규 가입 신청을 생성해야 하고, 생성된 user·membership 은
API 로 되돌릴(삭제할) 수단이 없어 **원복 불가능한 운영 write** 가 된다.
WO 의 "운영 write 가 필요하면 안전한 테스트 데이터만 사용하고 원복" 조건을 만족할 수 없어 수행하지 않았다.

정적 근거: 승인·반려 호출 경로(`approveMembership` / `rejectMembership`)는 이번에 **신규 작성이 아니라
기존 페이지에서 그대로 옮긴 코드**이며, 상세 페이지와 목록 콘솔이 동일 함수를 공유한다.
엔드포인트·요청 본문·권한 경계는 무변경이다.

## 5. 결론

| 질문 | 답 |
|---|---|
| 제거한 중복 코드 규모 | `MembershipsPage` **-206 라인**(268→62). 목록·검색·상태 필터·페이지네이션·Drawer·승인/반려 UI 전부 공통 콘솔로 이관 |
| 공통 Core 확장 여부 | **확장함** — 2개 파일, 신규 prop 3개 + client 메서드 optional 화. 기존 소비처 6곳 코드 무수정 |
| 남은 PharmacyHub 전용 정책 코드 | ① `membershipConsoleClient.ts`(어댑터, 유일한 API 접점) ② `MembershipsPage.tsx` 62라인 config ③ `MembershipDetailPage.tsx` 185라인(deep link + 사업자 프로필 정책) |

### 계약 준수

- API / DB 계약 **무변경**. 공통 UI 에 맞추기 위한 백엔드 수정 없음.
- 가입 승인 의미 유지 — 회원관리 액션은 `consoleMode='approval'` 로 **차단**.
- 권한 정책 무변경 — `MembershipGate` + backend `pharmacy-hub:operator` scope guard 그대로.
- 데드링크 0 — `fullDetailHref` 로 `/operator/users/*` 하드코딩 회피.
- 중복 화면 생성 없음 — 기존 화면을 대체.

### 보고 필요 사항 (중지 조건 해당 항목)

WO 가 `@o4o/operator-core-ui` 채택을 명시했으므로 불가피하게 수반된 변경:
`package.json` 의존성 1줄 추가 · `pnpm-lock.yaml` 갱신 · `Dockerfile` COPY 4줄 추가.

또한 이 fresh worktree 에는 `packages/forum-core` / `packages/block-renderer` 의 `dist/` 가 없어
neture · kpa-society 회귀 build 전에 두 패키지를 먼저 빌드해야 했다(선행 빌드 부재이지 이번 변경의 회귀가 아님).
`forum-core` 빌드는 자체적으로 `Cannot find module '@o4o/organization-core'` 를 보고했으나 산출물은 생성됐다.

**문서 정합**: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
