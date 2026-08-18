# CHECK-O4O-LMS-CERTIFICATE-OWNERSHIP-AND-READ-AUTHORIZATION-BOUNDARY-FIX-V1

- **WO**: `WO-O4O-LMS-CERTIFICATE-OWNERSHIP-AND-READ-AUTHORIZATION-BOUNDARY-FIX-V1`
- **선행 CHECK**:
  - [`CHECK-O4O-LMS-CROSSSERVICE-READ-WRITE-BOUNDARY-COMPLETION-V1`](./CHECK-O4O-LMS-CROSSSERVICE-READ-WRITE-BOUNDARY-COMPLETION-V1.md) (service boundary)
  - [`CHECK-O4O-LMS-ENROLLMENT-OWNERSHIP-AND-AUTHORIZATION-BOUNDARY-FIX-V1`](./CHECK-O4O-LMS-ENROLLMENT-OWNERSHIP-AND-AUTHORIZATION-BOUNDARY-FIX-V1.md)
  - [`CHECK-O4O-DEPLOY-API-VPC-CONNECTOR-RECOVERY-AND-LMS-OWNERSHIP-PRODUCTION-CLOSURE-V1`](./CHECK-O4O-DEPLOY-API-VPC-CONNECTOR-RECOVERY-AND-LMS-OWNERSHIP-PRODUCTION-CLOSURE-V1.md) (§7-4 에서 본 결함을 이월)
- **일자**: 2026-08-18
- **시작 commit**: `eb62f361e` / **최종 commit**: `a07ece90d`
- **배포**: Deploy API Server run `32104466761` success → Cloud Run revision **`o4o-core-api-03357-nlr`**
- **최종 판정**: **PASS (production runtime 은 `DATA_FIXTURE_BLOCKED`)**

---

## 1. certificate endpoint 전수 census (§2) — 미조사 0

| # | method / path | 소비자 | 분류 | service scope | owner check (수정 전) | course/enrollment 관계 | R/W | 수정 전 판정 |
|:--:|---|---|---|:--:|:--:|:--:|:--:|---|
| 1 | `GET /api/v1/lms/certificates/:id` | KPA `lms.ts`, 직접 호출 | PRIVATE_USER_READ | O (`guardLoadedCourseScope`) | **X** | course join | R | **결함 — 같은 서비스 타인 수료증 read 가능** |
| 2 | `GET /api/v1/lms/certificates/number/:certificateNumber` | 직접 호출 | PRIVATE_USER_READ | O | **X** | course join | R | **결함 — 번호만 알면 타인 수료증 read** |
| 3 | `GET /api/v1/lms/certificates/:id/pdf` | KPA (dead link 포함) | PRIVATE_USER_READ | O | △ (403 방식, 존재 노출) | course join | R | **결함 — 비공개 계약 불일치(403) + helper 미사용** |
| 4 | `GET /api/v1/lms/certificates` | KPA / GlycoPharm / K-Cosmetics "내 수료증" | PRIVATE_USER_READ | O | **X** (client `userId` 그대로 전달) | course scope | R | **결함 — 목록 leak** |
| 5 | `GET /api/v1/lms/certificates/me` | 공통 | PRIVATE_USER_READ | O | O (본인 강제) | course scope | R | 정상 — 미수정 |
| 6 | `GET /api/v1/kpa/lms/certificates/:id` | KPA remount (#1 재사용) | PRIVATE_USER_READ | O | **X** | course join | R | **결함 — #1 과 동일 controller** |
| 7 | `GET /api/v1/kpa/lms/certificates` | KPA remount (#4/#5 재사용) | PRIVATE_USER_READ | O | 상동 | course scope | R | #4 와 동일 |
| 8 | `GET /api/v1/lms/certificates/:id/verify` | 공개 검증 페이지 `CertificateVerifyPage` | PUBLIC_VERIFY | 미적용(공개) | 해당 없음(의도적) | course | R | 유지 — 최소 필드 계약 확인 |
| 9 | `GET /api/v1/lms/certificates/verify/:verificationCode` | 공개(코드 소지 기반) | PUBLIC_VERIFY | O | 해당 없음(의도적) | course | R | **개인정보 과노출 — 전체 entity 반환** |
| 10 | `POST /api/v1/lms/certificates/issue` | 관리 | MANAGEMENT | — | `requireKpaAdmin` | — | W | 유지 |
| 11 | `PATCH /api/v1/lms/certificates/:id` | 관리 | MANAGEMENT | — | `requireKpaAdmin` | — | W | 유지 |
| 12 | `POST /api/v1/lms/certificates/:id/revoke` | 관리 | MANAGEMENT | — | `requireKpaAdmin` | — | W | 유지 |
| 13 | `POST /api/v1/lms/certificates/:id/renew` | 관리 | MANAGEMENT | — | `requireKpaAdmin` | — | W | 유지 |

- **PRIVATE_USER_READ 7 / PUBLIC_VERIFY 2 / MANAGEMENT 4 / 총 13 / 미조사 0**
- eligibility(수료 자격) 전용 endpoint 는 존재하지 않는다. 수료 여부는 `GET /lms/completions/me` (본인 범위 고정)가 담당하며 certificate 계약과 분리돼 있다.
- courseId 기반 certificate 조회 endpoint 는 **백엔드에 없다** (GlycoPharm `getMyCertificate(courseId)` 는 존재하지 않는 `/lms/certificates/course/{id}` 를 호출하는 프런트 잔재 — §7 잔존 사항).

## 2. canonical 판정 순서 (§4)

```
인증 → serviceKey 해석 → certificate 조회 → course service scope → certificate.userId 소유권 → read
```

- scope 판정이 ownership 판정보다 **먼저**다.
- 같은 서비스라고 owner check 를 생략하지 않는다.
- 타인·미존재·타 서비스 응답은 **동일한 404 `{ success:false, error:'Certificate not found', code:'NOT_FOUND' }`** (non-disclosure).
- 알 수 없는 serviceKey 는 조회 이전 400, 미인증은 401 (기존 계약 유지).

## 3. 수정 내용

### 3-1. 신규 공통 helper (경로별 중복 구현 금지 — §5)

`apps/api-server/src/modules/lms/utils/lms-certificate-owner-guard.ts` **(신규)**

- `resolveOwnedCertificateByIdOrRespond(req, res, id)`
- `resolveOwnedCertificateByNumberOrRespond(req, res, certificateNumber)`
- 내부 `resolveOwnedCertificate()` 하나가 위 canonical 순서를 전부 판정한다. `lms-enrollment-owner-guard.ts` 와 동일 계약.

### 3-2. `CertificateController.ts` 변경 (5곳)

| 대상 | 변경 |
|---|---|
| `getCertificate` (#1/#6) | 인라인 조회 → `resolveOwnedCertificateByIdOrRespond` |
| `getCertificateByNumber` (#2) | 인라인 조회 → `resolveOwnedCertificateByNumberOrRespond` |
| `downloadPdf` (#3) | 기존 403 owner check → 동일 helper (404 non-disclosure 로 통일) |
| `listCertificates` (#4/#7) | 미인증 401 + canonical scope + **`userId` 를 요청자 본인으로 강제 덮어쓰기** |
| `verifyCertificate` (#9) | 전체 entity → `toPublicVerificationView()` 최소 필드 (`verifyPublic` 과 동일 view) |

- **MISSING_OWNER_CHECK_FIXED = 3** (#1, #2, #3)
- **ADDITIONAL_READ_LEAK_FIXED = 1** (#4 목록 — 요청 `userId` 무시하고 본인 강제) + 개인정보 과노출 1건(#9)
- migration **0건**, 라우트 배선 변경 **0건**, 신규 elevated bypass **0건**.

## 4. elevated role 처리 (§7)

- 관리 동작은 이미 `requireKpaAdmin` 이 붙은 별도 endpoint(#10~#13)로 존재한다 → **user-facing endpoint 에 bypass 를 추가하지 않았다.**
- `lms:instructor` 를 근거로 전체 certificate 를 볼 수 있게 만들지 않았다. enrollment 목록에 있던 `isLmsElevatedManager` 분기를 certificate 목록에 **이식하지 않았다** (기존 근거 없는 elevated access 신설 금지).
- 토큰 `roles` 에 `kpa:admin`/`lms:instructor` 가 있어도 #1~#4 는 본인 범위로만 응답한다 (테스트로 고정).

## 5. 개인정보 노출 가능 범위 (§9)

수정 전 타인 certificate 를 읽었을 때 노출 가능했던 필드:

| 필드 | 노출 경로 | 수정 후 |
|---|---|---|
| `userId` | #1 #2 #4 (entity) | 차단(404) |
| `user.email`, `user.name` | #1 #2 #4 — `sanitizeUserFields` 는 password 계열만 제거하고 email/name 은 유지 | 차단(404) |
| `courseId`, `course.title` | #1 #2 #4 | 차단(404) |
| `certificateNumber`, `verificationCode`, `verificationUrl` | #1 #2 #4 #9 | private 는 차단, #9 는 최소 필드만 |
| `issuedAt`, `completedAt`, `finalScore`, `credits`, `metadata` | #1 #2 #4 #9 | 상동 |
| PDF 다운로드(이름·과정·인증번호 인쇄물) | #3 | 차단(404) |

공개 진위확인(#8/#9) 응답 필드는 **`certificateId / certificateCode / userName / courseTitle / completedAt / issuedAt / issuer` 7개뿐**이며 `userId`·`email`·`finalScore`·`metadata` 를 포함하지 않는다. #8 의 기존 공개 계약(프런트 `CertificateVerifyPage` 의 `VerifyResult` 타입)은 그대로다.

## 6. 자동화 테스트 (§10 / §16)

`apps/api-server/src/__tests__/lms-certificate-ownership-boundary.spec.ts` **(신규, 29 tests)**

| 그룹 | 케이스 |
|---|---|
| private read `:id` | 본인 200 / 같은 서비스 타인 404 / cross-service 404 / 없는 id 404(타인과 동일 body) / 미인증 401 / 잘못된 serviceKey 400 / elevated role 도 404 |
| private read `number/:n` | 본인 200 / 타인 404 / cross-service 404 |
| PDF | 본인 발급 PASS / 타인 404 + PDF 미생성 / cross-service 404 + PDF 미생성 |
| 목록 | 본인 축소 / 타인 `userId` 지정 무시 / elevated 도 축소 / canonical serviceKey / 미인증 401 / `/me` 유지 |
| public verify | 미인증 200 동작 / 개인정보 미노출 + 필드 7개 고정 / 무효 시 `{valid:false}` / 코드 진위확인 최소 필드 / 코드 진위확인 cross-service 404 |
| 정적 가드 | 공통 helper 사용(중복 구현 0) / guard 내 scope→owner 순서 / user-facing 라우트에 elevated 미들웨어 없음 / management 는 `requireKpaAdmin` 유지 / public verify 는 owner guard 미적용 |

`lms-crossservice-read-write-boundary.spec.ts` 의 certificate 순서 단언은 controller 인라인 문자열 → **owner guard 파일 기준**으로 재지정했다(계약 동일, 위치만 이동).

| 검증 | 결과 |
|---|---|
| LMS boundary 3 spec (certificate / enrollment / crossservice) | **89 tests PASS** |
| api-server 전체 jest | **142 suites / 2266 tests PASS** |
| `tsc --noEmit -p apps/api-server/tsconfig.json` | **PASS** |
| frontend | 변경 파일 0 · 소비 계약(#8 공개 verify, "내 수료증" 목록) 형태 불변 → `web-kpa-society` typecheck 로 확인 |
| migration | **0건** |

## 7. production DB 실측 (§11, read-only)

`cloud-sql-proxy` 경유 SELECT 만 수행. write 0.

| 항목 | 값 |
|---|---|
| `lms_certificates` 테이블 | 존재 |
| 총 certificate 수 | **0** |
| `userId` null | 0 |
| `courseId` null | 0 |
| `enrollment_id` 컬럼 | **스키마에 없음** (certificate 는 user/course 로만 귀속) |
| course serviceKey 분포 | 0건 (레코드 없음) |
| orphan(course 미존재) / cross-service 관계 / 중복 | 0 (총 0건이므로 자명) |

→ **실제 leak 은 아직 발생하지 않았다.** 구조적 결함만 존재했고 이번에 닫혔다.

## 8. production 검증 (§12) — `DATA_FIXTURE_BLOCKED`

certificate 가 0건이라 "본인 200 / 타인 404 / cross-service 404" 를 프로덕션 실데이터로 재현할 수 없다. WO §12 에 따라 **검증용 certificate 를 발급하지 않았다**(프로덕션 write 금지). 대신 다음 4가지로 닫는다.

1. 자동화 fixture 테스트 29건 PASS (§6)
2. 배포 commit `a07ece90d` (revision `o4o-core-api-03357-nlr`) 에 owner guard·controller 변경 포함
3. 배포된 endpoint 의 기본 동작 실측 (아래)
4. DB 0건 실측 (§7)

배포 후 런타임 실측 (계정 `sohae2100@gmail.com` / `kpa-society`, write 0):

| 검증 | 결과 |
|---|---|
| `GET /lms/certificates/{uuid}` | **404 `NOT_FOUND`** (non-disclosure body) |
| `GET /lms/certificates/number/{no}` | **404 `NOT_FOUND`** |
| `GET /lms/certificates/{uuid}/pdf` | **404 `NOT_FOUND`** (기존 403 → 404 전환 확인) |
| `GET /lms/certificates` | 200 · `total=0` (본인 범위) |
| `GET /lms/certificates/me` | 200 · `total=0` |
| `GET /kpa/lms/certificates/{uuid}` | **404 `NOT_FOUND`** (remount 경로 동일 계약) |
| 미인증 private read | **401 `AUTH_REQUIRED`** |
| 공개 `GET /lms/certificates/{uuid}/verify` (미인증) | **200 `{valid:false}`** — 공개 계약 유지 |
| `?serviceKey=not-a-service` | **400 `INVALID_SERVICE_KEY`** (조회 이전 차단) |
| `/health` | 200 |

## 9. 회귀 스모크 (§13)

실브라우저(Playwright, headless) 실측:

| 대상 | 결과 |
|---|---|
| KPA `/lms` 목록 | 200 · `GET /kpa/lms/courses` n=3 · serviceKey 전부 `kpa-society` · console error **0** |
| KPA 강의 상세 | 200 · 실패 응답 6건은 **전부 기존 `kpa/appreciation/lms_course/*/summary\|recent` 404** (이번 변경과 무관, §14 제외 항목) |
| KPA 공개 수료증 검증 페이지 `/certificate/verify/{id}` | 200 · 실패 응답 0 · console error 0 · 무효 수료증 안내 정상 렌더 |
| K-Cosmetics `/lms` | 200 · n=0 빈 상태 정상 · console error 0 |
| GlycoPharm `/lms` | 200 · n=0 빈 상태 정상 · console error 0 (최초 관측된 module MIME 에러 7건은 stale chunk 캐시 artifact — cache-bust 재측정 시 **0건**) |
| 신규 404/500 | **0건** |
| 백지 화면 / JS 예외 | 0건 |
| enrollment / progress 회귀 | LMS boundary spec 89건 + 전체 jest 2266건 PASS 로 확인 |

## 10. 잔존 위험

1. **`DATA_FIXTURE_BLOCKED`** — certificate 0건이라 ownership 차단의 프로덕션 실데이터 재현은 미실시. 최초 발급 이후 재확인 권장.
2. GlycoPharm `getMyCertificate(courseId)` → `/lms/certificates/course/{id}` 는 **백엔드에 없는 경로**(항상 404). 프런트 잔재이며 본 WO 범위 밖.
3. KPA `lms.ts` 의 certificate `/download` 호출 경로는 실제 라우트(`/pdf`)와 다르다. dead link, 범위 밖.
4. `sanitizeUserFields` 는 email/name 을 유지한다. 본 WO 는 노출 경로를 닫았을 뿐 sanitize 정책 자체는 건드리지 않았다.
5. certificate 발급/폐기 정책 통일, 수료증 디자인 공통화는 §14 제외 항목으로 유지.

## 11. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건

- 별도 WO 제안: (1) GlycoPharm·KPA certificate 프런트 dead 경로 정리, (2) 최초 certificate 발급 후 ownership 프로덕션 재확인.
