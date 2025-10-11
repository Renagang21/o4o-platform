/**
 * Category Selector Component
 * Hierarchical category selector with tree view
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, Loader2, Folder, FolderOpen } from 'lucide-react';
import { acfLocationApi } from '../../services/acf.api';

interface CategoryOption {
  value: string;
  label: string;
  parent?: string;
  count?: number;
}

interface CategorySelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  multiple?: boolean; // Future: support multiple selection
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  value,
  onChange,
  className = '',
  multiple = false,
}) => {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const result = await acfLocationApi.getCategories();
        if (result.success && result.data) {
          setCategories(result.data);

          // Auto-expand path to selected category
          if (value) {
            const expandPath = (catId: string, cats: CategoryOption[]) => {
              const cat = cats.find(c => c.value === catId);
              if (cat?.parent) {
                setExpandedCategories(prev => new Set([...prev, cat.parent!]));
                expandPath(cat.parent, cats);
              }
            };
            expandPath(value, result.data);
          }
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [value]);

  // Build hierarchical tree structure
  const categoryTree = useMemo(() => {
    // Filter by search query if present
    let filteredCategories = categories;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredCategories = categories.filter(cat =>
        cat.label.toLowerCase().includes(query)
      );
    }

    const tree: (CategoryOption & { children: CategoryOption[] })[] = [];
    const categoryMap = new Map<string, CategoryOption & { children: CategoryOption[] }>();

    // Create map of all categories
    filteredCategories.forEach(cat => {
      categoryMap.set(cat.value, { ...cat, children: [] });
    });

    // Build tree
    filteredCategories.forEach(cat => {
      const node = categoryMap.get(cat.value);
      if (!node) return;

      if (cat.parent && categoryMap.has(cat.parent)) {
        // Add to parent's children
        categoryMap.get(cat.parent)?.children.push(node);
      } else {
        // Root level category
        tree.push(node);
      }
    });

    // Sort by label
    const sortTree = (nodes: typeof tree) => {
      nodes.sort((a, b) => a.label.localeCompare(b.label));
      nodes.forEach(node => {
        if (node.children.length > 0) {
          sortTree(node.children);
        }
      });
    };
    sortTree(tree);

    return tree;
  }, [categories, searchQuery]);

  const toggleCategoryExpand = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleCategorySelect = (categoryId: string) => {
    onChange(categoryId);
  };

  // Render category tree recursively
  const renderCategoryTree = (
    nodes: (CategoryOption & { children?: CategoryOption[] })[],
    level: number = 0
  ) => {
    return nodes.map(node => {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expandedCategories.has(node.value);
      const isSelected = value === node.value;

      return (
        <div key={node.value} className="select-none">
          <div
            className={`
              flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 rounded transition-colors
              ${isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}
            `}
            style={{ paddingLeft: `${level * 20 + 12}px` }}
            onClick={() => handleCategorySelect(node.value)}
          >
            {/* Expand/Collapse button */}
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCategoryExpand(node.value);
                }}
                className="p-0.5 hover:bg-gray-200 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <span className="w-[18px]" />
            )}

            {/* Folder icon */}
            {hasChildren ? (
              isExpanded ? (
                <FolderOpen className="w-4 h-4 text-blue-500" />
              ) : (
                <Folder className="w-4 h-4 text-gray-400" />
              )
            ) : (
              <div className="w-4" />
            )}

            {/* Category name */}
            <span className="flex-1 text-sm">{node.label}</span>

            {/* Post count */}
            {node.count !== undefined && node.count > 0 && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {node.count}
              </span>
            )}
          </div>

          {/* Children */}
          {hasChildren && isExpanded && (
            <div className="mt-0.5">
              {renderCategoryTree(node.children!, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <Loader2 className="w-5 h-5 mr-2 animate-spin text-gray-400" />
        <span className="text-sm text-gray-600">Loading categories...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Search */}
      <div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search categories..."
          className="
            w-full px-3 py-2 border border-gray-300 rounded-md text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          "
        />
      </div>

      {/* Category Tree */}
      {categories.length === 0 ? (
        <div className="px-3 py-8 text-sm text-gray-500 text-center border border-gray-200 rounded">
          No categories found
        </div>
      ) : categoryTree.length === 0 ? (
        <div className="px-3 py-8 text-sm text-gray-500 text-center border border-gray-200 rounded">
          No categories match your search
        </div>
      ) : (
        <div className="border border-gray-200 rounded max-h-96 overflow-y-auto bg-white">
          <div className="py-1">
            {renderCategoryTree(categoryTree)}
          </div>
        </div>
      )}

      {/* Selected category info */}
      {value && (
        <div className="text-xs text-gray-600 px-3 py-2 bg-blue-50 border border-blue-200 rounded">
          <span className="font-medium">Selected:</span>{' '}
          {categories.find(c => c.value === value)?.label || value}
        </div>
      )}
    </div>
  );
};

export default CategorySelector;
