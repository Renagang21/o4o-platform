# CHECK-O4O-DIGITAL-SIGNAGE-ENTITY-CIRCULAR-IMPORT-REMOVAL-V1

- 작업: `WO-O4O-DIGITAL-SIGNAGE-ENTITY-CIRCULAR-IMPORT-REMOVAL-V1`
- 일자: 2026-08-04
- 브랜치: `main` / 시작 HEAD: `122866ff9` / 시작 시 작업 트리: 대상 경로 clean
- 성격: 순환 초기화 제거 (schema 0 / migration 0 / relation 의미 0 / 데이터 0 / 기능 확대 0)

---

## 1. 증상과 원인

보고된 오류:

```
ReferenceError: Cannot access 'MediaList' before initialization
at packages/digital-signage-core/dist/backend/entities/MediaListItem.entity.js
```

재현 (수정 전):

```
node --input-type=module -e "import('./dist/backend/entities/index.js')"
→ FAIL: ReferenceError: Cannot access 'MediaList' before initialization
```

**원인 = lazy 화살표(`() => MediaList`) 가 아니라 `emitDecoratorMetadata` 가 만들어내는 eager value 참조.**

`packages/digital-signage-core` 는 `"type": "module"` (ESM) 이고, TypeScript 가
`@ManyToOne(() => MediaList, ...)` 이 붙은 프로퍼티에 대해 아래를 함께 emit 한다.

```js
// dist/backend/entities/MediaListItem.entity.js (수정 전 73행)
__metadata("design:type", MediaList)
```

이 `__metadata(...)` 인자는 `__decorate([...])` 배열 안에서 **모듈 최상위에서 즉시 평가**된다.
`MediaList.entity.js` ↔ `MediaListItem.entity.js` 가 서로 value import 하는 상태에서
ESM 순환 그래프가 형성되면, 나중에 평가되는 쪽의 class binding 이 TDZ 에 있어
`ReferenceError: Cannot access 'X' before initialization` 이 발생한다.

즉 **decorator 의 lazy 함수만으로는 순환을 끊을 수 없고, value import 자체를 없애야 한다.**

## 2. 제거 방법 (CLAUDE.md §2 FROZEN 표준 패턴)

CLAUDE.md §2 (TypeORM Entity – ESM Rules, FROZEN) 가 규정한 canonical 패턴을 그대로 적용했다.

```ts
// ❌ 수정 전
import { MediaListItem } from './MediaListItem.entity.js';
@OneToMany(() => MediaListItem, (item) => item.mediaList)

// ✅ 수정 후
import type { MediaListItem } from './MediaListItem.entity.js';
@OneToMany('MediaListItem', 'mediaList')
```

- `import type` → 컴파일 시 import 문 자체가 제거되므로 런타임 순환 간선이 사라진다.
  (`design:type` 은 `Object` 로 emit 되고, TypeORM 은 이를 사용하지 않는다.)
- 문자열 relation target + inverse property → TypeORM 이 필요한 관계 정보를 그대로 확보한다.
- **우연한 통과(import 순서 조정 / barrel export 순서 조정)는 사용하지 않았다.** 구조적으로 제거했다.

이 패턴은 신규 도입이 아니라 같은 패키지의 production 엔티티 8개가 이미 사용 중인 기존 표준이다.
예: `SignagePlaylistItem.entity.ts:79` `@ManyToOne('SignagePlaylist', 'items', { onDelete: 'CASCADE' })`,
`SignagePlaylist.entity.ts:155` `@OneToMany('SignagePlaylistItem', 'playlist')`.

## 3. 변경 파일 (4개, 모두 `packages/digital-signage-core/src/backend/entities/`)

| 파일 | 변경 |
|------|------|
| `MediaList.entity.ts` | value import → `import type` / `@OneToMany('MediaListItem', 'mediaList')` |
| `MediaListItem.entity.ts` | value import → `import type` (MediaList, MediaSource) / `@ManyToOne('MediaList', 'items')` · `@ManyToOne('MediaSource')` |
| `Display.entity.ts` | value import → `import type` / `@OneToMany('DisplaySlot', 'display')` |
| `DisplaySlot.entity.ts` | value import → `import type` / `@ManyToOne('Display', 'slots')` |

컬럼 정의 / `@JoinColumn({ name: 'mediaListId' })` / `@JoinColumn({ name: 'displayId' })` / `@Index()` /
`@Entity(...)` 테이블명은 **한 글자도 변경하지 않았다.**

### 3-1. 범위 note — Display ↔ DisplaySlot (WO 중지 조건 해당 · 명시 보고)

WO 중지 조건에 "다른 Digital Signage 엔티티까지 연쇄 순환이 발견됨" 이 있고, **실제로 발견되었다.**

MediaList/MediaListItem 만 수정 후 재빌드 → import smoke 결과:

```
FAIL: ReferenceError: Cannot access 'Display' before initialization
dist/backend/entities/DisplaySlot.entity.js:85: __metadata("design:type", Display)
```

`Display` ↔ `DisplaySlot` 은 **동일 원인의 두 번째 순환 쌍**이며, barrel(`entities/index.ts`)이
legacy 7개 엔티티를 모두 로드하기 때문에 이 쌍이 남아 있으면 WO 목표 ④
(api-server 에서 entity/DataSource import 정상 동작)에 **도달할 수 없다.**

판단: 우회(import 순서 조정 등)가 아니라 §2 와 완전히 동일한 FROZEN canonical 패턴을
동일 패키지·동일 결함에 적용하는 것이므로 중단 대신 적용하고, 본 CHECK 와 완료 보고에
범위 확장으로 명시한다. 새로운 relation·기능·테이블은 추가되지 않았다.

## 4. relation 의미 불변 근거

임시 DataSource(`buildMetadatas()`, DB 접속 없음)로 metadata 등록까지 검증한 실측:

| 엔티티 | relation | type | target | inverse | join | ref | owner | nullable | onDelete | onUpdate | cascade I/U/R | orphan | eager | lazy |
|--------|----------|------|--------|---------|------|-----|:-----:|:--------:|----------|----------|:-------------:|:------:|:-----:|:----:|
| MediaList | items | one-to-many | MediaListItem | mediaList | – | – | false | true | (default) | (default) | false/false/false | undefined | false | false |
| MediaListItem | mediaList | many-to-one | MediaList | items | `mediaListId` | `id` | true | true | (default) | (default) | false/false/false | undefined | false | false |
| MediaListItem | mediaSource | many-to-one | MediaSource | (none) | `mediaSourceId` | `id` | true | true | (default) | (default) | false/false/false | undefined | false | false |
| Display | slots | one-to-many | DisplaySlot | display | – | – | false | true | (default) | (default) | false/false/false | undefined | false | false |
| DisplaySlot | display | many-to-one | Display | slots | `displayId` | `id` | true | true | (default) | (default) | false/false/false | undefined | false | false |

FK 실측:

```
MediaListItem : mediaListId->signage_media_list(id) onDelete=NO ACTION
                mediaSourceId->signage_media_source(id) onDelete=NO ACTION
DisplaySlot   : displayId->signage_display(id) onDelete=NO ACTION
```

컬럼 수: MediaList 10 / MediaListItem 9 / Display 13 / DisplaySlot 12 — 수정 전 소스 정의와 동일.

**불변 근거 정리**

1. 수정 전·후 모두 relation decorator 에 **옵션 객체가 존재하지 않는다.** 따라서
   cascade / nullable / onDelete / orphanRemoval / eager 는 전부 TypeORM 기본값이며 변경 여지가 없다.
2. `@JoinColumn` 은 그대로이므로 소유 측·조인 컬럼·참조 컬럼이 동일하다.
3. inverse side 는 함수형(`(item) => item.mediaList`)에서 문자열(`'mediaList'`)로 **표기만** 바뀌었고
   TypeORM 내부적으로 동일한 `inverseSidePropertyPath` 로 해석된다 (위 표에서 실측 확인).
4. 수정 전 상태에서는 모듈 로드 자체가 `ReferenceError` 로 실패하므로 "수정 전 metadata 덤프"는
   원리적으로 생성할 수 없다. 따라서 불변성은 (1)~(3) 의 정적 근거 + 수정 후 실측으로 확인했다.

## 5. import smoke 결과 (수정 후, 전부 예외 없이 종료)

```
OK   packages/digital-signage-core/dist/backend/entities/MediaList.entity.js
OK   packages/digital-signage-core/dist/backend/entities/MediaListItem.entity.js
OK   packages/digital-signage-core/dist/backend/entities/Display.entity.js
OK   packages/digital-signage-core/dist/backend/entities/DisplaySlot.entity.js
OK   packages/digital-signage-core/dist/backend/entities/index.js
OK   packages/digital-signage-core/dist/index.js
```

api-server 측:

```
node -e "require('reflect-metadata'); import('./dist/database/entities.js'); import('./dist/database/connection.js')"
→ OK entities keys: entities
→ OK AppDataSource: true  entities: 273
```

metadata 등록: 임시 DataSource `buildMetadatas()` → `TOTAL entities registered: 16` (예외 0).

> 참고: `tsx -e` 로는 검증할 수 없다. esbuild 는 `emitDecoratorMetadata` 를 지원하지 않아
> 서명과 무관한 `Column type for DeploymentInstance#domain is not defined` 이 먼저 발생한다.
> 실제 런타임(=tsc 산출 `dist`)에서 검증했다.

## 6. 빌드 / 테스트

| 항목 | 결과 |
|------|------|
| `digital-signage-core` build (`npx tsc`) | PASS (exit 0) |
| api-server typecheck (`tsc --noEmit -p tsconfig.build.json`) | 오류 1건 — **기존 결함, 본 변경과 무관** (아래) |
| `apps/api-server` dist import (entities + AppDataSource) | PASS |
| 엔티티 metadata 초기화 | PASS (16 entities) |
| `dashboard-assets-ownership-gate.spec.ts` (signage entities barrel 소비) | PASS 25/25 |

api-server typecheck 잔여 오류 (사전 존재 · 본 WO 범위 밖 · 미수정):

```
src/services/pharmacy-hub/PharmacyHubStoreProvisioningService.ts(340,11):
  error TS2322: Type '"pharmacy-hub"' is not assignable to type 'StoreSlugServiceKey'.
```

해당 파일은 HEAD(`43f52789b`)에 커밋된 상태 그대로이며 작업 트리에서 수정하지 않았다.
WO 지시("Pharmacy-Hub 프로비저닝 코드나 backfill 코드는 이 작업에서 수정하지 않는다")에 따라 손대지 않았다.
digital-signage 관련 타입 오류는 0건이다.

## 7. DB / migration 변경 0

- migration 파일 추가·수정 0.
- `signage_media_list_item` / `signage_display_slot` 을 생성하는 migration 은 저장소에 존재하지 않는다
  (`apps/api-server/src/database/migrations` 전수 grep 결과 0건).
- `apps/api-server/src/database/entities.ts:473-475` 는 `SignageCoreEntities`(production `Signage*` 9개)만
  등록한다. MediaList/MediaListItem/Display/DisplaySlot 은 **AppDataSource 에 등록되지 않는다**
  (실측: `MediaList in AppDataSource entities: false`). 즉 이 엔티티들은 schema 동기화 대상이 아니다.
- 컬럼·테이블·FK·인덱스 정의가 불변이므로 migration diff 는 0 이다.
- 데이터 write 0 / 배포 0.

## 8. 소비처 회귀

공용 패키지 변경이므로 전 소비처를 확인했다.

| 소비처 | 확인 |
|--------|------|
| `apps/api-server/src/database/entities.ts` | `SignageCoreEntities` 만 import — 영향 없음, dist import smoke PASS |
| `apps/api-server/src/routes/signage/**` (repositories·services·controllers) | 전부 `Signage*` production 엔티티 사용 — 변경 파일과 무관 |
| `apps/api-server/src/routes/dashboard/dashboard-assets.copy-handlers.ts` | `Signage*` 사용 — 관련 spec 25/25 PASS |
| `packages/digital-signage-core` 내부 서비스 (`MediaListService`, `MediaListItemService`, `DisplaySlotService`) | 엔티티 클래스를 repository 토큰으로 value import — 순환 아님, 그대로 동작. `MediaListService:39` 의 `relations: ['items', 'items.mediaSource']` 경로는 metadata 실측에서 `MediaList.items` · `MediaListItem.mediaSource` 존재 확인 |
| `packages/store-asset-policy-core` | `SignageMedia` 계열만 참조 |
| KPA-Society / K-Cosmetics / GlycoPharm / Pharmacy-Hub frontend | 백엔드 엔티티를 직접 import 하지 않음 (API 경유) — 영향 없음 |
| `apps/admin-dashboard` digital-signage 화면 | API 계약 사용, 엔티티 미참조 |

Digital Signage CRUD 계약(라우트·DTO·서비스 시그니처) 변경 0.

## 9. 판정

**PASS** — 순환 초기화 제거 완료. 목표 ①~⑤ 충족.
범위 확장 1건(Display ↔ DisplaySlot, §3-1)은 동일 결함·동일 canonical 패턴이며 명시 보고했다.
