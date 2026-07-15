# CHECK-O4O-KPA-TABLET-CORNER-CONTENT-ASSIGNMENT-MODEL-V1

> WO: `WO-O4O-KPA-TABLET-CORNER-CONTENT-ASSIGNMENT-MODEL-V1`
> 성격: 구현 — 코너×콘텐츠 다대다 연결 모델(스키마+API+백필). current_screen_set_id 역할 유지.
> 선행 설계: `IR-O4O-KPA-TABLET-CORNER-CONTENT-ASSIGNMENT-DESIGN-V1`
> Date: 2026-07-15

---

## 0. 결론

한 태블릿 코너에 **여러 태블릿 콘텐츠(Screen Set)를 연결**하고, 그중 1개를 현재 화면으로 사용하는 데이터·API 기반을 구현했다. 콘텐츠 원본은 한 번만 존재하고, 코너 연결은 링크만이다.

- **신규 테이블 `store_tablet_corner_contents`**(UNIQUE(tablet,set), FK CASCADE) + 기존 `current_screen_set_id` 백필.
- **연결 API**: 목록/추가/제거(현재 콘텐츠 409)/정렬 + 적용(연결 보장+current 원자적).
- **보관 가드**: 현재 사용/연결 시 archived 거부(자동 해제 없음).
- 원본 복사·QR 재생성·slug 변경·보호 샘플 변경 **없음**. 프로덕션 tsc 0, 태블릿 jest 29 PASS.

---

## 1. 스키마 (migration `20270208000000`, additive)
`store_tablet_corner_contents`:
| 컬럼 | 비고 |
|------|------|
| id / organization_id / tablet_id / screen_set_id | 연결 |
| sort_order / is_visible | 순서 / 표시 |
| created_at / updated_at | |
| **UNIQUE(tablet_id, screen_set_id)** | 코너 내 중복 연결 금지 |
| FK tablet_id → store_tablets **ON DELETE CASCADE** | 코너 삭제 시 연결 정리 |
| FK screen_set_id → store_tablet_screen_sets **ON DELETE CASCADE** | 원본 삭제 시 연결 정리 |
| index (org, tablet), (screen_set) | 목록·역조회 |

- **백필(up)**: `current_screen_set_id IS NOT NULL` 코너 → (tablet, current_set) 연결 INSERT (org 일치 + 미삭제 set). `ON CONFLICT DO NOTHING`(멱등). 보호 샘플 2건 current 연결 자동 생성.
- 기존 `current_screen_set_id` / screen_set / QR **무변경**.

## 2. current_screen_set_id 역할 유지 (§2)
- 연결 목록 = 코너에서 선택 가능한 콘텐츠. `current_screen_set_id` = 현재 표시 콘텐츠(∈ 연결).
- **적용 `POST /tablets/:id/current-screen-set`**: org+active 검증 후 **트랜잭션**(연결 INSERT ON CONFLICT DO NOTHING → current UPDATE) — 연결 없으면 생성(불변식 보장). legacy `tablet_id` 전용 제약(SCREEN_SET_NOT_APPLICABLE)은 **다중 코너 재사용과 충돌 → 제거**(연결 기반 대체).

## 3. 관리 API (§3, owner 인증 + org 경계)
| 목적 | 엔드포인트 | 처리 |
|------|-----------|------|
| 연결 목록 | `GET /tablets/:id/screen-sets` | 연결 + `isCurrent` + set 메타(name/status/templateKey/blockCount/publicQrSlug/sortOrder/isVisible) |
| 연결 추가 | `POST /tablets/:id/screen-sets/:screenSetId` | org 일치 + 미삭제 + **미보관**(409 SCREEN_SET_ARCHIVED). UNIQUE 멱등 |
| 연결 제거 | `DELETE /tablets/:id/screen-sets/:screenSetId` | **현재 콘텐츠면 409 `CURRENT_CONTENT_CANNOT_BE_REMOVED`**(자동 전환 없음). 그 외 삭제(원본/타 코너/QR 무변경) |
| 정렬 | `PATCH /tablets/:id/screen-sets/order` | body.order = screenSetId 배열 → sort_order 재부여(트랜잭션) |
| 현재 전환 | `POST /tablets/:id/current-screen-set` | §2 (연결 보장 + current) |

## 4. 연결 추가 검증 (§4)
- owner 인증(withStoreAuth) + tablet org 일치 + set org 일치 + `deleted_at IS NULL` + `status <> archived` + UNIQUE(중복 방지).
- 같은 콘텐츠를 **여러 코너에 연결 가능**(코너별 연결 행).

## 5. 코너에서 제거 (§5)
- 연결만 DELETE. **Screen Set 원본 / 다른 코너 연결 / QR slug / QR 모바일 화면 무변경**(FK 아닌 연결 행만).
- 현재 사용 중 → 409(먼저 전환/해제 유도).

## 6. 보관 연동 (§6)
- `PATCH /screen-sets/:id` status=archived: **현재 사용 중 코너 있으면 409 `ARCHIVE_BLOCKED_CURRENT`**; 사용 중 아니어도 **연결 있으면 409 `ARCHIVE_BLOCKED_CONNECTED`(linkCount 안내)**. **자동 연결 삭제 없음**.

## 7. 백필 (§7)
- migration up() 에서 멱등 백필(§1). 조건 보장: 중복 생성 없음(ON CONFLICT) / org 일치(JOIN 조건) / `current_screen_set_id` 변경 없음 / Screen Set·QR 무변경.
- 보호 샘플 2건: 현재 연결(구강 tablet↔구강 set, 피부↔피부) 유지.

## 8. 보호 샘플 (§8)
- 구강/피부 삭제·보관·내용 초기화 **없음**. 연결 백필 + 정합성만.

## 9. 변경 파일
```
apps/api-server/src/database/migrations/20270208000000-CreateStoreTabletCornerContents.ts  (신규)
apps/api-server/src/routes/platform/store-tablet.routes.ts                                 (apply 확장 + 연결 API + archive 가드)
```
- 코너 관리 UI/원본 복사/QR 재생성/slug 변경/보호 샘플 삭제/상품·영상 정리/current_screen_set_id 제거 **없음**(§금지 준수).

## 10. 검증
| 항목 | 결과 |
|------|------|
| 프로덕션 tsc(tsconfig.build.json) | **0** |
| jest 태블릿(screen/idle/content-list) | **29 PASS** |
| API 배포 + migration | ✅ **success** (run 29396583753) |
| 백필(보호 샘플 current→연결) | ✅ 구강 tablet→구강 set / 피부 tablet→피부 set, **is_current=t·is_visible=t·sort_order=0**, 전체 2건(중복 0) |

- **연결 API 대화형 smoke(추가/제거 409/정렬/전환/보관 가드)**: 매장 owner 인증 필요 → 자동 로그인 금지 → **DEFERRED**(후속 UI WO 또는 인증 세션). 인증 확인 항목:
  1. 코너에 여러 콘텐츠 연결 · 동일 콘텐츠 다중 코너 연결 · 동일 코너 중복 차단 · 타 매장 차단.
  2. 현재 전환(연결 자동 생성) · 현재 콘텐츠 제거 409 · 비현재 연결 해제.
  3. 정렬 · 원본/QR slug 불변.
  4. 보관 가드(현재/연결 시 409).

## 11. 완료 기준 대비
| 기준 | 상태 |
|------|------|
| 코너×콘텐츠 다대다 연결 모델 | ✅ |
| current_screen_set_id 역할 유지 | ✅ |
| 연결 추가·제거·정렬 API | ✅ |
| 현재↔연결 정합성(적용=연결 보장) | ✅ |
| 기존 current 멱등 백필 | ✅ (migration) |
| 보호 샘플 유지 | ✅ (백필 연결만, 원본 무변경) |
| commit/push·배포 | ✅ (1760ec9ee · API deploy + migration success) |

## 12. 후속
```
WO ...-CORNER-CONTENT-MOBILE-UI-V1  (코너 관리 반응형 UI: 현재/연결 목록·빠른 교체·표시숨김·추가·제거)
(작은 정비) 태블릿 로컬 상품 price "8500.00"→"8,500원" 포맷 / 테스트 junk 상품 정리
```

---

*store_tablet_corner_contents(UNIQUE(tablet,set)·FK CASCADE·org)=연결 SSOT. current_screen_set_id 유지(∈연결). 적용=연결 보장+current 원자적(legacy tablet_id 제약 제거). API=목록/추가(미보관)/제거(현재 409)/정렬. 보관 가드(현재/연결 시 409·자동해제 없음). migration up() current→연결 멱등 백필(보호 샘플 포함). 원본/QR/slug/보호샘플 무변경. tsc0·jest29. API 대화형 smoke=owner 인증 필요 DEFERRED.*
