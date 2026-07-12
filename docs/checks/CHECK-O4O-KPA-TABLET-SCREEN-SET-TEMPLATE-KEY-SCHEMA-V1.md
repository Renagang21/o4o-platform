# CHECK-O4O-KPA-TABLET-SCREEN-SET-TEMPLATE-KEY-SCHEMA-V1

> WO: `WO-O4O-KPA-TABLET-SCREEN-SET-TEMPLATE-KEY-SCHEMA-V1`
> 성격: template_key **컬럼 + 관리 API 노출/검증** 기반 작업. 템플릿 선택 UI·신규 렌더링 없음.
> 설계: [TEMPLATE-CONTRACT-DESIGN §4](CHECK-O4O-KPA-TABLET-TEMPLATE-CONTRACT-DESIGN-V1.md) (A안 컬럼).

---

## 0. 결론

`store_tablet_screen_sets.template_key`(nullable) additive 컬럼 추가 + 관리 API(GET/POST/PATCH)에 `templateKey` 노출·검증 + 공개 `/screen` 이 컬럼값 소비. **NULL = 기본 `corner_information_basic_v1`**(resolveTemplateKey 자동). 기존 세트·운영 샘플 무변경.

## 1. 변경 파일

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/database/migrations/20270205000000-AddTemplateKeyToTabletScreenSets.ts` (신규) | `ALTER TABLE store_tablet_screen_sets ADD COLUMN IF NOT EXISTS template_key VARCHAR(50)` (additive, CHECK 없음, down 완비) |
| `apps/api-server/src/routes/platform/store-tablet.routes.ts` | setCols 에 `COALESCE(template_key,'corner_information_basic_v1') AS "templateKey"` · POST/PATCH 에 templateKey 저장 + 화이트리스트 검증 |
| `apps/api-server/src/routes/platform/store-public/store-public-tablet.handler.ts` | `/screen` 세트 SELECT 에 `template_key` 추가 → `resolveTemplateKey` 가 실값 소비 |

## 2. template_key whitelist 정책 (§3.3 결정)

| template_key | Phase 1 저장 | 렌더 |
|---|:--:|---|
| (null) | ✅ | 기본 corner_information_basic_v1 |
| `corner_information_basic_v1` | ✅ | ✅ (라이브) |
| `product_focus` / `idle_video_first` / `comparison` | ❌ **400 INVALID_TEMPLATE_KEY** | 렌더러 없음 → 예약값 |

**결정: Phase 1 저장 허용 = `corner_information_basic_v1`(+null)만.** 렌더러가 없는 template_key 를 저장하면 "세트는 product_focus 인데 화면은 basic" 혼동 → 차단. 화이트리스트(`SET_TEMPLATE_KEYS_ALLOWED`)는 코드 상수 → 후속 **SCREEN-SET-TEMPLATE-APPLY** 에서 렌더러와 함께 확장(migration 불필요).

## 3. NULL fallback 정책 (§3.1)

- 기존 row = 전부 NULL. 관리 API 응답 `templateKey` = `COALESCE(template_key, 'corner_information_basic_v1')` → 항상 **실효값**(NULL 이어도 기본 문자열).
- 공개 `/screen` = `resolveTemplateKey(set)` (set.templateKey NULL/undefined → 기본). 동일.
- 저장은 NULL 허용(PATCH `templateKey:null` = 기본으로 초기화). 응답만 실효값으로 정규화.

## 4. API request/response 변경 (additive)

```
POST /store/screen-sets    body: { name, tabletId?, status?, templateKey? }   // templateKey 미지정=NULL
PATCH /store/screen-sets/:id body: { name?, status?, tabletId?, templateKey? } // null=기본 초기화
GET /store/screen-sets[/:id] 응답: { ..., templateKey: 'corner_information_basic_v1' }  // COALESCE 실효값
```
- 잘못된 templateKey → `400 INVALID_TEMPLATE_KEY`.
- 공개 `GET /:slug/tablet/screen` → `data.templateKey` = 세트 template_key 기준(NULL=기본).

## 5. 금지 범위 준수

템플릿 선택 UI / product_focus·idle_video_first·comparison 렌더링 / template 테이블 / block schema·구조 변경 / 운영 샘플 삭제 / legacy 재생성 / OPL·service_key 혼합 / 대량 데이터 — **전부 없음.**

## 6. 검증 결과

| 항목 | 결과 |
|---|:--:|
| migration 생성 | ✅ 20270205000000 (additive, IF NOT EXISTS, down 완비) |
| api-server typecheck (변경 파일) | ✅ PASS |
| 배포 (CI migration) | ⏳ (배포 후) |
| information_schema template_key 컬럼 | ⏳ (배포 후) |
| 운영 샘플 보존 + template_key NULL | ⏳ (배포 후) |
| GET/POST/PATCH templateKey + 잘못된값 400 | ⏳ (배포 후) |
| public /screen templateKey 기본값 | ⏳ (배포 후) |

_(배포 후 채움)_

## 7. 완료 기준

- [x] template_key nullable 컬럼 추가(migration)
- [x] 관리 API templateKey 조회/저장 + 화이트리스트 검증
- [x] NULL=기본 유지 (COALESCE/resolveTemplateKey)
- [x] 운영 샘플 보존(additive, 기존 row NULL)
- [x] 템플릿 UI/신규 렌더링 미구현
- [x] typecheck
- [ ] 배포 + information_schema/API/public 검증
- [x] CHECK 작성 · [ ] commit/push

## 8. 다음 단계

TEMPLATE-SELECTION-EDITOR(편집기 드롭다운) → SCREEN-SET-TEMPLATE-APPLY(product_focus 등 렌더러 + 화이트리스트 확장).
