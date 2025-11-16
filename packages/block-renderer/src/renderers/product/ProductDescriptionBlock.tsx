/**
 * Product Description Block Renderer
 * Displays product description or excerpt
 */

import React from 'react';
import { BlockRendererProps } from '../../types/block.types';
import { getBlockData } from '../../utils/block-parser';
import clsx from 'clsx';
import DOMPurify from 'dompurify';

export const ProductDescriptionBlock: React.FC<BlockRendererProps> = ({ block }) => {
  // Access post data injected by CPTSingle
  const postData = (block as any)._postData;

  if (!postData) {
    return null;
  }

  // Get description from customFields, excerpt, or content
  const customFields = postData.customFields || postData.meta || {};
  const description =
    customFields.description ||
    postData.excerpt ||
    customFields.short_description ||
    '';

  if (!description) {
    return null;
  }

  // Get styling options
  const className = getBlockData(block, 'className', '');
  const showTitle = getBlockData(block, 'showTitle', true);
  const title = getBlockData(block, 'title', '상품 설명');

  const classNames = clsx('product-description', 'mb-6', className);

  // Sanitize HTML if description contains HTML
  const sanitizedDescription = DOMPurify.sanitize(description);
  const isHtml = /<[^>]+>/.test(description);

  return (
    <div className={classNames}>
      {showTitle && (
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{title}</h2>
      )}
      <div className="text-gray-700 whitespace-pre-wrap">
        {isHtml ? (
          <div dangerouslySetInnerHTML={{ __html: sanitizedDescription }} />
        ) : (
          <p>{description}</p>
        )}
      </div>
    </div>
  );
};
