# CPT/ACF Loop Block

A comprehensive WordPress Gutenberg block for displaying custom post types with Advanced Custom Fields support.

## Features

### Phase 1: Basic Query & Display
- ✅ Custom Post Type selection
- ✅ Posts per page control
- ✅ Sorting options (date, title, menu order, random)
- ✅ Multiple layout templates (Card, List, Minimal, Magazine)
- ✅ Responsive column settings

### Phase 2: ACF Integration
- ✅ ACF field selection with drag-and-drop reordering
- ✅ Field visibility toggles
- ✅ Custom field labels
- ✅ Comprehensive field type support:
  - Text, Textarea, Number, Email, URL
  - Image, Gallery, File
  - Select, Radio, Checkbox
  - True/False, Color Picker
  - Date Picker, Date Time Picker
  - Relationship, Post Object, User
  - WYSIWYG, oEmbed
  - And more...

### Phase 3: Advanced Features
- ✅ **Taxonomy Filtering**: Filter by categories, tags, and custom taxonomies
- ✅ **ACF Condition Filtering**: Build complex meta queries with ACF fields
- ✅ **Date Range Filtering**: Filter by relative or absolute date ranges
- ✅ **Search Functionality**: Real-time or manual search with field selection
- ✅ **Pagination Options**:
  - Numbered pagination
  - Load More button
  - Infinite scroll
- ✅ **Query Caching**: Performance optimization with configurable TTL

## Installation

1. Copy the `cpt-acf-loop` folder to your theme's blocks directory
2. Register the block in your theme's functions.php:

```php
function register_cpt_acf_loop_block() {
    register_block_type(__DIR__ . '/blocks/cpt-acf-loop');
}
add_action('init', 'register_cpt_acf_loop_block');
```

## Testing

### Test Plugin
A test plugin is included (`test-cpt-plugin.php`) that creates:
- **Custom Post Types**: Products, Events, Team Members
- **Taxonomies**: Product Categories/Tags, Event Types, Departments
- **ACF Fields**: Price, Date, Location, Skills, Social Media, etc.
- **Sample Data**: Pre-populated posts for each CPT

To use the test plugin:
1. Copy `test-cpt-plugin.php` to your plugins directory
2. Activate "O4O Test CPT & ACF" from the Plugins menu
3. Sample data will be created automatically

### Testing Checklist

#### Basic Functionality
- [ ] Select different post types
- [ ] Change posts per page
- [ ] Test all sorting options
- [ ] Switch between layout templates
- [ ] Adjust column settings for responsive display

#### ACF Fields
- [ ] Select and reorder ACF fields
- [ ] Toggle field visibility
- [ ] Set custom field labels
- [ ] Verify all field types render correctly

#### Filtering
- [ ] Add taxonomy filters with different operators
- [ ] Create ACF condition groups
- [ ] Test date range filters (relative and absolute)
- [ ] Combine multiple filter types

#### Search
- [ ] Enable search functionality
- [ ] Test real-time vs manual search
- [ ] Select different search fields
- [ ] Verify search with filters

#### Pagination
- [ ] Test numbered pagination
- [ ] Test load more button
- [ ] Test infinite scroll
- [ ] Verify pagination with filters/search

## Block Attributes

```json
{
  "postType": "string",
  "postsPerPage": "number",
  "orderBy": "string",
  "order": "string",
  "selectedACFFields": "array",
  "layoutType": "string",
  "columnsDesktop": "number",
  "columnsTablet": "number", 
  "columnsMobile": "number",
  "taxonomyFilters": "object",
  "acfConditions": "array",
  "dateFilter": "object",
  "paginationType": "string",
  "enableSearch": "boolean",
  "searchPlaceholder": "string",
  "searchIn": "array",
  "realTimeSearch": "boolean"
}
```

## Styling

The block includes comprehensive CSS with BEM naming convention:
- `.o4o-cpt-acf-loop` - Main container
- `.o4o-cpt-acf-loop__items` - Posts container
- `.o4o-cpt-acf-loop__item` - Individual post
- `.o4o-cpt-acf-loop__title` - Post title
- `.o4o-cpt-acf-loop__meta` - Post metadata
- `.o4o-cpt-acf-loop__acf-fields` - ACF fields container
- `.o4o-acf-field` - Individual ACF field

## Server-Side Rendering

The block supports server-side rendering through `render.php`:
- Full query support with all filters
- Proper escaping and sanitization
- ACF field rendering based on type
- Pagination with AJAX support
- Search functionality
- Performance optimized

## Performance Considerations

1. **Query Caching**: Implemented with configurable TTL
2. **Lazy Loading**: Images use native lazy loading
3. **Pagination**: Limits database queries
4. **Selective Field Loading**: Only loads visible ACF fields

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- IE11 not supported
- Requires JavaScript for editor functionality

## Known Limitations

1. ACF field groups must be registered and have REST API support
2. Some complex ACF field types may require custom rendering
3. Infinite scroll requires JavaScript enabled
4. Query caching is frontend-only (not server-side)

## Future Enhancements

- [ ] Export/Import block configurations
- [ ] Saved query presets
- [ ] Custom CSS class options
- [ ] Integration with popular page builders
- [ ] REST API endpoint for headless usage
- [ ] Block patterns library

## Support

For issues or feature requests, please contact the O4O development team.