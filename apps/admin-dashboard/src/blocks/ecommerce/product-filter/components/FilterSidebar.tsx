import { useState } from 'react';
import { __ } from '@wordpress/i18n';
import { ChevronDown, Filter } from 'lucide-react';
import { formatPrice } from '../../../../utils/ecommerce';

interface FilterSidebarProps {
  attributes: any;
  categories: any[];
  brands: any[];
  isEditor?: boolean;
}

export function FilterSidebar({ attributes, categories, brands, isEditor = false }: FilterSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['price', 'category']);
  const [selectedFilters, setSelectedFilters] = useState({
    priceRange: [attributes.priceMin, attributes.priceMax],
    categories: [] as number[],
    brands: [] as number[],
    inStock: false,
    onSale: false,
    rating: 0
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const isExpanded = (section: string) => {
    return attributes.filterStyle === 'expanded' || expandedSections.includes(section);
  };

  const handlePriceChange = (index: number, value: number) => {
    const newRange = [...selectedFilters.priceRange] as [number, number];
    newRange[index] = value;
    setSelectedFilters({ ...selectedFilters, priceRange: newRange });
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
    setSelectedFilters({ ...selectedFilters, brands: newBrands });
  };

  const clearAllFilters = () => {
    setSelectedFilters({
      priceRange: [attributes.priceMin, attributes.priceMax],
      categories: [],
      brands: [],
      inStock: false,
      onSale: false,
      rating: 0
    });
  };

  const activeFilterCount = 
    (selectedFilters.priceRange[0] !== attributes.priceMin || selectedFilters.priceRange[1] !== attributes.priceMax ? 1 : 0) +
    selectedFilters.categories.length +
    selectedFilters.brands.length +
    (selectedFilters.inStock ? 1 : 0) +
    (selectedFilters.onSale ? 1 : 0) +
    (selectedFilters.rating > 0 ? 1 : 0);

  return (
    <div className="o4o-filter-sidebar">
      {/* Filter Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Filter className="w-5 h-5" />
          {__('Filter Products', 'o4o')}
          {attributes.showFilterCount && activeFilterCount > 0 && (
            <span className="text-sm bg-blue-500 text-white px-2 py-1 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </h3>
        {attributes.showClearAll && activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {__('Clear All', 'o4o')}
          </button>
        )}
      </div>

      {/* Price Filter */}
      {attributes.showPriceFilter && (
        <div className="mb-4 border-b pb-4">
          <button
            onClick={() => toggleSection('price')}
            className="flex items-center justify-between w-full text-left font-medium mb-3"
          >
            <span>{__('Price', 'o4o')}</span>
            <ChevronDown 
              className={`w-4 h-4 transition-transform ${isExpanded('price') ? 'rotate-180' : ''}`}
            />
          </button>
          {isExpanded('price') && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={selectedFilters.priceRange[0]}
                  onChange={(e) => handlePriceChange(0, parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1 border rounded"
                  placeholder={formatPrice(attributes.priceMin)}
                />
                <span>-</span>
                <input
                  type="number"
                  value={selectedFilters.priceRange[1]}
                  onChange={(e) => handlePriceChange(1, parseInt(e.target.value) || attributes.priceMax)}
                  className="w-full px-2 py-1 border rounded"
                  placeholder={formatPrice(attributes.priceMax)}
                />
              </div>
              <input
                type="range"
                min={attributes.priceMin}
                max={attributes.priceMax}
                step={attributes.priceStep}
                value={selectedFilters.priceRange[1]}
                onChange={(e) => handlePriceChange(1, parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>{formatPrice(selectedFilters.priceRange[0])}</span>
                <span>{formatPrice(selectedFilters.priceRange[1])}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Category Filter */}
      {attributes.showCategoryFilter && categories.length > 0 && (
        <div className="mb-4 border-b pb-4">
          <button
            onClick={() => toggleSection('category')}
            className="flex items-center justify-between w-full text-left font-medium mb-3"
          >
            <span>{__('Categories', 'o4o')}</span>
            <ChevronDown 
              className={`w-4 h-4 transition-transform ${isExpanded('category') ? 'rotate-180' : ''}`}
            />
          </button>
          {isExpanded('category') && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {categories.map(category => (
                <label key={category.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFilters.categories.includes(category.id)}
                    onChange={() => handleCategoryToggle(category.id)}
                    className="rounded"
                  />
                  <span className="text-sm">{category.name}</span>
                  {attributes.showFilterCount && (
                    <span className="text-xs text-gray-500">({category.count})</span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Brand Filter */}
      {attributes.showBrandFilter && brands.length > 0 && (
        <div className="mb-4 border-b pb-4">
          <button
            onClick={() => toggleSection('brand')}
            className="flex items-center justify-between w-full text-left font-medium mb-3"
          >
            <span>{__('Brands', 'o4o')}</span>
            <ChevronDown 
              className={`w-4 h-4 transition-transform ${isExpanded('brand') ? 'rotate-180' : ''}`}
            />
          </button>
          {isExpanded('brand') && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {brands.map(brand => (
                <label key={brand.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFilters.brands.includes(brand.id)}
                    onChange={() => handleBrandToggle(brand.id)}
                    className="rounded"
                  />
                  <span className="text-sm">{brand.name}</span>
                  {attributes.showFilterCount && (
                    <span className="text-xs text-gray-500">({brand.count})</span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stock Filter */}
      {attributes.showStockFilter && (
        <div className="mb-4 border-b pb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedFilters.inStock}
              onChange={(e) => setSelectedFilters({ ...selectedFilters, inStock: e.target.checked })}
              className="rounded"
            />
            <span className="font-medium">{__('In Stock Only', 'o4o')}</span>
          </label>
        </div>
      )}

      {/* Sale Filter */}
      {attributes.showSaleFilter && (
        <div className="mb-4 border-b pb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedFilters.onSale}
              onChange={(e) => setSelectedFilters({ ...selectedFilters, onSale: e.target.checked })}
              className="rounded"
            />
            <span className="font-medium">{__('On Sale', 'o4o')}</span>
          </label>
        </div>
      )}

      {/* Rating Filter */}
      {attributes.showRatingFilter && (
        <div className="mb-4 border-b pb-4">
          <button
            onClick={() => toggleSection('rating')}
            className="flex items-center justify-between w-full text-left font-medium mb-3"
          >
            <span>{__('Rating', 'o4o')}</span>
            <ChevronDown 
              className={`w-4 h-4 transition-transform ${isExpanded('rating') ? 'rotate-180' : ''}`}
            />
          </button>
          {isExpanded('rating') && (
            <div className="space-y-2">
              {[4, 3, 2, 1].map(rating => (
                <label key={rating} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="rating"
                    checked={selectedFilters.rating === rating}
                    onChange={() => setSelectedFilters({ ...selectedFilters, rating })}
                  />
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className={`text-sm ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
                      >
                        ★
                      </span>
                    ))}
                    <span className="text-sm text-gray-600">{__('& Up', 'o4o')}</span>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {!isEditor && (
        <button
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          {__('Apply Filters', 'o4o')}
        </button>
      )}
    </div>
  );
}