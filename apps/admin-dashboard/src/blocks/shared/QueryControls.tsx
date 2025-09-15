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
    { label: 'Date', value: 'date' },
    { label: 'Title', value: 'title' },
    { label: 'Price', value: 'price' },
    { label: 'Sales', value: 'sales' },
    { label: 'Rating', value: 'rating' },
    { label: 'Menu Order', value: 'menu_order' },
    { label: 'Random', value: 'rand' }
  ] : [
    { label: 'Date', value: 'date' },
    { label: 'Title', value: 'title' },
    { label: 'Menu Order', value: 'menu_order' },
    { label: 'Random', value: 'rand' }
  ];

  return (
    <div className="o4o-query-controls">
      <RangeControl
        label={'Number of items'}
        value={query.perPage || 9}
        onChange={(value: number | undefined) => updateQuery('perPage', value)}
        min={1}
        max={50}
      />

      <SelectControl
        label={'Order by'}
        value={query.orderBy || 'date'}
        options={orderByOptions}
        onChange={(value: string) => updateQuery('orderBy', value)}
      />

      <SelectControl
        label={'Order'}
        value={query.order || 'desc'}
        options={[
          { label: 'Descending', value: 'desc' },
          { label: 'Ascending', value: 'asc' }
        ]}
        onChange={(value: string) => updateQuery('order', value)}
      />

      {postType === 'product' && (
        <>
          <ToggleControl
            label={'Featured products only'}
            checked={query.featured || false}
            onChange={(value: boolean) => updateQuery('featured', value)}
            disabled={false}
          />

          <ToggleControl
            label={'On sale only'}
            checked={query.onSale || false}
            onChange={(value: boolean) => updateQuery('onSale', value)}
            disabled={false}
          />

          <ToggleControl
            label={'In stock only'}
            checked={query.inStock || false}
            onChange={(value: boolean) => updateQuery('inStock', value)}
            disabled={false}
          />

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <TextControl
                label={'Min Price'}
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
                label={'Max Price'}
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
        label={'Search'}
        value={query.search || ''}
        onChange={(value: string) => updateQuery('search', value)}
        placeholder={'Search products...'}
        className=""
        help=""
        __nextHasNoMarginBottom={false}
        hideLabelFromVision={false}
      />

      <TextControl
        label={'Offset'}
        help={'Number of items to skip'}
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