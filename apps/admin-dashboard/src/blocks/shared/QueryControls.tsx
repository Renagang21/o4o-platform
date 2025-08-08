import { __ } from '@wordpress/i18n';
import {
  SelectControl,
  RangeControl,
  TextControl,
  ToggleControl
} from '@wordpress/components';

interface QueryControlsProps {
  attributes: any;
  setAttributes: (attrs: any) => void;
  postType?: string;
}

export function QueryControls({ attributes, setAttributes, postType = 'product' }: QueryControlsProps) {
  const { query = {} } = attributes;

  const updateQuery = (key: string, value: any) => {
    setAttributes({
      query: {
        ...query,
        [key]: value
      }
    });
  };

  const orderByOptions = postType === 'product' ? [
    { label: __('Date', 'o4o'), value: 'date' },
    { label: __('Title', 'o4o'), value: 'title' },
    { label: __('Price', 'o4o'), value: 'price' },
    { label: __('Sales', 'o4o'), value: 'sales' },
    { label: __('Rating', 'o4o'), value: 'rating' },
    { label: __('Menu Order', 'o4o'), value: 'menu_order' },
    { label: __('Random', 'o4o'), value: 'rand' }
  ] : [
    { label: __('Date', 'o4o'), value: 'date' },
    { label: __('Title', 'o4o'), value: 'title' },
    { label: __('Menu Order', 'o4o'), value: 'menu_order' },
    { label: __('Random', 'o4o'), value: 'rand' }
  ];

  return (
    <div className="o4o-query-controls">
      <RangeControl
        label={__('Number of items', 'o4o')}
        value={query.perPage || 9}
        onChange={(value: number | undefined) => updateQuery('perPage', value)}
        min={1}
        max={50}
      />

      <SelectControl
        label={__('Order by', 'o4o')}
        value={query.orderBy || 'date'}
        options={orderByOptions}
        onChange={(value: string) => updateQuery('orderBy', value)}
      />

      <SelectControl
        label={__('Order', 'o4o')}
        value={query.order || 'desc'}
        options={[
          { label: __('Descending', 'o4o'), value: 'desc' },
          { label: __('Ascending', 'o4o'), value: 'asc' }
        ]}
        onChange={(value: string) => updateQuery('order', value)}
      />

      {postType === 'product' && (
        <>
          <ToggleControl
            label={__('Featured products only', 'o4o')}
            checked={query.featured || false}
            onChange={(value: boolean) => updateQuery('featured', value)}
            disabled={false}
          />

          <ToggleControl
            label={__('On sale only', 'o4o')}
            checked={query.onSale || false}
            onChange={(value: boolean) => updateQuery('onSale', value)}
            disabled={false}
          />

          <ToggleControl
            label={__('In stock only', 'o4o')}
            checked={query.inStock || false}
            onChange={(value: boolean) => updateQuery('inStock', value)}
            disabled={false}
          />

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <TextControl
                label={__('Min Price', 'o4o')}
                type="number"
                value={query.minPrice || ''}
                onChange={(value: string) => updateQuery('minPrice', value ? parseInt(value) : undefined)}
                className=""
                help=""
                __nextHasNoMarginBottom={false}
                hideLabelFromVision={false}
              />
            </div>
            <div style={{ flex: 1 }}>
              <TextControl
                label={__('Max Price', 'o4o')}
                type="number"
                value={query.maxPrice || ''}
                onChange={(value: string) => updateQuery('maxPrice', value ? parseInt(value) : undefined)}
                className=""
                help=""
                __nextHasNoMarginBottom={false}
                hideLabelFromVision={false}
              />
            </div>
          </div>
        </>
      )}

      <TextControl
        label={__('Search', 'o4o')}
        value={query.search || ''}
        onChange={(value: string) => updateQuery('search', value)}
        placeholder={__('Search products...', 'o4o')}
        className=""
        help=""
        __nextHasNoMarginBottom={false}
        hideLabelFromVision={false}
      />

      <TextControl
        label={__('Offset', 'o4o')}
        help={__('Number of items to skip', 'o4o')}
        type="number"
        value={query.offset || 0}
        onChange={(value: string) => updateQuery('offset', value ? parseInt(value) : 0)}
        className=""
        __nextHasNoMarginBottom={false}
        hideLabelFromVision={false}
      />
    </div>
  );
}