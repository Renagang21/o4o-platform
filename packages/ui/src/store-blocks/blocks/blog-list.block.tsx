/**
 * Blog List Block — 블로그 미리보기
 * WO-STORE-BLOCK-REGISTRY-V1
 */

import { Link } from 'react-router-dom';
import type { StoreBlockDefinition, BlockComponentProps } from '../types';

function BlogListBlockComponent({ block, context }: BlockComponentProps) {
  const { slug, blogPosts, storePrefix } = context;
  const config = block.config || {};
  if (blogPosts.length === 0) return null;
  const limit = config.limit || 3;

  return (
    <div style={{ padding: '0 16px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>블로그</h2>
        <Link to={`${storePrefix}/${slug}/blog`} style={{ fontSize: '13px', color: '#3b82f6', textDecoration: 'none' }}>
          전체보기
        </Link>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {blogPosts.slice(0, limit).map((post) => (
          <Link
            key={post.id}
            to={`${storePrefix}/${slug}/blog/${post.slug}`}
            style={{
              display: 'block',
              padding: '12px 16px',
              backgroundColor: '#fff',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>{post.title}</p>
            {post.excerpt && (
              <p style={{ fontSize: '13px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {post.excerpt}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

export const BlogListBlockDef: StoreBlockDefinition = {
  type: 'BLOG_LIST',
  label: '블로그 미리보기',
  description: '최근 블로그 게시글',
  defaultConfig: { limit: 3 },
  component: BlogListBlockComponent,
};
