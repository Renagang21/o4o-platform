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

  return (
    <div className="inspector-section">
      <h4 className="inspector-section-title">Cart Settings</h4>

      {/* Show Count Badge */}
      <div className="inspector-field">
        <label className="inspector-label">
          <input
            type="checkbox"
            checked={showCount}
            onChange={(e) => onChange('showCount', e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          Show Item Count Badge
        </label>
        <p className="inspector-help">Display number of items in cart</p>
      </div>

      {/* Show Total */}
      <div className="inspector-field">
        <label className="inspector-label">
          <input
            type="checkbox"
            checked={showTotal}
            onChange={(e) => onChange('showTotal', e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          Show Total Amount
        </label>
        <p className="inspector-help">Display total cart value</p>
      </div>

      {/* Click Action */}
      <div className="inspector-field">
        <label className="inspector-label">Click Action</label>
        <select
          className="inspector-select"
          value={action}
          onChange={(e) => onChange('action', e.target.value)}
        >
          <option value="mini-cart">Show Mini Cart</option>
          <option value="page">Go to Cart Page</option>
        </select>
        <p className="inspector-help">Action when cart icon is clicked</p>
      </div>
    </div>
  );
};
