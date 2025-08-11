// import { useState, useEffect } from 'react';
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
    { label: 'Sidebar', value: 'sidebar' },
    { label: 'Horizontal', value: 'horizontal' },
    { label: 'Off-canvas', value: 'offcanvas' }
  ];

  const filterStyleOptions = [
    { label: 'Accordion', value: 'accordion' },
    { label: 'Expanded', value: 'expanded' },
    { label: 'Dropdown', value: 'dropdown' }
  ];

  const sortOptionChoices = [
    { label: 'Popularity', value: 'popularity' },
    { label: 'Average Rating', value: 'rating' },
    { label: 'Latest', value: 'date' },
    { label: 'Price: Low to High', value: 'price' },
    { label: 'Price: High to Low', value: 'price-desc' },
    { label: 'Name: A to Z', value: 'title' },
    { label: 'Name: Z to A', value: 'title-desc' }
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
            label={'Sidebar Layout'}
            onClick={() => setAttributes({ layout: 'sidebar' })}
            isActive={layout === 'sidebar'}
          />
          <ToolbarButton
            icon={<Grid className="w-4 h-4" />}
            label={'Horizontal Layout'}
            onClick={() => setAttributes({ layout: 'horizontal' })}
            isActive={layout === 'horizontal'}
          />
        </ToolbarGroup>
      </BlockControls>

      <InspectorControls>
        <PanelBody title={'Layout Settings'} initialOpen={true}>
          <SelectControl
            label={'Layout'}
            value={layout}
            options={layoutOptions}
            onChange={(value: any) => setAttributes({ layout: value })}
          />
          <SelectControl
            label={'Filter Style'}
            value={filterStyle}
            options={filterStyleOptions}
            onChange={(value: any) => setAttributes({ filterStyle: value })}
          />
          <ToggleControl
            label={'Show Filter Count'}
            checked={showFilterCount}
            onChange={(value: any) => setAttributes({ showFilterCount: value })}
          />
          <ToggleControl
            label={'Show Clear All Button'}
            checked={showClearAll}
            onChange={(value: any) => setAttributes({ showClearAll: value })}
          />
          <ToggleControl
            label={'Enable AJAX Filtering'}
            checked={ajaxFilter}
            onChange={(value: any) => setAttributes({ ajaxFilter: value })}
          />
          <ToggleControl
            label={'Mobile Toggle Button'}
            checked={mobileToggle}
            onChange={(value: any) => setAttributes({ mobileToggle: value })}
          />
        </PanelBody>

        <PanelBody title={'Filter Options'} initialOpen={false}>
          <ToggleControl
            label={'Price Filter'}
            checked={showPriceFilter}
            onChange={(value: any) => setAttributes({ showPriceFilter: value })}
          />
          {showPriceFilter && (
            <>
              <TextControl
                label={'Min Price'}
                value={priceMin.toString() as any}
                type="number"
                onChange={(value: string) => setAttributes({ priceMin: parseInt(value) || 0 })}
                min={0}
              />
              <TextControl
                label={'Max Price'}
                value={priceMax.toString() as any}
                type="number"
                onChange={(value: string) => setAttributes({ priceMax: parseInt(value) || 1000000 })}
                min={0}
              />
              <TextControl
                label={'Price Step'}
                value={priceStep.toString() as any}
                type="number"
                onChange={(value: string) => setAttributes({ priceStep: parseInt(value) || 10000 })}
                min={1000}
              />
            </>
          )}
          <ToggleControl
            label={'Category Filter'}
            checked={showCategoryFilter}
            onChange={(value: any) => setAttributes({ showCategoryFilter: value })}
          />
          <ToggleControl
            label={'Tag Filter'}
            checked={showTagFilter}
            onChange={(value: any) => setAttributes({ showTagFilter: value })}
          />
          <ToggleControl
            label={'Brand Filter'}
            checked={showBrandFilter}
            onChange={(value: any) => setAttributes({ showBrandFilter: value })}
          />
          <ToggleControl
            label={'Stock Filter'}
            checked={showStockFilter}
            onChange={(value: any) => setAttributes({ showStockFilter: value })}
          />
          <ToggleControl
            label={'Rating Filter'}
            checked={showRatingFilter}
            onChange={(value: any) => setAttributes({ showRatingFilter: value })}
          />
          <ToggleControl
            label={'Sale Filter'}
            checked={showSaleFilter}
            onChange={(value: any) => setAttributes({ showSaleFilter: value })}
          />
        </PanelBody>

        <PanelBody title={'Sort Options'} initialOpen={false}>
          <ToggleControl
            label={'Show Sort Options'}
            checked={showSortOptions}
            onChange={(value: any) => setAttributes({ showSortOptions: value })}
          />
          {showSortOptions && (
            <div>
              <p className="components-base-control__label">
                {'Available Sort Options'}
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

        <PanelBody title={'Integration'} initialOpen={false}>
          <TextControl
            label={'Target Product Block ID'}
            help={'Enter the block ID of the product listing to filter'}
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