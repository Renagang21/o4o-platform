import React, { useState, useEffect } from 'react';
import { BlockDefinition } from '@o4o/block-core';

const Edit: React.FC<any> = ({ attributes, setAttributes }) => {
  const { postType, postsPerPage, orderBy, order, showPagination } = attributes;
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Simulated post fetching
  useEffect(() => {
    setLoading(true);
    // In real implementation, this would fetch from WordPress REST API
    setTimeout(() => {
      setPosts([
        { id: 1, title: '', excerpt: '' },
        { id: 2, title: '', excerpt: '' },
        { id: 3, title: '', excerpt: '' },
      ]);
      setLoading(false);
    }, 500);
  }, [postType, postsPerPage, orderBy, order]);
  
  return (
    <div className="wp-block-cpt-acf-loop">
      <div className="block-editor-block-toolbar">
        <select 
          value={postType || 'post'} 
          onChange={(e) => setAttributes({ postType: e.target.value })}
        >
          <option value="post">Posts</option>
          <option value="page">Pages</option>
          <option value="product">Products</option>
          <option value="custom">Custom Post Type</option>
        </select>
        
        <input 
          type="number" 
          value={postsPerPage || 10} 
          onChange={(e) => setAttributes({ postsPerPage: Number(e.target.value) })}
          min="1"
          max="100"
          placeholder="Posts per page"
        />
        
        <select 
          value={orderBy || 'date'} 
          onChange={(e) => setAttributes({ orderBy: e.target.value })}
        >
          <option value="date">Date</option>
          <option value="title">Title</option>
          <option value="menu_order">Menu Order</option>
          <option value="rand">Random</option>
        </select>
        
        <select 
          value={order || 'DESC'} 
          onChange={(e) => setAttributes({ order: e.target.value })}
        >
          <option value="DESC">Descending</option>
          <option value="ASC">Ascending</option>
        </select>
        
        <label>
          <input 
            type="checkbox" 
            checked={showPagination} 
            onChange={(e) => setAttributes({ showPagination: e.target.checked })}
          />
          Show Pagination
        </label>
      </div>
      
      <div className="cpt-loop-content">
        {loading ? (
          <p>Loading posts...</p>
        ) : (
          <div className="post-grid">
            {posts.map(post => (
              <article key={post.id} className="post-item">
                <h3>{post.title}</h3>
                <p>{post.excerpt}</p>
              </article>
            ))}
          </div>
        )}
        
        {showPagination && (
          <div className="pagination">
            <button>← Previous</button>
            <span>Page 1 of 3</span>
            <button>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
};

const Save: React.FC<any> = ({ attributes }) => {
  const { postType, postsPerPage, orderBy, order, showPagination } = attributes;
  
  // Server-side rendering placeholder
  return (
    <div 
      className="wp-block-cpt-acf-loop"
      data-post-type={postType}
      data-posts-per-page={postsPerPage}
      data-order-by={orderBy}
      data-order={order}
      data-show-pagination={showPagination}
    >
      {/* Content will be rendered server-side */}
    </div>
  );
};

const CPTACFLoopBlock: BlockDefinition = {
  name: 'o4o/cpt-acf-loop',
  title: 'CPT ACF Loop',
  category: 'dynamic',
  icon: 'layout',
  description: 'Display custom post types with ACF fields.',
  keywords: ['cpt', 'acf', 'loop', 'query', 'posts'],
  
  attributes: {
    postType: {
      type: 'string',
      default: 'post'
    },
    postsPerPage: {
      type: 'number',
      default: 10
    },
    orderBy: {
      type: 'string',
      default: 'date'
    },
    order: {
      type: 'string',
      default: 'DESC'
    },
    showPagination: {
      type: 'boolean',
      default: true
    }
  },
  
  supports: {
    align: ['wide', 'full'],
    anchor: true,
    className: true
  },
  
  edit: Edit,
  save: Save
};

export default CPTACFLoopBlock;