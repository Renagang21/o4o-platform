/**
 * Template Selector Component
 * Enhanced selector for page/post templates with descriptions
 */

import React, { useState, useEffect } from 'react';
import { FileText, Loader2, Layout } from 'lucide-react';
import { acfLocationApi } from '../../services/acf.api';

interface TemplateOption {
  value: string;
  label: string;
  description?: string;
}

interface TemplateSelectorProps {
  type: 'page' | 'post';
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  type,
  value,
  onChange,
  className = '',
}) => {
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      try {
        const result =
          type === 'page'
            ? await acfLocationApi.getPageTemplates()
            : await acfLocationApi.getPostTemplates();

        if (result.success && result.data) {
          setTemplates(result.data);
        }
      } catch (error) {
        console.error(`Error fetching ${type} templates:`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [type]);

  const selectedTemplate = templates.find((t) => t.value === value);

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-4 ${className}`}>
        <Loader2 className="w-4 h-4 mr-2 animate-spin text-gray-400" />
        <span className="text-sm text-gray-600">Loading templates...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Template Select */}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="
          w-full px-3 py-2 border border-gray-300 rounded-md text-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        "
      >
        <option value="">Select template...</option>
        {templates.map((tpl) => (
          <option key={tpl.value} value={tpl.value}>
            {tpl.label}
          </option>
        ))}
      </select>

      {/* Selected Template Info */}
      {selectedTemplate && selectedTemplate.description && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <Layout className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-blue-900">{selectedTemplate.label}</p>
            <p className="text-blue-700 mt-1">{selectedTemplate.description}</p>
          </div>
        </div>
      )}

      {/* Template Grid (Optional: for better UX) */}
      {templates.length > 0 && (
        <div className="border border-gray-200 rounded max-h-80 overflow-y-auto">
          <div className="p-2 space-y-1">
            {templates.map((tpl) => (
              <button
                key={tpl.value}
                type="button"
                onClick={() => onChange(tpl.value)}
                className={`
                  w-full text-left px-3 py-2 rounded transition-colors
                  ${
                    value === tpl.value
                      ? 'bg-blue-50 border border-blue-300'
                      : 'hover:bg-gray-50 border border-transparent'
                  }
                `}
              >
                <div className="flex items-start gap-2">
                  <FileText
                    className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      value === tpl.value ? 'text-blue-600' : 'text-gray-400'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium text-sm ${
                        value === tpl.value ? 'text-blue-900' : 'text-gray-900'
                      }`}
                    >
                      {tpl.label}
                    </p>
                    {tpl.description && (
                      <p className="text-xs text-gray-600 mt-0.5">{tpl.description}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {templates.length === 0 && !loading && (
        <div className="px-3 py-8 text-sm text-gray-500 text-center border border-gray-200 rounded">
          <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>No {type} templates found</p>
          <p className="text-xs mt-1">
            Templates will be loaded from the theme or configuration
          </p>
        </div>
      )}
    </div>
  );
};

export default TemplateSelector;
