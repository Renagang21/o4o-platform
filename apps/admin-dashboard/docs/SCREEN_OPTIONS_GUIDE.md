# WordPress Screen Options Implementation Guide

## Overview
Screen Options have been implemented across all admin list pages following WordPress standards.

## Features Implemented

### 1. Column Visibility Toggle
- Users can show/hide table columns
- Settings persist using Zustand with localStorage
- Required columns cannot be hidden

### 2. Items Per Page
- Configurable pagination (10, 20, 50, 100 items)
- Settings persist per page
- Default: 20 items

### 3. Dashboard Widget Control
- Show/hide dashboard widgets
- Layout columns control (1-4 columns)
- Widget preferences saved

## Usage Example

### For List Pages (Posts, Users, Media, etc.)
```typescript
import { ScreenOptionsReact } from '@/components/common/ScreenOptionsEnhanced';
import { useScreenOptions, ColumnOption } from '@/hooks/useScreenOptions';

// Define columns
const defaultColumns: ColumnOption[] = [
  { id: 'title', label: 'Title', visible: true, required: true },
  { id: 'author', label: 'Author', visible: true },
  { id: 'date', label: 'Date', visible: true }
];

// Use hook
const {
  options,
  itemsPerPage,
  isColumnVisible,
  updateColumnVisibility,
  setItemsPerPage
} = useScreenOptions('posts-list', {
  columns: defaultColumns,
  itemsPerPage: 20
});

// Render component
<ScreenOptionsReact
  title="Screen Options"
  columns={options.columns || defaultColumns}
  onColumnToggle={updateColumnVisibility}
  itemsPerPage={itemsPerPage}
  onItemsPerPageChange={setItemsPerPage}
/>
```

### For Dashboard
```typescript
<ScreenOptionsReact
  title="Screen Options"
  customOptions={widgets}
  onCustomOptionChange={handleWidgetToggle}
  layoutColumns={columnsPerPage}
  onLayoutColumnsChange={setColumnsPerPage}
  showLayoutOptions={true}
/>
```

## Pages Enhanced
1. **PostListWordPress** - Posts management with column controls
2. **UserListEnhanced** - Users list with role/status filters
3. **MediaLibraryEnhanced** - Media grid/list view with filters
4. **CommentsListEnhanced** - Comments moderation with status filters
5. **Dashboard** - Widget visibility and layout controls

## Storage Structure
Screen options are stored in localStorage under `screen-options-storage`:
```json
{
  "posts-list": {
    "columns": [
      { "id": "title", "label": "Title", "visible": true, "required": true },
      { "id": "author", "label": "Author", "visible": false }
    ],
    "itemsPerPage": 50
  }
}
```

## CSS Classes
- `.screen-meta-toggle` - Tab button
- `.metabox-prefs` - Options container
- `.columns-prefs` - Column checkboxes
- `.screen-options-pagination` - Items per page

## Future Enhancements
- Drag & drop column reordering
- Custom field columns
- Export/import settings
- Per-user preferences (requires backend)