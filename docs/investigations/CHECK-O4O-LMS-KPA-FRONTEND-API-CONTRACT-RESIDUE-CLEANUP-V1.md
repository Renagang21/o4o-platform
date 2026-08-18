# CHECK-O4O-LMS-KPA-FRONTEND-API-CONTRACT-RESIDUE-CLEANUP-V1

> **WO**: `WO-O4O-LMS-KPA-FRONTEND-API-CONTRACT-RESIDUE-CLEANUP-V1`
> **작성일**: 2026-08-18 · **상태**: CLOSED
> **범위**: LMS/KPA 프런트 API 계약 불일치 3건 일괄 정리 (DB migration 0 / 신규 기능 0)

---

## 1. 대상 결함 3건

| # | 결함 | 프런트 현재 URL | backend canonical |
|---|------|----------------|-------------------|
| 1 | GlycoPharm 수료증 단건 조회 dead path | `/api/v1/lms/certificates/course/{courseId}` | 없음 → `GET /api/v1/lms/certificates?courseId=` 재사용 |
| 2 | KPA 수료증 다운로드 dead path | `/api/v1/kpa/lms/certificates/{id}/download` | `GET /api/v1/lms/certificates/{id}/pdf` |
| 3 | KPA appreciation base 불일치 | `/api/v1/kpa/appreciation/*` | `/api/v1/appreciation/*` |

---

## 2. 전수 census — certificate (미조사 0)

| 소비처 | client·function | 현재 URL | backend canonical | 실제 사용 | 판정 |
|--------|-----------------|----------|-------------------|:---------:|------|
| `services/web-glycopharm/src/pages/education/CourseCertificateCard.tsx:30` | `lmsApi.getMyCertificate(courseId)` | `/lms/certificates/course/{id}` | **없음** | YES | **DEAD_PATH → CANONICALIZED** |
| `services/web-glycopharm/src/api/lms.ts` `downloadCertificate` | axios `api` | `/lms/certificates/{id}/pdf` | 동일 | YES (CourseCertificateCard) | OK (선행 WO 에서 이미 정합) |
| `services/web-glycopharm/src/pages/mypage/MyCertificatesPage.tsx:33,46` | `getMyCertificates` / raw `/pdf` | `/lms/certificates`, `/lms/certificates/{id}/pdf` | 동일 | YES | OK |
| `services/web-kpa-society/src/api/lms.ts:115` `downloadCertificate` | `apiClient`(base `/api/v1/kpa`) | `/lms/certificates/{id}/download` | **없음** | **NO (소비처 0)** | **DEAD_PATH + DEAD_CODE → REMOVED** |
| `services/web-kpa-society/src/api/lms.ts` `getMyCertificates` | `apiClient` | `/api/v1/kpa/lms/certificates` | mount 존재 (`kpa.routes.ts:750`) | YES (`LmsCertificatesPage`) | OK |
| `services/web-kpa-society/src/api/lms.ts` `getCertificate` | `apiClient` | `/api/v1/kpa/lms/certificates/{id}` | mount 존재 (`kpa.routes.ts:751`) | NO | KEEP (경로 유효 · 제거 안 함) |
| `services/web-kpa-society/src/pages/mypage/MyCertificatesPage.tsx:66` | raw fetch | `/api/v1/lms/certificates/{id}/pdf` | 동일 | YES | OK |
| `services/web-kpa-society/src/api/mypage.ts:191` | `getMyCertificates` | `/api/v1/kpa/mypage/certificates` | `mypage.controller.ts:118` | YES | OK |
| `services/web-k-cosmetics/src/api/lms.ts:263` + `MyCertificatesPage.tsx:47` | `getMyCertificates` / `/pdf` | canonical | 동일 | YES | OK |
| `apps/main-site/src/lib/api/lmsYaksaMember.ts:293` | `getMyCertificates` | `/lms/certificates` | 동일 | YES | OK |

**backend certificate mount 실측**: `/certificates`, `/certificates/me`, `/certificates/number/:n`, `/certificates/:id`, `/certificates/:id/pdf`, `/certificates/:id/verify`, `/certificates/verify/:code`, 관리 4종.
→ `/certificates/course/:courseId`, `/certificates/:id/download` **둘 다 존재하지 않음**(generic·kpa 라우터 모두).

## 3. 전수 census — appreciation (미조사 0)

**backend mount 실측**: `register-routes.ts:169` `app.use('/api/v1/appreciation', appreciationRoutes)` — **단일 mount**. 서비스 prefix mount 0건.
endpoint: `POST /send`(requireAuth) · `GET /my-sent`·`/my-received`(requireAuth) · `GET /:targetType/:targetId/summary`·`/recent`(optionalAuth). forum / content / LMS 가 동일 backend 를 공유한다.

| 소비처 | client·function | 현재 URL | canonical | 실제 사용 | 판정 |
|--------|-----------------|----------|-----------|:---------:|------|
| KPA `pages/lms/LmsCourseDetailPage.tsx:70` | `appreciationPanelApi` | `/api/v1/kpa/appreciation/lms_course/*` | `/api/v1/appreciation/*` | YES | **DEAD_PATH(404) → CANONICALIZED** |
| KPA `pages/forum/ForumDetailPage.tsx:295` | `appreciationPanelApi` | 〃 (`forum_post`) | 〃 | YES | **DEAD_PATH(404) → CANONICALIZED** |
| KPA `pages/forum/ForumListPage.tsx:243` | `appreciationApi.getSummary` | 〃 (`forum_post`) | 〃 | YES | **DEAD_PATH(404) → CANONICALIZED** |
| KPA `pages/contents/ContentDetailPage.tsx:208` | `appreciationPanelApi` | 〃 (`content`) | 〃 | YES | **DEAD_PATH(404) → CANONICALIZED** |
| KPA `pages/mypage/MyDashboardPage.tsx:73-74` | `getMyReceived`/`getMySent` | `/api/v1/kpa/appreciation/my-*` | 〃 | YES | **DEAD_PATH(404) → CANONICALIZED** |
| GlycoPharm 4 화면(CourseDetail/ForumPostDetail/HubContentDetail/MyPageHub) | `api`(base `/api/v1`) | canonical | 동일 | YES | OK (수정 없음) |
| K-Cosmetics 4 화면(PostDetail/ContentDetail/LmsCourseDetail/MyPageHub) | `api`(base `/api/v1`) | canonical | 동일 | YES | OK (수정 없음) |

5개 KPA 화면 전부 **동일 client(`src/api/appreciation.ts`)** 만 소비한다 → 화면별 patch 없이 client 1곳 수정으로 전부 해소.

---

## 4. 수정 내용

| 파일 | 변경 |
|------|------|
| `services/web-glycopharm/src/api/lms.ts` | `getMyCertificate(courseId)` → 존재하는 canonical 목록 endpoint `GET /lms/certificates?courseId&limit=1` 재사용 후 first item 반환. **신규 backend endpoint 생성 0.** |
| `services/web-kpa-society/src/api/lms.ts` | `downloadCertificate` 제거(사유 주석 유지). 경로 부재 + `apiClient` 가 항상 `response.json()` 이라 Blob 반환 불가 + 소비처 0 의 3중 dead code. KPA canonical 다운로드는 `MyCertificatesPage` 의 `/api/v1/lms/certificates/{id}/pdf` 로 이미 동작. |
| `services/web-kpa-society/src/api/appreciation.ts` | `apiClient`(base `/api/v1/kpa`) → `coreApiClient`(base `/api/v1`). `my-sent`/`my-received` 반환 타입을 backend `okPaginated` 실제 형태(`data: AppreciationSend[]`)로 정정. |
| `apps/api-server/src/__tests__/lms-kpa-frontend-api-contract-residue.spec.ts` | 신규 회귀 spec 13건. |

**backend 변경 0** — duplicate `/download` alias 생성 안 함, appreciation 서비스 prefix mount 신설 안 함, migration 0.

---

## 5. service boundary 점검 (§7)

- appreciation 은 설계상 **service-neutral 공용 도메인**이다(`AppreciationService` 주석: `service_point_budgets 완전 무관`, serviceKey 미전달). GlycoPharm·K-Cosmetics 는 이미 동일한 generic base 를 쓰고 있었고, 이번 변경은 KPA 를 **기존 canonical 계약에 맞춘 것**이라 backend 경계를 새로 넓히지 않는다.
- `send` 는 requireAuth + `_resolveCreator` 로 대상 존재 검증 + 자기 자신 전송 차단 + 잔액 pessimistic lock 트랜잭션.
- `summary`/`recent` 는 `optionalAuth` 공개 집계이며 `APPRECIATION_TARGET_TYPES` 화이트리스트를 통과해야 한다. 노출 데이터는 합계·건수·감사 메시지로, 대상 UUID 를 이미 아는 경우에만 조회 가능하다.
- **판정**: 이번 WO 로 새로 생기는 cross-service authorization 결함 없음. 다만 generic appreciation 이 `targetId` 만으로 집계를 공개한다는 점은 **선행 설계의 잔존 특성**이므로 아래 §8 에 잔존 위험으로 기록한다(대규모 경계 재설계는 본 WO 범위 밖).

---

## 6. 검증

| 항목 | 결과 |
|------|------|
| 신규 spec `lms-kpa-frontend-api-contract-residue.spec.ts` | **13 passed** |
| `lms-crossservice-read-write-boundary.spec.ts` + `lms-certificate-ownership-boundary.spec.ts` | **61 passed** |
| `pnpm --filter @o4o/web-kpa-society build` (tsc + vite) | **PASS** |
| `pnpm --filter glycopharm-web build` (tsc -b + vite) | **PASS** |
| K-Cosmetics | 변경 파일 0 → 빌드 미실행 |
| backend build | api-server **소스 변경 0**(추가된 것은 spec 뿐) → 미실행, 관련 route spec 은 위에서 실행 |
| DB migration | **0** |

### production runtime smoke

배포: `4a0cdecb4` → `Deploy Web Services (Cloud Run)` run `32106480722` **success** (`deploy-kpa-society`, `deploy-glycopharm`). 실제 브라우저(Playwright, 운영 도메인) 관측.

| 화면 | 관측된 appreciation / certificate 요청 | `/api/v1/kpa/appreciation` | 4xx/5xx | console error |
|------|--------------------------------------|:--------------------------:|:-------:|:-------------:|
| KPA 강의 상세 `/lms/course/0405b089…` | `200 /api/v1/appreciation/lms_course/…/summary`, `…/recent` | **0** | 0 | 0 |
| KPA 포럼 목록 `/forum/all` (로그인) | `200 /api/v1/appreciation/forum_post/{4건}/summary` | **0** | 0 | 0 |
| KPA 포럼 게시글 상세 `/forum/post/50b2a531…` | `200 …/forum_post/…/summary`, `…/recent` | **0** | 0 | 0 |
| KPA 마이 대시보드 `/mypage` | `200 /api/v1/appreciation/my-received?limit=5`, `my-sent?limit=5` | **0** | 0 | 0 |
| KPA 자료실 목록 `/content`, `/content/resources` | 목록 화면은 appreciation 미호출(상세에서만 호출) | **0** | 0 | 0 |
| GlycoPharm `/education` | certificate 호출 없음(수료 강의 없음) | — | 0 | 0 |

- KPA **자료실 상세**는 해당 계정 자료실 목록에 항목이 없어 진입하지 못했다(NOT_EXERCISED). 동일 `appreciationPanelApi` 를 쓰는 포럼 상세·강의 상세가 canonical 200 으로 확인되었고, 정적 spec 이 자료실 상세의 client 경유를 고정한다.
- **certificate 는 운영 `lms_certificates` 0건**이므로 발급하지 않고(§11 지침) 배포 산출물의 요청 URL 계약으로 검증했다: KPA 번들 내 `certificates …/download` 문자열 **0**, `kpa/appreciation` **0**, GlycoPharm 번들 내 `/lms/certificates/course/` **0** · canonical `/lms/certificates` 존재.
- 배포 후 KPA/GlycoPharm 화면 runtime JS 오류 **0**.

## 7. 지표

```
조사 API 소비처: 20
DEAD_PATH: 6
CANONICALIZED: 6
REMOVED_DEAD_CODE: 1
SECURITY_BOUNDARY_ISSUE: 0
미조사: 0
```

---

## 8. 잔존 위험 · 별도 WO 제안

1. **GlycoPharm / K-Cosmetics `MyPageHub` 의 appreciation 파싱 불일치** — 두 화면은 `body.data.items` 를 읽지만 backend `okPaginated` 는 `data` 가 배열이다. 감사 목록이 항상 빈 배열로 보인다. 본 WO 범위(3건) 밖이므로 수정하지 않고 보고한다. → 별도 WO 제안.
2. **generic appreciation 집계 공개 범위** — `summary`/`recent` 가 serviceKey 없이 `targetId` 만으로 공개된다(선행 설계). 서비스 경계 정책과의 정합은 별도 판단 필요.
3. KPA `lmsApi.getCertificate` 는 경로는 유효하나 소비처 0 이다. 경로가 살아 있어 dead path 가 아니므로 제거하지 않았다.

---

## 9. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건 (§8-1, §8-2)
