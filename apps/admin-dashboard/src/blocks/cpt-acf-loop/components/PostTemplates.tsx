/**
 * Post Template Components
 * 
 * Different layout templates for displaying posts
 */

import { __ } from '@wordpress/i18n';
import { ACFFieldRenderer } from './ACFFieldRenderers';
import { getFeaturedImageUrl, formatDate, getAuthorName } from '../utils';

interface PostTemplateProps {
  post: any;
  selectedFields: any[];
  showExcerpt?: boolean;
  showFeaturedImage?: boolean;
  showMeta?: boolean;
  showAuthor?: boolean;
  showDate?: boolean;
  showCategories?: boolean;
}

// Card Template - Modern card layout
export const CardTemplate = ({
  post,
  selectedFields,
  showExcerpt = true,
  showFeaturedImage = true,
  showMeta = true,
  showAuthor = false,
  showDate = true,
}: PostTemplateProps) => {
  const featuredImageUrl = getFeaturedImageUrl(post, 'medium');

  return (
    <article className="o4o-cpt-acf-loop__item o4o-cpt-acf-loop__item--card">
      {showFeaturedImage && featuredImageUrl && (
        <div className="o4o-cpt-acf-loop__featured-image">
          <a href={post.link} target="_blank" rel="noopener noreferrer">
            <img
              src={featuredImageUrl}
              alt={post.title.rendered}
              loading="lazy"
            />
          </a>
        </div>
      )}

      <div className="o4o-cpt-acf-loop__content">
        <h3 className="o4o-cpt-acf-loop__title">
          <a href={post.link} target="_blank" rel="noopener noreferrer">
            {post.title.rendered}
          </a>
        </h3>

        {showExcerpt && post.excerpt && (
          <div
            className="o4o-cpt-acf-loop__excerpt"
            dangerouslySetInnerHTML={{ __html: post.excerpt.rendered }}
          />
        )}

        {/* ACF Fields */}
        {post.acf && selectedFields.length > 0 && (
          <div className="o4o-cpt-acf-loop__acf-fields">
            {selectedFields
              .filter((field) => field.visible && post.acf?.[field.name])
              .map((field) => (
                <ACFFieldRenderer
                  key={field.key}
                  field={field}
                  value={post.acf![field.name]}
                  showLabel={true}
                />
              ))}
          </div>
        )}

        {showMeta && (
          <div className="o4o-cpt-acf-loop__meta">
            {showDate && (
              <span className="o4o-cpt-acf-loop__meta-item">
                <time dateTime={post.date}>{formatDate(post.date)}</time>
              </span>
            )}
            {showAuthor && (
              <span className="o4o-cpt-acf-loop__meta-item">
                {getAuthorName(post)}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

// List Template - Traditional blog list
export const ListTemplate = ({
  post,
  selectedFields,
  showExcerpt = true,
  showFeaturedImage = true,
  showMeta = true,
  showAuthor = true,
  showDate = true,
}: PostTemplateProps) => {
  const featuredImageUrl = getFeaturedImageUrl(post, 'thumbnail');

  return (
    <article className="o4o-cpt-acf-loop__item o4o-cpt-acf-loop__item--list">
      <div className="o4o-cpt-acf-loop__item-wrapper">
        {showFeaturedImage && featuredImageUrl && (
          <div className="o4o-cpt-acf-loop__featured-image o4o-cpt-acf-loop__featured-image--thumbnail">
            <a href={post.link} target="_blank" rel="noopener noreferrer">
              <img
                src={featuredImageUrl}
                alt={post.title.rendered}
                loading="lazy"
              />
            </a>
          </div>
        )}

        <div className="o4o-cpt-acf-loop__content">
          <h3 className="o4o-cpt-acf-loop__title">
            <a href={post.link} target="_blank" rel="noopener noreferrer">
              {post.title.rendered}
            </a>
          </h3>

          {showMeta && (
            <div className="o4o-cpt-acf-loop__meta o4o-cpt-acf-loop__meta--header">
              {showAuthor && (
                <span className="o4o-cpt-acf-loop__meta-item">
                  {__('By', 'o4o')} {getAuthorName(post)}
                </span>
              )}
              {showDate && (
                <span className="o4o-cpt-acf-loop__meta-item">
                  <time dateTime={post.date}>{formatDate(post.date)}</time>
                </span>
              )}
            </div>
          )}

          {showExcerpt && post.excerpt && (
            <div
              className="o4o-cpt-acf-loop__excerpt"
              dangerouslySetInnerHTML={{ __html: post.excerpt.rendered }}
            />
          )}

          {/* ACF Fields */}
          {post.acf && selectedFields.length > 0 && (
            <div className="o4o-cpt-acf-loop__acf-fields">
              {selectedFields
                .filter((field) => field.visible && post.acf?.[field.name])
                .map((field) => (
                  <ACFFieldRenderer
                    key={field.key}
                    field={field}
                    value={post.acf![field.name]}
                    showLabel={true}
                  />
                ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

// Minimal Template - Clean, text-only layout
export const MinimalTemplate = ({
  post,
  selectedFields,
  // showExcerpt = false,
  showMeta = true,
  showDate = true,
}: PostTemplateProps) => {
  return (
    <article className="o4o-cpt-acf-loop__item o4o-cpt-acf-loop__item--minimal">
      <h3 className="o4o-cpt-acf-loop__title">
        <a href={post.link} target="_blank" rel="noopener noreferrer">
          {post.title.rendered}
        </a>
      </h3>

      {/* ACF Fields - Inline for minimal layout */}
      {post.acf && selectedFields.length > 0 && (
        <div className="o4o-cpt-acf-loop__acf-fields o4o-cpt-acf-loop__acf-fields--inline">
          {selectedFields
            .filter((field) => field.visible && post.acf?.[field.name])
            .slice(0, 3) // Show only first 3 fields in minimal layout
            .map((field) => (
              <ACFFieldRenderer
                key={field.key}
                field={field}
                value={post.acf![field.name]}
                showLabel={false}
              />
            ))}
        </div>
      )}

      {showMeta && showDate && (
        <div className="o4o-cpt-acf-loop__meta o4o-cpt-acf-loop__meta--minimal">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
        </div>
      )}
    </article>
  );
};

// Magazine Template - Editorial style layout
export const MagazineTemplate = ({
  post,
  selectedFields,
  showExcerpt = true,
  showFeaturedImage = true,
  showMeta = true,
  showAuthor = true,
  showDate = true,
  showCategories = true,
  isFirst = false,
}: PostTemplateProps & { isFirst?: boolean }) => {
  const featuredImageUrl = getFeaturedImageUrl(
    post,
    isFirst ? 'large' : 'medium'
  );

  return (
    <article
      className={`o4o-cpt-acf-loop__item o4o-cpt-acf-loop__item--magazine ${
        isFirst ? 'o4o-cpt-acf-loop__item--featured' : ''
      }`}
    >
      {showFeaturedImage && featuredImageUrl && (
        <div className="o4o-cpt-acf-loop__featured-image">
          <a href={post.link} target="_blank" rel="noopener noreferrer">
            <img
              src={featuredImageUrl}
              alt={post.title.rendered}
              loading="lazy"
            />
          </a>
          {showCategories && post._embedded?.['wp:term']?.[0] && (
            <div className="o4o-cpt-acf-loop__category-badge">
              {post._embedded['wp:term'][0][0]?.name}
            </div>
          )}
        </div>
      )}

      <div className="o4o-cpt-acf-loop__content">
        <h3 className="o4o-cpt-acf-loop__title">
          <a href={post.link} target="_blank" rel="noopener noreferrer">
            {post.title.rendered}
          </a>
        </h3>

        {showMeta && (
          <div className="o4o-cpt-acf-loop__meta">
            {showAuthor && (
              <span className="o4o-cpt-acf-loop__meta-item o4o-cpt-acf-loop__meta-item--author">
                {getAuthorName(post)}
              </span>
            )}
            {showDate && (
              <span className="o4o-cpt-acf-loop__meta-item">
                <time dateTime={post.date}>{formatDate(post.date)}</time>
              </span>
            )}
          </div>
        )}

        {showExcerpt && post.excerpt && (
          <div
            className="o4o-cpt-acf-loop__excerpt"
            dangerouslySetInnerHTML={{ __html: post.excerpt.rendered }}
          />
        )}

        {/* ACF Fields */}
        {post.acf && selectedFields.length > 0 && (
          <div className="o4o-cpt-acf-loop__acf-fields">
            {selectedFields
              .filter((field) => field.visible && post.acf?.[field.name])
              .map((field) => (
                <ACFFieldRenderer
                  key={field.key}
                  field={field}
                  value={post.acf![field.name]}
                  showLabel={!isFirst} // Hide labels for featured post
                />
              ))}
          </div>
        )}
      </div>
    </article>
  );
};

// Template selector component
export const PostTemplate = ({
  template = 'card',
  ...props
}: PostTemplateProps & { template?: string }) => {
  switch (template) {
    case 'list':
      return <ListTemplate {...props} />;
    case 'minimal':
      return <MinimalTemplate {...props} />;
    case 'magazine':
      return <MagazineTemplate {...props} />;
    case 'card':
    default:
      return <CardTemplate {...props} />;
  }
};