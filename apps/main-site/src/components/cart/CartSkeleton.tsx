/**
 * Cart Skeleton Component
 * R-6-7: Loading skeleton for cart page
 *
 * Features:
 * - Cart item skeleton (3 items)
 * - Summary skeleton
 * - Responsive layout matching actual cart
 */

import React from 'react';

export const CartItemSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
    <div className="flex gap-4">
      {/* Image Skeleton */}
      <div className="w-24 h-24 flex-shrink-0 bg-gray-200 rounded-lg" />

      {/* Content Skeleton */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Title */}
        <div className="h-6 bg-gray-200 rounded w-3/4" />
        {/* Seller */}
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        {/* Price */}
        <div className="h-6 bg-gray-200 rounded w-1/3" />
      </div>

      {/* Controls Skeleton */}
      <div className="flex flex-col items-end gap-3">
        {/* Remove button */}
        <div className="w-5 h-5 bg-gray-200 rounded" />
        {/* Quantity controls */}
        <div className="h-10 w-28 bg-gray-200 rounded-lg" />
        {/* Stock info */}
        <div className="h-4 w-16 bg-gray-200 rounded" />
      </div>
    </div>

    {/* Subtotal */}
    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between">
      <div className="h-4 w-12 bg-gray-200 rounded" />
      <div className="h-6 w-24 bg-gray-200 rounded" />
    </div>
  </div>
);

export const CartSummarySkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
    {/* Header */}
    <div className="h-7 bg-gray-200 rounded w-2/3 mb-4" />

    {/* Item count */}
    <div className="mb-4 pb-4 border-b border-gray-200">
      <div className="flex justify-between">
        <div className="h-4 w-20 bg-gray-200 rounded" />
        <div className="h-4 w-12 bg-gray-200 rounded" />
      </div>
    </div>

    {/* Pricing lines */}
    <div className="space-y-3 mb-4">
      <div className="flex justify-between">
        <div className="h-4 w-24 bg-gray-200 rounded" />
        <div className="h-4 w-20 bg-gray-200 rounded" />
      </div>
      <div className="flex justify-between">
        <div className="h-4 w-16 bg-gray-200 rounded" />
        <div className="h-4 w-20 bg-gray-200 rounded" />
      </div>
    </div>

    {/* Total */}
    <div className="border-t border-gray-200 pt-4 mb-6">
      <div className="flex justify-between">
        <div className="h-6 w-28 bg-gray-200 rounded" />
        <div className="h-8 w-32 bg-gray-200 rounded" />
      </div>
    </div>

    {/* Buttons */}
    <div className="space-y-2">
      <div className="h-12 w-full bg-gray-200 rounded-lg" />
      <div className="h-12 w-full bg-gray-200 rounded-lg" />
    </div>
  </div>
);

export const CartSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gray-50 py-8">
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Skeleton */}
      <div className="mb-8 flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-9 w-48 bg-gray-200 rounded animate-pulse" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items Skeleton */}
        <div className="lg:col-span-2 space-y-4">
          <CartItemSkeleton />
          <CartItemSkeleton />
          <CartItemSkeleton />
        </div>

        {/* Summary Skeleton */}
        <div className="lg:col-span-1">
          <CartSummarySkeleton />
        </div>
      </div>
    </div>
  </div>
);

export default CartSkeleton;
