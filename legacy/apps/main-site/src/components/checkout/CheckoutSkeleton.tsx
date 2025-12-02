/**
 * Checkout Page Loading Skeleton
 * R-6-8: Displays loading state while checkout page initializes
 */

import React from 'react';

const FormSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
    {/* Title */}
    <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />

    {/* Input Fields */}
    {[1, 2, 3].map((i) => (
      <div key={i} className="space-y-2">
        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse" />
      </div>
    ))}
  </div>
);

const OptionsSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    {/* Title */}
    <div className="h-6 w-24 bg-gray-200 rounded animate-pulse mb-4" />

    {/* Options */}
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-16 w-full bg-gray-100 rounded-lg animate-pulse"
        />
      ))}
    </div>
  </div>
);

const SummarySkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    {/* Title */}
    <div className="h-6 w-28 bg-gray-200 rounded animate-pulse mb-4" />

    {/* Items */}
    <div className="space-y-3 mb-4">
      {[1, 2].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="w-16 h-16 bg-gray-200 rounded animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>

    {/* Price Lines */}
    <div className="border-t border-gray-200 pt-4 space-y-2 mb-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex justify-between">
          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
      ))}
    </div>

    {/* Button */}
    <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse" />
  </div>
);

export const CheckoutSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Skeleton */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {[1, 2, 3].map((i) => (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center flex-1">
                  <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
                  <div className="mt-2 h-4 w-16 bg-gray-200 rounded animate-pulse" />
                </div>
                {i < 3 && (
                  <div className="flex-1 h-1 mx-2 bg-gray-200 animate-pulse" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Back Button Skeleton */}
        <div className="h-6 w-20 bg-gray-200 rounded animate-pulse mb-6" />

        {/* Title Skeleton */}
        <div className="h-9 w-32 bg-gray-200 rounded animate-pulse mb-8" />

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <FormSkeleton />
            <FormSkeleton />
            <OptionsSkeleton />
            <OptionsSkeleton />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1">
            <SummarySkeleton />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSkeleton;
