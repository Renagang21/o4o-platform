// import { useState, useEffect } from 'react';
import { __ } from '@wordpress/i18n';
import {
  InspectorControls,
  BlockControls,
  useBlockProps
} from '@wordpress/block-editor';
import {
  PanelBody,
  SelectControl,
  ToggleControl,
  // RangeControl,
  ToolbarGroup,
  ToolbarButton,
  TextControl,
  // __experimentalNumberControl as NumberControl
} from '@wordpress/components';
import { /* Filter, */ List, Grid } from 'lucide-react';
import { FilterSidebar } from './components/FilterSidebar';
import { FilterHorizontal } from './components/FilterHorizontal';
import { useProductCategories, useProductBrands } from '../../../hooks/useProductTaxonomies';

export function Edit({ attributes, setAttributes }: { attributes: any; setAttributes: (attrs: any) => void }) {
  const {
    layout = 'sidebar',
    showPriceFilter = true,
    priceMin = 0,
    priceMax = 1000000,
    priceStep = 10000,
    showCategoryFilter = true,
    showTagFilter = false,
    showBrandFilter = true,
    showStockFilter = true,
    showRatingFilter = false,
    showSaleFilter = true,
    showSortOptions = true,
    sortOptions = ['popularity', 'rating', 'date', 'price', 'price-desc'],
    filterStyle = 'accordion',
    showFilterCount = true,
    showClearAll = true,
    ajaxFilter = true,
    mobileToggle = true,
    targetProductBlock
  } = attributes;

  const blockProps = useBlockProps({
    className: 'o4o-product-filter-block'
  });

  // Mock data for categories and brands
  const { categories } = useProductCategories();
  const { brands } = useProductBrands();

  const layoutOptions = [
    { label: __('Sidebar', 'o4o'), value: 'sidebar' },
    { label: __('Horizontal', 'o4o'), value: 'horizontal' },
    { label: __('Off-canvas', 'o4o'), value: 'offcanvas' }
  ];

  const filterStyleOptions = [
    { label: __('Accordion', 'o4o'), value: 'accordion' },
    { label: __('Expanded', 'o4o'), value: 'expanded' },
    { label: __('Dropdown', 'o4o'), value: 'dropdown' }
  ];

  const sortOptionChoices = [
    { label: __('Popularity', 'o4o'), value: 'popularity' },
    { label: __('Average Rating', 'o4o'), value: 'rating' },
    { label: __('Latest', 'o4o'), value: 'date' },
    { label: __('Price: Low to High', 'o4o'), value: 'price' },
    { label: __('Price: High to Low', 'o4o'), value: 'price-desc' },
    { label: __('Name: A to Z', 'o4o'), value: 'title' },
    { label: __('Name: Z to A', 'o4o'), value: 'title-desc' }
  ];

  const renderFilters = () => {
    const filterProps = {
      attributes,
      categories,
      brands,
      isEditor: true
    };

    switch (layout) {
      case 'horizontal':
        return <FilterHorizontal {...filterProps} />;
      case 'sidebar':
      case 'offcanvas':
      default:
        return <FilterSidebar {...filterProps} />;
    }
  };

  return (
    <>
      <BlockControls>
        <ToolbarGroup>
          <ToolbarButton
            icon={<List className="w-4 h-4" />}
            label={__('Sidebar Layout', 'o4o')}
            onClick={() => setAttributes({ layout: 'sidebar' })}
            isActive={layout === 'sidebar'}
          />
          <ToolbarButton
            icon={<Grid className="w-4 h-4" />}
            label={__('Horizontal Layout', 'o4o')}
            onClick={() => setAttributes({ layout: 'horizontal' })}
            isActive={layout === 'horizontal'}
          />
        </ToolbarGroup>
      </BlockControls>

      <InspectorControls>
        <PanelBody title={__('Layout Settings', 'o4o')} initialOpen={true}>
          <SelectControl
            label={__('Layout', 'o4o')}
            value={layout}
            options={layoutOptions}
            onChange={(value: any) => setAttributes({ layout: value })}
          />
          <SelectControl
            label={__('Filter Style', 'o4o')}
            value={filterStyle}
            options={filterStyleOptions}
            onChange={(value: any) => setAttributes({ filterStyle: value })}
          />
          <ToggleControl
            label={__('Show Filter Count', 'o4o')}
            checked={showFilterCount}
            onChange={(value: any) => setAttributes({ showFilterCount: value })}
          />
          <ToggleControl
            label={__('Show Clear All Button', 'o4o')}
            checked={showClearAll}
            onChange={(value: any) => setAttributes({ showClearAll: value })}
          />
          <ToggleControl
            label={__('Enable AJAX Filtering', 'o4o')}
            checked={ajaxFilter}
            onChange={(value: any) => setAttributes({ ajaxFilter: value })}
          />
          <ToggleControl
            label={__('Mobile Toggle Button', 'o4o')}
            checked={mobileToggle}
            onChange={(value: any) => setAttributes({ mobileToggle: value })}
          />
        </PanelBody>

        <PanelBody title={__('Filter Options', 'o4o')} initialOpen={false}>
          <ToggleControl
            label={__('Price Filter', 'o4o')}
            checked={showPriceFilter}
            onChange={(value: any) => setAttributes({ showPriceFilter: value })}
          />
          {showPriceFilter && (
            <>
              <TextControl
                label={__('Min Price', 'o4o')}
                value={priceMin.toString() as any}
                type="number"
                onChange={(value: string) => setAttributes({ priceMin: parseInt(value) || 0 })}
                min={0}
              />
              <TextControl
                label={__('Max Price', 'o4o')}
                value={priceMax.toString() as any}
                type="number"
                onChange={(value: string) => setAttributes({ priceMax: parseInt(value) || 1000000 })}
                min={0}
              />
              <TextControl
                label={__('Price Step', 'o4o')}
                value={priceStep.toString() as any}
                type="number"
                onChange={(value: string) => setAttributes({ priceStep: parseInt(value) || 10000 })}
                min={1000}
              />
            </>
          )}
          <ToggleControl
            label={__('Category Filter', 'o4o')}
            checked={showCategoryFilter}
            onChange={(value: any) => setAttributes({ showCategoryFilter: value })}
          />
          <ToggleControl
            label={__('Tag Filter', 'o4o')}
            checked={showTagFilter}
            onChange={(value: any) => setAttributes({ showTagFilter: value })}
          />
          <ToggleControl
            label={__('Brand Filter', 'o4o')}
            checked={showBrandFilter}
            onChange={(value: any) => setAttributes({ showBrandFilter: value })}
          />
          <ToggleControl
            label={__('Stock Filter', 'o4o')}
            checked={showStockFilter}
            onChange={(value: any) => setAttributes({ showStockFilter: value })}
          />
          <ToggleControl
            label={__('Rating Filter', 'o4o')}
            checked={showRatingFilter}
            onChange={(value: any) => setAttributes({ showRatingFilter: value })}
          />
          <ToggleControl
            label={__('Sale Filter', 'o4o')}
            checked={showSaleFilter}
            onChange={(value: any) => setAttributes({ showSaleFilter: value })}
          />
        </PanelBody>

        <PanelBody title={__('Sort Options', 'o4o')} initialOpen={false}>
          <ToggleControl
            label={__('Show Sort Options', 'o4o')}
            checked={showSortOptions}
            onChange={(value: any) => setAttributes({ showSortOptions: value })}
          />
          {showSortOptions && (
            <div>
              <p className="components-base-control__label">
                {__('Available Sort Options', 'o4o')}
              </p>
              {sortOptionChoices.map((option: any) => (
                <ToggleControl
                  key={option.value}
                  label={option.label}
                  checked={sortOptions.includes(option.value)}
                  onChange={(checked: any) => {
                    const newOptions = checked
                      ? [...sortOptions, option.value]
                      : sortOptions.filter((v: any) => v !== option.value);
                    setAttributes({ sortOptions: newOptions });
                  }}
                />
              ))}
            </div>
          )}
        </PanelBody>

        <PanelBody title={__('Integration', 'o4o')} initialOpen={false}>
          <TextControl
            label={__('Target Product Block ID', 'o4o')}
            help={__('Enter the block ID of the product listing to filter', 'o4o')}
            value={targetProductBlock || ''}
            onChange={(value: any) => setAttributes({ targetProductBlock: value })}
            placeholder="block-123456"
          />
        </PanelBody>
      </InspectorControls>

      <div {...blockProps}>
        {renderFilters()}
      </div>
    </>
  );
}