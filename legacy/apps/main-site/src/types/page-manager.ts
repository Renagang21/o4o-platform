import { ReactNode } from 'react';
/**
 * Page Manager type definitions
 */

// Hero section types
export interface HeroSection {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  backgroundImage?: string;
}

// Section types
export interface BaseSection {
  id: string;
  type: string;
  title: string;
}

export interface BannerSection extends BaseSection {
  type: 'banner';
  description: string;
  ctaText: string;
  ctaLink: string;
  backgroundColor: string;
  textColor: string;
}

export interface FeatureItem {
  title: string;
  description: string;
  icon: string;
}

export interface FeaturesSection extends BaseSection {
  type: 'features';
  items: FeatureItem[];
}

export interface ContentSection extends BaseSection {
  type: 'content';
  content: string;
}

export interface ProgressSection extends BaseSection {
  type: 'progress';
  current: number;
  target: number;
  backers: number;
  daysLeft: number;
}

export interface GallerySection extends BaseSection {
  type: 'gallery';
  images: {
    url: string;
    alt: string;
    caption?: string;
  }[];
}

export type PageSection = BannerSection | FeaturesSection | ContentSection | ProgressSection | GallerySection;

// Page content type
export interface PageContent {
  title: string;
  hero?: HeroSection;
  sections: PageSection[];
}

// Page info type
export interface PageInfo {
  id: string;
  name: string;
  icon: ReactNode;
  url: string;
}

// Default page contents
export interface DefaultPageContents {
  [key: string]: PageContent;
}