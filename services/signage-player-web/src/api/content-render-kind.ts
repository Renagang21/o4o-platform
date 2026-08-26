/**
 * Content render kind resolution
 *
 * WO-O4O-SIGNAGE-PLAYER-CONTENT-RENDER-KIND-V1
 *
 * CMS `content.type` 은 `hero | notice | news | featured | promo | event | guide | knowledge`
 * 같은 **의미적 분류**이고 미디어 종류가 아니다(`CmsContent.entity.ts` 의 `ContentType`).
 * 그런데 player 의 renderer 는 `image | video | html | text` 를 기대하고 있었다.
 * 두 어휘는 **어떤 값에서도 만나지 않는다** → 모든 콘텐츠가 fallback 으로 떨어지고
 * video 는 자기 길이를 쓰지 못했다.
 *
 * 따라서 렌더 방식은 type 이 아니라 **실제로 존재하는 필드**로 판정한다.
 * 판정에 쓰는 필드는 기존 renderer 의 각 분기가 이미 보고 있던 것과 동일하다
 * (새 제품 정책을 만들지 않는다).
 *
 * 이 모듈은 `import.meta.env` 같은 번들러 전용 구문을 쓰지 않는 **순수 모듈**이다
 * (api-server 의 계약 테스트에서 직접 import 하기 위해서다).
 */

export type ContentRenderKind = 'video' | 'image' | 'html' | 'text'

/** renderer 가 소비하는 콘텐츠의 최소 형태 (api/channels 의 ChannelContent['content']). */
export interface RenderableContent {
  contentType?: string
  body?: string
  excerpt?: string
  featuredImage?: string
  metadata?: Record<string, unknown> | null
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function resolveContentRenderKind(content: RenderableContent): ContentRenderKind {
  const meta = content.metadata ?? {}

  if (str(meta.videoUrl)) return 'video'
  if (str(meta.htmlUrl) || str(meta.url)) return 'html'
  if (content.featuredImage || str(meta.imageUrl)) return 'image'
  return 'text'
}
