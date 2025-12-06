/**
 * Cosmetics Recommendations Shortcode
 *
 * Usage: [cosmetics-recommendations skinType="dry,sensitive" concerns="hydration,redness" limit="5"]
 *
 * Displays product recommendations based on specified criteria
 */

import React from 'react';
import { CosmeticsRecommendationPanel } from '../components/CosmeticsRecommendationPanel.js';

export interface CosmeticsRecommendationsShortcodeProps {
  skinType?: string; // Comma-separated: "dry,sensitive"
  concerns?: string; // Comma-separated: "hydration,redness"
  brand?: string;
  category?: string;
  limit?: number;
  apiBaseUrl?: string;
  title?: string;
}

export const CosmeticsRecommendationsShortcode: React.FC<CosmeticsRecommendationsShortcodeProps> = ({
  skinType,
  concerns,
  brand,
  category,
  limit = 5,
  apiBaseUrl,
  title
}) => {
  // Parse comma-separated strings to arrays
  const parseSkinTypes = (): string[] | undefined => {
    if (!skinType) return undefined;
    return skinType.split(',').map(s => s.trim()).filter(Boolean);
  };

  const parseConcerns = (): string[] | undefined => {
    if (!concerns) return undefined;
    return concerns.split(',').map(c => c.trim()).filter(Boolean);
  };

  const skinTypesArray = parseSkinTypes();
  const concernsArray = parseConcerns();

  return (
    <CosmeticsRecommendationPanel
      skinTypes={skinTypesArray}
      concerns={concernsArray}
      brand={brand}
      category={category}
      limit={limit}
      apiBaseUrl={apiBaseUrl}
      title={title}
    />
  );
};

export default CosmeticsRecommendationsShortcode;
