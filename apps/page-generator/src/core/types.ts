/**
 * Core types for Page Generator
 */

export interface Block {
  id: string;
  type: string;
  attributes: Record<string, any>;
  innerBlocks?: Block[];
}

export interface ReactElement {
  type: string;
  props: {
    className?: string;
    src?: string;
    alt?: string;
    href?: string;
    onClick?: any;
    width?: number;
    height?: number;
    [key: string]: any;
  };
  children: (string | ReactElement)[];
}

export interface PageData {
  title: string;
  slug: string;
  content: Block[];
  excerpt?: string;
  status: 'draft' | 'publish';
  type: 'page' | 'post';
  showInMenu?: boolean;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
  };
}
