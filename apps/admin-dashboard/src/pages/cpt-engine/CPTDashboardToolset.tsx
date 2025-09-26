/**
 * CPT Engine Dashboard - Toolset UI/UX Style
 * Complete redesign following Toolset Types interface patterns
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus,
  Settings,
  FileText,
  Database,
  Grid3X3,
  Archive,
  Tag,
  Edit3,
  Eye,
  Trash2,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  Download,
  Upload,
  Copy,
  Check,
  X,
  AlertCircle,
  Info,
  List,
  LayoutGrid,
  Code,
  Layers,
  Package,
  Users
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cptApi } from '@/features/cpt-acf/services/cpt.api';
import { acfGroupApi } from '@/features/cpt-acf/services/acf.api';
import { useAdminNotices } from '@/hooks/useAdminNotices';
import { CPTType } from '@/features/cpt-acf/types/cpt.types';

// Import Toolset UI styles
import '@/styles/toolset-ui.css';

export const CPTDashboardToolset = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addNotice } = useAdminNotices();
  
  // Get view from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const viewFromUrl = urlParams.get('view') as 'dashboard' | 'types' | 'fields' | 'taxonomies' | 'forms' | null;
  
  // State management
  const [activeView, setActiveView] = useState<'dashboard' | 'types' | 'fields' | 'taxonomies' | 'forms'>(
    viewFromUrl || 'dashboard'
  );
  const [selectedType, setSelectedType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  
  // Update view when URL changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view') as 'dashboard' | 'types' | 'fields' | 'taxonomies' | 'forms' | null;
    if (view && view !== activeView) {
      setActiveView(view);
    }
  }, [window.location.search]);
  
  // Fetch CPT Types
  const { data: cptTypes = [], isLoading: typesLoading } = useQuery({
    queryKey: ['cpt-types'],
    queryFn: async () => {
      const response = await cptApi.getAllTypes();
      return response.data;
    }
  });

  // Fetch ACF Field Groups
  const { data: fieldGroups = [], isLoading: fieldsLoading } = useQuery({
    queryKey: ['acf-field-groups'],
    queryFn: async () => {
      const response = await acfGroupApi.getAllGroups();
      return response.data;
    }
  });

  // Delete CPT Type mutation
  const deleteMutation = useMutation({
    mutationFn: async (slug: string) => {
      return await cptApi.deleteType(slug);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cpt-types'] });
      addNotice('success', 'Post Type deleted successfully');
    },
    onError: () => {
      addNotice('error', 'Failed to delete Post Type');
    }
  });

  // Filter types based on search
  const filteredTypes = cptTypes.filter(type => 
    type.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    type.slug?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Statistics
  const stats = {
    totalTypes: cptTypes.length,
    activeTypes: cptTypes.filter(t => t.isActive).length,
    totalFields: fieldGroups.length,
    totalTaxonomies: cptTypes.filter(t => t.hasArchive).length
  };

  return (
    <div className="toolset-ui">
      <div className="toolset-layout">
        {/* Sidebar Navigation */}
        <nav className="toolset-sidebar">
          <div className="toolset-sidebar__header">
            <div className="toolset-logo">
              <Package className="toolset-logo__icon" />
              <span className="toolset-logo__text">CPT Engine</span>
            </div>
          </div>

          <div className="toolset-nav">
            <div className="toolset-nav__group">
              <div className="toolset-nav__group-title">Content Management</div>
              <ul className="toolset-nav__list">
                <li className={`toolset-nav__item ${activeView === 'dashboard' ? 'toolset-nav__item--active' : ''}`}>
                  <button 
                    onClick={() => {
                      setActiveView('dashboard');
                      navigate('/cpt-engine');
                    }}
                    className="toolset-nav__link"
                  >
                    <Grid3X3 className="toolset-nav__icon" />
                    <span className="toolset-nav__label">Dashboard</span>
                  </button>
                </li>
                <li className={`toolset-nav__item ${activeView === 'types' ? 'toolset-nav__item--active' : ''}`}>
                  <button 
                    onClick={() => {
                      setActiveView('types');
                      navigate('/cpt-engine?view=types');
                    }}
                    className="toolset-nav__link"
                  >
                    <Database className="toolset-nav__icon" />
                    <span className="toolset-nav__label">Post Types</span>
                    <span className="toolset-badge toolset-badge--primary">{stats.totalTypes}</span>
                  </button>
                </li>
                <li className={`toolset-nav__item ${activeView === 'fields' ? 'toolset-nav__item--active' : ''}`}>
                  <button 
                    onClick={() => {
                      setActiveView('fields');
                      navigate('/cpt-engine?view=fields');
                    }}
                    className="toolset-nav__link"
                  >
                    <Layers className="toolset-nav__icon" />
                    <span className="toolset-nav__label">Custom Fields</span>
                    <span className="toolset-badge toolset-badge--primary">{stats.totalFields}</span>
                  </button>
                </li>
                <li className={`toolset-nav__item ${activeView === 'taxonomies' ? 'toolset-nav__item--active' : ''}`}>
                  <button 
                    onClick={() => {
                      setActiveView('taxonomies');
                      navigate('/cpt-engine?view=taxonomies');
                    }}
                    className="toolset-nav__link"
                  >
                    <Tag className="toolset-nav__icon" />
                    <span className="toolset-nav__label">Taxonomies</span>
                    <span className="toolset-badge toolset-badge--primary">{stats.totalTaxonomies}</span>
                  </button>
                </li>
                <li className={`toolset-nav__item ${activeView === 'forms' ? 'toolset-nav__item--active' : ''}`}>
                  <button 
                    onClick={() => {
                      setActiveView('forms');
                      navigate('/cpt-engine?view=forms');
                    }}
                    className="toolset-nav__link"
                  >
                    <FileText className="toolset-nav__icon" />
                    <span className="toolset-nav__label">Forms</span>
                    <span className="toolset-badge toolset-badge--primary">0</span>
                  </button>
                </li>
              </ul>
            </div>

            <div className="toolset-nav__group">
              <div className="toolset-nav__group-title">Tools</div>
              <ul className="toolset-nav__list">
                <li className="toolset-nav__item">
                  <button className="toolset-nav__link">
                    <Download className="toolset-nav__icon" />
                    <span className="toolset-nav__label">Import</span>
                  </button>
                </li>
                <li className="toolset-nav__item">
                  <button className="toolset-nav__link">
                    <Upload className="toolset-nav__icon" />
                    <span className="toolset-nav__label">Export</span>
                  </button>
                </li>
                <li className="toolset-nav__item">
                  <button className="toolset-nav__link">
                    <Settings className="toolset-nav__icon" />
                    <span className="toolset-nav__label">Settings</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="toolset-main">
          {/* Header Bar */}
          <header className="toolset-header">
            <div className="toolset-header__title">
              <h1>{
                activeView === 'dashboard' ? 'Dashboard' :
                activeView === 'types' ? 'Post Types' :
                activeView === 'fields' ? 'Custom Fields' :
                activeView === 'forms' ? 'Forms' :
                'Taxonomies'
              }</h1>
            </div>
            
            <div className="toolset-header__actions">
              {activeView !== 'dashboard' && (
                <>
                  <div className="toolset-search">
                    <Search className="toolset-search__icon" />
                    <input 
                      type="text"
                      className="toolset-search__input"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="toolset-btn-group">
                    <button 
                      className={`toolset-btn toolset-btn--ghost ${viewMode === 'grid' ? 'toolset-btn--active' : ''}`}
                      onClick={() => setViewMode('grid')}
                    >
                      <LayoutGrid size={16} />
                    </button>
                    <button 
                      className={`toolset-btn toolset-btn--ghost ${viewMode === 'list' ? 'toolset-btn--active' : ''}`}
                      onClick={() => setViewMode('list')}
                    >
                      <List size={16} />
                    </button>
                  </div>

                  <button 
                    className="toolset-btn toolset-btn--ghost"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter size={16} />
                  </button>
                </>
              )}

              {activeView === 'types' && (
                <button 
                  className="toolset-btn toolset-btn--primary"
                  onClick={() => navigate('/cpt-engine/types/new')}
                >
                  <Plus size={16} />
                  Add New Post Type
                </button>
              )}

              {activeView === 'fields' && (
                <button 
                  className="toolset-btn toolset-btn--primary"
                  onClick={() => navigate('/cpt-engine/fields/new')}
                >
                  <Plus size={16} />
                  Add Field Group
                </button>
              )}

              {activeView === 'taxonomies' && (
                <button 
                  className="toolset-btn toolset-btn--primary"
                  onClick={() => navigate('/cpt-engine/taxonomies/new')}
                >
                  <Plus size={16} />
                  Add Taxonomy
                </button>
              )}

              {activeView === 'forms' && (
                <button 
                  className="toolset-btn toolset-btn--primary"
                  onClick={() => navigate('/cpt-engine/forms/new')}
                >
                  <Plus size={16} />
                  Add New Form
                </button>
              )}
            </div>
          </header>

          {/* Filters Bar (if visible) */}
          {showFilters && activeView !== 'dashboard' && (
            <div className="toolset-filters">
              <div className="toolset-filters__group">
                <label className="toolset-label">Status</label>
                <select className="toolset-select">
                  <option>All</option>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
              <div className="toolset-filters__group">
                <label className="toolset-label">Type</label>
                <select className="toolset-select">
                  <option>All</option>
                  <option>Built-in</option>
                  <option>Custom</option>
                </select>
              </div>
              <button className="toolset-btn toolset-btn--secondary">
                Apply Filters
              </button>
              <button className="toolset-btn toolset-btn--ghost">
                Clear
              </button>
            </div>
          )}

          {/* Content Area */}
          <div className="toolset-content">
            {/* Dashboard View */}
            {activeView === 'dashboard' && (
              <div className="toolset-dashboard">
                {/* Stats Cards */}
                <div className="toolset-stats">
                  <div className="toolset-stat-card">
                    <div className="toolset-stat-card__icon toolset-stat-card__icon--primary">
                      <Database />
                    </div>
                    <div className="toolset-stat-card__content">
                      <div className="toolset-stat-card__value">{stats.totalTypes}</div>
                      <div className="toolset-stat-card__label">Post Types</div>
                      <div className="toolset-stat-card__meta">{stats.activeTypes} active</div>
                    </div>
                  </div>

                  <div className="toolset-stat-card">
                    <div className="toolset-stat-card__icon toolset-stat-card__icon--success">
                      <Layers />
                    </div>
                    <div className="toolset-stat-card__content">
                      <div className="toolset-stat-card__value">{stats.totalFields}</div>
                      <div className="toolset-stat-card__label">Field Groups</div>
                      <div className="toolset-stat-card__meta">All active</div>
                    </div>
                  </div>

                  <div className="toolset-stat-card">
                    <div className="toolset-stat-card__icon toolset-stat-card__icon--warning">
                      <Tag />
                    </div>
                    <div className="toolset-stat-card__content">
                      <div className="toolset-stat-card__value">{stats.totalTaxonomies}</div>
                      <div className="toolset-stat-card__label">Taxonomies</div>
                      <div className="toolset-stat-card__meta">With archives</div>
                    </div>
                  </div>

                  <div className="toolset-stat-card">
                    <div className="toolset-stat-card__icon toolset-stat-card__icon--info">
                      <FileText />
                    </div>
                    <div className="toolset-stat-card__content">
                      <div className="toolset-stat-card__value">0</div>
                      <div className="toolset-stat-card__label">Forms</div>
                      <div className="toolset-stat-card__meta">All forms</div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="toolset-card">
                  <div className="toolset-card__header">
                    <h2 className="toolset-card__title">Quick Actions</h2>
                  </div>
                  <div className="toolset-card__body">
                    <div className="toolset-quick-actions">
                      <button 
                        className="toolset-quick-action"
                        onClick={() => navigate('/cpt-engine/types/new')}
                      >
                        <Database className="toolset-quick-action__icon" />
                        <span className="toolset-quick-action__label">Create Post Type</span>
                      </button>
                      <button 
                        className="toolset-quick-action"
                        onClick={() => navigate('/cpt-engine/fields/new')}
                      >
                        <Layers className="toolset-quick-action__icon" />
                        <span className="toolset-quick-action__label">Add Field Group</span>
                      </button>
                      <button 
                        className="toolset-quick-action"
                        onClick={() => navigate('/cpt-engine/taxonomies/new')}
                      >
                        <Tag className="toolset-quick-action__icon" />
                        <span className="toolset-quick-action__label">Create Taxonomy</span>
                      </button>
                      <button 
                        className="toolset-quick-action"
                        onClick={() => setActiveView('types')}
                      >
                        <Eye className="toolset-quick-action__icon" />
                        <span className="toolset-quick-action__label">View All Types</span>
                      </button>
                      <button 
                        className="toolset-quick-action"
                        onClick={() => navigate('/cpt-engine/forms/new')}
                      >
                        <FileText className="toolset-quick-action__icon" />
                        <span className="toolset-quick-action__label">Create Form</span>
                      </button>
                      <button 
                        className="toolset-quick-action"
                        onClick={() => setActiveView('forms')}
                      >
                        <Eye className="toolset-quick-action__icon" />
                        <span className="toolset-quick-action__label">View All Forms</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="toolset-card">
                  <div className="toolset-card__header">
                    <h2 className="toolset-card__title">Recent Post Types</h2>
                    <button 
                      className="toolset-btn toolset-btn--ghost toolset-btn--sm"
                      onClick={() => setActiveView('types')}
                    >
                      View All
                    </button>
                  </div>
                  <div className="toolset-card__body">
                    {cptTypes.length > 0 ? (
                      <div className="toolset-table-wrapper">
                        <table className="toolset-table">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Slug</th>
                              <th>Status</th>
                              <th>Posts</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cptTypes.slice(0, 5).map(type => (
                              <tr key={type.slug}>
                                <td>
                                  <strong>{type.label}</strong>
                                </td>
                                <td>
                                  <code className="toolset-code">{type.slug}</code>
                                </td>
                                <td>
                                  <span className={`toolset-badge toolset-badge--${type.isActive ? 'success' : 'default'}`}>
                                    {type.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td>0</td>
                                <td>
                                  <div className="toolset-table__actions">
                                    <button 
                                      className="toolset-btn toolset-btn--ghost toolset-btn--sm"
                                      onClick={() => navigate(`/cpt-engine/types/${type.slug}/edit`)}
                                    >
                                      Edit
                                    </button>
                                    <button 
                                      className="toolset-btn toolset-btn--ghost toolset-btn--sm"
                                      onClick={() => navigate(`/cpt-engine/content/${type.slug}`)}
                                    >
                                      View
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="toolset-empty">
                        <Database className="toolset-empty__icon" />
                        <p className="toolset-empty__text">No post types created yet</p>
                        <button 
                          className="toolset-btn toolset-btn--primary"
                          onClick={() => navigate('/cpt-engine/types/new')}
                        >
                          Create Your First Post Type
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Post Types View */}
            {activeView === 'types' && (
              <div className="toolset-types">
                {typesLoading ? (
                  <div className="toolset-loading">
                    <div className="toolset-spinner"></div>
                    <p>Loading post types...</p>
                  </div>
                ) : filteredTypes.length > 0 ? (
                  viewMode === 'grid' ? (
                    <div className="toolset-grid">
                      {filteredTypes.map(type => (
                        <div key={type.slug} className="toolset-card toolset-card--interactive">
                          <div className="toolset-card__header">
                            <div className="toolset-card__title-group">
                              <Database className="toolset-card__icon" />
                              <h3 className="toolset-card__title">{type.label}</h3>
                            </div>
                            <span className={`toolset-badge toolset-badge--${type.isActive ? 'success' : 'default'}`}>
                              {type.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="toolset-card__body">
                            <dl className="toolset-meta">
                              <dt>Slug:</dt>
                              <dd><code>{type.slug}</code></dd>
                              <dt>Singular:</dt>
                              <dd>{type.singularLabel}</dd>
                              <dt>Archive:</dt>
                              <dd>{type.hasArchive ? 'Yes' : 'No'}</dd>
                              <dt>Menu Position:</dt>
                              <dd>{type.menuPosition || 'Default'}</dd>
                            </dl>
                          </div>
                          <div className="toolset-card__footer">
                            <button 
                              className="toolset-btn toolset-btn--secondary toolset-btn--sm"
                              onClick={() => navigate(`/cpt-engine/types/${type.slug}/edit`)}
                            >
                              <Edit3 size={14} />
                              Edit
                            </button>
                            <button 
                              className="toolset-btn toolset-btn--ghost toolset-btn--sm"
                              onClick={() => navigate(`/cpt-engine/content/${type.slug}`)}
                            >
                              <Eye size={14} />
                              View
                            </button>
                            <button 
                              className="toolset-btn toolset-btn--ghost toolset-btn--sm toolset-btn--danger"
                              onClick={() => {
                                if (confirm(`Delete post type "${type.label}"?`)) {
                                  deleteMutation.mutate(type.slug);
                                }
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="toolset-table-wrapper">
                      <table className="toolset-table">
                        <thead>
                          <tr>
                            <th className="toolset-table__checkbox">
                              <input type="checkbox" className="toolset-checkbox" />
                            </th>
                            <th className="toolset-table__sortable">
                              Name
                              <ChevronDown className="toolset-table__sort-icon" />
                            </th>
                            <th>Slug</th>
                            <th>Description</th>
                            <th>Status</th>
                            <th>Archive</th>
                            <th>Menu</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTypes.map(type => (
                            <tr key={type.slug}>
                              <td className="toolset-table__checkbox">
                                <input type="checkbox" className="toolset-checkbox" />
                              </td>
                              <td>
                                <div className="toolset-table__primary">
                                  <strong>{type.label}</strong>
                                  <span className="toolset-table__meta">{type.singularLabel}</span>
                                </div>
                              </td>
                              <td>
                                <code className="toolset-code">{type.slug}</code>
                              </td>
                              <td>{type.description || '-'}</td>
                              <td>
                                <span className={`toolset-badge toolset-badge--${type.isActive ? 'success' : 'default'}`}>
                                  {type.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td>
                                {type.hasArchive ? (
                                  <Check className="toolset-icon toolset-icon--success" size={16} />
                                ) : (
                                  <X className="toolset-icon toolset-icon--muted" size={16} />
                                )}
                              </td>
                              <td>
                                {type.showInMenu ? (
                                  <Check className="toolset-icon toolset-icon--success" size={16} />
                                ) : (
                                  <X className="toolset-icon toolset-icon--muted" size={16} />
                                )}
                              </td>
                              <td>
                                <div className="toolset-table__actions">
                                  <button 
                                    className="toolset-btn toolset-btn--ghost toolset-btn--sm"
                                    onClick={() => navigate(`/cpt-engine/types/${type.slug}/edit`)}
                                  >
                                    Edit
                                  </button>
                                  <button 
                                    className="toolset-btn toolset-btn--ghost toolset-btn--sm"
                                    onClick={() => navigate(`/cpt-engine/content/${type.slug}`)}
                                  >
                                    View
                                  </button>
                                  <button 
                                    className="toolset-btn toolset-btn--ghost toolset-btn--sm toolset-btn--danger"
                                    onClick={() => {
                                      if (confirm(`Delete post type "${type.label}"?`)) {
                                        deleteMutation.mutate(type.slug);
                                      }
                                    }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      
                      {/* Bulk Actions */}
                      <div className="toolset-bulk-actions">
                        <select className="toolset-select">
                          <option>Bulk Actions</option>
                          <option>Activate</option>
                          <option>Deactivate</option>
                          <option>Delete</option>
                        </select>
                        <button className="toolset-btn toolset-btn--secondary">Apply</button>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="toolset-empty">
                    <Database className="toolset-empty__icon" />
                    <h3 className="toolset-empty__title">No Post Types Found</h3>
                    <p className="toolset-empty__text">
                      {searchQuery 
                        ? 'No post types match your search criteria.' 
                        : 'Create your first custom post type to get started.'}
                    </p>
                    {!searchQuery && (
                      <button 
                        className="toolset-btn toolset-btn--primary"
                        onClick={() => navigate('/cpt-engine/types/new')}
                      >
                        Create Post Type
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Fields View */}
            {activeView === 'fields' && (
              <div className="toolset-fields">
                {fieldsLoading ? (
                  <div className="toolset-loading">
                    <div className="toolset-spinner"></div>
                    <p>Loading field groups...</p>
                  </div>
                ) : fieldGroups.length > 0 ? (
                  <div className="toolset-grid">
                    {fieldGroups.map(group => (
                      <div key={group.id} className="toolset-card toolset-card--interactive">
                        <div className="toolset-card__header">
                          <div className="toolset-card__title-group">
                            <Layers className="toolset-card__icon" />
                            <h3 className="toolset-card__title">{group.title}</h3>
                          </div>
                          <span className={`toolset-badge toolset-badge--${group.active ? 'success' : 'default'}`}>
                            {group.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="toolset-card__body">
                          <p className="toolset-card__description">
                            {group.description || 'No description provided'}
                          </p>
                          <div className="toolset-meta">
                            <div className="toolset-meta__item">
                              <span className="toolset-meta__label">Fields:</span>
                              <span className="toolset-meta__value">{group.fields?.length || 0}</span>
                            </div>
                            <div className="toolset-meta__item">
                              <span className="toolset-meta__label">Location:</span>
                              <span className="toolset-meta__value">
                                {group.location?.[0]?.[0]?.value || 'All'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="toolset-card__footer">
                          <button 
                            className="toolset-btn toolset-btn--secondary toolset-btn--sm"
                            onClick={() => navigate(`/cpt-engine/fields/${group.id}/edit`)}
                          >
                            <Edit3 size={14} />
                            Edit
                          </button>
                          <button 
                            className="toolset-btn toolset-btn--ghost toolset-btn--sm"
                          >
                            <Copy size={14} />
                            Duplicate
                          </button>
                          <button 
                            className="toolset-btn toolset-btn--ghost toolset-btn--sm toolset-btn--danger"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="toolset-empty">
                    <Layers className="toolset-empty__icon" />
                    <h3 className="toolset-empty__title">No Field Groups</h3>
                    <p className="toolset-empty__text">
                      Create field groups to add custom fields to your post types.
                    </p>
                    <button 
                      className="toolset-btn toolset-btn--primary"
                      onClick={() => navigate('/cpt-engine/fields/new')}
                    >
                      Create Field Group
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Taxonomies View */}
            {activeView === 'taxonomies' && (
              <div className="toolset-taxonomies">
                <div className="toolset-section">
                  <h2 className="toolset-section__title">Built-in Taxonomies</h2>
                  <div className="toolset-grid">
                    <div className="toolset-card">
                      <div className="toolset-card__header">
                        <div className="toolset-card__title-group">
                          <Tag className="toolset-card__icon" />
                          <h3 className="toolset-card__title">Categories</h3>
                        </div>
                        <span className="toolset-badge toolset-badge--info">Built-in</span>
                      </div>
                      <div className="toolset-card__body">
                        <p>Hierarchical taxonomy for organizing posts.</p>
                      </div>
                      <div className="toolset-card__footer">
                        <button className="toolset-btn toolset-btn--secondary toolset-btn--sm">
                          Manage Terms
                        </button>
                      </div>
                    </div>

                    <div className="toolset-card">
                      <div className="toolset-card__header">
                        <div className="toolset-card__title-group">
                          <Tag className="toolset-card__icon" />
                          <h3 className="toolset-card__title">Tags</h3>
                        </div>
                        <span className="toolset-badge toolset-badge--info">Built-in</span>
                      </div>
                      <div className="toolset-card__body">
                        <p>Non-hierarchical taxonomy for posts.</p>
                      </div>
                      <div className="toolset-card__footer">
                        <button className="toolset-btn toolset-btn--secondary toolset-btn--sm">
                          Manage Terms
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="toolset-section">
                  <div className="toolset-section__header">
                    <h2 className="toolset-section__title">Custom Taxonomies</h2>
                    <button 
                      className="toolset-btn toolset-btn--secondary"
                      onClick={() => navigate('/cpt-engine/taxonomies/new')}
                    >
                      <Plus size={16} />
                      Add Taxonomy
                    </button>
                  </div>

                  {cptTypes.filter(t => t.hasArchive).length > 0 ? (
                    <div className="toolset-grid">
                      {cptTypes.filter(t => t.hasArchive).map(type => (
                        <div key={type.slug} className="toolset-card">
                          <div className="toolset-card__header">
                            <div className="toolset-card__title-group">
                              <Archive className="toolset-card__icon" />
                              <h3 className="toolset-card__title">{type.label} Archive</h3>
                            </div>
                            <span className="toolset-badge toolset-badge--success">Active</span>
                          </div>
                          <div className="toolset-card__body">
                            <p>Archive page for {type.label} post type.</p>
                            <div className="toolset-meta">
                              <div className="toolset-meta__item">
                                <span className="toolset-meta__label">Slug:</span>
                                <code>{type.slug}</code>
                              </div>
                            </div>
                          </div>
                          <div className="toolset-card__footer">
                            <button 
                              className="toolset-btn toolset-btn--secondary toolset-btn--sm"
                              onClick={() => navigate(`/cpt-engine/taxonomies/${type.slug}/edit`)}
                            >
                              Configure
                            </button>
                            <button 
                              className="toolset-btn toolset-btn--ghost toolset-btn--sm"
                              onClick={() => window.open(`/archive/${type.slug}`, '_blank')}
                            >
                              View Archive
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="toolset-empty">
                      <Tag className="toolset-empty__icon" />
                      <p className="toolset-empty__text">No custom taxonomies created yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Forms View */}
            {activeView === 'forms' && (
              <div className="toolset-forms">
                <div className="toolset-section">
                  <div className="toolset-section__header">
                    <h2 className="toolset-section__title">Form Types</h2>
                  </div>
                  
                  <div className="toolset-grid">
                    {/* Contact Forms */}
                    <div className="toolset-card toolset-card--interactive">
                      <div className="toolset-card__header">
                        <div className="toolset-card__title-group">
                          <FileText className="toolset-card__icon" />
                          <h3 className="toolset-card__title">Contact Forms</h3>
                        </div>
                        <span className="toolset-badge toolset-badge--default">0 Forms</span>
                      </div>
                      <div className="toolset-card__body">
                        <p>Create contact forms with email notifications and validation.</p>
                      </div>
                      <div className="toolset-card__footer">
                        <button 
                          className="toolset-btn toolset-btn--secondary toolset-btn--sm"
                          onClick={() => navigate('/cpt-engine/forms/new?type=contact')}
                        >
                          Create Contact Form
                        </button>
                      </div>
                    </div>

                    {/* Post Forms */}
                    <div className="toolset-card toolset-card--interactive">
                      <div className="toolset-card__header">
                        <div className="toolset-card__title-group">
                          <Database className="toolset-card__icon" />
                          <h3 className="toolset-card__title">Post Forms</h3>
                        </div>
                        <span className="toolset-badge toolset-badge--default">0 Forms</span>
                      </div>
                      <div className="toolset-card__body">
                        <p>Frontend forms for creating and editing posts.</p>
                      </div>
                      <div className="toolset-card__footer">
                        <button 
                          className="toolset-btn toolset-btn--secondary toolset-btn--sm"
                          onClick={() => navigate('/cpt-engine/forms/new?type=post')}
                        >
                          Create Post Form
                        </button>
                      </div>
                    </div>

                    {/* User Forms */}
                    <div className="toolset-card toolset-card--interactive">
                      <div className="toolset-card__header">
                        <div className="toolset-card__title-group">
                          <Users className="toolset-card__icon" />
                          <h3 className="toolset-card__title">User Forms</h3>
                        </div>
                        <span className="toolset-badge toolset-badge--default">0 Forms</span>
                      </div>
                      <div className="toolset-card__body">
                        <p>Registration and profile editing forms.</p>
                      </div>
                      <div className="toolset-card__footer">
                        <button 
                          className="toolset-btn toolset-btn--secondary toolset-btn--sm"
                          onClick={() => navigate('/cpt-engine/forms/new?type=user')}
                        >
                          Create User Form
                        </button>
                      </div>
                    </div>

                    {/* Search Forms */}
                    <div className="toolset-card toolset-card--interactive">
                      <div className="toolset-card__header">
                        <div className="toolset-card__title-group">
                          <Search className="toolset-card__icon" />
                          <h3 className="toolset-card__title">Search Forms</h3>
                        </div>
                        <span className="toolset-badge toolset-badge--default">0 Forms</span>
                      </div>
                      <div className="toolset-card__body">
                        <p>Advanced search forms with custom filters.</p>
                      </div>
                      <div className="toolset-card__footer">
                        <button 
                          className="toolset-btn toolset-btn--secondary toolset-btn--sm"
                          onClick={() => navigate('/cpt-engine/forms/new?type=search')}
                        >
                          Create Search Form
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Recent Forms Table */}
                  <div className="toolset-section">
                    <div className="toolset-section__header">
                      <h2 className="toolset-section__title">All Forms</h2>
                    </div>
                    
                    <div className="toolset-empty">
                      <FileText className="toolset-empty__icon" />
                      <h3 className="toolset-empty__title">No Forms Created Yet</h3>
                      <p className="toolset-empty__text">
                        Forms allow you to create custom data entry interfaces for your site.
                      </p>
                      <button 
                        className="toolset-btn toolset-btn--primary"
                        onClick={() => navigate('/cpt-engine/forms/new')}
                      >
                        Create Your First Form
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Notifications Area */}
      <div className="toolset-notifications">
        {/* Notifications will be rendered here */}
      </div>
    </div>
  );
};

export default CPTDashboardToolset;