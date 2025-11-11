import React from 'react';

interface CartSettingsProps {
  settings: any;
  onChange: (key: string, value: any) => void;
}

export const CartSettings: React.FC<CartSettingsProps> = ({
  settings,
  onChange
}) => {
  const showCount = settings.showCount !== false; // Default true
  const showTotal = settings.showTotal || false;
  const action = settings.action || 'mini-cart';
  const cartUrl = settings.cartUrl || '/cart';

  return (
    <div className="border-b border-gray-200 pb-6 mb-6">
      <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">Cart Settings</h4>

      {/* Show Count Badge */}
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showCount}
            onChange={(e) => onChange('showCount', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium text-gray-700">Show Item Count Badge</span>
        </label>
        <p className="text-xs text-gray-500 mt-1">Display number of items in cart</p>
      </div>

      {/* Show Total */}
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showTotal}
            onChange={(e) => onChange('showTotal', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium text-gray-700">Show Total Amount</span>
        </label>
        <p className="text-xs text-gray-500 mt-1">Display total cart value</p>
      </div>

      {/* Click Action */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Click Action</label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={action}
          onChange={(e) => onChange('action', e.target.value)}
        >
          <option value="mini-cart">Show Mini Cart</option>
          <option value="page">Go to Cart Page</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">Action when cart icon is clicked</p>
      </div>

      {/* Cart URL (shown when action is 'page') */}
      {action === 'page' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Cart Page URL</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={cartUrl}
            onChange={(e) => onChange('cartUrl', e.target.value)}
            placeholder="/cart"
          />
          <p className="text-xs text-gray-500 mt-1">URL to the cart page</p>
        </div>
      )}
    </div>
  );
};
