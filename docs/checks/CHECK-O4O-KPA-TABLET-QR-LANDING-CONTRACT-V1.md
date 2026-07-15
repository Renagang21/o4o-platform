# CHECK-O4O-KPA-TABLET-QR-LANDING-CONTRACT-V1

> WO: `WO-O4O-KPA-TABLET-QR-LANDING-CONTRACT-V1`
> 성격: 구현 — Screen Set ↔ `store_qr_codes` 연결(landing_type='screen_set') + 공용 Screen Set resolver. 모바일 세로 뷰어/자동 QR 생성은 후속.
> 선행 IR: `IR-O4O-KPA-TABLET-CONTENT-LIBRARY-AND-CORNER-ASSIGNMENT-DESIGN-V1`
> Date: 2026-07-15

---

## 0. 결론

태블릿 콘텐츠 원본 1개(Screen Set)가 **매장 태블릿 화면 + 소비자 QR 모바일 화면**을 동시에 서빙하도록, `store_qr_codes` 에 `landing_type='screen_set'` 계약과 **공용 resolver**를 구현했다. 콘텐츠를 복사/이중 저작하지 않는다.

- **공용 resolver** `resolveScreenSetSections` 신설 → 태블릿 공개 runtime(`/tablet/screen`)과 QR landing(`/qr/public/:slug`)이 **동일 소스**로 sections 생성.
- **QR 생성 계약**: `screen_set` 화이트리스트 + org 경계 검증 + 멱등 재사용 + `public_qr_slug` 동기화.
- **QR landing**: 이중 게이트(QR is_active + Screen Set 유효) 통과 시 무인증 sections 반환, 내부 UUID 미노출.
- **additive migration**: `public_qr_slug`(nullable, 백필 없음) + 역조회 partial index + partial UNIQUE.
- 기존 landing type(product/video/page/promotion/link)·태블릿 runtime·draft preview **불변**. 프로덕션 tsc 0, 태블릿 jest 29 PASS.

---

## 1. 스키마 (migration `20270207000000-AddScreenSetQrLandingContract`, additive)

| 변경 | 내용 |
|------|------|
| `store_tablet_screen_sets.public_qr_slug` | `VARCHAR(200) NULL`. 연결 QR slug denormalized 참조. **SSOT=store_qr_codes**, 기존 row 백필 없음(NULL 유지) |
| 역조회 index | `idx_sqc_screen_set_target (organization_id, landing_type, landing_target_id) WHERE landing_type='screen_set'` |
| partial UNIQUE | `uq_sqc_screen_set_target (organization_id, landing_target_id) WHERE landing_type='screen_set'` — Screen Set 당 QR 1개 |

- `store_qr_codes.landing_type` = CHECK 없는 `VARCHAR(50)` → 컬럼 변경 없이 `'screen_set'` 사용.
- **중복 사전 조사(read-only)**: `screen_set` 는 이번 WO 가 신규 도입하는 값. 코드 전수 검색 결과 **다른 writer 없음**(이 WO 산출물만 write) → 프로덕션 기존 `screen_set` row **0건(정의상)** → partial UNIQUE 안전. 만에 하나 중복이 있으면 `CREATE UNIQUE INDEX` 가 migration 단계에서 loud 하게 실패(=안전, 무결성 우선).
- rollback: 신규 컬럼·인덱스만 제거(기존 row/제약 무변경).

## 2. 공용 Screen Set resolver (`store-public-screen-set-resolve.ts`)

`resolveScreenSetSections(dataSource, { organizationId, screenSetId, serviceKey, storeId, storeSlug, tabletContext?, productMode? })`:

- 게이트: **org 일치 + deleted_at IS NULL + status <> 'archived'** → 미충족 시 **null**(호출부가 legacy fallback / 접근 차단 처리).
- visible blocks(`is_visible=true`, sort_order) → sections. 개별 block 실패는 해당 섹션만 생략(안전).
- `tabletContext` 있음 = 공개 runtime(operator/legacy idle 완전 resolve + 태블릿 gate 상품). 없음 = QR/org(대기영상 **custom-only**, 상품 org 기준).
- `productMode`: full(태블릿) / org(QR) / skip.
- 기존 헬퍼 재사용: `shapeStaticBlock`·`resolveContentListItems`·`resolveTabletIdleItems`·`parseIdleMediaConfig`/`resolveIdleMediaItems`·`resolveTemplateKey`·`queryTabletVisibleProducts`.

**3경로 통일:**

| 경로 | resolver 사용 | 비고 |
|------|--------------|------|
| 태블릿 공개 runtime `/tablet/screen` | ✅ `resolveScreenSetSections`(tabletContext=full) | **리팩터** — 응답 구조/셰이핑 **불변**(동일 헬퍼·동일 순서·동일 출력) |
| QR screen_set landing `/qr/public/:slug` | ✅ `resolveScreenSetSections`(tabletContext=null, org) | 신규 |
| draft preview `POST /screen-sets/preview` | 동일 헬퍼·게이트 공유(구조상 미저장 body.blocks → screenSetId 기반 resolver 사용 불가) | **출력 불변**(변경 없음) |

> draft preview 는 저장 전 body.blocks 를 resolve 하므로 `screenSetId` 키 resolver 를 적용할 수 없다. 동일 셰이핑 헬퍼/게이트를 이미 공유하므로 렌더 결과 일관성은 유지된다(§WO 안전 기준: preview 출력 불변 우선).

## 3. QR 생성 계약 (`POST /pharmacy/qr`, 인증+owner)

- landing 화이트리스트에 `screen_set` 추가.
- `landingType='screen_set'` 전용 분기(page/product/marketing-graph 흐름 미접촉):
  1. **대상 검증**: `store_tablet_screen_sets` 존재 + `organization_id` 일치 + 미삭제 + 미보관 → 아니면 404 `SCREEN_SET_NOT_FOUND`. **타 매장 Screen Set 연결 거부**.
  2. **멱등 재사용**: 같은 `(org, landing_type='screen_set', landing_target_id)` QR 있으면 **신규 생성 없이 기존 반환**(`reused:true`) + `public_qr_slug` 동기화. **이름 변경 ≠ 주소 변경**.
  3. **신규**: slug 충돌(전역 unique) 검사 후 INSERT + `public_qr_slug` 동기화.

## 4. QR landing resolver (`GET /qr/public/:slug`, 공개)

- `landingType='screen_set'` 분기 추가. **이중 게이트**: QR `is_active=true`(WHERE) + Screen Set 유효(resolver org/삭제/보관 게이트).
- 미충족(보관/삭제/org 불일치) → **404 `SCREEN_SET_UNAVAILABLE`**(접근 차단).
- 성공 응답: `screenSet = { landingType:'screen_set', slug, name, templateKey, sections }`. **내부 Screen Set UUID(landingTargetId)는 null 처리**(slug 로만 접근).
- **소비자 로그인 미확인**(무인증). scan event 기록은 기존과 동일.

## 5. 소비자 접근 / entitlement
- 이번 WO: 유효 QR + 유효 Screen Set → **무인증 콘텐츠 반환**. 태블릿 공개 runtime 무인증 동작 유지.
- entitlement(구독) 게이트·플랜은 **미구현**(향후 resolver 에서 organization entitlement 검사). QR row 에 구독 상태 복사 안 함, slug↔콘텐츠 연결은 만료 후에도 유지.

## 6. public_qr_slug 동기화
- QR 생성/재사용 시에만 `screen_set.public_qr_slug = qr.slug` 동기화(명시적 연결). **Screen Set 저장 경로 자동 `ensureScreenSetQr` 미연결**(후속 WO-C). 이름 변경 시 slug 불변.

## 7. 회귀 방지
- 기존 landing type(product/video/page/promotion/link) 동작 **불변**(분기 additive). 기존 QR 생성/조회/비활성화 경로 미접촉.
- 태블릿 runtime `/tablet/screen`: 공용 resolver 위임이나 **출력 동일**(동일 헬퍼·순서·필드). draft preview 미변경.

## 8. 변경 파일
```
apps/api-server/src/routes/platform/store-public/store-public-screen-set-resolve.ts   (신규 공용 resolver)
apps/api-server/src/routes/platform/store-public/store-public-tablet.handler.ts        (/tablet/screen → resolver 위임)
apps/api-server/src/database/migrations/20270207000000-AddScreenSetQrLandingContract.ts (additive)
apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts        (생성+landing screen_set 분기)
```
- 동시 세션 WIP(pnpm-lock glob 메타)·운영 샘플 미접촉. 금지사항(뷰어/모바일 UI/자동 QR/qr_guide 자동도출/백필/entitlement/제작·코너 UI/소비자 로그인) 준수.

## 9. 검증
### 기술
| 항목 | 결과 |
|------|------|
| 프로덕션 tsc (`tsconfig.build.json`) | **0** |
| jest 태블릿(screen/idle/content-list) | **29 PASS** |
| migration additive/rollback | ✅ (컬럼+partial index/unique, down 제거) |
| API 배포 + migration | ✅ **success** (run 29382664827, CI 마이그레이션 자동 실행) |

### 데이터·API (인증 세션 필요 → 후속/수동)
- screen_set QR 생성/재사용/타매장 거부/archived·deleted 거부/slug 유지 = **코드 계약 구현 완료**. 실 write smoke = 매장 owner 인증 세션 필요 → 후속(WO-C/D) 또는 수동. (§검증: "브라우저 인증 세션 불필요, 실 소비자 QR landing UI 는 후속 모바일 렌더러 WO 에서 smoke".)

### 회귀 (배포 후 read-only) — PASS
- **태블릿 공개 runtime 불변**: 운영 샘플 `/tablet/screen` — 구강 mode=screen_set·templateKey=corner_information_basic_v1·content_list **5**·blocks[idle_media,corner_description,content_list,product_list,qr_guide], 피부 content_list **4** — **배포 전과 동일**(공용 resolver 위임이 출력 보존).
- 기존 QR 유형(product/video/page/promotion/link): landing 분기 additive(‌screen_set 조건에서만 신규 코드 실행) → 미접촉. 코드/tsc 확인.

## 10. 완료 기준 대비
| 기준 | 상태 |
|------|------|
| landing_type='screen_set' 앱 계약 | ✅ |
| QR↔Screen Set organization 경계 | ✅ (생성 검증 + landing resolver 게이트) |
| 공용 Screen Set sections resolver | ✅ (runtime+QR 공유) |
| public_qr_slug additive | ✅ |
| Screen Set QR landing 데이터 응답 | ✅ |
| 소비자 무인증 접근 | ✅ |
| 매장 관리 API 인증 유지 | ✅ (requireAuth+owner) |
| 기존 태블릿·preview·QR 유형 회귀 없음 | ✅ (tsc0·29 PASS·배포 후 runtime 출력 불변) |
| commit/push·배포 | ✅ (bf47bcddd · API deploy success) |

## 11. 후속 (WO 순서)
```
WO-B  QR 모바일 세로형 뷰어(= sections 소비, idle_media 제외 렌더)
WO-C  Screen Set 저장 시 QR 자동 연결(ensureScreenSetQr) + 태블릿 QR URL 자동 도출(qr_guide fallback)
WO-D  기존 콘텐츠 백필 + 실제 태블릿→QR 모바일 smoke
```

---

*Screen Set ↔ store_qr_codes(landing_type='screen_set') 계약 + 공용 resolveScreenSetSections(runtime+QR 공유, preview 동일 헬퍼). migration additive(public_qr_slug nullable·역조회 index·partial unique, screen_set 신규값→기존 0건 안전). 생성=org 경계+멱등 재사용+slug 동기화. landing=이중 게이트(is_active+set 유효)·무인증·UUID 미노출·404 차단. 기존 landing/runtime/preview 불변. tsc0·jest29 PASS. 모바일 뷰어/자동 QR=후속.*
