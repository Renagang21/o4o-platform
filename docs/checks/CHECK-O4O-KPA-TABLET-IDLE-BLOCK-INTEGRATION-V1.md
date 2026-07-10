# CHECK-O4O-KPA-TABLET-IDLE-BLOCK-INTEGRATION-V1

> WO: `WO-O4O-KPA-TABLET-IDLE-BLOCK-INTEGRATION-V1`
> 성격: idle_media block **호환 통합** — 데이터 이전/public runtime 변경/migration 없음.
> 선행: SCHEMA-V1 · API-CONTRACT-V1 · API-IMPLEMENTATION-V1

---

## 0. 결론

"대기화면 = screen set 안의 `idle_media` block" 원칙을 **호환 단계로 실현**한다. 저장소 이전 없이:
- `PUT /store/screen-sets/:id/blocks`의 `idle_media` block **config 검증 보강**(source/durationMs/custom_media).
- `idle_media` source가 기존 `idle_playlist_items`(`legacy_idle_playlist`) / operator selection(`operator_common`) / block 자체(`custom_media`)를 가리키는 **dual-read resolver 준비**(순수 함수, DI). **public runtime 미연결** — 이후 PUBLIC-RUNTIME-READ WO 재사용.

## 1. 변경 파일

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/routes/platform/store-tablet-idle-block.ts` (신규) | `parseIdleMediaConfig`(검증/정규화) + `resolveIdleMediaItems`(순수 dual-read resolver, DI) + 상수/타입 |
| `apps/api-server/src/routes/platform/store-tablet.routes.ts` | blocks PUT 검증에 `idle_media` config 검증 1블록 추가 + import |
| `apps/api-server/src/routes/platform/__tests__/store-tablet-idle-block.test.ts` (신규) | 단위 테스트 12(parse 7 + resolve 5) |

> 기존 idle 저장소/편집 API/공개 핸들러 무변경. 신규 엔드포인트 없음(기존 blocks PUT 검증만 강화).

## 2. idle_media config 계약

지원 `source` 3종:

| source | 의미 | dual-read 대상 |
|---|---|---|
| `legacy_idle_playlist` | 기존 매장 대기 재생목록 | `store_tablets.idle_playlist_items` (참조) |
| `operator_common` | 운영자 공통 대기 영상 선택 | `store_tablet_operator_idle_selections` (참조) |
| `custom_media` | block 자체 정의 미디어 | block config `items[]` |

config 스키마:
```jsonc
{ "source": "legacy_idle_playlist", "durationMs": 30000 }          // durationMs optional
{ "source": "operator_common" }
{ "source": "custom_media",
  "items": [ { "mediaType": "youtube|vimeo|image|video", "url": "...", "durationMs": 5000 } ] }  // items ≥1
```

## 3. validation 규칙 (`parseIdleMediaConfig`)

```text
config = object (아니면 400)
source 필수 · IDLE_MEDIA_SOURCES(3) 중 하나 (아니면 400)
durationMs optional · number · [500, 3_600_000]ms (범위 밖 400)
custom_media → items 필수(비어있지 않은 배열), 각 항목:
   mediaType ∈ {image,video,youtube,vimeo}, url 비어있지 않은 string, durationMs? 범위
```
- 위반 시 blocks PUT → `400 INVALID_BLOCK_CONFIG` (`blocks[i].config: <사유>`).
- 다른 block_type은 기존 검증(object 여부)만 — idle_media만 심층 검증.

## 4. dual-read helper

`resolveIdleMediaItems(normalized, sources)` — **순수 함수**(DB 접근 0):
```text
legacy_idle_playlist → sources.legacyIdlePlaylist ?? []
operator_common      → sources.operatorCommon ?? []
custom_media         → normalized.items ?? []
block-level durationMs → 항목별 durationMs 미지정 시 fallback 주입
소스 없음 → [] (fallback safe)
```
- caller(후속 runtime WO)가 legacy 저장소에서 읽어 주입 → 재사용. **이번 WO는 public runtime에 연결하지 않음.**

## 5. 기존 idle 저장소 / public runtime 불변

| 대상 | 상태 |
|---|:--:|
| `store_tablets.idle_playlist_items` | ✅ 무변경 (참조만) |
| `store_tablet_operator_idle_selections` | ✅ 무변경 (참조만) |
| 기존 idle 편집 API(GET/PUT idle-playlist, operator selection) | ✅ 무변경 |
| public tablet runtime(`store-public-tablet.handler.ts`) | ✅ 미접촉 (resolver 미연결) |
| `store_tablet_displays` 흡수 / migration / 데이터 이전 | ✅ 없음 |

## 6. 금지 범위 준수

public runtime 변경 / idle_playlist_items 이전 / operator 정책 변경 / idle 편집 UI 제거 / screen set 자동 생성 / current 자동 적용 / displays 흡수 / DB migration / OPL·service_key 혼합 — **전부 없음.** 테스트 데이터는 smoke 1건으로 최소화.

## 7. 검증 결과

| 항목 | 결과 |
|---|:--:|
| api-server typecheck (변경 파일) | ✅ PASS |
| 단위 테스트 (`store-tablet-idle-block.test.ts`) | ✅ 12/12 PASS |
| 배포 (Deploy API, migration 없음) | ⏳ (배포 후) |
| API smoke (idle_media 저장 정상 + 잘못된 config 400) | ⏳ (배포 후) |
| 기존 idle_playlist_items / operator selection row count 불변 | ⏳ (배포 후) |

_(배포 후 채움)_

## 8. 완료 기준

- [x] idle_media block 저장/검증
- [x] 기존 idle 저장소·public runtime 불변 (참조만, 미연결)
- [x] DB migration 0 / 데이터 이전 0
- [x] typecheck + 단위 테스트
- [ ] build/배포 + smoke
- [x] CHECK 작성 · [ ] commit/push

## 9. 다음 단계

EDITOR-UX → PUBLIC-RUNTIME-READ(여기서 `resolveIdleMediaItems` 연결) → LEGACY-COMPATIBILITY.
