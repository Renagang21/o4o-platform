// import { useEffect } from 'react';
import {
  InspectorControls,
  BlockControls,
  useBlockProps
} from '@wordpress/block-editor';
import { PanelBody, SelectControl, RangeControl, ToggleControl, ToolbarGroup, ToolbarButton } from '@wordpress/components';
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
    { label: 'Card', value: 'card' },
    { label: 'Grid', value: 'grid' },
    { label: 'List', value: 'list' },
    { label: 'Showcase', value: 'showcase' }
  ];

  const imageSizeOptions = [
    { label: 'Thumbnail', value: 'thumbnail' },
    { label: 'Medium', value: 'medium' },
    { label: 'Large', value: 'large' },
    { label: 'Full', value: 'full' }
  ];

  const cardStyleOptions = [
    { label: 'Shadow', value: 'shadow' },
    { label: 'Border', value: 'border' },
    { label: 'Minimal', value: 'minimal' },
    { label: 'Elevated', value: 'elevated' }
  ];

  const aspectRatioOptions = [
    { label: 'Square (1:1)', value: 'square' },
    { label: 'Portrait (3:4)', value: 'portrait' },
    { label: 'Landscape (4:3)', value: 'landscape' },
    { label: 'Wide (16:9)', value: 'wide' }
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
            label={'Card Layout'}
            onClick={() => setAttributes({ layout: 'card' })}
            isActive={layout === 'card'}
          />
          <ToolbarButton
            icon={<LayoutGrid className="w-4 h-4" />}
            label={'Grid Layout'}
            onClick={() => setAttributes({ layout: 'grid' })}
            isActive={layout === 'grid'}
          />
          <ToolbarButton
            icon={<List className="w-4 h-4" />}
            label={'List Layout'}
            onClick={() => setAttributes({ layout: 'list' })}
            isActive={layout === 'list'}
          />
          <ToolbarButton
            icon={<Eye className="w-4 h-4" />}
            label={'Showcase Layout'}
            onClick={() => setAttributes({ layout: 'showcase' })}
            isActive={layout === 'showcase'}
          />
        </ToolbarGroup>
      </BlockControls>

      <InspectorControls>
        <PanelBody title={'Query Settings'} initialOpen={true}>
          <QueryControls
            attributes={attributes}
            setAttributes={setAttributes}
            postType="product"
          />
        </PanelBody>

        <PanelBody title={'Layout Settings'} initialOpen={false}>
          <SelectControl
            label={'Layout'}
            value={layout}
            options={layoutOptions}
            onChange={(value: any) => setAttributes({ layout: value })}
          />
          {(layout === 'card' || layout === 'grid') && (
            <RangeControl
              label={'Columns'}
              value={columns}
              onChange={(value: any) => setAttributes({ columns: value })}
              min={1}
              max={6}
            />
          )}
          <SelectControl
            label={'Card Style'}
            value={cardStyle}
            options={cardStyleOptions}
            onChange={(value: any) => setAttributes({ cardStyle: value })}
          />
        </PanelBody>

        <PanelBody title={'Display Settings'} initialOpen={false}>
          <ToggleControl
            label={'Show Product Image'}
            checked={showImage}
            onChange={(value: any) => setAttributes({ showImage: value })}
            disabled={false}
          />
          {showImage && (
            <>
              <SelectControl
                label={'Image Size'}
                value={imageSize}
                options={imageSizeOptions}
                onChange={(value: any) => setAttributes({ imageSize: value })}
              />
              <SelectControl
                label={'Image Aspect Ratio'}
                value={imageAspectRatio}
                options={aspectRatioOptions}
                onChange={(value: any) => setAttributes({ imageAspectRatio: value })}
              />
            </>
          )}
          <ToggleControl
            label={'Show Title'}
            checked={showTitle}
            onChange={(value: any) => setAttributes({ showTitle: value })}
          />
          <ToggleControl
            label={'Show Categories'}
            checked={showCategories}
            onChange={(value: any) => setAttributes({ showCategories: value })}
          />
          <ToggleControl
            label={'Show Rating'}
            checked={showRating}
            onChange={(value: any) => setAttributes({ showRating: value })}
          />
        </PanelBody>

        <PanelBody title={'Price Settings'} initialOpen={false}>
          <ToggleControl
            label={'Show Price'}
            checked={showPrice}
            onChange={(value: any) => setAttributes({ showPrice: value })}
          />
          {showPrice && (
            <>
              <ToggleControl
                label={'Show Regular Price'}
                checked={showRegularPrice}
                onChange={(value: any) => setAttributes({ showRegularPrice: value })}
              />
              <ToggleControl
                label={'Show Sale Price'}
                checked={showSalePrice}
                onChange={(value: any) => setAttributes({ showSalePrice: value })}
              />
              <ToggleControl
                label={'Show Sale Badge'}
                checked={showSaleBadge}
                onChange={(value: any) => setAttributes({ showSaleBadge: value })}
              />
            </>
          )}
          <ToggleControl
            label={'Show Stock Status'}
            checked={showStock}
            onChange={(value: any) => setAttributes({ showStock: value })}
          />
        </PanelBody>

        <PanelBody title={'Action Buttons'} initialOpen={false}>
          <ToggleControl
            label={'Show Add to Cart'}
            checked={showAddToCart}
            onChange={(value: any) => setAttributes({ showAddToCart: value })}
          />
          <ToggleControl
            label={'Show Quick View'}
            checked={showQuickView}
            onChange={(value: any) => setAttributes({ showQuickView: value })}
          />
          <ToggleControl
            label={'Show Wishlist'}
            checked={showWishlist}
            onChange={(value: any) => setAttributes({ showWishlist: value })}
          />
        </PanelBody>

        <PanelBody title={'Color Settings'} initialOpen={false}>
          {/* Note: Using text inputs for colors due to ColorPicker compatibility issues */}
          <div style={{ marginBottom: '16px' }}>
            <label>{'Price Color'}</label>
            <input
              type="color"
              value={priceColor || '#000000'}
              onChange={(e: any) => setAttributes({ priceColor: e.target.value })}
              style={{ width: '100%', height: '32px' }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label>{'Sale Price Color'}</label>
            <input
              type="color"
              value={salePriceColor || '#e74c3c'}
              onChange={(e: any) => setAttributes({ salePriceColor: e.target.value })}
              style={{ width: '100%', height: '32px' }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label>{'Button Color'}</label>
            <input
              type="color"
              value={buttonColor || '#007cba'}
              onChange={(e: any) => setAttributes({ buttonColor: e.target.value })}
              style={{ width: '100%', height: '32px' }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label>{'Button Text Color'}</label>
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