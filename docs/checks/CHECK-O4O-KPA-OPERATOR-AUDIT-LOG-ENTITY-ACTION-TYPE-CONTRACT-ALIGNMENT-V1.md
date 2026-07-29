# CHECK — WO-O4O-KPA-OPERATOR-AUDIT-LOG-ENTITY-ACTION-TYPE-CONTRACT-ALIGNMENT-V1

KPA 운영자 감사 로그(`kpa_operator_audit_logs`)의 실제 emitter·DB 값과 backend entity 타입·frontend 매핑 계약 정합.

- **작업 WO**: WO-O4O-KPA-OPERATOR-AUDIT-LOG-ENTITY-ACTION-TYPE-CONTRACT-ALIGNMENT-V1
- **일자**: 2026-07-29
- **판정**: PASS
- **DB migration**: 없음 (varchar 컬럼 그대로, enum·데이터 migration 없음)

---

## 1. 프로덕션 action/entity census (read-only, cloud-sql-proxy)

`o4o_platform.kpa_operator_audit_logs` 총 **261행**. null/empty 0, casing 이상 0 (action 전부 UPPER, target 전부 lower).

### action_type (전체 14종)

| action_type | count | 비고 |
|---|---:|---|
| MEMBER_STATUS_CHANGED | 148 | |
| CONTENT_CREATED | 39 | |
| CONTENT_DELETED | 19 | |
| MEMBER_INFO_UPDATED | 15 | |
| COURSE_HARD_DELETED | 11 | |
| CONTENT_UPDATED | 8 | |
| CONTENT_BATCH_HARD_DELETED | 5 | |
| CONTENT_HARD_DELETED | 5 | |
| APPLICATION_REVIEWED | 3 | **legacy** (은퇴한 신청서 검토 flow 잔존) |
| CONTENT_BATCH_ARCHIVED | 3 | |
| MEMBER_ROLE_CHANGED | 2 | |
| STOREFRONT_CONFIG_UPDATED | 1 | |
| PHARMACY_INFO_UPDATED | 1 | |
| RESOURCE_DELETED | 1 | |

> live emitter 이나 실행 이력 0: `CONTENT_BATCH_PUBLISHED`, `RESOURCE_STATUS_CHANGED` (코드 존재, 미발화).

### target_type (전체 4종)

| target_type | count | 비고 |
|---|---:|---|
| member | 165 | |
| content | 49 | |
| kpa_content | 44 | |
| application | 3 | **legacy** |

### action × target 조합 (16종)

`COURSE_HARD_DELETED→content(11)`, `RESOURCE_DELETED→kpa_content(1)`, `PHARMACY_INFO_UPDATED→content(1)`, `STOREFRONT_CONFIG_UPDATED→content(1)`, `CONTENT_CREATED→{content 8, kpa_content 31}`, `CONTENT_DELETED→{content 7, kpa_content 12}` 등 — course/resource/pharmacy/storefront 개념은 **action_type 에만 인코딩**되고 target_type 은 content/kpa_content 로 기록됨.

## 2. Emitter inventory (코드 전수)

| emitter 위치 | action_type | target_type |
|---|---|---|
| `kpa.routes.ts` `writeAuditLog` (content 경로) | CONTENT_CREATED / CONTENT_UPDATED / CONTENT_DELETED / CONTENT_HARD_DELETED / CONTENT_BATCH_PUBLISHED / CONTENT_BATCH_ARCHIVED / CONTENT_BATCH_HARD_DELETED / COURSE_HARD_DELETED | content |
| `kpa.routes.ts` `writeAuditLog` (kpa_content 경로) | CONTENT_CREATED / CONTENT_UPDATED / CONTENT_DELETED / RESOURCE_STATUS_CHANGED / RESOURCE_DELETED | kpa_content |
| `member.controller.ts` (직접 `auditRepo.save`) | MEMBER_STATUS_CHANGED / MEMBER_ROLE_CHANGED / MEMBER_INFO_UPDATED | member |
| `pharmacy-info.controller.ts` | PHARMACY_INFO_UPDATED | content |
| `pharmacy-store-config.controller.ts` | STOREFRONT_CONFIG_UPDATED | content |
| `pharmacy-products.controller.ts` | CONTENT_UPDATED (listing/channel) | content |
| (없음 — 은퇴) | APPLICATION_REVIEWED | application |

모든 emitter 는 기록 실패를 삼키는 try/catch (감사 로그 실패가 본 작업을 막지 않음). GET `/operator/audit-logs` (kpa:admin) 는 raw entity row 를 `data` 로 반환(별도 DTO/serializer 없음).

## 3. 기존 타입 불일치 원인

- **entity union 이 실측보다 좁고 낡음**: `KpaAuditActionType` = 6종(실제 14종+2 live emitter), `KpaAuditTargetType` = `member|application|content` (**`kpa_content` 44행 누락**).
- 이 때문에 모든 emitter 가 `action_type: ... as any` / `target_type: ... as any` 로 **union 을 우회**. 컬럼은 실제 `varchar(50)` 이라 DB 는 아무 문자열이나 수용 → 타입은 장식일 뿐 거짓.
- frontend `AuditLog` 는 이미 `action_type: string` / `target_type: string` (open) + label/color raw fallback → **화면이 깨지지 않는 안전 상태**였음. 다만 `TARGET_LABELS` 에 실 데이터 0건인 course/resource/pharmacy/storefront 4종이 남아 필터 드롭다운을 오염.

## 4. 확정한 canonical 계약

**Contract = open-string 영속 + 문서화된 known-values union + 읽기측 raw fallback.**
- DB 컬럼 = `varchar(50)` (그대로). 새 action/target 추가 시 타입 변경·migration 불필요 → 기능 확장성 차단 금지 원칙 준수.
- 알려진 값은 `KpaAuditActionType`(16) / `KpaAuditTargetType`(4) union 으로 **문서화**하되, entity 컬럼 자체는 `string`.
- source of truth = 코드 emitter + 프로덕션 census. frontend union 에 맞추려 backend 값을 변형하지 않음. unknown 은 오류가 아니라 호환 대상.

## 5. Backend 수정 (`apps/api-server`)

- [kpa-audit-log.entity.ts](../../apps/api-server/src/routes/kpa/entities/kpa-audit-log.entity.ts):
  - `KpaAuditTargetType` → `member | content | kpa_content | application(legacy)` (실측 4종, `kpa_content` 추가).
  - `KpaAuditActionType` → emitter 전수 16종 (기존 6 → 16).
  - `action_type` / `target_type` 컬럼 타입 union → **`string`** (open, varchar 계약과 일치). JSDoc 으로 known-values·확장성·fallback 명문화.
- [kpa.routes.ts](../../apps/api-server/src/routes/kpa/kpa.routes.ts) `writeAuditLog`: 컬럼이 open string 이 되어 불필요해진 `as any` 제거, `targetType` 파라미터 `string` 으로 정합.
  - member/pharmacy 컨트롤러의 직접 `auditRepo.create({... as any})` 는 무해(문자열→string 컬럼)하여 diff 최소화 위해 미변경.
- **런타임 동작 변화 없음** (타입/캐스트만). GET 응답 계약(raw row) 불변.

## 6. Frontend 수정 (`services/web-kpa-society`)

- [AuditLogPage.tsx](../../services/web-kpa-society/src/pages/operator/AuditLogPage.tsx):
  - `AuditLog` 인터페이스 `string` 유지(이미 open).
  - `ACTION_LABELS` 16키 = emitter 전수와 일치 → 유지(정상 라벨·색상 미변경).
  - `TARGET_LABELS` 에서 실 데이터 0건·emitter 없는 `course/resource/pharmacy/storefront` **4종 제거** → member/content/kpa_content/application(legacy) 4종만. 필터 드롭다운이 실제 대상과 정합.
  - render 의 `ACTION_LABELS[..] || raw`, `ACTION_COLORS[..] || gray`, `TARGET_LABELS[..] || raw` fallback 그대로 유지.

## 7. unknown · legacy fallback

- **legacy**: `APPLICATION_REVIEWED`(3) / `application`(3) 는 union·라벨에 보존 → 잔존 로그 정상 표시·필터 가능. 데이터 삭제·migration 없음.
- **unknown(미래 신규)**: entity 컬럼 open string → 신규 emitter 는 타입 변경 없이 기록. 화면은 라벨/색상 미매핑 시 raw key + 회색 뱃지로 표시(크래시 없음). 단 필터 드롭다운은 known 값만 노출(미래 신규 값은 표시는 되나 필터 선택지에는 자동 추가 안 됨 — §8).

## 8. 필터·상세 화면 검증

- 액션 필터: `ACTION_LABELS` 16키 = 실측 14 + live emitter 2 전량 포함 → 실 데이터의 모든 action 선택 가능.
- 대상 필터: 4종(member/content/kpa_content/application) = 실측 4종과 1:1.
- 상세(metadata): `formatMetadata` 가 previousStatus/newStatus·role·decision·title 등 요약 — 본문 dump 회피(변경 없음). detail drawer 는 read-only 특성상 도입 안 함(scope 외).

## 9. HOLD 항목

없음. 모든 action/entity 의미가 코드+DB 로 확정. 한 값이 서로 다른 업무 의미로 쓰이는 경우 없음(action×target 조합 census 로 확인). 공용 audit 패키지 breaking change 불필요(union 은 entity 파일 내부에서만 사용 — 외부 소비자 0, grep 확인).

## 10. DB · migration 여부

**DB 변경 0.** enum migration·데이터 migration·컬럼 타입 변경 없음. `varchar(50)` 유지. 본 WO 는 TypeScript 타입 계약과 frontend 매핑만 정합.

## 11. 배포 · 실브라우저 smoke

- typecheck: api-server 변경 파일 0 error (`src/scripts/*` 기존 노이즈는 build tsconfig 제외), `tsc -p tsconfig.build.json` EXIT=0; web-kpa-society `tsc --noEmit` EXIT=0.
- build: api-server EXIT=0, web-kpa-society `vite build` ✓ EXIT=0.
- 배포: push → CI(detect-changes)로 `o4o-core-api` + `kpa-society-web` 자동 배포. (리비전·smoke 결과는 아래 완료 보고에서 갱신)

## 12. 잔여 미매핑 census

- action_type: 실측 14종 전량 라벨 매핑됨(미매핑 0). live-but-unfired 2종도 사전 매핑됨.
- target_type: 실측 4종 전량 라벨 매핑됨(미매핑 0).
- 미래 신규 값만이 잠재적 미매핑 대상이며 raw fallback 으로 안전 처리.

## 13. 커밋

- 코드 + CHECK: 아래 완료 보고 SHA 참조.
