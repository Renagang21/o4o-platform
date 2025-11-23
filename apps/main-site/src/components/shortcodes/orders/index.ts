/**
 * Orders Shortcodes Index
 * R-6-9: Customer Order Management
 */

import { ShortcodeDefinition } from '@o4o/shortcodes';
import { OrderList } from './OrderList';
import { OrderDetail } from './OrderDetail';

// OrderList Shortcode Definition
export const orderListShortcode: ShortcodeDefinition = {
  name: 'my-orders',
  description: '고객 주문 목록 페이지',
  attributes: {},
  component: OrderList
};

// OrderDetail Shortcode Definition
export const orderDetailShortcode: ShortcodeDefinition = {
  name: 'order-detail',
  description: '고객 주문 상세 페이지',
  attributes: {},
  component: OrderDetail
};

// Export combined array for automatic registration
export const orderShortcodes = [
  orderListShortcode,
  orderDetailShortcode
];

// Export all components
export { OrderList } from './OrderList';
export { OrderDetail } from './OrderDetail';
export { OrderListItemCard } from './OrderListItemCard';
export { OrderTimeline } from './OrderTimeline';
export { OrderListSkeleton } from './OrderListSkeleton';
export { OrderDetailSkeleton } from './OrderDetailSkeleton';
