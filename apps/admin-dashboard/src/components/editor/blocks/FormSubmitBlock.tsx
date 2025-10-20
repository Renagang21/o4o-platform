/**
 * Form Submit Block Component
 *
 * Submit button for forms
 * Integrates with React Hook Form
 */

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { BlockProps } from '@/blocks/registry/types';
import { Loader2 } from 'lucide-react';
import { FormSubmitAttributes, getAttributes } from '@/blocks/definitions/form-types';

const FormSubmitBlock: React.FC<BlockProps> = ({
  attributes,
  setAttributes,
  isSelected,
}) => {
  const { formState: { isSubmitting } } = useFormContext();

  const submitAttributes = getAttributes<FormSubmitAttributes>(attributes);

  const {
    buttonText = 'Submit',
    loadingText = 'Submitting...',
    align = 'left',
    fullWidth = false,
    buttonStyle = 'primary',
  } = submitAttributes;

  /**
   * Get button style classes
   */
  const getButtonClasses = () => {
    let classes = 'px-6 py-2.5 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ';

    // Width
    if (fullWidth) {
      classes += 'w-full ';
    }

    // Style variants
    switch (buttonStyle) {
      case 'primary':
        classes += 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300';
        break;
      case 'secondary':
        classes += 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 disabled:bg-gray-300';
        break;
      case 'outline':
        classes += 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500 disabled:border-blue-300 disabled:text-blue-300';
        break;
      default:
        classes += 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500';
    }

    return classes;
  };

  /**
   * Get container alignment classes
   */
  const getAlignmentClasses = () => {
    switch (align) {
      case 'center':
        return 'flex justify-center';
      case 'right':
        return 'flex justify-end';
      default:
        return '';
    }
  };

  return (
    <div className="o4o-form-submit-block">
      {/* Editor Settings Panel */}
      {isSelected && (
        <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded text-sm">
          <h4 className="font-semibold mb-2">Submit Button Settings</h4>
          <div className="grid grid-cols-2 gap-2">
            <label className="col-span-2">
              <span className="text-xs text-gray-600">Button Text:</span>
              <input
                type="text"
                value={buttonText}
                onChange={(e) => setAttributes?.({ buttonText: e.target.value })}
                className="w-full mt-1 px-2 py-1 border rounded text-sm"
              />
            </label>

            <label className="col-span-2">
              <span className="text-xs text-gray-600">Loading Text:</span>
              <input
                type="text"
                value={loadingText}
                onChange={(e) => setAttributes?.({ loadingText: e.target.value })}
                className="w-full mt-1 px-2 py-1 border rounded text-sm"
              />
            </label>

            <label>
              <span className="text-xs text-gray-600">Button Style:</span>
              <select
                value={buttonStyle}
                onChange={(e) => setAttributes?.({ buttonStyle: e.target.value })}
                className="w-full mt-1 px-2 py-1 border rounded text-sm"
              >
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="outline">Outline</option>
              </select>
            </label>

            <label>
              <span className="text-xs text-gray-600">Alignment:</span>
              <select
                value={align}
                onChange={(e) => setAttributes?.({ align: e.target.value })}
                className="w-full mt-1 px-2 py-1 border rounded text-sm"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </label>

            <label className="flex items-center gap-2 col-span-2">
              <input
                type="checkbox"
                checked={fullWidth}
                onChange={(e) => setAttributes?.({ fullWidth: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-xs text-gray-600">Full Width</span>
            </label>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className={getAlignmentClasses()}>
        <button
          type="submit"
          disabled={isSubmitting}
          className={getButtonClasses()}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              {loadingText}
            </span>
          ) : (
            buttonText
          )}
        </button>
      </div>
    </div>
  );
};

export default FormSubmitBlock;
