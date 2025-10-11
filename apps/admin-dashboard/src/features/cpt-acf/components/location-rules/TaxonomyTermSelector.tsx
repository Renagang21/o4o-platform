/**
 * Taxonomy Term Selector Component
 * Two-step selector for taxonomy and its terms
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { acfLocationApi } from '../../services/acf.api';

interface TaxonomyTermOption {
  value: string;
  label: string;
  parent?: string;
  count?: number;
}

interface TaxonomyTermSelectorProps {
  value: string; // Format: "taxonomy:term_id" or just "term_id"
  onChange: (value: string) => void;
  className?: string;
}

export const TaxonomyTermSelector: React.FC<TaxonomyTermSelectorProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const [taxonomies, setTaxonomies] = useState<Array<{ value: string; label: string }>>([]);
  const [terms, setTerms] = useState<TaxonomyTermOption[]>([]);
  const [selectedTaxonomy, setSelectedTaxonomy] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [loadingTaxonomies, setLoadingTaxonomies] = useState(false);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set());

  // Parse value on mount (format: "taxonomy:term_id")
  useEffect(() => {
    if (value) {
      const parts = value.split(':');
      if (parts.length === 2) {
        setSelectedTaxonomy(parts[0]);
        setSelectedTerm(parts[1]);
      } else {
        setSelectedTerm(value);
      }
    }
  }, [value]);

  // Fetch taxonomies on mount
  useEffect(() => {
    const fetchTaxonomies = async () => {
      setLoadingTaxonomies(true);
      try {
        const result = await acfLocationApi.getTaxonomies();
        if (result.success && result.data) {
          setTaxonomies(result.data);
          // Auto-select category if no taxonomy selected
          if (!selectedTaxonomy && result.data.length > 0) {
            const categoryTax = result.data.find(t => t.value === 'category');
            if (categoryTax) {
              setSelectedTaxonomy(categoryTax.value);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching taxonomies:', error);
      } finally {
        setLoadingTaxonomies(false);
      }
    };

    fetchTaxonomies();
  }, []);

  // Fetch terms when taxonomy changes
  useEffect(() => {
    if (!selectedTaxonomy) return;

    const fetchTerms = async () => {
      setLoadingTerms(true);
      try {
        const result = await acfLocationApi.getTaxonomyTerms(selectedTaxonomy);
        if (result.success && result.data) {
          setTerms(result.data);
        }
      } catch (error) {
        console.error('Error fetching terms:', error);
        setTerms([]);
      } finally {
        setLoadingTerms(false);
      }
    };

    fetchTerms();
  }, [selectedTaxonomy]);

  // Build hierarchical tree structure
  const termTree = useMemo(() => {
    const tree: TaxonomyTermOption[] = [];
    const termMap = new Map<string, TaxonomyTermOption & { children: TaxonomyTermOption[] }>();

    // Create map of all terms
    terms.forEach(term => {
      termMap.set(term.value, { ...term, children: [] });
    });

    // Build tree
    terms.forEach(term => {
      const node = termMap.get(term.value);
      if (!node) return;

      if (term.parent && termMap.has(term.parent)) {
        // Add to parent's children
        termMap.get(term.parent)?.children.push(node);
      } else {
        // Root level term
        tree.push(node);
      }
    });

    return tree;
  }, [terms]);

  const handleTaxonomyChange = (taxonomy: string) => {
    setSelectedTaxonomy(taxonomy);
    setSelectedTerm('');
    setTerms([]);
    onChange(''); // Clear value when taxonomy changes
  };

  const handleTermChange = (termId: string) => {
    setSelectedTerm(termId);
    // Format: "taxonomy:term_id"
    onChange(`${selectedTaxonomy}:${termId}`);
  };

  const toggleTermExpand = (termId: string) => {
    setExpandedTerms(prev => {
      const next = new Set(prev);
      if (next.has(termId)) {
        next.delete(termId);
      } else {
        next.add(termId);
      }
      return next;
    });
  };

  // Render term tree recursively
  const renderTermTree = (
    nodes: (TaxonomyTermOption & { children?: TaxonomyTermOption[] })[],
    level: number = 0
  ) => {
    return nodes.map(node => {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expandedTerms.has(node.value);
      const isSelected = selectedTerm === node.value;

      return (
        <div key={node.value}>
          <div
            className={`
              flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 rounded
              ${isSelected ? 'bg-blue-50 text-blue-700 font-medium' : ''}
            `}
            style={{ paddingLeft: `${level * 24 + 12}px` }}
            onClick={() => handleTermChange(node.value)}
          >
            {hasChildren && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTermExpand(node.value);
                }}
                className="p-0.5 hover:bg-gray-200 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
            )}
            {!hasChildren && <span className="w-4" />}
            <span className="flex-1">{node.label}</span>
            {node.count !== undefined && (
              <span className="text-xs text-gray-500">({node.count})</span>
            )}
          </div>
          {hasChildren && isExpanded && renderTermTree(node.children!, level + 1)}
        </div>
      );
    });
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Taxonomy Selector */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Taxonomy
        </label>
        <select
          value={selectedTaxonomy}
          onChange={(e) => handleTaxonomyChange(e.target.value)}
          disabled={loadingTaxonomies}
          className="
            w-full px-3 py-2 border border-gray-300 rounded-md text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
          "
        >
          <option value="">Select taxonomy...</option>
          {taxonomies.map(tax => (
            <option key={tax.value} value={tax.value}>
              {tax.label}
            </option>
          ))}
        </select>
      </div>

      {/* Term Selector */}
      {selectedTaxonomy && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Term
          </label>
          {loadingTerms ? (
            <div className="flex items-center justify-center py-4 text-gray-500">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              <span className="text-sm">Loading terms...</span>
            </div>
          ) : terms.length === 0 ? (
            <div className="px-3 py-4 text-sm text-gray-500 text-center border border-gray-200 rounded">
              No terms found in this taxonomy
            </div>
          ) : (
            <div className="border border-gray-200 rounded max-h-64 overflow-y-auto">
              {renderTermTree(termTree)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaxonomyTermSelector;
