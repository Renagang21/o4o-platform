/**
 * CPT Engine Dashboard - Toolset Style Table Layout
 * Following WordPress Toolset Types interface patterns
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus,
  Settings,
  FileText,
  Database,
  Tag,
  Edit3,
  Eye,
  Trash2,
  Search,
  Filter,
  Archive,
  Grid3X3,
  Layers,
  Package,
  Users,
  Code,
  Copy,
  ChevronRight
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cptApi } from '@/features/cpt-acf/services/cpt.api';
import { acfGroupApi } from '@/features/cpt-acf/services/acf.api';
import { useAdminNotices } from '@/hooks/useAdminNotices';

// Import Toolset table styles
import '@/styles/toolset-tables.css';

interface CPTType {
  id: string;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  public: boolean;
  hasArchive: boolean;
  showInMenu: boolean;
  supports?: string[];
  taxonomies?: string[];
  active: boolean;
  menuPosition?: number;
  labels?: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
}

interface ACFFieldGroup {
  id: string;
  key: string;
  title: string;
  fields?: any[];
  location?: any[];
  active: boolean;
}

// Dropshipping CPT definitions (these should exist in the database)
const DROPSHIPPING_CPTS = [
  { slug: 'ds_supplier', name: '공급자' },
  { slug: 'ds_partner', name: '파트너' },
  { slug: 'ds_product', name: '드롭쉬핑 상품' },
  { slug: 'ds_commission_policy', name: '수수료 정책' }
];

const CPTDashboardToolset = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addNotice } = useAdminNotices();
  
  // State management
  const [activeTab, setActiveTab] = useState<'wordpress-admin' | 'frontend'>('wordpress-admin');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'public' | 'private'>('all');
  const [selectedCPTs, setSelectedCPTs] = useState<string[]>([]);
  
  // Fetch all CPT Types (including inactive ones for dropshipping)
  const { data: allCPTTypes = [], isLoading: typesLoading, error: typesError } = useQuery({
    queryKey: ['cpt-types', 'all'],
    queryFn: async () => {
      try {
        // Try to fetch all CPTs including inactive
        const response = await fetch('/api/cpt/types?includeInactive=true', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          // Fallback to regular API call
          const activeResponse = await cptApi.getAllTypes();
          return activeResponse.data || [];
        }
        
        const data = await response.json();
        return data || [];
      } catch (error) {
        console.error('Error fetching CPTs:', error);
        // Fallback to get only active CPTs
        try {
          const response = await cptApi.getAllTypes();
          return response.data || [];
        } catch (fallbackError) {
          console.error('Fallback error:', fallbackError);
          return [];
        }
      }
    },
    retry: 2,
    retryDelay: 1000
  });

  // Fetch ACF Field Groups
  const { data: fieldGroups = [], isLoading: fieldsLoading } = useQuery({
    queryKey: ['acf-field-groups'],
    queryFn: async () => {
      try {
        const response = await acfGroupApi.getAllGroups();
        return response.data || [];
      } catch (error) {
        console.error('Error fetching field groups:', error);
        return [];
      }
    }
  });

  // Delete CPT Type mutation
  const deleteMutation = useMutation({
    mutationFn: async (slug: string) => {
      return await cptApi.deleteType(slug);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cpt-types'] });
      addNotice({ type: 'success', message: 'Post Type deleted successfully' });
    },
    onError: () => {
      addNotice({ type: 'error', message: 'Failed to delete Post Type' });
    }
  });

  // Ensure dropshipping CPTs are included
  const cptTypes = useMemo(() => {
    // Ensure allCPTTypes is an array
    const safeCPTTypes = Array.isArray(allCPTTypes) ? allCPTTypes : [];
    const existingSlugs = new Set(safeCPTTypes.map(cpt => cpt.slug));
    const combinedCPTs = [...safeCPTTypes];
    
    // Add missing dropshipping CPTs
    DROPSHIPPING_CPTS.forEach(dsCPT => {
      if (!existingSlugs.has(dsCPT.slug)) {
        combinedCPTs.push({
          id: dsCPT.slug,
          slug: dsCPT.slug,
          name: dsCPT.name,
          description: `Dropshipping ${dsCPT.name}`,
          public: dsCPT.slug === 'ds_product',
          hasArchive: dsCPT.slug === 'ds_product',
          showInMenu: true,
          active: false, // Mark as inactive if not found
          supports: ['title', 'editor', 'custom-fields', 'revisions'],
          taxonomies: dsCPT.slug === 'ds_product' ? ['ds_product_category', 'ds_product_tag'] : []
        } as CPTType);
      }
    });
    
    return combinedCPTs;
  }, [allCPTTypes]);

  // Filter CPTs based on search and filter
  const filteredCPTs = useMemo(() => {
    let filtered = cptTypes;
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(cpt => 
        cpt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cpt.slug.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(cpt => 
        filterType === 'public' ? cpt.public : !cpt.public
      );
    }
    
    return filtered;
  }, [cptTypes, searchQuery, filterType]);

  // Get field count for a CPT
  const getFieldCount = (cptSlug: string): number => {
    if (!Array.isArray(fieldGroups)) return 0;
    
    return fieldGroups.filter((group: ACFFieldGroup) => {
      if (!group.location || !Array.isArray(group.location)) return false;
      return group.location.some((rule: any) => 
        Array.isArray(rule) && rule.some((condition: any) => 
          condition && condition.param === 'post_type' && condition.value === cptSlug
        )
      );
    }).length;
  };

  // Handle CPT deletion
  const handleDelete = async (slug: string) => {
    if (window.confirm(`Are you sure you want to delete the post type "${slug}"?`)) {
      deleteMutation.mutate(slug);
    }
  };

  // Handle navigation to CPT edit
  const handleEdit = (slug: string) => {
    navigate(`/cpt-engine/types/${slug}/edit`);
  };

  // Handle adding custom fields
  const handleAddFields = (cptSlug: string) => {
    navigate(`/cpt-engine/fields/new?postType=${cptSlug}`);
  };

  // Handle adding taxonomy
  const handleAddTaxonomy = (cptSlug: string) => {
    navigate(`/cpt-engine/taxonomies/new?postType=${cptSlug}`);
  };

  // Handle creating form
  const handleCreateForm = (cptSlug: string) => {
    navigate(`/cpt-engine/forms/new?postType=${cptSlug}`);
  };

  // Handle creating archive
  const handleCreateArchive = (cptSlug: string) => {
    navigate(`/cpt-engine/archives/new?postType=${cptSlug}`);
  };

  // Render CPT type badge
  const renderTypeBadge = (slug: string) => {
    if (slug.startsWith('ds_')) {
      return <span className="cpt-type-badge dropshipping">DS</span>;
    }
    return null;
  };

  return (
    <div className="toolset-tables-container">
      {/* Page Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', color: '#23282d', marginBottom: '10px' }}>
          CPT Engine - Toolset Style
        </h1>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Manage your Custom Post Types, Fields, Taxonomies, and Forms
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="toolset-tabs">
        <button
          className={`toolset-tab ${activeTab === 'wordpress-admin' ? 'active' : ''}`}
          onClick={() => setActiveTab('wordpress-admin')}
        >
          <Database size={16} style={{ marginRight: '6px' }} />
          WordPress Admin
        </button>
        <button
          className={`toolset-tab ${activeTab === 'frontend' ? 'active' : ''}`}
          onClick={() => setActiveTab('frontend')}
        >
          <Eye size={16} style={{ marginRight: '6px' }} />
          Front-end
        </button>
      </div>

      {/* WordPress Admin Section */}
      {activeTab === 'wordpress-admin' && (
        <div className="toolset-table-section">
          <div className="toolset-table-header">
            WordPress Admin - Post Types Management
          </div>

          {/* Filters Bar */}
          <div className="toolset-filters-bar">
            <div className="toolset-search-box">
              <Search />
              <input
                type="text"
                placeholder="Search post types..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="toolset-filter-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'public' | 'private')}
            >
              <option value="all">All Types</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
            <button
              className="toolset-btn-small"
              onClick={() => navigate('/cpt-engine/types/new')}
              style={{ marginLeft: 'auto' }}
            >
              <Plus size={14} />
              Add New Post Type
            </button>
          </div>

          {/* Table */}
          {typesLoading ? (
            <div className="toolset-loading">
              <div className="toolset-spinner"></div>
            </div>
          ) : filteredCPTs.length === 0 ? (
            <div className="toolset-empty-state">
              <Package />
              <h3>No Post Types Found</h3>
              <p>Create your first custom post type to get started.</p>
              <button
                className="toolset-btn-small"
                onClick={() => navigate('/cpt-engine/types/new')}
              >
                <Plus size={14} />
                Create Post Type
              </button>
            </div>
          ) : (
            <table className="toolset-table">
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Post Type</th>
                  <th style={{ width: '20%' }}>Custom Fields</th>
                  <th style={{ width: '20%' }}>Taxonomies</th>
                  <th style={{ width: '15%' }}>Template</th>
                  <th style={{ width: '20%' }}>Forms</th>
                </tr>
              </thead>
              <tbody>
                {filteredCPTs.map((cpt) => {
                  const fieldCount = getFieldCount(cpt.slug);
                  const isDropshipping = cpt.slug.startsWith('ds_');
                  
                  return (
                    <tr key={cpt.slug}>
                      <td>
                        <div>
                          {cpt.public ? (
                            <span className="status-public" title="Public" />
                          ) : (
                            <span className="status-private" title="Private" />
                          )}
                          <span 
                            className="cpt-name"
                            onClick={() => handleEdit(cpt.slug)}
                          >
                            {cpt.name}
                            {renderTypeBadge(cpt.slug)}
                          </span>
                          <div className="cpt-slug">{cpt.slug}</div>
                        </div>
                      </td>
                      <td>
                        <div className="field-count">
                          {fieldCount > 0 && (
                            <span className="field-count-badge">{fieldCount}</span>
                          )}
                          <button
                            className="toolset-btn-small"
                            onClick={() => handleAddFields(cpt.slug)}
                          >
                            <Plus size={14} />
                            Add Fields
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          {cpt.taxonomies && cpt.taxonomies.length > 0 ? (
                            <div className="taxonomy-list">
                              {cpt.taxonomies.map((tax: string) => (
                                <span key={tax} className="taxonomy-tag">{tax}</span>
                              ))}
                            </div>
                          ) : null}
                          <button
                            className="toolset-btn-small"
                            onClick={() => handleAddTaxonomy(cpt.slug)}
                          >
                            <Tag size={14} />
                            Add
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="template-info">
                          {cpt.hasArchive ? 'archive.php' : 'single.php'}
                        </div>
                      </td>
                      <td>
                        <button
                          className="toolset-btn-small"
                          onClick={() => handleCreateForm(cpt.slug)}
                        >
                          <FileText size={14} />
                          Create Form
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Front-end Section */}
      {activeTab === 'frontend' && (
        <div className="toolset-table-section">
          <div className="toolset-table-header">
            Front-end - Display Settings
          </div>

          {/* Filters Bar */}
          <div className="toolset-filters-bar">
            <div className="toolset-search-box">
              <Search />
              <input
                type="text"
                placeholder="Search post types..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="toolset-filter-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'public' | 'private')}
            >
              <option value="all">All Types</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>

          {/* Table */}
          {typesLoading ? (
            <div className="toolset-loading">
              <div className="toolset-spinner"></div>
            </div>
          ) : filteredCPTs.length === 0 ? (
            <div className="toolset-empty-state">
              <Package />
              <h3>No Post Types Found</h3>
              <p>Create your first custom post type to get started.</p>
            </div>
          ) : (
            <table className="toolset-table">
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Post Type</th>
                  <th style={{ width: '20%' }}>Custom Fields</th>
                  <th style={{ width: '20%' }}>Taxonomies</th>
                  <th style={{ width: '20%' }}>Archive</th>
                  <th style={{ width: '15%' }}>Forms</th>
                </tr>
              </thead>
              <tbody>
                {filteredCPTs.map((cpt) => {
                  const fieldCount = getFieldCount(cpt.slug);
                  const isDropshipping = cpt.slug.startsWith('ds_');
                  
                  return (
                    <tr key={cpt.slug}>
                      <td>
                        <div>
                          {cpt.public ? (
                            <span className="status-public" title="Public" />
                          ) : (
                            <span className="status-private" title="Private" />
                          )}
                          <span 
                            className="cpt-name"
                            onClick={() => handleEdit(cpt.slug)}
                          >
                            {cpt.name}
                            {renderTypeBadge(cpt.slug)}
                          </span>
                          <div className="cpt-slug">{cpt.slug}</div>
                        </div>
                      </td>
                      <td>
                        <div className="field-count">
                          {fieldCount > 0 && (
                            <span className="field-count-badge">{fieldCount}</span>
                          )}
                          <button
                            className="toolset-btn-small"
                            onClick={() => handleAddFields(cpt.slug)}
                          >
                            <Plus size={14} />
                            Add Fields
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          {cpt.taxonomies && cpt.taxonomies.length > 0 ? (
                            <div className="taxonomy-list">
                              {cpt.taxonomies.map((tax: string) => (
                                <span key={tax} className="taxonomy-tag">{tax}</span>
                              ))}
                            </div>
                          ) : null}
                          <button
                            className="toolset-btn-small"
                            onClick={() => handleAddTaxonomy(cpt.slug)}
                          >
                            <Tag size={14} />
                            Add
                          </button>
                        </div>
                      </td>
                      <td>
                        {cpt.hasArchive ? (
                          <div>
                            <span className="archive-enabled">archive.php</span>
                            <button
                              className="toolset-btn-small"
                              onClick={() => handleCreateArchive(cpt.slug)}
                              style={{ marginLeft: '8px' }}
                            >
                              <Edit3 size={14} />
                              Edit
                            </button>
                          </div>
                        ) : (
                          <div>
                            <span className="archive-disabled">Disabled</span>
                            {cpt.public && (
                              <button
                                className="toolset-btn-small"
                                onClick={() => handleCreateArchive(cpt.slug)}
                                style={{ marginLeft: '8px' }}
                              >
                                <Archive size={14} />
                                Create
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        <button
                          className="toolset-btn-small"
                          onClick={() => handleCreateForm(cpt.slug)}
                        >
                          <FileText size={14} />
                          Create
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Additional Info Section */}
      <div style={{ marginTop: '30px', padding: '20px', background: 'white', border: '1px solid #ddd', borderRadius: '4px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '10px', color: '#23282d' }}>
          Dropshipping CPTs Status
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          {DROPSHIPPING_CPTS.map(dsCPT => {
            const exists = cptTypes.some(cpt => cpt.slug === dsCPT.slug);
            const isActive = cptTypes.find(cpt => cpt.slug === dsCPT.slug)?.active;
            
            return (
              <div key={dsCPT.slug} style={{ padding: '10px', background: '#f9f9f9', borderRadius: '4px' }}>
                <div style={{ fontWeight: 600, color: '#333', marginBottom: '4px' }}>
                  {dsCPT.name}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {dsCPT.slug}
                </div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  {exists ? (
                    isActive ? (
                      <span style={{ color: '#46b450' }}>✓ Active</span>
                    ) : (
                      <span style={{ color: '#ffa500' }}>⚠ Inactive</span>
                    )
                  ) : (
                    <span style={{ color: '#dc3545' }}>✗ Not Found</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CPTDashboardToolset;