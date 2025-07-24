// MSW Handler Types

export interface MSWRequestParams {
  [key: string]: string | readonly string[];
}

export interface MSWRequest {
  json: () => Promise<any>;
  url: string;
}

export interface MSWHandlerInfo {
  request: MSWRequest;
  params: MSWRequestParams;
}

// Common data types for mock requests

export interface PostCreateData {
  title: string;
  content: string;
  status?: string;
  author?: string;
  categoryId?: string;
  tags?: string[];
  featuredImage?: string;
  postType?: string;
  visibility?: string;
  publishedAt?: string;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  customFields?: Record<string, any>;
}

export interface PostUpdateData extends Partial<PostCreateData> {
  id?: string;
}

export interface MediaUploadData {
  name: string;
  size: number;
  type: string;
  url: string;
  thumbnailUrl?: string;
  altText?: string;
  caption?: string;
  description?: string;
}

export interface MediaUpdateData {
  altText?: string;
  caption?: string;
  description?: string;
  tags?: string[];
}

export interface MenuCreateData {
  name: string;
  location?: string;
  items?: any[];
}

export interface MenuUpdateData extends Partial<MenuCreateData> {
  id?: string;
}

export interface ACFFieldData {
  label: string;
  name: string;
  type: string;
  defaultValue?: any;
  choices?: string[] | Record<string, string>;
  required?: boolean;
  placeholder?: string;
  instructions?: string;
  conditional?: boolean;
  wrapper?: {
    width?: string;
    class?: string;
    id?: string;
  };
}

export interface ACFGroupData {
  title: string;
  fields: ACFFieldData[];
  location?: Array<{
    param: string;
    operator: string;
    value: string;
  }>;
  menuOrder?: number;
  position?: string;
  style?: string;
  labelPlacement?: string;
  instructionPlacement?: string;
}

export interface CustomPostTypeData {
  name: string;
  singular: string;
  plural: string;
  slug?: string;
  icon?: string;
  supports?: string[];
  taxonomies?: string[];
  public?: boolean;
  showInMenu?: boolean;
  showInRest?: boolean;
  hasArchive?: boolean;
  hierarchical?: boolean;
  labels?: Record<string, string>;
}

export interface SettlementProcessData {
  settlementIds: string[];
  memo?: string;
}

export interface RefundProcessData {
  action: 'approve' | 'reject';
  adminNote?: string;
  approvedAmount?: number;
}

export interface OrderStatusUpdateData {
  newStatus: string;
  reason?: string;
  notes?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
}

export interface OrderRefundData {
  amount?: number;
  reason?: string;
}

export interface TossConfigUpdateData {
  clientKey?: string;
  secretKey?: string;
  webhookSecretKey?: string;
  isLive?: boolean;
  isEnabled?: boolean;
  supportedMethods?: any[];
  webhookUrl?: string;
  returnUrl?: string;
  failUrl?: string;
}

export interface TossTestData {
  testType: 'connection' | 'payment' | 'webhook';
}

export interface TossPaymentProcessData {
  orderId: string;
  amount: number;
  method?: string;
}

export interface TossCancelData {
  paymentKey: string;
  cancelReason: string;
}

export interface RefundCreateData {
  orderId: string;
  orderNumber?: string;
  customerName?: string;
  customerEmail?: string;
  paymentKey?: string;
  amount: number;
  reason?: string;
  items?: any[];
}

export interface FeePolicyData {
  name: string;
  type: string;
  baseRate: number;
  minFee?: number;
  maxFee?: number;
  isActive?: boolean;
  conditions?: any[];
  description?: string;
}

export interface FeeCalculationData {
  orderAmount: number;
  categoryId?: string;
  vendorTier?: string;
  paymentMethod?: string;
}