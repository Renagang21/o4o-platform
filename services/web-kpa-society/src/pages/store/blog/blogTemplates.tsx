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
import type { BlogPost } from '../../../api/blog';

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
 * 향후 storefront_config.theme 통합 시 호출처에서 우선순위 결정.
 */
export function resolveBlogTemplateKey(searchParam: string | null | undefined): BlogTemplateKey {
  if (!searchParam) return 'professional';
  const norm = searchParam.toLowerCase();
  if (norm === 'professional' || norm === 'modern') return norm;
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
            {post.excerpt && (
              <p
                style={{
                  fontSize: 14,
                  color: '#475569',
                  margin: 0,
                  lineHeight: 1.7,
                }}
              >
                {post.excerpt.length > 160 ? post.excerpt.slice(0, 160) + '…' : post.excerpt}
              </p>
            )}
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
            {post.excerpt && (
              <p
                style={{
                  fontSize: 14,
                  color: '#475569',
                  margin: 0,
                  lineHeight: 1.65,
                }}
              >
                {post.excerpt.length > 180 ? post.excerpt.slice(0, 180) + '…' : post.excerpt}
              </p>
            )}
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
      {post.excerpt && (
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
          {post.excerpt}
        </p>
      )}
      <div
        style={{
          fontSize: 16,
          lineHeight: 1.85,
          color: '#1e293b',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          letterSpacing: '-0.005em',
        }}
      >
        {post.content}
      </div>
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
      {post.excerpt && (
        <p
          style={{
            fontSize: 18,
            color: '#334155',
            lineHeight: 1.65,
            margin: '0 0 32px',
            fontWeight: 500,
          }}
        >
          {post.excerpt}
        </p>
      )}
      <div
        style={{
          fontSize: 17,
          lineHeight: 1.85,
          color: '#1e293b',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          letterSpacing: '-0.005em',
        }}
      >
        {post.content}
      </div>
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
