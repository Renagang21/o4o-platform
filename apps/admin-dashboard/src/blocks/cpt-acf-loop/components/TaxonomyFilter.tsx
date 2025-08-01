/**
 * Taxonomy Filter Component
 * 
 * Allows filtering posts by categories, tags, and custom taxonomies
 */

import { useState, useEffect } from '@wordpress/element';
import {
  PanelBody,
  CheckboxControl,
  SelectControl,
  Button,
  Notice,
  Spinner,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import { filter } from '@wordpress/icons';

interface Taxonomy {
  slug: string;
  name: string;
  rest_base: string;
  hierarchical: boolean;
}

interface Term {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
  children?: Term[];
}

interface TaxonomyFilterProps {
  postType: string;
  selectedTaxonomies: Record<string, {
    taxonomy: string;
    terms: number[];
    operator: 'IN' | 'NOT IN' | 'AND';
  }>;
  onTaxonomiesChange: (taxonomies: TaxonomyFilterProps['selectedTaxonomies']) => void;
}

export default function TaxonomyFilter({
  postType,
  selectedTaxonomies,
  onTaxonomiesChange,
}: TaxonomyFilterProps) {
  const [availableTaxonomies, setAvailableTaxonomies] = useState<Taxonomy[]>([]);
  const [taxonomyTerms, setTaxonomyTerms] = useState<Record<string, Term[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [expandedTaxonomies, setExpandedTaxonomies] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<Record<string, string>>({});

  // Fetch taxonomies for the post type
  useEffect(() => {
    if (!postType) return;

    setIsLoading(true);
    
    apiFetch<Taxonomy[]>({
      path: '/wp/v2/taxonomies',
    })
      .then((taxonomies) => {
        // Filter taxonomies that support this post type
        const relevantTaxonomies = Object.values(taxonomies).filter((tax: any) => 
          tax.types && tax.types.includes(postType) && tax.visibility?.show_ui
        );
        
        setAvailableTaxonomies(relevantTaxonomies);
        setIsLoading(false);
        
        // Fetch terms for each taxonomy
        relevantTaxonomies.forEach((tax) => {
          fetchTermsForTaxonomy(tax.slug, tax.rest_base);
        });
      })
      .catch((err) => {
        console.error('Error fetching taxonomies:', err);
        setIsLoading(false);
      });
  }, [postType]);

  // Fetch terms for a specific taxonomy
  const fetchTermsForTaxonomy = async (taxonomySlug: string, restBase: string) => {
    try {
      const terms = await apiFetch<Term[]>({
        path: `/wp/v2/${restBase}?per_page=100&hide_empty=false`,
      });
      
      // Build hierarchical structure if needed
      const taxonomy = availableTaxonomies.find(t => t.slug === taxonomySlug);
      if (taxonomy?.hierarchical) {
        setTaxonomyTerms(prev => ({
          ...prev,
          [taxonomySlug]: buildHierarchicalTerms(terms),
        }));
      } else {
        setTaxonomyTerms(prev => ({
          ...prev,
          [taxonomySlug]: terms,
        }));
      }
    } catch (err) {
      console.error(`Error fetching terms for ${taxonomySlug}:`, err);
    }
  };

  // Build hierarchical term structure
  const buildHierarchicalTerms = (terms: Term[]): Term[] => {
    const termMap: Record<number, Term> = {};
    const rootTerms: Term[] = [];

    // Create a map of all terms
    terms.forEach(term => {
      termMap[term.id] = { ...term, children: [] };
    });

    // Build the hierarchy
    terms.forEach(term => {
      if (term.parent === 0) {
        rootTerms.push(termMap[term.id]);
      } else if (termMap[term.parent]) {
        const parentTerm = termMap[term.parent];
        if (parentTerm) {
          parentTerm.children = parentTerm.children || [];
          parentTerm.children.push(termMap[term.id]);
        }
      }
    });

    return rootTerms;
  };

  // Handle term selection
  const handleTermToggle = (taxonomySlug: string, termId: number, checked: boolean) => {
    const currentTaxonomy = selectedTaxonomies[taxonomySlug] || {
      taxonomy: taxonomySlug,
      terms: [],
      operator: 'IN' as const,
    };

    let newTerms: number[];
    if (checked) {
      newTerms = [...currentTaxonomy.terms, termId];
    } else {
      newTerms = currentTaxonomy.terms.filter(id => id !== termId);
    }

    if (newTerms.length === 0) {
      // Remove taxonomy filter if no terms selected
      const { [taxonomySlug]: removed, ...rest } = selectedTaxonomies;
      onTaxonomiesChange(rest);
    } else {
      onTaxonomiesChange({
        ...selectedTaxonomies,
        [taxonomySlug]: {
          ...currentTaxonomy,
          terms: newTerms,
        },
      });
    }
  };

  // Handle operator change
  const handleOperatorChange = (taxonomySlug: string, operator: 'IN' | 'NOT IN' | 'AND') => {
    if (!selectedTaxonomies[taxonomySlug]) return;

    onTaxonomiesChange({
      ...selectedTaxonomies,
      [taxonomySlug]: {
        ...selectedTaxonomies[taxonomySlug],
        operator,
      },
    });
  };

  // Toggle taxonomy expansion
  const toggleTaxonomyExpansion = (taxonomySlug: string) => {
    setExpandedTaxonomies(prev =>
      prev.includes(taxonomySlug)
        ? prev.filter(slug => slug !== taxonomySlug)
        : [...prev, taxonomySlug]
    );
  };

  // Filter terms by search query
  const filterTermsBySearch = (terms: Term[], query: string): Term[] => {
    if (!query) return terms;
    
    const lowerQuery = query.toLowerCase();
    return terms.filter(term => {
      const matchesTerm = term.name.toLowerCase().includes(lowerQuery);
      const hasMatchingChildren = term.children?.some(child => 
        child.name.toLowerCase().includes(lowerQuery)
      );
      return matchesTerm || hasMatchingChildren;
    });
  };

  // Render hierarchical terms
  const renderHierarchicalTerms = (
    terms: Term[], 
    taxonomySlug: string, 
    level: number = 0
  ): JSX.Element[] => {
    const searchFiltered = filterTermsBySearch(
      terms, 
      searchQuery[taxonomySlug] || ''
    );

    return searchFiltered.map(term => {
      const isChecked = selectedTaxonomies[taxonomySlug]?.terms.includes(term.id);
      
      return (
        <div key={term.id} style={{ marginLeft: `${level * 20}px` }}>
          <CheckboxControl
            label={
              <span>
                {term.name}
                <span style={{ marginLeft: '8px', opacity: 0.6, fontSize: '12px' }}>
                  ({term.count})
                </span>
              </span>
            }
            checked={isChecked}
            onChange={(checked) => handleTermToggle(taxonomySlug, term.id, checked)}
          />
          {term.children && term.children.length > 0 && (
            renderHierarchicalTerms(term.children, taxonomySlug, level + 1)
          )}
        </div>
      );
    });
  };

  // Render flat terms
  const renderFlatTerms = (terms: Term[], taxonomySlug: string): JSX.Element[] => {
    const searchFiltered = filterTermsBySearch(
      terms,
      searchQuery[taxonomySlug] || ''
    );

    return searchFiltered.map(term => {
      const isChecked = selectedTaxonomies[taxonomySlug]?.terms.includes(term.id);
      
      return (
        <CheckboxControl
          key={term.id}
          label={
            <span>
              {term.name}
              <span style={{ marginLeft: '8px', opacity: 0.6, fontSize: '12px' }}>
                ({term.count})
              </span>
            </span>
          }
          checked={isChecked}
          onChange={(checked) => handleTermToggle(taxonomySlug, term.id, checked)}
        />
      );
    });
  };

  if (isLoading) {
    return (
      <PanelBody title={__('Taxonomy Filters', 'o4o')} initialOpen={false}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spinner />
          <p>{__('Loading taxonomies...', 'o4o')}</p>
        </div>
      </PanelBody>
    );
  }

  if (availableTaxonomies.length === 0) {
    return (
      <PanelBody title={__('Taxonomy Filters', 'o4o')} initialOpen={false}>
        <Notice status="info" isDismissible={false}>
          {__('No taxonomies available for this post type.', 'o4o')}
        </Notice>
      </PanelBody>
    );
  }

  return (
    <PanelBody 
      title={__('Taxonomy Filters', 'o4o')} 
      initialOpen={false}
      icon={filter}
    >
      {availableTaxonomies.map(taxonomy => {
        const terms = taxonomyTerms[taxonomy.slug] || [];
        const hasSelectedTerms = selectedTaxonomies[taxonomy.slug]?.terms.length > 0;
        const isExpanded = expandedTaxonomies.includes(taxonomy.slug);

        return (
          <div 
            key={taxonomy.slug}
            style={{ 
              marginBottom: '20px',
              padding: '12px',
              background: hasSelectedTerms ? '#f0f8ff' : '#f9f9f9',
              border: `1px solid ${hasSelectedTerms ? '#0073aa' : '#ddd'}`,
              borderRadius: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                {taxonomy.name}
                {hasSelectedTerms && (
                  <span style={{ 
                    marginLeft: '8px', 
                    background: '#0073aa',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                  }}>
                    {selectedTaxonomies[taxonomy.slug].terms.length}
                  </span>
                )}
              </h4>
              <Button
                icon={isExpanded ? 'arrow-up' : 'arrow-down'}
                onClick={() => toggleTaxonomyExpansion(taxonomy.slug)}
                variant="tertiary"
                size={"small" as any}
              />
            </div>

            {isExpanded && (
              <div style={{ marginTop: '12px' }}>
                {/* Search box */}
                {terms.length > 5 && (
                  <div style={{ marginBottom: '12px' }}>
                    <input
                      type="search"
                      placeholder={__('Search terms...', 'o4o')}
                      value={searchQuery[taxonomy.slug] || ''}
                      onChange={(e) => setSearchQuery(prev => ({
                        ...prev,
                        [taxonomy.slug]: e.target.value,
                      }))}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                )}

                {/* Operator selection */}
                {hasSelectedTerms && (
                  <SelectControl
                    label={__('Filter Logic', 'o4o')}
                    value={selectedTaxonomies[taxonomy.slug].operator}
                    options={[
                      { label: __('Include any of these', 'o4o'), value: 'IN' },
                      { label: __('Exclude these', 'o4o'), value: 'NOT IN' },
                      { label: __('Include all of these', 'o4o'), value: 'AND' },
                    ]}
                    onChange={(value) => handleOperatorChange(
                      taxonomy.slug, 
                      value as 'IN' | 'NOT IN' | 'AND'
                    )}
                    style={{ marginBottom: '12px' }}
                  />
                )}

                {/* Terms list */}
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {terms.length === 0 ? (
                    <p style={{ color: '#666', fontStyle: 'italic' }}>
                      {__('No terms found', 'o4o')}
                    </p>
                  ) : taxonomy.hierarchical ? (
                    renderHierarchicalTerms(terms, taxonomy.slug)
                  ) : (
                    renderFlatTerms(terms, taxonomy.slug)
                  )}
                </div>

                {/* Clear button */}
                {hasSelectedTerms && (
                  <Button
                    variant="tertiary"
                    isDestructive
                    onClick={() => {
                      const { [taxonomy.slug]: removed, ...rest } = selectedTaxonomies;
                      onTaxonomiesChange(rest);
                    }}
                    style={{ marginTop: '8px' }}
                  >
                    {__('Clear selection', 'o4o')}
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </PanelBody>
  );
}