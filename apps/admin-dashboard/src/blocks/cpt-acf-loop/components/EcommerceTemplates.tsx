/**
 * Ecommerce Template Components
 * 
 * Specialized layouts for product display
 */

import { __ } from '@wordpress/i18n';
import { Icon, check, starEmpty, starHalf } from '@wordpress/icons';
// Placeholder utility functions
const formatPrice = (price: number, symbol: string = '$') => `${symbol}${price.toFixed(2)}`;
const calculateDiscount = (originalPrice: number, salePrice: number) => 
  originalPrice > 0 ? Math.round(((originalPrice - salePrice) / originalPrice) * 100) : 0;
// const getStockStatus = (quantity: number) => quantity > 0 ? 'In Stock' : 'Out of Stock';

// Render stars for rating
const renderStars = (rating: number) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  for (let i = 0; i < fullStars; i++) {
    stars.push(<Icon key={`full-${i}`} icon={starEmpty} />);
  }
  
  if (hasHalfStar) {
    stars.push(<Icon key="half" icon={starHalf} />);
  }
  
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  for (let i = 0; i < emptyStars; i++) {
    stars.push(<Icon key={`empty-${i}`} icon={starEmpty} />);
  }
  
  return stars;
};

interface EcommerceTemplateProps {
  post: any;
  selectedFields?: any[];
  _selectedFields?: any[];
  showQuickView?: boolean;
  _showQuickView?: boolean;
  showAddToCart?: boolean;
  currencySymbol?: string;
  onAddToCart?: (productId: number) => void;
  onQuickView?: (productId: number) => void;
  _onQuickView?: (productId: number) => void;
}

// Product Card Template - Modern ecommerce card
// @ts-ignore: Unused parameters are prefixed with underscore intentionally
export const ProductCardTemplate = ({
  post,
  showAddToCart = true,
  currencySymbol = '$',
  onAddToCart,
}: EcommerceTemplateProps) => {
  const price = post.acf?.price || 0;
  const salePrice = post.acf?.sale_price || 0;
  const inStock = post.acf?.in_stock !== false;
  // const stockQuantity = post.acf?.stock_quantity || 0;
  const discount = calculateDiscount(price, salePrice);
  const rating = post.acf?.rating || 0;
  const reviewCount = post.acf?.review_count || 0;

  return (
    <article className="o4o-cpt-acf-loop__item o4o-cpt-acf-loop__item--product-card">
      <div className="o4o-product-card">
        {/* Product Image */}
        <div className="o4o-product-card__image-wrapper">
          {discount > 0 && (
            <span className="o4o-product-card__badge o4o-product-card__badge--sale">
              -{discount}%
            </span>
          )}
          
          {!inStock && (
            <span className="o4o-product-card__badge o4o-product-card__badge--out-of-stock">
              {__('Out of Stock', 'o4o')}
            </span>
          )}
          
          {post._embedded?.['wp:featuredmedia']?.[0] && (
            <a href={post.link} className="o4o-product-card__image-link">
              <img
                src={post._embedded['wp:featuredmedia'][0].source_url}
                alt={post.title.rendered}
                className="o4o-product-card__image"
                loading="lazy"
              />
            </a>
          )}
          
          {/* Quick Actions */}
          <div className="o4o-product-card__actions">
            {false && (
              <button
                className="o4o-product-card__action o4o-product-card__action--quickview"
                onClick={() => {/* TODO: Implement quick view */}}
                aria-label={__('Quick View', 'o4o')}
              >
                👁️
              </button>
            )}
          </div>
        </div>

        {/* Product Info */}
        <div className="o4o-product-card__info">
          {/* Categories */}
          {post._embedded?.['wp:term']?.[0] && (
            <div className="o4o-product-card__categories">
              {post._embedded['wp:term'][0].slice(0, 2).map((term: any) => (
                <span key={term.id} className="o4o-product-card__category">
                  {term.name}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h3 className="o4o-product-card__title">
            <a href={post.link}>
              {post.title.rendered}
            </a>
          </h3>

          {/* Rating */}
          {rating > 0 && (
            <div className="o4o-product-card__rating">
              {renderStars(rating)}
              {reviewCount > 0 && (
                <span className="o4o-product-card__review-count">
                  ({reviewCount})
                </span>
              )}
            </div>
          )}

          {/* Price */}
          <div className="o4o-product-card__price-wrapper">
            {salePrice > 0 && salePrice < price ? (
              <>
                <span className="o4o-product-card__price o4o-product-card__price--sale">
                  {formatPrice(salePrice, currencySymbol)}
                </span>
                <span className="o4o-product-card__price o4o-product-card__price--regular">
                  {formatPrice(price, currencySymbol)}
                </span>
              </>
            ) : (
              <span className="o4o-product-card__price">
                {formatPrice(price, currencySymbol)}
              </span>
            )}
          </div>

          {/* Stock Status */}
          <div className="o4o-product-card__stock">
            {inStock ? 'In Stock' : 'Out of Stock'}
          </div>

          {/* Shipping Info */}
          {post.acf?.free_shipping && (
            <div className="o4o-product-card__shipping">
              🚚
              <span>{__('Free Shipping', 'o4o')}</span>
            </div>
          )}

          {/* Add to Cart Button */}
          {showAddToCart && inStock && (
            <button
              className="o4o-product-card__add-to-cart"
              onClick={() => onAddToCart?.(post.id)}
            >
              🛒
              <span>{__('Add to Cart', 'o4o')}</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

// Product Grid Template - Compact grid layout
// @ts-ignore: Unused parameters are prefixed with underscore intentionally
export const ProductGridTemplate = ({
  post,
  showAddToCart = true,
  currencySymbol = '$',
  onAddToCart,
}: EcommerceTemplateProps) => {
  const price = post.acf?.price || 0;
  const salePrice = post.acf?.sale_price || 0;
  const inStock = post.acf?.in_stock !== false;
  const discount = calculateDiscount(price, salePrice);

  return (
    <article className="o4o-cpt-acf-loop__item o4o-cpt-acf-loop__item--product-grid">
      <div className="o4o-product-grid">
        {/* Product Image */}
        <div className="o4o-product-grid__image-wrapper">
          {discount > 0 && (
            <span className="o4o-product-grid__badge">
              -{discount}%
            </span>
          )}
          
          <a href={post.link} className="o4o-product-grid__image-link">
            {post._embedded?.['wp:featuredmedia']?.[0] ? (
              <img
                src={post._embedded['wp:featuredmedia'][0].source_url}
                alt={post.title.rendered}
                className="o4o-product-grid__image"
                loading="lazy"
              />
            ) : (
              <div className="o4o-product-grid__placeholder">
                📷
              </div>
            )}
          </a>
        </div>

        {/* Product Info */}
        <div className="o4o-product-grid__info">
          <h3 className="o4o-product-grid__title">
            <a href={post.link}>
              {post.title.rendered}
            </a>
          </h3>

          <div className="o4o-product-grid__price">
            {salePrice > 0 && salePrice < price ? (
              <>
                <span className="o4o-product-grid__price--sale">
                  {formatPrice(salePrice, currencySymbol)}
                </span>
                <span className="o4o-product-grid__price--regular">
                  {formatPrice(price, currencySymbol)}
                </span>
              </>
            ) : (
              <span>{formatPrice(price, currencySymbol)}</span>
            )}
          </div>

          {showAddToCart && (
            <button
              className="o4o-product-grid__add-to-cart"
              onClick={() => onAddToCart?.(post.id)}
              disabled={!inStock}
            >
              {inStock ? __('Add to Cart', 'o4o') : __('Out of Stock', 'o4o')}
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

// Product List Template - Detailed list view
// @ts-ignore: Unused parameters are prefixed with underscore intentionally
export const ProductListTemplate = ({
  post,
  showAddToCart = true,
  currencySymbol = '$',
  onAddToCart,
}: EcommerceTemplateProps) => {
  const price = post.acf?.price || 0;
  const salePrice = post.acf?.sale_price || 0;
  const inStock = post.acf?.in_stock !== false;
  // const stockQuantity = post.acf?.stock_quantity || 0;
  const discount = calculateDiscount(price, salePrice);
  const sku = post.acf?.sku || '';

  return (
    <article className="o4o-cpt-acf-loop__item o4o-cpt-acf-loop__item--product-list">
      <div className="o4o-product-list">
        {/* Product Image */}
        <div className="o4o-product-list__image-wrapper">
          {discount > 0 && (
            <span className="o4o-product-list__badge">
              {__('SALE', 'o4o')}
            </span>
          )}
          
          <a href={post.link}>
            {post._embedded?.['wp:featuredmedia']?.[0] ? (
              <img
                src={post._embedded['wp:featuredmedia'][0].media_details?.sizes?.thumbnail?.source_url || 
                     post._embedded['wp:featuredmedia'][0].source_url}
                alt={post.title.rendered}
                className="o4o-product-list__image"
                loading="lazy"
              />
            ) : (
              <div className="o4o-product-list__placeholder">
                📷
              </div>
            )}
          </a>
        </div>

        {/* Product Details */}
        <div className="o4o-product-list__details">
          <div className="o4o-product-list__header">
            <h3 className="o4o-product-list__title">
              <a href={post.link}>
                {post.title.rendered}
              </a>
            </h3>
            
            {sku && (
              <span className="o4o-product-list__sku">
                {__('SKU:', 'o4o')} {sku}
              </span>
            )}
          </div>

          {post.excerpt?.rendered && (
            <div 
              className="o4o-product-list__excerpt"
              dangerouslySetInnerHTML={{ __html: post.excerpt.rendered }}
            />
          )}

          {/* Product Features */}
          {post.acf?.features && post.acf.features.length > 0 && (
            <ul className="o4o-product-list__features">
              {post.acf.features.slice(0, 3).map((feature: any, index: number) => (
                <li key={index}>
                  <Icon icon={check} />
                  <span>{feature.feature}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Stock & Shipping */}
          <div className="o4o-product-list__meta">
            <span className={`o4o-product-list__stock ${!inStock ? 'o4o-product-list__stock--out' : ''}`}>
              {inStock ? 'In Stock' : 'Out of Stock'}
            </span>
            
            {post.acf?.free_shipping && (
              <span className="o4o-product-list__shipping">
                🚚
                {__('Free Shipping', 'o4o')}
              </span>
            )}
          </div>
        </div>

        {/* Price & Actions */}
        <div className="o4o-product-list__actions">
          <div className="o4o-product-list__price-wrapper">
            {salePrice > 0 && salePrice < price ? (
              <>
                <span className="o4o-product-list__price o4o-product-list__price--sale">
                  {formatPrice(salePrice, currencySymbol)}
                </span>
                <span className="o4o-product-list__price o4o-product-list__price--regular">
                  {formatPrice(price, currencySymbol)}
                </span>
                <span className="o4o-product-list__discount">
                  {__('Save', 'o4o')} {discount}%
                </span>
              </>
            ) : (
              <span className="o4o-product-list__price">
                {formatPrice(price, currencySymbol)}
              </span>
            )}
          </div>

          <div className="o4o-product-list__buttons">
            {false && (
              <button
                className="o4o-product-list__button o4o-product-list__button--quickview"
                onClick={() => {/* TODO: Implement quick view */}}
              >
                {__('Quick View', 'o4o')}
              </button>
            )}
            
            {showAddToCart && (
              <button
                className="o4o-product-list__button o4o-product-list__button--add-to-cart"
                onClick={() => onAddToCart?.(post.id)}
                disabled={!inStock}
              >
                🛒
                <span>{inStock ? __('Add to Cart', 'o4o') : __('Out of Stock', 'o4o')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

// Product Showcase Template - Premium display
// @ts-ignore: Unused parameters are prefixed with underscore intentionally
export const ProductShowcaseTemplate = ({
  post,
  showAddToCart = true,
  currencySymbol = '$',
  onAddToCart,
}: EcommerceTemplateProps) => {
  const price = post.acf?.price || 0;
  const salePrice = post.acf?.sale_price || 0;
  const inStock = post.acf?.in_stock !== false;
  const discount = calculateDiscount(price, salePrice);
  const gallery = post.acf?.product_gallery || [];
  const rating = post.acf?.rating || 0;
  const brand = post.acf?.brand || '';

  return (
    <article className="o4o-cpt-acf-loop__item o4o-cpt-acf-loop__item--product-showcase">
      <div className="o4o-product-showcase">
        {/* Gallery Section */}
        <div className="o4o-product-showcase__gallery">
          {discount > 0 && (
            <div className="o4o-product-showcase__badge-wrapper">
              <span className="o4o-product-showcase__badge o4o-product-showcase__badge--discount">
                {__('SALE', 'o4o')}
                <br />
                -{discount}%
              </span>
            </div>
          )}

          {/* Main Image */}
          <div className="o4o-product-showcase__main-image">
            {post._embedded?.['wp:featuredmedia']?.[0] ? (
              <img
                src={post._embedded['wp:featuredmedia'][0].source_url}
                alt={post.title.rendered}
                loading="lazy"
              />
            ) : (
              <div className="o4o-product-showcase__placeholder">
                📷
              </div>
            )}
          </div>

          {/* Gallery Thumbnails */}
          {gallery.length > 0 && (
            <div className="o4o-product-showcase__thumbnails">
              {gallery.slice(0, 4).map((image: any, index: number) => (
                <div key={index} className="o4o-product-showcase__thumbnail">
                  <img
                    src={image.sizes?.thumbnail || image.url}
                    alt={`${post.title.rendered} ${index + 1}`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Information */}
        <div className="o4o-product-showcase__info">
          {/* Brand */}
          {brand && (
            <div className="o4o-product-showcase__brand">
              {brand}
            </div>
          )}

          {/* Title */}
          <h2 className="o4o-product-showcase__title">
            <a href={post.link}>
              {post.title.rendered}
            </a>
          </h2>

          {/* Rating */}
          {rating > 0 && (
            <div className="o4o-product-showcase__rating">
              {renderStars(rating)}
              <span className="o4o-product-showcase__rating-text">
                {rating.toFixed(1)} {__('out of 5', 'o4o')}
              </span>
            </div>
          )}

          {/* Price Section */}
          <div className="o4o-product-showcase__price-section">
            {salePrice > 0 && salePrice < price ? (
              <>
                <div className="o4o-product-showcase__price-wrapper">
                  <span className="o4o-product-showcase__price o4o-product-showcase__price--sale">
                    {formatPrice(salePrice, currencySymbol)}
                  </span>
                  <span className="o4o-product-showcase__price o4o-product-showcase__price--regular">
                    {formatPrice(price, currencySymbol)}
                  </span>
                </div>
                <div className="o4o-product-showcase__savings">
                  {__('You save:', 'o4o')} {formatPrice(price - salePrice, currencySymbol)} ({discount}%)
                </div>
              </>
            ) : (
              <div className="o4o-product-showcase__price-wrapper">
                <span className="o4o-product-showcase__price">
                  {formatPrice(price, currencySymbol)}
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          {post.excerpt?.rendered && (
            <div 
              className="o4o-product-showcase__description"
              dangerouslySetInnerHTML={{ __html: post.excerpt.rendered }}
            />
          )}

          {/* Features */}
          {post.acf?.features && post.acf.features.length > 0 && (
            <div className="o4o-product-showcase__features">
              <h4>{__('Key Features:', 'o4o')}</h4>
              <ul>
                {post.acf.features.map((feature: any, index: number) => (
                  <li key={index}>
                    <Icon icon={check} />
                    <span>{feature.feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="o4o-product-showcase__actions">
            {/* Stock Status */}
            <div className="o4o-product-showcase__stock-status">
              {inStock ? (
                <>
                  <Icon icon={check} />
                  <span>{__('In Stock', 'o4o')}</span>
                </>
              ) : (
                <span className="o4o-product-showcase__out-of-stock">
                  {__('Out of Stock', 'o4o')}
                </span>
              )}
            </div>

            {/* Buttons */}
            <div className="o4o-product-showcase__buttons">
              {showAddToCart && inStock && (
                <button
                  className="o4o-product-showcase__button o4o-product-showcase__button--primary"
                  onClick={() => onAddToCart?.(post.id)}
                >
                  🛒
                  <span>{__('Add to Cart', 'o4o')}</span>
                </button>
              )}
              
              <a 
                href={post.link}
                className="o4o-product-showcase__button o4o-product-showcase__button--secondary"
              >
                {__('View Details', 'o4o')}
              </a>
            </div>

            {/* Shipping Info */}
            {post.acf?.free_shipping && (
              <div className="o4o-product-showcase__shipping-info">
                🚚
                <span>{__('FREE Shipping on this item', 'o4o')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

// Export main template selector
export const EcommerceTemplate = ({
  template = 'product-card',
  ...props
}: EcommerceTemplateProps & { template?: string }) => {
  switch (template) {
    case 'product-grid':
      return <ProductGridTemplate {...props} />;
    case 'product-list':
      return <ProductListTemplate {...props} />;
    case 'product-showcase':
      return <ProductShowcaseTemplate {...props} />;
    case 'product-card':
    default:
      return <ProductCardTemplate {...props} />;
  }
};