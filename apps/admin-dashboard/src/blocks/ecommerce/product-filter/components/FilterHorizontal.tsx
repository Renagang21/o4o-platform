import { useState } from 'react';
import { __ } from '@wordpress/i18n';
import { ChevronDown, X } from 'lucide-react';
// import { formatPrice } from '../../../../utils/ecommerce';
const formatPrice = (price: number, symbol: string = '$') => `${symbol}${price.toFixed(2)}`;

interface FilterHorizontalProps {
  attributes: any;
  categories: any[];
  brands: any[];
  isEditor?: boolean;
}

export function FilterHorizontal({ attributes, categories, brands, isEditor: _isEditor = false }: FilterHorizontalProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [selectedFilters, setSelectedFilters] = useState({
    priceRange: [attributes.priceMin, attributes.priceMax],
    categories: [] as number[],
    brands: [] as number[],
    inStock: false,
    onSale: false,
    rating: 0,
    sortBy: 'date'
  });

  const toggleDropdown = (dropdown: string) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  const handleCategoryToggle = (categoryId: number) => {
    const newCategories = selectedFilters.categories.includes(categoryId)
      ? selectedFilters.categories.filter(id => id !== categoryId)
      : [...selectedFilters.categories, categoryId];
    setSelectedFilters({ ...selectedFilters, categories: newCategories });
  };

  const handleBrandToggle = (brandId: number) => {
    const newBrands = selectedFilters.brands.includes(brandId)
      ? selectedFilters.brands.filter(id => id !== brandId)
      : [...selectedFilters.brands, brandId];
    setSelectedFilters({ ...selectedFilters, brands: newBrands as number[] });
  };

  const removeFilter = (type: string, value?: any) => {
    switch (type) {
      case 'price':
        setSelectedFilters({
          ...selectedFilters,
          priceRange: [attributes.priceMin, attributes.priceMax]
        });
        break;
      case 'category':
        setSelectedFilters({
          ...selectedFilters,
          categories: selectedFilters.categories.filter(id => id !== value)
        });
        break;
      case 'brand':
        setSelectedFilters({
          ...selectedFilters,
          brands: selectedFilters.brands.filter(id => id !== value)
        });
        break;
      case 'inStock':
        setSelectedFilters({ ...selectedFilters, inStock: false });
        break;
      case 'onSale':
        setSelectedFilters({ ...selectedFilters, onSale: false });
        break;
      case 'rating':
        setSelectedFilters({ ...selectedFilters, rating: 0 });
        break;
    }
  };

  const sortOptions = [
    { value: 'date', label: __('Latest', 'o4o') },
    { value: 'popularity', label: __('Popularity', 'o4o') },
    { value: 'rating', label: __('Average Rating', 'o4o') },
    { value: 'price', label: __('Price: Low to High', 'o4o') },
    { value: 'price-desc', label: __('Price: High to Low', 'o4o') },
    { value: 'title', label: __('Name: A to Z', 'o4o') },
    { value: 'title-desc', label: __('Name: Z to A', 'o4o') }
  ];

  const activeFilters = [];
  
  if (selectedFilters.priceRange[0] !== attributes.priceMin || selectedFilters.priceRange[1] !== attributes.priceMax) {
    activeFilters.push({
      type: 'price',
      label: `${formatPrice(selectedFilters.priceRange[0])} - ${formatPrice(selectedFilters.priceRange[1])}`
    });
  }
  
  selectedFilters.categories.forEach(catId => {
    const category = categories.find(c => c.id === catId);
    if (category) {
      activeFilters.push({
        type: 'category',
        value: catId,
        label: category.name
      });
    }
  });
  
  selectedFilters.brands.forEach(brandId => {
    const brand = brands.find(b => b.id === brandId);
    if (brand) {
      activeFilters.push({
        type: 'brand',
        value: brandId,
        label: brand.name
      });
    }
  });
  
  if (selectedFilters.inStock) {
    activeFilters.push({ type: 'inStock', label: __('In Stock', 'o4o') });
  }
  
  if (selectedFilters.onSale) {
    activeFilters.push({ type: 'onSale', label: __('On Sale', 'o4o') });
  }
  
  if (selectedFilters.rating > 0) {
    activeFilters.push({
      type: 'rating',
      label: `${selectedFilters.rating}★ ${__('& Up', 'o4o')}`
    });
  }

  return (
    <div className="o4o-filter-horizontal">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Sort Options */}
        {attributes.showSortOptions && (
          <div className="relative">
            <button
              onClick={() => toggleDropdown('sort')}
              className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              <span>{__('Sort by:', 'o4o')} {sortOptions.find(o => o.value === selectedFilters.sortBy)?.label}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {activeDropdown === 'sort' && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border rounded-md shadow-lg z-10">
                {sortOptions
                  .filter(option => attributes.sortOptions.includes(option.value))
                  .map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSelectedFilters({ ...selectedFilters, sortBy: option.value });
                        setActiveDropdown(null);
                      }}
                      className={`block w-full text-left px-4 py-2 hover:bg-gray-50 ${
                        selectedFilters.sortBy === option.value ? 'bg-blue-50 text-blue-600' : ''
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Filter Dropdowns */}
        {attributes.showPriceFilter && (
          <div className="relative">
            <button
              onClick={() => toggleDropdown('price')}
              className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              <span>{__('Price', 'o4o')}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {activeDropdown === 'price' && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border rounded-md shadow-lg z-10 p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={selectedFilters.priceRange[0]}
                      onChange={(e) => setSelectedFilters({
                        ...selectedFilters,
                        priceRange: [parseInt(e.target.value) || 0, selectedFilters.priceRange[1]]
                      })}
                      className="w-full px-2 py-1 border rounded text-sm"
                      placeholder="Min"
                    />
                    <span>-</span>
                    <input
                      type="number"
                      value={selectedFilters.priceRange[1]}
                      onChange={(e) => setSelectedFilters({
                        ...selectedFilters,
                        priceRange: [selectedFilters.priceRange[0], parseInt(e.target.value) || attributes.priceMax]
                      })}
                      className="w-full px-2 py-1 border rounded text-sm"
                      placeholder="Max"
                    />
                  </div>
                  <button
                    onClick={() => setActiveDropdown(null)}
                    className="w-full py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    {__('Apply', 'o4o')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {attributes.showCategoryFilter && categories.length > 0 && (
          <div className="relative">
            <button
              onClick={() => toggleDropdown('category')}
              className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              <span>{__('Category', 'o4o')}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {activeDropdown === 'category' && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border rounded-md shadow-lg z-10 p-2 max-h-80 overflow-y-auto">
                {categories.map(category => (
                  <label key={category.id} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFilters.categories.includes(category.id)}
                      onChange={() => handleCategoryToggle(category.id)}
                      className="rounded"
                    />
                    <span className="text-sm">{category.name}</span>
                    {attributes.showFilterCount && (
                      <span className="text-xs text-gray-500 ml-auto">({category.count})</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {attributes.showBrandFilter && brands.length > 0 && (
          <div className="relative">
            <button
              onClick={() => toggleDropdown('brand')}
              className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              <span>{__('Brand', 'o4o')}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {activeDropdown === 'brand' && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border rounded-md shadow-lg z-10 p-2 max-h-80 overflow-y-auto">
                {brands.map(brand => (
                  <label key={brand.id} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFilters.brands.includes(brand.id)}
                      onChange={() => handleBrandToggle(brand.id)}
                      className="rounded"
                    />
                    <span className="text-sm">{brand.name}</span>
                    {attributes.showFilterCount && (
                      <span className="text-xs text-gray-500 ml-auto">({brand.count})</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Filters */}
        {attributes.showStockFilter && (
          <label className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedFilters.inStock}
              onChange={(e) => setSelectedFilters({ ...selectedFilters, inStock: e.target.checked })}
              className="rounded"
            />
            <span>{__('In Stock', 'o4o')}</span>
          </label>
        )}

        {attributes.showSaleFilter && (
          <label className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedFilters.onSale}
              onChange={(e) => setSelectedFilters({ ...selectedFilters, onSale: e.target.checked })}
              className="rounded"
            />
            <span>{__('On Sale', 'o4o')}</span>
          </label>
        )}
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600">{__('Active Filters:', 'o4o')}</span>
          {activeFilters.map((filter, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm"
            >
              {filter.label}
              <button
                onClick={() => removeFilter(filter.type, (filter as any).value)}
                className="ml-1 hover:text-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {attributes.showClearAll && (
            <button
              onClick={() => setSelectedFilters({
                priceRange: [attributes.priceMin, attributes.priceMax],
                categories: [],
                brands: [],
                inStock: false,
                onSale: false,
                rating: 0,
                sortBy: 'date'
              })}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {__('Clear All', 'o4o')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}