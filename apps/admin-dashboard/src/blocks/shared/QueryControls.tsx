import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

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
    <div className="o4o-query-controls space-y-4">
      <div className="space-y-2">
        <Label htmlFor="per-page-slider">Number of items: {query.perPage || 9}</Label>
        <Slider
          min={1}
          max={50}
          step={1}
          value={[query.perPage || 9]}
          onValueChange={(value) => updateQuery('perPage', value[0])}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="order-by-select">Order by</Label>
        <Select value={query.orderBy || 'date'} onValueChange={(value) => updateQuery('orderBy', value)}>
          <SelectTrigger id="order-by-select">
            <SelectValue placeholder="Select order by" />
          </SelectTrigger>
          <SelectContent>
            {orderByOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="order-select">Order</Label>
        <Select value={query.order || 'desc'} onValueChange={(value) => updateQuery('order', value)}>
          <SelectTrigger id="order-select">
            <SelectValue placeholder="Select order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Descending</SelectItem>
            <SelectItem value="asc">Ascending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {postType === 'product' && (
        <>
          <div className="flex items-center space-x-2">
            <Switch
              id="featured-switch"
              checked={query.featured || false}
              onCheckedChange={(checked) => updateQuery('featured', checked)}
            />
            <Label htmlFor="featured-switch">Featured products only</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="on-sale-switch"
              checked={query.onSale || false}
              onCheckedChange={(checked) => updateQuery('onSale', checked)}
            />
            <Label htmlFor="on-sale-switch">On sale only</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="in-stock-switch"
              checked={query.inStock || false}
              onCheckedChange={(checked) => updateQuery('inStock', checked)}
            />
            <Label htmlFor="in-stock-switch">In stock only</Label>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <div className="space-y-2">
                <Label htmlFor="min-price">Min Price</Label>
                <Input
                  id="min-price"
                  type="number"
                  value={query.minPrice || ''}
                  onChange={(e) => updateQuery('minPrice', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Min price"
                />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="space-y-2">
                <Label htmlFor="max-price">Max Price</Label>
                <Input
                  id="max-price"
                  type="number"
                  value={query.maxPrice || ''}
                  onChange={(e) => updateQuery('maxPrice', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Max price"
                />
              </div>
            </div>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="search-input">Search</Label>
        <Input
          id="search-input"
          type="text"
          value={query.search || ''}
          onChange={(e) => updateQuery('search', e.target.value)}
          placeholder="Search products..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="offset-input">Offset</Label>
        <Input
          id="offset-input"
          type="number"
          value={query.offset || 0}
          onChange={(e) => updateQuery('offset', e.target.value ? parseInt(e.target.value) : 0)}
          placeholder="Number of items to skip"
        />
        <p className="text-sm text-muted-foreground">Number of items to skip</p>
      </div>
    </div>
  );
}