// import { useEffect } from 'react';
import { __ } from '@wordpress/i18n';
import {
  InspectorControls,
  BlockControls,
  useBlockProps
} from '@wordpress/block-editor';
import {
  PanelBody,
  SelectControl,
  RangeControl,
  ToggleControl,
  ToolbarGroup,
  ToolbarButton,
  // ColorPicker
} from '@wordpress/components';
import {
  Grid,
  List,
  LayoutGrid,
  Eye
} from 'lucide-react';
import { ProductCardTemplate } from './templates/ProductCardTemplate';
import { ProductGridTemplate } from './templates/ProductGridTemplate';
import { ProductListTemplate } from './templates/ProductListTemplate';
import { ProductShowcaseTemplate } from './templates/ProductShowcaseTemplate';
import { QueryControls } from '../../shared/QueryControls';
import { useProductsBlock } from '../../../hooks/useProductsBlock';

interface EditProps {
  attributes: any;
  setAttributes: (attributes: any) => void;
  clientId: string;
}

export function Edit({ attributes, setAttributes, clientId: _clientId }: EditProps) {
  const {
    postType: _postType = 'product',
    query = {},
    layout = 'card',
    columns = 3,
    showImage = true,
    imageSize = 'medium',
    showTitle = true,
    showPrice = true,
    showRegularPrice = true,
    showSalePrice = true,
    showStock = true,
    showAddToCart = true,
    showQuickView = false,
    showWishlist = false,
    showSaleBadge = true,
    showCategories = false,
    showRating = false,
    cardStyle = 'shadow',
    imageAspectRatio = 'square',
    priceColor,
    salePriceColor = '#e74c3c',
    buttonColor,
    buttonTextColor
  } = attributes;

  const blockProps = useBlockProps({
    className: 'o4o-product-card-block'
  });

  // Fetch products using custom hook
  const { products, isLoading, error } = useProductsBlock(query);

  const layoutOptions = [
    { label: __('Card', 'o4o'), value: 'card' },
    { label: __('Grid', 'o4o'), value: 'grid' },
    { label: __('List', 'o4o'), value: 'list' },
    { label: __('Showcase', 'o4o'), value: 'showcase' }
  ];

  const imageSizeOptions = [
    { label: __('Thumbnail', 'o4o'), value: 'thumbnail' },
    { label: __('Medium', 'o4o'), value: 'medium' },
    { label: __('Large', 'o4o'), value: 'large' },
    { label: __('Full', 'o4o'), value: 'full' }
  ];

  const cardStyleOptions = [
    { label: __('Shadow', 'o4o'), value: 'shadow' },
    { label: __('Border', 'o4o'), value: 'border' },
    { label: __('Minimal', 'o4o'), value: 'minimal' },
    { label: __('Elevated', 'o4o'), value: 'elevated' }
  ];

  const aspectRatioOptions = [
    { label: __('Square (1:1)', 'o4o'), value: 'square' },
    { label: __('Portrait (3:4)', 'o4o'), value: 'portrait' },
    { label: __('Landscape (4:3)', 'o4o'), value: 'landscape' },
    { label: __('Wide (16:9)', 'o4o'), value: 'wide' }
  ];

  const renderTemplate = () => {
    const templateProps = {
      products,
      attributes,
      isLoading,
      error: error || undefined
    };

    switch (layout) {
      case 'grid':
        return <ProductGridTemplate {...templateProps} />;
      case 'list':
        return <ProductListTemplate {...templateProps} />;
      case 'showcase':
        return <ProductShowcaseTemplate {...templateProps} />;
      case 'card':
      default:
        return <ProductCardTemplate {...templateProps} />;
    }
  };

  return (
    <>
      <BlockControls>
        <ToolbarGroup>
          <ToolbarButton
            icon={<Grid className="w-4 h-4" />}
            label={__('Card Layout', 'o4o')}
            onClick={() => setAttributes({ layout: 'card' })}
            isActive={layout === 'card'}
          />
          <ToolbarButton
            icon={<LayoutGrid className="w-4 h-4" />}
            label={__('Grid Layout', 'o4o')}
            onClick={() => setAttributes({ layout: 'grid' })}
            isActive={layout === 'grid'}
          />
          <ToolbarButton
            icon={<List className="w-4 h-4" />}
            label={__('List Layout', 'o4o')}
            onClick={() => setAttributes({ layout: 'list' })}
            isActive={layout === 'list'}
          />
          <ToolbarButton
            icon={<Eye className="w-4 h-4" />}
            label={__('Showcase Layout', 'o4o')}
            onClick={() => setAttributes({ layout: 'showcase' })}
            isActive={layout === 'showcase'}
          />
        </ToolbarGroup>
      </BlockControls>

      <InspectorControls>
        <PanelBody title={__('Query Settings', 'o4o')} initialOpen={true}>
          <QueryControls
            attributes={attributes}
            setAttributes={setAttributes}
            postType="product"
          />
        </PanelBody>

        <PanelBody title={__('Layout Settings', 'o4o')} initialOpen={false}>
          <SelectControl
            label={__('Layout', 'o4o')}
            value={layout}
            options={layoutOptions}
            onChange={(value: any) => setAttributes({ layout: value })}
          />
          {(layout === 'card' || layout === 'grid') && (
            <RangeControl
              label={__('Columns', 'o4o')}
              value={columns}
              onChange={(value: any) => setAttributes({ columns: value })}
              min={1}
              max={6}
            />
          )}
          <SelectControl
            label={__('Card Style', 'o4o')}
            value={cardStyle}
            options={cardStyleOptions}
            onChange={(value: any) => setAttributes({ cardStyle: value })}
          />
        </PanelBody>

        <PanelBody title={__('Display Settings', 'o4o')} initialOpen={false}>
          <ToggleControl
            label={__('Show Product Image', 'o4o')}
            checked={showImage}
            onChange={(value: any) => setAttributes({ showImage: value })}
          />
          {showImage && (
            <>
              <SelectControl
                label={__('Image Size', 'o4o')}
                value={imageSize}
                options={imageSizeOptions}
                onChange={(value: any) => setAttributes({ imageSize: value })}
              />
              <SelectControl
                label={__('Image Aspect Ratio', 'o4o')}
                value={imageAspectRatio}
                options={aspectRatioOptions}
                onChange={(value: any) => setAttributes({ imageAspectRatio: value })}
              />
            </>
          )}
          <ToggleControl
            label={__('Show Title', 'o4o')}
            checked={showTitle}
            onChange={(value: any) => setAttributes({ showTitle: value })}
          />
          <ToggleControl
            label={__('Show Categories', 'o4o')}
            checked={showCategories}
            onChange={(value: any) => setAttributes({ showCategories: value })}
          />
          <ToggleControl
            label={__('Show Rating', 'o4o')}
            checked={showRating}
            onChange={(value: any) => setAttributes({ showRating: value })}
          />
        </PanelBody>

        <PanelBody title={__('Price Settings', 'o4o')} initialOpen={false}>
          <ToggleControl
            label={__('Show Price', 'o4o')}
            checked={showPrice}
            onChange={(value: any) => setAttributes({ showPrice: value })}
          />
          {showPrice && (
            <>
              <ToggleControl
                label={__('Show Regular Price', 'o4o')}
                checked={showRegularPrice}
                onChange={(value: any) => setAttributes({ showRegularPrice: value })}
              />
              <ToggleControl
                label={__('Show Sale Price', 'o4o')}
                checked={showSalePrice}
                onChange={(value: any) => setAttributes({ showSalePrice: value })}
              />
              <ToggleControl
                label={__('Show Sale Badge', 'o4o')}
                checked={showSaleBadge}
                onChange={(value: any) => setAttributes({ showSaleBadge: value })}
              />
            </>
          )}
          <ToggleControl
            label={__('Show Stock Status', 'o4o')}
            checked={showStock}
            onChange={(value: any) => setAttributes({ showStock: value })}
          />
        </PanelBody>

        <PanelBody title={__('Action Buttons', 'o4o')} initialOpen={false}>
          <ToggleControl
            label={__('Show Add to Cart', 'o4o')}
            checked={showAddToCart}
            onChange={(value: any) => setAttributes({ showAddToCart: value })}
          />
          <ToggleControl
            label={__('Show Quick View', 'o4o')}
            checked={showQuickView}
            onChange={(value: any) => setAttributes({ showQuickView: value })}
          />
          <ToggleControl
            label={__('Show Wishlist', 'o4o')}
            checked={showWishlist}
            onChange={(value: any) => setAttributes({ showWishlist: value })}
          />
        </PanelBody>

        <PanelBody title={__('Color Settings', 'o4o')} initialOpen={false}>
          {/* Note: Using text inputs for colors due to ColorPicker compatibility issues */}
          <div style={{ marginBottom: '16px' }}>
            <label>{__('Price Color', 'o4o')}</label>
            <input
              type="color"
              value={priceColor || '#000000'}
              onChange={(e: any) => setAttributes({ priceColor: e.target.value })}
              style={{ width: '100%', height: '32px' }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label>{__('Sale Price Color', 'o4o')}</label>
            <input
              type="color"
              value={salePriceColor || '#e74c3c'}
              onChange={(e: any) => setAttributes({ salePriceColor: e.target.value })}
              style={{ width: '100%', height: '32px' }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label>{__('Button Color', 'o4o')}</label>
            <input
              type="color"
              value={buttonColor || '#007cba'}
              onChange={(e: any) => setAttributes({ buttonColor: e.target.value })}
              style={{ width: '100%', height: '32px' }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label>{__('Button Text Color', 'o4o')}</label>
            <input
              type="color"
              value={buttonTextColor || '#ffffff'}
              onChange={(e: any) => setAttributes({ buttonTextColor: e.target.value })}
              style={{ width: '100%', height: '32px' }}
            />
          </div>
        </PanelBody>
      </InspectorControls>

      <div {...blockProps}>
        {renderTemplate()}
      </div>
    </>
  );
}