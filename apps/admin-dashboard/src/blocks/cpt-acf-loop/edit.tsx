/**
 * CPT/ACF Loop Block Editor Component
 */

import { useBlockProps, InspectorControls, BlockControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl, RangeControl, Spinner, Notice, Placeholder, ToolbarGroup, ToolbarButton,  } from '@wordpress/components';
import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import { grid, listView, update } from '@wordpress/icons';

// Import all components
import ACFFieldSelector from './components/ACFFieldSelector';
// import { ACFFieldRenderer } from './components/ACFFieldRenderers';
import TaxonomyFilter from './components/TaxonomyFilter';
import ACFConditionFilter, { ACFConditionGroup } from './components/ACFConditionFilter';
import DateFilter from './components/DateFilter';
import { Pagination, PaginationSettings } from './components/Pagination';
import { SearchBox, SearchSettings } from './components/SearchBox';
import { PostTemplate } from './components/PostTemplates';

// Import hooks and utilities
import { useQueryCache } from './hooks/useQueryCache';
import { fetchPostTypes } from './utils';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { eventBus, EVENTS } from '@/lib/eventBus';

// Types
interface SelectedField {
  key: string;
  name: string;
  label: string;
  type: string;
  visible: boolean;
  customLabel?: string;
}

interface EditProps {
  attributes: {
    postType: string;
    postsPerPage: number;
    orderBy: string;
    order: string;
    selectedACFFields: SelectedField[];
    layoutType: string;
    columnsDesktop: number;
    columnsTablet: number;
    columnsMobile: number;
    taxonomyFilters: Record<string, {
      taxonomy: string;
      terms: number[];
      operator: 'IN' | 'NOT IN' | 'AND';
    }>;
    acfConditions: ACFConditionGroup[];
    dateFilter: {
      type: 'none' | 'relative' | 'absolute';
      relative?: string;
      startDate?: string;
      endDate?: string;
      includeTime?: boolean;
    };
    paginationType: string;
    enableSearch: boolean;
    searchPlaceholder: string;
    searchIn: string[];
    realTimeSearch: boolean;
    currentPage: number;
    searchQuery: string;
    cacheKey: string;
  };
  setAttributes: (attributes: Partial<EditProps['attributes']>) => void;
}

interface Post {
  id: number;
  title: {
    rendered: string;
  };
  excerpt?: {
    rendered: string;
  };
  content?: {
    rendered: string;
  };
  date: string;
  link: string;
  featured_media?: number;
  acf?: Record<string, any>;
  _embedded?: any;
}

export default function Edit({ attributes, setAttributes }: EditProps) {
  const {
    postType,
    postsPerPage,
    orderBy,
    order,
    layoutType,
    columnsDesktop,
    columnsTablet,
    columnsMobile,
    selectedACFFields,
    taxonomyFilters,
    acfConditions,
    dateFilter,
    paginationType,
    enableSearch,
    searchPlaceholder,
    searchIn,
    realTimeSearch,
    currentPage,
    searchQuery,
  } = attributes;

  const blockProps = useBlockProps({
    className: `o4o-cpt-acf-loop o4o-cpt-acf-loop--${layoutType}`,
  });

  // State
  const [postTypes, setPostTypes] = useState<string[]>([]);
  const [posts, setPosts] = useState<string[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Query cache
  const { generateCacheKey, getFromCache, setInCache, clearCache } = useQueryCache({
    ttl: 5 * 60 * 1000, // 5 minutes
    enableCache: true,
  });

  // Fetch available post types
  useEffect(() => {
    fetchPostTypes()
      .then(setPostTypes)
      .catch((err) => {
        console.error('Error fetching post types:', err);
        setError(__('Failed to load post types', 'o4o'));
      });
  }, []);

  // Build query parameters
  const buildQueryParams = useCallback(() => {
    const params: any = {
      per_page: paginationType === 'none' ? -1 : postsPerPage,
      orderby: orderBy,
      order: order,
      page: currentPage,
      _embed: true,
    };

    // Add search
    if (searchQuery) {
      params.search = searchQuery;
    }

    // Add taxonomy filters
    Object.entries(taxonomyFilters).forEach(([taxonomy, filter]) => {
      if (filter.terms.length > 0) {
        // Convert taxonomy slug to query param
        const paramName = taxonomy === 'category' ? 'categories' : 
                         taxonomy === 'post_tag' ? 'tags' : 
                         taxonomy;
        
        if (filter.operator === 'NOT IN') {
          params[`${paramName}_exclude`] = filter.terms.join(',');
        } else {
          params[paramName] = filter.terms.join(',');
        }
      }
    });

    // Add date filter
    if (dateFilter.type === 'relative' && dateFilter.relative) {
      // Calculate dates from relative
      // const now = new Date();
      const getRelativeDate = (relative: string) => {
        const date = new Date();
        switch (relative) {
          case 'today':
            date.setHours(0, 0, 0, 0);
            return date.toISOString();
          case 'last_7_days':
            date.setDate(date.getDate() - 7);
            return date.toISOString();
          case 'last_30_days':
            date.setDate(date.getDate() - 30);
            return date.toISOString();
          case 'this_month':
            date.setDate(1);
            date.setHours(0, 0, 0, 0);
            return date.toISOString();
          case 'this_year':
            date.setMonth(0, 1);
            date.setHours(0, 0, 0, 0);
            return date.toISOString();
          default:
            return null;
        }
      };
      
      const afterDate = getRelativeDate(dateFilter.relative);
      if (afterDate) {
        params.after = afterDate;
      }
    } else if (dateFilter.type === 'absolute') {
      if (dateFilter.startDate) {
        params.after = dateFilter.startDate;
      }
      if (dateFilter.endDate) {
        params.before = dateFilter.endDate;
      }
    }

    // Add ACF meta query
    if (acfConditions.length > 0) {
      // This would need server-side handling
      params.meta_query = JSON.stringify(acfConditions);
    }

    return params;
  }, [
    postsPerPage,
    paginationType,
    orderBy,
    order,
    currentPage,
    searchQuery,
    taxonomyFilters,
    dateFilter,
    acfConditions,
  ]);

  // Fetch posts
  const fetchPostsData = useCallback(async (append = false) => {
    if (!postType) return;

    setIsRefreshing(true);
    setError(null);

    try {
      const queryParams = buildQueryParams();
      const cacheKey = generateCacheKey({ postType, ...queryParams });

      // Check cache
      if (!append) {
        const cachedData = getFromCache(cacheKey);
        if (cachedData) {
          setPosts(cachedData.posts);
          setTotalPosts(cachedData.total);
          setTotalPages(cachedData.totalPages);
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }
      }

      // Find the rest base for the post type
      const selectedType = postTypes.find((type: any) => type.slug === postType);
      const restBase = selectedType?.rest_base || postType;

      // Fetch posts - Use our CPT API that returns WordPress-formatted data
      const response = await apiFetch<any>({
        path: `/cpt/${restBase}/posts?${new URLSearchParams(queryParams)}`,
        parse: false,
      });

      const total = parseInt(response.headers.get('X-WP-Total') || '0');
      const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '0');
      const posts = await response.json();

      if (append) {
        setPosts((prev: any) => [...prev, ...posts]);
      } else {
        setPosts(posts);
        // Cache the results
        setInCache(cacheKey, { posts, total, totalPages });
      }

      setTotalPosts(total);
      setTotalPages(totalPages);
    } catch (err: any) {
      console.error('Error fetching posts:', err);
      setError(__('Failed to load posts', 'o4o'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [postType, postTypes, buildQueryParams, generateCacheKey, getFromCache, setInCache]);

  // Initial fetch and refetch on changes
  useEffect(() => {
    if (postType) {
      setIsLoading(true);
      fetchPostsData();
    }
  }, [postType, buildQueryParams]);

  // Auto-refresh functionality
  const { manualRefresh } = useAutoRefresh({
    enabled: true,
    interval: 30000, // 30 seconds
    onRefresh: () => {
      if (!isLoading && !isRefreshing) {
        fetchPostsData();
      }
    }
  });

  // Listen for form submission events
  useEffect(() => {
    const handleFormSubmission = (data: any) => {
      // Refresh if the submitted post type matches this block
      if (data?.postType === postType || data?.type === 'all') {
        setTimeout(() => {
          clearCache();
          fetchPostsData();
        }, 1000); // Small delay to ensure data is saved
      }
    };

    const unsubscribe = eventBus.on(EVENTS.REFRESH_LOOPS, handleFormSubmission);
    const unsubscribeCreated = eventBus.on(EVENTS.POST_CREATED, handleFormSubmission);
    const unsubscribeUpdated = eventBus.on(EVENTS.POST_UPDATED, handleFormSubmission);

    return () => {
      unsubscribe();
      unsubscribeCreated();
      unsubscribeUpdated();
    };
  }, [postType, clearCache, fetchPostsData]);

  // Handle search
  const handleSearch = useCallback((query: string, fields: string[]) => {
    setAttributes({
      searchQuery: query,
      searchIn: fields,
      currentPage: 1,
    });
  }, [setAttributes]);

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    setAttributes({ currentPage: page });
    // Scroll to top of block
    const blockElement = document.querySelector('.o4o-cpt-acf-loop');
    if (blockElement) {
      blockElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [setAttributes]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    setAttributes({ currentPage: currentPage + 1 });
    fetchPostsData(true);
  }, [currentPage, setAttributes, fetchPostsData]);

  // Prepare post type options
  const postTypeOptions = [
    { label: __('Select a post type', 'o4o'), value: '' },
    ...postTypes.map((type: any) => ({
      label: type.name,
      value: type.slug,
    })),
  ];

  // Order by options
  const orderByOptions = [
    { label: __('Date', 'o4o'), value: 'date' },
    { label: __('Title', 'o4o'), value: 'title' },
    { label: __('Menu Order', 'o4o'), value: 'menu_order' },
    { label: __('Random', 'o4o'), value: 'rand' },
    { label: __('Modified Date', 'o4o'), value: 'modified' },
    { label: __('Comment Count', 'o4o'), value: 'comment_count' },
  ];

  // Template options
  const templateOptions = [
    { label: __('Card', 'o4o'), value: 'card' },
    { label: __('List', 'o4o'), value: 'list' },
    { label: __('Minimal', 'o4o'), value: 'minimal' },
    { label: __('Magazine', 'o4o'), value: 'magazine' },
  ];

  // Render loading state
  if (isLoading && postType && !isRefreshing) {
    return (
      <div {...blockProps}>
        <Placeholder icon={icon} label={__('CPT/ACF Loop', 'o4o')}>
          <Spinner />
          <p>{__('Loading posts...', 'o4o')}</p>
        </Placeholder>
      </div>
    );
  }

  // Render error state
  if (error && !isRefreshing) {
    return (
      <div {...blockProps}>
        <Placeholder icon={icon} label={__('CPT/ACF Loop', 'o4o')}>
          <Notice status="error" isDismissible={false}>
            {error}
          </Notice>
        </Placeholder>
      </div>
    );
  }

  // Render empty state
  if (!postType) {
    return (
      <div {...blockProps}>
        <InspectorControls>
          <PanelBody title={__('Query Settings', 'o4o')} initialOpen={true}>
            <SelectControl
              label={__('Post Type', 'o4o')}
              value={postType}
              options={postTypeOptions}
              onChange={(value: any) => setAttributes({ postType: value })}
              help={__('Select a custom post type to display', 'o4o')}
            />
          </PanelBody>
        </InspectorControls>
        
        <Placeholder
          icon={icon}
          label={__('CPT/ACF Loop', 'o4o')}
          instructions={__(
            'Select a post type from the block settings to begin.',
            'o4o'
          )}
        />
      </div>
    );
  }

  // Render block with posts
  return (
    <>
      <BlockControls>
        <ToolbarGroup>
          <ToolbarButton
            icon={grid}
            label={__('Grid view', 'o4o')}
            onClick={() => setAttributes({ layoutType: 'grid' })}
            isPressed={layoutType === 'grid'}
          />
          <ToolbarButton
            icon={listView}
            label={__('List view', 'o4o')}
            onClick={() => setAttributes({ layoutType: 'list' })}
            isPressed={layoutType === 'list'}
          />
        </ToolbarGroup>
        <ToolbarGroup>
          <ToolbarButton
            icon={update}
            label={__('Refresh posts', 'o4o')}
            onClick={() => {
              clearCache();
              manualRefresh();
            }}
          />
        </ToolbarGroup>
      </BlockControls>

      <InspectorControls>
        <PanelBody title={__('Query Settings', 'o4o')} initialOpen={true}>
          <SelectControl
            label={__('Post Type', 'o4o')}
            value={postType}
            options={postTypeOptions}
            onChange={(value: any) => setAttributes({ postType: value, currentPage: 1 })}
            help={__('Select a custom post type to display', 'o4o')}
          />
          
          <RangeControl
            label={__('Number of Posts', 'o4o')}
            value={postsPerPage}
            onChange={(value: any) => setAttributes({ postsPerPage: value || 12 })}
            min={1}
            max={50}
            step={1}
          />
          
          <SelectControl
            label={__('Order By', 'o4o')}
            value={orderBy}
            options={orderByOptions}
            onChange={(value: any) => setAttributes({ orderBy: value })}
          />
          
          <SelectControl
            label={__('Order', 'o4o')}
            value={order}
            options={[
              { label: __('Descending', 'o4o'), value: 'desc' },
              { label: __('Ascending', 'o4o'), value: 'asc' },
            ]}
            onChange={(value: any) => setAttributes({ order: value })}
          />
        </PanelBody>

        <PanelBody title={__('Layout Settings', 'o4o')} initialOpen={false}>
          <SelectControl
            label={__('Template', 'o4o')}
            value={layoutType}
            options={templateOptions}
            onChange={(value: any) => setAttributes({ layoutType: value })}
          />
          
          {layoutType === 'grid' && (
            <>
              <RangeControl
                label={__('Desktop Columns', 'o4o')}
                value={columnsDesktop}
                onChange={(value: any) => setAttributes({ columnsDesktop: value || 3 })}
                min={1}
                max={6}
                step={1}
              />
              <RangeControl
                label={__('Tablet Columns', 'o4o')}
                value={columnsTablet}
                onChange={(value: any) => setAttributes({ columnsTablet: value || 2 })}
                min={1}
                max={4}
                step={1}
              />
              <RangeControl
                label={__('Mobile Columns', 'o4o')}
                value={columnsMobile}
                onChange={(value: any) => setAttributes({ columnsMobile: value || 1 })}
                min={1}
                max={2}
                step={1}
              />
            </>
          )}
        </PanelBody>

        <ACFFieldSelector
          postType={postType}
          selectedFields={selectedACFFields}
          onFieldsChange={(fields) => setAttributes({ selectedACFFields: fields })}
        />

        <TaxonomyFilter
          postType={postType}
          selectedTaxonomies={taxonomyFilters}
          onTaxonomiesChange={(filters) => setAttributes({ 
            taxonomyFilters: filters,
            currentPage: 1,
          })}
        />

        <ACFConditionFilter
          availableFields={selectedACFFields}
          conditionGroups={acfConditions}
          onConditionsChange={(conditions) => setAttributes({ 
            acfConditions: conditions,
            currentPage: 1,
          })}
        />

        <DateFilter
          dateFilter={dateFilter}
          onDateFilterChange={(filter) => setAttributes({ 
            dateFilter: filter,
            currentPage: 1,
          })}
        />

        <PanelBody title={__('Search Settings', 'o4o')} initialOpen={false}>
          <SearchSettings
            enableSearch={enableSearch}
            searchPlaceholder={searchPlaceholder}
            searchIn={searchIn}
            realTimeSearch={realTimeSearch}
            onEnableChange={(enabled) => setAttributes({ enableSearch: enabled })}
            onPlaceholderChange={(placeholder) => setAttributes({ searchPlaceholder: placeholder })}
            onSearchInChange={(fields) => setAttributes({ searchIn: fields })}
            onRealTimeChange={(realTime) => setAttributes({ realTimeSearch: realTime })}
          />
        </PanelBody>

        <PanelBody title={__('Pagination Settings', 'o4o')} initialOpen={false}>
          <PaginationSettings
            paginationType={paginationType}
            postsPerPage={postsPerPage}
            onTypeChange={(type) => setAttributes({ paginationType: type, currentPage: 1 })}
            onPostsPerPageChange={(count) => setAttributes({ postsPerPage: count })}
          />
        </PanelBody>
      </InspectorControls>

      <div {...blockProps}>
        {/* Search Box */}
        {enableSearch && (
          <SearchBox
            onSearch={handleSearch}
            placeholder={searchPlaceholder}
            searchFields={searchIn}
            showAdvancedOptions={false}
            debounceTime={realTimeSearch ? 500 : 0}
          />
        )}

        {/* Posts Display */}
        {posts.length === 0 ? (
          <Placeholder icon={icon} label={__('CPT/ACF Loop', 'o4o')}>
            <p>{__('No posts found.', 'o4o')}</p>
          </Placeholder>
        ) : (
          <>
            <div
              className={`o4o-cpt-acf-loop__items ${
                layoutType === 'grid'
                  ? `o4o-cpt-acf-loop__items--grid o4o-cpt-acf-loop__items--cols-${columnsDesktop}`
                  : 'o4o-cpt-acf-loop__items--list'
              }`}
            >
              {posts.map((post, index) => (
                <PostTemplate
                  key={post.id}
                  post={post}
                  selectedFields={selectedACFFields}
                  template={layoutType}
                  showExcerpt={true}
                  showFeaturedImage={true}
                  showMeta={true}
                  showAuthor={layoutType === 'list' || layoutType === 'magazine'}
                  showDate={true}
                  {...(layoutType === 'magazine' ? { isFirst: index === 0 } : {})}
                />
              ))}
            </div>

            {/* Pagination */}
            {paginationType !== 'none' && totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalPosts}
                itemsPerPage={postsPerPage}
                onPageChange={handlePageChange}
                paginationType={paginationType as 'numbers' | 'loadmore' | 'infinite'}
                isLoading={isRefreshing}
                onLoadMore={handleLoadMore}
                hasMore={currentPage < totalPages}
              />
            )}
          </>
        )}

        {/* Loading Overlay */}
        {isRefreshing && (
          <div className="o4o-cpt-acf-loop__loading-overlay">
            <Spinner />
          </div>
        )}
      </div>
    </>
  );
}