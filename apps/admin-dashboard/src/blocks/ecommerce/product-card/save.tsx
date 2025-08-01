import { useBlockProps } from '@wordpress/block-editor';

export function save({ attributes }: { attributes: any }) {
  const blockProps = useBlockProps.save({
    className: 'o4o-product-card-block'
  });

  return (
    <div {...blockProps}>
      {/* Server-side rendering */}
      {`[o4o_product_card 
        layout="${attributes.layout}"
        columns="${attributes.columns}"
        per_page="${attributes.query?.perPage || 9}"
        orderby="${attributes.query?.orderBy || 'date'}"
        order="${attributes.query?.order || 'desc'}"
        show_image="${attributes.showImage}"
        show_price="${attributes.showPrice}"
        show_stock="${attributes.showStock}"
        show_add_to_cart="${attributes.showAddToCart}"
        card_style="${attributes.cardStyle}"
      ]`}
    </div>
  );
}