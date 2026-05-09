/**
 * blogTemplates — 공개 Blog 템플릿 2종 (Professional / Modern)
 *
 * WO-O4O-KPA-STORE-BLOG-PUBLIC-HEADER-V1
 *
 * 설계 원칙:
 *  - 콘텐츠/읽기 중심. 쇼핑몰·마케팅 톤 회피
 *  - 두 템플릿 모두 본문 가독성 우선 (행간 1.8, 자간 -0.01em)
 *  - 향후 유료 템플릿 확장을 위해 registry 패턴 (key → component) 적용
 *  - 기본 templateKey 결정: URL `?template=` 우선 → fallback 'professional'
 *
 * 비포함:
 *  - 신규 entity (`store_blog_posts.template` 컬럼 없음)
 *  - storefront_config.theme 자동 매핑 (후속 WO 에서 연결)
 */

import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { ContentRenderer } from '@o4o/content-editor';
import type { BlogPost } from '../../../api/blog';

// ─── Plain ↔ HTML detection (WO-O4O-KPA-STORE-BLOG-CONTENT-RICHTEXT-V1) ─────
// 기존 plain-text 게시글이 RichText 전환 후에도 깨지지 않도록 호환 처리.
// HTML 태그가 하나라도 있으면 ContentRenderer 사용, 아니면 pre-wrap 으로 텍스트 그대로 렌더.
const HTML_TAG_PATTERN = /<\/?(?:p|h[1-6]|ul|ol|li|blockquote|pre|code|img|a|strong|em|u|br|div|span|iframe|figure|hr|mark|table|thead|tbody|tr|td|th)\b[^>]*>/i;

function isHtmlContent(content: string | null | undefined): boolean {
  if (!content) return false;
  return HTML_TAG_PATTERN.test(content);
}

/**
 * 목록 카드의 excerpt 표시용 — HTML 태그 제거 + 공백 normalize.
 * 백엔드 createBlogPost 가 excerpt 미입력 시 content.substring(0, 200) 으로 자동 fallback 하므로,
 * RichText 게시글의 excerpt 에는 태그가 포함될 수 있다. 목록 카드는 plain text 만 표시.
 * 본문 fallback 호환을 위해 plain text 에는 영향 없음.
 */
function stripHtmlForExcerpt(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface BlogContentBodyProps {
  content: string;
  /** body 폰트/행간 — 템플릿마다 약간 달라 inline override */
  fontSize: number;
  lineHeight: number;
  color: string;
}

/**
 * BlogContentBody — Blog 본문 렌더러 (canonical alignment)
 *
 * - HTML 콘텐츠 → ContentRenderer (sanitizeHtml 적용)
 * - plain text → whiteSpace: pre-wrap 으로 줄바꿈 보존
 * - 본문 typography (font-size / line-height / color / letter-spacing) 은 inline 으로 적용
 *   ContentRenderer 의 자식 태그(p, h2 등)에는 reset 이 없으므로 prose-like 기본 스타일이 필요할 수 있음.
 *   여기서는 컨테이너 레벨 inline 스타일이 자식에 cascading 되도록 둠 (sanitizeHtml 결과는 inline-style 제거됨).
 */
function BlogContentBody({ content, fontSize, lineHeight, color }: BlogContentBodyProps) {
  const baseStyle: React.CSSProperties = {
    fontSize,
    lineHeight,
    color,
    wordBreak: 'break-word',
    letterSpacing: '-0.005em',
  };
  if (isHtmlContent(content)) {
    return (
      <>
        <BlogProseStyle />
        <ContentRenderer
          html={content}
          className="kpa-blog-body"
          style={baseStyle}
        />
      </>
    );
  }
  return (
    <div style={{ ...baseStyle, whiteSpace: 'pre-wrap' }}>
      {content}
    </div>
  );
}

// 일회성 prose 스타일 — 칼럼 가독성 (heading 여백 / list / quote / image 반응형 / link)
// React 가 동일 <style> 태그를 여러 번 렌더해도 dedupe 안 하므로 module-level flag 로 1 회 주입.
let blogProseStyleInjected = false;
function BlogProseStyle() {
  if (blogProseStyleInjected) return null;
  blogProseStyleInjected = true;
  return (
    <style>{`
      .kpa-blog-body p { margin: 0 0 1.1em; }
      .kpa-blog-body h2 { font-size: 1.25em; font-weight: 700; line-height: 1.4; margin: 2em 0 0.6em; letter-spacing: -0.01em; color: #0f172a; }
      .kpa-blog-body h3 { font-size: 1.12em; font-weight: 700; line-height: 1.4; margin: 1.6em 0 0.5em; letter-spacing: -0.01em; color: #0f172a; }
      .kpa-blog-body ul, .kpa-blog-body ol { margin: 0 0 1.1em; padding-left: 1.6em; }
      .kpa-blog-body li { margin: 0.25em 0; }
      .kpa-blog-body blockquote { margin: 1.4em 0; padding: 0.4em 1em; border-left: 3px solid #cbd5e1; color: #475569; font-style: italic; }
      .kpa-blog-body a { color: #2563eb; text-decoration: underline; text-underline-offset: 2px; }
      .kpa-blog-body img { max-width: 100%; height: auto; display: block; margin: 1.4em auto; border-radius: 8px; }
      .kpa-blog-body iframe { max-width: 100%; aspect-ratio: 16 / 9; width: 100%; height: auto; display: block; margin: 1.4em 0; border: 0; border-radius: 8px; }
      .kpa-blog-body hr { border: 0; border-top: 1px solid #e2e8f0; margin: 2em 0; }
      .kpa-blog-body code { background: #f1f5f9; padding: 0.1em 0.35em; border-radius: 4px; font-size: 0.9em; }
      .kpa-blog-body pre { background: #0f172a; color: #e2e8f0; padding: 1em; border-radius: 8px; overflow-x: auto; margin: 1.4em 0; }
      .kpa-blog-body pre code { background: none; padding: 0; color: inherit; }
      @media (max-width: 480px) {
        .kpa-blog-body { font-size: 16px !important; line-height: 1.78 !important; }
        .kpa-blog-body h2 { font-size: 1.18em; }
        .kpa-blog-body h3 { font-size: 1.06em; }
      }
    `}</style>
  );
}

// ─── Template Registry ───────────────────────────────────────────────────────

export type BlogTemplateKey = 'professional' | 'modern';

export const BLOG_TEMPLATE_KEYS: BlogTemplateKey[] = ['professional', 'modern'];

const TEMPLATE_LABEL: Record<BlogTemplateKey, string> = {
  professional: 'Professional',
  modern: 'Modern',
};

export function getTemplateLabel(key: BlogTemplateKey): string {
  return TEMPLATE_LABEL[key] ?? TEMPLATE_LABEL.professional;
}

/**
 * URL query string `?template=` 파싱. 알 수 없는 값은 'professional' fallback.
 */
export function resolveBlogTemplateKey(searchParam: string | null | undefined): BlogTemplateKey {
  if (!searchParam) return 'professional';
  const norm = searchParam.toLowerCase();
  if (norm === 'professional' || norm === 'modern') return norm;
  return 'professional';
}

/**
 * WO-O4O-KPA-STORE-BLOG-META-V1: 우선순위 기반 template 결정.
 *  1) URL ?template= override (preview / 임시 진입)
 *  2) Blog settings.defaultTemplate (운영자 저장값)
 *  3) 'professional' fallback
 */
export function pickBlogTemplate(
  queryParam: string | null | undefined,
  settingsDefault: string | null | undefined,
): BlogTemplateKey {
  if (queryParam) {
    const q = queryParam.toLowerCase();
    if (q === 'professional' || q === 'modern') return q;
  }
  if (settingsDefault) {
    const s = settingsDefault.toLowerCase();
    if (s === 'professional' || s === 'modern') return s;
  }
  return 'professional';
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function postPath(storeSlug: string, postSlug: string): string {
  return `/store/${storeSlug}/blog/${postSlug}`;
}

// ─── List templates ──────────────────────────────────────────────────────────

interface ListTemplateProps {
  storeSlug: string;
  posts: BlogPost[];
}

function ProfessionalList({ storeSlug, posts }: ListTemplateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
      }}
    >
      {posts.map((post, idx) => (
        <Link
          key={post.id}
          to={postPath(storeSlug, post.slug)}
          style={{
            textDecoration: 'none',
            color: 'inherit',
            display: 'block',
            padding: '24px 0',
            borderBottom: idx === posts.length - 1 ? 'none' : '1px solid #e2e8f0',
          }}
        >
          <article>
            <div
              style={{
                fontSize: 12,
                color: '#94a3b8',
                marginBottom: 8,
                letterSpacing: '0.02em',
              }}
            >
              {post.publishedAt ? formatDate(post.publishedAt) : formatDate(post.createdAt)}
            </div>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: '#0f172a',
                margin: '0 0 8px',
                lineHeight: 1.4,
                letterSpacing: '-0.01em',
              }}
            >
              {post.title}
            </h2>
            {(() => {
              const ex = stripHtmlForExcerpt(post.excerpt);
              if (!ex) return null;
              return (
                <p
                  style={{
                    fontSize: 14,
                    color: '#475569',
                    margin: 0,
                    lineHeight: 1.7,
                  }}
                >
                  {ex.length > 160 ? ex.slice(0, 160) + '…' : ex}
                </p>
              );
            })()}
          </article>
        </Link>
      ))}
    </div>
  );
}

function ModernList({ storeSlug, posts }: ListTemplateProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '16px',
      }}
    >
      {posts.map((post) => (
        <Link
          key={post.id}
          to={postPath(storeSlug, post.slug)}
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <article
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '20px 22px',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#0f172a';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(15,23,42,0.06)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 10,
                marginBottom: 10,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#0f172a',
                  background: '#f1f5f9',
                  padding: '2px 8px',
                  borderRadius: 4,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Article
              </span>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                {post.publishedAt ? formatDate(post.publishedAt) : formatDate(post.createdAt)}
              </span>
            </div>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: '#0f172a',
                margin: '0 0 10px',
                lineHeight: 1.35,
                letterSpacing: '-0.015em',
              }}
            >
              {post.title}
            </h2>
            {(() => {
              const ex = stripHtmlForExcerpt(post.excerpt);
              if (!ex) return null;
              return (
                <p
                  style={{
                    fontSize: 14,
                    color: '#475569',
                    margin: 0,
                    lineHeight: 1.65,
                  }}
                >
                  {ex.length > 180 ? ex.slice(0, 180) + '…' : ex}
                </p>
              );
            })()}
          </article>
        </Link>
      ))}
    </div>
  );
}

const LIST_TEMPLATES: Record<BlogTemplateKey, (props: ListTemplateProps) => ReactElement> = {
  professional: ProfessionalList,
  modern: ModernList,
};

export function BlogList({ template, ...props }: ListTemplateProps & { template: BlogTemplateKey }) {
  const Component = LIST_TEMPLATES[template] ?? LIST_TEMPLATES.professional;
  return <Component {...props} />;
}

// ─── Post detail templates ───────────────────────────────────────────────────

interface PostTemplateProps {
  post: BlogPost;
}

function ProfessionalPost({ post }: PostTemplateProps) {
  return (
    <article>
      <div
        style={{
          fontSize: 13,
          color: '#94a3b8',
          marginBottom: 12,
          letterSpacing: '0.02em',
        }}
      >
        {post.publishedAt ? formatDate(post.publishedAt) : formatDate(post.createdAt)}
      </div>
      <h1
        style={{
          fontSize: 30,
          fontWeight: 700,
          color: '#0f172a',
          margin: '0 0 24px',
          lineHeight: 1.35,
          letterSpacing: '-0.015em',
        }}
      >
        {post.title}
      </h1>
      {(() => {
        const ex = stripHtmlForExcerpt(post.excerpt);
        if (!ex) return null;
        return (
          <p
            style={{
              fontSize: 17,
              color: '#475569',
              lineHeight: 1.7,
              margin: '0 0 28px',
              paddingLeft: 16,
              borderLeft: '3px solid #cbd5e1',
              fontStyle: 'italic',
            }}
          >
            {ex}
          </p>
        );
      })()}
      <BlogContentBody content={post.content} fontSize={16} lineHeight={1.85} color="#1e293b" />
    </article>
  );
}

function ModernPost({ post }: PostTemplateProps) {
  return (
    <article>
      <div
        style={{
          display: 'inline-block',
          fontSize: 11,
          fontWeight: 600,
          color: '#0f172a',
          background: '#f1f5f9',
          padding: '4px 10px',
          borderRadius: 4,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}
      >
        Article
      </div>
      <h1
        style={{
          fontSize: 34,
          fontWeight: 700,
          color: '#0f172a',
          margin: '0 0 16px',
          lineHeight: 1.3,
          letterSpacing: '-0.02em',
        }}
      >
        {post.title}
      </h1>
      <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 32 }}>
        {post.publishedAt ? formatDate(post.publishedAt) : formatDate(post.createdAt)}
      </div>
      {(() => {
        const ex = stripHtmlForExcerpt(post.excerpt);
        if (!ex) return null;
        return (
          <p
            style={{
              fontSize: 18,
              color: '#334155',
              lineHeight: 1.65,
              margin: '0 0 32px',
              fontWeight: 500,
            }}
          >
            {ex}
          </p>
        );
      })()}
      <BlogContentBody content={post.content} fontSize={17} lineHeight={1.85} color="#1e293b" />
    </article>
  );
}

const POST_TEMPLATES: Record<BlogTemplateKey, (props: PostTemplateProps) => ReactElement> = {
  professional: ProfessionalPost,
  modern: ModernPost,
};

export function BlogPost({ template, ...props }: PostTemplateProps & { template: BlogTemplateKey }) {
  const Component = POST_TEMPLATES[template] ?? POST_TEMPLATES.professional;
  return <Component {...props} />;
}
