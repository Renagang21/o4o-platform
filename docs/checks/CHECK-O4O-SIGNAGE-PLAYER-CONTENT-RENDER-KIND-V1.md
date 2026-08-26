# CHECK-O4O-SIGNAGE-PLAYER-CONTENT-RENDER-KIND-V1

- 성격: `WO-O4O-SIGNAGE-PLAYER-CHANNEL-CODE-LOOKUP-CONTRACT-CLOSURE-V1` 의 **후속 독립 수정**
- 선행 CHECK: [`CHECK-O4O-SIGNAGE-PLAYER-CHANNEL-CODE-LOOKUP-CONTRACT-CLOSURE-V1`](CHECK-O4O-SIGNAGE-PLAYER-CHANNEL-CODE-LOOKUP-CONTRACT-CLOSURE-V1.md)
- 기준 commit(base): `f8c9aedfc` (origin/main)
- 작업 worktree: `C:\tmp\o4o-signage-followup` (detached at origin/main)
- 작성일: 2026-08-26

> **이 문서는 channel code lookup 계약과 별개의 결함을 다룬다.**
> lookup 수렴(선행 CHECK)이 끝난 뒤에도 player 화면은 여전히 잘못 렌더되고 있었다.
> 원인이 다르므로 같은 커밋에 섞지 않고 독립 수정으로 분리했다.

---

## 1. 문제 확정

`GET /api/v1/channels/:id/contents` 응답의 `content.type` 은 **CMS 의 의미적 분류**다.

```text
ContentType = 'hero' | 'notice' | 'news' | 'featured' | 'promo' | 'event' | 'guide' | 'knowledge'
```

player 클라이언트(`services/signage-player-web/src/api/channels.ts`)는 이 값을 그대로
`ChannelContent['content'].contentType` 에 옮겨 담고, 렌더러는 그것을 **렌더 방식**으로 해석했다.

```text
ContentRenderer   switch (contentType) { 'image' | 'video' | 'html' | 'rich_text' | 'text' }
getContentDuration            contentType === 'video'
ChannelPlayerPage             contentType === 'video'
```

두 어휘는 **어떤 값에서도 만나지 않는다.** 결과:

1. 모든 슬롯이 `FallbackContent`(제목 + 요약 텍스트)로만 렌더된다.
   이미지·동영상·HTML 콘텐츠가 화면에 나오지 않는다.
2. `getContentDuration` 의 video 분기가 절대 참이 되지 않아,
   동영상이 자기 재생 길이 대신 채널 기본 duration 으로 끊긴다.
3. `ChannelPlayerPage` 의 video 대기 분기도 죽어 있어 `onVideoEnded` 경로가 사용되지 않는다.

이는 서버 계약 위반이 아니다. **서버는 처음부터 의미적 type 을 돌려주기로 되어 있었고,
player 가 그 필드를 렌더 방식으로 오해한 클라이언트 측 결함**이다.

---

## 2. 수정

렌더 방식을 type 이 아니라 **실제로 존재하는 필드**로 판정한다.
판정에 쓰는 필드는 기존 renderer 의 각 분기가 이미 보고 있던 것과 동일하다 —
새 서버 필드를 요구하지 않고, 서버 응답 계약도 바꾸지 않는다.

신규: `services/signage-player-web/src/api/content-render-kind.ts`

```ts
export type ContentRenderKind = 'video' | 'image' | 'html' | 'text'

export function resolveContentRenderKind(content: RenderableContent): ContentRenderKind {
  const meta = content.metadata ?? {}
  if (str(meta.videoUrl)) return 'video'
  if (str(meta.htmlUrl) || str(meta.url)) return 'html'
  if (content.featuredImage || str(meta.imageUrl)) return 'image'
  return 'text'
}
```

- 우선순위: `video > html > image > text`. video 가 image 보다 앞인 이유는
  동영상 슬롯이 썸네일(`imageUrl`)을 함께 갖는 경우 **자기 길이로 재생되어야** 하기 때문이다.
- `text` 가 기본값이다. 미디어 필드가 없는 콘텐츠는 fallback 이 아니라 정상 text 렌더다.
- 이 모듈은 `import.meta.env` 등 번들러 전용 구문을 쓰지 않는 **순수 모듈**이라
  api-server 의 jest 에서 그대로 import 해 검증할 수 있다.

소비처(3곳)를 이 판정으로 통일했다.

| 파일 | 변경 |
|---|---|
| `services/signage-player-web/src/api/channels.ts` | `getContentDuration` 의 video 판정 + re-export |
| `services/signage-player-web/src/components/ContentRenderer.tsx` | `switch (contentType)` → `switch (renderKind)` |
| `services/signage-player-web/src/pages/ChannelPlayerPage.tsx` | video 대기 분기 |

**서버·adapter 필드명은 건드리지 않았다.** origin/main 이 확정한 adapter
(`displayOrder` / `contentType` / `excerpt` / `featuredImage`)를 그대로 두고,
그 위에서 렌더 판정만 교체했다. 선행 CHECK 의 정적 계약 테스트와 충돌하지 않는다.

---

## 3. 회귀 테스트

`apps/api-server/src/__tests__/signage-player-content-render-kind.spec.ts` (26 tests)

- CMS 8개 type 전수 × 이미지/동영상 → type 에 좌우되지 않음을 고정 (16)
- 우선순위 · 빈 문자열/비문자열 metadata · `metadata: null` (5)
- 정적 회귀 가드 (4): 3개 소비처가 `contentType === 'video'` / `switch (contentType)` 로
  되돌아가지 않는지 + 판정 모듈이 순수 모듈로 유지되는지
- 주석은 `stripComments` 로 제거한 뒤 단언한다 (문서용 문자열이 가드를 통과시키지 않도록)

> signage-player-web 에는 test runner 가 없다(`tsc -b` + `vite build` 만 존재).
> 그래서 player 소스에 대한 계약 가드는 api-server jest 에서 수행한다.
> 선행 CHECK 의 정적 계약 테스트와 같은 방식이다.

---

## 4. 검증

| 항목 | 결과 |
|---|---|
| `apps/api-server` — 신규 spec | 26 passed / 26 |
| `apps/api-server` — `tsc --noEmit` | 0 errors |
| `apps/api-server` — 전체 jest | (§6 참조) |
| `services/signage-player-web` — `tsc -b` | 0 errors |
| `services/signage-player-web` — `vite build` | 성공 |
| production DB write | 0 |
| schema / migration | 없음 |
| 신규 인증 체계 | 없음 |

---

## 5. 잔존 부채 (이번에 수정하지 않음)

**의도적으로 기록만 한다.** 각각 원인·범위가 달라 이 수정에 묶으면 범위가 커진다.

| # | 항목 | 상태 | 판단 |
|---|---|---|---|
| D1 | `channels.code` 에 DB UNIQUE constraint 없음 | 미해결 | **schema/data 계약 문제.** 지금은 application-level 409 + `/code/:code` 의 `createdAt ASC` 결정성으로만 방어한다. 기존 중복 row 조사 → migration → 배포 순서가 필요하므로 별도 WO. (선행 CHECK §13 에도 등재) |
| D2 | `signage-player-web` 배포 파이프라인 미등록 | 미해결 | `.github/workflows/deploy-web-services.yml` matrix 에 없다. Dockerfile · nginx.conf 는 이미 있고 로컬 production build 도 성공한다. 인프라/CI 변경이라 CLAUDE.md 중지 조건 대상 → 별도 WO. |
| D3 | player telemetry 가 호출하는 `/api/signage/:serviceKey/channels/*` 서버 라우트 부재 | 미해결 | `PlayerTelemetry` 의 `heartbeat` / `playback-logs` / `errors` 3개 경로가 404 다. `apps/api-server/src/routes/signage/` 에 `channels` 하위 라우트가 없다. fire-and-forget 이라 재생에는 영향이 없으나 **telemetry 는 수집되지 않는다.** route 신설 = API contract 변경 → 별도 WO. |
| D4 | v2 계열 code 경로 미해석 | 미해결 | v1 channels 축(`ChannelPlayerPage`)과 `/api/signage/:serviceKey/*` 축(`SignagePlayerPage`)이 병존한다. 후자에는 code 기반 진입 경로가 정의되어 있지 않다. 두 축의 통합 여부는 계약 판단이므로 별도 WO. |

> D1 은 특히 즉석 처리 대상이 아니다. UNIQUE 추가는 기존 중복 데이터 유무에 따라
> 배포가 실패할 수 있고, 실패 시 마이그레이션 롤백 계약이 필요하다.

---

## 6. UNKNOWN

없음 (0건).
