/**
 * AdditionalCssSection - Custom CSS editor
 */

import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Copy } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AdditionalCssSectionProps {
  css: string;
  onChange: (css: string) => void;
}

export const AdditionalCssSection: React.FC<AdditionalCssSectionProps> = ({
  css,
  onChange
}) => {
  const [localCss, setLocalCss] = useState(css);
  const [error, setError] = useState<string | null>(null);
  const [lineNumbers, setLineNumbers] = useState<number[]>([]);

  // Update line numbers
  useEffect(() => {
    const lines = localCss.split('\n').length;
    setLineNumbers(Array.from({ length: lines }, (_, i) => i + 1));
  }, [localCss]);

  // Basic CSS validation
  const validateCss = (cssText: string): boolean => {
    try {
      // Check for basic syntax errors
      const openBraces = (cssText.match(/{/g) || []).length;
      const closeBraces = (cssText.match(/}/g) || []).length;
      
      if (openBraces !== closeBraces) {
        setError(`Unmatched braces: ${openBraces} opening, ${closeBraces} closing`);
        return false;
      }

      // Check for unclosed strings
      const quotes = cssText.match(/["']/g) || [];
      if (quotes.length % 2 !== 0) {
        setError('Unclosed string found');
        return false;
      }

      setError(null);
      return true;
    } catch (err) {
      setError('Invalid CSS syntax');
      return false;
    }
  };

  const handleChange = (value: string) => {
    setLocalCss(value);
    
    // Validate and update parent
    if (validateCss(value)) {
      onChange(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle tab key
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const value = e.currentTarget.value;
      
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      setLocalCss(newValue);
      
      // Reset cursor position
      setTimeout(() => {
        e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 2;
      }, 0);
    }
  };

  const copyCss = () => {
    navigator.clipboard.writeText(localCss);
    toast.success('CSS copied to clipboard');
  };

  const clearCss = () => {
    setLocalCss('');
    onChange('');
    toast.success('CSS cleared');
  };

  // CSS snippets for quick insertion
  const cssSnippets = [
    {
      name: 'Hide Element',
      code: '.element-class {\n  display: none;\n}'
    },
    {
      name: 'Custom Font',
      code: 'body {\n  font-family: "Your Font", sans-serif;\n}'
    },
    {
      name: 'Button Style',
      code: '.button {\n  background-color: #0073aa;\n  color: white;\n  padding: 10px 20px;\n  border-radius: 4px;\n}'
    },
    {
      name: 'Responsive',
      code: '@media (max-width: 768px) {\n  /* Mobile styles */\n}'
    }
  ];

  const insertSnippet = (code: string) => {
    const newCss = localCss + (localCss ? '\n\n' : '') + code;
    setLocalCss(newCss);
    onChange(newCss);
  };

  return (
    <div className="wp-section-content">
      <div className="form-group">
        <Label>Additional CSS</Label>
        <p className="text-xs text-gray-500 mb-3">
          Add your own CSS code to customize the appearance of your theme.
        </p>

        {/* CSS Editor */}
        <div className="css-editor">
          <div className="editor-header">
            <div className="editor-status">
              {error ? (
                <div className="status-error">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              ) : localCss && (
                <div className="status-success">
                  <CheckCircle className="w-4 h-4" />
                  <span>Valid CSS</span>
                </div>
              )}
            </div>
            
            <div className="editor-actions">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={copyCss}
                disabled={!localCss}
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearCss}
                disabled={!localCss}
              >
                Clear
              </Button>
            </div>
          </div>

          <div className="editor-body">
            <div className="line-numbers">
              {lineNumbers.map(num => (
                <div key={num} className="line-number">
                  {num}
                </div>
              ))}
            </div>
            
            <textarea
              value={localCss}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="code-textarea"
              placeholder="/* Enter your custom CSS here */\n\n.my-class {\n  property: value;\n}"
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
          </div>
        </div>

        {/* Quick Snippets */}
        <div className="css-snippets">
          <Label className="text-xs">Quick Snippets:</Label>
          <div className="snippet-buttons">
            {cssSnippets.map((snippet) => (
              <Button
                key={snippet.name}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insertSnippet(snippet.code)}
                className="snippet-btn"
              >
                {snippet.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Help Text */}
        <div className="help-text">
          <p className="text-xs text-gray-500">
            <strong>Tips:</strong>
          </p>
          <ul className="text-xs text-gray-500 ml-4 mt-1 space-y-1">
            <li>• Use Tab key to indent</li>
            <li>• CSS will be validated automatically</li>
            <li>• Changes are applied in real-time to the preview</li>
            <li>• Use browser inspector to find element classes</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdditionalCssSection;