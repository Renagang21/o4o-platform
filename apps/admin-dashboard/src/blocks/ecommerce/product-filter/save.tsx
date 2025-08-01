import { useBlockProps } from '@wordpress/block-editor';

export function save({ attributes }: { attributes: any }) {
  const blockProps = useBlockProps.save({
    className: 'o4o-product-filter-block'
  });

  return (
    <div {...blockProps}>
      {/* Server-side rendering */}
      {`[o4o_product_filter 
        layout="${attributes.layout}"
        show_price="${attributes.showPriceFilter}"
        price_min="${attributes.priceMin}"
        price_max="${attributes.priceMax}"
        show_category="${attributes.showCategoryFilter}"
        show_brand="${attributes.showBrandFilter}"
        show_stock="${attributes.showStockFilter}"
        show_sort="${attributes.showSortOptions}"
        ajax="${attributes.ajaxFilter}"
      ]`}
    </div>
  );
}