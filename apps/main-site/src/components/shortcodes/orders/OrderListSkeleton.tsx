/**
 * Order List Skeleton
 * R-6-9: Loading state for order list page
 */

import React from 'react';

const OrderCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
    <div className="flex items-start justify-between mb-4">
      <div className="space-y-2 flex-1">
        {/* Order Number */}
        <div className="h-5 w-32 bg-gray-200 rounded" />
        {/* Date */}
        <div className="h-4 w-24 bg-gray-100 rounded" />
      </div>
      {/* Status Badge */}
      <div className="h-6 w-20 bg-gray-200 rounded-full" />
    </div>

    {/* Items */}
    <div className="border-t border-gray-100 pt-4 space-y-3">
      <div className="flex gap-3">
        <div className="w-16 h-16 bg-gray-200 rounded" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 bg-gray-200 rounded" />
          <div className="h-3 w-1/2 bg-gray-100 rounded" />
        </div>
      </div>
    </div>

    {/* Footer */}
    <div className="border-t border-gray-100 mt-4 pt-4 flex items-center justify-between">
      <div className="space-y-2">
        <div className="h-4 w-16 bg-gray-100 rounded" />
        <div className="h-5 w-24 bg-gray-200 rounded" />
      </div>
      <div className="h-10 w-24 bg-gray-200 rounded" />
    </div>
  </div>
);

export const OrderListSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Filters Skeleton */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap gap-4">
          {/* Status Tabs */}
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-9 w-20 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>

        {/* Date Range & Sort */}
        <div className="mt-4 flex gap-4">
          <div className="h-10 w-40 bg-gray-100 rounded animate-pulse" />
          <div className="h-10 w-32 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>

      {/* Order Cards */}
      {[1, 2, 3, 4, 5].map((i) => (
        <OrderCardSkeleton key={i} />
      ))}

      {/* Pagination Skeleton */}
      <div className="flex items-center justify-center gap-2">
        <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-10 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-10 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-10 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
};

export default OrderListSkeleton;
