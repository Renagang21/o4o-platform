/**
 * Block Registry
 *
 * Central registry for all block renderers
 */

import { BlockRenderer, BlockRendererProps } from './BlockRenderer';

// Import all implemented blocks
import {
  TextBlock,
  HeadingBlock,
  ButtonBlock,
  RichTextBlock,
  DividerBlock,
  SpacerBlock,
  IconTextBlock,
  BadgeBlock,
  QuoteBlock,
  ImageBlock,
} from './basic';

import {
  SectionBlock,
  ContainerBlock,
  HeroBlock,
  RowBlock,
  ColumnBlock,
  TwoColumnBlock,
  ThreeColumnBlock,
  BulletListBlock,
  CardBlock,
  AccordionBlock,
  TabsBlock,
  ModalBlock,
  OldSectionBlock,
} from './layout';

import {
  FeatureGridBlock,
  TestimonialBlock,
  TestimonialGridBlock,
  PricingCardBlock,
  PricingGridBlock,
  FAQBlock,
  CTABlock,
  StatsCounterBlock,
  ImageCaptionBlock,
  TeamMemberBlock,
  TimelineBlock,
  StepGuideBlock,
} from './marketing';

import {
  CPTListBlock,
  CPTItemBlock,
  CategoryListBlock,
  TagCloudBlock,
  RecentPostsBlock,
  RelatedPostsBlock,
  BreadcrumbBlock,
  PaginationBlock,
  SearchBarBlock,
} from './cms';

import {
  ForumHomeBlock,
  ForumPostListBlock,
  ForumPostDetailBlock,
  ForumCommentSectionBlock,
  ForumCategoryListBlock,
  CosmeticsPostListBlock,
  CosmeticsTrendingBlock,
  CosmeticsPopularBlock,
  CosmeticsPersonalizedBlock,
} from './forum';

// Placeholder for unimplemented blocks
const PlaceholderBlock = ({ node, children }: BlockRendererProps) => {
  return (
    <div className="border-2 border-dashed border-gray-300 p-4 rounded bg-gray-50">
      <div className="text-sm text-gray-600 mb-2">
        Block: <span className="font-mono font-semibold">{node.type}</span>
      </div>
      {children}
    </div>
  );
};

export const BlockRegistry: Record<string, BlockRenderer> = {
  // Basic Blocks (10)
  Text: TextBlock,
  Heading: HeadingBlock,
  Button: ButtonBlock,
  RichText: RichTextBlock,
  Divider: DividerBlock,
  Spacer: SpacerBlock,
  IconText: IconTextBlock,
  Badge: BadgeBlock,
  Quote: QuoteBlock,
  Image: ImageBlock,

  // Layout Blocks (13)
  Section: SectionBlock,
  Container: ContainerBlock,
  Hero: HeroBlock,
  Row: RowBlock,
  Column: ColumnBlock,
  TwoColumn: TwoColumnBlock,
  ThreeColumn: ThreeColumnBlock,
  BulletList: BulletListBlock,
  Card: CardBlock,
  Accordion: AccordionBlock,
  Tabs: TabsBlock,
  Modal: ModalBlock,
  OldSection: OldSectionBlock,

  // Marketing Blocks (12)
  FeatureGrid: FeatureGridBlock,
  Testimonial: TestimonialBlock,
  TestimonialGrid: TestimonialGridBlock,
  PricingCard: PricingCardBlock,
  PricingGrid: PricingGridBlock,
  FAQ: FAQBlock,
  CTA: CTABlock,
  StatsCounter: StatsCounterBlock,
  ImageCaption: ImageCaptionBlock,
  TeamMember: TeamMemberBlock,
  Timeline: TimelineBlock,
  StepGuide: StepGuideBlock,

  // CMS Blocks (9)
  CPTList: CPTListBlock,
  CPTItem: CPTItemBlock,
  CategoryList: CategoryListBlock,
  TagCloud: TagCloudBlock,
  RecentPosts: RecentPostsBlock,
  RelatedPosts: RelatedPostsBlock,
  Breadcrumb: BreadcrumbBlock,
  Pagination: PaginationBlock,
  SearchBar: SearchBarBlock,

  // Forum Blocks (5)
  ForumHome: ForumHomeBlock,
  ForumPostList: ForumPostListBlock,
  ForumPostDetail: ForumPostDetailBlock,
  ForumCommentSection: ForumCommentSectionBlock,
  ForumCategoryList: ForumCategoryListBlock,

  // Cosmetics Forum Blocks (4)
  CosmeticsPostList: CosmeticsPostListBlock,
  CosmeticsTrending: CosmeticsTrendingBlock,
  CosmeticsPopular: CosmeticsPopularBlock,
  CosmeticsPersonalized: CosmeticsPersonalizedBlock,
};

export const getBlockRenderer = (type: string): BlockRenderer => {
  return BlockRegistry[type] || PlaceholderBlock;
};
